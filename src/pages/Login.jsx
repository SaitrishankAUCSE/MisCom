import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGlobal } from '../context/GlobalContext';
import Logo from '../components/Logo';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, loginWithGoogle } = useGlobal();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [forgotToast, setForgotToast] = useState(false);

  // Auto-detect if identifier is email or username
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
  const identifierType = !identifier ? '' : isEmail ? 'email' : 'username';
  const isFormValid = identifier.length >= 3 && password.length >= 6;

  // ── Email/Username Login ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;
    setLoading(true);
    setError('');
    try {
      await login(identifier, password);
      navigate('/home');
    } catch (err) {
      setError(err.message || 'Invalid username or password');
      setLoading(false);
    }
  };

  // ── Google Login (existing users only) ──
  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      // preventCreation = true: only allow login for existing accounts
      await loginWithGoogle(false);
      navigate('/home');
    } catch (err) {
      setError(err.message || 'Google Sign-In failed');
      setGoogleLoading(false);
    }
  };

  const handleForgotPassword = () => {
    navigate('/forgot-password');
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="bg-white min-h-screen flex flex-col items-center justify-center relative overflow-x-hidden overflow-y-auto px-6 py-10 font-body-md text-on-background">
      
      {/* Toast */}
      <AnimatePresence>
        {forgotToast && (
          <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 z-[60] bg-on-background text-white px-6 py-3 rounded-full font-label-bold text-sm shadow-2xl">
            Password reset link sent! 📧
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute top-0 right-0 w-[40vw] h-[40vw] bg-primary-container/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 z-0" />

      <div className="w-full max-w-md mx-auto z-10 flex flex-col flex-1">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/auth-choice')} className="p-2 -ml-2 rounded-full text-on-surface-variant hover:bg-surface-container-highest transition-colors">
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </button>
          <Logo className="w-8 h-8" showText={false} />
        </div>

        <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
          className="font-display text-4xl font-bold tracking-tight mb-2">Welcome back</motion.h1>
        <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
          className="text-secondary text-base mb-10">Sign in with your username, email, or Google</motion.p>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-2xl mb-6 flex items-center gap-3">
              <span className="material-symbols-outlined text-lg">error</span>
              <p className="text-sm font-label-bold">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Google Login Button */}
        <button onClick={handleGoogle} disabled={loading || googleLoading}
          className="w-full bg-white border border-surface-variant rounded-[2rem] py-4 font-bold text-base shadow-sm hover:bg-surface-container-lowest flex items-center justify-center gap-3 transition-colors disabled:opacity-50 mb-6">
          {googleLoading ? (
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="w-5 h-5 border-2 border-surface-variant border-t-primary-container rounded-full" />
          ) : (
            <>
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
              Continue with Google
            </>
          )}
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="h-px flex-1 bg-surface-variant" />
          <span className="text-xs font-bold text-secondary uppercase tracking-widest">Or</span>
          <div className="h-px flex-1 bg-surface-variant" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Identifier */}
          <div>
            <label className="text-xs font-label-bold text-secondary ml-4 mb-1.5 flex items-center gap-2">
              Username or Email
              {identifierType && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className={`text-[10px] px-2 py-0.5 rounded-full ${isEmail ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                  {isEmail ? '📧 Email' : '👤 Username'}
                </motion.span>
              )}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-secondary text-xl">
                {isEmail ? 'mail' : 'person'}
              </span>
              <input type="text" value={identifier} onChange={e => { setIdentifier(e.target.value); setError(''); }}
                placeholder="username or email@domain.com"
                className="w-full bg-transparent border-2 border-surface-variant rounded-[1.25rem] pl-12 pr-4 py-4 outline-none focus:border-primary-container transition-colors" />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-xs font-label-bold text-secondary ml-4 mb-1.5 block">Password</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-secondary text-xl">lock</span>
              <input type={showPassword ? 'text' : 'password'} value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="Enter your password"
                className="w-full bg-transparent border-2 border-surface-variant rounded-[1.25rem] pl-12 pr-14 py-4 outline-none focus:border-primary-container transition-colors" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary hover:text-on-background transition-colors">
                <span className="material-symbols-outlined text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button type="button" onClick={handleForgotPassword} className="text-sm font-label-bold text-primary-container hover:underline">
              Forgot Password?
            </button>
          </div>

          <motion.button whileTap={{ scale: 0.97 }} disabled={loading || !isFormValid}
            className="w-full bg-primary-container text-white rounded-[2rem] py-4 font-bold text-lg shadow-[0_8px_20px_rgba(225,29,72,0.3)] transition-all flex items-center justify-center gap-2 relative overflow-hidden group disabled:opacity-50">
            {loading ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full" />
            ) : (
              <>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                Sign In <span className="material-symbols-outlined text-[20px]">login</span>
              </>
            )}
          </motion.button>
        </form>

        <p className="mt-auto pt-10 text-center text-secondary text-sm font-label-bold">
          Don't have an account?{' '}
          <button onClick={() => navigate('/signup')} className="text-primary-container hover:underline font-bold">Sign up</button>
        </p>
      </div>
    </motion.div>
  );
}
