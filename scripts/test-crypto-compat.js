#!/usr/bin/env node
/**
 * 加密兼容性测试脚本
 *
 * 验证 crypto-utils.js 的加密格式正确、往返解密一致。
 * 退出码：0 全部通过，1 有失败。
 */

const {
  generateCEK,
  encryptContent,
  decryptContent,
  encryptCEK,
  decryptCEK,
  aesEncrypt,
  aesDecrypt,
  deriveKey,
  ITERATIONS,
  KEY_LENGTH,
  SALT_LENGTH,
  CEK_LENGTH,
} = require('./crypto-utils');

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  PASS: ${label}`);
    passed++;
  } else {
    console.log(`  FAIL: ${label}`);
    failed++;
  }
}

// ─── 格式校验辅助 ───────────────────────────────────────────

/** IV 为 32 个 hex 字符（16 字节），紧接 ':'，然后是 Base64 */
function isValidIVBase64(payload) {
  const m = payload.match(/^([0-9a-f]{32}):(.+)$/i);
  if (!m) return false;
  // Base64 合法性检查（允许末尾 = 填充）
  return /^[A-Za-z0-9+/]+=*$/.test(m[2]);
}

function isHex(str, expectedLength) {
  return new RegExp(`^[0-9a-f]{${expectedLength}}$`, 'i').test(str);
}

// ─── 测试 ───────────────────────────────────────────────────

console.log('=== Crypto Compatibility Tests ===\n');

// Test 1: CEK round-trip
console.log('Test 1: CEK round-trip');
{
  const original = 'Hello, this is a test message for encryption.';
  const cek = generateCEK();
  const { ciphertext } = encryptContent(original, cek);
  const recovered = decryptContent(ciphertext, cek);
  assert(recovered === original, 'Content round-trip');
  assert(isValidIVBase64(ciphertext), 'Ciphertext format (IV:Base64)');
}

console.log();

// Test 2: CEK encryption with password
console.log('Test 2: CEK encryption with password');
{
  const cek = generateCEK();
  const password = 'test-password-123';
  const { payload, salt } = encryptCEK(cek, password);
  const recoveredCEK = decryptCEK(payload, password, salt);

  assert(cek.equals(recoveredCEK), 'CEK recovered matches original');
  assert(isValidIVBase64(payload), 'Encrypted key payload format (IV:Base64)');
  assert(isHex(salt, SALT_LENGTH * 2), `Key salt is ${SALT_LENGTH * 2}-char hex`);
}

console.log();

// Test 3: Full pipeline simulation (encrypt.js → protected-post.html)
console.log('Test 3: Full pipeline simulation');
{
  const plaintext = 'This content is encrypted on the server and decrypted in the browser.';
  const password = 'my-secret-password';

  // encrypt.js 端
  const cek = generateCEK();
  const { ciphertext } = encryptContent(plaintext, cek);
  const { payload: encryptedKey, salt: keySalt } = encryptCEK(cek, password);

  // protected-post.html 端（浏览器解密流程模拟）
  const recoveredCEK = decryptCEK(encryptedKey, password, keySalt);
  const recoveredText = decryptContent(ciphertext, recoveredCEK);

  assert(recoveredText === plaintext, 'Full pipeline round-trip');
  assert(cek.equals(recoveredCEK), 'CEK integrity across pipeline');
}

console.log();

// Test 4: Format validation
console.log('Test 4: Format validation');
{
  const cek = generateCEK();
  const password = 'format-check';
  const { payload, salt } = encryptCEK(cek, password);
  const { ciphertext, salt: contentSalt } = encryptContent('test', cek);

  assert(isValidIVBase64(payload), 'encrypted_key is IV_hex:Base64');
  assert(isHex(salt, SALT_LENGTH * 2), `key_salt is ${SALT_LENGTH * 2}-char hex`);
  assert(isHex(contentSalt, SALT_LENGTH * 2), `content salt is ${SALT_LENGTH * 2}-char hex`);
  assert(isHex(cek.toString('hex'), CEK_LENGTH * 2), `CEK hex is ${CEK_LENGTH * 2}-char hex string`);
}

console.log();

// Test 5: Chinese content test
console.log('Test 5: Chinese content test');
{
  const chinese = '这是一段中文内容，用于测试加密解密的兼容性。包含特殊字符：《》、""、——、……';
  const cek = generateCEK();
  const { ciphertext } = encryptContent(chinese, cek);
  const recovered = decryptContent(ciphertext, cek);
  assert(recovered === chinese, 'Chinese content round-trip');

  // 含中文的全流程
  const password = '中文密码测试';
  const { payload, salt } = encryptCEK(cek, password);
  const recoveredCEK = decryptCEK(payload, password, salt);
  const recoveredViaPipeline = decryptContent(ciphertext, recoveredCEK);
  assert(recoveredViaPipeline === chinese, 'Chinese content full pipeline');
}

console.log();

// Test 6: Wrong password test
console.log('Test 6: Wrong password test');
{
  const cek = generateCEK();
  const { payload, salt } = encryptCEK(cek, 'correct-password');
  let threw = false;
  try {
    decryptCEK(payload, 'wrong-password', salt);
  } catch (e) {
    threw = true;
  }
  assert(threw, 'Wrong password throws error');
}

// ─── 结果 ───────────────────────────────────────────────────

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
