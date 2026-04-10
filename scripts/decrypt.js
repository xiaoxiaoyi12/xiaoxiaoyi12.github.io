#!/usr/bin/env node

/**
 * 博客文章解密脚本
 *
 * 将已加密的文章还原为明文，方便编辑。
 * 编辑完成后重新运行 encrypt.js 加密。
 *
 * 用法：
 *   npm run decrypt
 *   BLOG_PASSWORD=mypassword npm run decrypt
 *   npm run decrypt -- _thoughts/2026-04-10-my-thought.md   # 解密指定文件
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

const CONTENT_DIRS = ['_posts', '_notes', '_readings', '_thoughts'];
const ROOT = path.resolve(__dirname, '..');
const ITERATIONS = 100000;
const KEY_LENGTH = 32;

function parseFrontMatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return null;

  const fmRaw = match[1];
  const body = match[2];

  const fm = {};
  for (const line of fmRaw.split('\n')) {
    const kvMatch = line.match(/^(\w[\w_]*)\s*:\s*(.*)$/);
    if (kvMatch) {
      let val = kvMatch[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (val === 'true') val = true;
      else if (val === 'false') val = false;
      fm[kvMatch[1]] = val;
    }
  }

  return { fm, fmRaw, body };
}

function rebuildFrontMatter(fmRaw, changes) {
  let lines = fmRaw.split('\n');

  if (changes.remove) {
    for (const key of changes.remove) {
      lines = lines.filter(line => !line.match(new RegExp(`^${key}\\s*:`)));
    }
  }

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

function decrypt(cipherPayload, password, saltHex) {
  const salt = Buffer.from(saltHex, 'hex');
  const key = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha256');

  // Strip {% raw %} and {% endraw %} tags
  let payload = cipherPayload
    .replace(/\{%\s*raw\s*%\}/g, '')
    .replace(/\{%\s*endraw\s*%\}/g, '')
    .trim();

  const colonIdx = payload.indexOf(':');
  if (colonIdx === -1) throw new Error('密文格式错误：缺少 IV 分隔符');

  const ivHex = payload.substring(0, colonIdx);
  const cipherBase64 = payload.substring(colonIdx + 1);

  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

  let decrypted = decipher.update(cipherBase64, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

function askPassword() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question('请输入解密密码 (BLOG_PASSWORD): ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  let globalPassword = process.env.BLOG_PASSWORD || '';
  let decryptedCount = 0;

  // Check for specific file argument
  const specificFile = process.argv[2];
  const filesToDecrypt = [];

  if (specificFile) {
    // Decrypt a specific file
    const filePath = path.resolve(ROOT, specificFile);
    if (!fs.existsSync(filePath)) {
      console.error(`文件不存在: ${specificFile}`);
      process.exit(1);
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = parseFrontMatter(content);
    if (!parsed || parsed.fm.encrypted !== true) {
      console.error(`文件未加密: ${specificFile}`);
      process.exit(1);
    }
    filesToDecrypt.push({ filePath, file: path.basename(filePath), dir: path.dirname(specificFile), content, parsed });
  } else {
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
        if (parsed.fm.encrypted !== true) continue;

        filesToDecrypt.push({ filePath, file, dir, content, parsed });
      }
    }
  }

  if (filesToDecrypt.length === 0) {
    console.log('没有需要解密的文件。');
    return;
  }

  console.log(`找到 ${filesToDecrypt.length} 个待解密文件：`);
  for (const f of filesToDecrypt) {
    console.log(`  - ${f.dir}/${f.file}`);
  }

  // Get password
  if (!globalPassword) {
    globalPassword = await askPassword();
    if (!globalPassword) {
      console.error('未提供密码，退出。');
      process.exit(1);
    }
  }

  // Decrypt each file
  for (const f of filesToDecrypt) {
    const saltHex = f.parsed.fm.salt;
    if (!saltHex) {
      console.error(`跳过 ${f.file}: 缺少 salt`);
      continue;
    }

    try {
      const plaintext = decrypt(f.parsed.body, globalPassword, saltHex);

      // Rebuild front matter: remove encrypted/salt, restore layout
      const newFmRaw = rebuildFrontMatter(f.parsed.fmRaw, {
        remove: ['encrypted', 'salt'],
        set: {
          layout: 'post',
        },
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
