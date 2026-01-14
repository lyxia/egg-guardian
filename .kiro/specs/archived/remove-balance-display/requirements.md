# 需求文档

## 简介

本功能旨在优化 Dashboard 界面的余额显示，将"当前总余额"改为"工资卡余额"，并移除本周基础工资池进度条，使界面更加简洁清晰。

## 术语表

- **Dashboard**: 应用的主仪表盘界面，显示用户余额、任务列表和操作按钮
- **Balance Card**: 显示余额信息的蓝色渐变卡片组件
- **Salary Card Balance**: 工资卡余额，显示用户当前可用的工资余额
- **Salary Pool Progress**: 显示"本周基础工资池"剩余金额的进度条组件
- **Task List**: 今日工作清单，显示用户需要完成的任务
- **Salary Slip Button**: "查看工资条"按钮，用于查看历史工资记录

## 需求

### 需求 1

**用户故事:** 作为用户，我希望看到"工资卡余额"而不是"当前总余额"，这样我可以更清楚地了解这是工资相关的余额

#### 验收标准

1. WHEN 用户打开 Dashboard 页面，THE Balance Card SHALL 显示"工资卡余额"标签而不是"当前总余额"
2. THE Balance Card SHALL 继续显示用户的 balance 数值
3. THE Balance Card SHALL 保持现有的蓝色渐变样式和布局

### 需求 2

**用户故事:** 作为用户，我希望 Dashboard 界面更加简洁，这样我可以更专注于任务本身

#### 验收标准

1. WHEN 用户打开 Dashboard 页面，THE Dashboard SHALL 不显示"本周基础工资池"进度条及其相关文本
2. WHEN 用户打开 Dashboard 页面，THE Dashboard SHALL 保留"今日工作清单"和"领取今日工资"按钮
3. WHEN 用户打开 Dashboard 页面，THE Dashboard SHALL 保留"查看工资条"按钮的访问入口

### 需求 3

**用户故事:** 作为用户，我希望仍然能够查看我的工资历史记录，这样我可以了解我的收入情况

#### 验收标准

1. WHEN 用户需要查看工资记录，THE Dashboard SHALL 提供访问工资条列表的功能
2. WHEN 用户点击查看工资条，THE SalarySlipList 组件 SHALL 显示历史工资记录
3. THE SalarySlipList 组件 SHALL 保持现有功能不变
