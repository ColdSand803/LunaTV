/* eslint-disable no-console, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import { AdminConfig } from './admin.types';
import { hashPassword, isHashed, verifyPassword } from './password';
import { Favorite, IStorage, PlayRecord, SkipConfig } from './types';

const SEARCH_HISTORY_LIMIT = 20;

function ensureString(value: any): string {
  return String(value);
}

function ensureStringArray(value: any[]): string[] {
  return value.map((item) => String(item));
}

let kvInstance: KVNamespace | null = null;
let d1Instance: D1Database | null = null;

export function setCloudflareKV(kv: KVNamespace): void {
  kvInstance = kv;
}

export function setCloudflareD1(d1: D1Database): void {
  d1Instance = d1;
}

export function initCloudflareFromEnv(): void {
  const kvBinding = (process.env as Record<string, unknown>).LunaTV_KV as
    | KVNamespace
    | undefined;
  const d1Binding = (process.env as Record<string, unknown>).LunaTV_D1 as
    | D1Database
    | undefined;

  if (kvBinding) {
    kvInstance = kvBinding;
  }
  if (d1Binding) {
    d1Instance = d1Binding;
  }
}

export function getKV(): KVNamespace {
  if (!kvInstance) {
    throw new Error(
      'Cloudflare KV not initialized. Call setCloudflareKV first.',
    );
  }
  return kvInstance;
}

export function getD1(): D1Database {
  if (!d1Instance) {
    throw new Error(
      'Cloudflare D1 not initialized. Call setCloudflareD1 first.',
    );
  }
  return d1Instance;
}

async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (err: any) {
      if (i < maxRetries - 1) {
        console.log(
          `Cloudflare operation failed, retrying... (${i + 1}/${maxRetries})`,
        );
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Max retries exceeded');
}

export class CloudflareStorage implements IStorage {
  private kvPrefix = 'cf:';

  private kvKey(user: string, type: string, key?: string): string {
    if (key) {
      return `${this.kvPrefix}u:${user}:${type}:${key}`;
    }
    return `${this.kvPrefix}u:${user}:${type}`;
  }

  private kvKeyGlobal(type: string): string {
    return `${this.kvPrefix}g:${type}`;
  }

  private kvKeyAll(pattern: string): string {
    return `${this.kvPrefix}${pattern}`;
  }

  async initD1Schema(): Promise<void> {
    const d1 = getD1();
    await d1.exec(`
      CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        password TEXT NOT NULL,
        created_at INTEGER DEFAULT (unixepoch())
      )
    `);
  }

  async ensureUserTable(): Promise<void> {
    try {
      const d1 = getD1();
      const result = await d1
        .prepare('SELECT name FROM sqlite_master WHERE type=? AND name=?')
        .bind('table', 'users')
        .first();
      if (!result) {
        await this.initD1Schema();
      }
    } catch {
      await this.initD1Schema();
    }
  }

  async migrateData(): Promise<void> {
    console.log('Cloudflare storage: no data migration needed');
  }

  async migratePasswords(): Promise<void> {
    console.log('Cloudflare storage: no password migration needed');
  }

  async clearAllData(): Promise<void> {
    const kv = getKV();
    const d1 = getD1();

    const list = await kv.list({ prefix: this.kvPrefix });
    for (const key of list.keys) {
      await kv.delete(key.name);
    }

    await d1.exec('DELETE FROM users');
  }

  async getPlayRecord(
    userName: string,
    key: string,
  ): Promise<PlayRecord | null> {
    const kv = getKV();
    const val = await withRetry(() => kv.get(this.kvKey(userName, 'pr', key)));
    return val ? (JSON.parse(val) as PlayRecord) : null;
  }

  async setPlayRecord(
    userName: string,
    key: string,
    record: PlayRecord,
  ): Promise<void> {
    const kv = getKV();
    await withRetry(() =>
      kv.put(this.kvKey(userName, 'pr', key), JSON.stringify(record)),
    );
  }

  async getAllPlayRecords(
    userName: string,
  ): Promise<Record<string, PlayRecord>> {
    const kv = getKV();
    const result: Record<string, PlayRecord> = {};
    const list = await kv.list({ prefix: this.kvKey(userName, 'pr:') });
    for (const item of list.keys) {
      const key = item.name;
      const val = await kv.get(key);
      if (val) {
        const recordKey = key.replace(this.kvKey(userName, 'pr:'), '');
        result[recordKey] = JSON.parse(val) as PlayRecord;
      }
    }
    return result;
  }

  async deletePlayRecord(userName: string, key: string): Promise<void> {
    const kv = getKV();
    await kv.delete(this.kvKey(userName, 'pr', key));
  }

  async deleteAllPlayRecords(userName: string): Promise<void> {
    const kv = getKV();
    const list = await kv.list({ prefix: this.kvKey(userName, 'pr:') });
    for (const item of list.keys) {
      await kv.delete(item.name);
    }
  }

  async getFavorite(userName: string, key: string): Promise<Favorite | null> {
    const kv = getKV();
    const val = await withRetry(() => kv.get(this.kvKey(userName, 'fav', key)));
    return val ? (JSON.parse(val) as Favorite) : null;
  }

  async setFavorite(
    userName: string,
    key: string,
    favorite: Favorite,
  ): Promise<void> {
    const kv = getKV();
    await withRetry(() =>
      kv.put(this.kvKey(userName, 'fav', key), JSON.stringify(favorite)),
    );
  }

  async getAllFavorites(userName: string): Promise<Record<string, Favorite>> {
    const kv = getKV();
    const result: Record<string, Favorite> = {};
    const list = await kv.list({ prefix: this.kvKey(userName, 'fav:') });
    for (const item of list.keys) {
      const val = await kv.get(item.name);
      if (val) {
        const recordKey = item.name.replace(this.kvKey(userName, 'fav:'), '');
        result[recordKey] = JSON.parse(val) as Favorite;
      }
    }
    return result;
  }

  async deleteFavorite(userName: string, key: string): Promise<void> {
    const kv = getKV();
    await kv.delete(this.kvKey(userName, 'fav', key));
  }

  async deleteAllFavorites(userName: string): Promise<void> {
    const kv = getKV();
    const list = await kv.list({ prefix: this.kvKey(userName, 'fav:') });
    for (const item of list.keys) {
      await kv.delete(item.name);
    }
  }

  async registerUser(userName: string, password: string): Promise<void> {
    await this.ensureUserTable();
    const d1 = getD1();
    const hashed = hashPassword(password);
    await withRetry(() =>
      d1
        .prepare('INSERT INTO users (username, password) VALUES (?, ?)')
        .bind(userName, hashed)
        .run(),
    );
  }

  async verifyUser(userName: string, password: string): Promise<boolean> {
    await this.ensureUserTable();
    const d1 = getD1();
    const result = await withRetry(() =>
      d1
        .prepare('SELECT password FROM users WHERE username = ?')
        .bind(userName)
        .first<{ password: string }>(),
    );
    if (!result) return false;
    const ok = verifyPassword(password, result.password);
    if (ok && !isHashed(result.password)) {
      const hashed = hashPassword(password);
      await withRetry(() =>
        d1
          .prepare('UPDATE users SET password = ? WHERE username = ?')
          .bind(hashed, userName)
          .run(),
      );
    }
    return ok;
  }

  async checkUserExist(userName: string): Promise<boolean> {
    await this.ensureUserTable();
    const d1 = getD1();
    const result = await withRetry(() =>
      d1
        .prepare('SELECT 1 FROM users WHERE username = ?')
        .bind(userName)
        .first(),
    );
    return result !== null;
  }

  async changePassword(userName: string, newPassword: string): Promise<void> {
    await this.ensureUserTable();
    const d1 = getD1();
    const hashed = hashPassword(newPassword);
    await withRetry(() =>
      d1
        .prepare('UPDATE users SET password = ? WHERE username = ?')
        .bind(hashed, userName)
        .run(),
    );
  }

  async deleteUser(userName: string): Promise<void> {
    await this.ensureUserTable();
    const d1 = getD1();
    await withRetry(() =>
      d1.prepare('DELETE FROM users WHERE username = ?').bind(userName).run(),
    );
    await this.deleteAllPlayRecords(userName);
    await this.deleteAllFavorites(userName);
    await this.deleteSearchHistory(userName);
  }

  async getAllUsers(): Promise<string[]> {
    await this.ensureUserTable();
    const d1 = getD1();
    const result = await withRetry(() =>
      d1.prepare('SELECT username FROM users').all<{ username: string }>(),
    );
    return result.results.map((r) => r.username);
  }

  async getSearchHistory(userName: string): Promise<string[]> {
    const kv = getKV();
    const val = await withRetry(() => kv.get(this.kvKey(userName, 'sh')));
    if (!val) return [];
    return ensureStringArray(JSON.parse(val));
  }

  async addSearchHistory(userName: string, keyword: string): Promise<void> {
    const kv = getKV();
    const history = await this.getSearchHistory(userName);
    const filtered = history.filter((k) => k !== keyword);
    const newHistory = [keyword, ...filtered].slice(0, SEARCH_HISTORY_LIMIT);
    await withRetry(() =>
      kv.put(this.kvKey(userName, 'sh'), JSON.stringify(newHistory)),
    );
  }

  async deleteSearchHistory(userName: string, keyword?: string): Promise<void> {
    const kv = getKV();
    if (keyword) {
      const history = await this.getSearchHistory(userName);
      const filtered = history.filter((k) => k !== keyword);
      await withRetry(() =>
        kv.put(this.kvKey(userName, 'sh'), JSON.stringify(filtered)),
      );
    } else {
      await kv.delete(this.kvKey(userName, 'sh'));
    }
  }

  async getAdminConfig(): Promise<AdminConfig | null> {
    const kv = getKV();
    const val = await withRetry(() => kv.get(this.kvKeyGlobal('admin')));
    return val ? (JSON.parse(val) as AdminConfig) : null;
  }

  async setAdminConfig(config: AdminConfig): Promise<void> {
    const kv = getKV();
    await withRetry(() =>
      kv.put(this.kvKeyGlobal('admin'), JSON.stringify(config)),
    );
  }

  async getSkipConfig(
    userName: string,
    source: string,
    id: string,
  ): Promise<SkipConfig | null> {
    const kv = getKV();
    const val = await withRetry(() =>
      kv.get(this.kvKey(userName, 'skip', `${source}:${id}`)),
    );
    return val ? (JSON.parse(val) as SkipConfig) : null;
  }

  async setSkipConfig(
    userName: string,
    source: string,
    id: string,
    config: SkipConfig,
  ): Promise<void> {
    const kv = getKV();
    await withRetry(() =>
      kv.put(
        this.kvKey(userName, 'skip', `${source}:${id}`),
        JSON.stringify(config),
      ),
    );
  }

  async deleteSkipConfig(
    userName: string,
    source: string,
    id: string,
  ): Promise<void> {
    const kv = getKV();
    await kv.delete(this.kvKey(userName, 'skip', `${source}:${id}`));
  }

  async getAllSkipConfigs(
    userName: string,
  ): Promise<Record<string, SkipConfig>> {
    const kv = getKV();
    const result: Record<string, SkipConfig> = {};
    const list = await kv.list({ prefix: this.kvKey(userName, 'skip:') });
    for (const item of list.keys) {
      const val = await kv.get(item.name);
      if (val) {
        const recordKey = item.name.replace(this.kvKey(userName, 'skip:'), '');
        result[recordKey] = JSON.parse(val) as SkipConfig;
      }
    }
    return result;
  }
}
