/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import { CloudflareStorage, getKV, initCloudflareFromEnv } from '@/lib/cloudflare.db';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';

  if (storageType !== 'cloudflare') {
    return NextResponse.json(
      { error: '仅支持 Cloudflare 存储类型' },
      { status: 400 },
    );
  }

  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  if (!secret) {
    return NextResponse.json({ error: '缺少 secret 参数' }, { status: 401 });
  }

  if (secret !== process.env.INIT_SECRET) {
    return NextResponse.json({ error: 'secret 不正确' }, { status: 403 });
  }

  const results: {
    kv: { ok: boolean; message?: string; error?: string };
    d1: { ok: boolean; message?: string; error?: string };
  } = {
    kv: { ok: false },
    d1: { ok: false },
  };

  try {
    initCloudflareFromEnv();
    const storage = new CloudflareStorage();

    try {
      const kv = getKV();
      await kv.put(
        'cf:g:health',
        JSON.stringify({ status: 'ok', initialized: Date.now() }),
      );
      results.kv = { ok: true, message: 'KV 初始化成功' };
    } catch (kvError) {
      results.kv = { ok: false, error: (kvError as Error).message };
    }

    try {
      await storage.initD1Schema();
      results.d1 = { ok: true, message: 'D1 数据库表初始化成功' };
    } catch (d1Error) {
      results.d1 = { ok: false, error: (d1Error as Error).message };
    }

    const allOk = results.kv.ok && results.d1.ok;
    return NextResponse.json(
      {
        ok: allOk,
        message: allOk ? '全部初始化成功' : '部分初始化失败',
        results,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: '初始化过程异常',
        details: (error as Error).message,
      },
      { status: 500 },
    );
  }
}
