import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGlobal } from '../context/GlobalContext';

const AURA_OPTIONS = ['🔥 On Fire', '🎧 Vibing', '🌙 Relaxing', '🎮 Gaming', '✨ Creating', '💭 Thinking'];
const INTERESTS = ['Photography', 'Web3', 'Fashion', 'Gaming', 'Fitness', 'Art', 'Travel', 'Food'];
const MUSIC_GENRES = ['Lo-Fi', 'Hip Hop', 'R&B', 'Pop', 'Indie', 'EDM', 'Rock', 'Jazz'];

export default function ProfileSetup() {
  const navigate = useNavigate();
  const { updateProfile } = useGlobal();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    displayName: '',
    username: '',
    bio: '',
    aura: '',
    interests: [],
    music: []
  });

  const toggleArrayItem = (field, item) => {
    setFormData(prev => {
      const arr = prev[field];
      if (arr.includes(item)) return { ...prev, [field]: arr.filter(i => i !== item) };
      if (arr.length >= 3) return prev; // max 3 selections
      return { ...prev, [field]: [...arr, item] };
    });
  };

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
    else {
      updateProfile({
        name: formData.displayName || 'Alex',
        bio: formData.bio,
        aura: formData.aura || '🔥 On Fire',
        interests: formData.interests,
        musicGenres: formData.music,
      });
      navigate('/welcome');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="bg-white min-h-screen flex flex-col relative overflow-x-hidden overflow-y-auto px-6 py-10 font-body-md text-on-background"
    >
      <div className="absolute top-0 right-0 w-[40vw] h-[40vw] bg-primary-container/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 z-0" />
      
      <div className="w-full max-w-md mx-auto z-10 flex flex-col min-h-screen">
        {/* Progress */}
        <div className="w-full flex gap-2 mb-10 pt-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-1.5 flex-1 rounded-full overflow-hidden bg-surface-variant">
              <motion.div 
                className="h-full bg-primary-container"
                initial={{ width: 0 }}
                animate={{ width: step >= i ? '100%' : '0%' }}
                transition={{ duration: 0.4 }}
              />
            </div>
          ))}
        </div>

        {/* Form Container */}
        <div className="flex-1">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col h-full">
                <h1 className="font-display text-4xl font-bold tracking-tight mb-2">Build your identity</h1>
                <p className="text-secondary mb-10">How should people recognize you?</p>

                <div className="flex flex-col items-center mb-8 relative">
                  <div className="w-32 h-32 rounded-full border-4 border-surface-container flex items-center justify-center bg-surface relative overflow-hidden group cursor-pointer hover:border-primary-container/50 transition-colors">
                    <span className="material-symbols-outlined text-4xl text-on-surface-variant group-hover:scale-110 transition-transform">add_a_photo</span>
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white font-label-bold text-sm">Upload</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="relative group">
                    <label className="text-xs font-label-bold text-secondary ml-4 mb-1 block">Display Name</label>
                    <input type="text" placeholder="e.g. Alex" value={formData.displayName} onChange={e => setFormData({...formData, displayName: e.target.value})} className="w-full bg-transparent border-2 border-surface-variant rounded-[1.25rem] px-4 py-4 outline-none focus:border-primary-container transition-colors font-body-lg" />
                  </div>
                  <div className="relative group">
                    <label className="text-xs font-label-bold text-secondary ml-4 mb-1 block">Bio (Optional)</label>
                    <textarea rows={3} placeholder="What's your vibe?" value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} className="w-full bg-transparent border-2 border-surface-variant rounded-[1.25rem] px-4 py-4 outline-none focus:border-primary-container transition-colors font-body-lg resize-none" />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col h-full">
                <h1 className="font-display text-4xl font-bold tracking-tight mb-2">Set your Aura</h1>
                <p className="text-secondary mb-10">What's your current energy?</p>

                <div className="grid grid-cols-2 gap-4">
                  {AURA_OPTIONS.map(aura => (
                    <motion.button
                      key={aura}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setFormData({...formData, aura})}
                      className={`p-4 rounded-2xl border-2 text-left font-label-bold transition-all ${formData.aura === aura ? 'border-primary-container bg-primary-container/5 text-primary-container shadow-[0_0_15px_rgba(225,29,72,0.15)]' : 'border-surface-variant text-on-surface hover:border-on-surface/20'}`}
                    >
                      {aura}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col h-full">
                <h1 className="font-display text-4xl font-bold tracking-tight mb-2">Your World</h1>
                <p className="text-secondary mb-10">Pick up to 3 for each to personalize your space.</p>

                <div className="mb-8">
                  <h3 className="font-label-bold text-sm text-secondary mb-3">Interests</h3>
                  <div className="flex flex-wrap gap-2">
                    {INTERESTS.map(item => {
                      const isSelected = formData.interests.includes(item);
                      return (
                        <button key={item} onClick={() => toggleArrayItem('interests', item)} className={`px-4 py-2 rounded-full border text-sm font-label-bold transition-all ${isSelected ? 'bg-primary-container border-primary-container text-white' : 'bg-transparent border-surface-variant text-on-surface hover:bg-surface'}`}>
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="font-label-bold text-sm text-secondary mb-3">Music Genres</h3>
                  <div className="flex flex-wrap gap-2">
                    {MUSIC_GENRES.map(item => {
                      const isSelected = formData.music.includes(item);
                      return (
                        <button key={item} onClick={() => toggleArrayItem('music', item)} className={`px-4 py-2 rounded-full border text-sm font-label-bold transition-all ${isSelected ? 'bg-primary-container border-primary-container text-white' : 'bg-transparent border-surface-variant text-on-surface hover:bg-surface'}`}>
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-8 pb-4 flex justify-between gap-4">
          {step > 1 && (
            <button onClick={() => setStep(step - 1)} className="w-14 h-[60px] rounded-[2rem] border-2 border-surface-variant flex items-center justify-center hover:bg-surface transition-colors">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
          )}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleNext}
            disabled={step === 1 && !formData.displayName}
            className="flex-1 bg-primary-container text-white rounded-[2rem] h-[60px] font-bold text-lg shadow-[0_8px_20px_rgba(225,29,72,0.3)] hover:shadow-[0_12px_25px_rgba(225,29,72,0.4)] transition-all flex items-center justify-center gap-2 overflow-hidden group disabled:opacity-50 relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
            {step === 3 ? 'Complete Setup' : 'Continue'}
            {step < 3 && <span className="material-symbols-outlined">arrow_forward</span>}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
