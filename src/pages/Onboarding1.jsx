import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Onboarding1() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="bg-background min-h-screen flex flex-col items-center justify-center font-body-md text-on-background antialiased"
    >
      <main className="w-full max-w-md mx-auto min-h-screen flex flex-col relative overflow-x-hidden overflow-y-auto bg-background px-margin-mobile pb-margin-mobile pt-16">
        {/* Header / Progress */}
        <header className="w-full flex justify-between items-center z-10 pt-4 pb-6">
          <button
            onClick={() => navigate('/auth-choice')}
            className="text-secondary hover:text-on-background transition-colors p-1"
          >
            <span className="font-label-bold text-label-bold">Skip</span>
          </button>
          <div className="flex gap-1 items-center">
            <div className="h-1 w-10 rounded-full bg-primary-container shadow-[0_0_0_2px_rgba(225,29,72,0.2)]" />
            <div className="h-1 w-6 rounded-full bg-surface-variant" />
          </div>
          <div className="w-8" />
        </header>

        {/* Content */}
        <section className="flex-grow flex flex-col items-center text-center mt-10 relative z-10">
          <div className="mb-16 px-2">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="font-display text-display tracking-tight text-on-background mb-4"
            >
              Your Digital<br />
              <span className="text-primary-container">Vibe Space</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="font-body-lg text-body-lg text-secondary max-w-xs mx-auto mt-4"
            >
              Curate your world. Connect through aesthetics, music, and shared digital rooms.
            </motion.p>
          </div>

          {/* Illustration Area */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="relative w-full aspect-square max-w-sm mx-auto my-auto flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-surface-variant/30 to-background rounded-full filter blur-3xl opacity-50" />
            <div className="relative z-10 w-full h-full flex items-center justify-center">
              {/* Central visual element */}
              <div className="w-[85%] h-[85%] bg-gradient-to-br from-primary-container/10 via-surface-variant/30 to-primary-fixed/20 rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-outline-variant/20 transform -rotate-2 flex items-center justify-center">
                <div className="text-center">
                  <span className="material-symbols-outlined text-primary-container" style={{ fontSize: '64px', fontVariationSettings: "'FILL' 1" }}>
                    spatial_audio
                  </span>
                  <p className="text-secondary font-label-bold mt-4">Your Space. Your Rules.</p>
                </div>
              </div>
              {/* Floating accent */}
              <div className="absolute -right-4 top-1/4 w-16 h-16 rounded-xl bg-primary-container flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transform rotate-12">
                <span className="material-symbols-outlined text-on-primary-container text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>music_note</span>
              </div>
              <div className="absolute -left-2 bottom-1/4 w-12 h-12 rounded-full bg-surface border-[2px] border-on-background flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transform -rotate-6">
                <span className="material-symbols-outlined text-primary-container text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Bottom Action */}
        <footer className="w-full pt-16 pb-6 mt-auto z-10 flex flex-col gap-4 items-center">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/onboarding-2')}
            className="w-full bg-primary-container text-on-primary-container rounded-full py-6 px-10 font-headline-md text-headline-md shadow-[0_8px_30px_rgba(225,29,72,0.3)] hover:scale-[0.98] transition-transform duration-200 flex items-center justify-center gap-2 group"
          >
            Continue
            <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </motion.button>
        </footer>
      </main>
    </motion.div>
  );
}
