const crypto = require('crypto');
const env    = require('../config/env');

const ALGO    = 'aes-256-gcm';
const KEY_LEN = 32;
const IV_LEN  = 12;
const TAG_LEN = 16;

function _deriveKey() {
  const raw = env.ENCRYPTION_KEY || 'dev_encryption_key_32_bytes_min!!';
  return crypto.scryptSync(raw, 'power-plan-salt', KEY_LEN);
}

function encrypt(plaintext) {
  if (!plaintext) return null;
  const key = _deriveKey();
  const iv  = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: iv(hex):tag(hex):ciphertext(hex)
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decrypt(ciphertext) {
  if (!ciphertext) return null;
  const [ivHex, tagHex, dataHex] = ciphertext.split(':');
  if (!ivHex || !tagHex || !dataHex) return null;
  const key = _deriveKey();
  const iv  = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const data = Buffer.from(dataHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(data) + decipher.final('utf8');
}

module.exports = { encrypt, decrypt };
