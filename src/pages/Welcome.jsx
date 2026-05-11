import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGlobal } from '../context/GlobalContext';

export default function Welcome() {
  const navigate = useNavigate();
  const { user } = useGlobal();

  useEffect(() => {
    const timer = setTimeout(() => navigate('/home'), 4000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
      className="bg-background text-on-background min-h-screen flex flex-col relative overflow-hidden font-body-md">
      {/* Background Glows */}
      <div className="absolute -top-[20%] -left-[10%] w-[80vw] h-[80vw] glow-red rounded-full pointer-events-none z-0 mix-blend-multiply" />
      <div className="absolute top-[40%] -right-[20%] w-[90vw] h-[90vw] bg-gradient-to-tr from-transparent via-primary-container/5 to-transparent blur-[80px] rounded-full pointer-events-none z-0" />
      {/* Floating Particles */}
      <div className="absolute top-24 left-[15%] w-2 h-2 bg-gradient-to-br from-primary-container to-primary-fixed-dim rounded-full opacity-40 z-0 shadow-[0_0_10px_rgba(255,45,85,0.5)]" />
      <div className="absolute top-1/3 right-[12%] w-4 h-4 bg-gradient-to-tr from-white to-surface-container-high border border-primary-container/10 rounded-full opacity-60 z-0" />
      <div className="absolute bottom-48 left-[18%] w-1.5 h-1.5 bg-primary-container rounded-full opacity-30 z-0" />

      <main className="flex-grow flex flex-col items-center justify-between w-full px-margin-mobile py-16 z-10 relative h-screen max-h-screen overflow-hidden">
        {/* Headline */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }}
          className="text-center w-full max-w-xsxl mt-6 z-30">
          <h1 className="font-headline-lg text-headline-lg text-on-background mb-2 tracking-tight">Welcome home, {user?.name || 'Alex'}</h1>
          <p className="font-body-lg text-body-lg text-secondary opacity-80 font-light">The next generation of connection starts here.</p>
        </motion.div>

        {/* Phone Mockup */}
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, duration: 0.8 }}
          className="relative w-full max-w-[400px] mx-auto flex justify-center items-center flex-grow my-10">
          <div className="absolute top-1/4 -left-8 w-32 h-48 rounded-[2rem] bg-gradient-to-br from-white/60 to-white/10 border border-white/40 backdrop-blur-xl transform -rotate-[15deg] scale-90 opacity-60 shadow-2xl z-0" />
          <div className="absolute bottom-1/4 -right-8 w-40 h-56 rounded-[2.5rem] bg-gradient-to-tl from-primary-container/10 to-transparent border border-white/50 backdrop-blur-2xl transform rotate-[10deg] scale-90 opacity-70 z-0" />
          <div className="relative w-72 aspect-[0.48] glass-panel rounded-[3rem] p-3 z-20 flex flex-col items-center justify-center">
            <div className="w-full h-full rounded-[2.5rem] overflow-hidden bg-surface relative shadow-inner border border-surface-variant/30">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[40%] h-6 bg-black rounded-b-[1.2rem] z-30 flex justify-center items-center">
                <div className="w-12 h-1.5 bg-gray-800 rounded-full mt-1" />
              </div>
              <div className="w-full h-full bg-gradient-to-b from-primary-container/5 via-surface to-surface-variant/20 flex items-center justify-center">
                <motion.span
                  animate={{ y: [0, -8, 0] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  className="material-symbols-outlined text-primary-container text-[64px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  rocket_launch
                </motion.span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: 0.6 }}
          className="w-full max-w-sm flex flex-col items-center pb-6 z-30">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/home')}
            className="w-full bg-primary-container text-white font-headline-md text-headline-md py-5 px-8 rounded-full shadow-[0_15px_30px_-10px_rgba(255,45,85,0.4)] transition-all flex items-center justify-center gap-4 group"
          >
            <span className="font-medium tracking-wide">Let's Vibe</span>
            <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform" style={{ fontSize: '28px' }}>arrow_forward</span>
          </motion.button>
          <p className="font-label-sm text-label-sm text-secondary mt-10 uppercase tracking-[0.2em] opacity-50">Tap to enter</p>
        </motion.div>

        {/* Auto-loading indicator */}
        <motion.div className="absolute bottom-4 left-1/2 -translate-x-1/2 h-1 bg-surface-variant rounded-full overflow-hidden w-24"
          initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} transition={{ delay: 1.5 }}>
          <motion.div className="h-full bg-primary-container rounded-full" initial={{ width: '0%' }} animate={{ width: '100%' }}
            transition={{ delay: 1.5, duration: 2.5, ease: 'easeInOut' }} />
        </motion.div>
      </main>
    </motion.div>
  );
}
