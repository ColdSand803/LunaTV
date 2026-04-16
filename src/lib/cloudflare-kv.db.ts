/* eslint-disable no-console, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import { AdminConfig } from './admin.types';
import { hashPassword, isHashed, verifyPassword } from './password';
import { Favorite, IStorage, PlayRecord, SkipConfig } from './types';

const SEARCH_HISTORY_LIMIT = 20;

function ensureStringArray(value: any[]): string[] {
  return value.map((item) => String(item));
}

export class CloudflareKVStorage implements IStorage {
  private kv: KVNamespace;

  constructor(kv: KVNamespace) {
    this.kv = kv;
  }

  private checkKv() {
    if (!this.kv) {
      throw new Error('KV_NOT_FOUND');
    }
  }

  private prHashKey(user: string) {
    return `u:${user}:pr`;
  }

  private favHashKey(user: string) {
    return `u:${user}:fav`;
  }

  private shListKey(user: string) {
    return `u:${user}:sh`;
  }

  private scKey(user: string, source: string, id: string) {
    return `u:${user}:sc:${source}:${id}`;
  }

  private scHashKey(user: string) {
    return `u:${user}:sc`;
  }

  private pwdKey(user: string) {
    return `u:${user}:pwd`;
  }

  private adminConfigKey() {
    return 'admin:config';
  }

  private userListKey() {
    return 'users:list';
  }

  async getPlayRecord(
    userName: string,
    key: string,
  ): Promise<PlayRecord | null> {
    try {
      this.checkKv();
      const value = await this.kv.get(
        `${this.prHashKey(userName)}:${key}`,
        'json',
      );
      return value as PlayRecord | null;
    } catch { return null; }
  }

  async setPlayRecord(
    userName: string,
    key: string,
    record: PlayRecord,
  ): Promise<void> {
    try {
      this.checkKv();
      await this.kv.put(
        `${this.prHashKey(userName)}:${key}`,
        JSON.stringify(record),
      );
    } catch { /* ignore */ }
  }

  async getAllPlayRecords(
    userName: string,
  ): Promise<Record<string, PlayRecord>> {
    try {
      this.checkKv();
      const list = await this.kv.list({ prefix: `${this.prHashKey(userName)}:` });
      const result: Record<string, PlayRecord> = {};
      for (const key of list.keys) {
        const field = key.name.replace(`${this.prHashKey(userName)}:`, '');
        const value = await this.kv.get(key.name, 'json');
        if (value) {
          result[field] = value as PlayRecord;
        }
      }
      return result;
    } catch { return {}; }
  }

  async deletePlayRecord(userName: string, key: string): Promise<void> {
    try {
      this.checkKv();
      await this.kv.delete(`${this.prHashKey(userName)}:${key}`);
    } catch { /* ignore */ }
  }

  async deleteAllPlayRecords(userName: string): Promise<void> {
    try {
      this.checkKv();
      const list = await this.kv.list({ prefix: `${this.prHashKey(userName)}:` });
      const keysToDelete = list.keys.map((k) => k.name);
      await Promise.all(keysToDelete.map((key) => this.kv.delete(key)));
    } catch { /* ignore */ }
  }

  async getFavorite(userName: string, key: string): Promise<Favorite | null> {
    try {
      this.checkKv();
      const value = await this.kv.get(
        `${this.favHashKey(userName)}:${key}`,
        'json',
      );
      return value as Favorite | null;
    } catch { return null; }
  }

  async setFavorite(
    userName: string,
    key: string,
    favorite: Favorite,
  ): Promise<void> {
    try {
      this.checkKv();
      await this.kv.put(
        `${this.favHashKey(userName)}:${key}`,
        JSON.stringify(favorite),
      );
    } catch { /* ignore */ }
  }

  async getAllFavorites(userName: string): Promise<Record<string, Favorite>> {
    try {
      this.checkKv();
      const list = await this.kv.list({
        prefix: `${this.favHashKey(userName)}:`,
      });
      const result: Record<string, Favorite> = {};
      for (const key of list.keys) {
        const field = key.name.replace(`${this.favHashKey(userName)}:`, '');
        const value = await this.kv.get(key.name, 'json');
        if (value) {
          result[field] = value as Favorite;
        }
      }
      return result;
    } catch { return {}; }
  }

  async deleteFavorite(userName: string, key: string): Promise<void> {
    try {
      this.checkKv();
      await this.kv.delete(`${this.favHashKey(userName)}:${key}`);
    } catch { /* ignore */ }
  }

  async deleteAllFavorites(userName: string): Promise<void> {
    try {
      this.checkKv();
      const list = await this.kv.list({
        prefix: `${this.favHashKey(userName)}:`,
      });
      const keysToDelete = list.keys.map((k) => k.name);
      await Promise.all(keysToDelete.map((key) => this.kv.delete(key)));
    } catch { /* ignore */ }
  }

  async registerUser(userName: string, password: string): Promise<void> {
    try {
      this.checkKv();
      const hashedPassword = await hashPassword(password);
      await this.kv.put(this.pwdKey(userName), hashedPassword);
      const users = await this.getAllUsers();
      if (!users.includes(userName)) {
        users.push(userName);
        await this.kv.put(this.userListKey(), JSON.stringify(users));
      }
    } catch { /* ignore */ }
  }

  async verifyUser(userName: string, password: string): Promise<boolean> {
    try {
      this.checkKv();
      const storedPwd = await this.kv.get(this.pwdKey(userName));
      if (!storedPwd) return false;
      if (isHashed(storedPwd)) {
        return await verifyPassword(password, storedPwd);
      } else {
        return password === storedPwd;
      }
    } catch { return false; }
  }

  async checkUserExist(userName: string): Promise<boolean> {
    try {
      this.checkKv();
      const pwd = await this.kv.get(this.pwdKey(userName));
      return pwd !== null;
    } catch { return false; }
  }

  async changePassword(userName: string, newPassword: string): Promise<void> {
    try {
      this.checkKv();
      const hashedPassword = await hashPassword(newPassword);
      await this.kv.put(this.pwdKey(userName), hashedPassword);
    } catch { /* ignore */ }
  }

  async deleteUser(userName: string): Promise<void> {
    try {
      this.checkKv();
      await this.deleteAllPlayRecords(userName);
      await this.deleteAllFavorites(userName);
      await this.kv.delete(this.shListKey(userName));
      await this.kv.delete(this.pwdKey(userName));
      const users = await this.getAllUsers();
      const updatedUsers = users.filter((u) => u !== userName);
      await this.kv.put(this.userListKey(), JSON.stringify(updatedUsers));
    } catch { /* ignore */ }
  }

  async getSearchHistory(userName: string): Promise<string[]> {
    try {
      this.checkKv();
      const history = await this.kv.get(this.shListKey(userName), 'json');
      return ensureStringArray((history as string[]) || []);
    } catch { return []; }
  }

  async addSearchHistory(userName: string, keyword: string): Promise<void> {
    try {
      this.checkKv();
      let history = await this.getSearchHistory(userName);
      history = history.filter((k) => k !== keyword);
      history.unshift(keyword);
      if (history.length > SEARCH_HISTORY_LIMIT) {
        history = history.slice(0, SEARCH_HISTORY_LIMIT);
      }
      await this.kv.put(this.shListKey(userName), JSON.stringify(history));
    } catch { /* ignore */ }
  }

  async deleteSearchHistory(userName: string, keyword?: string): Promise<void> {
    try {
      this.checkKv();
      if (keyword) {
        let history = await this.getSearchHistory(userName);
        history = history.filter((k) => k !== keyword);
        await this.kv.put(this.shListKey(userName), JSON.stringify(history));
      } else {
        await this.kv.delete(this.shListKey(userName));
      }
    } catch { /* ignore */ }
  }

  async getAllUsers(): Promise<string[]> {
    try {
      this.checkKv();
      const users = await this.kv.get(this.userListKey(), 'json');
      return ensureStringArray((users as string[]) || []);
    } catch { return []; }
  }

  async getAdminConfig(): Promise<AdminConfig | null> {
    try {
      this.checkKv();
      const config = await this.kv.get(this.adminConfigKey(), 'json');
      return config as AdminConfig | null;
    } catch { return null; }
  }

  async setAdminConfig(config: AdminConfig): Promise<void> {
    try {
      this.checkKv();
      await this.kv.put(this.adminConfigKey(), JSON.stringify(config));
    } catch { /* ignore */ }
  }

  async getSkipConfig(
    userName: string,
    source: string,
    id: string,
  ): Promise<SkipConfig | null> {
    try {
      this.checkKv();
      const value = await this.kv.get(this.scKey(userName, source, id), 'json');
      return value as SkipConfig | null;
    } catch { return null; }
  }

  async setSkipConfig(
    userName: string,
    source: string,
    id: string,
    config: SkipConfig,
  ): Promise<void> {
    try {
      this.checkKv();
      await this.kv.put(this.scKey(userName, source, id), JSON.stringify(config));
    } catch { /* ignore */ }
  }

  async deleteSkipConfig(
    userName: string,
    source: string,
    id: string,
  ): Promise<void> {
    try {
      this.checkKv();
      await this.kv.delete(this.scKey(userName, source, id));
    } catch { /* ignore */ }
  }

  async getAllSkipConfigs(
    userName: string,
  ): Promise<Record<string, SkipConfig>> {
    try {
      this.checkKv();
      const list = await this.kv.list({ prefix: `${this.scHashKey(userName)}:` });
      const result: Record<string, SkipConfig> = {};
      for (const key of list.keys) {
        const field = key.name.replace(`${this.scHashKey(userName)}:`, '');
        const value = await this.kv.get(key.name, 'json');
        if (value) {
          result[field] = value as SkipConfig;
        }
      }
      return result;
    } catch { return {}; }
  }

  async clearAllData(): Promise<void> {
    try {
      this.checkKv();
      const userList = await this.getAllUsers();
      for (const user of userList) {
        await this.deleteUser(user);
      }
      await this.kv.delete(this.adminConfigKey());
      await this.kv.delete(this.userListKey());
    } catch { /* ignore */ }
  }
}