# Egg Guardian API

Cloudflare Workers API for Egg Guardian application.

## 开发指南

### 安装依赖

```bash
cd api
npm install
```

### 创建 D1 数据库

```bash
# 创建数据库
wrangler d1 create egg-guardian-db

# 复制输出的 database_id 到 wrangler.toml 中的 database_id 字段
```

### 运行数据库迁移

```bash
npm run db:migrate
```

### 本地开发

```bash
npm run dev
```

### 部署到生产环境

```bash
npm run deploy
```

## 环境变量

在 `wrangler.toml` 中配置：

- `SSO_URL`: SSO 服务地址
- `ALLOWED_ORIGIN`: 允许的前端域名

## API 文档

详见设计文档 `.kiro/specs/sso-cloud-integration/design.md`
