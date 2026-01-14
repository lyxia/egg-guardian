# 设计文档

## 概述

本设计文档描述如何修改 Dashboard 组件，将余额显示从"当前总余额"改为"工资卡余额"，并移除本周基础工资池进度条。这是一个纯 UI 层面的修改，不涉及数据模型或业务逻辑的变更。

## 架构

### 受影响的组件

- `components/Dashboard.tsx`: 主要修改目标，包含余额卡片和进度条的渲染逻辑

### 不受影响的组件

- `App.tsx`: 无需修改
- `types.ts`: 数据模型保持不变
- `services/dataService.ts`: 业务逻辑保持不变
- 其他组件: 无需修改

## 组件和接口

### Dashboard 组件修改

**当前实现:**
```tsx
<p className="text-blue-100 font-medium mb-1">当前总余额</p>
<h1 className="text-5xl font-extrabold flex items-center gap-2">
  {user.balance.toLocaleString()}
  <span className="text-2xl">💰</span>
</h1>

<div className="mt-6">
  <div className="flex justify-between text-sm text-blue-100 mb-2">
    <span>本周基础工资池</span>
    <span>剩余 ≈ {estimatedRemainingBase}</span>
  </div>
  <div className="h-3 bg-blue-900/20 rounded-full overflow-hidden">
    <div 
      className="h-full bg-guardian-yellow rounded-full transition-all duration-1000"
      style={{ width: `${(estimatedRemainingBase / 4000) * 100}%` }}
    ></div>
  </div>
</div>
```

**修改后实现:**
```tsx
<p className="text-blue-100 font-medium mb-1">工资卡余额</p>
<h1 className="text-5xl font-extrabold flex items-center gap-2">
  {user.balance.toLocaleString()}
  <span className="text-2xl">💰</span>
</h1>

{/* 移除整个进度条部分 */}
```

### 布局调整

移除进度条后，Balance Card 的内部布局需要调整：

1. **保留元素:**
   - 标题文本（改为"工资卡余额"）
   - 余额数字显示
   - 右上角的盾牌图标
   - 背景装饰圆圈
   - 底部的提示文本（桌面端）
   - "查看工资条"按钮

2. **移除元素:**
   - "本周基础工资池"标签
   - "剩余 ≈ {amount}" 文本
   - 进度条容器及其内部元素
   - 相关的计算逻辑（`estimatedRemainingBase`）

3. **样式调整:**
   - 可能需要调整 `mt-6` 等间距，使布局更加协调
   - 确保移除进度条后，卡片高度和内容分布仍然美观

## 数据模型

无需修改数据模型。`UserProfile` 接口中的 `balance` 字段继续使用，只是显示标签发生变化。

## 错误处理

本次修改为纯 UI 变更，不涉及新的错误处理逻辑。现有的错误处理机制保持不变。

## 测试策略

### 视觉测试

1. 在桌面端和移动端验证 Balance Card 显示正确
2. 确认"工资卡余额"标签显示正确
3. 确认进度条已完全移除
4. 确认卡片布局美观，间距合理

### 功能测试

1. 验证余额数字正确显示
2. 验证"查看工资条"按钮功能正常
3. 验证其他 Dashboard 功能（任务列表、领取工资）不受影响

### 回归测试

1. 确认 Settings 页面不受影响
2. 确认工资结算流程不受影响
3. 确认数据持久化功能正常

## 实现注意事项

1. **代码清理:** 移除 `estimatedRemainingBase` 相关的计算逻辑，因为不再需要
2. **响应式设计:** 确保修改后的布局在不同屏幕尺寸下都能正常显示
3. **保持一致性:** 确保修改后的文案风格与应用其他部分保持一致
