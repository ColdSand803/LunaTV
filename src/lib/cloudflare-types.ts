/// <reference types="@cloudflare/workers-types" />

declare namespace Cloudflare {
  interface KVNamespace {
    get(key: string, options?: { type?: 'text' }): Promise<string | null>;
    get(key: string, options: { type: 'json' }): Promise<unknown>;
    put(key: string, value: string | null, options?: KVOptions): Promise<void>;
    delete(key: string): Promise<void>;
    list(options?: KVListOptions): Promise<KVListResult>;
  }

  interface KVOptions {
    expirationTtl?: number;
    expiration?: number;
    metadata?: Record<string, unknown>;
  }

  interface KVListOptions {
    prefix?: string;
    limit?: number;
    cursor?: string;
  }

  interface KVListResult {
    keys: KVKey[];
    list_complete: boolean;
    cursor?: string;
  }

  interface KVKey {
    name: string;
    expiration?: number;
    metadata?: Record<string, unknown>;
  }

  interface D1Database {
    prepare(query: string): D1Statement;
    dump(): Promise<ArrayBuffer>;
    batch(statements: D1Statement[]): Promise<D1Result[]>;
    exec(query: string): Promise<D1Result>;
  }

  interface D1Statement {
    bind(...values: unknown[]): D1Statement;
    first<T = unknown>(): Promise<T | null>;
    all<T = unknown>(): Promise<D1Result<T>>;
    run(): Promise<D1Result>;
  }

  interface D1Result<T = unknown> {
    results: T[];
    success: boolean;
    error?: string;
    meta?: Record<string, unknown>;
  }

  interface Env {
    LUNATV_KV: KVNamespace;
    LUNATV_D1: D1Database;
    NEXT_PUBLIC_STORAGE_TYPE: string;
  }
}

declare global {
  interface Env extends Cloudflare.Env {}
}
