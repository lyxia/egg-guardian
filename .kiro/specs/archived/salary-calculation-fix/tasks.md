# 实现计划

- [x] 1. 更新数据模型，添加缺失字段
  - 在 `types.ts` 中扩展 `DailyLog` 接口，添加 `deduction` 和 `actual_amount` 字段
  - _需求: 2.1, 3.2_

- [ ] 2. 修复工资计算逻辑，统一为扣除制
  - [x] 2.1 重构 `processSettlement` 函数使用扣除制计算
    - 修改计算逻辑：从累加奖励改为计算扣除
    - 计算公式：`actualAmount = DAILY_SALARY_TARGET - deduction`
    - 更新 `tasks_status` 中的 `deduction` 字段为实际扣除值
    - 更新返回的 `log` 对象，包含 `deduction` 和 `actual_amount` 字段
    - 确保 `net_income` 等于 `actual_amount`（向后兼容）
    - _需求: 1.1, 1.2, 1.3, 3.1, 3.3_

  - [ ]* 2.2 编写单元测试验证计算逻辑
    - 测试场景：全部完成（deduction = 0, actualAmount = 572）
    - 测试场景：部分完成（验证扣除计算正确）
    - 测试场景：全部未完成（deduction = 572, actualAmount = 0）
    - 验证 `log` 对象包含所有必需字段
    - _需求: 1.1, 1.2, 1.3_

- [ ] 3. 更新工资条显示组件
  - [x] 3.1 扩展 `SalarySlipList` 组件显示完整工资信息
    - 显示基础工资
    - 显示扣除金额（如果有）
    - 显示实际领取金额
    - 使用 `??` 运算符处理旧数据兼容性（`log.actual_amount ?? log.net_income`）
    - _需求: 2.2, 2.3, 2.4, 2.5_

  - [ ]* 3.2 添加视觉优化
    - 扣除金额使用红色显示
    - 实际领取金额使用绿色高亮
    - 添加分隔线区分不同部分
    - _需求: 2.5_

- [x] 4. 数据兼容性处理
  - 在数据加载时处理旧格式的工资条记录
  - 为缺少 `deduction` 和 `actual_amount` 的记录推导值
  - 推导逻辑：`deduction = base_salary - net_income`, `actual_amount = net_income`
  - _需求: 3.2_

- [ ] 5. 端到端测试
  - [ ]* 5.1 测试完整的工资领取流程
    - 验证预览金额与实际领取金额一致
    - 验证工资条显示完整信息
    - 验证旧数据正常显示
    - _需求: 1.1, 1.2, 1.4, 2.2, 2.3, 2.4_
