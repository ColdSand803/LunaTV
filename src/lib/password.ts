/**
 * 针对 Edge Runtime (Cloudflare) 优化的密码哈希工具
 * 使用标准 Web Crypto API (PBKDF2-SHA256)
 */

const SALT_LENGTH = 16;
const ITERATIONS = 100000;
const KEY_LENGTH = 32; // 256 bits

/**
 * 将 ArrayBuffer 转换为 Hex 字符串
 */
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * 将 Hex 字符串转换为 Uint8Array
 */
function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * 生成随机盐值
 */
function generateSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  return bufferToHex(salt);
}

/**
 * 使用 PBKDF2 生成哈希
 */
async function pbkdf2(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: hexToUint8Array(salt),
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    KEY_LENGTH * 8
  );

  return bufferToHex(derivedBits);
}

/**
 * 对密码进行加盐哈希，返回格式: `v2:salt:hash`
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = generateSalt();
  const hash = await pbkdf2(password, salt);
  return `v2:${salt}:${hash}`;
}

/**
 * 验证密码是否匹配存储的哈希值
 */
export async function verifyPassword(
  password: string,
  storedValue: string
): Promise<boolean> {
  if (!storedValue) return false;

  const parts = storedValue.split(':');

  // V2 格式 (PBKDF2)
  if (parts[0] === 'v2' && parts.length === 3) {
    const [, salt, storedHash] = parts;
    const hash = await pbkdf2(password, salt);
    return hash === storedHash;
  }

  // 旧格式兼容 (V1 scrypt) - 
  // 注意：在 Edge 环境下 scrypt 无法执行，
  // 这里的逻辑主要是为了防止崩溃，并提示旧密码在 Edge 下不可用
  if (parts.length === 2 && parts[0].length === 32 && parts[1].length === 128) {
     console.warn('检测到旧版 scrypt 哈希，Edge 环境不支持验证，请重置密码。');
     return false; 
  }

  // 兜底：明文匹配（兼容极其陈旧的数据或站长配置）
  return storedValue === password;
}

/**
 * 判断存储的密码值是否已经是哈希格式
 */
export function isHashed(storedValue: string): boolean {
  if (!storedValue) return false;
  const parts = storedValue.split(':');
  // 只要符合 v2 前缀或者旧版 salt:hash 格式都认为是已哈希
  return (
    parts[0] === 'v2' || 
    (parts.length === 2 && parts[0].length === 32)
  );
}
