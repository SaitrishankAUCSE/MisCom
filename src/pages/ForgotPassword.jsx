import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Backend from '../lib/backend';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Step 1: Identifier
  const [identifier, setIdentifier] = useState('');
  const [resetEmail, setResetEmail] = useState('');

  // Step 2: OTP
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(120);

  // Step 3: New Password
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    let timer;
    if (step === 2 && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [step, timeLeft]);

  // Handle Step 1
  const handleRequestReset = async (e) => {
    e.preventDefault();
    if (identifier.length < 3) return;
    setLoading(true);
    setError('');
    try {
      const res = await Backend.auth.requestPasswordReset(identifier);
      setResetEmail(res.email);
      setStep(2);
      setTimeLeft(120);
      setOtp(['', '', '', '', '', '']);
    } catch (err) {
      setError(err.message || 'Account not found');
    } finally {
      setLoading(false);
    }
  };

  // Handle Step 2 (OTP)
  const handleOtpChange = (index, value) => {
    if (value.length > 1) value = value[value.length - 1]; // only last char
    if (!/^\d*$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    // Auto-advance
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').slice(0, 6).replace(/\D/g, '');
    if (pasteData) {
      const newOtp = [...otp];
      pasteData.split('').forEach((char, i) => {
        if (i < 6) newOtp[i] = char;
      });
      setOtp(newOtp);
      const focusIndex = Math.min(pasteData.length, 5);
      const input = document.getElementById(`otp-${focusIndex}`);
      if (input) input.focus();
    }
  };

  const verifyOtp = async () => {
    const code = otp.join('');
    if (code.length !== 6) return;
    setLoading(true);
    setError('');
    try {
      await Backend.auth.verifyResetOtp(code);
      setStep(3);
    } catch (err) {
      setError(err.message || 'Invalid OTP');
      // Shake animation effect by briefly setting then clearing a class
      const otpContainer = document.getElementById('otp-container');
      if (otpContainer) {
        otpContainer.classList.add('animate-shake');
        setTimeout(() => otpContainer.classList.remove('animate-shake'), 500);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (step === 2 && otp.join('').length === 6) {
      verifyOtp();
    }
  }, [otp]);

  const handleResend = async () => {
    if (timeLeft > 90) return; // Prevent spam
    setLoading(true);
    try {
      await Backend.auth.requestPasswordReset(identifier);
      setTimeLeft(120);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to resend');
    } finally {
      setLoading(false);
    }
  };

  // Handle Step 3 (New Password)
  const strength = Backend.V.passwordStrength(password);
  const rules = [
    { label: '8+ characters', met: password.length >= 8 },
    { label: 'Uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', met: /[a-z]/.test(password) },
    { label: 'Number', met: /[0-9]/.test(password) },
    { label: 'Special character', met: /[^A-Za-z0-9]/.test(password) },
  ];
  const passwordsMatch = confirm.length > 0 && password === confirm;
  const isPasswordValid = strength >= 4 && passwordsMatch;

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!isPasswordValid) return;
    setLoading(true);
    setError('');
    try {
      await Backend.auth.resetPassword(password);
      setStep(4);
    } catch (err) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="bg-white min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-6 py-10 font-body-md text-on-background">
      
      {/* Background Orbs */}
      <div className="absolute top-0 right-0 w-[40vw] h-[40vw] bg-primary-container/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 z-0" />
      <div className="absolute bottom-0 left-0 w-[40vw] h-[40vw] bg-purple-500/10 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4 z-0" />

      <div className="w-full max-w-md mx-auto z-10 flex flex-col flex-1 relative">
        {step < 4 && (
          <button onClick={() => { if (step > 1) setStep(step - 1); else navigate('/login'); }} 
            className="self-start mb-8 p-2 -ml-2 rounded-full text-on-surface-variant hover:bg-surface-container-highest transition-colors">
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </button>
        )}

        <AnimatePresence mode="wait">
          {/* STEP 1: Enter Identifier */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col flex-1">
              <div className="w-16 h-16 bg-primary-container/10 rounded-2xl flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-primary-container text-3xl">lock_reset</span>
              </div>
              <h1 className="font-display text-4xl font-bold tracking-tight mb-3">Forgot Password?</h1>
              <p className="text-secondary text-base mb-10">No worries! Enter your username or email and we'll send you recovery instructions.</p>

              {error && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-2xl mb-6 flex items-center gap-3">
                  <span className="material-symbols-outlined text-lg">error</span>
                  <p className="text-sm font-label-bold">{error}</p>
                </motion.div>
              )}

              <form onSubmit={handleRequestReset} className="flex flex-col gap-6">
                <div>
                  <label className="text-xs font-label-bold text-secondary ml-4 mb-1.5 block">Username or Email</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-secondary text-xl">person</span>
                    <input type="text" value={identifier} onChange={e => { setIdentifier(e.target.value); setError(''); }}
                      placeholder="Enter details"
                      className="w-full bg-transparent border-2 border-surface-variant rounded-[1.25rem] pl-12 pr-4 py-4 outline-none focus:border-primary-container transition-colors" />
                  </div>
                </div>

                <motion.button whileTap={{ scale: 0.97 }} disabled={loading || identifier.length < 3}
                  className="w-full bg-primary-container text-white rounded-[2rem] py-4 font-bold text-lg shadow-[0_8px_20px_rgba(225,29,72,0.3)] transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50">
                  {loading ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full" />
                  ) : 'Send Recovery Code'}
                </motion.button>
              </form>
            </motion.div>
          )}

          {/* STEP 2: Verify OTP */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col flex-1 items-center">
              <div className="w-16 h-16 bg-primary-container/10 rounded-2xl flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-primary-container text-3xl">mark_email_read</span>
              </div>
              <h1 className="font-display text-3xl font-bold mb-2">Check your email</h1>
              <p className="text-secondary text-base mb-8 text-center max-w-[280px]">
                We sent a 6-digit code to <span className="font-bold text-on-background">{resetEmail}</span>
              </p>

              {error && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-2xl mb-6 flex items-center gap-3 w-full">
                  <span className="material-symbols-outlined text-lg">error</span>
                  <p className="text-sm font-label-bold">{error}</p>
                </motion.div>
              )}

              <div className="mb-4">
                {timeLeft > 0 ? (
                  <span className="text-sm text-secondary">Expires in <span className="text-primary-container font-bold">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span></span>
                ) : (
                  <span className="text-sm text-error font-label-bold">Code expired</span>
                )}
              </div>

              <div id="otp-container" className="flex gap-2 sm:gap-3 mb-8 w-full justify-center transition-transform duration-100" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input key={i} id={`otp-${i}`} type="text" inputMode="numeric" pattern="\d*" maxLength={1}
                    value={digit} onChange={e => handleOtpChange(i, e.target.value)} onKeyDown={e => handleOtpKeyDown(i, e)}
                    disabled={loading || timeLeft === 0}
                    className={`w-12 h-14 sm:w-14 sm:h-16 border-2 rounded-xl sm:rounded-2xl text-center text-xl sm:text-2xl font-bold outline-none transition-all ${
                      error ? 'border-error bg-error/5 text-error' : digit ? 'border-primary-container bg-primary-container/5 text-primary-container' : 'border-surface-variant bg-transparent focus:border-primary-container text-on-background'
                    }`} />
                ))}
              </div>

              <motion.button onClick={verifyOtp} whileTap={{ scale: 0.97 }} disabled={loading || otp.join('').length !== 6 || timeLeft === 0}
                className="w-full bg-primary-container text-white rounded-[2rem] py-4 font-bold text-lg shadow-[0_8px_20px_rgba(225,29,72,0.3)] transition-all flex items-center justify-center gap-2 mb-6 disabled:opacity-50">
                {loading ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full" />
                ) : 'Verify Code'}
              </motion.button>

              <button onClick={handleResend} disabled={timeLeft > 90 || loading}
                className={`text-sm font-label-bold transition-colors ${timeLeft > 90 ? 'text-secondary opacity-50 cursor-not-allowed' : 'text-primary-container hover:underline'}`}>
                Resend Code
              </button>
            </motion.div>
          )}

          {/* STEP 3: Create New Password */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col flex-1">
              <div className="w-16 h-16 bg-primary-container/10 rounded-2xl flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-primary-container text-3xl">key</span>
              </div>
              <h1 className="font-display text-4xl font-bold tracking-tight mb-3">New Password</h1>
              <p className="text-secondary text-base mb-8">Your new password must be different from previous used passwords.</p>

              {error && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-2xl mb-6 flex items-center gap-3">
                  <span className="material-symbols-outlined text-lg">error</span>
                  <p className="text-sm font-label-bold">{error}</p>
                </motion.div>
              )}

              <form onSubmit={handleResetPassword} className="flex flex-col gap-6">
                <div>
                  <label className="text-xs font-label-bold text-secondary ml-4 mb-1.5 block">Password</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-secondary text-xl">lock</span>
                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => { setPassword(e.target.value); setError(''); }}
                      placeholder="Min 8 characters"
                      className="w-full bg-transparent border-2 border-surface-variant rounded-[1.25rem] pl-12 pr-14 py-4 outline-none focus:border-primary-container transition-colors" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary hover:text-on-background">
                      <span className="material-symbols-outlined text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                  {/* Strength Meter */}
                  {password && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3 ml-4">
                      <div className="flex gap-1 mb-2">
                        {[1, 2, 3, 4].map(i => (
                          <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${strength >= i ? ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'][strength - 1] : 'bg-surface-variant'}`} />
                        ))}
                      </div>
                      <div className="flex flex-col gap-1">
                        {rules.map(r => (
                          <span key={r.label} className={`text-xs flex items-center gap-1.5 ${r.met ? 'text-green-500' : 'text-secondary'}`}>
                            <span className="material-symbols-outlined text-[14px]">{r.met ? 'check_circle' : 'radio_button_unchecked'}</span>
                            {r.label}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-label-bold text-secondary ml-4 mb-1.5 flex items-center gap-2">
                    Confirm Password
                    {confirm && (passwordsMatch ? <span className="text-green-500 text-[10px] bg-green-50 px-2 py-0.5 rounded-full">✓ Match</span> : <span className="text-error text-[10px] bg-error/10 px-2 py-0.5 rounded-full">✗ Doesn't match</span>)}
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-secondary text-xl">lock</span>
                    <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                      placeholder="Re-enter password"
                      className={`w-full bg-transparent border-2 rounded-[1.25rem] pl-12 pr-4 py-4 outline-none transition-colors ${
                        confirm && (passwordsMatch ? 'border-green-400' : 'border-error')
                      } ${!confirm ? 'border-surface-variant focus:border-primary-container' : ''}`} />
                  </div>
                </div>

                <motion.button whileTap={{ scale: 0.97 }} disabled={loading || !isPasswordValid}
                  className="w-full bg-primary-container text-white rounded-[2rem] py-4 mt-2 font-bold text-lg shadow-[0_8px_20px_rgba(225,29,72,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full" />
                  ) : 'Reset Password'}
                </motion.button>
              </form>
            </motion.div>
          )}

          {/* STEP 4: Success */}
          {step === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col flex-1 items-center justify-center text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(34,197,94,0.3)]">
                <span className="material-symbols-outlined text-white text-5xl">check_circle</span>
              </motion.div>
              <h1 className="font-display text-4xl font-bold tracking-tight mb-4">Password Updated!</h1>
              <p className="text-secondary text-base mb-10 max-w-[280px]">Your password has been successfully reset. You can now log in securely.</p>
              
              <motion.button onClick={() => navigate('/login')} whileTap={{ scale: 0.97 }}
                className="w-full max-w-[240px] bg-on-background text-white rounded-[2rem] py-4 font-bold text-lg shadow-xl transition-all">
                Return to Log in
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          50% { transform: translateX(5px); }
          75% { transform: translateX(-5px); }
        }
        .animate-shake { animation: shake 0.4s ease-in-out; }
      `}} />
    </motion.div>
  );
}
