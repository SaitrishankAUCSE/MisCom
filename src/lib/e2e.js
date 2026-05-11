/**
 * MisCom Encryption Module (Local-Only, NOT True E2E)
 * 
 * ⚠️ CRITICAL LIMITATION: This is NOT end-to-end encryption (E2E).
 * 
 * Current Implementation:
 * - Each device generates its own AES-GCM key stored in localStorage
 * - Messages encrypted on Device A CANNOT be decrypted on Device B (different keys!)
 * - Fallback returns "[Encrypted message]" - messages are unreadable across devices
 * - This provides ZERO security for multi-device use
 * 
 * To implement TRUE end-to-end encryption, you would need:
 * 1. ECDH (Elliptic Curve Diffie-Hellman) key exchange on first chat
 * 2. Derived shared secret for symmetric encryption
 * 3. Or use Firebase App Check + server-side encryption
 * 4. Or use a dedicated E2E solution (Signal Protocol, TweetNaCl.js, etc.)
 * 
 * For now: This module provides LOCAL device encryption only.
 * Recommendation: Use Firebase Security Rules + HTTPS for transport security instead.
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

// ── Encryption (Device-Local Only) ──
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

// ── Decryption (Cannot decrypt messages from other devices!) ──
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
    // SECURITY NOTE: Messages cannot be decrypted on different devices due to unshared keys
    return '[Encrypted message - available only on original device]';
  }
}

// ── Check if E2E is available ──
function isAvailable() {
  console.warn('[MisCom] E2E module loaded. Note: This is device-local encryption, not true E2E.');
  return typeof crypto !== 'undefined' && crypto.subtle;
}

// ── Check if a message is encrypted ──
function isEncrypted(text) {
  return text && text.startsWith('🔒');
}

const E2E = { encrypt, decrypt, isAvailable, isEncrypted, getKey, generateKey };
export default E2E;
