/* eslint-disable no-console,@typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { SimpleCrypto } from '@/lib/crypto';
import { db } from '@/lib/db';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const username = authInfo.username;

  try {
    // 仅站长可以导出数据
    if (username !== process.env.USERNAME) {
      return NextResponse.json(
        { error: '权限不足，只有站长可以导出数据' },
        { status: 401 }
      );
    }

    // 获取所有数据
    const users = await db.getAllUsers();
    const playRecords: any = {};
    const favorites: any = {};
    const skipConfigs: any = {};
    const searchHistories: any = {};

    for (const user of users) {
      playRecords[user] = await db.getAllPlayRecords(user);
      favorites[user] = await db.getAllFavorites(user);
      skipConfigs[user] = await db.getAllSkipConfigs(user);
      searchHistories[user] = await db.getSearchHistory(user);
    }

    const adminConfig = await db.getAdminConfig();

    const exportData = {
      version: '1.0',
      timestamp: Date.now(),
      data: {
        users,
        playRecords,
        favorites,
        skipConfigs,
        searchHistories,
        adminConfig,
      },
    };

    const jsonString = JSON.stringify(exportData);
    const encryptedData = SimpleCrypto.encrypt(jsonString, process.env.PASSWORD!);

    // 使用 Web 标准的 CompressionStream 进行 gzip 压缩
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(encryptedData));
        controller.close();
      }
    }).pipeThrough(new CompressionStream('gzip'));

    const compressedResponse = await new Response(stream).arrayBuffer();

    return new NextResponse(compressedResponse, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename=lunatv_backup_${Date.now()}.dat`,
      },
    });
  } catch (error) {
    console.error('导出数据失败:', error);
    return NextResponse.json(
      { error: '导出数据失败', details: (error as Error).message },
      { status: 500 }
    );
  }
}
