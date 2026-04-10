/**
 * 加密通用工具模块
 *
 * 提供 AES-256-CBC 加密/解密、PBKDF2 密钥派生、CEK 管理等公共函数。
 * 供 encrypt.js / decrypt.js / change-password.js / recover-password.js 共用。
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

const CONTENT_DIRS = ['_posts', '_notes', '_readings', '_thoughts'];
const ROOT = path.resolve(__dirname, '..');
const MASTER_KEY_FILE = path.join(ROOT, '.master-key');
const ITERATIONS = 100000;
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;
const SALT_LENGTH = 16;
const CEK_LENGTH = 32; // 256 bits

// ─── Front Matter 解析 ──────────────────────────────────────

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

// ─── 加密 / 解密原语 ────────────────────────────────────────

function aesEncrypt(plaintext, key, encoding = 'utf8') {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

  let encrypted = cipher.update(plaintext, encoding, 'base64');
  encrypted += cipher.final('base64');

  return iv.toString('hex') + ':' + encrypted;
}

function aesDecrypt(payload, key, encoding = 'utf8') {
  const colonIdx = payload.indexOf(':');
  if (colonIdx === -1) throw new Error('密文格式错误：缺少 IV 分隔符');

  const ivHex = payload.substring(0, colonIdx);
  const cipherBase64 = payload.substring(colonIdx + 1);

  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

  let decrypted = decipher.update(cipherBase64, 'base64', encoding);
  decrypted += decipher.final(encoding);

  return decrypted;
}

function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha256');
}

// ─── CEK 操作 ───────────────────────────────────────────────

function generateCEK() {
  return crypto.randomBytes(CEK_LENGTH);
}

/**
 * 用密码加密 CEK，返回 { payload, salt }
 * payload = IV_hex:Base64(encrypted_CEK)
 * salt = hex string
 */
function encryptCEK(cek, password) {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(password, salt);
  const payload = aesEncrypt(cek.toString('hex'), key);
  return { payload, salt: salt.toString('hex') };
}

/**
 * 用密码解密 CEK
 * @returns {Buffer} CEK
 */
function decryptCEK(payload, password, saltHex) {
  const salt = Buffer.from(saltHex, 'hex');
  const key = deriveKey(password, salt);
  const cekHex = aesDecrypt(payload, key);
  return Buffer.from(cekHex, 'hex');
}

/**
 * 用 CEK 加密文章正文
 * @returns {{ ciphertext: string, salt: string }}
 */
function encryptContent(plaintext, cek) {
  const salt = crypto.randomBytes(SALT_LENGTH);
  // 对内容加密直接使用 CEK 作为 key（CEK 本身就是 256 位随机密钥，不需要 PBKDF2）
  const payload = aesEncrypt(plaintext, cek);
  return { ciphertext: payload, salt: salt.toString('hex') };
}

/**
 * 用 CEK 解密文章正文
 */
function decryptContent(cipherPayload, cek) {
  let payload = cipherPayload
    .replace(/\{%\s*raw\s*%\}/g, '')
    .replace(/\{%\s*endraw\s*%\}/g, '')
    .replace(/<\/?p>/g, '')
    .trim();

  return aesDecrypt(payload, cek);
}

// ─── 主恢复密钥 ─────────────────────────────────────────────

function loadMasterKey() {
  if (!fs.existsSync(MASTER_KEY_FILE)) {
    return null;
  }
  return fs.readFileSync(MASTER_KEY_FILE, 'utf8').trim();
}

function saveMasterKey(key) {
  fs.writeFileSync(MASTER_KEY_FILE, key + '\n', 'utf8');
}

function generateMasterKey() {
  return crypto.randomBytes(32).toString('hex');
}

// ─── 文件扫描 ───────────────────────────────────────────────

function scanFiles({ encrypted, protected: isProtected }) {
  const results = [];

  for (const dir of CONTENT_DIRS) {
    const dirPath = path.join(ROOT, dir);
    if (!fs.existsSync(dirPath)) continue;

    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = parseFrontMatter(content);

      if (!parsed) continue;

      if (encrypted !== undefined && parsed.fm.encrypted !== encrypted) continue;
      if (isProtected !== undefined && parsed.fm.protected !== isProtected) continue;

      results.push({ filePath, file, dir, content, parsed });
    }
  }

  return results;
}

function loadSpecificFile(relativePath) {
  const filePath = path.resolve(ROOT, relativePath);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const parsed = parseFrontMatter(content);
  if (!parsed) return null;

  return { filePath, file: path.basename(filePath), dir: path.dirname(relativePath), content, parsed };
}

// ─── 交互 ───────────────────────────────────────────────────

function ask(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// ─── 旧格式检测 ─────────────────────────────────────────────

/**
 * 判断文件是否为旧格式（没有 encrypted_key 字段）
 */
function isLegacyFormat(fm) {
  return fm.encrypted === true && !fm.encrypted_key;
}

module.exports = {
  CONTENT_DIRS,
  ROOT,
  MASTER_KEY_FILE,
  ITERATIONS,
  KEY_LENGTH,
  IV_LENGTH,
  SALT_LENGTH,
  CEK_LENGTH,
  parseFrontMatter,
  rebuildFrontMatter,
  aesEncrypt,
  aesDecrypt,
  deriveKey,
  generateCEK,
  encryptCEK,
  decryptCEK,
  encryptContent,
  decryptContent,
  loadMasterKey,
  saveMasterKey,
  generateMasterKey,
  scanFiles,
  loadSpecificFile,
  ask,
  isLegacyFormat,
};
