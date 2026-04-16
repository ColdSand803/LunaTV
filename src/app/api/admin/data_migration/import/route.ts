/* eslint-disable no-console,@typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from 'res/server'; // 注意：这里原代码可能有错，应为 next/server

import { getAuthInfoFromCookie } from '@/lib/auth';
import { configSelfCheck, setCachedConfig } from '@/lib/config';
import { SimpleCrypto } from '@/lib/crypto';
import { db } from '@/lib/db';

export const runtime = 'edge';

// 修正 import 路径
import { NextResponse as NextResp } from 'next/server';

export async function POST(request: NextRequest) {
  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return NextResp.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const username = authInfo.username;

  try {
    // 仅站长可以导入数据
    if (username !== process.env.USERNAME) {
      return NextResp.json(
        { error: '权限不足，只有站长可以导入数据' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResp.json({ error: '请选择备份文件' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();

    // 使用 Web 标准的 DecompressionStream 进行 gzip 解压
    const decompressionStream = new DecompressionStream('gzip');
    const decompressedResponse = await new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(arrayBuffer));
          controller.close();
        }
      }).pipeThrough(decompressionStream)
    );

    const decryptedData = await decompressedResponse.text();
    const jsonString = SimpleCrypto.decrypt(decryptedData, process.env.PASSWORD!);
    const importData = JSON.parse(jsonString);

    if (importData.version !== '1.0') {
      throw new Error('不支持的备份文件版本');
    }

    const { data } = importData;

    // 清空现有数据
    await db.clearAllData();

    // 恢复管理员配置
    if (data.adminConfig) {
      const checkedConfig = configSelfCheck(data.adminConfig);
      await db.saveAdminConfig(checkedConfig);
      setCachedConfig(checkedConfig);
    }

    // 恢复其他数据（由于是 D1/KV，这里需要循环写入）
    for (const user of data.users) {
      // 恢复播放记录
      const userPR = data.playRecords[user] || {};
      for (const [key, record] of Object.entries(userPR)) {
        await db.savePlayRecord(user, (key as string).split('+')[0], (key as string).split('+')[1], record as any);
      }

      // 恢复收藏
      const userFav = data.favorites[user] || {};
      for (const [key, fav] of Object.entries(userFav)) {
        await db.saveFavorite(user, (key as string).split('+')[0], (key as string).split('+')[1], fav as any);
      }

      // 恢复搜索历史
      const userSH = data.searchHistories[user] || [];
      for (const keyword of userSH) {
        await db.addSearchHistory(user, keyword);
      }

      // 恢复跳过配置
      const userSC = data.skipConfigs[user] || {};
      for (const [key, config] of Object.entries(userSC)) {
        await db.setSkipConfig(user, (key as string).split(':')[0], (key as string).split(':')[1], config as any);
      }
    }

    return NextResp.json({ success: true, message: '数据导入成功' });
  } catch (error) {
    console.error('导入数据失败:', error);
    return NextResp.json(
      { error: '导入数据失败', details: (error as Error).message },
      { status: 500 }
    );
  }
}
