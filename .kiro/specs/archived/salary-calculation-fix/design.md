# 设计文档

## 概述

本设计文档针对工资计算和工资条显示的两个关键 Bug 提供技术解决方案：

1. **Bug 1**: 实际领取金额与预计金额不符（差5蛋币）
2. **Bug 2**: 工资条记录信息不完整（缺少扣除和实际领取信息）

## 第一性原理分析

### Bug 1 的根本原因

通过深入分析代码，发现问题的本质是 **计算模式不一致 + Math.floor 舍入误差累积**：

**SettlementModal（扣除制）**：
```typescript
// 计算未完成任务的扣除
if (completionMap[task.id] === false) {
   deduction += Math.floor(valuePerStar * task.stars);
}
guardedAmount = 572 - deduction; // 从基础工资扣除
```

**processSettlement（奖励制）**：
```typescript
// 计算完成任务的奖励
const isCompleted = !!completionMap[task.id];
const reward = isCompleted ? (valuePerStar * task.stars) : 0;
totalReward += reward;
newBalance = balance + totalReward; // 只累加奖励
```

**5蛋币差异的真相**：

假设今日任务：4 个任务，每个 3 星，总共 12 星
- `valuePerStar = Math.floor(572 / 12) = 47`
- 每个任务价值 = `47 × 3 = 141`
- 4 个任务总价值 = `141 × 4 = 564`
- **舍入损失：572 - 564 = 8 蛋币**

如果完成 2 个任务，未完成 2 个：
- **扣除制计算**：`572 - (141 × 2) = 572 - 282 = 290`
- **奖励制计算**：`141 × 2 = 282`
- **差额**：`290 - 282 = 8 蛋币`

实际测试数据（差 5 蛋币）说明舍入损失约为 5 蛋币。

**核心问题**：
1. 两种计算模式（扣除制 vs 奖励制）本质上不等价
2. `Math.floor` 舍入误差在多个任务间累积
3. 扣除制使用 `572 - 扣除`，奖励制使用 `累加奖励`，两者结果不同

### Bug 2 的根本原因

- `DailyLog` 数据结构中缺少 `deduction` 和 `actual_amount` 字段
- `SalarySlipList` 组件只显示 `base_salary`，无法展示完整的工资计算明细

## 架构

### 问题的本质

```
用户操作：完成 2 个任务，未完成 2 个任务
    ↓
completionMap: { task1: true, task2: true, task3: false, task4: false }
    ↓
SettlementModal 预览（扣除制）：
    deduction = 141 × 2 = 282
    guardedAmount = 572 - 282 = 290
    ↓
processSettlement 实际（奖励制）：
    totalReward = 141 × 2 = 282
    newBalance = balance + 282
    ↓
差额：290 - 282 = 8 蛋币（舍入损失）
```

### 解决方案

**统一为扣除制**（与 UI 文案和产品设计一致）

理由：
1. UI 显示"捣蛋鬼抱走了 X 蛋币"，语义是扣除
2. 基础工资 572 是固定的，未完成任务导致扣除
3. 扣除制避免了舍入误差累积（从固定基数扣除）

**核心改动**：
- 修改 `processSettlement` 使用扣除制计算
- 计算方式：`actualAmount = 572 - deduction`
- 确保与 `SettlementModal` 的预览计算完全一致

## 组件和接口

### 1. 数据模型更新

#### DailyLog 类型扩展

在 `types.ts` 中更新 `DailyLog` 接口：

```typescript
export interface DailyLog {
  date: string; // YYYY-MM-DD
  base_salary: number;
  tasks_status: TaskStatus[];
  net_income: number; // 保留向后兼容，等于 actual_amount
  total_stars: number;
  star_value: number;
  // 新增字段
  deduction: number; // 扣除金额
  actual_amount: number; // 实际领取金额 = base_salary - deduction
}
```

### 2. 计算逻辑统一

#### 修复 SettlementModal 的计算逻辑

在 `components/SettlementModal.tsx` 中，修改 `calculateResults` 函数：

```typescript
const calculateResults = () => {
  let deduction = 0;
  todaysTasks.forEach(task => {
    const isCompleted = completionMap[task.id] === true; // 只有明确为 true 才算完成
    if (!isCompleted) {
      // false 或 undefined 都计入扣除
      deduction += Math.floor(valuePerStar * task.stars);
    }
  });
  return deduction;
};
```

**关键变化**：
- 原逻辑：`completionMap[task.id] === false` → 只计算明确点 ❌ 的
- 新逻辑：`completionMap[task.id] !== true` → 计算所有非 ✓ 的（包括 undefined）

这样就与 `processSettlement` 的逻辑完全一致了：

```typescript
// processSettlement 中的逻辑
const isCompleted = !!completionMap[task.id]; // 只有 true 才是 true
const reward = isCompleted ? (valuePerStar * task.stars) : 0;
```

#### 可选：重构为共享计算函数（更优雅）

如果想要更好的代码复用，可以在 `services/dataService.ts` 中新增：

```typescript
/**
 * 计算工资详情（统一的计算逻辑）
 */
export const calculateSalaryDetails = (
  tasks: Task[],
  completionMap: Record<string, boolean>
): {
  baseSalary: number;
  deduction: number;
  actualAmount: number;
  valuePerStar: number;
  todaysTasks: Task[];
} => {
  const { totalStars, valuePerStar, todaysTasks } = calculateStarValue(tasks);
  const baseSalary = DAILY_SALARY_TARGET;
  
  let deduction = 0;
  todaysTasks.forEach(task => {
    const isCompleted = completionMap[task.id] === true;
    if (!isCompleted) {
      deduction += Math.floor(valuePerStar * task.stars);
    }
  });
  
  const actualAmount = baseSalary - deduction;
  
  return {
    baseSalary,
    deduction,
    actualAmount,
    valuePerStar,
    todaysTasks
  };
};
```

然后在 SettlementModal 和 processSettlement 中都使用这个函数。

### 3. UI 组件更新

#### SettlementModal 组件

**方案 1：最小修改（推荐）**

直接修改 `calculateResults` 函数：

```typescript
const calculateResults = () => {
  let deduction = 0;
  todaysTasks.forEach(task => {
    const isCompleted = completionMap[task.id] === true; // 明确判断
    if (!isCompleted) {
      deduction += Math.floor(valuePerStar * task.stars);
    }
  });
  return deduction;
};
```

**方案 2：使用共享函数（更优雅）**

```typescript
import { calculateSalaryDetails } from '../services/dataService';

const { deduction, actualAmount } = useMemo(() => {
  return calculateSalaryDetails(tasks, completionMap);
}, [tasks, completionMap]);

const guardedAmount = actualAmount; // 直接使用计算结果
```

#### SalarySlipList 组件

扩展显示内容，包含完整的工资信息：

```typescript
<div className="space-y-2">
  <div className="flex justify-between">
    <span className="text-sm text-gray-500">基础工资</span>
    <span className="font-bold text-gray-800">{log.base_salary} 蛋币</span>
  </div>
  
  {(log.deduction ?? 0) > 0 && (
    <div className="flex justify-between">
      <span className="text-sm text-gray-500">扣除金额</span>
      <span className="font-bold text-guardian-red">
        -{log.deduction} 蛋币
      </span>
    </div>
  )}
  
  <div className="flex justify-between pt-2 border-t border-gray-200">
    <span className="text-sm font-bold text-gray-700">实际领取</span>
    <span className="text-xl font-extrabold text-green-500">
      {log.actual_amount ?? log.net_income} 蛋币
    </span>
  </div>
</div>
```

**注意**：使用 `??` 运算符处理旧数据的兼容性。

## 数据迁移

### 历史数据兼容性

为确保现有工资条记录正常显示，需要在数据加载时处理缺失字段：

```typescript
// 在 loadSyncedState 或相关加载函数中
const migrateLog = (log: DailyLog): DailyLog => {
  // 如果缺少新字段，从现有数据推导
  if (log.deduction === undefined || log.actual_amount === undefined) {
    return {
      ...log,
      deduction: log.base_salary - log.net_income,
      actual_amount: log.net_income
    };
  }
  return log;
};
```

## 错误处理

### 计算错误

- **舍入误差**: 使用 `Math.floor` 确保所有金额计算为整数
- **负数保护**: 确保 `actualAmount` 不会为负数（虽然理论上不会发生）

### 数据完整性

- **必填字段验证**: 在 `processSettlement` 中确保所有必需字段都有值
- **类型安全**: 使用 TypeScript 类型系统防止字段缺失

## 测试策略

### 单元测试

1. **calculateSalaryDetails 函数测试**
   - 全部完成：deduction = 0, actualAmount = 572
   - 部分完成：验证扣除计算正确
   - 全部未完成：deduction = 572, actualAmount = 0

2. **processSettlement 函数测试**
   - 验证返回的 log 包含所有必需字段
   - 验证 newUserBalance 计算正确

### 集成测试

1. **端到端工资领取流程**
   - 打开 SettlementModal
   - 选择部分任务完成
   - 验证预览金额
   - 确认领取
   - 验证余额变化
   - 查看工资条
   - 验证工资条显示完整信息

2. **数据迁移测试**
   - 加载旧格式的工资条记录
   - 验证显示正常
   - 验证新记录包含完整字段

### 手动测试场景

**场景 1: 修复 Bug 1 验证**
- 初始余额：3,850
- 完成任务：认真写完作业(3星)、早晚刷牙(3星)
- 未完成任务：练琴20分钟(3星)、整理书包(3星)
- 预期预览：329 蛋币
- 预期余额：4,179 蛋币
- 实际增加：329 蛋币

**场景 2: 修复 Bug 2 验证**
- 完成工资领取
- 打开工资条
- 验证显示：
  - 基础工资：572 蛋币
  - 扣除金额：243 蛋币
  - 实际领取：329 蛋币

## 实现注意事项

### 关键决策

1. **计算逻辑选择**: 采用"扣除制"而非"奖励制"
   - 理由：与产品设计意图一致（守护工资，未完成扣除）
   - 理由：与 UI 文案一致（"捣蛋鬼抱走了 X 蛋币"）

2. **向后兼容**: 保留 `net_income` 字段
   - 理由：避免破坏现有代码
   - 实现：`net_income = actual_amount`

3. **数据迁移**: 在加载时自动迁移旧数据
   - 理由：用户体验平滑，无需手动操作
   - 实现：推导缺失字段值

### 性能考虑

- 计算函数使用 `useMemo` 缓存结果，避免重复计算
- 工资条列表已按日期排序，无需额外排序操作

### 安全性

- 所有金额计算在客户端进行，无需额外安全措施
- 使用 TypeScript 类型系统确保数据完整性
