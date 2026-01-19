import React, { useMemo, useState } from 'react';
import { UserProfile, Task, DailyLog } from '../types';
import { calculateStarValue, getTodayDateString } from '../services/dataService';
import StarRating from './StarRating';
import SalarySlipList from './SalarySlipList';
import { Shield, Coins, CalendarDays, ChevronRight, History } from 'lucide-react';

interface DashboardProps {
  user: UserProfile;
  tasks: Task[];
  onStartSettlement: () => void;
  logs: DailyLog[];
  currentUserId?: string | null;
}

const Dashboard: React.FC<DashboardProps> = ({ user, tasks, onStartSettlement, logs, currentUserId }) => {
  const [isSalarySlipOpen, setIsSalarySlipOpen] = useState(false);
  const todayStr = getTodayDateString();
  const hasSettledToday = logs.some(log => log.date === todayStr);

  const { todaysTasks, totalStars, valuePerStar } = useMemo(() => {
    return calculateStarValue(tasks);
  }, [tasks]);



  return (
    <div className="flex flex-col h-full md:flex-row md:gap-8 transition-all">
      {/* Left Column: Balance & Stats */}
      <div className="shrink-0 md:w-80 lg:w-96 flex flex-col gap-6 mb-6 md:mb-0">
        {/* 用户信息卡片 */}
        {currentUserId && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-blue-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-guardian-blue to-blue-400 rounded-full flex items-center justify-center text-white font-bold text-lg">
                {currentUserId.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 font-medium">当前账号</p>
                <p className="text-sm font-bold text-gray-800 truncate" title={currentUserId}>
                  {currentUserId}
                </p>
              </div>
              <div className="flex-shrink-0">
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-600 text-xs font-medium rounded-full">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                  已登录
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-gradient-to-br from-guardian-blue to-blue-400 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden md:h-full md:flex md:flex-col md:justify-center">
          {/* Background Decorative Circles */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white opacity-10 rounded-full"></div>
          <div className="absolute top-20 -left-10 w-24 h-24 bg-white opacity-10 rounded-full"></div>

          <div className="flex justify-between items-start z-10 relative">
            <div>
              <p className="text-blue-100 font-medium mb-2">工资卡余额</p>
              <h1 className="text-5xl font-extrabold flex items-center gap-2">
                {user.balance.toLocaleString()}
                <span className="text-2xl">💰</span>
              </h1>
            </div>
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
              <Shield size={32} className="text-white" />
            </div>
          </div>
          
          {/* Desktop-only extra info or illustration could go here */}
          <div className="hidden md:block mt-10 opacity-80 text-sm text-blue-100 leading-relaxed">
             <p>记得每天完成任务，守护你的每一枚蛋币！只有守护成功的蛋币才能在周末兑换游戏时间哦。</p>
          </div>

          {/* Salary Slip Button */}
          <button
            onClick={() => setIsSalarySlipOpen(true)}
            className="mt-8 md:mt-10 w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-bold py-3 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <History size={20} />
            查看工资条
          </button>
        </div>
      </div>

      {/* Right Column: Task List & Actions */}
      <div className="flex-1 flex flex-col min-h-0 relative md:bg-gray-50 md:rounded-3xl md:p-6 md:border md:border-gray-100">
        
        {/* List Header */}
        <div className="flex items-center justify-between mb-4 px-2 md:px-0">
          <h2 className="text-xl font-bold text-guardian-text flex items-center gap-2">
            <CalendarDays className="text-guardian-blue" />
            今日工作清单
          </h2>
          <span className="text-sm font-bold bg-white px-3 py-1 rounded-full text-guardian-blue shadow-sm ring-1 ring-blue-50">
            Total: {totalStars} ⭐
          </span>
        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto pb-24 md:pb-0 space-y-3 px-1">
          {todaysTasks.length === 0 ? (
            <div className="text-center py-10 text-gray-400 bg-white rounded-2xl border-2 border-dashed border-gray-200">
              <p>今天没有任务哦，好好休息！</p>
            </div>
          ) : (
            todaysTasks.map(task => (
              <div key={task.id} className="bg-white p-4 rounded-2xl shadow-sm flex items-center justify-between border border-blue-50 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-2xl">
                    {task.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">{task.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <StarRating count={task.stars} size={14} />
                      <span className="text-xs text-gray-400">
                        ≈ {Math.floor(valuePerStar * task.stars)} 蛋币
                      </span>
                    </div>
                  </div>
                </div>
                {/* Visual indicator only */}
                <div className="w-1 h-8 bg-gray-100 rounded-full"></div>
              </div>
            ))
          )}
        </div>

        {/* Bottom CTA - Absolute on Mobile, Static on Desktop */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:static md:p-0 md:mt-4 bg-gradient-to-t from-white via-white to-transparent md:bg-none z-20">
          {hasSettledToday ? (
             <div className="w-full bg-gray-200 text-gray-500 font-bold py-4 rounded-2xl shadow-sm text-center cursor-not-allowed">
               今日工资已领取 ✅
             </div>
          ) : (
            <button
              onClick={onStartSettlement}
              disabled={todaysTasks.length === 0}
              className="w-full bg-guardian-yellow hover:bg-yellow-400 text-yellow-900 font-extrabold py-4 rounded-2xl shadow-lg transform transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
            >
              <Coins className="animate-bounce" />
              领取今日工资
              <span className="text-sm font-normal opacity-80">(守护 572 蛋币)</span>
            </button>
          )}
        </div>
      </div>

      {/* Salary Slip Modal */}
      {isSalarySlipOpen && (
        <SalarySlipList 
          logs={logs} 
          onClose={() => setIsSalarySlipOpen(false)} 
        />
      )}
    </div>
  );
};

export default Dashboard;