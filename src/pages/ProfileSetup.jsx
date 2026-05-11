import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, setDoc, serverTimestamp, getDocs, query, collection, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, FirebaseSync } from '../lib/firebase';
import { useGlobal } from '../context/GlobalContext';
import Logo from '../components/Logo';

export default function ProfileSetup() {
  const { user, refreshProfile, updateProfile } = useGlobal();
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1 = username, 2 = details, 3 = avatar
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  // ── Username validation ──────────────────────────────────────────────────
  const validateUsername = (val) => /^[a-z0-9_.]{3,24}$/.test(val);

  const checkUsernameAvailable = async (val) => {
    if (!FirebaseSync.isReady()) return true;
    const q = query(collection(db, 'users'), where('username', '==', val.toLowerCase()));
    const snap = await getDocs(q);
    return snap.empty;
  };

  // ── Step 1: claim username ────────────────────────────────────────────────
  const handleUsernameNext = async () => {
    setError('');
    const cleaned = username.trim().toLowerCase();
    if (!validateUsername(cleaned)) {
      setError('3–24 characters. Letters, numbers, . and _ only.');
      return;
    }
    setSaving(true);
    const available = await checkUsernameAvailable(cleaned);
    setSaving(false);
    if (!available) { setError('That username is taken.'); return; }
    setUsername(cleaned);
    setStep(2);
  };

  // ── Step 2: display name + bio ───────────────────────────────────────────
  const handleDetailsNext = () => {
    setError('');
    if (!displayName.trim()) { setError('Display name is required.'); return; }
    if (displayName.trim().length > 50) { setError('Display name is too long.'); return; }
    setStep(3);
  };

  // ── Step 3: avatar + final save ──────────────────────────────────────────
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleFinish = async () => {
    setError('');
    setSaving(true);
    try {
      let photoURL = user?.avatar || null;

      if (avatarFile && FirebaseSync.isReady()) {
        const storageRef = ref(storage, `avatars/${user.uid}`);
        await uploadBytes(storageRef, avatarFile);
        photoURL = await getDownloadURL(storageRef);
      }

      const profileData = {
        uid: user.uid,
        email: user.email,
        username: username,
        displayName: displayName.trim(),
        name: displayName.trim(), // Keep 'name' field for compatibility
        bio: bio.trim(),
        avatar: photoURL,
        photoURL: photoURL,
        onboardingCompleted: true,
        updatedAt: serverTimestamp(),
      };

      if (FirebaseSync.isReady()) {
        await setDoc(doc(db, 'users', user.uid), profileData, { merge: true });
      }
      
      // Update local state
      await updateProfile(profileData);
      await refreshProfile();
      
      navigate('/home', { replace: true });
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-10 font-body-md text-on-background relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-primary-container/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 z-0" />
      <div className="absolute bottom-0 left-0 w-[50vw] h-[50vw] bg-primary-container/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/3 z-0" />

      <div className="w-full max-w-md z-10">
        <div className="flex flex-col items-center mb-10">
          <Logo className="w-12 h-12 mb-6" showText={false} />
          <div className="flex gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${step === i ? 'w-8 bg-primary-container' : 'w-2 bg-on-background/10'}`} />
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col gap-6"
            >
              <div>
                <h1 className="font-display text-3xl font-bold mb-2 tracking-tight">Claim your identity</h1>
                <p className="text-on-surface-variant text-base opacity-70">Choose a unique username. This is how you'll be echoed across MisCom.</p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-container font-bold text-xl opacity-50">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={e => { setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '')); setError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleUsernameNext()}
                    placeholder="username"
                    autoFocus
                    className="w-full bg-surface-container-high border-2 border-on-background/5 rounded-2xl pl-10 pr-4 py-4 outline-none focus:border-primary-container transition-all text-lg font-bold"
                  />
                </div>
                <p className="text-[11px] font-label-bold text-on-surface-variant/40 uppercase tracking-widest pl-2">
                  3–24 characters · Letters, numbers, . and _
                </p>
              </div>

              {error && (
                <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
                  <span className="material-symbols-outlined text-base">error</span>
                  {error}
                </div>
              )}

              <button
                onClick={handleUsernameNext}
                disabled={saving || username.length < 3}
                className="w-full bg-primary-container text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-primary-container/20 disabled:opacity-40 transition-all active:scale-95"
              >
                {saving ? 'Validating…' : 'Next Step'}
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col gap-6"
            >
              <div>
                <h1 className="font-display text-3xl font-bold mb-2 tracking-tight">The finishing touch</h1>
                <p className="text-on-surface-variant text-base opacity-70">Your display name is how you'll appear in chats and stories.</p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="text-[11px] font-label-bold text-on-surface-variant/50 uppercase tracking-widest mb-2 block pl-1">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => { setDisplayName(e.target.value); setError(''); }}
                    placeholder="Full Name"
                    className="w-full bg-surface-container-high border-2 border-on-background/5 rounded-2xl px-5 py-4 outline-none focus:border-primary-container transition-all text-lg"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-label-bold text-on-surface-variant/50 uppercase tracking-widest mb-2 block pl-1">Short Bio <span className="opacity-40">(optional)</span></label>
                  <textarea
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    placeholder="Tell the circle a bit about yourself…"
                    rows={3}
                    className="w-full bg-surface-container-high border-2 border-on-background/5 rounded-2xl px-5 py-4 outline-none focus:border-primary-container transition-all text-base resize-none"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
                  <span className="material-symbols-outlined text-base">error</span>
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 h-14 rounded-2xl border-2 border-on-background/5 font-bold hover:bg-on-background/5 transition-colors"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <button
                  onClick={handleDetailsNext}
                  className="flex-1 bg-primary-container text-white h-14 rounded-2xl font-bold text-lg shadow-xl shadow-primary-container/20 active:scale-95 transition-all"
                >
                  Almost there
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col gap-8"
            >
              <div className="text-center">
                <h1 className="font-display text-3xl font-bold mb-2 tracking-tight">Your Visual Aura</h1>
                <p className="text-on-surface-variant text-base opacity-70">Pick a profile picture to represent you.</p>
              </div>

              <div className="flex flex-col items-center gap-6">
                <div className="relative group">
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="w-32 h-32 rounded-full bg-surface-container-highest border-4 border-primary-container/20 overflow-hidden flex items-center justify-center cursor-pointer hover:border-primary-container transition-all relative"
                  >
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-4xl opacity-30">add_a_photo</span>
                    )}
                  </div>
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="absolute bottom-0 right-0 w-10 h-10 bg-primary-container text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-all"
                  >
                    <span className="material-symbols-outlined text-xl">{avatarPreview ? 'edit' : 'add'}</span>
                  </button>
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleFinish}
                  disabled={saving}
                  className="w-full bg-primary-container text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-primary-container/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                  ) : (
                    <>Let's Vibe 🎉</>
                  )}
                </button>
                <button
                  onClick={handleFinish}
                  disabled={saving}
                  className="w-full text-on-surface-variant/60 font-bold uppercase tracking-widest text-xs py-2"
                >
                  Skip for now
                </button>
              </div>

              <button
                onClick={() => setStep(2)}
                className="self-center text-sm font-bold opacity-40 hover:opacity-100 transition-opacity"
              >
                Go Back
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
