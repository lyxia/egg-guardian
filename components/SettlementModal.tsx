import React, { useState, useMemo } from 'react';
import { Task } from '../types';
import { calculateStarValue, DAILY_SALARY_TARGET } from '../services/dataService';
import StarRating from './StarRating';
import { Check, X, Frown, ShieldCheck } from 'lucide-react';

interface SettlementModalProps {
  tasks: Task[];
  onConfirm: (completionMap: Record<string, boolean>) => void;
  onCancel: () => void;
}

const SettlementModal: React.FC<SettlementModalProps> = ({ tasks, onConfirm, onCancel }) => {
  const { todaysTasks, valuePerStar } = useMemo(() => calculateStarValue(tasks), [tasks]);
  const [completionMap, setCompletionMap] = useState<Record<string, boolean>>({});

  const toggleTask = (taskId: string, status: boolean) => {
    setCompletionMap(prev => ({ ...prev, [taskId]: status }));
  };

  const calculateResults = () => {
    let deduction = 0;
    todaysTasks.forEach(task => {
      // Default to undefined/false. If explictly false (X clicked) or undefined, it's a deduction?
      // UX: User MUST click check or cross.
      // Let's assume unchecked is "not done" for safety, OR require selection.
      // For a smooth flow, let's toggle: Checked = Done. Not checked = Not done.
      // But the prompt says "Check / Cross" buttons.
      // Let's treat "true" as Done, "false" as Not Done.
      if (completionMap[task.id] === false) { // Explicitly failed
         deduction += Math.floor(valuePerStar * task.stars);
      } else if (completionMap[task.id] === undefined) {
         // If untouched, assume incomplete? Or force user to choose? 
         // Let's count as incomplete for the "Current Deduction" preview, but highlight that action is needed.
         // Actually, let's just calc deduction for explicitly failed ones for the live preview.
      }
    });
    return deduction;
  };

  const currentDeduction = calculateResults();
  const guardedAmount = Math.max(0, DAILY_SALARY_TARGET - currentDeduction);
  
  // Check if all tasks have a status
  const allDecided = todaysTasks.every(t => completionMap[t.id] !== undefined);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto transition-opacity" onClick={onCancel}></div>

      {/* Modal Content */}
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl z-50 pointer-events-auto transform transition-transform duration-300 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-guardian-blue rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg ring-4 ring-blue-50">
            <ShieldCheck size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-800">今日工作核对</h2>
          <p className="text-gray-500 text-sm mt-1">请家长协助核对任务完成情况</p>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto space-y-3 mb-6 pr-1">
          {todaysTasks.map(task => {
            const status = completionMap[task.id];
            const isCompleted = status === true;
            const isFailed = status === false;
            const deductionValue = Math.floor(valuePerStar * task.stars);

            return (
              <div 
                key={task.id} 
                className={`
                  p-4 rounded-2xl border-2 transition-all duration-200 flex items-center justify-between
                  ${isCompleted ? 'border-green-400 bg-green-50' : ''}
                  ${isFailed ? 'border-guardian-red bg-red-50 grayscale-[0.2]' : ''}
                  ${status === undefined ? 'border-gray-100 bg-white' : ''}
                `}
              >
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{task.icon}</div>
                  <div>
                    <h3 className={`font-bold ${isFailed ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                      {task.title}
                    </h3>
                    <div className="flex items-center gap-2">
                       <StarRating 
                          count={task.stars} 
                          size={12} 
                          activeColor={isFailed ? 'text-gray-400 fill-gray-400' : undefined}
                       />
                       {isFailed && (
                         <span className="text-xs font-bold text-guardian-red animate-pulse">
                           -{deductionValue}
                         </span>
                       )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => toggleTask(task.id, false)}
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center transition-all
                      ${isFailed ? 'bg-guardian-red text-white scale-110 shadow-md' : 'bg-gray-100 text-gray-400 hover:bg-red-100'}
                    `}
                  >
                    <X size={20} />
                  </button>
                  <button
                    onClick={() => toggleTask(task.id, true)}
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center transition-all
                      ${isCompleted ? 'bg-green-500 text-white scale-110 shadow-md' : 'bg-gray-100 text-gray-400 hover:bg-green-100'}
                    `}
                  >
                    <Check size={20} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary Footer */}
        <div className="bg-gray-50 rounded-2xl p-4 mb-4 flex justify-between items-center">
          <span className="text-gray-500 font-medium">预计守护</span>
          <div className="text-right">
            <div className={`text-3xl font-black ${currentDeduction > 0 ? 'text-guardian-yellow' : 'text-green-500'}`}>
              {guardedAmount}
            </div>
            {currentDeduction > 0 && (
              <div className="text-xs text-guardian-red font-bold flex items-center justify-end gap-1">
                 <Frown size={12} />
                 捣蛋鬼抱走了 {currentDeduction}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => onConfirm(completionMap)}
          disabled={!allDecided}
          className="w-full bg-guardian-blue hover:bg-blue-400 text-white font-bold py-4 rounded-2xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
        >
          {allDecided ? "确认领取" : "请先核对所有任务"}
        </button>
      </div>
    </div>
  );
};

export default SettlementModal;