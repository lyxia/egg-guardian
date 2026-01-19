import React from 'react';

interface LoginPageProps {
  onLogin: () => void;
}

/**
 * LoginPage 组件
 * 显示 SSO 登录界面
 */
const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-br from-blue-50 to-white">
      <div className="w-full max-w-md p-8 space-y-8">
        {/* Logo 和标题 */}
        <div className="text-center space-y-4">
          <div className="text-8xl mb-4 animate-bounce">🥚</div>
          <h1 className="text-4xl font-extrabold text-guardian-blue">
            蛋仔守护者
          </h1>
          <p className="text-gray-600 text-lg">
            使用 SSO 账号登录，数据云端同步
          </p>
        </div>

        {/* 登录按钮 */}
        <div className="space-y-4">
          <button
            onClick={onLogin}
            className="w-full bg-guardian-blue text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:bg-blue-400 active:scale-95 transition-all duration-200 flex items-center justify-center gap-3"
          >
            <span className="text-xl">🔐</span>
            <span>使用 SSO 登录</span>
          </button>

          {/* 说明文字 */}
          <div className="text-center text-sm text-gray-500 space-y-2">
            <p>登录后您的数据将自动同步到云端</p>
            <p>可在多个设备间无缝切换</p>
          </div>
        </div>

        {/* 功能特性 */}
        <div className="mt-8 space-y-3 text-sm text-gray-600">
          <div className="flex items-center gap-3">
            <span className="text-2xl">☁️</span>
            <span>云端数据存储，永不丢失</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔄</span>
            <span>多设备自动同步</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔒</span>
            <span>安全可靠的身份认证</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
