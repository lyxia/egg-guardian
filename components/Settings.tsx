import React, { useState, useMemo, useEffect } from 'react';
import { Task, DayOfWeek, UserProfile } from '../types';
import { Trash2, Plus, GripVertical, Star, X, Volume2, VolumeX, Lock } from 'lucide-react';
import StarRating from './StarRating';
import { calculateStarValue, DAILY_SALARY_TARGET, loadParentAuth } from '../services/dataService';
import ParentAuth from './ParentAuth';

interface SettingsProps {
  tasks: Task[];
  onUpdateTasks: (newTasks: Task[]) => void;
  onClose: () => void;
  user?: UserProfile;
  onUpdateUser?: (user: UserProfile) => void;
  onLogout?: () => void;
  currentUserId?: string | null;
}

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

// Predefined emoji list for children's habits
const EMOJI_OPTIONS = [
  "📝", "📚", "🎹", "🎨", "🏃", "⚽", 
  "🧹", "🛏️", "🦷", "🎒", "🍽️", "🛁", 
  "🍎", "🥦", "🐶", "📵", "⏰", "💤", 
  "✨", "🎯"
];

const Settings: React.FC<SettingsProps> = ({ tasks, onUpdateTasks, onClose, user, onUpdateUser, onLogout, currentUserId }) => {
  // Preview logic
  const { valuePerStar } = useMemo(() => calculateStarValue(tasks), [tasks]);
  
  const [editingTask, setEditingTask] = useState<Partial<Task> | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showParentSettings, setShowParentSettings] = useState(false);

  // 检查是否需要家长认证
  useEffect(() => {
    const auth = loadParentAuth();
    if (auth?.state.isPasswordSet) {
      setShowAuth(true);
    } else {
      setIsAuthenticated(true);
    }
  }, []);

  const handleAuthVerified = () => {
    setIsAuthenticated(true);
    setShowAuth(false);
  };

  const handleAuthCancel = () => {
    setShowAuth(false);
    onClose();
  };

  const handleToggleMute = () => {
    if (user && onUpdateUser) {
      onUpdateUser({
        ...user,
        isMuted: !user.isMuted,
      });
    }
  };

  const handleLogout = async () => {
    if (confirm('确定要退出登录吗？退出后需要重新登录才能访问您的数据。')) {
      if (onLogout) {
        await onLogout();
      }
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("确定要删除这个任务吗？")) {
      onUpdateTasks(tasks.filter(t => t.id !== id));
    }
  };

  const handleSave = () => {
    if (!editingTask || !editingTask.title) return;

    if (isAdding) {
      const newTask: Task = {
        id: `task_${Date.now()}`,
        title: editingTask.title || "新任务",
        icon: editingTask.icon || "✨",
        stars: (editingTask.stars as 1|2|3) || 1,
        days: editingTask.days || [1, 2, 3, 4, 5]
      };
      onUpdateTasks([...tasks, newTask]);
    } else {
       onUpdateTasks(tasks.map(t => t.id === editingTask.id ? { ...t, ...editingTask } as Task : t));
    }
    setEditingTask(null);
    setIsAdding(false);
  };

  const startEdit = (task: Task) => {
    setEditingTask(task);
    setIsAdding(false);
  };

  const startAdd = () => {
    setEditingTask({ stars: 1, days: [1, 2, 3, 4, 5], icon: "✨" });
    setIsAdding(true);
  };

  const toggleDay = (day: DayOfWeek) => {
    if (!editingTask) return;
    const currentDays = editingTask.days || [];
    if (currentDays.includes(day)) {
      setEditingTask({ ...editingTask, days: currentDays.filter(d => d !== day) });
    } else {
      setEditingTask({ ...editingTask, days: [...currentDays, day].sort() });
    }
  };

  // 如果未认证，显示认证界面
  if (showAuth && !isAuthenticated) {
    return <ParentAuth onVerified={handleAuthVerified} onCancel={handleAuthCancel} />;
  }

  return (
    <div className="flex flex-col h-full bg-white md:bg-transparent">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 md:border-none flex justify-between items-center bg-white md:bg-transparent md:p-0 md:mb-6">
        <h2 className="text-2xl font-extrabold text-gray-800">任务配置</h2>
        <div className="flex items-center gap-2">
          {user && (
            <button
              onClick={handleToggleMute}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              title={user.isMuted ? '取消静音' : '静音'}
            >
              {user.isMuted ? <VolumeX size={20} className="text-gray-600" /> : <Volume2 size={20} className="text-gray-600" />}
            </button>
          )}
          <button
            onClick={() => setShowParentSettings(!showParentSettings)}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            title="家长设置"
          >
            <Lock size={20} className="text-gray-600" />
          </button>
          <button onClick={onClose} className="text-guardian-blue font-bold md:hidden">完成</button>
        </div>
      </div>

      {/* Parent Settings Panel */}
      {showParentSettings && (
        <div className="mb-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-blue-800">家长设置</h3>
            <button
              onClick={() => setShowParentSettings(false)}
              className="text-blue-600 hover:text-blue-800"
            >
              <X size={18} />
            </button>
          </div>
          <div className="space-y-3">
            {/* 用户信息展示 */}
            {currentUserId && (
              <div className="pb-3 border-b border-blue-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-guardian-blue to-blue-400 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {currentUserId.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-600 font-medium">当前登录账号</p>
                    <p className="text-sm font-bold text-gray-800 truncate" title={currentUserId}>
                      {currentUserId}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                  <span>已登录，数据已同步到云端</span>
                </div>
              </div>
            )}
            {user && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">静音模式</span>
                <button
                  onClick={handleToggleMute}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    user.isMuted ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      user.isMuted ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            )}
            <button
              onClick={() => {
                setShowAuth(true);
                setIsAuthenticated(false);
              }}
              className="w-full text-left text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              修改家长密码
            </button>
            {onLogout && (
              <button
                onClick={handleLogout}
                className="w-full text-left text-sm text-red-600 hover:text-red-800 font-medium pt-2 border-t border-blue-200"
              >
                退出登录
              </button>
            )}
          </div>
        </div>
      )}

      {/* Editor Modal Overlay */}
      {editingTask && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">{isAdding ? '添加新任务' : '编辑任务'}</h3>
              <button 
                onClick={() => setEditingTask(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-5">
              {/* Task Name */}
              <div>
                <label className="block text-sm font-bold text-gray-500 mb-1">任务名称</label>
                <input 
                  value={editingTask.title || ''}
                  onChange={e => setEditingTask({...editingTask, title: e.target.value})}
                  className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-guardian-blue outline-none font-bold text-lg text-gray-700 placeholder-gray-300 transition-colors"
                  placeholder="例如：整理床铺"
                  autoFocus
                />
              </div>

              {/* Icon Selection */}
              <div>
                <label className="block text-sm font-bold text-gray-500 mb-2">选择图标</label>
                <div className="grid grid-cols-5 gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100 max-h-32 overflow-y-auto">
                  {EMOJI_OPTIONS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => setEditingTask(prev => ({ ...prev, icon: emoji }))}
                      className={`
                        aspect-square flex items-center justify-center text-2xl rounded-lg transition-all
                        ${editingTask.icon === emoji 
                          ? 'bg-white shadow-md ring-2 ring-guardian-blue scale-110' 
                          : 'hover:bg-white hover:shadow-sm opacity-70 hover:opacity-100'}
                      `}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Star Rating Selection */}
              <div>
                 <label className="block text-sm font-bold text-gray-500 mb-2">重要程度 (星级)</label>
                 <div className="bg-gray-50 rounded-xl p-4 flex justify-center items-center border border-gray-100">
                    <div className="flex gap-4">
                      {[1, 2, 3].map((starLevel) => {
                        const isSelected = (editingTask.stars || 1) >= starLevel;
                        return (
                          <button 
                            key={starLevel}
                            type="button"
                            onClick={() => setEditingTask(prev => ({...prev, stars: starLevel as 1|2|3}))}
                            className="group relative focus:outline-none"
                          >
                            <Star 
                              size={32} 
                              className={`
                                transition-all duration-200 transform group-active:scale-90
                                ${isSelected 
                                  ? 'fill-guardian-yellow text-guardian-yellow drop-shadow-sm scale-110' 
                                  : 'text-gray-300 fill-gray-100'}
                              `}
                            />
                            {isSelected && (
                              <div className="absolute inset-0 bg-yellow-400 opacity-20 blur-md rounded-full animate-pulse"></div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                 </div>
                 <p className="text-center text-xs text-gray-400 mt-2 font-medium">
                   {editingTask.stars === 3 ? "⭐⭐⭐ 核心任务 (扣分最重)" : 
                    editingTask.stars === 2 ? "⭐⭐ 重要任务" : "⭐ 日常习惯"}
                 </p>
              </div>

              {/* Repeats */}
              <div>
                <label className="block text-sm font-bold text-gray-500 mb-2">重复周期</label>
                <div className="flex justify-between">
                  {WEEKDAYS.map((d, i) => {
                    const idx = i as DayOfWeek;
                    const isActive = editingTask.days?.includes(idx);
                    return (
                      <button
                        key={i}
                        onClick={() => toggleDay(idx)}
                        className={`
                          w-9 h-9 rounded-full text-xs font-bold transition-all
                          ${isActive ? 'bg-guardian-blue text-white shadow-md scale-105' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}
                        `}
                      >
                        {d}
                      </button>
                    )
                  })}
                </div>
              </div>

              <button 
                onClick={handleSave}
                disabled={!editingTask.title}
                className="w-full bg-guardian-blue text-white font-bold py-4 rounded-xl mt-2 shadow-lg hover:bg-blue-400 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                保存配置
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 md:p-0 md:pr-1 space-y-3">
        {/* Sim Config Info */}
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4 md:flex md:justify-between md:items-center">
           <div className="text-sm text-blue-800 font-bold mb-1 md:mb-0">今日预览</div>
           <div className="flex justify-between text-blue-600 text-sm md:gap-4">
             <span>单颗星星价值</span>
             <span className="font-bold">≈ {valuePerStar} 蛋币</span>
           </div>
        </div>

        <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 pb-20">
          {tasks.map(task => (
            <div key={task.id} className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm flex items-center justify-between hover:border-blue-200 transition-colors group">
              <div className="flex items-center gap-3">
                <GripVertical className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" size={20} />
                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-2xl shadow-inner">
                  {task.icon}
                </div>
                <div onClick={() => startEdit(task)} className="cursor-pointer">
                  <h3 className="font-bold text-gray-800">{task.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                     <StarRating count={task.stars} size={14} />
                     <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                       {task.days.length === 7 ? '每天' : `周${task.days.map(d => WEEKDAYS[d]).join('')}`}
                     </span>
                  </div>
                </div>
              </div>
              <button onClick={() => handleDelete(task.id)} className="text-gray-300 hover:text-red-400 p-2 hover:bg-red-50 rounded-full transition-colors">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          
          <button 
            onClick={startAdd}
            className="w-full md:col-span-2 border-2 border-dashed border-gray-300 text-gray-400 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:border-guardian-blue hover:text-guardian-blue hover:bg-blue-50 transition-all h-auto min-h-[80px]"
          >
            <Plus />
            添加新任务
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;