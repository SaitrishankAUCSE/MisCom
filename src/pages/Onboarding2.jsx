import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Onboarding2() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="bg-background min-h-screen flex flex-col items-center justify-center relative overflow-x-hidden overflow-y-auto font-body-md text-body-md text-on-surface"
    >
      {/* Decorative blurs */}
      <div className="absolute top-10 left-10 w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-primary-fixed-dim/20 blur-2xl z-0" />
      <div className="absolute bottom-10 right-10 w-32 h-32 sm:w-48 sm:h-48 rounded-full bg-primary-container/10 blur-3xl z-0" />

      <main className="w-full max-w-md mx-auto px-margin-mobile flex flex-col items-center justify-between min-h-screen py-10 z-10">
        {/* Header */}
        <div className="text-center w-full mt-8">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="font-display text-display text-on-background mb-4"
          >
            Feel Every Conversation
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="font-body-lg text-body-lg text-on-surface-variant max-w-xs mx-auto"
          >
            Connecting digital natives with high-fidelity simplicity.
          </motion.p>
        </div>

        {/* Center Showcase */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="relative w-full flex-1 flex items-center justify-center my-8"
        >
          {/* Floating Elements */}
          <div className="absolute top-1/4 -left-4 w-12 h-12 bg-surface-container-lowest rounded-full border-2 border-on-background shadow-[4px_4px_0px_0px_rgba(225,29,72,1)] flex items-center justify-center rotate-[-15deg]">
            <span className="material-symbols-outlined filled text-primary-container text-2xl">favorite</span>
          </div>
          <div className="absolute bottom-1/4 -right-2 w-14 h-14 bg-primary-container rounded-full shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] flex items-center justify-center rotate-[10deg]">
            <span className="material-symbols-outlined text-white text-3xl">bolt</span>
          </div>

          {/* Phone Mockup */}
          <div className="w-64 sm:w-72 relative z-10 filter drop-shadow-2xl">
            <div className="relative w-full aspect-[0.5] rounded-[2rem] overflow-hidden border-4 border-on-background bg-surface-bright shadow-[8px_8px_0px_0px_rgba(27,27,27,1)]">
              {/* Mock chat interface */}
              <div className="w-full h-full bg-background flex flex-col p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-primary-container" />
                  <div>
                    <div className="h-2 w-20 bg-on-background/80 rounded-full" />
                    <div className="h-1.5 w-12 bg-secondary/40 rounded-full mt-1" />
                  </div>
                </div>
                {/* Chat bubbles */}
                <div className="space-y-3 flex-1">
                  <div className="bg-surface-variant rounded-2xl rounded-tl-4 p-3 max-w-[70%]">
                    <div className="h-2 w-full bg-secondary/30 rounded-full" />
                    <div className="h-2 w-3/4 bg-secondary/20 rounded-full mt-1.5" />
                  </div>
                  <div className="bg-primary-container rounded-2xl rounded-tr-4 p-3 max-w-[70%] ml-auto">
                    <div className="h-2 w-full bg-white/60 rounded-full" />
                    <div className="h-2 w-2/3 bg-white/40 rounded-full mt-1.5" />
                  </div>
                  <div className="bg-surface-variant rounded-2xl rounded-tl-4 p-3 max-w-[60%]">
                    <div className="h-2 w-full bg-secondary/30 rounded-full" />
                  </div>
                  <div className="bg-primary-container rounded-2xl rounded-tr-4 p-3 max-w-[75%] ml-auto">
                    <div className="h-2 w-full bg-white/60 rounded-full" />
                    <div className="h-2 w-1/2 bg-white/40 rounded-full mt-1.5" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* More floating elements */}
          <div className="absolute top-1/2 left-4 w-10 h-10 bg-surface-container-lowest rounded-full border-2 border-on-background flex items-center justify-center z-20 shadow-[2px_2px_0px_0px_rgba(27,27,27,1)]">
            <span className="material-symbols-outlined text-on-background text-xl">chat_bubble</span>
          </div>
          <div className="absolute top-1/3 right-4 w-8 h-8 bg-surface-container-lowest rounded-full border border-on-background flex items-center justify-center z-20 shadow-[2px_2px_0px_0px_rgba(225,29,72,1)]">
            <span className="material-symbols-outlined text-primary-container text-lg">auto_awesome</span>
          </div>
        </motion.div>

        {/* Footer Action */}
        <div className="w-full mt-auto mb-6">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              localStorage.setItem('miscom_onboarded', 'true');
              navigate('/auth-choice');
            }}
            className="w-full bg-primary-container text-white font-label-bold text-label-bold py-4 rounded-full flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] border-2 border-transparent focus:outline-none focus:ring-2 focus:ring-on-background focus:ring-offset-2"
          >
            Continue
            <span className="material-symbols-outlined text-xl">arrow_forward</span>
          </motion.button>
        </div>
      </main>
    </motion.div>
  );
}
