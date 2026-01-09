/**
 * Client-side file encryption/decryption for chat attachments
 * Uses AES-256-GCM for authenticated encryption
 *
 * Following Matrix encrypted attachment standards with modern crypto
 */

export interface EncryptedFileInfo {
  // Base64-encoded AES-256 key
  key: string;
  // Base64-encoded 12-byte IV/nonce
  iv: string;
  // SHA-256 hash of the encrypted file (for integrity verification)
  sha256: string;
  // Original file metadata
  mimetype: string;
  size: number;
  filename: string;
}

export interface DecryptedFile {
  data: ArrayBuffer;
  mimetype: string;
  filename: string;
}

/**
 * Convert ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Generate a random AES-256 key for file encryption
 */
async function generateFileKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true, // extractable - needed to send to recipients
    ["encrypt", "decrypt"]
  );
}

/**
 * Generate a random 12-byte IV for AES-GCM
 */
function generateIV(): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(12));
}

/**
 * Calculate SHA-256 hash of data
 */
async function sha256(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return arrayBufferToBase64(hashBuffer);
}

/**
 * Export CryptoKey to base64 string
 */
async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey("raw", key);
  return arrayBufferToBase64(exported);
}

/**
 * Import base64 key string to CryptoKey
 */
async function importKey(keyBase64: string): Promise<CryptoKey> {
  const keyData = base64ToArrayBuffer(keyBase64);
  return await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "AES-GCM", length: 256 },
    false, // not extractable after import
    ["decrypt"]
  );
}

/**
 * Encrypt a file for secure upload
 * Returns the encrypted blob and encryption info needed for decryption
 */
export async function encryptFile(file: File): Promise<{
  encryptedBlob: Blob;
  info: EncryptedFileInfo;
}> {
  // Read file data
  const fileData = await file.arrayBuffer();

  // Generate encryption key and IV
  const key = await generateFileKey();
  const iv = generateIV();

  // Encrypt the file
  const encryptedData = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    fileData
  );

  // Calculate hash of encrypted data for integrity
  const hash = await sha256(encryptedData);

  // Export key for transmission
  const exportedKey = await exportKey(key);

  // Create encrypted blob
  const encryptedBlob = new Blob([encryptedData], {
    type: "application/octet-stream",
  });

  return {
    encryptedBlob,
    info: {
      key: exportedKey,
      iv: arrayBufferToBase64(iv.buffer),
      sha256: hash,
      mimetype: file.type || "application/octet-stream",
      size: file.size,
      filename: file.name,
    },
  };
}

/**
 * Decrypt a downloaded encrypted file
 */
export async function decryptFile(
  encryptedData: ArrayBuffer,
  info: EncryptedFileInfo
): Promise<DecryptedFile> {
  // Verify integrity first
  const hash = await sha256(encryptedData);
  if (hash !== info.sha256) {
    throw new Error("File integrity check failed - data may be corrupted");
  }

  // Import the decryption key
  const key = await importKey(info.key);
  const iv = base64ToArrayBuffer(info.iv);

  // Decrypt the file
  const decryptedData = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    encryptedData
  );

  return {
    data: decryptedData,
    mimetype: info.mimetype,
    filename: info.filename,
  };
}

/**
 * Download and decrypt an encrypted file from URL
 */
export async function downloadAndDecryptFile(
  url: string,
  info: EncryptedFileInfo
): Promise<DecryptedFile> {
  // Fetch the encrypted file
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }

  const encryptedData = await response.arrayBuffer();
  return decryptFile(encryptedData, info);
}

/**
 * Create a downloadable blob URL from decrypted file
 */
export function createBlobUrl(decrypted: DecryptedFile): string {
  const blob = new Blob([decrypted.data], { type: decrypted.mimetype });
  return URL.createObjectURL(blob);
}

/**
 * Check if a mimetype is an image
 */
export function isImageMimetype(mimetype: string): boolean {
  return mimetype.startsWith("image/");
}

/**
 * Check if a mimetype is a video
 */
export function isVideoMimetype(mimetype: string): boolean {
  return mimetype.startsWith("video/");
}

/**
 * Check if a mimetype is audio
 */
export function isAudioMimetype(mimetype: string): boolean {
  return mimetype.startsWith("audio/");
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
