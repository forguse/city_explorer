
import React, { useState } from 'react';
import { auth } from '../services/api';
import CapacitorImage from '../src/components/common/CapacitorImage';
import { getImageUrl } from '../src/utils/imageUrl';

interface LoginScreenProps {
  onLoginSuccess: () => void;
  onUserAgreement: () => void;
  onPrivacyPolicy: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, onUserAgreement, onPrivacyPolicy }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [inviteCode, setInviteCode] = useState('');

  // Terms & Conditions
  const [isAgreed, setIsAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAgreed) {
      setError('请先阅读并同意用户协议与隐私政策');
      return;
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('请输入有效的邮箱地址');
      return;
    }

    // 验证密码长度
    if (password.length < 6) {
      setError('密码至少需要6个字符');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const response = await auth.login({ email, password });
      // Save token
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      // Notify parent
      onLoginSuccess();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || '登录失败，请检查邮箱和密码');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAgreed) {
      setError('请先阅读并同意用户协议与隐私政策');
      return;
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('请输入有效的邮箱地址');
      return;
    }

    // 验证用户名长度
    if (username.length < 2 || username.length > 18) {
      setError('用户名（昵称）需要2-18个字符');
      return;
    }

    // 验证密码格式：至少6位，包含大写、小写和数字
    if (password.length < 6) {
      setError('密码至少需要6个字符');
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError('密码需要包含至少一个大写字母');
      return;
    }
    if (!/[a-z]/.test(password)) {
      setError('密码需要包含至少一个小写字母');
      return;
    }
    if (!/[0-9]/.test(password)) {
      setError('密码需要包含至少一个数字');
      return;
    }

    // 验证两次密码一致
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    // 验证邀请码
    if (!inviteCode.trim()) {
      setError('请输入邀请码');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      await auth.register({ username, password, inviteCode, email }); // Note: Update API signature in next step or assume object
      // Auto login after register? Or just switch to login mode?
      // For now, let's login automatically or ask user to login.
      // The current flow was to switch to login mode usually, but let's try auto-login if backend returns token (it doesn't yet).
      // Standard flow:
      const loginRes = await auth.login({ email, password });
      localStorage.setItem('token', loginRes.data.token);
      localStorage.setItem('user', JSON.stringify(loginRes.data.user));
      onLoginSuccess();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || '注册失败，请检查输入');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    if (mode === 'login') {
      handleLogin(e);
    } else {
      handleRegister(e);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-[#0f111a] font-sans overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a]/80 via-[#0f172a]/60 to-[#0f172a] z-10"></div>
        <img
          // 背景图片：登录页面的城市夜景背景
          src="/images/login-bg.jpg"
          alt="City Lights"
          className="w-full h-full object-cover object-center opacity-60"
        />
        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#22c55e 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
      </div>

      <div className="relative z-10 flex-1 w-full overflow-y-auto">
        <div className="min-h-full flex flex-col items-center justify-center p-6 w-full max-w-sm mx-auto">
          <div className="w-full space-y-6 animate-in fade-in zoom-in-95 duration-500">

            {/* Logo & Header */}
            <div className="flex flex-col items-center mb-2">
              <div className="relative mb-4 group">
                <div className="absolute inset-0 rounded-full bg-white/20 blur-3xl animate-pulse"></div>
                <div className="bg-white/80 rounded-3xl p-3 shadow-2xl backdrop-blur-sm">
                  <img
                    src="/images/logo.png"
                    alt="LineTrip Logo"
                    className="w-28 h-28 object-contain drop-shadow-lg"
                  />
                </div>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-white mb-1">LineTrip 线旅</h1>
              <p className="text-emerald-400 text-xs font-bold tracking-[0.3em] uppercase opacity-80">城市探索者 City Explorer</p>
            </div>

            {/* Form Card */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl">
              {/* Form */}
              <form onSubmit={onSubmit} className="space-y-5 w-full">

                {/* Email Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">邮箱</label>
                  <div className="relative group">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="login-input w-full bg-[#0f111a]/40 border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-[#1337ec] focus:ring-1 focus:ring-[#1337ec] transition-all placeholder:text-gray-600 group-hover:border-white/20 text-sm"
                      required
                    />
                    <span className="material-symbols-outlined absolute right-3 top-3 text-gray-500 group-hover:text-gray-400 transition-colors text-lg">mail</span>
                  </div>
                </div>

                {/* Username Input (Register Only) */}
                {mode === 'register' && (
                  <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">用户名（昵称）</label>
                    <div className="relative group">
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="给自己起个响亮的代号"
                        className="login-input w-full bg-[#0f111a]/40 border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-[#1337ec] focus:ring-1 focus:ring-[#1337ec] transition-all placeholder:text-gray-600 group-hover:border-white/20 text-sm"
                        required
                      />
                      <span className="material-symbols-outlined absolute right-3 top-3 text-gray-500 group-hover:text-gray-400 transition-colors text-lg">person</span>
                    </div>
                  </div>
                )}

                {/* Password Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">密码</label>
                  <div className="relative group">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="login-input w-full bg-[#0f111a]/40 border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-[#1337ec] focus:ring-1 focus:ring-[#1337ec] transition-all placeholder:text-gray-600 group-hover:border-white/20 text-sm pr-10"
                      required
                    />
                    <div className="absolute right-3 top-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-gray-500 hover:text-gray-400 transition-colors focus:outline-none"
                      >
                        <span className="material-symbols-outlined text-lg">
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                      <span className="material-symbols-outlined text-gray-500 group-hover:text-gray-400 transition-colors text-lg">lock</span>
                    </div>
                  </div>
                  {mode === 'register' && (
                    <p className="text-[10px] text-gray-500 ml-1 mt-1 flex items-start gap-1">
                      <span className="material-symbols-outlined text-xs mt-0.5">info</span>
                      <span>密码需包含大写字母、小写字母和数字，至少6位</span>
                    </p>
                  )}
                </div>

                {/* Confirm Password Input (Register Only) */}
                {mode === 'register' && (
                  <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">确认密码</label>
                    <div className="relative group">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="login-input w-full bg-[#0f111a]/40 border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-[#1337ec] focus:ring-1 focus:ring-[#1337ec] transition-all placeholder:text-gray-600 group-hover:border-white/20 text-sm pr-10"
                        required
                      />
                      <div className="absolute right-3 top-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-gray-500 group-hover:text-gray-400 transition-colors text-lg">check_circle</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Invite Code (Register Only) */}
                {mode === 'register' && (
                  <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">邀请码</label>
                    <div className="relative group">
                      <input
                        type="text"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value)}
                        placeholder="XXXX-XXXX"
                        className="login-input w-full bg-[#0f111a]/40 border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-[#1337ec] focus:ring-1 focus:ring-[#1337ec] transition-all placeholder:text-gray-600 group-hover:border-white/20 text-center tracking-widest font-mono uppercase text-sm"
                        required
                      />
                      <span className="material-symbols-outlined absolute right-3 top-3 text-gray-500 group-hover:text-gray-400 transition-colors text-lg">key</span>
                    </div>
                  </div>
                )}

                {/* Terms Checkbox */}
                <label className="flex items-start gap-3 cursor-pointer group select-none">
                  <div className="relative flex items-center mt-0.5">
                    <input
                      type="checkbox"
                      checked={isAgreed}
                      onChange={(e) => setIsAgreed(e.target.checked)}
                      className="peer h-4 w-4 appearance-none rounded-[4px] border border-white/30 bg-transparent checked:border-[#1337ec] checked:bg-[#1337ec] transition-all cursor-pointer"
                    />
                  </div>
                  <div className="text-xs text-gray-400 leading-relaxed">
                    我已阅读并同意
                    <button type="button" onClick={onUserAgreement} className="text-gray-300 hover:text-[#1337ec] transition-colors ml-1 font-medium underline decoration-gray-600 underline-offset-2">《用户协议》</button>
                    与
                    <button type="button" onClick={onPrivacyPolicy} className="text-gray-300 hover:text-[#1337ec] transition-colors ml-1 font-medium underline decoration-gray-600 underline-offset-2">《隐私政策》</button>
                  </div>
                </label>

                {/* Error Message */}
                {error && (
                  <div className="text-red-400 text-xs text-center bg-red-500/10 py-2.5 rounded-lg border border-red-500/20 animate-in fade-in slide-in-from-top-1">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">error</span>
                      {error}
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#1337ec] hover:bg-[#0f2cb8] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-[#1337ec]/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                >
                  {isLoading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <span>{mode === 'login' ? '登 录' : '立即注册'}</span>
                      <span className="material-symbols-outlined text-lg group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
                    </>
                  )}
                </button>
              </form>

              {/* Switch Mode */}
              <div className="mt-6 text-center border-t border-white/5 pt-4">
                <button
                  onClick={() => {
                    setMode(mode === 'login' ? 'register' : 'login');
                    setError('');
                    setInviteCode('');
                    setPassword('');
                    setConfirmPassword('');
                  }}
                  className="text-sm text-gray-400 hover:text-white transition-colors flex items-center justify-center gap-1 mx-auto group"
                >
                  <span>{mode === 'login' ? '还没有账号？' : '已有账号？'}</span>
                  <span className="text-[#1337ec] font-bold group-hover:underline underline-offset-4">{mode === 'login' ? '点击注册' : '点击登录'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
