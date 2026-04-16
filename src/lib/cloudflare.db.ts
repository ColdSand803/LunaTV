/* eslint-disable no-console, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import { AdminConfig } from './admin.types';
import { CloudflareD1Storage } from './cloudflare-d1.db';
import { CloudflareKVStorage } from './cloudflare-kv.db';
import { hashPassword, isHashed, verifyPassword } from './password';
import { Favorite, IStorage, PlayRecord, SkipConfig } from './types';

export { CloudflareKVStorage } from './cloudflare-kv.db';
export { CloudflareD1Storage } from './cloudflare-d1.db';

const SEARCH_HISTORY_LIMIT = 20;

export class CloudflareDbManager {
  private kvStorage: CloudflareKVStorage;
  private d1Storage: CloudflareD1Storage;

  constructor(kv: KVNamespace, d1: D1Database) {
    this.kvStorage = new CloudflareKVStorage(kv);
    this.d1Storage = new CloudflareD1Storage(d1);
  }

  async getPlayRecord(userName: string, source: string, id: string): Promise<PlayRecord | null> {
    const key = `${source}+${id}`;
    return this.kvStorage.getPlayRecord(userName, key);
  }

  async savePlayRecord(userName: string, source: string, id: string, record: PlayRecord): Promise<void> {
    const key = `${source}+${id}`;
    await this.kvStorage.setPlayRecord(userName, key, record);
  }

  async getAllPlayRecords(userName: string): Promise<Record<string, PlayRecord>> {
    return this.kvStorage.getAllPlayRecords(userName);
  }

  async deletePlayRecord(userName: string, source: string, id: string): Promise<void> {
    const key = `${source}+${id}`;
    await this.kvStorage.deletePlayRecord(userName, key);
  }

  async deleteAllPlayRecords(userName: string): Promise<void> {
    await this.kvStorage.deleteAllPlayRecords(userName);
  }

  async getFavorite(userName: string, source: string, id: string): Promise<Favorite | null> {
    const key = `${source}+${id}`;
    return this.kvStorage.getFavorite(userName, key);
  }

  async saveFavorite(userName: string, source: string, id: string, favorite: Favorite): Promise<void> {
    const key = `${source}+${id}`;
    await this.kvStorage.setFavorite(userName, key, favorite);
  }

  async getAllFavorites(userName: string): Promise<Record<string, Favorite>> {
    return this.kvStorage.getAllFavorites(userName);
  }

  async deleteFavorite(userName: string, source: string, id: string): Promise<void> {
    const key = `${source}+${id}`;
    await this.kvStorage.deleteFavorite(userName, key);
  }

  async deleteAllFavorites(userName: string): Promise<void> {
    await this.kvStorage.deleteAllFavorites(userName);
  }

  async isFavorited(userName: string, source: string, id: string): Promise<boolean> {
    const favorite = await this.getFavorite(userName, source, id);
    return favorite !== null;
  }

  async registerUser(userName: string, password: string): Promise<void> {
    await this.d1Storage.registerUser(userName, password);
  }

  async verifyUser(userName: string, password: string): Promise<boolean> {
    return this.d1Storage.verifyUser(userName, password);
  }

  async checkUserExist(userName: string): Promise<boolean> {
    return this.d1Storage.checkUserExist(userName);
  }

  async changePassword(userName: string, newPassword: string): Promise<void> {
    await this.d1Storage.changePassword(userName, newPassword);
  }

  async deleteUser(userName: string): Promise<void> {
    await this.d1Storage.deleteUser(userName);
    await this.kvStorage.deleteUser(userName);
  }

  async getSearchHistory(userName: string): Promise<string[]> {
    return this.kvStorage.getSearchHistory(userName);
  }

  async addSearchHistory(userName: string, keyword: string): Promise<void> {
    await this.kvStorage.addSearchHistory(userName, keyword);
  }

  async deleteSearchHistory(userName: string, keyword?: string): Promise<void> {
    await this.kvStorage.deleteSearchHistory(userName, keyword);
  }

  async getAllUsers(): Promise<string[]> {
    return this.d1Storage.getAllUsers();
  }

  async getAdminConfig(): Promise<AdminConfig | null> {
    return this.d1Storage.getAdminConfig();
  }

  async saveAdminConfig(config: AdminConfig): Promise<void> {
    await this.d1Storage.setAdminConfig(config);
  }

  async getSkipConfig(userName: string, source: string, id: string): Promise<SkipConfig | null> {
    return this.kvStorage.getSkipConfig(userName, source, id);
  }

  async setSkipConfig(userName: string, source: string, id: string, config: SkipConfig): Promise<void> {
    await this.kvStorage.setSkipConfig(userName, source, id, config);
  }

  async deleteSkipConfig(userName: string, source: string, id: string): Promise<void> {
    await this.kvStorage.deleteSkipConfig(userName, source, id);
  }

  async getAllSkipConfigs(userName: string): Promise<Record<string, SkipConfig>> {
    return this.kvStorage.getAllSkipConfigs(userName);
  }

  async clearAllData(): Promise<void> {
    await this.d1Storage.clearAllData();
  }
}
