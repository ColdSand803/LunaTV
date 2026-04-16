/* eslint-disable no-console, @typescript-eslint/no-explicit-any */

import { AdminConfig } from './admin.types';
import { CloudflareD1Storage } from './cloudflare-d1.db';
import { CloudflareKVStorage } from './cloudflare-kv.db';
import { Favorite, IStorage, PlayRecord, SkipConfig } from './types';

/**
 * Cloudflare 混合存储实现
 * 专为 Edge Runtime 设计
 */
export class CloudflareHybridStorage implements IStorage {
  private d1: CloudflareD1Storage;
  private kv: CloudflareKVStorage;

  constructor() {
    // 获取绑定
    const d1Binding = (process.env as any).LUNATV_D1 || (process.env as any).__NEXT_CLOUDFLARE_BINDINGS_D1;
    const kvBinding = (process.env as any).LUNATV_KV || (process.env as any).__NEXT_CLOUDFLARE_BINDINGS_KV;

    this.d1 = new CloudflareD1Storage(d1Binding);
    this.kv = new CloudflareKVStorage(kvBinding);
  }

  async registerUser(u: string, p: string) { return this.d1.registerUser(u, p); }
  async verifyUser(u: string, p: string) { return this.d1.verifyUser(u, p); }
  async checkUserExist(u: string) { return this.d1.checkUserExist(u); }
  async changePassword(u: string, p: string) { return this.d1.changePassword(u, p); }
  async deleteUser(u: string) { 
    await this.kv.deleteUser(u); 
    return this.d1.deleteUser(u); 
  }
  async getAllUsers() { return this.d1.getAllUsers(); }
  async getAdminConfig() { return this.d1.getAdminConfig(); }
  async setAdminConfig(c: AdminConfig) { return this.d1.setAdminConfig(c); }

  async getPlayRecord(u: string, k: string) { return this.kv.getPlayRecord(u, k); }
  async setPlayRecord(u: string, k: string, r: PlayRecord) { return this.kv.setPlayRecord(u, k, r); }
  async getAllPlayRecords(u: string) { return this.kv.getAllPlayRecords(u); }
  async deletePlayRecord(u: string, k: string) { return this.kv.deletePlayRecord(u, k); }
  async deleteAllPlayRecords(u: string) { return this.kv.deleteAllPlayRecords(u); }

  async getFavorite(u: string, k: string) { return this.kv.getFavorite(u, k); }
  async setFavorite(u: string, k: string, f: Favorite) { return this.kv.setFavorite(u, k, f); }
  async getAllFavorites(u: string) { return this.kv.getAllFavorites(u); }
  async deleteFavorite(u: string, k: string) { return this.kv.deleteFavorite(u, k); }
  async deleteAllFavorites(u: string) { return this.kv.deleteAllFavorites(u); }

  async getSearchHistory(u: string) { return this.kv.getSearchHistory(u); }
  async addSearchHistory(u: string, k: string) { return this.kv.addSearchHistory(u, k); }
  async deleteSearchHistory(u: string, k?: string) { return this.kv.deleteSearchHistory(u, k); }

  async getSkipConfig(u: string, s: string, i: string) { return this.kv.getSkipConfig(u, s, i); }
  async setSkipConfig(u: string, s: string, i: string, c: SkipConfig) { return this.kv.setSkipConfig(u, s, i, c); }
  async deleteSkipConfig(u: string, s: string, i: string) { return this.kv.deleteSkipConfig(u, s, i); }
  async getAllSkipConfigs(u: string) { return this.kv.getAllSkipConfigs(u); }

  async clearAllData() {
    await this.kv.clearAllData();
    await this.d1.clearAllData();
  }
}
