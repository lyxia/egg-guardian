# 需求文档 - SSO 登录与云端数据同步

## 简介

本文档定义了将"蛋仔守护者"应用集成 EdgeAuth SSO 单点登录系统，并实现用户数据云端存储与多设备同步的功能需求。当前应用使用 localStorage 存储所有数据，集成后将支持用户通过 SSO 登录，数据自动同步到云端，实现跨设备访问。

## 术语表

- **Application**: 蛋仔守护者应用，部署在 GitHub Pages 的前端应用
- **SSO_Service**: EdgeAuth SSO 服务，提供统一身份认证，API 地址为 https://api.activing.fun
- **User**: 使用蛋仔守护者应用的用户（儿童或家长）
- **Token**: SSO 服务颁发的身份令牌，用于验证用户身份
- **Cloud_Storage**: 云端数据存储服务，用于保存用户的应用数据
- **Local_Storage**: 浏览器本地存储，用于缓存数据和离线访问
- **AppState**: 应用状态数据，包括用户资料、任务列表和每日日志
- **Callback_URL**: SSO 登录成功后的回调地址，格式为 https://lyxia.github.io/egg-guardian/

## 需求

### 需求 1: 用户登录流程

**用户故事:** 作为用户，我希望能够使用 SSO 账号登录应用，这样我的数据可以在多个设备间同步

#### 验收标准

1. WHEN User 首次访问 Application, THE Application SHALL 显示登录页面，提示用户使用 SSO 登录
2. WHEN User 点击登录按钮, THE Application SHALL 重定向到 SSO_Service 的登录页面，并携带正确的 Callback_URL 参数
3. WHEN SSO_Service 完成用户认证, THE SSO_Service SHALL 重定向回 Callback_URL 并携带有效的 Token
4. WHEN Application 接收到 Token, THE Application SHALL 向 SSO_Service 验证 Token 的有效性
5. IF Token 验证失败, THEN THE Application SHALL 显示错误提示并要求用户重新登录

### 需求 2: Token 管理

**用户故事:** 作为系统，我需要安全地管理用户的身份令牌，确保用户会话的安全性和持续性

#### 验收标准

1. WHEN Application 成功验证 Token, THE Application SHALL 将 Token 存储在 Local_Storage 中
2. WHEN Application 启动时检测到有效 Token, THE Application SHALL 自动使用该 Token 进行身份验证，无需用户重新登录
3. WHEN Token 过期或无效, THE Application SHALL 清除本地 Token 并引导用户重新登录
4. WHEN User 执行登出操作, THE Application SHALL 调用 SSO_Service 的登出接口并清除本地存储的 Token
5. THE Application SHALL 在每次调用需要身份验证的 API 时，在请求头中携带 Token

### 需求 3: 云端数据存储

**用户故事:** 作为用户，我希望我的任务、余额和日志数据能够保存在云端，这样我可以在任何设备上访问

#### 验收标准

1. WHEN User 成功登录, THE Application SHALL 从 Cloud_Storage 加载该用户的 AppState 数据
2. WHEN AppState 数据发生变化, THE Application SHALL 在 5 秒内将更新同步到 Cloud_Storage
3. IF Cloud_Storage 不可用, THEN THE Application SHALL 将数据保存到 Local_Storage 并在服务恢复后自动同步
4. WHEN 多个设备同时修改数据, THE Application SHALL 使用最后写入优先策略解决冲突
5. THE Application SHALL 在 Cloud_Storage 中为每个用户维护独立的数据空间，确保数据隔离

### 需求 4: 数据迁移

**用户故事:** 作为现有用户，我希望能够将本地存储的数据迁移到云端，这样我不会丢失已有的任务和记录

#### 验收标准

1. WHEN User 首次使用 SSO 登录且 Local_Storage 中存在旧数据, THE Application SHALL 检测到本地数据的存在
2. WHEN 检测到本地数据, THE Application SHALL 显示数据迁移提示，询问用户是否上传本地数据到云端
3. WHEN User 确认迁移, THE Application SHALL 将 Local_Storage 中的 AppState 数据上传到 Cloud_Storage
4. WHEN 迁移完成, THE Application SHALL 显示成功提示并标记本地数据已迁移
5. IF 云端已存在数据且用户选择迁移, THEN THE Application SHALL 提示用户选择保留云端数据或覆盖为本地数据

### 需求 5: 离线支持

**用户故事:** 作为用户，我希望在网络不可用时仍然能够使用应用的基本功能

#### 验收标准

1. WHEN Application 检测到网络不可用, THE Application SHALL 显示离线模式提示
2. WHILE 处于离线模式, THE Application SHALL 允许用户查看和修改本地缓存的数据
3. WHEN 网络恢复, THE Application SHALL 自动将离线期间的数据变更同步到 Cloud_Storage
4. IF 离线期间 Token 过期, THEN THE Application SHALL 在网络恢复后要求用户重新登录
5. THE Application SHALL 在离线模式下禁用需要网络连接的功能，如数据导出

### 需求 6: 登录状态管理

**用户故事:** 作为用户，我希望应用能够记住我的登录状态，避免频繁登录

#### 验收标准

1. WHEN User 成功登录, THE Application SHALL 在 Local_Storage 中保存登录状态标记
2. WHEN Application 启动, THE Application SHALL 检查 Token 的有效性，有效期内自动登录
3. WHEN Token 有效期少于 2 小时, THE Application SHALL 尝试刷新 Token 以延长会话
4. WHEN User 在一个设备上登出, THE Application SHALL 仅清除该设备的登录状态，不影响其他设备
5. WHEN User 选择"登出所有设备", THE Application SHALL 调用 SSO_Service 的全局登出接口

### 需求 7: 错误处理

**用户故事:** 作为用户，当系统出现错误时，我希望能够看到清晰的错误提示和解决建议

#### 验收标准

1. WHEN SSO 登录失败, THE Application SHALL 显示友好的错误消息，说明失败原因
2. WHEN 数据同步失败, THE Application SHALL 显示重试按钮，允许用户手动触发同步
3. WHEN Token 验证失败, THE Application SHALL 清除无效 Token 并引导用户重新登录
4. WHEN 网络请求超时, THE Application SHALL 在 10 秒后显示超时提示
5. THE Application SHALL 记录所有错误日志到浏览器控制台，便于调试

### 需求 8: 安全性

**用户故事:** 作为系统管理员，我需要确保用户数据和身份信息的安全性

#### 验收标准

1. THE Application SHALL 仅通过 HTTPS 协议与 SSO_Service 和 Cloud_Storage 通信
2. THE Application SHALL 在 Local_Storage 中加密存储敏感数据，如 Token
3. WHEN Application 检测到 XSS 攻击风险, THE Application SHALL 拒绝执行不安全的操作
4. THE Application SHALL 在登录流程中使用 state 参数防止 CSRF 攻击
5. THE Application SHALL 在 Token 即将过期前 5 分钟提示用户保存数据

### 需求 9: 用户体验

**用户故事:** 作为用户，我希望登录和数据同步过程流畅且不影响正常使用

#### 验收标准

1. WHEN 数据正在同步, THE Application SHALL 显示加载指示器，但不阻塞用户操作
2. WHEN 登录成功, THE Application SHALL 在 2 秒内完成数据加载并显示主界面
3. THE Application SHALL 在后台自动同步数据，无需用户手动触发
4. WHEN 同步完成, THE Application SHALL 显示简短的成功提示，3 秒后自动消失
5. THE Application SHALL 提供"立即同步"按钮，允许用户手动触发数据同步

### 需求 10: 家长密码功能保留

**用户故事:** 作为家长，我希望在 SSO 登录后，家长密码功能仍然可用，保护设置页面

#### 验收标准

1. WHEN User 登录后首次访问设置页面, THE Application SHALL 要求设置或输入家长密码
2. THE Application SHALL 将家长密码数据与用户的 AppState 一起同步到云端
3. WHEN User 在新设备登录, THE Application SHALL 从云端加载家长密码设置
4. THE Application SHALL 保持现有的家长密码验证逻辑不变
5. WHEN User 修改家长密码, THE Application SHALL 立即同步到 Cloud_Storage
