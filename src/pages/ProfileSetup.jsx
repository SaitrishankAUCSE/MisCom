import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGlobal } from '../context/GlobalContext';
import FirebaseSync from '../lib/firebase';
import { AVATARS } from '../lib/backend';

const AURA_OPTIONS = ['🔥 On Fire', '🎧 Vibing', '🌙 Relaxing', '🎮 Gaming', '✨ Creating', '💭 Thinking'];
const INTERESTS = ['Photography', 'Web3', 'Fashion', 'Gaming', 'Fitness', 'Art', 'Travel', 'Food'];
const MUSIC_GENRES = ['Lo-Fi', 'Hip Hop', 'R&B', 'Pop', 'Indie', 'EDM', 'Rock', 'Jazz'];

export default function ProfileSetup() {
  const navigate = useNavigate();
  const { updateProfile, user } = useGlobal();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    displayName: user?.name || '',
    username: user?.username || '',
    avatar: user?.avatar || AVATARS[0],
    bio: user?.bio || '',
    aura: user?.aura || '',
    interests: user?.interests || [],
    music: user?.musicGenres || []
  });
  const [usernameStatus, setUsernameStatus] = useState('idle'); // idle, checking, available, unavailable, invalid

  const toggleArrayItem = (field, item) => {
    setFormData(prev => {
      const arr = prev[field];
      if (arr.includes(item)) return { ...prev, [field]: arr.filter(i => i !== item) };
      if (arr.length >= 3) return prev; // max 3 selections
      return { ...prev, [field]: [...arr, item] };
    });
  };

  // Real-time username validation
  useEffect(() => {
    if (step !== 2) return;
    
    const un = formData.username;
    if (!un) {
      setUsernameStatus('idle');
      return;
    }
    
    // Check regex: 3-20 chars, alphanumeric and underscores only
    const isValid = /^[a-zA-Z0-9_]{3,20}$/.test(un);
    if (!isValid) {
      setUsernameStatus('invalid');
      return;
    }

    setUsernameStatus('checking');
    const delayDebounceFn = setTimeout(async () => {
      if (FirebaseSync.isReady()) {
        const userExists = await FirebaseSync.getUserByIdentifier(un);
        setUsernameStatus(userExists ? 'unavailable' : 'available');
      } else {
        // Fallback for local testing
        const localUsers = JSON.parse(localStorage.getItem('miscom_users') || '[]');
        const exists = localUsers.some(u => (u.username || '').toLowerCase() === un.toLowerCase());
        setUsernameStatus(exists ? 'unavailable' : 'available');
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [formData.username, step]);

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
    else {
      updateProfile({
        name: formData.displayName || 'User',
        username: formData.username.toLowerCase(),
        avatar: formData.avatar,
        bio: formData.bio,
        aura: formData.aura || '🔥 On Fire',
        interests: formData.interests,
        musicGenres: formData.music,
        onboardingCompleted: true
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
      className="bg-background min-h-screen flex flex-col relative overflow-x-hidden overflow-y-auto px-6 py-10 font-body-md text-on-background"
    >
      <div className="absolute top-0 right-0 w-[40vw] h-[40vw] bg-primary-container/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 z-0" />
      
      <div className="w-full max-w-md mx-auto z-10 flex flex-col min-h-screen">
        {/* Progress */}
        <div className="w-full flex gap-2 mb-10 pt-4">
          {[1, 2, 3, 4].map(i => (
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
                  <div className="w-32 h-32 rounded-full border-4 border-primary-container/30 flex items-center justify-center bg-surface relative overflow-hidden group cursor-pointer hover:border-primary-container transition-colors shadow-xl">
                    <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="material-symbols-outlined text-white text-2xl">edit</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 overflow-x-auto max-w-full pb-2 scrollbar-hide">
                    {AVATARS.map((av, i) => (
                      <button key={i} onClick={() => setFormData({...formData, avatar: av})} 
                        className={`w-10 h-10 rounded-full border-2 shrink-0 transition-all ${formData.avatar === av ? 'border-primary-container scale-110' : 'border-surface-variant hover:border-primary-container/50'}`}>
                        <img src={av} className="w-full h-full rounded-full" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="relative group">
                    <label className="text-xs font-label-bold text-secondary ml-4 mb-1 block">Display Name (Visible to everyone)</label>
                    <input type="text" placeholder="e.g. Alex ✨" value={formData.displayName} onChange={e => setFormData({...formData, displayName: e.target.value})} className="w-full bg-transparent border-2 border-surface-variant rounded-[1.25rem] px-4 py-4 outline-none focus:border-primary-container transition-colors font-body-lg" />
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
                <h1 className="font-display text-4xl font-bold tracking-tight mb-2">Claim your handle</h1>
                <p className="text-secondary mb-10">Your unique, permanent identity.</p>

                <div className="relative group">
                  <label className="text-xs font-label-bold text-secondary ml-4 mb-1 block">Username</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary font-body-lg">@</div>
                    <input 
                      type="text" 
                      placeholder="alexvibes" 
                      value={formData.username} 
                      onChange={e => setFormData({...formData, username: e.target.value.toLowerCase().trim()})} 
                      className={`w-full bg-transparent border-2 rounded-[1.25rem] pl-9 pr-12 py-4 outline-none transition-colors font-body-lg ${usernameStatus === 'invalid' ? 'border-error focus:border-error' : usernameStatus === 'available' ? 'border-green-500 focus:border-green-500' : usernameStatus === 'unavailable' ? 'border-error focus:border-error' : 'border-surface-variant focus:border-primary-container'}`} 
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center">
                      {usernameStatus === 'checking' && <div className="w-5 h-5 border-2 border-primary-container/30 border-t-primary-container rounded-full animate-spin" />}
                      {usernameStatus === 'available' && <span className="material-symbols-outlined text-green-500">check_circle</span>}
                      {usernameStatus === 'unavailable' && <span className="material-symbols-outlined text-error">cancel</span>}
                    </div>
                  </div>
                  <div className="ml-4 mt-2 h-4 text-xs font-label-bold">
                    {usernameStatus === 'invalid' && <span className="text-error">3-20 chars, letters, numbers, underscores only.</span>}
                    {usernameStatus === 'unavailable' && <span className="text-error">Username is already taken.</span>}
                    {usernameStatus === 'available' && <span className="text-green-500">Username is available!</span>}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col h-full">
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

            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col h-full">
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
            disabled={(step === 1 && !formData.displayName) || (step === 2 && usernameStatus !== 'available')}
            className="flex-1 bg-primary-container text-white rounded-[2rem] h-[60px] font-bold text-lg shadow-[0_8px_20px_rgba(225,29,72,0.3)] hover:shadow-[0_12px_25px_rgba(225,29,72,0.4)] transition-all flex items-center justify-center gap-2 overflow-hidden group disabled:opacity-50 relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
            {step === 4 ? 'Complete Setup' : 'Continue'}
            {step < 4 && <span className="material-symbols-outlined">arrow_forward</span>}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

