#!/usr/bin/env node

/**
 * 主密钥恢复脚本
 *
 * 忘记文章密码时，用主恢复密钥解密 recovery_key 得到 CEK，
 * 再用新密码重新加密 CEK。文章密文不变。
 *
 * 用法：
 *   npm run recover-password
 *   npm run recover-password -- _thoughts/2026-04-10-my-thought.md
 *   MASTER_KEY=xxx NEW_PASSWORD=new npm run recover-password
 */

const {
  rebuildFrontMatter,
  decryptCEK,
  encryptCEK,
  loadMasterKey,
  isLegacyFormat,
  scanFiles,
  loadSpecificFile,
  ask,
} = require('./crypto-utils');
const fs = require('fs');

async function main() {
  const specificFile = process.argv[2];
  let filesToRecover = [];

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
      console.error(`文件为旧格式（无 recovery_key），无法通过主密钥恢复。`);
      console.error('请先迁移到新格式: npm run migrate');
      process.exit(1);
    }
    filesToRecover.push(f);
  } else {
    filesToRecover = scanFiles({ encrypted: true }).filter(f => !isLegacyFormat(f.parsed.fm));
  }

  if (filesToRecover.length === 0) {
    console.log('没有可恢复的文件。');
    return;
  }

  console.log(`找到 ${filesToRecover.length} 个可恢复文件：`);
  for (const f of filesToRecover) {
    console.log(`  - ${f.dir}/${f.file}`);
  }
  console.log();

  // 获取主恢复密钥
  let masterKey = process.env.MASTER_KEY || loadMasterKey();
  if (!masterKey) {
    masterKey = await ask('请输入主恢复密钥: ');
  }
  if (!masterKey) {
    console.error('未提供主恢复密钥，退出。');
    process.exit(1);
  }

  // 获取新密码
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

  for (const f of filesToRecover) {
    try {
      // 用主恢复密钥解密 recovery_key → 得到 CEK
      const cek = decryptCEK(f.parsed.fm.recovery_key, masterKey, f.parsed.fm.recovery_salt);

      // 用新密码重新加密 CEK
      const { payload: newEncKeyPayload, salt: newKeySalt } = encryptCEK(cek, newPassword);

      // 更新 encrypted_key 和 key_salt
      const newFmRaw = rebuildFrontMatter(f.parsed.fmRaw, {
        set: {
          encrypted_key: newEncKeyPayload,
          key_salt: newKeySalt,
        },
      });

      const newContent = `---\n${newFmRaw}\n---\n${f.parsed.body}`;
      fs.writeFileSync(f.filePath, newContent, 'utf8');

      console.log(`已恢复: ${f.dir}/${f.file}`);
      successCount++;
    } catch (err) {
      console.error(`失败 ${f.file}: ${err.message}（主恢复密钥可能不正确）`);
      failCount++;
    }
  }

  console.log(`\n完成！成功 ${successCount} 个，失败 ${failCount} 个。`);
  if (successCount > 0) {
    console.log('密码已更新，请记住新密码并提交推送。');
  }
}

main().catch(err => {
  console.error('恢复出错:', err.message);
  process.exit(1);
});
