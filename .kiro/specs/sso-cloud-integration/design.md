# 设计文档 - SSO 登录与云端数据同步

## 概述

本设计文档描述了如何将"蛋仔守护者"应用从纯本地存储架构升级为支持 SSO 登录和云端数据同步的架构。

**技术栈：**
- 前端：React 19 + TypeScript + GitHub Pages
- 后端：Cloudflare Workers
- 数据库：Cloudflare D1 (SQLite)
- 认证：EdgeAuth SSO

**设计原则：**
- **MVP 优先**: 先实现核心功能（登录 + 基本数据读写）
- **在线优先**: 必须联网使用，简化离线处理
- **立即同步**: 每次数据修改立即保存到云端
- **简单冲突**: 最后写入优先，不做复杂合并

## 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                    GitHub Pages                          │
│              React Application (前端)                    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  Components:                                    │    │
│  │  - LoginPage (登录页)                          │    │
│  │  - Dashboard (主界面)                          │    │
│  │  - Settings (设置页)                           │    │
│  │                                                 │    │
│  │  Services:                                      │    │
│  │  - AuthService (认证服务)                      │    │
│  │  - ApiService (API 调用)                       │    │
│  └────────────────────────────────────────────────┘    │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS
                         ▼
        ┌──────────────────────────────────────┐
        │     Cloudflare Workers (后端)      │
        │                                    │
        │  Routes:                           │
        │  - /api/profile                    │
        │  - /api/tasks                      │
        │  - /api/logs                       │
        │                                    │
        │  Middleware:                       │
        │  - Token 验证                      │
        │  - CORS 处理                       │
        │  - 错误处理                        │
        └────────────┬───────────────────────┘
                     │
                     ▼
        ┌──────────────────────────────────────┐
        │     Cloudflare D1 Database          │
        │                                    │
        │  Tables:                           │
        │  - user_profiles                   │
        │  - tasks                           │
        │  - daily_logs                      │
        └──────────────────────────────────────┘

        ┌──────────────────────────────────────┐
        │     EdgeAuth SSO (已有)             │
        │                                    │
        │  - /sso/login                      │
        │  - /sso/verify                     │
        │  - /sso/userinfo                   │
        │  - /sso/logout                     │
        └──────────────────────────────────────┘
```

### 数据流

**登录流程：**
```
1. 用户访问应用
2. 检测未登录 → 显示登录页
3. 点击"SSO 登录" → 重定向到 EdgeAuth
4. EdgeAuth 认证成功 → 回调到应用首页（带 token）
5. 前端验证 token → 获取 userId
6. 加载用户数据 → 进入主界面
```

**数据同步流程（立即同步）：**
```
1. 用户操作（如修改任务）
2. 更新本地 state
3. 立即调用 API 保存到云端
4. 显示同步状态（成功/失败）
```

## 数据库设计

### 表结构

#### 1. user_profiles（用户资料表）

存储用户的个人资料和配置信息。

```sql
CREATE TABLE user_profiles (
  user_id TEXT PRIMARY KEY,              -- SSO 用户 ID
  balance INTEGER NOT NULL DEFAULT 0,    -- 蛋币余额
  weekly_base_salary INTEGER NOT NULL DEFAULT 4000,  -- 每周基础工资
  last_salary_date TEXT,                 -- 最后发工资日期 YYYY-MM-DD
  is_muted INTEGER NOT NULL DEFAULT 0,   -- 是否静音 (0=否, 1=是)
  parent_password_hash TEXT,             -- 家长密码哈希
  is_parent_password_set INTEGER NOT NULL DEFAULT 0,  -- 是否设置家长密码
  created_at INTEGER NOT NULL,           -- 创建时间戳
  updated_at INTEGER NOT NULL            -- 更新时间戳
);

CREATE INDEX idx_user_profiles_updated ON user_profiles(updated_at);
```

**字段说明：**
- `user_id`: 从 SSO 获取的用户唯一标识
- `balance`: 当前蛋币余额
- `weekly_base_salary`: 每周一发放的基础工资
- `last_salary_date`: 用于判断是否需要发工资
- `parent_password_hash`: 家长密码的哈希值
- 时间戳使用 Unix timestamp (毫秒)

#### 2. tasks（任务表）

存储用户的任务列表，每个用户独立。

```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,                   -- 任务 ID (UUID)
  user_id TEXT NOT NULL,                 -- 所属用户
  title TEXT NOT NULL,                   -- 任务标题
  icon TEXT NOT NULL,                    -- 任务图标 (emoji)
  stars INTEGER NOT NULL CHECK(stars IN (1,2,3)),  -- 星级 1-3
  days TEXT NOT NULL,                    -- 适用星期 JSON 数组 "[0,1,2]"
  sort_order INTEGER NOT NULL DEFAULT 0, -- 排序顺序
  created_at INTEGER NOT NULL,           -- 创建时间戳
  updated_at INTEGER NOT NULL,           -- 更新时间戳
  FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_tasks_user ON tasks(user_id);
CREATE INDEX idx_tasks_user_sort ON tasks(user_id, sort_order);
```

**字段说明：**
- `days`: JSON 数组字符串，如 "[1,2,3,4,5]" 表示周一到周五
- `sort_order`: 用于前端显示排序
- 外键约束确保用户删除时任务也删除

#### 3. daily_logs（每日日志表）

存储每日结算记录。

```sql
CREATE TABLE daily_logs (
  id TEXT PRIMARY KEY,                   -- 日志 ID (UUID)
  user_id TEXT NOT NULL,                 -- 所属用户
  date TEXT NOT NULL,                    -- 日期 YYYY-MM-DD
  base_salary INTEGER NOT NULL,          -- 基础工资
  total_stars INTEGER NOT NULL,          -- 总星数
  star_value INTEGER NOT NULL,           -- 每星价值
  deduction INTEGER NOT NULL,            -- 扣除金额
  actual_amount INTEGER NOT NULL,        -- 实际领取金额
  net_income INTEGER NOT NULL,           -- 净收入（向后兼容）
  tasks_status TEXT NOT NULL,            -- 任务状态 JSON
  created_at INTEGER NOT NULL,           -- 创建时间戳
  FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_logs_user ON daily_logs(user_id);
CREATE INDEX idx_logs_user_date ON daily_logs(user_id, date DESC);
CREATE UNIQUE INDEX idx_logs_user_date_unique ON daily_logs(user_id, date);
```

**字段说明：**
- `date`: 日期字符串，用于查询和去重
- `tasks_status`: JSON 数组，格式如下：
  ```json
  [
    {"task_id": "uuid", "completed": true, "deduction": 0},
    {"task_id": "uuid", "completed": false, "deduction": 400}
  ]
  ```
- `net_income`: 等于 `actual_amount`，保留字段向后兼容
- 唯一索引确保每个用户每天只有一条记录

### 数据示例

**user_profiles 示例：**
```json
{
  "user_id": "sso-user-123",
  "balance": 5000,
  "weekly_base_salary": 4000,
  "last_salary_date": "2025-01-13",
  "is_muted": 0,
  "parent_password_hash": "abc123hash",
  "is_parent_password_set": 1,
  "created_at": 1705234567890,
  "updated_at": 1705234567890
}
```

**tasks 示例：**
```json
{
  "id": "task-uuid-1",
  "user_id": "sso-user-123",
  "title": "刷牙",
  "icon": "🦷",
  "stars": 2,
  "days": "[1,2,3,4,5]",
  "sort_order": 1,
  "created_at": 1705234567890,
  "updated_at": 1705234567890
}
```

**daily_logs 示例：**
```json
{
  "id": "log-uuid-1",
  "user_id": "sso-user-123",
  "date": "2025-01-15",
  "base_salary": 4000,
  "total_stars": 10,
  "star_value": 400,
  "deduction": 800,
  "actual_amount": 3200,
  "net_income": 3200,
  "tasks_status": "[{\"task_id\":\"task-uuid-1\",\"completed\":true,\"deduction\":0}]",
  "created_at": 1705234567890
}
```

## 后端 API 设计

### API 基础信息

- **Base URL**: `https://api.activing.fun` (或你的 Cloudflare Workers 域名)
- **认证方式**: Bearer Token (SSO Token)
- **请求头**:
  ```
  Authorization: Bearer {sso_token}
  Content-Type: application/json
  ```
- **响应格式**: JSON

### API 端点列表

#### 用户资料 API

##### GET /api/profile

获取当前用户的资料。

**请求示例：**
```http
GET /api/profile
Authorization: Bearer eyJhbGc...
```

**响应 (200 OK)：**
```json
{
  "success": true,
  "data": {
    "user_id": "sso-user-123",
    "balance": 5000,
    "guardian_config": {
      "weekly_base_salary": 4000,
      "last_salary_date": "2025-01-13"
    },
    "isMuted": false,
    "parentAuth": {
      "isPasswordSet": true
    }
  }
}
```

**响应 (404 Not Found)：**
```json
{
  "success": false,
  "error": "User profile not found"
}
```

##### PUT /api/profile

更新用户资料。

**请求示例：**
```json
{
  "balance": 5500,
  "guardian_config": {
    "weekly_base_salary": 4000,
    "last_salary_date": "2025-01-13"
  },
  "isMuted": false
}
```

**响应 (200 OK)：**
```json
{
  "success": true,
  "message": "Profile updated successfully"
}
```

##### POST /api/profile/parent-password

设置或更新家长密码。

**请求示例：**
```json
{
  "passwordHash": "new-hash-value"
}
```

**响应 (200 OK)：**
```json
{
  "success": true,
  "message": "Parent password updated"
}
```

#### 任务 API

##### GET /api/tasks

获取当前用户的所有任务。

**响应 (200 OK)：**
```json
{
  "success": true,
  "data": [
    {
      "id": "task-uuid-1",
      "title": "刷牙",
      "icon": "🦷",
      "stars": 2,
      "days": [1, 2, 3, 4, 5]
    }
  ]
}
```

##### POST /api/tasks

创建新任务。

**请求示例：**
```json
{
  "title": "洗碗",
  "icon": "🍽️",
  "stars": 3,
  "days": [0, 1, 2, 3, 4, 5, 6]
}
```

**响应 (201 Created)：**
```json
{
  "success": true,
  "data": {
    "id": "task-uuid-2",
    "title": "洗碗",
    "icon": "🍽️",
    "stars": 3,
    "days": [0, 1, 2, 3, 4, 5, 6]
  }
}
```

##### PUT /api/tasks/:taskId

更新任务。

**请求示例：**
```json
{
  "title": "刷牙（早晚）",
  "icon": "🦷",
  "stars": 3,
  "days": [1, 2, 3, 4, 5]
}
```

**响应 (200 OK)：**
```json
{
  "success": true,
  "message": "Task updated successfully"
}
```

##### DELETE /api/tasks/:taskId

删除任务。

**响应 (200 OK)：**
```json
{
  "success": true,
  "message": "Task deleted successfully"
}
```

#### 日志 API

##### GET /api/logs

获取用户的日志记录，支持分页和日期筛选。

**查询参数：**
- `page`: 页码（默认 1）
- `limit`: 每页数量（默认 30）
- `startDate`: 开始日期 YYYY-MM-DD（可选）
- `endDate`: 结束日期 YYYY-MM-DD（可选）

**请求示例：**
```http
GET /api/logs?page=1&limit=30&startDate=2025-01-01
```

**响应 (200 OK)：**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "date": "2025-01-15",
        "base_salary": 4000,
        "tasks_status": [
          {"task_id": "task-uuid-1", "completed": true, "deduction": 0}
        ],
        "net_income": 3200,
        "total_stars": 10,
        "star_value": 400,
        "deduction": 800,
        "actual_amount": 3200
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 30,
      "total": 45,
      "totalPages": 2
    }
  }
}
```

##### POST /api/logs

创建新的日志记录（每日结算）。

**请求示例：**
```json
{
  "date": "2025-01-15",
  "base_salary": 4000,
  "total_stars": 10,
  "star_value": 400,
  "deduction": 800,
  "actual_amount": 3200,
  "tasks_status": [
    {"task_id": "task-uuid-1", "completed": true, "deduction": 0},
    {"task_id": "task-uuid-2", "completed": false, "deduction": 800}
  ]
}
```

**响应 (201 Created)：**
```json
{
  "success": true,
  "message": "Log created successfully"
}
```

**响应 (409 Conflict)：**
```json
{
  "success": false,
  "error": "Log already exists for this date"
}
```

### 错误响应格式

所有错误响应遵循统一格式：

```json
{
  "success": false,
  "error": "错误描述",
  "code": "ERROR_CODE"
}
```

**常见错误码：**

| HTTP 状态码 | 错误码 | 说明 |
|-----------|--------|------|
| 400 | BAD_REQUEST | 请求参数错误 |
| 401 | UNAUTHORIZED | Token 无效或过期 |
| 403 | FORBIDDEN | 无权访问该资源 |
| 404 | NOT_FOUND | 资源不存在 |
| 409 | CONFLICT | 资源冲突（如重复创建） |
| 500 | INTERNAL_ERROR | 服务器内部错误 |

## 前端设计

### 组件架构

#### 1. AuthService（认证服务）

负责所有 SSO 相关操作。

**接口定义：**

```typescript
interface AuthService {
  // 发起 SSO 登录
  initiateLogin(): void;
  
  // 处理 SSO 回调
  handleCallback(): Promise<{ token: string; userId: string } | null>;
  
  // 验证 Token
  verifyToken(token: string): Promise<boolean>;
  
  // 获取用户信息
  getUserInfo(token: string): Promise<{ userId: string; email: string; username: string }>;
  
  // 登出
  logout(): Promise<void>;
  
  // 检查登录状态
  isAuthenticated(): boolean;
  
  // 获取当前 Token
  getToken(): string | null;
  
  // 获取当前用户 ID
  getUserId(): string | null;
}
```

**实现要点：**
- Token 存储在 localStorage 的 `sso_token` 键
- userId 存储在 localStorage 的 `user_id` 键
- 使用 state 参数防止 CSRF（存储在 sessionStorage）
- Callback URL: `https://lyxia.github.io/egg-guardian/`

#### 2. ApiService（API 调用服务）

封装所有后端 API 调用。

**接口定义：**

```typescript
interface ApiService {
  // 用户资料
  getProfile(): Promise<UserProfile>;
  updateProfile(profile: Partial<UserProfile>): Promise<void>;
  updateParentPassword(hash: string): Promise<void>;
  
  // 任务
  getTasks(): Promise<Task[]>;
  createTask(task: Omit<Task, 'id'>): Promise<Task>;
  updateTask(taskId: string, task: Partial<Task>): Promise<void>;
  deleteTask(taskId: string): Promise<void>;
  
  // 日志
  getLogs(params?: LogQueryParams): Promise<{ logs: DailyLog[]; pagination: Pagination }>;
  createLog(log: DailyLog): Promise<void>;
}
```

**实现要点：**
- 自动添加 Authorization header
- 统一错误处理
- 请求失败时显示 Toast 提示
- 401 错误自动跳转登录页

#### 3. 数据迁移逻辑

检测本地数据并提供迁移选项。

**流程：**
```typescript
async function checkAndMigrate() {
  // 1. 检查 localStorage 是否有旧数据
  const localData = localStorage.getItem('egg_guardian_state');
  if (!localData) return;
  
  // 2. 检查云端是否有数据
  const hasCloudData = await apiService.getProfile().catch(() => null);
  
  // 3. 显示迁移对话框
  if (hasCloudData) {
    // 云端有数据，询问用户
    showMigrationDialog({
      options: ['使用云端数据', '上传本地数据覆盖云端', '取消']
    });
  } else {
    // 云端无数据，直接上传
    showMigrationDialog({
      options: ['上传本地数据到云端', '取消']
    });
  }
}
```

### UI 组件

#### 登录页面

```tsx
function LoginPage() {
  return (
    <div className="login-container">
      <h1>🥚 蛋仔守护者</h1>
      <p>使用 SSO 账号登录，数据云端同步</p>
      <button onClick={() => authService.initiateLogin()}>
        使用 SSO 登录
      </button>
    </div>
  );
}
```

#### 数据迁移对话框

```tsx
function MigrationDialog({ onChoice }: { onChoice: (choice: string) => void }) {
  return (
    <div className="modal">
      <h2>检测到本地数据</h2>
      <p>是否将本地数据上传到云端？</p>
      <button onClick={() => onChoice('upload')}>上传到云端</button>
      <button onClick={() => onChoice('keep-cloud')}>使用云端数据</button>
      <button onClick={() => onChoice('cancel')}>取消</button>
    </div>
  );
}
```

#### 同步状态指示器

```tsx
function SyncStatus({ status }: { status: 'syncing' | 'success' | 'error' | 'offline' }) {
  const icons = {
    syncing: '🔄',
    success: '✅',
    error: '⚠️',
    offline: '📴'
  };
  
  const messages = {
    syncing: '同步中...',
    success: '已同步',
    error: '同步失败',
    offline: '网络断开'
  };
  
  return (
    <div className={`sync-status ${status}`}>
      <span>{icons[status]}</span>
      <span>{messages[status]}</span>
    </div>
  );
}
```

## 安全设计

### 1. CSRF 防护

使用 state 参数防止 CSRF 攻击：

```typescript
function initiateLogin() {
  const state = crypto.randomUUID();
  sessionStorage.setItem('sso_state', state);
  
  const ssoUrl = 'https://api.activing.fun/sso/login';
  const callbackUrl = 'https://lyxia.github.io/egg-guardian/';
  
  window.location.href = `${ssoUrl}?redirect_uri=${encodeURIComponent(callbackUrl)}&state=${state}`;
}

function validateState(receivedState: string): boolean {
  const savedState = sessionStorage.getItem('sso_state');
  sessionStorage.removeItem('sso_state');
  return savedState === receivedState;
}
```

### 2. Token 验证

后端每个请求都需要验证 Token：

```typescript
async function verifyToken(token: string): Promise<{ userId: string } | null> {
  const response = await fetch('https://api.activing.fun/sso/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  });
  
  if (!response.ok) return null;
  
  const data = await response.json();
  return data.valid ? { userId: data.user.id } : null;
}
```

### 3. SQL 注入防护

使用参数化查询：

```typescript
// ✅ 正确：使用参数化查询
const stmt = db.prepare('SELECT * FROM tasks WHERE user_id = ?');
const tasks = stmt.all(userId);

// ❌ 错误：字符串拼接
const tasks = db.exec(`SELECT * FROM tasks WHERE user_id = '${userId}'`);
```

### 4. CORS 配置

Cloudflare Workers CORS 设置：

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://lyxia.github.io',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};
```

## 性能优化

### 1. 数据库索引

已在表结构中定义关键索引：
- `user_profiles`: updated_at
- `tasks`: user_id, (user_id, sort_order)
- `daily_logs`: user_id, (user_id, date DESC), (user_id, date) UNIQUE

### 2. API 响应缓存

对于不常变化的数据，使用 Cloudflare Workers KV 缓存：

```typescript
// 缓存用户资料 5 分钟
const cacheKey = `profile:${userId}`;
const cached = await env.KV.get(cacheKey);
if (cached) return JSON.parse(cached);

// 查询数据库
const profile = await getProfileFromDB(userId);

// 写入缓存
await env.KV.put(cacheKey, JSON.stringify(profile), { expirationTtl: 300 });
```

### 3. 分页查询

日志查询使用分页避免一次加载过多数据：

```sql
SELECT * FROM daily_logs 
WHERE user_id = ? 
ORDER BY date DESC 
LIMIT ? OFFSET ?
```

## MVP 实现范围

### Phase 1: 核心功能（MVP）

**前端：**
- [ ] SSO 登录流程
- [ ] Token 管理
- [ ] 用户资料读取和更新
- [ ] 任务列表的 CRUD
- [ ] 每日结算（创建日志）
- [ ] 基本的错误提示

**后端：**
- [ ] Token 验证中间件
- [ ] 用户资料 API (GET, PUT)
- [ ] 任务 API (GET, POST, PUT, DELETE)
- [ ] 日志 API (GET, POST)
- [ ] 数据库表创建和迁移脚本

**数据迁移：**
- [ ] 检测本地数据
- [ ] 迁移对话框
- [ ] 上传本地数据到云端

### Phase 2: 增强功能（后续迭代）

- [ ] 日志历史查询和统计
- [ ] 家长密码云端同步
- [ ] 数据导出功能
- [ ] 性能监控和日志
- [ ] 更友好的错误处理
- [ ] 离线提示优化

## 部署说明

### Cloudflare Workers 部署

1. 安装 Wrangler CLI
2. 配置 `wrangler.toml`
3. 绑定 D1 数据库
4. 部署 Worker

### 数据库初始化

运行 SQL 脚本创建表结构：

```bash
wrangler d1 execute DB_NAME --file=schema.sql
```

### 环境变量

前端 `.env.local`:
```env
VITE_SSO_URL=https://api.activing.fun
VITE_API_URL=https://your-worker.workers.dev
VITE_CALLBACK_URL=https://lyxia.github.io/egg-guardian/
```

## 总结

本设计提供了一个清晰、可实现的 SSO 集成和云端数据同步方案：

- **简单架构**: Cloudflare Workers + D1，无需复杂的服务器配置
- **规范化数据库**: 三个表清晰分离，便于查询和维护
- **细粒度 API**: RESTful 设计，每个资源独立操作
- **立即同步**: 数据修改立即保存，无需复杂的队列机制
- **MVP 优先**: 先实现核心功能，后续迭代增强

设计遵循了你的所有需求，可以直接开始实现。
