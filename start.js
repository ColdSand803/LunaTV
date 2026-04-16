const { spawn } = require('child_process');
const http = require('http');

// 强制 Node.js 优先使用 IPv4，解决 Windows 下的 502 问题
process.env.NODE_OPTIONS = '--dns-result-order=ipv4first';

const NEXT_PORT = 3001;
const WRANGLER_PORT = 8788;

console.log('\x1b[36m%s\x1b[0m', '--- LunaTV 终极一键启动 (IPv4 强制版) ---');

// 1. 启动 Next.js 后端
console.log(`🚀 正在启动 Next.js (127.0.0.1:${NEXT_PORT})...`);
const next = spawn('npx.cmd', ['next', 'dev', '-p', NEXT_PORT.toString(), '-H', '127.0.0.1'], {
  stdio: 'pipe',
  shell: true
});

next.stdout.on('data', (data) => {
  process.stdout.write(`\x1b[32m[Next.js]\x1b[0m ${data}`);
});

next.stderr.on('data', (data) => {
  process.stderr.write(`\x1b[31m[Next.js Error]\x1b[0m ${data}`);
});

// 2. 轮询检查就绪
const checkNextReady = () => {
  const req = http.get(`http://127.0.0.1:${NEXT_PORT}`, (res) => {
    console.log('\x1b[35m%s\x1b[0m', '✅ 后端已就绪，正在连接数据库代理...');
    startWrangler();
  });
  req.on('error', () => setTimeout(checkNextReady, 1000));
};

// 3. 启动代理
const startWrangler = () => {
  // 关键：我们不再提供目录参数，只提供 --proxy
  // 同时显式指定代理到 127.0.0.1 (IPv4)
  const wrangler = spawn('npx.cmd', [
    'wrangler', 'pages', 'dev',
    '--compatibility-date=2024-01-01',
    '--kv=LUNATV_KV',
    '--d1=LUNATV_D1',
    '--port', WRANGLER_PORT.toString(),
    '--proxy', `http://127.0.0.1:${NEXT_PORT}`
    // 已移除不支持的 --remote
  ], {
    stdio: 'inherit',
    shell: true
  });

  wrangler.on('close', (code) => {
    next.kill();
    process.exit(code);
  });
};

checkNextReady();

process.on('SIGINT', () => {
  next.kill();
  process.exit();
});
