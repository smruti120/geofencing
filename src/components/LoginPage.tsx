import React, { useState } from 'react';
import { Eye, EyeOff, Lock, User, Cpu, ArrowRight, ShieldCheck, Mail, Smartphone } from 'lucide-react';
import { SystemRole } from '../types';

interface LoginPageProps {
  onLogin: (role: SystemRole, userId: string, userName: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (loginMethod === 'password') {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: username.trim(), password }),
        });
        const data = await response.json();
        if (!response.ok) {
          setError(data.error || 'Invalid credentials');
        } else {
          // Store token securely
          sessionStorage.setItem('auth_token', data.token);
          onLogin(data.user.role as SystemRole, data.user.id, data.user.name);
        }
      } else {
        // OTP login — Step 1: request OTP
        if (!otpSent) {
          const response = await fetch('/api/auth/request-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: username.trim() }),
          });
          const data = await response.json();
          if (!response.ok) {
            setError(data.error || 'Failed to send OTP');
          } else {
            setOtpSent(true);
            setError(null);
          }
        } else {
          // Step 2: verify OTP
          const response = await fetch('/api/auth/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: username.trim(), otp }),
          });
          const data = await response.json();
          if (!response.ok) {
            setError(data.error || 'Invalid or expired OTP');
          } else {
            sessionStorage.setItem('auth_token', data.token);
            onLogin(data.user.role as SystemRole, data.user.id, data.user.name);
          }
        }
      }
    } catch {
      setError('Connection error. Please try again.');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Left Side - Branding & Info */}
        <div className="hidden lg:flex flex-col justify-center space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                <Cpu className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white">OmniGuard</h1>
                <p className="text-sm text-indigo-400">Smart Campus Management System</p>
              </div>
            </div>

            <h2 className="text-4xl font-bold text-white leading-tight">
              Secure Campus<br />
              <span className="text-indigo-400">Access Control</span>
            </h2>

            <p className="text-slate-400 text-lg">
              Advanced biometric verification, geofencing attendance, and comprehensive gate pass management for modern institutions.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
              <ShieldCheck className="w-8 h-8 text-emerald-400 mb-2" />
              <h3 className="text-white font-bold text-sm">Face Recognition</h3>
              <p className="text-slate-500 text-xs mt-1">3D Liveness Detection</p>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
              <Cpu className="w-8 h-8 text-indigo-400 mb-2" />
              <h3 className="text-white font-bold text-sm">Geo-Fencing</h3>
              <p className="text-slate-500 text-xs mt-1">GPS Based Attendance</p>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
              <Mail className="w-8 h-8 text-amber-400 mb-2" />
              <h3 className="text-white font-bold text-sm">Event Management</h3>
              <p className="text-slate-500 text-xs mt-1">QR Based Entry/Exit</p>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
              <Smartphone className="w-8 h-8 text-rose-400 mb-2" />
              <h3 className="text-white font-bold text-sm">Mobile Ready</h3>
              <p className="text-slate-500 text-xs mt-1">Responsive Design</p>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="lg:hidden flex items-center justify-center gap-3 mb-6">
              <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center">
                <Cpu className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <h1 className="text-xl font-black text-white">OmniGuard</h1>
                <p className="text-xs text-indigo-400">Smart Campus System</p>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
            <p className="text-slate-400 text-sm mt-2">Sign in to access your dashboard</p>
          </div>

          {/* Login Method Toggle */}
          <div className="flex bg-slate-950 rounded-xl p-1 mb-6">
            <button
              type="button"
              onClick={() => { setLoginMethod('password'); setError(null); }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                loginMethod === 'password'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Password
            </button>
            <button
              type="button"
              onClick={() => { setLoginMethod('otp'); setError(null); setOtpSent(false); setOtp(''); }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                loginMethod === 'otp'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              OTP Login
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                {loginMethod === 'password' ? 'Email / Employee ID' : 'Registered Email or Mobile'}
              </label>
              <div className="relative">
                <User className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={loginMethod === 'password' ? 'Enter email or employee ID' : 'Enter registered email or mobile'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            {loginMethod === 'password' ? (
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Password</label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-12 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                  {otpSent ? 'Enter OTP sent to your device' : 'Request OTP'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder={otpSent ? 'Enter 6-digit OTP' : 'Click Send OTP first'}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
                    disabled={!otpSent}
                    maxLength={6}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                  />
                  {!otpSent && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!username.trim()) { setError('Enter your email or mobile first'); return; }
                        handleLogin({ preventDefault: () => {} } as React.FormEvent);
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl whitespace-nowrap"
                    >
                      Send OTP
                    </button>
                  )}
                  {otpSent && (
                    <button
                      type="button"
                      onClick={() => { setOtpSent(false); setOtp(''); setError(null); }}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl whitespace-nowrap"
                    >
                      Resend
                    </button>
                  )}
                </div>
                {otpSent && (
                  <p className="text-xs text-slate-500 mt-2">OTP sent. Check your registered email or mobile.</p>
                )}
              </div>
            )}

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-xl text-sm text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {loginMethod === 'otp' && otpSent ? 'Verify OTP' : 'Sign In'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <a href="#" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
              Forgot Password? Contact IT Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
