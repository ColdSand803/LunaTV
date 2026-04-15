/// <reference types="@cloudflare/workers-types" />

interface CloudflareEnv {
  LunaTV_KV: KVNamespace;
  LunaTV_D1: D1Database;
  NEXT_PUBLIC_STORAGE_TYPE: string;
  NEXT_PUBLIC_SITE_NAME: string;
  ANNOUNCEMENT: string;
  NEXT_PUBLIC_DOUBAN_PROXY_TYPE: string;
  NEXT_PUBLIC_DOUBAN_PROXY: string;
  NEXT_PUBLIC_DOUBAN_IMAGE_PROXY_TYPE: string;
  NEXT_PUBLIC_DOUBAN_IMAGE_PROXY: string;
  NEXT_PUBLIC_DISABLE_YELLOW_FILTER: string;
  NEXT_PUBLIC_FLUID_SEARCH: string;
  NEXT_PUBLIC_SEARCH_MAX_PAGE: string;
  PASSWORD: string;
  USERNAME: string;
  INIT_SECRET: string;
  STORAGE_TYPE: string;
  NODE_ENV: string;
  HOSTNAME: string;
  PORT: string;
}

type Env = CloudflareEnv;

export type { Env };
