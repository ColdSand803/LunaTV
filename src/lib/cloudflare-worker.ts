/* eslint-disable @typescript-eslint/no-explicit-any */
import { CloudflareDbManager } from './cloudflare.db';
import { getConfig } from './config';

export interface Env {
  LUNATV_KV: KVNamespace;
  LUNATV_D1: D1Database;
  NEXT_PUBLIC_STORAGE_TYPE: string;
}

let dbManager: CloudflareDbManager | null = null;

export function getCloudflareDb(env: Env): CloudflareDbManager {
  if (!dbManager) {
    dbManager = new CloudflareDbManager(env.LUNATV_KV, env.LUNATV_D1);
  }
  return dbManager;
}

export { CloudflareDbManager } from './cloudflare.db';
