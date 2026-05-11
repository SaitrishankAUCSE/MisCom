import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Logo from '../components/Logo';
import { useGlobal } from '../context/GlobalContext';

export default function AuthChoice() {
  const navigate = useNavigate();
  const { loginWithGoogle } = useGlobal();

  const handleGoogleAuth = async () => {
    try {
      await loginWithGoogle();
      navigate('/home');
    } catch (err) {
      console.error('Google Auth Error:', err);
      // If no account exists, we should probably send them to signup
      if (err.message.includes('No account exists') || err.message.includes('No Google session')) {
        navigate('/signup?method=google');
      }
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="bg-background min-h-screen flex flex-col items-center justify-between relative overflow-hidden font-body-md text-on-background px-6 py-10">
      
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-primary-fixed/30 blur-[100px] z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-tertiary-fixed/20 blur-[120px] z-0" />

      <div className="w-full flex justify-center items-center z-10 pt-4">
        <Logo className="w-12 h-12" showText={false} />
      </div>

      <div className="w-full max-w-md mx-auto flex-1 flex flex-col items-center justify-center z-10 my-10">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
          className="relative w-48 h-48 mb-12 flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-tr from-primary-container/20 to-transparent rounded-full blur-2xl" />
          <motion.div animate={{ y: [-5, 5, -5] }} transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
            className="w-32 h-32 bg-surface/80 backdrop-blur-xl rounded-[2rem] border border-surface-variant/20 shadow-[0_20px_40px_-15px_rgba(225,29,72,0.3)] flex flex-col items-center justify-center z-10">
            <Logo className="w-16 h-16" showText={false} />
          </motion.div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="text-center mb-10 w-full">
          <h1 className="font-display text-4xl font-bold tracking-tight mb-3">Welcome</h1>
          <p className="text-secondary text-base max-w-[280px] mx-auto">Sign in to your account or create a new one to get started.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="w-full flex flex-col gap-4">
          <button type="button" onClick={() => navigate('/login')}
            className="relative w-full bg-primary-container text-white rounded-[2rem] py-5 font-bold text-lg shadow-[0_10px_30px_rgba(225,29,72,0.4)] hover:shadow-[0_10px_40px_rgba(225,29,72,0.6)] hover:scale-[1.02] transition-all duration-300 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            Log In
          </button>

          <button type="button" onClick={() => navigate('/signup')}
            className="w-full bg-surface text-on-background border-2 border-surface-variant rounded-[2rem] py-5 font-bold text-lg shadow-sm hover:border-primary-container hover:text-primary-container hover:scale-[1.02] transition-all duration-300">
            Create Account
          </button>

          <div className="flex items-center gap-4 my-2">
            <div className="h-px flex-1 bg-surface-variant" />
            <span className="text-xs font-bold text-secondary uppercase tracking-widest">Or</span>
            <div className="h-px flex-1 bg-surface-variant" />
          </div>

          <button type="button" onClick={handleGoogleAuth}
            className="w-full bg-surface text-on-background border border-surface-variant rounded-[2rem] py-4 font-bold text-base shadow-sm hover:bg-surface-container-lowest flex items-center justify-center gap-3 transition-colors">
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
            Continue with Google
          </button>
        </motion.div>
      </div>

      <p className="text-center text-xs text-secondary z-10 max-w-xs">
        By continuing, you agree to MisCom's <span className="underline cursor-pointer">Terms of Service</span> and <span className="underline cursor-pointer">Privacy Policy</span>.
      </p>
    </motion.div>
  );
}
