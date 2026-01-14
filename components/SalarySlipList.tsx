import React from 'react';
import { DailyLog } from '../types';
import { X, FileText } from 'lucide-react';

interface SalarySlipListProps {
  logs: DailyLog[];
  onClose: () => void;
}

const SalarySlipList: React.FC<SalarySlipListProps> = ({ logs, onClose }) => {
  // 格式化日期为中文格式：2025年1月15日
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}年${month}月${day}日`;
  };

  // 按日期倒序排序（最新的在前）
  const sortedLogs = [...logs].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto transition-opacity" 
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl z-50 pointer-events-auto transform transition-transform duration-300 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-guardian-blue rounded-full flex items-center justify-center shadow-lg">
              <FileText size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-gray-800">工资条记录</h2>
              <p className="text-gray-500 text-sm mt-1">查看历史工资条</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        {/* Salary Slip List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {sortedLogs.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-6xl mb-4">📋</div>
              <p className="text-lg font-medium">还没有工资条记录</p>
              <p className="text-sm mt-2">完成每日任务后，工资条会自动记录在这里</p>
            </div>
          ) : (
            sortedLogs.map((log) => (
              <div 
                key={log.date} 
                className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                {/* 日期 */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <div className="text-sm text-gray-500 mb-1">日期</div>
                    <div className="text-lg font-bold text-gray-800">
                      {formatDate(log.date)}
                    </div>
                  </div>
                </div>

                {/* 工资明细 */}
                <div className="space-y-2">
                  {/* 基础工资 */}
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">基础工资</span>
                    <span className="font-bold text-gray-800">{log.base_salary} 蛋币</span>
                  </div>
                  
                  {/* 扣除金额（如果有） */}
                  {(log.deduction ?? 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">扣除金额</span>
                      <span className="font-bold text-red-500">
                        -{log.deduction} 蛋币
                      </span>
                    </div>
                  )}
                  
                  {/* 实际领取 */}
                  <div className="flex justify-between pt-2 border-t border-gray-200">
                    <span className="text-sm font-bold text-gray-700">实际领取</span>
                    <span className="text-xl font-extrabold text-green-500">
                      {log.actual_amount ?? log.net_income} 蛋币
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SalarySlipList;

