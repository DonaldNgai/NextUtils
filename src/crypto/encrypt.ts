import crypto from 'crypto';

/**
 * Encrypts a plaintext string with a shared secret using AES-256-GCM
 * GCM provides authenticated encryption (confidentiality + authenticity)
 * @param token The token/plaintext to encrypt
 * @param secretKey The secret key for encryption
 * @returns Encrypted token as base64 string in format: iv:encrypted:authTag
 */
export function encryptToken(token: string, secretKey: string): string {
  // Derive a 32-byte key from the secret key using SHA-256
  const key = crypto.createHash('sha256').update(secretKey).digest();
  
  // Generate a random IV (Initialization Vector) - 12 bytes recommended for GCM
  const iv = crypto.randomBytes(12);
  
  // Create cipher with AES-256-GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  // Encrypt the token
  let encrypted = cipher.update(token, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  // Get the authentication tag (GCM provides built-in authentication)
  const authTag = cipher.getAuthTag();
  
  // Return format: iv:encrypted:authTag (all base64)
  // The backend will need to extract these three parts to decrypt
  return `${iv.toString('base64')}:${encrypted}:${authTag.toString('base64')}`;
}
