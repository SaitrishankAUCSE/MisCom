import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import TopAppBar from '../components/TopAppBar';
import { useGlobal } from '../context/GlobalContext';
import Avatar from '../components/Avatar';
import { storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function Profile() {
  const navigate = useNavigate();
  const { user, profile, logout, updateProfile, music, addToQueue, permissions, requestMicrophone, requestContacts, refreshProfile } = useGlobal();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showEditAura, setShowEditAura] = useState(false);
  const [showToast, setShowToast] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedBio, setEditedBio] = useState(profile?.bio || '');
  const [uploading, setUploading] = useState(false);

  const AURA_OPTIONS = ['🔥 On Fire', '🎧 Vibing', '🌙 Relaxing', '🎮 Gaming', '✨ Creating', '💭 Thinking'];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleAuraChange = (aura) => {
    updateProfile({ aura });
    setShowEditAura(false);
    setShowToast('Aura updated! ' + aura);
    setTimeout(() => setShowToast(''), 2000);
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;
    
    setUploading(true);
    try {
      const avatarRef = ref(storage, `avatars/${user.uid}`);
      await uploadBytes(avatarRef, file);
      const url = await getDownloadURL(avatarRef);
      
      await updateProfile({ avatar: url });
      setShowToast('Profile picture updated! ✨');
    } catch (err) {
      console.error(err);
      setShowToast('Failed to upload image');
    } finally {
      setUploading(false);
      setTimeout(() => setShowToast(''), 2500);
    }
  };

  const handleSave = async () => {
    await updateProfile({ bio: editedBio });
    setIsEditing(false);
    setShowToast('Profile updated! ✨');
    setTimeout(() => setShowToast(''), 2500);
  };

  const handleAddToQueue = () => {
    addToQueue({ title: 'Urban Horizon', artist: 'Solaris' });
    setShowToast('Added to queue! 🎵');
    setTimeout(() => setShowToast(''), 2000);
  };

  const handlePostToWorld = () => {
    setShowToast('Posted to the world! 🌍✨');
    setTimeout(() => setShowToast(''), 2500);
  };

  const playlist = [
    { title: 'Midnight Echoes', artist: 'The Glitch Mob', playing: true },
    { title: 'Urban Horizon', artist: 'Solaris', playing: false },
    { title: 'Red Sky Drift', artist: 'Luna Wave', playing: false },
  ];

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}
      className="bg-background text-on-background font-body-md min-h-screen pb-24">
      <TopAppBar />

      {/* Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] bg-on-background text-white px-6 py-3 rounded-full font-label-bold text-sm shadow-2xl">
            {showToast}
          </motion.div>
        )}
      </AnimatePresence>

      <main className="pt-24 pb-8 px-margin-safe max-w-5xl mx-auto space-y-8">
        {/* Profile Card */}
        <section className="text-center space-y-4">
          <div className="relative inline-block">
            <div className={`relative ${uploading ? 'opacity-50' : ''}`}>
              <Avatar 
                src={profile?.avatar} 
                alt={profile?.displayName || user?.name} 
                size="xl" 
                border={true}
                online={true}
                showStatus={true}
              />
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-primary-container/30 border-t-primary-container rounded-full animate-spin" />
                </div>
              )}
            </div>
            
            <label className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-primary-container text-white flex items-center justify-center shadow-lg cursor-pointer hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[20px]">photo_camera</span>
              <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} disabled={uploading} />
            </label>
          </div>
          
          <div className="space-y-1">
            <h1 className="font-display text-3xl font-bold">{profile?.displayName || user?.name || 'Alex'}</h1>
            <p className="text-secondary text-sm">@{profile?.username || user?.username}</p>
          </div>
          
          <div className="flex justify-center gap-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowEditAura(true)}
              className="bg-surface-container-low text-on-surface px-4 py-2 rounded-full font-label-bold text-sm inline-flex items-center gap-2 hover:bg-surface-container-high transition-colors"
            >
              {profile?.aura || '🔥 On Fire'} <span className="material-symbols-outlined text-[14px]">expand_more</span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => { setIsEditing(!isEditing); if(!isEditing) setEditedBio(profile?.bio || ''); }}
              className={`px-4 py-2 rounded-full font-label-bold text-sm inline-flex items-center gap-2 transition-colors ${isEditing ? 'bg-primary-container text-white' : 'bg-surface-container-low text-on-surface hover:bg-surface-container-high'}`}
            >
              <span className="material-symbols-outlined text-[16px]">{isEditing ? 'check' : 'edit'}</span>
              {isEditing ? 'Finish' : 'Edit Bio'}
            </motion.button>
          </div>
          
          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-xs mx-auto">
                <textarea
                  value={editedBio}
                  onChange={e => setEditedBio(e.target.value)}
                  placeholder="Tell the world your vibe..."
                  rows={3}
                  className="w-full bg-surface-container-lowest border-2 border-primary-container/20 rounded-2xl px-4 py-3 outline-none focus:border-primary-container transition-all resize-none text-center text-sm"
                />
                <div className="flex gap-2 mt-2">
                  <button onClick={handleSave} className="flex-1 bg-primary-container text-white py-2 rounded-xl font-label-bold text-xs">Save Bio</button>
                  <button onClick={() => setIsEditing(false)} className="flex-1 bg-surface-container-high py-2 rounded-xl font-label-bold text-xs">Cancel</button>
                </div>
              </motion.div>
            ) : (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-secondary text-sm max-w-xs mx-auto italic">
                {profile?.bio || 'No bio yet. Tap edit to share your vibe.'}
              </motion.p>
            )}
          </AnimatePresence>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-3 gap-3">
          {[
            { label: 'Streak', value: `${user?.streakDays || 7}d`, icon: 'local_fire_department' },
            { label: 'Energy', value: `${user?.socialEnergy || 85}%`, icon: 'bolt' },
            { label: 'Chats', value: '4', icon: 'chat_bubble' },
          ].map((stat, i) => (
            <div key={i} className="bg-surface-container-lowest border border-on-background/5 rounded-2xl p-4 text-center">
              <span className="material-symbols-outlined text-primary-container mb-1 block" style={{ fontVariationSettings: "'FILL' 1" }}>{stat.icon}</span>
              <p className="font-headline-md text-lg font-bold">{stat.value}</p>
              <p className="text-label-sm text-secondary text-[10px] uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </section>

        {/* Badges & Achievements */}
        <section className="bg-gradient-to-br from-surface-container-lowest to-surface-container-low border border-on-background/5 rounded-[2rem] p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-container/10 blur-[40px] rounded-full -translate-y-1/2 translate-x-1/2" />
          <h2 className="font-headline-md text-lg flex items-center gap-2 mb-4 relative z-10">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
            Achievements
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide relative z-10">
            {[
              { title: 'Early Adopter', icon: 'star', color: 'text-amber-500', bg: 'bg-amber-500/10' },
              { title: 'Night Owl', icon: 'bedtime', color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
              { title: 'Social Butterfly', icon: 'diversity_3', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
              { title: 'Vibe Master', icon: 'music_note', color: 'text-rose-500', bg: 'bg-rose-500/10' },
            ].map((badge, i) => (
              <motion.div key={i} whileHover={{ scale: 1.05 }} className="flex-shrink-0 w-24 flex flex-col items-center gap-2">
                <div className={`w-16 h-16 rounded-full ${badge.bg} flex items-center justify-center shadow-inner`}>
                  <span className={`material-symbols-outlined text-3xl ${badge.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>{badge.icon}</span>
                </div>
                <span className="text-[10px] font-label-bold text-center text-secondary leading-tight">{badge.title}</span>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Vibe Matrix */}
        <section className="grid grid-cols-2 gap-3">
          <motion.div whileTap={{ scale: 0.98 }} className="bg-gradient-to-bl from-purple-500/10 to-transparent border border-purple-500/20 rounded-[2rem] p-5 relative overflow-hidden flex flex-col justify-end min-h-[140px]">
            <span className="material-symbols-outlined text-purple-500 absolute top-4 right-4 text-3xl opacity-50">auto_awesome</span>
            <div>
              <p className="font-headline-md font-bold text-lg">AI Insights</p>
              <p className="text-xs text-secondary mt-1">Discover your social aura</p>
            </div>
          </motion.div>
          
          <motion.div whileTap={{ scale: 0.98 }} className="bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 rounded-[2rem] p-5 relative overflow-hidden flex flex-col justify-end min-h-[140px]">
            <span className="material-symbols-outlined text-blue-500 absolute top-4 right-4 text-3xl opacity-50">spatial_audio</span>
            <div>
              <p className="font-headline-md font-bold text-lg">Vibe Rooms</p>
              <p className="text-xs text-secondary mt-1">Live audio sessions</p>
            </div>
          </motion.div>
        </section>

        {/* CTA */}
        <section className="bg-primary-fixed/10 border border-primary-fixed/20 rounded-xl p-8 text-center space-y-4">
          <h3 className="font-headline-md text-lg text-primary">Ready to drop a vibe?</h3>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handlePostToWorld}
            className="bg-primary text-on-primary px-12 py-4 rounded-full font-label-bold flex items-center gap-3 active:scale-95 transition-all shadow-xl shadow-primary/20 mx-auto"
          >
            <span className="material-symbols-outlined">send</span>POST TO WORLD
          </motion.button>
        </section>

        {/* Settings / Logout */}
        <section className="flex flex-col gap-3">
          <motion.button whileTap={{ scale: 0.98 }} onClick={() => navigate('/profile-setup')}
            className="w-full flex items-center gap-4 p-4 bg-surface-container-lowest border border-on-background/5 rounded-2xl hover:border-on-background/20 transition-colors">
            <span className="material-symbols-outlined text-secondary">edit</span>
            <span className="font-label-bold text-sm">Edit Profile</span>
            <span className="material-symbols-outlined text-secondary ml-auto text-lg">chevron_right</span>
          </motion.button>
          <motion.button whileTap={{ scale: 0.98 }} onClick={() => navigate('/settings')}
            className="w-full flex items-center gap-4 p-4 bg-surface-container-lowest border border-on-background/5 rounded-2xl hover:border-on-background/20 transition-colors">
            <span className="material-symbols-outlined text-secondary">settings</span>
            <span className="font-label-bold text-sm">Settings</span>
            <span className="material-symbols-outlined text-secondary ml-auto text-lg">chevron_right</span>
          </motion.button>
          <motion.button whileTap={{ scale: 0.98 }} onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center gap-4 p-4 bg-error/5 border border-error/10 rounded-2xl hover:bg-error/10 transition-colors">
            <span className="material-symbols-outlined text-error">logout</span>
            <span className="font-label-bold text-sm text-error">Log Out</span>
          </motion.button>
        </section>
      </main>

      {/* Aura Picker Modal */}
      <AnimatePresence>
        {showEditAura && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-end justify-center"
            onClick={() => setShowEditAura(false)}>
            <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }} transition={{ type: 'spring', damping: 25 }}
              onClick={e => e.stopPropagation()} className="w-full max-w-md bg-surface-container-lowest rounded-t-[2rem] p-6 pb-10">
              <div className="w-12 h-1.5 bg-surface-variant rounded-full mx-auto mb-6" />
              <h2 className="font-headline-md text-headline-md mb-6">Set Your Aura</h2>
              <div className="grid grid-cols-2 gap-3">
                {AURA_OPTIONS.map(aura => (
                  <motion.button key={aura} whileTap={{ scale: 0.95 }} onClick={() => handleAuraChange(aura)}
                    className={`p-4 rounded-2xl border-2 text-left font-label-bold transition-all ${
                      user?.aura === aura ? 'border-primary-container bg-primary-container/5 text-primary-container' : 'border-surface-variant text-on-surface hover:border-on-surface/20'
                    }`}>{aura}</motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Logout Confirm Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center px-6"
            onClick={() => setShowLogoutConfirm(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()} className="w-full max-w-sm bg-surface-container-lowest rounded-[2rem] p-8 text-center shadow-2xl">
              <span className="material-symbols-outlined text-error text-5xl mb-4 block">logout</span>
              <h2 className="font-headline-md text-xl font-bold mb-2">Log out?</h2>
              <p className="text-secondary text-sm mb-6">You'll need to sign in again to access your space.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-3 rounded-full border-2 border-surface-variant font-label-bold text-sm hover:bg-surface-variant/50 transition-colors">Cancel</button>
                <motion.button whileTap={{ scale: 0.95 }} onClick={handleLogout}
                  className="flex-1 py-3 rounded-full bg-error text-white font-label-bold text-sm shadow-lg">Log Out</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
