# Cloudflare 部署指南

本指南将帮助你把 LunaTV 部署到 Cloudflare Pages/Workers，使用 Cloudflare KV 和 D1 作为数据库。

## 为什么选择 Cloudflare？

- ✅ **免费额度慷慨**：KV 100M 读/月，D1 5GB 存储
- ✅ **无需信用卡**：使用 GitHub 即可注册
- ✅ **全球 CDN**：自动加速
- ✅ **边缘计算**：低延迟

## 免费额度详情

| 服务             | 免费额度             | 费用 |
| ---------------- | -------------------- | ---- |
| Cloudflare Pages | 500 构建分钟/月      | $0   |
| Cloudflare KV    | 100M 读/月，1M 写/月 | $0   |
| Cloudflare D1    | 5GB 存储             | $0   |

---

## 部署步骤

### 第一步：注册 Cloudflare 账号

1. 访问 [dash.cloudflare.com](https://dash.cloudflare.com)
2. 点击 "Sign up"
3. 使用 GitHub 账号登录（无需信用卡）

### 第二步：创建 KV 命名空间

1. 登录 Cloudflare Dashboard
2. 进入 **Workers & Pages** → **KV**
3. 点击 **Create a namespace**
4. 名称填写 `LUNATV_KV`
5. 点击 **Create**

复制 **ID**，稍后会用到。

### 第三步：创建 D1 数据库

1. 进入 **Workers & Pages** → **D1**
2. 点击 **Create database**
3. 名称填写 `lunatv-db`
4. 点击 **Create**

复制 **Database ID**，稍后会用到。

### 第四步：初始化 D1 Schema

在项目根目录运行：

```bash
# 安装 wrangler（如果还没安装）
pnpm add -D wrangler

# 登录 Cloudflare
npx wrangler login

# 创建本地 D1 数据库
npx wrangler d1 create lunatv-db

# 执行 schema（将命令输出中的 local 数据库 ID 替换下面的 YOUR_LOCAL_D1_ID）
npx wrangler d1 execute lunatv-db --local --file=./schema.sql

# 将 schema 推送到远程数据库
npx wrangler d1 execute lunatv-db --remote --file=./schema.sql
```

### 第五步：更新 wrangler.toml

编辑 `wrangler.toml` 文件，将 `YOUR_KV_NAMESPACE_ID` 和 `YOUR_D1_DATABASE_ID` 替换为实际的值：

```toml
[[kv_namespaces]]
binding = "LUNATV_KV"
id = "YOUR_KV_NAMESPACE_ID"  # 替换为你的 KV ID

[[d1_databases]]
binding = "LUNATV_D1"
database_name = "lunatv-db"
database_id = "YOUR_D1_DATABASE_ID"  # 替换为你的 D1 ID
```

### 第六步：构建并部署

#### 方式 A：使用 GitHub 部署（推荐）

1. 将代码推送到 GitHub 仓库
2. 在 Cloudflare Pages 中创建项目
3. 连接 GitHub 仓库
4. 设置构建命令：
   ```
   pnpm install && pnpm build:cloudflare
   ```
5. 设置环境变量：
   - `NEXT_PUBLIC_STORAGE_TYPE` = `cloudflare`
6. 点击 **Deploy**

#### 方式 B：使用 Wrangler CLI 部署

```bash
# 构建
pnpm build:cloudflare

# 部署到 Cloudflare Pages
npx wrangler pages deploy .next/static --project-name=lunatv
```

### 第七步：配置绑定

部署完成后，需要在 Cloudflare Dashboard 中配置 KV 和 D1 绑定：

1. 进入 **Workers & Pages** → 选择你的项目
2. 点击 **Settings** → **Functions**
3. 在 **KV namespace bindings** 中添加：
   - Variable name: `LUNATV_KV`
   - KV namespace: 选择你创建的 `LUNATV_KV`
4. 在 **D1 database bindings** 中添加：
   - Variable name: `LUNATV_D1`
   - D1 database: 选择你创建的 `lunatv-db`

### 第八步：重新部署

配置绑定后，需要重新部署以使绑定生效：

```bash
npx wrangler pages deploy .next/static --project-name=lunatv
```

---

## 部署脚本

项目已添加以下脚本，可以在 `package.json` 中找到：

```json
{
  "scripts": {
    "build:cloudflare": "pnpm gen:manifest && next build",
    "cf:deploy": "pnpm build:cloudflare && wrangler pages deploy .next/static --project-name=lunatv",
    "cf:dev": "wrangler pages dev .next/static --port 8787",
    "cf:db:init": "wrangler d1 execute lunatv-db --file=./schema.sql --local",
    "cf:db:init:remote": "wrangler d1 execute lunatv-db --file=./schema.sql --remote"
  }
}
```

---

## 常见问题

### Q: 部署后数据存储在哪里？

A:

- **播放记录、收藏、搜索历史、跳过配置**：Cloudflare KV
- **用户账号、密码、管理员配置**：Cloudflare D1

### Q: 免费额度够用吗？

A:

- 个人使用完全够用
- KV: 100M 读/月 ≈ 每天 300 万次读取
- D1: 5GB 存储 ≈ 可存储数百万条数据

### Q: 能否在不同设备间同步数据？

A: 可以！Cloudflare KV 和 D1 是服务器端存储，所有用户共享数据。

### Q: 遇到错误 "No such KV namespace"？

A: 确保在 Cloudflare Dashboard 中正确配置了 KV 绑定，并且重新部署了项目。

### Q: 遇到错误 "D1 session error"？

A:

1. 确保已执行 `schema.sql` 初始化数据库
2. 检查 D1 绑定是否正确配置
3. 确保使用了正确的 Database ID

---

## 数据迁移

如果你是从其他存储类型迁移过来的：

1. 在管理后台导出数据
2. 切换到 Cloudflare 存储类型
3. 在管理后台导入数据

---

## 更新部署

```bash
# 拉取最新代码
git pull

# 重新构建
pnpm build:cloudflare

# 重新部署
npx wrangler pages deploy .next/static --project-name=lunatv
```

---

## 监控和日志

在 Cloudflare Dashboard 中：

- **Workers & Pages** → 选择你的项目 → **Logs**：查看访问日志
- **Analytics**：查看流量统计

---

## 技术支持

如果遇到问题，请检查：

1. wrangler.toml 配置是否正确
2. KV 和 D1 绑定是否配置
3. 环境变量是否设置
4. Cloudflare Dashboard 中的日志
