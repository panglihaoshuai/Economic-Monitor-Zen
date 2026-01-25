// Encryption utilities for secure API key storage

import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

// 验证加密密钥长度
if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
  throw new Error(
    'ENCRYPTION_KEY must be set and at least 32 characters long. ' +
    'Please set it in your .env.local file. ' +
    'Generate one with: openssl rand -base64 32'
  );
}

export function encrypt(text: string): string {
  return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY!).toString();
}

export function decrypt(encryptedText: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY!);
  return bytes.toString(CryptoJS.enc.Utf8);
}

export function isValidEncryption(text: string): boolean {
  try {
    decrypt(text);
    return true;
  } catch {
    return false;
  }
}
