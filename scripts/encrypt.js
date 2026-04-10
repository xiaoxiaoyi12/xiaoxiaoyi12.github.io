#!/usr/bin/env node

/**
 * 博客文章加密脚本（主密钥版）
 *
 * 使用 CEK（内容加密密钥）+ 双重加密架构：
 *   1. 随机生成 CEK 加密文章正文
 *   2. 用户密码加密 CEK → encrypted_key
 *   3. 主恢复密钥加密 CEK → recovery_key
 *
 * 用法：
 *   npm run encrypt
 *   BLOG_PASSWORD=mypassword npm run encrypt
 *
 * 密码来源优先级：
 *   1. front matter 中的 password 字段（加密后会被删除）
 *   2. 环境变量 BLOG_PASSWORD
 *   3. 交互式输入
 */

const {
  parseFrontMatter,
  rebuildFrontMatter,
  generateCEK,
  encryptCEK,
  encryptContent,
  loadMasterKey,
  scanFiles,
  ask,
  ROOT,
} = require('./crypto-utils');
const fs = require('fs');
const path = require('path');

async function main() {
  let globalPassword = process.env.BLOG_PASSWORD || '';
  let encryptedCount = 0;
  let skippedCount = 0;

  // 加载主恢复密钥
  const masterKey = loadMasterKey();
  if (!masterKey) {
    console.error('未找到主恢复密钥！请先运行: npm run init-master-key');
    process.exit(1);
  }

  // 扫描待加密文件
  const allFiles = scanFiles({ protected: true });
  const filesToEncrypt = [];

  for (const f of allFiles) {
    if (f.parsed.fm.encrypted === true) {
      skippedCount++;
      continue;
    }
    filesToEncrypt.push(f);
  }

  if (filesToEncrypt.length === 0) {
    console.log('没有需要加密的文件。');
    if (skippedCount > 0) {
      console.log(`（${skippedCount} 个文件已加密，跳过）`);
    }
    return;
  }

  console.log(`找到 ${filesToEncrypt.length} 个待加密文件：`);
  for (const f of filesToEncrypt) {
    console.log(`  - ${f.dir}/${f.file}`);
  }

  // 确定每个文件的密码
  for (const f of filesToEncrypt) {
    const perPostPassword = typeof f.parsed.fm.password === 'string' ? f.parsed.fm.password : '';

    if (perPostPassword) {
      f.password = perPostPassword;
    } else if (globalPassword) {
      f.password = globalPassword;
    } else {
      globalPassword = await ask('请输入加密密码 (BLOG_PASSWORD): ');
      if (!globalPassword) {
        console.error('未提供密码，退出。');
        process.exit(1);
      }
      f.password = globalPassword;
    }
  }

  // 加密每个文件
  for (const f of filesToEncrypt) {
    // 1. 生成随机 CEK
    const cek = generateCEK();

    // 2. 用 CEK 加密文章正文
    const { ciphertext, salt: contentSalt } = encryptContent(f.parsed.body, cek);

    // 3. 用用户密码加密 CEK
    const { payload: encKeyPayload, salt: keySalt } = encryptCEK(cek, f.password);

    // 4. 用主恢复密钥加密 CEK
    const { payload: recKeyPayload, salt: recSalt } = encryptCEK(cek, masterKey);

    // 5. 重建 front matter
    const newFmRaw = rebuildFrontMatter(f.parsed.fmRaw, {
      remove: ['password'],
      set: {
        encrypted: true,
        layout: 'protected-post',
        salt: contentSalt,
        encrypted_key: encKeyPayload,
        key_salt: keySalt,
        recovery_key: recKeyPayload,
        recovery_salt: recSalt,
      },
    });

    // 6. 写回文件
    const newContent = `---\n${newFmRaw}\n---\n{% raw %}${ciphertext}{% endraw %}\n`;
    fs.writeFileSync(f.filePath, newContent, 'utf8');

    console.log(`已加密: ${f.dir}/${f.file}`);
    encryptedCount++;
  }

  console.log(`\n完成！共加密 ${encryptedCount} 个文件。`);
}

main().catch(err => {
  console.error('加密出错:', err.message);
  process.exit(1);
});
