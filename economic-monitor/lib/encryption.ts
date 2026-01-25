// Encryption utilities for secure API key storage

import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'placeholder-key-for-build-time-only-32chars';

// 验证加密密钥长度（仅在运行时验证，构建时跳过验证）
function validateEncryptionKey() {
  // 跳过构建时验证（NODE_ENV=test或无加密操作时）
  if (typeof window !== 'undefined' || process.env.NODE_ENV === 'test') {
    return;
  }
  
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length < 32 || key === 'placeholder-key-for-build-time-only-32chars') {
    throw new Error(
      'ENCRYPTION_KEY must be set and at least 32 characters long. ' +
      'Please set it in your environment variables. ' +
      'Generate one with: openssl rand -base64 32'
    );
  }
}

export function encrypt(text: string): string {
  validateEncryptionKey();
  return CryptoJS.AES.encrypt(text, process.env.ENCRYPTION_KEY!).toString();
}

export function decrypt(encryptedText: string): string {
  validateEncryptionKey();
  const bytes = CryptoJS.AES.decrypt(encryptedText, process.env.ENCRYPTION_KEY!);
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
