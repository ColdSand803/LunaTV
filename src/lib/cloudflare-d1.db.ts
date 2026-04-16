/* eslint-disable no-console, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import { AdminConfig } from './admin.types';
import { hashPassword, isHashed, verifyPassword } from './password';
import { Favorite, IStorage, PlayRecord, SkipConfig } from './types';

const SEARCH_HISTORY_LIMIT = 20;

export class CloudflareD1Storage implements IStorage {
  private db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  private checkDb() {
    if (!this.db) {
      // 在本地开发环境下，Node.js 侧拿不到 D1 绑定是正常的
      // 我们抛出一个静默错误或返回 null，由上层处理
      throw new Error('D1_NOT_FOUND');
    }
  }

  async getPlayRecord(userName: string, key: string): Promise<PlayRecord | null> {
    try {
      this.checkDb();
      const result = await this.db
        .prepare('SELECT value FROM play_records WHERE user_name = ? AND key = ?')
        .bind(userName, key)
        .first();
      if (!result) return null;
      return JSON.parse(result.value as string) as PlayRecord;
    } catch { return null; }
  }

  async setPlayRecord(userName: string, key: string, record: PlayRecord): Promise<void> {
    try {
      this.checkDb();
      await this.db
        .prepare('INSERT OR REPLACE INTO play_records (user_name, key, value) VALUES (?, ?, ?)')
        .bind(userName, key, JSON.stringify(record))
        .run();
    } catch { /* ignore */ }
  }

  async getAllPlayRecords(userName: string): Promise<Record<string, PlayRecord>> {
    try {
      this.checkDb();
      const result = await this.db
        .prepare('SELECT key, value FROM play_records WHERE user_name = ?')
        .bind(userName)
        .all();
      const records: Record<string, PlayRecord> = {};
      for (const row of result.results as any[]) {
        records[row.key] = JSON.parse(row.value);
      }
      return records;
    } catch { return {}; }
  }

  async deletePlayRecord(userName: string, key: string): Promise<void> {
    try {
      this.checkDb();
      await this.db
        .prepare('DELETE FROM play_records WHERE user_name = ? AND key = ?')
        .bind(userName, key)
        .run();
    } catch { /* ignore */ }
  }

  async deleteAllPlayRecords(userName: string): Promise<void> {
    try {
      this.checkDb();
      await this.db
        .prepare('DELETE FROM play_records WHERE user_name = ?')
        .bind(userName)
        .run();
    } catch { /* ignore */ }
  }

  async getFavorite(userName: string, key: string): Promise<Favorite | null> {
    try {
      this.checkDb();
      const result = await this.db
        .prepare('SELECT value FROM favorites WHERE user_name = ? AND key = ?')
        .bind(userName, key)
        .first();
      if (!result) return null;
      return JSON.parse(result.value as string) as Favorite;
    } catch { return null; }
  }

  async setFavorite(userName: string, key: string, favorite: Favorite): Promise<void> {
    try {
      this.checkDb();
      await this.db
        .prepare('INSERT OR REPLACE INTO favorites (user_name, key, value) VALUES (?, ?, ?)')
        .bind(userName, key, JSON.stringify(favorite))
        .run();
    } catch { /* ignore */ }
  }

  async getAllFavorites(userName: string): Promise<Record<string, Favorite>> {
    try {
      this.checkDb();
      const result = await this.db
        .prepare('SELECT key, value FROM favorites WHERE user_name = ?')
        .bind(userName)
        .all();
      const favorites: Record<string, Favorite> = {};
      for (const row of result.results as any[]) {
        favorites[row.key] = JSON.parse(row.value);
      }
      return favorites;
    } catch { return {}; }
  }

  async deleteFavorite(userName: string, key: string): Promise<void> {
    try {
      this.checkDb();
      await this.db
        .prepare('DELETE FROM favorites WHERE user_name = ? AND key = ?')
        .bind(userName, key)
        .run();
    } catch { /* ignore */ }
  }

  async deleteAllFavorites(userName: string): Promise<void> {
    try {
      this.checkDb();
      await this.db
        .prepare('DELETE FROM favorites WHERE user_name = ?')
        .bind(userName)
        .run();
    } catch { /* ignore */ }
  }

  async registerUser(userName: string, password: string): Promise<void> {
    try {
      this.checkDb();
      const hashedPassword = await hashPassword(password);
      await this.db
        .prepare('INSERT INTO users (user_name, password) VALUES (?, ?)')
        .bind(userName, hashedPassword)
        .run();
    } catch { /* ignore */ }
  }

  async verifyUser(userName: string, password: string): Promise<boolean> {
    try {
      this.checkDb();
      const result = await this.db
        .prepare('SELECT password FROM users WHERE user_name = ?')
        .bind(userName)
        .first();
      if (!result) return false;
      const storedPwd = result.password as string;
      if (isHashed(storedPwd)) {
        return await verifyPassword(password, storedPwd);
      } else {
        return password === storedPwd;
      }
    } catch { return false; }
  }

  async checkUserExist(userName: string): Promise<boolean> {
    try {
      this.checkDb();
      const result = await this.db
        .prepare('SELECT 1 FROM users WHERE user_name = ?')
        .bind(userName)
        .first();
      return result !== null;
    } catch { return false; }
  }

  async changePassword(userName: string, newPassword: string): Promise<void> {
    try {
      this.checkDb();
      const hashedPassword = await hashPassword(newPassword);
      await this.db
        .prepare('UPDATE users SET password = ? WHERE user_name = ?')
        .bind(hashedPassword, userName)
        .run();
    } catch { /* ignore */ }
  }

  async deleteUser(userName: string): Promise<void> {
    try {
      this.checkDb();
      await this.deleteAllPlayRecords(userName);
      await this.deleteAllFavorites(userName);
      await this.db
        .prepare('DELETE FROM search_history WHERE user_name = ?')
        .bind(userName)
        .run();
      await this.db
        .prepare('DELETE FROM users WHERE user_name = ?')
        .bind(userName)
        .run();
    } catch { /* ignore */ }
  }

  async getSearchHistory(userName: string): Promise<string[]> {
    try {
      this.checkDb();
      const result = await this.db
        .prepare('SELECT keyword FROM search_history WHERE user_name = ? ORDER BY created_at DESC LIMIT ?')
        .bind(userName, SEARCH_HISTORY_LIMIT)
        .all();
      return (result.results as any[]).map(row => row.keyword as string);
    } catch { return []; }
  }

  async addSearchHistory(userName: string, keyword: string): Promise<void> {
    try {
      this.checkDb();
      await this.db
        .prepare('DELETE FROM search_history WHERE user_name = ? AND keyword = ?')
        .bind(userName, keyword)
        .run();
      await this.db
        .prepare('INSERT INTO search_history (user_name, keyword, created_at) VALUES (?, ?, ?)')
        .bind(userName, keyword, Date.now())
        .run();
    } catch { /* ignore */ }
  }

  async deleteSearchHistory(userName: string, keyword?: string): Promise<void> {
    try {
      this.checkDb();
      if (keyword) {
        await this.db
          .prepare('DELETE FROM search_history WHERE user_name = ? AND keyword = ?')
          .bind(userName, keyword)
          .run();
      } else {
        await this.db
          .prepare('DELETE FROM search_history WHERE user_name = ?')
          .bind(userName)
          .run();
      }
    } catch { /* ignore */ }
  }

  async getAllUsers(): Promise<string[]> {
    try {
      this.checkDb();
      const result = await this.db
        .prepare('SELECT user_name FROM users')
        .all();
      return (result.results as any[]).map(row => row.user_name as string);
    } catch { return []; }
  }

  async getAdminConfig(): Promise<AdminConfig | null> {
    try {
      this.checkDb();
      const result = await this.db
        .prepare('SELECT value FROM admin_config WHERE id = 1')
        .first();
      if (!result) return null;
      return JSON.parse(result.value as string) as AdminConfig;
    } catch { return null; }
  }

  async setAdminConfig(config: AdminConfig): Promise<void> {
    try {
      this.checkDb();
      await this.db
        .prepare('INSERT OR REPLACE INTO admin_config (id, value) VALUES (1, ?)')
        .bind(JSON.stringify(config))
        .run();
    } catch { /* ignore */ }
  }

  async getSkipConfig(userName: string, source: string, id: string): Promise<SkipConfig | null> {
    try {
      this.checkDb();
      const key = `${source}:${id}`;
      const result = await this.db
        .prepare('SELECT value FROM skip_configs WHERE user_name = ? AND key = ?')
        .bind(userName, key)
        .first();
      if (!result) return null;
      return JSON.parse(result.value as string) as SkipConfig;
    } catch { return null; }
  }

  async setSkipConfig(userName: string, source: string, id: string, config: SkipConfig): Promise<void> {
    try {
      this.checkDb();
      const key = `${source}:${id}`;
      await this.db
        .prepare('INSERT OR REPLACE INTO skip_configs (user_name, key, value) VALUES (?, ?, ?)')
        .bind(userName, key, JSON.stringify(config))
        .run();
    } catch { /* ignore */ }
  }

  async deleteSkipConfig(userName: string, source: string, id: string): Promise<void> {
    try {
      this.checkDb();
      const key = `${source}:${id}`;
      await this.db
        .prepare('DELETE FROM skip_configs WHERE user_name = ? AND key = ?')
        .bind(userName, key)
        .run();
    } catch { /* ignore */ }
  }

  async getAllSkipConfigs(userName: string): Promise<Record<string, SkipConfig>> {
    try {
      this.checkDb();
      const result = await this.db
        .prepare('SELECT key, value FROM skip_configs WHERE user_name = ?')
        .bind(userName)
        .all();
      const configs: Record<string, SkipConfig> = {};
      for (const row of result.results as any[]) {
        configs[row.key] = JSON.parse(row.value);
      }
      return configs;
    } catch { return {}; }
  }

  async clearAllData(): Promise<void> {
    try {
      this.checkDb();
      await this.db.prepare('DELETE FROM play_records').run();
      await this.db.prepare('DELETE FROM favorites').run();
      await this.db.prepare('DELETE FROM search_history').run();
      await this.db.prepare('DELETE FROM users').run();
      await this.db.prepare('DELETE FROM admin_config').run();
      await this.db.prepare('DELETE FROM skip_configs').run();
    } catch { /* ignore */ }
  }
}