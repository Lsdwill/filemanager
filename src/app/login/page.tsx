'use client';

import { useAuth } from '@/components/AuthProvider';
import { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const success = await login(password);
    if (success) {
      window.location.href = '/files';
    } else {
      setError('密码错误');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="w-full max-w-md px-4">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-white/20">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center">
              <Lock className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white text-center mb-2">个人网盘</h1>
          <p className="text-white/50 text-center mb-8">请输入密码登录</p>

          <form onSubmit={handleSubmit}>
            <div className="relative mb-4">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="密码"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {error && (
              <p className="text-red-400 text-sm mb-4 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white rounded-xl py-3 font-medium transition-all"
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}