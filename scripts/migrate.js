#!/usr/bin/env node

/**
 * 旧格式迁移脚本
 *
 * 将旧格式加密文章（密码直接加密内容）迁移为新格式（CEK 架构）。
 * 需要提供原文章密码和主恢复密钥。
 *
 * 用法：
 *   npm run migrate
 *   BLOG_PASSWORD=mypassword npm run migrate
 *   npm run migrate -- _thoughts/2026-04-10-test-encrypted.md
 */

const {
  rebuildFrontMatter,
  deriveKey,
  aesDecrypt,
  generateCEK,
  encryptCEK,
  encryptContent,
  loadMasterKey,
  isLegacyFormat,
  scanFiles,
  loadSpecificFile,
  ask,
} = require('./crypto-utils');
const fs = require('fs');

async function main() {
  // 加载主恢复密钥
  const masterKey = loadMasterKey();
  if (!masterKey) {
    console.error('未找到主恢复密钥！请先运行: npm run init-master-key');
    process.exit(1);
  }

  const specificFile = process.argv[2];
  let filesToMigrate = [];

  if (specificFile) {
    const f = loadSpecificFile(specificFile);
    if (!f) {
      console.error(`文件不存在: ${specificFile}`);
      process.exit(1);
    }
    if (!isLegacyFormat(f.parsed.fm)) {
      console.error(`文件已是新格式或未加密: ${specificFile}`);
      process.exit(1);
    }
    filesToMigrate.push(f);
  } else {
    filesToMigrate = scanFiles({ encrypted: true }).filter(f => isLegacyFormat(f.parsed.fm));
  }

  if (filesToMigrate.length === 0) {
    console.log('没有需要迁移的旧格式文件。');
    return;
  }

  console.log(`找到 ${filesToMigrate.length} 个旧格式文件：`);
  for (const f of filesToMigrate) {
    console.log(`  - ${f.dir}/${f.file}`);
  }
  console.log();

  let globalPassword = process.env.BLOG_PASSWORD || '';
  if (!globalPassword) {
    globalPassword = await ask('请输入原加密密码 (BLOG_PASSWORD): ');
    if (!globalPassword) {
      console.error('未提供密码，退出。');
      process.exit(1);
    }
  }

  let successCount = 0;
  let failCount = 0;

  for (const f of filesToMigrate) {
    const saltHex = f.parsed.fm.salt;
    if (!saltHex) {
      console.error(`跳过 ${f.file}: 缺少 salt`);
      failCount++;
      continue;
    }

    try {
      // 1. 用旧密码解密内容
      const salt = Buffer.from(saltHex, 'hex');
      const key = deriveKey(globalPassword, salt);

      let payload = f.parsed.body
        .replace(/\{%\s*raw\s*%\}/g, '')
        .replace(/\{%\s*endraw\s*%\}/g, '')
        .replace(/<\/?p>/g, '')
        .trim();

      const plaintext = aesDecrypt(payload, key);

      if (!plaintext || plaintext.length === 0) {
        throw new Error('解密结果为空');
      }

      // 2. 生成新 CEK，重新加密
      const cek = generateCEK();
      const { ciphertext, salt: contentSalt } = encryptContent(plaintext, cek);
      const { payload: encKeyPayload, salt: keySalt } = encryptCEK(cek, globalPassword);
      const { payload: recKeyPayload, salt: recSalt } = encryptCEK(cek, masterKey);

      // 3. 重建 front matter
      const newFmRaw = rebuildFrontMatter(f.parsed.fmRaw, {
        remove: ['salt'],
        set: {
          salt: contentSalt,
          encrypted_key: encKeyPayload,
          key_salt: keySalt,
          recovery_key: recKeyPayload,
          recovery_salt: recSalt,
        },
      });

      const newContent = `---\n${newFmRaw}\n---\n{% raw %}${ciphertext}{% endraw %}\n`;
      fs.writeFileSync(f.filePath, newContent, 'utf8');

      console.log(`已迁移: ${f.dir}/${f.file}`);
      successCount++;
    } catch (err) {
      console.error(`失败 ${f.file}: ${err.message}（密码可能不正确）`);
      failCount++;
    }
  }

  console.log(`\n完成！成功 ${successCount} 个，失败 ${failCount} 个。`);
}

main().catch(err => {
  console.error('迁移出错:', err.message);
  process.exit(1);
});
