/* eslint-disable no-console, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import { AdminConfig } from './admin.types';
import { Favorite, IStorage, PlayRecord, SkipConfig } from './types';

// storage type 常量: 'localstorage' | 'redis' | 'upstash' | 'kvrocks' | 'cloudflare'，默认 'localstorage'
const STORAGE_TYPE =
  (process.env.NEXT_PUBLIC_STORAGE_TYPE as
    | 'localstorage'
    | 'redis'
    | 'upstash'
    | 'kvrocks'
    | 'cloudflare'
    | undefined) || 'localstorage';

// 单例存储实例
let storageInstance: IStorage | null = null;

/**
 * 异步创建存储实例，解决 Edge Runtime 兼容性问题
 */
async function getStorage(): Promise<IStorage | null> {
  if (storageInstance) return storageInstance;

  switch (STORAGE_TYPE) {
    case 'cloudflare': {
      // 只有在运行时为 cloudflare 时才加载相关模块
      const { CloudflareHybridStorage } = await import('./db.cloudflare');
      storageInstance = new CloudflareHybridStorage();
      break;
    }
    case 'redis': {
      const { RedisStorage } = await import('./redis.db');
      storageInstance = new RedisStorage();
      break;
    }
    case 'upstash': {
      const { UpstashRedisStorage } = await import('./upstash.db');
      storageInstance = new UpstashRedisStorage();
      break;
    }
    case 'kvrocks': {
      const { KvrocksStorage } = await import('./kvrocks.db');
      storageInstance = new KvrocksStorage();
      break;
    }
    case 'localstorage':
    default:
      return null;
  }
  return storageInstance;
}

// 由于 CloudflareHybridStorage 逻辑较多，我将其提取到独立文件 src/lib/db.cloudflare.ts 中，以保持 db.ts 干净且易于 tree-shaking
// 此处我们先在 db.ts 内部定义，稍后我再执行提取

// 工具函数：生成存储key
export function generateStorageKey(source: string, id: string): string {
  return `${source}+${id}`;
}

export class DbManager {
  private migrationPromise: Promise<void> | null = null;
  private initialized = false;

  private async ensureInitialized(): Promise<IStorage> {
    const storage = await getStorage();
    if (!storage) {
      throw new Error(`存储类型 ${STORAGE_TYPE} 未正确初始化或不支持`);
    }

    if (!this.initialized) {
      this.initialized = true;
      // 自动触发迁移
      if (typeof (storage as any).migrateData === 'function') {
        this.migrationPromise = (storage as any).migrateData().then(async () => {
          if (typeof (storage as any).migratePasswords === 'function') {
            await (storage as any).migratePasswords();
          }
        }).catch((err: any) => console.error('数据迁移异常:', err));
      }
    }

    if (this.migrationPromise) {
      await this.migrationPromise;
      this.migrationPromise = null;
    }

    return storage;
  }

  // 播放记录相关方法
  async getPlayRecord(userName: string, source: string, id: string): Promise<PlayRecord | null> {
    const storage = await this.ensureInitialized();
    const key = generateStorageKey(source, id);
    return storage.getPlayRecord(userName, key);
  }

  async savePlayRecord(userName: string, source: string, id: string, record: PlayRecord): Promise<void> {
    const storage = await this.ensureInitialized();
    const key = generateStorageKey(source, id);
    await storage.setPlayRecord(userName, key, record);
  }

  async getAllPlayRecords(userName: string): Promise<{ [key: string]: PlayRecord }> {
    const storage = await this.ensureInitialized();
    return storage.getAllPlayRecords(userName);
  }

  async deletePlayRecord(userName: string, source: string, id: string): Promise<void> {
    const storage = await this.ensureInitialized();
    const key = generateStorageKey(source, id);
    await storage.deletePlayRecord(userName, key);
  }

  async deleteAllPlayRecords(userName: string): Promise<void> {
    const storage = await this.ensureInitialized();
    await storage.deleteAllPlayRecords(userName);
  }

  // 收藏相关方法
  async getFavorite(userName: string, source: string, id: string): Promise<Favorite | null> {
    const storage = await this.ensureInitialized();
    const key = generateStorageKey(source, id);
    return storage.getFavorite(userName, key);
  }

  async saveFavorite(userName: string, source: string, id: string, favorite: Favorite): Promise<void> {
    const storage = await this.ensureInitialized();
    const key = generateStorageKey(source, id);
    await storage.setFavorite(userName, key, favorite);
  }

  async getAllFavorites(userName: string): Promise<{ [key: string]: Favorite }> {
    const storage = await this.ensureInitialized();
    return storage.getAllFavorites(userName);
  }

  async deleteFavorite(userName: string, source: string, id: string): Promise<void> {
    const storage = await this.ensureInitialized();
    const key = generateStorageKey(source, id);
    await storage.deleteFavorite(userName, key);
  }

  async deleteAllFavorites(userName: string): Promise<void> {
    const storage = await this.ensureInitialized();
    await storage.deleteAllFavorites(userName);
  }

  async isFavorited(userName: string, source: string, id: string): Promise<boolean> {
    const favorite = await this.getFavorite(userName, source, id);
    return favorite !== null;
  }

  async registerUser(userName: string, password: string): Promise<void> {
    const storage = await this.ensureInitialized();
    await storage.registerUser(userName, password);
  }

  async verifyUser(userName: string, password: string): Promise<boolean> {
    const storage = await this.ensureInitialized();
    return storage.verifyUser(userName, password);
  }

  async checkUserExist(userName: string): Promise<boolean> {
    const storage = await this.ensureInitialized();
    return storage.checkUserExist(userName);
  }

  async changePassword(userName: string, newPassword: string): Promise<void> {
    const storage = await this.ensureInitialized();
    await storage.changePassword(userName, newPassword);
  }

  async deleteUser(userName: string): Promise<void> {
    const storage = await this.ensureInitialized();
    await storage.deleteUser(userName);
  }

  async getSearchHistory(userName: string): Promise<string[]> {
    const storage = await this.ensureInitialized();
    return storage.getSearchHistory(userName);
  }

  async addSearchHistory(userName: string, keyword: string): Promise<void> {
    const storage = await this.ensureInitialized();
    await storage.addSearchHistory(userName, keyword);
  }

  async deleteSearchHistory(userName: string, keyword?: string): Promise<void> {
    const storage = await this.ensureInitialized();
    await storage.deleteSearchHistory(userName, keyword);
  }

  async getAllUsers(): Promise<string[]> {
    const storage = await this.ensureInitialized();
    return storage.getAllUsers();
  }

  async getAdminConfig(): Promise<AdminConfig | null> {
    const storage = await this.ensureInitialized();
    return storage.getAdminConfig();
  }

  async saveAdminConfig(config: AdminConfig): Promise<void> {
    const storage = await this.ensureInitialized();
    await storage.setAdminConfig(config);
  }

  async getSkipConfig(userName: string, source: string, id: string): Promise<SkipConfig | null> {
    const storage = await this.ensureInitialized();
    return storage.getSkipConfig(userName, source, id);
  }

  async setSkipConfig(userName: string, source: string, id: string, config: SkipConfig): Promise<void> {
    const storage = await this.ensureInitialized();
    await storage.setSkipConfig(userName, source, id, config);
  }

  async deleteSkipConfig(userName: string, source: string, id: string): Promise<void> {
    const storage = await this.ensureInitialized();
    await storage.deleteSkipConfig(userName, source, id);
  }

  async getAllSkipConfigs(userName: string): Promise<{ [key: string]: SkipConfig }> {
    const storage = await this.ensureInitialized();
    return storage.getAllSkipConfigs(userName);
  }

  async clearAllData(): Promise<void> {
    const storage = await this.ensureInitialized();
    await storage.clearAllData();
  }
}

export const db = new DbManager();
