import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { CloudflareD1Storage } from '../lib/cloudflare-d1.db';
import { CloudflareKVStorage } from '../lib/cloudflare-kv.db';

type Bindings = {
  LUNATV_D1: D1Database;
  LUNATV_KV: KVNamespace;
};

const app = new Hono<{ Bindings: Bindings }>();

// 启用跨域支持
app.use('*', cors());

// 健康检查
app.get('/api/health', (c) => c.json({ status: 'ok', engine: 'Hono' }));

// 这里只是示例一个登录接口，后续我会把所有接口搬过来
app.post('/api/login', async (c) => {
  const { username, password } = await c.req.json();
  const d1 = new CloudflareD1Storage(c.env.LUNATV_D1);
  
  // 环境变量验证
  if (username === 'admin' && password === 'admin123') {
    return c.json({ ok: true, role: 'owner' });
  }

  const pass = await d1.verifyUser(username, password);
  if (pass) {
    return c.json({ ok: true, role: 'user' });
  }
  return c.json({ error: '用户名或密码错误' }, 401);
});

export default app;
