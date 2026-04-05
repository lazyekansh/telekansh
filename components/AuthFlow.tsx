'use client';

import { useState } from 'react';
import { useTelegramStore } from '@/store/useTelegramStore';

export default function AuthFlow() {
  const {
    authStep, phone, phoneCodeHash, session,
    loadingAuth, error,
    setPhone, setPhoneCodeHash, setSession,
    setAuthStep, setUser, setError, setLoadingAuth,
  } = useTelegramStore();

  const [phoneInput, setPhoneInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSendCode = async () => {
    setError('');
    setLoadingAuth(true);
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneInput }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPhone(phoneInput);
      setPhoneCodeHash(data.phoneCodeHash);
      setSession(data.sessionString);
      setAuthStep('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to send code');
    } finally {
      setLoadingAuth(false);
    }
  };

  const handleSignIn = async () => {
    setError('');
    setLoadingAuth(true);
    try {
      const res = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session,
          phone,
          phoneCodeHash,
          code: codeInput,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.needs2FA) {
        setSession(data.sessionString);
        setAuthStep('password');
        return;
      }
      setSession(data.sessionString);
      setUser(data.user);
      setAuthStep('done');
    } catch (err: any) {
      setError(err.message || 'Sign in failed');
    } finally {
      setLoadingAuth(false);
    }
  };

  const handleCheckPassword = async () => {
    setError('');
    setLoadingAuth(true);
    try {
      const res = await fetch('/api/auth/check-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session, password: passwordInput }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSession(data.sessionString);
      setUser(data.user);
      setAuthStep('done');
    } catch (err: any) {
      setError(err.message || 'Password check failed');
    } finally {
      setLoadingAuth(false);
    }
  };

  const steps: { key: string; label: string }[] = [
    { key: 'phone', label: 'Phone' },
    { key: 'otp', label: 'Code' },
    { key: 'password', label: '2FA' },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === authStep);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0e1621] via-[#17212b] to-[#1a2836] px-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-tg-accent to-[#3a6fa0] mb-4 shadow-lg shadow-tg-accent/20">
            <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.665 3.717l-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.787l3.019-14.228c.309-1.239-.473-1.8-1.282-1.432z"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Telekansh</h1>
          <p className="text-tg-tx2 mt-2 text-sm">Sign in to your Telegram account</p>
        </div>

        {/* Card */}
        <div className="bg-tg-sidebar/80 backdrop-blur-xl border border-tg-border/50 rounded-2xl p-8 shadow-2xl">
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-3 mb-8">
            {steps.map((step, i) => (
              <div key={step.key} className="flex items-center gap-3">
                <div className={`
                  flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold transition-all duration-300
                  ${i < currentStepIndex ? 'bg-tg-accent text-white' : ''}
                  ${i === currentStepIndex ? 'bg-tg-accent text-white ring-4 ring-tg-accent/20 scale-110' : ''}
                  ${i > currentStepIndex ? 'bg-tg-panel text-tg-tx2' : ''}
                `}>
                  {i < currentStepIndex ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-12 h-0.5 transition-colors duration-300 ${i < currentStepIndex ? 'bg-tg-accent' : 'bg-tg-panel'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Phone step */}
          {authStep === 'phone' && (
            <div className="animate-fade-in">
              <label className="block text-sm font-medium text-tg-tx2 mb-2">Phone Number</label>
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !loadingAuth && handleSendCode()}
                placeholder="+1 234 567 8900"
                className="w-full px-4 py-3 bg-tg-panel border border-tg-border rounded-xl text-white placeholder-tg-tx2/50 focus:outline-none focus:ring-2 focus:ring-tg-accent/50 focus:border-tg-accent transition-all"
                autoFocus
                id="phone-input"
              />
              <p className="text-xs text-tg-tx2 mt-2">Include your country code (e.g., +91 for India)</p>
              <button
                onClick={handleSendCode}
                disabled={loadingAuth || !phoneInput.trim()}
                className="w-full mt-6 py-3 px-4 bg-tg-accent hover:bg-tg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-tg-accent/20"
                id="send-code-btn"
              >
                {loadingAuth ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Send Code
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          )}

          {/* OTP step */}
          {authStep === 'otp' && (
            <div className="animate-fade-in">
              <label className="block text-sm font-medium text-tg-tx2 mb-2">Verification Code</label>
              <input
                type="text"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={(e) => e.key === 'Enter' && !loadingAuth && handleSignIn()}
                placeholder="12345"
                maxLength={6}
                className="w-full px-4 py-3 bg-tg-panel border border-tg-border rounded-xl text-white text-center text-2xl tracking-[0.5em] placeholder-tg-tx2/50 focus:outline-none focus:ring-2 focus:ring-tg-accent/50 focus:border-tg-accent transition-all font-mono"
                autoFocus
                id="otp-input"
              />
              <p className="text-xs text-tg-tx2 mt-2">
                Code sent to <span className="text-tg-accent font-medium">{phone}</span>
              </p>
              <button
                onClick={handleSignIn}
                disabled={loadingAuth || !codeInput.trim()}
                className="w-full mt-6 py-3 px-4 bg-tg-accent hover:bg-tg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-tg-accent/20"
                id="sign-in-btn"
              >
                {loadingAuth ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Verify
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          )}

          {/* 2FA Password step */}
          {authStep === 'password' && (
            <div className="animate-fade-in">
              <label className="block text-sm font-medium text-tg-tx2 mb-2">Two-Factor Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !loadingAuth && handleCheckPassword()}
                  placeholder="Enter your 2FA password"
                  className="w-full px-4 py-3 pr-12 bg-tg-panel border border-tg-border rounded-xl text-white placeholder-tg-tx2/50 focus:outline-none focus:ring-2 focus:ring-tg-accent/50 focus:border-tg-accent transition-all"
                  autoFocus
                  id="password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-tg-tx2 hover:text-tg-tx transition-colors"
                  id="toggle-password-btn"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-xs text-tg-tx2 mt-2">Your account has two-factor authentication enabled</p>
              <button
                onClick={handleCheckPassword}
                disabled={loadingAuth || !passwordInput.trim()}
                className="w-full mt-6 py-3 px-4 bg-tg-accent hover:bg-tg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-tg-accent/20"
                id="check-password-btn"
              >
                {loadingAuth ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Submit
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm animate-fade-in" id="error-display">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-tg-tx2/50 mt-6">
          Get API credentials at{' '}
          <a href="https://my.telegram.org" target="_blank" rel="noopener noreferrer" className="text-tg-accent/70 hover:text-tg-accent transition-colors underline">
            my.telegram.org
          </a>
        </p>
      </div>
    </div>
  );
}
