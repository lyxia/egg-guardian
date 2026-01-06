import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { loadParentAuth, verifyPassword, setPassword } from '../services/dataService';

interface ParentAuthProps {
  onVerified: () => void;
  onCancel?: () => void;
}

const ParentAuth: React.FC<ParentAuthProps> = ({ onVerified, onCancel }) => {
  const [password, setPasswordValue] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordSet, setIsPasswordSet] = useState(false);

  useEffect(() => {
    const auth = loadParentAuth();
    setIsPasswordSet(auth?.state.isPasswordSet || false);
    setIsSettingPassword(!auth?.state.isPasswordSet);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isSettingPassword) {
      // 设置新密码
      if (!password || password.length < 4) {
        setError('密码至少需要4位');
        return;
      }
      if (password !== confirmPassword) {
        setError('两次输入的密码不一致');
        return;
      }
      setPassword(password);
      setIsSettingPassword(false);
      setIsPasswordSet(true);
      setPasswordValue('');
      setConfirmPassword('');
    } else {
      // 验证密码
      if (verifyPassword(password)) {
        onVerified();
      } else {
        setError('密码错误，请重试');
        setPasswordValue('');
      }
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Lock className="text-blue-600" size={32} />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">
          {isSettingPassword ? '设置家长密码' : '家长验证'}
        </h2>
        <p className="text-sm text-gray-500 text-center mb-6">
          {isSettingPassword 
            ? '请设置一个密码来保护设置页面' 
            : '请输入密码以访问设置'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              密码
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPasswordValue(e.target.value);
                  setError('');
                }}
                className="w-full border-2 border-gray-200 rounded-xl p-3 pr-10 focus:border-blue-500 outline-none font-bold text-lg"
                placeholder={isSettingPassword ? '至少4位密码' : '请输入密码'}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {isSettingPassword && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                确认密码
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError('');
                  }}
                  className="w-full border-2 border-gray-200 rounded-xl p-3 pr-10 focus:border-blue-500 outline-none font-bold text-lg"
                  placeholder="请再次输入密码"
                />
                {confirmPassword && password === confirmPassword && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                    <CheckCircle size={20} />
                  </div>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-xl">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            {onCancel && (
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
            )}
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-lg"
            >
              {isSettingPassword ? '设置密码' : '验证'}
            </button>
          </div>
        </form>

        {isPasswordSet && !isSettingPassword && (
          <button
            onClick={() => {
              setIsSettingPassword(true);
              setPasswordValue('');
              setConfirmPassword('');
              setError('');
            }}
            className="w-full mt-4 text-sm text-gray-500 hover:text-gray-700"
          >
            修改密码
          </button>
        )}
      </div>
    </div>
  );
};

export default ParentAuth;

