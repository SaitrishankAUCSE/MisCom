import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TopAppBar from '../components/TopAppBar';
import { useGlobal } from '../context/GlobalContext';

export default function AIInsights() {
  const { getInsights, chats } = useGlobal();
  const [showToast, setShowToast] = useState('');
  const [exported, setExported] = useState(false);

  const insights = getInsights();

  const handleExport = () => {
    setExported(true);
    setShowToast('Insights exported to clipboard! 📋');
    
    const text = `🧠 MisCom AI Insight Card\n\nArchetype: ${insights.archetype}\nMatch: ${insights.matchPercentage}%\nTexting Style: ${insights.textingStyle} (${insights.textingAccuracy}%)\nPeak Vibe: ${insights.peakTime}\nSocial Energy: ${insights.socialEnergy}\n\nTop Contact: ${insights.topContact}\nTotal Messages: ${insights.totalMessages}\n\n#MisCom #MyVibe`;
    
    navigator.clipboard?.writeText(text).catch(() => {});
    setTimeout(() => setShowToast(''), 2500);
  };

  const handleShare = async () => {
    const shareData = {
      title: 'My MisCom Personality',
      text: `I'm "${insights.archetype}" on MisCom! My texting style is "${insights.textingStyle}" with ${insights.textingAccuracy}% accuracy. Social Energy: ${insights.socialEnergy}`,
      url: 'https://miscom.app',
    };
    
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        handleExport();
      }
    } catch {
      handleExport();
    }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}
      className="bg-background text-on-background font-body-md min-h-screen pb-24">
      <TopAppBar showBack />

      {/* Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] bg-on-background text-white px-6 py-3 rounded-full font-label-bold text-sm shadow-2xl">
            {showToast}
          </motion.div>
        )}
      </AnimatePresence>

      <main className="pt-24 px-margin-mobile">
        <section className="mt-10 mb-12 text-center">
          <h1 className="font-display text-display text-on-background mb-4">Personality <span className="text-primary-container">Insights</span></h1>
          <p className="font-body-lg text-body-lg text-secondary max-w-xs mx-auto">Your social DNA, decoded by MisCom AI.</p>
        </section>

        <div className="grid grid-cols-1 gap-4 mb-16">
          {/* Archetype */}
          <motion.div whileTap={{ scale: 0.98 }} className="glass-card rounded-xl p-6 flex flex-col justify-between overflow-hidden relative cursor-pointer">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-container/10 blur-3xl -mr-10 -mt-10" />
            <div className="relative z-10">
              <span className="font-label-bold text-label-bold uppercase tracking-widest text-primary-container mb-2 block">Current Role</span>
              <h2 className="font-headline-lg text-headline-lg mb-3">{insights.archetype}</h2>
              <p className="font-body-md text-body-md text-secondary">{insights.archetypeDesc}</p>
            </div>
            <div className="mt-8 flex items-center justify-between">
              <div className="flex -space-x-3">
                {['favorite', 'self_improvement', 'psychology'].map((icon, i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-surface bg-surface-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-sm">{icon}</span>
                  </div>
                ))}
              </div>
              <span className="font-label-bold text-label-bold text-primary">MATCH: {insights.matchPercentage}%</span>
            </div>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <motion.div whileTap={{ scale: 0.98 }} className="glass-card rounded-xl p-5 border-b-4 border-primary-container cursor-pointer">
              <div className="flex justify-between items-start mb-4">
                <span className="material-symbols-outlined text-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                <span className="font-label-bold text-label-bold text-secondary text-xs">STYLE</span>
              </div>
              <h3 className="font-headline-md text-[16px] font-bold mb-2">{insights.textingStyle}</h3>
              <div className="flex items-end gap-2">
                <span className="font-headline-lg text-primary-container leading-none text-2xl">{insights.textingAccuracy}%</span>
                <span className="font-label-bold text-label-sm text-secondary pb-1 text-[10px]">ACCURACY</span>
              </div>
              <div className="w-full bg-surface-variant h-1.5 rounded-full mt-4 overflow-hidden">
                <motion.div className="bg-primary-container h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${insights.textingAccuracy}%` }} transition={{ duration: 1, delay: 0.5 }} />
              </div>
            </motion.div>

            <motion.div whileTap={{ scale: 0.98 }} className="glass-card rounded-xl p-5 flex flex-col justify-between cursor-pointer">
              <div>
                <span className="font-label-bold text-label-bold text-secondary uppercase tracking-tighter mb-4 block text-xs">Peak Vibe</span>
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-primary-container">schedule</span>
                  <span className="font-headline-md text-[16px] font-bold">{insights.peakTime}</span>
                </div>
                <p className="text-label-sm font-label-sm text-secondary text-[11px]">{insights.peakLabel}</p>
              </div>
              <div className="flex gap-1 h-12 items-end mt-3">
                {insights.weeklyActivity.map((h, i) => (
                  <motion.div
                    key={i}
                    className={`w-2 rounded-full ${h === Math.max(...insights.weeklyActivity) ? 'bg-primary-container' : 'bg-surface-variant'}`}
                    initial={{ height: 0 }}
                    animate={{ height: `${h * 4}px` }}
                    transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
                  />
                ))}
              </div>
            </motion.div>
          </div>

          {/* Social Energy */}
          <motion.div whileTap={{ scale: 0.98 }} className="glass-card rounded-xl p-6 flex items-center gap-6 cursor-pointer">
            <div className="w-20 h-20 rounded-full border-4 border-primary-container/20 flex items-center justify-center relative shrink-0">
              <motion.div
                className="absolute inset-0 rounded-full border-t-4 border-primary-container"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
              />
              <span className="font-headline-md text-xl font-bold">{insights.socialEnergy}</span>
            </div>
            <div>
              <h3 className="font-headline-md text-lg font-bold">Social Energy</h3>
              <p className="font-body-md text-sm text-secondary">{insights.socialEnergyDesc}</p>
            </div>
          </motion.div>

          {/* Top Contact */}
          <div className="glass-card rounded-xl p-5 flex items-center gap-4">
            <span className="material-symbols-outlined text-primary-container text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
            <div>
              <p className="text-label-sm text-secondary uppercase tracking-wider text-[10px]">Most Chatted</p>
              <p className="font-headline-md text-lg font-bold">{insights.topContact}</p>
              <p className="text-label-sm text-secondary text-[11px]">{insights.totalMessages} total messages</p>
            </div>
          </div>

          {/* Share CTA */}
          <section className="bg-primary-container text-on-primary-container rounded-xl p-8 flex flex-col items-center justify-between gap-5 relative overflow-hidden hard-depth text-center">
            <h2 className="font-headline-lg text-2xl font-bold mb-2">Share Your Vibe</h2>
            <p className="font-body-lg text-on-primary-container/80 text-sm">Export your personality card and show the world your archetype.</p>
            <div className="flex gap-3">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleExport}
                className={`bg-on-primary-container text-primary py-3 px-6 rounded-full font-label-bold text-sm flex items-center gap-2 hover:bg-surface transition-colors ${exported ? 'opacity-75' : ''}`}
              >
                <span className="material-symbols-outlined text-lg">{exported ? 'check' : 'content_copy'}</span>
                {exported ? 'COPIED!' : 'COPY CARD'}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleShare}
                className="bg-white/20 backdrop-blur-sm text-white py-3 px-6 rounded-full font-label-bold text-sm flex items-center gap-2 hover:bg-white/30 transition-colors border border-white/30"
              >
                <span className="material-symbols-outlined text-lg">share</span>SHARE
              </motion.button>
            </div>
            <span className="absolute -right-10 -bottom-10 material-symbols-outlined text-[160px] opacity-10 rotate-12" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
          </section>
        </div>
      </main>
    </motion.div>
  );
}
