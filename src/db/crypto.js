const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/get-encryption-key`;

// Held in memory only for the session — never written to AsyncStorage or localStorage.
let cachedKey = null;

export async function fetchEncryptionKey(session) {
  if (!session?.access_token) {
    cachedKey = null;
    return;
  }
  try {
    const res = await fetch(FUNCTION_URL, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const { key, error } = await res.json();
    if (error || !key) {
      console.error('Failed to fetch encryption key:', error);
      cachedKey = null;
      return;
    }
    const rawKey = base64ToBytes(key);
    cachedKey = await crypto.subtle.importKey(
      'raw', rawKey, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']
    );
  } catch (e) {
    console.error('Encryption key fetch failed:', e);
    cachedKey = null;
  }
}

export function clearEncryptionKey() {
  cachedKey = null;
}

export function hasEncryptionKey() {
  return cachedKey !== null;
}

const ENC_PREFIX = 'enc:';

export async function encryptField(plaintext) {
  if (plaintext === null || plaintext === undefined) return null;
  if (!cachedKey) throw new Error('Encryption key not available');
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(String(plaintext));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cachedKey, encoded);
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return ENC_PREFIX + bytesToBase64(combined);
}

export async function decryptField(stored) {
  if (stored === null || stored === undefined) return stored;
  if (!stored.startsWith(ENC_PREFIX)) return stored; // never encrypted — pass through (covers existing data + guest demo habits)
  if (!cachedKey) throw new Error('Encryption key not available');
  try {
    const base64 = stored.slice(ENC_PREFIX.length);
    const combined = base64ToBytes(base64);
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cachedKey, ciphertext);
    return new TextDecoder().decode(decrypted);
  } catch (e) {
    console.error('Decryption failed for a field:', e);
    return '[unable to decrypt]'; // now only fires for genuinely corrupted/wrong-key ciphertext
  }
}

function bytesToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}