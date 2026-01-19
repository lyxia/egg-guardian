import React, { useState, useEffect } from 'react';
import { UserProfile, Task, DailyLog } from './types';
import { loadState, saveState, checkWeeklySalaryReset, processSettlement } from './services/dataService';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import SettlementModal from './components/SettlementModal';
import LoginPage from './components/LoginPage';
import { Settings as SettingsIcon, LayoutDashboard, History } from 'lucide-react';
import { createAuthService } from './services/authService';
import { createApiService } from './services/apiService';
import { setApiService } from './services/apiServiceInstance';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  
  // UI State
  const [currentView, setCurrentView] = useState<'dashboard' | 'settings'>('dashboard');
  const [isSettlementOpen, setIsSettlementOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // 认证状态
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // 创建 AuthService 实例 (使用空字符串使 API 调用相对于同源)
  const authService = createAuthService(
    import.meta.env.VITE_API_URL || ''
  );

  // 初始化全局 ApiService 实例
  useEffect(() => {
    const apiService = createApiService(
      import.meta.env.VITE_API_URL || '',
      () => {
        // Cookie 失效时的处理
        console.log('Authentication expired, logging out...');
        authService.logout();
        setIsAuthenticated(false);
        setCurrentUserId(null);
      }
    );
    setApiService(apiService);
  }, []);

  // 检查认证状态和处理 SSO 回调
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // 1. 检查是否是 SSO 回调
        const callbackResult = authService.checkCallback();

        if (callbackResult.success) {
          console.log('SSO login successful');
          // 登录成功，继续获取用户信息
        } else if (callbackResult.error) {
          console.error('Login failed:', callbackResult.error);
          setIsAuthenticated(false);
          setIsCheckingAuth(false);
          return;
        }

        // 2. 检查当前登录状态
        const user = await authService.getCurrentUser();

        if (user) {
          console.log('User authenticated:', user.userId);
          setIsAuthenticated(true);
          setCurrentUserId(user.userId);
        } else {
          console.log('User not authenticated');
          setIsAuthenticated(false);
          setCurrentUserId(null);
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        setIsAuthenticated(false);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, []);

  // Initialize - 只在认证成功后加载数据
  useEffect(() => {
    if (!isAuthenticated) return;

    const data = loadState();
    
    // Check Weekly Reset Logic
    const { updatedUser, salaryAdded } = checkWeeklySalaryReset(data.user);
    
    if (salaryAdded) {
      alert("新的一周开始啦！爸爸妈妈为你发放了 4000 蛋币基础工资！加油守护它们哦！");
    }

    setUser(updatedUser);
    setTasks(data.tasks);
    setLogs(data.logs || []);
  }, [isAuthenticated]);

  // Persistence
  useEffect(() => {
    if (user && tasks && isAuthenticated) {
      saveState({ user, tasks, logs });
    }
  }, [user, tasks, logs, isAuthenticated]);

  const handleLogin = () => {
    authService.initiateLogin();
  };

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

  // 检查认证状态中
  if (isCheckingAuth) {
    return (
      <div className="flex h-screen items-center justify-center bg-white text-guardian-blue">
        <div className="text-center space-y-4">
          <div className="text-6xl animate-bounce">🥚</div>
          <div className="text-xl font-bold">正在加载...</div>
        </div>
      </div>
    );
  }

  // 未登录，显示登录页
  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // 数据加载中
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-white text-guardian-blue">
        <div className="text-center space-y-4">
          <div className="text-6xl animate-bounce">🥚</div>
          <div className="text-xl font-bold">加载数据中...</div>
        </div>
      </div>
    );
  }

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
               currentUserId={currentUserId}
             />
           ) : (
             <Settings 
               tasks={tasks} 
               onUpdateTasks={setTasks} 
               onClose={() => setCurrentView('dashboard')}
               user={user}
               onUpdateUser={(updatedUser: UserProfile) => setUser(updatedUser)}
               onLogout={async () => {
                 await authService.logout();
                 setIsAuthenticated(false);
                 setCurrentUserId(null);
                 setUser(null);
                 setTasks([]);
                 setLogs([]);
               }}
               currentUserId={currentUserId}
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
    </div>
  );
};

export default App;