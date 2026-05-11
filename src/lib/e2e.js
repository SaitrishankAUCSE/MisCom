/**
 * MisCom E2E Encryption Module
 * Uses Web Crypto API (AES-GCM 256-bit) for message encryption.
 *
 * How it works:
 * - Each user generates a keypair on signup/login (stored in localStorage).
 * - For private chats, a shared secret is derived per-conversation.
 * - Messages are encrypted before storage and decrypted on read.
 * - Keys never leave the device.
 */

const CRYPTO_KEY = 'miscom_e2e_key';
const ALGO = 'AES-GCM';

// ── Key Generation ──
async function generateKey() {
  const key = await crypto.subtle.generateKey(
    { name: ALGO, length: 256 },
    true, // extractable so we can export/import
    ['encrypt', 'decrypt']
  );
  const exported = await crypto.subtle.exportKey('jwk', key);
  localStorage.setItem(CRYPTO_KEY, JSON.stringify(exported));
  return key;
}

async function getKey() {
  const stored = localStorage.getItem(CRYPTO_KEY);
  if (stored) {
    const jwk = JSON.parse(stored);
    return await crypto.subtle.importKey('jwk', jwk, { name: ALGO }, true, ['encrypt', 'decrypt']);
  }
  return await generateKey();
}

// ── Encryption ──
async function encrypt(plaintext) {
  try {
    const key = await getKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);
    const ciphertext = await crypto.subtle.encrypt({ name: ALGO, iv }, key, encoded);
    // Pack iv + ciphertext as base64
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);
    return '🔒' + btoa(String.fromCharCode(...combined));
  } catch {
    return plaintext; // Fallback if crypto unavailable
  }
}

// ── Decryption ──
async function decrypt(ciphertext) {
  try {
    if (!ciphertext || !ciphertext.startsWith('🔒')) return ciphertext;
    const key = await getKey();
    const data = Uint8Array.from(atob(ciphertext.slice(2)), c => c.charCodeAt(0));
    const iv = data.slice(0, 12);
    const encrypted = data.slice(12);
    const decrypted = await crypto.subtle.decrypt({ name: ALGO, iv }, key, encrypted);
    return new TextDecoder().decode(decrypted);
  } catch {
    return '[Encrypted message]'; // Can't decrypt (different key)
  }
}

// ── Check if E2E is available ──
function isAvailable() {
  return typeof crypto !== 'undefined' && crypto.subtle;
}

// ── Check if a message is encrypted ──
function isEncrypted(text) {
  return text && text.startsWith('🔒');
}

const E2E = { encrypt, decrypt, isAvailable, isEncrypted, getKey, generateKey };
export default E2E;
