import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGlobal } from '../context/GlobalContext';
import Logo from '../components/Logo';

export default function Splash() {
  const navigate = useNavigate();
  const { isAuthenticated, isAuthLoading } = useGlobal();

  useEffect(() => {
    if (isAuthLoading) return; // Wait until auth state is known

    const timer = setTimeout(() => {
      const hasOnboarded = localStorage.getItem('miscom_onboarded');
      
      if (isAuthenticated) {
        navigate('/home');
      } else if (hasOnboarded) {
        navigate('/auth-choice');
      } else {
        navigate('/onboarding-1');
      }
    }, 2800);
    return () => clearTimeout(timer);
  }, [navigate, isAuthenticated, isAuthLoading]);

  return (
    <div className="bg-primary-container h-screen w-screen overflow-hidden flex flex-col items-center justify-center relative">
      {/* Background Particles Layer */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.8) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Main Content Canvas */}
      <main className="relative z-10 flex flex-col items-center justify-center flex-1 w-full px-margin-mobile">
        <div className="flex flex-col items-center justify-center space-y-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <Logo className="w-40 h-40 text-white drop-shadow-2xl" showText={true} textColor="text-white" />
          </motion.div>
        </div>
      </main>

      {/* Bottom Tagline */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        className="absolute bottom-12 left-0 right-0 flex justify-center z-10"
      >
        <p className="font-label-bold text-label-bold text-on-primary/80 uppercase tracking-widest">
          MESSAGING REIMAGINED
        </p>
      </motion.div>

      {/* Loading bar */}
      <motion.div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 h-1 bg-white/30 rounded-full overflow-hidden w-32"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        <motion.div
          className="h-full bg-white rounded-full"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ delay: 1.5, duration: 1.3, ease: 'easeInOut' }}
        />
      </motion.div>
    </div>
  );
}
