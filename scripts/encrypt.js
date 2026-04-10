#!/usr/bin/env node

/**
 * 博客文章加密脚本
 *
 * 扫描 _posts/, _notes/, _readings/, _thoughts/ 中标记了 protected: true 的文件，
 * 使用 AES-256-CBC 加密正文内容。
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

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

const CONTENT_DIRS = ['_posts', '_notes', '_readings', '_thoughts'];
const ROOT = path.resolve(__dirname, '..');
const ITERATIONS = 100000;
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;
const SALT_LENGTH = 16;

function parseFrontMatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return null;

  const fmRaw = match[1];
  const body = match[2];

  // Simple YAML parser for flat key-value pairs
  const fm = {};
  for (const line of fmRaw.split('\n')) {
    const kvMatch = line.match(/^(\w[\w_]*)\s*:\s*(.*)$/);
    if (kvMatch) {
      let val = kvMatch[2].trim();
      // Handle quoted strings
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      // Handle booleans
      if (val === 'true') val = true;
      else if (val === 'false') val = false;
      fm[kvMatch[1]] = val;
    } else {
      // Preserve lines we can't parse (like arrays)
    }
  }

  return { fm, fmRaw, body };
}

function rebuildFrontMatter(fmRaw, changes) {
  let lines = fmRaw.split('\n');

  // Apply removals
  if (changes.remove) {
    for (const key of changes.remove) {
      lines = lines.filter(line => !line.match(new RegExp(`^${key}\\s*:`)));
    }
  }

  // Apply updates/additions
  if (changes.set) {
    for (const [key, value] of Object.entries(changes.set)) {
      const idx = lines.findIndex(line => line.match(new RegExp(`^${key}\\s*:`)));
      const formatted = typeof value === 'string' && value.includes(' ')
        ? `${key}: "${value}"`
        : `${key}: ${value}`;
      if (idx >= 0) {
        lines[idx] = formatted;
      } else {
        lines.push(formatted);
      }
    }
  }

  return lines.join('\n');
}

function encrypt(plaintext, password, salt) {
  const key = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha256');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  return iv.toString('hex') + ':' + encrypted;
}

function askPassword() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question('请输入加密密码 (BLOG_PASSWORD): ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  let globalPassword = process.env.BLOG_PASSWORD || '';
  let encryptedCount = 0;
  let skippedCount = 0;

  const filesToEncrypt = [];

  // Scan all content directories
  for (const dir of CONTENT_DIRS) {
    const dirPath = path.join(ROOT, dir);
    if (!fs.existsSync(dirPath)) continue;

    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = parseFrontMatter(content);

      if (!parsed) continue;
      if (parsed.fm.protected !== true) continue;
      if (parsed.fm.encrypted === true) {
        skippedCount++;
        continue;
      }

      filesToEncrypt.push({ filePath, file, dir, content, parsed });
    }
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

  // Determine passwords
  for (const f of filesToEncrypt) {
    const perPostPassword = typeof f.parsed.fm.password === 'string' ? f.parsed.fm.password : '';

    if (perPostPassword) {
      f.password = perPostPassword;
    } else if (globalPassword) {
      f.password = globalPassword;
    } else {
      // Ask once
      globalPassword = await askPassword();
      if (!globalPassword) {
        console.error('未提供密码，退出。');
        process.exit(1);
      }
      f.password = globalPassword;
    }
  }

  // Encrypt each file
  for (const f of filesToEncrypt) {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const ciphertext = encrypt(f.parsed.body, f.password, salt);

    // Rebuild front matter
    const newFmRaw = rebuildFrontMatter(f.parsed.fmRaw, {
      remove: ['password'],
      set: {
        encrypted: true,
        salt: salt.toString('hex'),
        layout: 'protected-post',
      },
    });

    // Write back
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
