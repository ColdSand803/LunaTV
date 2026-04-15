/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { CloudflareStorage, initCloudflareFromEnv } from '@/lib/cloudflare.db';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';

  if (storageType !== 'cloudflare') {
    return NextResponse.json(
      { error: '仅支持 Cloudflare 存储类型' },
      { status: 400 },
    );
  }

  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const username = authInfo.username;

  if (username !== process.env.USERNAME) {
    return NextResponse.json({ error: '仅支持站长操作' }, { status: 403 });
  }

  try {
    initCloudflareFromEnv();
    const storage = new CloudflareStorage();
    await storage.initD1Schema();

    return NextResponse.json(
      { ok: true, message: '数据库初始化成功' },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: '数据库初始化失败',
        details: (error as Error).message,
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      message: 'POST to initialize D1 database schema',
    },
    { status: 200 },
  );
}
