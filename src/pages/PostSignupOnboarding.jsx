import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGlobal } from '../context/GlobalContext';
import Backend, { AVATARS } from '../lib/backend';
import FirebaseSync from '../lib/firebase';
import Logo from '../components/Logo';

const AURAS = [
  { id: 'vibing', label: 'Vibing', emoji: '🎧', color: 'from-violet-500 to-purple-600' },
  { id: 'creative', label: 'Creative', emoji: '✨', color: 'from-pink-500 to-rose-600' },
  { id: 'gaming', label: 'Gaming', emoji: '🎮', color: 'from-green-500 to-emerald-600' },
  { id: 'relaxing', label: 'Relaxing', emoji: '🌙', color: 'from-blue-400 to-indigo-500' },
  { id: 'busy', label: 'Busy', emoji: '📚', color: 'from-amber-500 to-orange-600' },
  { id: 'lonely', label: 'Lonely', emoji: '🌧️', color: 'from-slate-400 to-gray-500' },
  { id: 'chaotic', label: 'Chaotic', emoji: '⚡', color: 'from-red-500 to-pink-600' },
];

const INTERESTS = [
  { id: 'music', label: 'Music', icon: '🎵' }, { id: 'anime', label: 'Anime', icon: '🎌' },
  { id: 'gaming', label: 'Gaming', icon: '🎮' }, { id: 'movies', label: 'Movies', icon: '🎬' },
  { id: 'tech', label: 'Tech', icon: '💻' }, { id: 'fashion', label: 'Fashion', icon: '👗' },
  { id: 'fitness', label: 'Fitness', icon: '💪' }, { id: 'study', label: 'Study', icon: '📖' },
  { id: 'photography', label: 'Photography', icon: '📸' }, { id: 'art', label: 'Art', icon: '🎨' },
  { id: 'travel', label: 'Travel', icon: '✈️' }, { id: 'food', label: 'Food', icon: '🍕' },
];

const GENRES = ['Pop', 'Hip-Hop', 'R&B', 'Indie', 'Rock', 'EDM', 'Lo-fi', 'Jazz', 'K-Pop', 'Bollywood', 'Classical', 'Phonk'];

const BIOS = [
  'Late night thoughts 🌙', 'Music. Anime. Chaos.', 'Just vibing ✨',
  'Making memories 📸', 'Living my best life 🔥', 'Main character energy ⚡',
];

const TOTAL_STEPS = 7;

export default function PostSignupOnboarding() {
  const navigate = useNavigate();
  const { user, updateProfile } = useGlobal();
  const [step, setStep] = useState(0);
  
  // Identity state
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [usernameStatus, setUsernameStatus] = useState('idle');
  
  const [bio, setBio] = useState('');
  const [aura, setAura] = useState('');
  const [interests, setInterests] = useState([]);
  const [genres, setGenres] = useState([]);
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const fileRef = useRef(null);

  // Username validation (Instagram style)
  React.useEffect(() => {
    if (step !== 1) return;
    if (username === user?.username) { setUsernameStatus('available'); return; }
    if (username.length < 3) { setUsernameStatus('idle'); return; }
    
    setUsernameStatus('checking');
    const timer = setTimeout(() => {
      setUsernameStatus(Backend.auth.checkUsername(username));
    }, 500);
    return () => clearTimeout(timer);
  }, [username, step, user?.username]);

  const next = () => step < TOTAL_STEPS - 1 ? setStep(s => s + 1) : finish();
  const back = () => step > 0 && setStep(s => s - 1);

  const toggleItem = (arr, set, id) => set(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleAvatar = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAvatar(ev.target.result);
    reader.readAsDataURL(file);
  };

  const finish = async () => {
    const selectedAura = AURAS.find(a => a.id === aura);
    const updates = {
      name: displayName || user?.name || user?.username,
      username: username || user?.username,
      bio, aura: selectedAura ? `${selectedAura.emoji} ${selectedAura.label}` : user?.aura || '',
      interests, musicGenres: genres, onboardingCompleted: true,
    };
    if (avatar && avatar !== user?.avatar) updates.avatar = avatar;

    try {
      updateProfile(updates);
      if (FirebaseSync.isReady()) {
        await FirebaseSync.saveUser({ ...user, ...updates });
      }
    } catch (e) { console.error(e); }
    
    navigate('/home');
  };

  const skipOnboarding = async () => {
    try {
      updateProfile({ onboardingCompleted: true });
      if (FirebaseSync.isReady()) {
        await FirebaseSync.saveUser({ ...user, onboardingCompleted: true });
      }
    } catch (e) {}
    
    navigate('/home');
  };

  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="bg-background min-h-screen flex flex-col relative overflow-hidden font-body-md text-on-background">

      {/* Ambient blurs */}
      <div className="absolute top-0 right-0 w-[60vw] h-[60vw] bg-primary-container/8 rounded-full blur-[100px] -translate-y-1/3 translate-x-1/4 z-0" />
      <div className="absolute bottom-0 left-0 w-[40vw] h-[40vw] bg-purple-400/6 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4 z-0" />

      {/* Progress bar */}
      {step > 0 && (
        <div className="fixed top-0 left-0 w-full h-1 bg-surface-variant z-50">
          <motion.div animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }}
            className="h-full bg-gradient-to-r from-primary-container to-pink-400 rounded-r-full" />
        </div>
      )}

      <div className="flex-1 flex flex-col px-6 py-10 z-10 max-w-md mx-auto w-full">

        {/* Back button */}
        {step > 0 && (
          <button onClick={back} className="self-start mb-4 p-2 -ml-2 rounded-full text-secondary hover:bg-surface-container-low transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
        )}

        <AnimatePresence mode="wait">
          {/* ═══ STEP 0: WELCOME ═══ */}
          {step === 0 && (
            <motion.div key="welcome" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}
              className="flex-1 flex flex-col items-center justify-center text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}>
                <Logo className="w-20 h-20 mb-6" showText={false} />
              </motion.div>
              <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                className="font-display text-4xl font-bold tracking-tight mb-3">
                Welcome to MisCom ✨
              </motion.h1>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                className="text-secondary text-base mb-2">Hey {user?.name || user?.username} 👋</motion.p>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
                className="text-secondary/70 text-sm max-w-[260px]">Let's build your vibe and set up your space. It only takes a minute.</motion.p>
              <motion.button whileTap={{ scale: 0.96 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}
                onClick={next}
                className="mt-10 w-full max-w-[280px] bg-primary-container text-white rounded-full py-4 font-bold text-lg shadow-[0_8px_24px_rgba(225,29,72,0.3)]">
                Let's Go →
              </motion.button>
              <button onClick={skipOnboarding} className="mt-4 text-secondary text-xs hover:underline">Skip for now</button>
            </motion.div>
          )}

          {/* ═══ STEP 1: IDENTITY (Instagram Style) ═══ */}
          {step === 1 && (
            <motion.div key="identity" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
              className="flex-1 flex flex-col">
              <h2 className="font-display text-3xl font-bold tracking-tight mb-2">Claim your identity</h2>
              <p className="text-secondary text-sm mb-8">Choose how you'll appear to your circle.</p>
              
              <div className="space-y-6">
                {/* Display Name */}
                <div className="space-y-2">
                  <label className="text-xs font-label-bold text-secondary ml-1">Display Name</label>
                  <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
                    placeholder="e.g. Alex River"
                    className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary-container/30 rounded-2xl px-4 py-4 outline-none transition-all font-label-bold" />
                  <p className="text-[10px] text-secondary ml-1">This is what people will see in chats.</p>
                </div>

                {/* Username */}
                <div className="space-y-2">
                  <label className="text-xs font-label-bold text-secondary ml-1 flex items-center gap-2">
                    Unique Username
                    {usernameStatus === 'available' && <span className="text-green-500 text-[10px]">✓ Available</span>}
                    {usernameStatus === 'taken' && <span className="text-red-500 text-[10px]">✗ Taken</span>}
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary font-bold">@</span>
                    <input type="text" value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      placeholder="username"
                      className={`w-full bg-surface-container-low border-2 rounded-2xl pl-10 pr-4 py-4 outline-none transition-all font-label-bold ${
                        usernameStatus === 'available' ? 'border-green-400/30' : usernameStatus === 'taken' ? 'border-red-400/30' : 'border-transparent'
                      }`} />
                  </div>
                  <p className="text-[10px] text-secondary ml-1">Use this to find friends and let them find you.</p>
                </div>
              </div>

              <div className="mt-auto">
                <button 
                  onClick={next} 
                  disabled={!displayName || usernameStatus !== 'available'}
                  className="w-full bg-primary-container text-white rounded-full py-4 font-bold shadow-lg disabled:opacity-40 transition-opacity">
                  Continue
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══ STEP 2: PROFILE PICTURE ═══ */}
          {step === 2 && (
            <motion.div key="avatar" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
              className="flex-1 flex flex-col">
              <h2 className="font-display text-3xl font-bold tracking-tight mb-2">Add a photo</h2>
              <p className="text-secondary text-sm mb-8">Help your circle recognize you.</p>
              <div className="flex flex-col items-center mb-8">
                <motion.div whileTap={{ scale: 0.95 }} onClick={() => fileRef.current?.click()}
                  className="w-32 h-32 rounded-full overflow-hidden bg-surface-container-low border-4 border-primary-container/20 cursor-pointer relative group shadow-xl">
                  {avatar ? <img src={avatar} className="w-full h-full object-cover" /> : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-secondary">
                      <span className="material-symbols-outlined text-3xl mb-1">add_a_photo</span>
                      <span className="text-[10px]">Tap to add</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-2xl">edit</span>
                  </div>
                </motion.div>
                <div className="flex gap-2 mt-6 overflow-x-auto max-w-full pb-2 scrollbar-hide">
                  {AVATARS.map((av, i) => (
                    <button key={i} onClick={() => setAvatar(av)} 
                      className={`w-10 h-10 rounded-full border-2 shrink-0 transition-all ${avatar === av ? 'border-primary-container scale-110' : 'border-surface-variant hover:border-primary-container/50'}`}>
                      <img src={av} className="w-full h-full rounded-full" />
                    </button>
                  ))}
                </div>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatar} className="hidden" />
              </div>
              <div className="mt-auto flex gap-3">
                <button onClick={next} className="flex-1 bg-primary-container text-white rounded-full py-3.5 font-bold shadow-lg">
                  {avatar ? 'Continue' : 'Skip'}
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══ STEP 3: BIO ═══ */}
          {step === 3 && (
            <motion.div key="bio" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
              className="flex-1 flex flex-col">
              <h2 className="font-display text-3xl font-bold tracking-tight mb-2">Write your bio</h2>
              <p className="text-secondary text-sm mb-6">Tell people what you're about.</p>
              <textarea value={bio} onChange={e => setBio(e.target.value.slice(0, 150))} rows={3} placeholder="What's your vibe?"
                className="w-full bg-surface-container-low rounded-2xl px-4 py-3 outline-none text-sm resize-none focus:ring-2 focus:ring-primary-container/30 mb-2" />
              <p className="text-[10px] text-secondary text-right mb-4">{bio.length}/150</p>
              <p className="text-xs text-secondary font-label-bold mb-2">Or pick one:</p>
              <div className="flex flex-wrap gap-2 mb-6">
                {BIOS.map(b => (
                  <motion.button key={b} whileTap={{ scale: 0.95 }} onClick={() => setBio(b)}
                    className={`px-3 py-1.5 rounded-full text-xs font-label-bold transition-all ${bio === b ? 'bg-primary-container text-white shadow-lg' : 'bg-surface-container-low text-secondary'}`}>{b}</motion.button>
                ))}
              </div>
              <div className="mt-auto">
                <button onClick={next} className="w-full bg-primary-container text-white rounded-full py-3.5 font-bold shadow-lg">
                  {bio ? 'Continue' : 'Skip'}
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══ STEP 4: AURA ═══ */}
          {step === 4 && (
            <motion.div key="aura" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
              className="flex-1 flex flex-col">
              <h2 className="font-display text-3xl font-bold tracking-tight mb-2">Pick your aura</h2>
              <p className="text-secondary text-sm mb-6">What's your energy right now?</p>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {AURAS.map((a, i) => (
                  <motion.button key={a.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    whileTap={{ scale: 0.95 }} onClick={() => setAura(a.id)}
                    className={`p-4 rounded-2xl text-left transition-all border-2 ${aura === a.id ? 'border-primary-container bg-primary-container/5 shadow-[0_0_15px_rgba(225,29,72,0.1)]' : 'border-surface-variant bg-surface-container-low text-on-surface hover:border-on-surface/20'}`}>
                    <span className="text-2xl mb-1 block">{a.emoji}</span>
                    <span className="font-label-bold text-sm">{a.label}</span>
                  </motion.button>
                ))}
              </div>
              <div className="mt-auto">
                <button onClick={next} className="w-full bg-primary-container text-white rounded-full py-3.5 font-bold shadow-lg">
                  {aura ? 'Continue' : 'Skip'}
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══ STEP 5: INTERESTS ═══ */}
          {step === 5 && (
            <motion.div key="interests" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
              className="flex-1 flex flex-col">
              <h2 className="font-display text-3xl font-bold tracking-tight mb-2">Your interests</h2>
              <p className="text-secondary text-sm mb-6">Pick at least 3 to personalize your experience.</p>
              <div className="flex flex-wrap gap-2.5 mb-6">
                {INTERESTS.map((item, i) => (
                  <motion.button key={item.id} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}
                    whileTap={{ scale: 0.9 }} onClick={() => toggleItem(interests, setInterests, item.id)}
                    className={`px-4 py-2.5 rounded-full text-sm font-label-bold transition-all ${interests.includes(item.id)
                      ? 'bg-primary-container text-white shadow-lg' : 'bg-surface-container-low text-secondary'}`}>
                    {item.icon} {item.label}
                  </motion.button>
                ))}
              </div>
              <p className="text-xs text-secondary mb-4">{interests.length} selected {interests.length < 3 ? '(pick 3+)' : '✓'}</p>
              <div className="mt-auto">
                <button onClick={next} disabled={interests.length < 3}
                  className="w-full bg-primary-container text-white rounded-full py-3.5 font-bold shadow-lg disabled:opacity-40">Continue</button>
              </div>
            </motion.div>
          )}

          {/* ═══ STEP 6: MUSIC + FINISH ═══ */}
          {step === 6 && (
            <motion.div key="music" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
              className="flex-1 flex flex-col">
              <h2 className="font-display text-3xl font-bold tracking-tight mb-2">Music taste</h2>
              <p className="text-secondary text-sm mb-6">What are you listening to lately?</p>
              <div className="flex flex-wrap gap-2.5 mb-8">
                {GENRES.map((g, i) => (
                  <motion.button key={g} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}
                    whileTap={{ scale: 0.9 }} onClick={() => toggleItem(genres, setGenres, g)}
                    className={`px-4 py-2.5 rounded-full text-sm font-label-bold transition-all ${genres.includes(g)
                      ? 'bg-primary-container text-white shadow-lg' : 'bg-surface-container-low text-secondary'}`}>
                    🎵 {g}
                  </motion.button>
                ))}
              </div>
              <div className="mt-auto">
                <motion.button whileTap={{ scale: 0.96 }} onClick={finish}
                  className="w-full bg-gradient-to-r from-primary-container to-pink-500 text-white rounded-full py-4 font-bold text-lg shadow-[0_8px_24px_rgba(225,29,72,0.3)] relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  Enter MisCom ✨
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
