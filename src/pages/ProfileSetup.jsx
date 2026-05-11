import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGlobal } from '../context/GlobalContext';
import { db, storage } from '../lib/firebase';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Logo from '../components/Logo';

export default function ProfileSetup() {
  const navigate = useNavigate();
  const { user, setProfile, refreshProfile } = useGlobal();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Username
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState('idle'); // idle, checking, available, taken, invalid

  // Step 2: Display Name & Bio
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');

  // Step 3: Avatar
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  // Suggested username from email
  useEffect(() => {
    if (user?.email && !username) {
      const suggest = user.email.split('@')[0].replace(/[^a-z0-9_]/g, '').slice(0, 20).toLowerCase();
      setUsername(suggest);
    }
  }, [user]);

  // Username validation (Strict)
  useEffect(() => {
    if (step !== 1) return;
    if (username.length < 3) { setUsernameStatus('idle'); return; }
    
    setUsernameStatus('checking');
    const timer = setTimeout(async () => {
      // 1. Client side check
      if (!/^[a-z0-9_]+$/.test(username)) {
        setUsernameStatus('invalid');
        return;
      }
      // 2. Firestore check for uniqueness
      try {
        const q = query(collection(db, 'users'), where('username', '==', username));
        const snap = await getDocs(q);
        if (snap.empty) {
          setUsernameStatus('available');
        } else {
          // Check if it's the current user's own username (though they shouldn't have one yet)
          const own = snap.docs.find(d => d.id === user?.uid);
          setUsernameStatus(own ? 'available' : 'taken');
        }
      } catch (err) {
        console.error(err);
        setUsernameStatus('idle');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [username, step, user?.uid]);

  const handleNext = () => {
    if (step === 1 && usernameStatus !== 'available') return;
    if (step === 2 && !displayName.trim()) { setError('Display name is required'); return; }
    setError('');
    setStep(step + 1);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be under 5MB');
        return;
      }
      setAvatar(file);
      setAvatarPreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const finalize = async () => {
    setLoading(true);
    setError('');
    try {
      let avatarUrl = avatarPreview || '';

      if (avatar) {
        const avatarRef = ref(storage, `avatars/${user.uid}`);
        await uploadBytes(avatarRef, avatar);
        avatarUrl = await getDownloadURL(avatarRef);
      }

      await updateDoc(doc(db, 'users', user.uid), {
        username: username.toLowerCase(),
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatar: avatarUrl,
        onboardingCompleted: true,
        updatedAt: new Date().getTime()
      });

      await refreshProfile();
      navigate('/home');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="bg-background min-h-screen text-on-background px-6 py-10 flex flex-col font-body-md">
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col">
        
        <header className="flex justify-between items-center mb-10">
          <Logo className="w-8 h-8" showText={false} />
          <div className="flex gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className={`h-1.5 w-8 rounded-full transition-all duration-500 ${step >= i ? 'bg-primary-container' : 'bg-surface-variant'}`} />
            ))}
          </div>
        </header>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col">
              <h1 className="font-display text-3xl font-bold mb-2">Pick a unique username</h1>
              <p className="text-secondary mb-8">This is how people find you. Keep it simple and strictly yours.</p>

              <div className="space-y-4">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-secondary text-lg">@</span>
                  <input 
                    type="text" 
                    value={username} 
                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="username"
                    className={`w-full bg-surface-container-lowest border-2 rounded-2xl pl-10 pr-4 py-4 outline-none transition-all ${
                      usernameStatus === 'available' ? 'border-green-500/50 focus:border-green-500' :
                      usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'border-error/50 focus:border-error' :
                      'border-surface-variant focus:border-primary-container'
                    }`}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {usernameStatus === 'checking' && <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-5 h-5 border-2 border-primary-container/30 border-t-primary-container rounded-full" />}
                    {usernameStatus === 'available' && <span className="material-symbols-outlined text-green-500">check_circle</span>}
                    {(usernameStatus === 'taken' || usernameStatus === 'invalid') && <span className="material-symbols-outlined text-error">cancel</span>}
                  </div>
                </div>

                <div className="px-2">
                  {usernameStatus === 'available' && <p className="text-[11px] text-green-500 font-bold">✓ This username is available</p>}
                  {usernameStatus === 'taken' && <p className="text-[11px] text-error font-bold">✗ Already taken by another vibist</p>}
                  {usernameStatus === 'invalid' && <p className="text-[11px] text-error font-bold">✗ Lowercase letters, numbers, and underscores only</p>}
                  {usernameStatus === 'idle' && username.length > 0 && username.length < 3 && <p className="text-[11px] text-secondary">Minimum 3 characters</p>}
                </div>
              </div>

              <div className="mt-auto pt-10">
                <button 
                  onClick={handleNext} 
                  disabled={usernameStatus !== 'available'}
                  className="w-full bg-primary-container text-white py-4 rounded-full font-bold text-lg shadow-lg disabled:opacity-40 transition-all active:scale-95"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col">
              <h1 className="font-display text-3xl font-bold mb-2">How should we call you?</h1>
              <p className="text-secondary mb-8">Express yourself! Use emojis, spaces, or anything that feels like you. ✨</p>

              <div className="space-y-6">
                <div>
                  <label className="text-xs font-bold text-secondary ml-4 mb-2 block uppercase tracking-wider">Display Name</label>
                  <input 
                    type="text" 
                    value={displayName} 
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="e.g. Alex ✨"
                    maxLength={50}
                    className="w-full bg-surface-container-lowest border-2 border-surface-variant rounded-2xl px-5 py-4 outline-none focus:border-primary-container transition-all text-lg"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-secondary ml-4 mb-2 block uppercase tracking-wider">Bio (Optional)</label>
                  <textarea 
                    value={bio} 
                    onChange={e => setBio(e.target.value)}
                    placeholder="Tell the world your vibe..."
                    maxLength={160}
                    rows={3}
                    className="w-full bg-surface-container-lowest border-2 border-surface-variant rounded-2xl px-5 py-4 outline-none focus:border-primary-container transition-all resize-none"
                  />
                </div>

                {error && <p className="text-error text-sm text-center font-bold">{error}</p>}
              </div>

              <div className="mt-auto pt-10 flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 bg-surface-variant/20 py-4 rounded-full font-bold">Back</button>
                <button 
                  onClick={handleNext} 
                  disabled={!displayName.trim()}
                  className="flex-[2] bg-primary-container text-white py-4 rounded-full font-bold text-lg shadow-lg disabled:opacity-40 transition-all active:scale-95"
                >
                  Next
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col">
              <h1 className="font-display text-3xl font-bold mb-2">Set your vibe</h1>
              <p className="text-secondary mb-8">Upload a profile picture to complete your identity.</p>

              <div className="flex flex-col items-center gap-8 py-4">
                <div className="relative group">
                  <div className="w-40 h-40 rounded-full border-4 border-primary-container/20 p-1">
                    {avatarPreview ? (
                      <img src={avatarPreview} className="w-full h-full rounded-full object-cover" alt="Preview" />
                    ) : (
                      <div className="w-full h-full rounded-full bg-surface-container-lowest flex items-center justify-center text-surface-variant">
                        <span className="material-symbols-outlined text-6xl">person</span>
                      </div>
                    )}
                  </div>
                  <label className="absolute bottom-1 right-1 w-10 h-10 bg-primary-container text-white rounded-full flex items-center justify-center cursor-pointer shadow-xl hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-xl">photo_camera</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                  </label>
                </div>

                <div className="text-center">
                  <h3 className="font-bold text-xl mb-1">{displayName}</h3>
                  <p className="text-primary-container font-bold text-sm">@{username}</p>
                </div>
              </div>

              {error && <p className="text-error text-sm text-center mb-4">{error}</p>}

              <div className="mt-auto pt-10 flex flex-col gap-3">
                <button 
                  onClick={finalize} 
                  disabled={loading}
                  className="w-full bg-primary-container text-white py-4 rounded-full font-bold text-lg shadow-lg flex items-center justify-center gap-2"
                >
                  {loading ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full" /> : 'Complete Setup'}
                </button>
                <button 
                  onClick={finalize} 
                  disabled={loading}
                  className="w-full text-secondary py-3 font-bold hover:text-on-background transition-colors"
                >
                  Skip for now
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
