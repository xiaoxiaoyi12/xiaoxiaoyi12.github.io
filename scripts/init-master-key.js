#!/usr/bin/env node

/**
 * 主恢复密钥初始化脚本
 *
 * 生成一个 256 位随机主恢复密钥，保存到 .master-key 文件。
 * 该文件已加入 .gitignore，不会被提交到仓库。
 *
 * 用法：
 *   npm run init-master-key
 */

const { loadMasterKey, saveMasterKey, generateMasterKey, MASTER_KEY_FILE } = require('./crypto-utils');

function main() {
  const existing = loadMasterKey();

  if (existing) {
    console.log('主恢复密钥已存在！');
    console.log(`文件位置: ${MASTER_KEY_FILE}`);
    console.log(`密钥内容: ${existing}`);
    console.log('\n如需重新生成，请先手动删除 .master-key 文件。');
    console.log('⚠️  重新生成后，已用旧主密钥加密的 recovery_key 将无法使用！');
    return;
  }

  const masterKey = generateMasterKey();
  saveMasterKey(masterKey);

  console.log('='.repeat(60));
  console.log('  主恢复密钥已生成');
  console.log('='.repeat(60));
  console.log();
  console.log(`  ${masterKey}`);
  console.log();
  console.log('='.repeat(60));
  console.log();
  console.log('请立即将此密钥保存到安全的地方：');
  console.log('  - 密码管理器（1Password / Bitwarden）');
  console.log('  - 或打印纸质备份');
  console.log();
  console.log(`密钥已保存到: ${MASTER_KEY_FILE}`);
  console.log('该文件已在 .gitignore 中，不会被提交到仓库。');
  console.log();
  console.log('忘记文章密码时，可用此密钥恢复：');
  console.log('  npm run recover-password');
}

main();
