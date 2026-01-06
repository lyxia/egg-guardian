import React, { useState, useEffect } from 'react';
import { UserProfile, Task, DailyLog } from './types';
import { loadState, saveState, checkWeeklySalaryReset, processSettlement } from './services/dataService';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import SettlementModal from './components/SettlementModal';
import InstallPrompt from './components/InstallPrompt';
import { Settings as SettingsIcon, LayoutDashboard, History } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  
  // UI State
  const [currentView, setCurrentView] = useState<'dashboard' | 'settings'>('dashboard');
  const [isSettlementOpen, setIsSettlementOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Initialize
  useEffect(() => {
    const data = loadState();
    
    // Check Weekly Reset Logic
    const { updatedUser, salaryAdded } = checkWeeklySalaryReset(data.user);
    
    if (salaryAdded) {
      alert("新的一周开始啦！爸爸妈妈为你发放了 4000 蛋币基础工资！加油守护它们哦！");
    }

    setUser(updatedUser);
    setTasks(data.tasks);
    setLogs(data.logs || []);
  }, []);

  // Persistence
  useEffect(() => {
    if (user && tasks) {
      saveState({ user, tasks, logs });
    }
  }, [user, tasks, logs]);

  const handleSettlementConfirm = (completionMap: Record<string, boolean>) => {
    if (!user) return;

    const { log, newUserBalance } = processSettlement(user, tasks, completionMap);

    setUser({ ...user, balance: newUserBalance });
    setLogs([...logs, log]);
    setIsSettlementOpen(false);
    
    // Simple visual feedback
    if (log.net_income > 0) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
  };

  if (!user) return <div className="flex h-screen items-center justify-center bg-white text-guardian-blue">Loading Egg Guardian...</div>;

  return (
    <div className="h-screen w-screen bg-white text-guardian-text font-sans relative overflow-hidden flex transition-all">
      
      {/* Confetti / Coin Effect Overlay (Simplified CSS animation) */}
      {showConfetti && (
        <div className="fixed inset-0 z-[60] pointer-events-none flex items-center justify-center">
            <div className="text-6xl animate-bounce">💰</div>
            <div className="absolute top-1/4 left-1/4 text-4xl animate-pulse delay-100">✨</div>
            <div className="absolute top-1/3 right-1/4 text-5xl animate-bounce delay-75">🌟</div>
            <div className="bg-white/90 p-6 rounded-3xl shadow-2xl animate-pulse">
               <h2 className="text-2xl font-bold text-guardian-yellow text-center">守护成功!</h2>
               <p className="text-gray-500 text-center">余额已更新</p>
            </div>
        </div>
      )}

      {/* Main Container - Full Screen */}
      <div className="w-full h-full bg-white relative flex flex-col overflow-hidden transition-all duration-300">
        
        {/* Top Navigation */}
        <div className="p-4 md:px-8 md:py-6 flex justify-between items-center bg-white z-10 border-b border-gray-50 md:border-none">
           <div className="flex items-center gap-2 text-guardian-blue font-extrabold text-lg md:text-2xl">
             {currentView === 'dashboard' ? '🥚 蛋仔守护者' : '⚙️ 设置'}
           </div>
           <button 
             onClick={() => setCurrentView(currentView === 'dashboard' ? 'settings' : 'dashboard')}
             className="p-2 md:p-3 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors text-gray-500"
           >
             {currentView === 'dashboard' ? <SettingsIcon size={24} /> : <LayoutDashboard size={24} />}
           </button>
        </div>

        {/* Content Area */}
        <main className="flex-1 p-4 md:p-8 overflow-hidden relative">
           {currentView === 'dashboard' ? (
             <Dashboard 
               user={user} 
               tasks={tasks} 
               logs={logs}
               onStartSettlement={() => setIsSettlementOpen(true)} 
             />
           ) : (
             <Settings 
               tasks={tasks} 
               onUpdateTasks={setTasks} 
               onClose={() => setCurrentView('dashboard')}
               user={user}
               onUpdateUser={(updatedUser) => setUser(updatedUser)}
             />
           )}
        </main>

      </div>

      {/* Modals */}
      {isSettlementOpen && (
        <SettlementModal 
          tasks={tasks} 
          onConfirm={handleSettlementConfirm} 
          onCancel={() => setIsSettlementOpen(false)} 
        />
      )}

      {/* PWA Install Prompt */}
      <InstallPrompt />
    </div>
  );
};

export default App;