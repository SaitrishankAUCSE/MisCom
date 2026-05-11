import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGlobal } from '../context/GlobalContext';
import Logo from '../components/Logo';
import Backend from '../lib/backend';
import FirebaseSync from '../lib/firebase';

export default function Signup() {
  const navigate = useNavigate();
  const { signup, signupWithGoogle } = useGlobal();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Track whether Google pre-filled the form
  const [isGooglePrefilled, setIsGooglePrefilled] = useState(false);
  const [emailLocked, setEmailLocked] = useState(false);

  // Real-time validation states
  const [usernameStatus, setUsernameStatus] = useState('idle');
  const [emailValid, setEmailValid] = useState(null);

  // Username availability check (debounced)
  useEffect(() => {
    if (username.length < 3) { setUsernameStatus('idle'); return; }
    setUsernameStatus('checking');
    const timer = setTimeout(() => {
      setUsernameStatus(Backend.auth.checkUsername(username));
    }, 400);
    return () => clearTimeout(timer);
  }, [username]);

  // Email validation
  useEffect(() => {
    if (!email) { setEmailValid(null); return; }
    const timer = setTimeout(async () => {
      // 1. Basic format check
      if (!Backend.V.isEmail(email)) {
        setEmailValid(false);
        return;
      }
      
      // 2. Local check
      const localTaken = !Backend.auth.checkEmail(email);
      if (localTaken) {
        setEmailValid(false);
        return;
      }

      // 3. Cloud check (if Firebase is ready)
      if (FirebaseSync.isReady()) {
        const cloudTaken = await FirebaseSync.checkEmailRegistered(email);
        if (cloudTaken) {
          setEmailValid(false);
          return;
        }
      }

      setEmailValid(true);
    }, 500);
    return () => clearTimeout(timer);
  }, [email]);

  // Password strength
  const strength = Backend.V.passwordStrength(password);
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'];

  // Password rules
  const rules = [
    { label: '8+ characters', met: password.length >= 8 },
    { label: 'Uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', met: /[a-z]/.test(password) },
    { label: 'Number', met: /[0-9]/.test(password) },
    { label: 'Special character', met: /[^A-Za-z0-9]/.test(password) },
  ];

  const passwordsMatch = confirm.length > 0 && password === confirm;
  const isFormValid = usernameStatus === 'available' && (emailValid === true || emailLocked) && strength >= 4 && passwordsMatch;

  // ── Email Signup: creates account directly (no OTP needed) ──
  const handleEmailSignup = async (e) => {
    e.preventDefault();
    if (!isFormValid || isGooglePrefilled) return;
    if (!name.trim()) { setError('Please enter your full name'); return; }
    setLoading(true);
    setError('');
    try {
      await signup(username, email, password);
      navigate('/setup');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // ── Google Signup: creates account directly (no OTP needed) ──
  const handleGoogleFinalize = async (e) => {
    e.preventDefault();
    if (!isFormValid || !isGooglePrefilled) return;
    if (!name.trim()) { setError('Please enter your full name'); return; }
    setLoading(true);
    setError('');
    try {
      await signupWithGoogle(username, email, password);
      navigate('/setup');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // ── Step 1 of Google Signup: Open popup, pre-fill form ──
  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const fbUser = await FirebaseSync.signInWithGoogle();
      if (!fbUser) {
        setGoogleLoading(false);
        return;
      }

      // Check if account already exists → tell them to log in
      const users = Backend.auth.getAllUsers ? Backend.auth.getAllUsers() : [];
      const existing = users.find(u => u.email === fbUser.email.toLowerCase());
      if (existing) {
        setError('Account already exists with this email. Please log in instead.');
        await FirebaseSync.signOutUser().catch(() => {});
        setGoogleLoading(false);
        return;
      }

      // Pre-fill the form with Google data
      setEmail(fbUser.email);
      setName(fbUser.displayName || '');
      setEmailLocked(true);
      setIsGooglePrefilled(true);
      const suggestedUsername = fbUser.email.split('@')[0].replace(/[^a-z0-9_]/g, '').slice(0, 20);
      setUsername(suggestedUsername);
      setSuccessMsg('Google verified! Now pick a username and confirm your details.');
      setGoogleLoading(false);

      // Scroll to password field
      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }, 200);
    } catch (err) {
      setError(err.message || 'Google Sign-Up failed');
      setGoogleLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="bg-background min-h-screen flex flex-col relative overflow-x-hidden overflow-y-auto px-6 py-10 font-body-md text-on-background">
      
      <div className="absolute top-0 left-0 w-[50vw] h-[50vw] bg-primary-container/8 rounded-full blur-[80px] -translate-y-1/3 -translate-x-1/4 z-0" />

      <div className="w-full max-w-md mx-auto z-10 flex flex-col flex-1">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate('/auth-choice')} className="p-2 -ml-2 rounded-full text-on-surface-variant hover:bg-surface-container-highest transition-colors">
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </button>
          <Logo className="w-8 h-8" showText={false} />
        </div>

        <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="font-display text-4xl font-bold tracking-tight mb-2">Create account</motion.h1>
        <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
          className="text-secondary text-base mb-8">
          {isGooglePrefilled ? 'Complete your profile to finish signup.' : 'Join MisCom — your space for connection.'}
        </motion.p>

        {/* Success Message */}
        <AnimatePresence>
          {successMsg && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-2xl mb-4 flex items-center gap-3">
              <span className="material-symbols-outlined text-lg">check_circle</span>
              <p className="text-sm font-label-bold">{successMsg}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-2xl mb-4 flex items-center gap-3">
              <span className="material-symbols-outlined text-lg">error</span>
              <p className="text-sm font-label-bold">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Google Signup Button — only show if form NOT pre-filled yet */}
        {!isGooglePrefilled && (
          <>
            <button type="button" onClick={handleGoogleAuth} disabled={loading || googleLoading}
              className="w-full bg-surface text-on-background border border-surface-variant rounded-[2rem] py-4 font-bold text-base shadow-sm hover:bg-surface-container-lowest flex items-center justify-center gap-3 transition-colors disabled:opacity-50 mb-6">
              {googleLoading ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="w-5 h-5 border-2 border-surface-variant border-t-primary-container rounded-full" />
              ) : (
                <>
                  <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                  Sign up with Google
                </>
              )}
            </button>

            <div className="flex items-center gap-4 mb-6">
              <div className="h-px flex-1 bg-surface-variant" />
              <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">Or sign up with email</span>
              <div className="h-px flex-1 bg-surface-variant" />
            </div>
          </>
        )}

        <form onSubmit={isGooglePrefilled ? handleGoogleFinalize : handleEmailSignup} className="flex flex-col gap-4">
          {/* Display Name */}
          <div>
            <label className="text-xs font-label-bold text-secondary ml-4 mb-1.5 block">Display Name</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-secondary text-xl">person</span>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="e.g. Alex ✨"
                className="w-full bg-transparent border-2 border-surface-variant rounded-[1.25rem] pl-12 pr-4 py-4 outline-none focus:border-primary-container transition-colors" />
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="text-xs font-label-bold text-secondary ml-4 mb-1.5 flex items-center gap-2">
              Username
              {usernameStatus === 'available' && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-green-500 text-[10px] font-bold bg-green-500/10 px-2 py-0.5 rounded-full">✓ Available</motion.span>}
              {usernameStatus === 'taken' && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-red-500 text-[10px] font-bold bg-red-500/10 px-2 py-0.5 rounded-full">✗ Username already exists</motion.span>}
              {usernameStatus === 'invalid' && <span className="text-red-500 text-[10px] bg-red-500/10 px-2 py-0.5 rounded-full">Invalid username</span>}
              {usernameStatus === 'checking' && <span className="text-secondary text-[10px]">Checking...</span>}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary text-lg font-bold">@</span>
              <input type="text" value={username} onChange={e => { setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').replace(/\s/g, '')); setError(''); }}
                placeholder="username" maxLength={20}
                className={`w-full bg-transparent border-2 rounded-[1.25rem] pl-10 pr-4 py-4 outline-none transition-colors ${
                  usernameStatus === 'available' ? 'border-green-400 focus:border-green-500' :
                  usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'border-red-400' :
                  'border-surface-variant focus:border-primary-container'
                }`} />
            </div>
            <p className="text-[10px] text-secondary ml-4 mt-1">3–20 characters. Lowercase letters, numbers, underscore only. No spaces.</p>
            {/* Username suggestions when taken */}
            {usernameStatus === 'taken' && username.length >= 3 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="ml-4 mt-2">
                <p className="text-[11px] text-secondary mb-1.5">Try one of these instead:</p>
                <div className="flex flex-wrap gap-2">
                  {[`${username}_`, `${username}${Math.floor(Math.random()*99)}`, `the_${username}`, `${username}.official`].filter(s => s.length <= 20).slice(0, 3).map(suggestion => (
                    <button key={suggestion} type="button" onClick={() => setUsername(suggestion.replace(/[^a-z0-9_]/g, ''))}
                      className="text-[11px] text-primary-container bg-primary-container/10 px-3 py-1 rounded-full hover:bg-primary-container/20 transition-colors font-label-bold">
                      @{suggestion.replace(/[^a-z0-9_]/g, '')}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="text-xs font-label-bold text-secondary ml-4 mb-1.5 flex items-center gap-2">
              Email
              {emailValid === true && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-green-500 text-[10px] font-bold bg-green-500/10 px-2 py-0.5 rounded-full">✓ Available</motion.span>}
              {emailValid === false && email.length > 3 && !Backend.V.isEmail(email) && <span className="text-red-500 text-[10px] bg-red-500/10 px-2 py-0.5 rounded-full">Invalid email format</span>}
              {emailValid === false && email.length > 3 && Backend.V.isEmail(email) && <span className="text-red-500 text-[10px] bg-red-500/10 px-2 py-0.5 rounded-full">Email already registered</span>}
              {emailLocked && <span className="text-blue-500 text-[10px] bg-blue-500/10 px-2 py-0.5 rounded-full">🔒 Verified by Google</span>}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-secondary text-xl">mail</span>
              <input type="email" value={email} onChange={e => { if (!emailLocked) { setEmail(e.target.value); setError(''); } }}
                placeholder="email@domain.com" readOnly={emailLocked}
                className={`w-full bg-transparent border-2 rounded-[1.25rem] pl-12 pr-4 py-4 outline-none transition-colors ${
                  emailLocked ? 'border-blue-300 bg-blue-500/5 cursor-not-allowed' :
                  emailValid === true ? 'border-green-400' : emailValid === false && email.length > 3 ? 'border-red-400' : 'border-surface-variant focus:border-primary-container'
                }`} />
            </div>
          </div>

          {/* Password */}
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
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2 ml-4">
                <div className="flex gap-1 mb-1">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${strength >= i ? strengthColors[i] : 'bg-surface-variant'}`} />
                  ))}
                </div>
                <p className={`text-[10px] font-label-bold ${strength >= 4 ? 'text-green-500' : strength >= 3 ? 'text-yellow-500' : 'text-red-400'}`}>
                  {strengthLabels[strength] || 'Too weak'}
                </p>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                  {rules.map(r => (
                    <span key={r.label} className={`text-[10px] flex items-center gap-0.5 ${r.met ? 'text-green-500' : 'text-secondary'}`}>
                      <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>{r.met ? 'check_circle' : 'radio_button_unchecked'}</span>
                      {r.label}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="text-xs font-label-bold text-secondary ml-4 mb-1.5 flex items-center gap-2">
              Confirm Password
              {confirm && (passwordsMatch
                ? <span className="text-green-500 text-[10px] bg-green-500/10 px-2 py-0.5 rounded-full">✓ Match</span>
                : <span className="text-red-500 text-[10px] bg-red-500/10 px-2 py-0.5 rounded-full">✗ Doesn't match</span>
              )}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-secondary text-xl">lock</span>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="Re-enter password"
                className={`w-full bg-transparent border-2 rounded-[1.25rem] pl-12 pr-4 py-4 outline-none transition-colors ${
                  confirm && (passwordsMatch ? 'border-green-400' : 'border-red-400')
                } ${!confirm ? 'border-surface-variant focus:border-primary-container' : ''}`} />
            </div>
          </div>

          <motion.button whileTap={{ scale: 0.97 }} disabled={loading || !isFormValid}
            className="w-full bg-primary-container text-white rounded-[2rem] py-4 mt-2 font-bold text-lg shadow-[0_8px_20px_rgba(225,29,72,0.3)] transition-all flex items-center justify-center gap-2 relative overflow-hidden group disabled:opacity-40">
            {loading ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full" />
            ) : (
              <>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                {isGooglePrefilled ? 'Create Account & Continue' : 'Create Account'}
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </>
            )}
          </motion.button>
        </form>

        <p className="mt-auto pt-8 text-center text-secondary text-sm font-label-bold">
          Already have an account?{' '}
          <button onClick={() => navigate('/login')} className="text-primary-container hover:underline font-bold">Log in</button>
        </p>
      </div>
    </motion.div>
  );
}
