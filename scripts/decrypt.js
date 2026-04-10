#!/usr/bin/env node

/**
 * 博客文章解密脚本（主密钥版）
 *
 * 将已加密的文章还原为明文，方便编辑。
 * 支持新格式（CEK 架构）和旧格式（直接密码加密）。
 *
 * 用法：
 *   npm run decrypt
 *   BLOG_PASSWORD=mypassword npm run decrypt
 *   npm run decrypt -- _thoughts/2026-04-10-my-thought.md
 */

const {
  rebuildFrontMatter,
  decryptCEK,
  decryptContent,
  deriveKey,
  aesDecrypt,
  scanFiles,
  loadSpecificFile,
  isLegacyFormat,
  ask,
} = require('./crypto-utils');
const fs = require('fs');

async function main() {
  let globalPassword = process.env.BLOG_PASSWORD || '';
  let decryptedCount = 0;

  const specificFile = process.argv[2];
  let filesToDecrypt = [];

  if (specificFile) {
    const f = loadSpecificFile(specificFile);
    if (!f) {
      console.error(`文件不存在: ${specificFile}`);
      process.exit(1);
    }
    if (f.parsed.fm.encrypted !== true) {
      console.error(`文件未加密: ${specificFile}`);
      process.exit(1);
    }
    filesToDecrypt.push(f);
  } else {
    filesToDecrypt = scanFiles({ encrypted: true });
  }

  if (filesToDecrypt.length === 0) {
    console.log('没有需要解密的文件。');
    return;
  }

  console.log(`找到 ${filesToDecrypt.length} 个待解密文件：`);
  for (const f of filesToDecrypt) {
    console.log(`  - ${f.dir}/${f.file}`);
  }

  if (!globalPassword) {
    globalPassword = await ask('请输入解密密码 (BLOG_PASSWORD): ');
    if (!globalPassword) {
      console.error('未提供密码，退出。');
      process.exit(1);
    }
  }

  for (const f of filesToDecrypt) {
    try {
      let plaintext;

      if (isLegacyFormat(f.parsed.fm)) {
        // 旧格式：密码直接派生密钥解密内容
        const saltHex = f.parsed.fm.salt;
        if (!saltHex) {
          console.error(`跳过 ${f.file}: 缺少 salt`);
          continue;
        }
        const salt = Buffer.from(saltHex, 'hex');
        const key = deriveKey(globalPassword, salt);

        let payload = f.parsed.body
          .replace(/\{%\s*raw\s*%\}/g, '')
          .replace(/\{%\s*endraw\s*%\}/g, '')
          .replace(/<\/?p>/g, '')
          .trim();

        plaintext = aesDecrypt(payload, key);
      } else {
        // 新格式：先解密 CEK，再用 CEK 解密内容
        const cek = decryptCEK(f.parsed.fm.encrypted_key, globalPassword, f.parsed.fm.key_salt);
        plaintext = decryptContent(f.parsed.body, cek);
      }

      // 重建 front matter
      const newFmRaw = rebuildFrontMatter(f.parsed.fmRaw, {
        remove: ['encrypted', 'salt', 'encrypted_key', 'key_salt', 'recovery_key', 'recovery_salt'],
        set: { layout: 'post' },
      });

      const newContent = `---\n${newFmRaw}\n---\n${plaintext}`;
      fs.writeFileSync(f.filePath, newContent, 'utf8');

      console.log(`已解密: ${f.dir}/${f.file}`);
      decryptedCount++;
    } catch (err) {
      console.error(`解密失败 ${f.file}: ${err.message}（密码可能不正确）`);
    }
  }

  console.log(`\n完成！共解密 ${decryptedCount} 个文件。`);
}

main().catch(err => {
  console.error('解密出错:', err.message);
  process.exit(1);
});
