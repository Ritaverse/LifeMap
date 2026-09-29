const encoder = new TextEncoder();
const decoder = new TextDecoder();

export type BinaryLike = ArrayBuffer | Uint8Array | number[];

function ownedBuffer(value: BinaryLike) {
  if (Array.isArray(value)) return Uint8Array.from(value).buffer;
  return value instanceof Uint8Array ? Uint8Array.from(value).buffer : value.slice(0);
}

export function bytesToHex(bytes: BinaryLike) {
  const view = Array.isArray(bytes) ? Uint8Array.from(bytes) : bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return Array.from(view, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function bytesToBase64(bytes: BinaryLike) {
  const view = Array.isArray(bytes) ? Uint8Array.from(bytes) : bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (let index = 0; index < view.length; index += 0x8000) {
    binary += String.fromCharCode(...view.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

export function base64ToBytes(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function bytesToBase64Url(bytes: BinaryLike) {
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function sha256Hex(value: BinaryLike | string) {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  return bytesToHex(await crypto.subtle.digest("SHA-256", ownedBuffer(bytes)));
}

export function randomToken(byteLength = 32) {
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

async function importHmacKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function hmacHex(secret: string, value: string) {
  const signature = await crypto.subtle.sign("HMAC", await importHmacKey(secret), encoder.encode(value));
  return bytesToHex(signature);
}

export async function hmacBase64(secret: string, value: BinaryLike) {
  const signature = await crypto.subtle.sign("HMAC", await importHmacKey(secret), ownedBuffer(value));
  return bytesToBase64(signature);
}

export async function verifyShopifyHmac(secret: string, body: Uint8Array, signature: string | null) {
  if (!signature || !/^[A-Za-z0-9+/]+={0,2}$/.test(signature)) return false;
  let signatureBytes: Uint8Array;
  try {
    signatureBytes = base64ToBytes(signature);
  } catch {
    return false;
  }
  return crypto.subtle.verify(
    "HMAC",
    await importHmacKey(secret),
    ownedBuffer(signatureBytes),
    ownedBuffer(body),
  );
}

function encryptionKey(secret: string) {
  const bytes = base64ToBytes(secret);
  if (bytes.byteLength !== 32) throw new Error("REPORT_PII_KEY must decode to exactly 32 bytes");
  return crypto.subtle.importKey("raw", ownedBuffer(bytes), "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptString(secret: string, value: string) {
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: ownedBuffer(nonce) },
    await encryptionKey(secret),
    ownedBuffer(encoder.encode(value)),
  );
  return { ciphertext: new Uint8Array(ciphertext), nonce };
}

export async function decryptString(secret: string, ciphertext: BinaryLike, nonce: BinaryLike) {
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ownedBuffer(nonce) },
    await encryptionKey(secret),
    ownedBuffer(ciphertext),
  );
  return decoder.decode(plaintext);
}

export function deriveEmailLinkToken(secret: string, tokenId: string, expiresAt: number) {
  return hmacHex(secret, `${tokenId}.${expiresAt}`);
}
