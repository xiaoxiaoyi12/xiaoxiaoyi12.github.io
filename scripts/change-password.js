#!/usr/bin/env node

/**
 * 博客文章改密码脚本（主密钥版）
 *
 * 用旧密码解密 CEK，再用新密码重新加密 CEK。
 * 文章密文本身不需要重新加密。
 *
 * 用法：
 *   npm run change-password
 *   npm run change-password -- _thoughts/2026-04-10-my-thought.md
 *   OLD_PASSWORD=old NEW_PASSWORD=new npm run change-password
 */

const {
  rebuildFrontMatter,
  decryptCEK,
  encryptCEK,
  isLegacyFormat,
  scanFiles,
  loadSpecificFile,
  ask,
} = require('./crypto-utils');
const fs = require('fs');

async function main() {
  const specificFile = process.argv[2];
  let filesToChange = [];

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
    if (isLegacyFormat(f.parsed.fm)) {
      console.error(`文件为旧格式，请先迁移: npm run migrate`);
      process.exit(1);
    }
    filesToChange.push(f);
  } else {
    filesToChange = scanFiles({ encrypted: true }).filter(f => !isLegacyFormat(f.parsed.fm));
  }

  if (filesToChange.length === 0) {
    console.log('没有可改密码的文件（新格式）。');
    return;
  }

  console.log(`找到 ${filesToChange.length} 个已加密文件：`);
  for (const f of filesToChange) {
    console.log(`  - ${f.dir}/${f.file}`);
  }
  console.log();

  const oldPassword = process.env.OLD_PASSWORD || await ask('请输入旧密码: ');
  if (!oldPassword) {
    console.error('未提供旧密码，退出。');
    process.exit(1);
  }

  const newPassword = process.env.NEW_PASSWORD || await ask('请输入新密码: ');
  if (!newPassword) {
    console.error('未提供新密码，退出。');
    process.exit(1);
  }

  const confirmPassword = process.env.NEW_PASSWORD || await ask('请再次输入新密码: ');
  if (newPassword !== confirmPassword) {
    console.error('两次输入的新密码不一致，退出。');
    process.exit(1);
  }

  let successCount = 0;
  let failCount = 0;

  for (const f of filesToChange) {
    try {
      // 用旧密码解密 CEK
      const cek = decryptCEK(f.parsed.fm.encrypted_key, oldPassword, f.parsed.fm.key_salt);

      // 用新密码重新加密 CEK
      const { payload: newEncKeyPayload, salt: newKeySalt } = encryptCEK(cek, newPassword);

      // 只更新 encrypted_key 和 key_salt，其他不变
      const newFmRaw = rebuildFrontMatter(f.parsed.fmRaw, {
        set: {
          encrypted_key: newEncKeyPayload,
          key_salt: newKeySalt,
        },
      });

      const newContent = `---\n${newFmRaw}\n---\n${f.parsed.body}`;
      fs.writeFileSync(f.filePath, newContent, 'utf8');

      console.log(`已更新: ${f.dir}/${f.file}`);
      successCount++;
    } catch (err) {
      console.error(`失败 ${f.file}: ${err.message}（旧密码可能不正确）`);
      failCount++;
    }
  }

  console.log(`\n完成！成功 ${successCount} 个，失败 ${failCount} 个。`);
}

main().catch(err => {
  console.error('改密出错:', err.message);
  process.exit(1);
});
