import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGlobal } from '../context/GlobalContext';

export default function OTPVerification() {
  const navigate = useNavigate();
  const { verifyOtp, resendOtp, pendingEmail } = useGlobal();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRefs = useRef([]);
  const [timeLeft, setTimeLeft] = useState(120);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (timeLeft > 0) {
      const t = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [timeLeft]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const t = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendCooldown]);

  const handleChange = (e, index) => {
    const val = e.target.value.replace(/\D/g, '');
    if (!val && !e.target.value) return;
    const next = [...otp];
    next[index] = val.slice(-1);
    setOtp(next);
    if (val && index < 5) { setActiveIndex(index + 1); inputRefs.current[index + 1]?.focus(); }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      setActiveIndex(index - 1);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length === 6) {
      setOtp(text.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 6) { setError('Please enter all 6 digits'); return; }
    setLoading(true);
    setError('');
    try {
      await verifyOtp(code);
      setSuccess(true);
      setTimeout(() => navigate('/profile-setup'), 1500);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      setOtp(['', '', '', '', '', '']);
      setActiveIndex(0);
      inputRefs.current[0]?.focus();
    }
  };

  const handleResend = () => {
    if (resendCooldown > 0) return;
    const newOtp = resendOtp();
    if (newOtp) {
      setTimeLeft(120);
      setResendCooldown(30);
      setError('');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  // Auto-submit on complete
  useEffect(() => {
    if (otp.every(d => d !== '') && !loading && !success) handleVerify();
  }, [otp]);

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="bg-background min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-6 py-10 font-body-md text-on-background">
      <div className="absolute top-[10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-primary-fixed/20 blur-[100px]" />

      <div className="w-full max-w-md mx-auto z-10 flex flex-col items-center text-center">
        <button onClick={() => navigate('/signup')} className="self-start mb-8 p-2 -ml-2 rounded-full text-on-surface-variant hover:bg-surface-container-highest transition-colors">
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </button>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
          className="w-20 h-20 bg-primary-container/10 rounded-full flex items-center justify-center mb-6 border border-primary-container/30 shadow-[0_0_30px_rgba(225,29,72,0.15)]">
          <span className="material-symbols-outlined text-primary-container text-4xl">mark_email_read</span>
        </motion.div>

        <h1 className="font-display text-3xl font-bold mb-2">Verify your email</h1>
        <p className="text-secondary text-base mb-8 max-w-[280px]">
          Enter the 6-digit code sent to <span className="font-bold text-on-background">{pendingEmail || 'your email'}</span>
        </p>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-xl mb-6 flex items-center gap-2 w-full">
              <span className="material-symbols-outlined text-sm">error</span>
              <p className="text-sm font-label-bold">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Timer */}
        <div className="mb-4">
          {timeLeft > 0 ? (
            <span className="text-sm text-secondary">Code expires in <span className="text-primary-container font-bold">{formatTime(timeLeft)}</span></span>
          ) : (
            <span className="text-sm text-error font-label-bold">Code expired — request a new one</span>
          )}
        </div>

        {/* OTP Inputs */}
        <div className="flex gap-3 mb-8 w-full justify-center" onPaste={handlePaste}>
          {otp.map((digit, i) => (
            <motion.input key={i} ref={el => inputRefs.current[i] = el}
              type="text" inputMode="numeric" maxLength={1} value={digit}
              onChange={e => handleChange(e, i)} onKeyDown={e => handleKeyDown(e, i)}
              onFocus={() => setActiveIndex(i)}
              animate={{
                scale: activeIndex === i ? 1.05 : 1,
                borderColor: success ? '#10B981' : error ? '#ef4444' : activeIndex === i || digit ? '#e11d48' : '#e5e5e5'
              }}
              className={`w-12 h-16 sm:w-14 sm:h-16 text-center text-2xl font-display font-bold rounded-2xl border-2 outline-none transition-shadow ${
                success ? 'bg-green-50 text-green-600' : error ? 'bg-red-50/30' : 'bg-transparent focus:shadow-[0_0_15px_rgba(225,29,72,0.2)]'
              }`}
            />
          ))}
        </div>

        {success ? (
          <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white shadow-[0_0_30px_rgba(16,185,129,0.5)]">
            <span className="material-symbols-outlined text-3xl">check</span>
          </motion.div>
        ) : (
          <button onClick={handleVerify} disabled={loading || otp.join('').length < 6 || timeLeft <= 0}
            className="w-full bg-primary-container text-white rounded-[2rem] py-4 font-bold text-lg shadow-[0_8px_20px_rgba(225,29,72,0.3)] flex items-center justify-center h-[60px] disabled:opacity-50 transition-all">
            {loading ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full" />
            ) : "Verify"}
          </button>
        )}

        <div className="mt-8 text-sm font-label-bold">
          {resendCooldown > 0 ? (
            <span className="text-secondary">Resend in <span className="text-primary-container">{resendCooldown}s</span></span>
          ) : (
            <button onClick={handleResend} className="text-primary-container hover:underline font-bold">Resend Code</button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
