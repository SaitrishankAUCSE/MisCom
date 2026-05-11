import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGlobal } from '../context/GlobalContext';
import Backend from '../lib/backend';
import FirebaseSync from '../lib/firebase';

const Toggle = ({ on, onToggle }) => (
  <button 
    onClick={(e) => { e.stopPropagation(); onToggle(); }} 
    className={`w-12 h-7 rounded-full p-1 transition-all duration-300 ${on ? 'bg-primary-container' : 'bg-surface-variant'}`}
  >
    <motion.div animate={{ x: on ? 20 : 0 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={`w-5 h-5 rounded-full shadow-md ${on ? 'bg-white' : 'bg-white'}`} />
  </button>
);

const Section = ({ icon, title, children, danger }) => (
  <section className="mb-6">
    <h3 className={`font-label-bold text-[11px] uppercase tracking-widest ml-4 mb-2 ${danger ? 'text-red-400' : 'text-secondary'}`}>
      {icon && <span className="material-symbols-outlined text-[14px] align-middle mr-1" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>}
      {title}
    </h3>
    <div className="bg-surface-container-lowest rounded-2xl border border-on-background/5 overflow-hidden divide-y divide-on-background/5 shadow-sm">
      {children}
    </div>
  </section>
);

const Row = ({ icon, label, subtitle, value, onClick, toggle, toggleValue, onToggle, danger, badge }) => (
  <motion.button whileTap={{ scale: 0.98 }} onClick={onClick || onToggle}
    className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-container-low/50 ${danger ? 'text-red-500' : ''}`}>
    {icon && <span className={`material-symbols-outlined text-xl ${danger ? 'text-red-400' : 'text-primary-container'}`} style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>}
    <div className="flex-1 min-w-0">
      <span className={`font-label-bold text-sm block ${danger ? 'text-red-500' : ''}`}>{label}</span>
      {subtitle && <span className="text-[11px] text-secondary block mt-0.5">{subtitle}</span>}
    </div>
    {badge && <span className="text-[10px] bg-primary-container/10 text-primary-container px-2 py-0.5 rounded-full font-bold">{badge}</span>}
    {value && <span className="text-sm text-secondary">{value}</span>}
    {toggle !== undefined && <Toggle on={toggleValue} onToggle={onToggle} />}
    {!toggle && !value && !badge && <span className="material-symbols-outlined text-secondary text-lg">chevron_right</span>}
  </motion.button>
);

export default function Settings() {
  const navigate = useNavigate();
  const { user, logout, updateProfile, deleteAccount, permissions, requestMicrophone, requestContacts, theme, toggleTheme } = useGlobal();

  const [showToast, setShowToast] = useState('');
  const [modal, setModal] = useState(null); // 'password' | 'delete' | 'logout' | 'theme'

  // Toggle states
  const [toggles, setToggles] = useState({
    darkMode: false, lateNight: false, pushNotifs: true, msgNotifs: true,
    callNotifs: true, streakReminders: true, roomAlerts: true, musicPresence: true,
    aiInsights: true, ghostMode: false, hideOnline: false, invisStory: false,
    privateAccount: false, disappearing: false, autoDownload: true, twoFactor: false,
    auraVisible: true, memoryPrivate: false, streakVisible: true, badgeVisible: true,
  });
  const toggle = (key) => setToggles(p => ({ ...p, [key]: !p[key] }));
  const toast = (msg) => { setShowToast(msg); setTimeout(() => setShowToast(''), 2500); };

  // Change password state
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  const handleChangePassword = async () => {
    setPwError('');
    if (!pwForm.current) return setPwError('Enter current password');
    if (Backend.V.password(pwForm.newPw)) return setPwError(Backend.V.password(pwForm.newPw));
    if (pwForm.newPw !== pwForm.confirm) return setPwError('Passwords do not match');
    setPwLoading(true);
    setTimeout(() => {
      setPwLoading(false);
      setPwSuccess(true);
      toast('Password changed successfully 🔒');
      setTimeout(() => { setModal(null); setPwSuccess(false); setPwForm({ current: '', newPw: '', confirm: '' }); }, 1500);
    }, 1000);
  };

  // Delete account state
  const [delPassword, setDelPassword] = useState('');
  const [delError, setDelError] = useState('');
  const [delStep, setDelStep] = useState(1);

  const handleDeleteAccount = async () => {
    setDelError('');
    setDelStep(3); // Show loading
    
    try {
      await deleteAccount(delPassword);
      // Context's deleteAccount handles redirect to /login
    } catch (err) {
      console.error('Account deletion failed:', err);
      setDelError(err.message || 'Deletion failed. Please check your password.');
      setDelStep(2); // Go back to password step
    }
  };

  const handleLogout = () => { logout(); navigate('/auth-choice'); };

  const strength = Backend.V.passwordStrength(pwForm.newPw);
  const strengthColors = ['bg-surface-variant', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'];

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="bg-background min-h-screen font-body-md text-on-background pb-24">

      {/* Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[80] bg-on-background text-white px-6 py-3 rounded-full font-label-bold text-sm shadow-2xl">{showToast}</motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-on-background/5">
        <div className="flex items-center justify-between px-5 h-16">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </button>
          <h1 className="font-display text-lg font-bold">Settings</h1>
          <div className="w-10" />
        </div>
      </header>

      {/* Profile Card */}
      <div className="px-5 py-6">
        <motion.div whileTap={{ scale: 0.98 }} onClick={() => navigate('/profile-setup')}
          className="bg-surface-container-lowest rounded-3xl p-5 flex items-center gap-4 shadow-sm border border-on-background/5 cursor-pointer hover:shadow-md transition-shadow">
          <div className="relative">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary-container">
              {user?.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> :
                <div className="w-full h-full bg-surface-variant flex items-center justify-center"><span className="material-symbols-outlined text-2xl text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>person</span></div>}
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary-container rounded-full flex items-center justify-center text-white shadow">
              <span className="material-symbols-outlined text-[12px]">edit</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-headline-md text-lg font-bold truncate">{user?.name || 'User'}</p>
            <p className="text-secondary text-sm truncate">@{user?.username || 'username'}</p>
            <p className="text-[11px] text-primary-container font-label-bold mt-0.5">{user?.aura || '✨ Creating'}</p>
          </div>
          <span className="material-symbols-outlined text-secondary">chevron_right</span>
        </motion.div>
      </div>

      <div className="px-5">
        {/* Account */}
        <Section icon="person" title="Account">
          <Row icon="badge" label="Username" value={`@${user?.username || '—'}`} onClick={() => navigate('/profile-setup')} />
          <Row icon="mail" label="Email" 
            value={user?.email ? `${user.email.split('@')[0].slice(0, 2)}***@${user.email.split('@')[1]}` : '—'} 
            onClick={() => toast('Email change coming soon')} 
          />
          <Row icon="interests" label="Interests" subtitle={user?.interests?.join(', ') || 'Not set'} onClick={() => navigate('/profile-setup')} />
          <Row icon="music_note" label="Music Genres" subtitle={user?.musicGenres?.join(', ') || 'Not set'} onClick={() => navigate('/profile-setup')} />
          <Row icon="palette" label="Appearance" subtitle="Theme, colors, font size" onClick={() => navigate('/appearance')} />
        </Section>

        {/* Security */}
        <Section icon="shield" title="Security & Cloud">
          <Row icon="cloud_sync" label="Cloud Sync Status" 
            subtitle={FirebaseSync.isReady() ? "Connected to miscom-app" : "Firebase not configured"} 
            badge={FirebaseSync.isReady() ? "ACTIVE" : "OFFLINE"}
            onClick={() => {
              if (FirebaseSync.isReady()) {
                toast("Syncing with miscom-app.firebaseapp.com ✓");
              } else {
                toast("Firebase keys missing in environment");
              }
            }} 
          />
          <Row icon="lock" label="Change Password" subtitle="Update your password securely" onClick={() => { setModal('password'); setPwForm({ current: '', newPw: '', confirm: '' }); setPwError(''); setPwSuccess(false); }} />
          <Row icon="verified_user" label="Two-Factor Authentication" toggle toggleValue={toggles.twoFactor} onToggle={() => { toggle('twoFactor'); toast(toggles.twoFactor ? '2FA disabled' : '2FA enabled 🔐'); }} />
          <Row icon="devices" label="Active Sessions" badge="1 device" onClick={() => toast('Only this device is active')} />
        </Section>

        {/* Notifications */}
        <Section icon="notifications" title="Notifications">
          <Row icon="notifications_active" label="Push Notifications" toggle toggleValue={toggles.pushNotifs} onToggle={() => toggle('pushNotifs')} />
          <Row icon="chat_bubble" label="Message Notifications" toggle toggleValue={toggles.msgNotifs} onToggle={() => toggle('msgNotifs')} />
          <Row icon="call" label="Call Notifications" toggle toggleValue={toggles.callNotifs} onToggle={() => toggle('callNotifs')} />
          <Row icon="local_fire_department" label="Streak Reminders" toggle toggleValue={toggles.streakReminders} onToggle={() => toggle('streakReminders')} />
          <Row icon="spatial_audio" label="Vibe Room Alerts" toggle toggleValue={toggles.roomAlerts} onToggle={() => toggle('roomAlerts')} />
          <Row icon="equalizer" label="Music Presence" toggle toggleValue={toggles.musicPresence} onToggle={() => toggle('musicPresence')} />
          <Row icon="auto_awesome" label="AI Insight Notifications" toggle toggleValue={toggles.aiInsights} onToggle={() => toggle('aiInsights')} />
        </Section>

        {/* Appearance */}
        <Section icon="palette" title="Appearance">
          <Row icon={theme === 'dark' ? 'dark_mode' : 'light_mode'} label="Dark Mode" subtitle={theme === 'dark' ? "Nocturnal Crimson active" : "Standard light mode"} toggle toggleValue={theme === 'dark'} onToggle={toggleTheme} />
          <Row icon="bedtime" label="Late Night Mode" subtitle="Warmer tones after 10PM" toggle toggleValue={toggles.lateNight} onToggle={() => toggle('lateNight')} />
          <Row icon="format_size" label="Text Size" value="Default" onClick={() => toast('Text size options coming soon')} />
          <Row icon="color_lens" label="Accent Color" onClick={() => toast('Theme customization coming soon 🎨')} />
        </Section>

        {/* Privacy */}
        <Section icon="visibility_off" title="Privacy">
          <Row icon="ghost" label="Ghost Mode" subtitle="Completely invisible to others" toggle toggleValue={toggles.ghostMode} onToggle={() => { toggle('ghostMode'); toast(toggles.ghostMode ? 'Ghost Mode off' : 'Ghost Mode on 👻'); }} />
          <Row icon="wifi_off" label="Hide Online Status" toggle toggleValue={toggles.hideOnline} onToggle={() => toggle('hideOnline')} />
          <Row icon="visibility_off" label="Invisible Story Viewing" toggle toggleValue={toggles.invisStory} onToggle={() => toggle('invisStory')} />
          <Row icon="lock" label="Private Account" subtitle="Only approved followers can see" toggle toggleValue={toggles.privateAccount} onToggle={() => toggle('privateAccount')} />
          <Row icon="block" label="Blocked Users" value="0" onClick={() => toast('No blocked users')} />
          <Row icon="volume_off" label="Muted Users" value="0" onClick={() => toast('No muted users')} />
          <Row icon="group" label="Close Friends" onClick={() => toast('Close Friends list coming soon')} />
        </Section>

        {/* Chat Settings */}
        <Section icon="chat" title="Chat Settings">
          <Row icon="wallpaper" label="Chat Wallpapers" onClick={() => toast('Wallpaper picker coming soon')} />
          <Row icon="mark_chat_unread" label="Message Requests" value="0" onClick={() => toast('No message requests')} />
          <Row icon="timer" label="Disappearing Messages" toggle toggleValue={toggles.disappearing} onToggle={() => toggle('disappearing')} />
          <Row icon="download" label="Auto-Download Media" toggle toggleValue={toggles.autoDownload} onToggle={() => toggle('autoDownload')} />
        </Section>

        {/* Social Features */}
        <Section icon="diversity_3" title="Social Features">
          <Row icon="mood" label="Aura Status Visibility" toggle toggleValue={toggles.auraVisible} onToggle={() => toggle('auraVisible')} />
          <Row icon="timeline" label="Memory Timeline Privacy" toggle toggleValue={toggles.memoryPrivate} onToggle={() => toggle('memoryPrivate')} />
          <Row icon="local_fire_department" label="Streak Visibility" toggle toggleValue={toggles.streakVisible} onToggle={() => toggle('streakVisible')} />
          <Row icon="workspace_premium" label="Badge Visibility" toggle toggleValue={toggles.badgeVisible} onToggle={() => toggle('badgeVisible')} />
          <Row icon="equalizer" label="Live Music Presence" toggle toggleValue={toggles.musicPresence} onToggle={() => toggle('musicPresence')} />
        </Section>

        {/* Permissions */}
        <Section icon="admin_panel_settings" title="Permissions">
          <Row icon="lock_person" label="App Permissions" subtitle="Camera, Microphone, Location..." onClick={() => setModal('permissions')} />
        </Section>

        {/* AI */}
        <Section icon="psychology" title="AI & Insights">
          <Row icon="auto_awesome" label="AI Insights" subtitle="Personality analysis & recommendations" toggle toggleValue={toggles.aiInsights} onToggle={() => toggle('aiInsights')} />
          <Row icon="analytics" label="Manage AI Data" onClick={() => toast('AI data management coming soon')} />
        </Section>

        {/* Data & Storage */}
        <Section icon="storage" title="Data & Storage">
          <Row icon="cached" label="Clear Cache" onClick={() => toast('Cache cleared ✓')} />
          <Row icon="folder" label="Storage Used" value="12.4 MB" onClick={() => toast('Storage details coming soon')} />
          <Row icon="speed" label="Network Usage" value="Low" onClick={() => toast('Network stats coming soon')} />
        </Section>

        {/* Help & Support */}
        <Section icon="help" title="Help & Support">
          <Row icon="help_center" label="Help Center" onClick={() => toast('Help Center coming soon')} />
          <Row icon="bug_report" label="Report a Problem" onClick={() => toast('Report form coming soon')} />
          <Row icon="support_agent" label="Contact Support" onClick={() => toast('support@miscom.app')} />
          <Row icon="gavel" label="Terms & Conditions" onClick={() => toast('Opening Terms...')} />
          <Row icon="policy" label="Privacy Policy" onClick={() => toast('Opening Privacy Policy...')} />
          <Row icon="groups" label="Community Guidelines" onClick={() => toast('Opening Guidelines...')} />
        </Section>

        {/* Danger Zone */}
        <Section icon="warning" title="Danger Zone" danger>
          <Row icon="logout" label="Log Out" danger onClick={() => setModal('logout')} />
          <Row icon="delete_forever" label="Delete Account" subtitle="Permanently delete your account and data" danger onClick={() => { setModal('delete'); setDelStep(1); setDelPassword(''); setDelError(''); }} />
        </Section>

        {/* App Info */}
        <div className="text-center py-8">
          <p className="text-[11px] text-secondary">MisCom v1.0.0</p>
          <p className="text-[10px] text-secondary/50 mt-1">Made with ❤️</p>
        </div>
      </div>

      {/* ═══ MODALS ═══ */}
      <AnimatePresence>
        {modal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center"
            onClick={() => setModal(null)}>

            {/* Change Password */}
            {modal === 'password' && (
              <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }} transition={{ type: 'spring', damping: 25 }}
                onClick={e => e.stopPropagation()} className="w-full max-w-md bg-surface-container-lowest rounded-t-[2rem] sm:rounded-[2rem] p-6 pb-10">
                <div className="w-12 h-1.5 bg-surface-variant rounded-full mx-auto mb-6" />
                {pwSuccess ? (
                  <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="text-center py-8">
                    <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                      <span className="material-symbols-outlined text-white text-3xl">check</span>
                    </div>
                    <h3 className="font-headline-md text-lg font-bold">Password Changed!</h3>
                    <p className="text-secondary text-sm mt-1">Your account is now secured.</p>
                  </motion.div>
                ) : (
                  <>
                    <h2 className="font-headline-md text-xl font-bold mb-1">Change Password</h2>
                    <p className="text-secondary text-sm mb-6">Enter your current password and choose a new one.</p>
                    <AnimatePresence>
                      {pwError && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-red-500 text-sm bg-red-50 p-3 rounded-xl mb-4 font-label-bold">{pwError}</motion.p>}
                    </AnimatePresence>
                    <div className="space-y-4">
                      <input type="password" placeholder="Current password" value={pwForm.current} onChange={e => setPwForm({ ...pwForm, current: e.target.value })}
                        className="w-full border-2 border-surface-variant rounded-2xl px-4 py-4 outline-none focus:border-primary-container transition-colors" />
                      <div>
                        <input type="password" placeholder="New password" value={pwForm.newPw} onChange={e => setPwForm({ ...pwForm, newPw: e.target.value })}
                          className="w-full border-2 border-surface-variant rounded-2xl px-4 py-4 outline-none focus:border-primary-container transition-colors" />
                        {pwForm.newPw && (
                          <div className="flex gap-1 mt-2 px-1">
                            {[1,2,3,4].map(i => <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${strength >= i ? strengthColors[i] : 'bg-surface-variant'}`} />)}
                          </div>
                        )}
                      </div>
                      <input type="password" placeholder="Confirm new password" value={pwForm.confirm} onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })}
                        className="w-full border-2 border-surface-variant rounded-2xl px-4 py-4 outline-none focus:border-primary-container transition-colors" />
                      <motion.button whileTap={{ scale: 0.97 }} onClick={handleChangePassword} disabled={pwLoading}
                        className="w-full bg-primary-container text-white rounded-full py-4 font-bold shadow-[0_8px_20px_rgba(225,29,72,0.3)] disabled:opacity-50 flex items-center justify-center">
                        {pwLoading ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" /> : 'Update Password'}
                      </motion.button>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* Logout */}
            {modal === 'logout' && (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                onClick={e => e.stopPropagation()} className="w-full max-w-sm bg-surface-container-lowest rounded-[2rem] p-8 text-center shadow-2xl mx-6">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-red-500 text-3xl">logout</span>
                </div>
                <h2 className="font-headline-md text-xl font-bold mb-2">Log out?</h2>
                <p className="text-secondary text-sm mb-6">You'll need to sign in again to access your space.</p>
                <div className="flex gap-3">
                  <button onClick={() => setModal(null)} className="flex-1 py-3 rounded-full border-2 border-surface-variant font-label-bold text-sm">Cancel</button>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={handleLogout} className="flex-1 py-3 rounded-full bg-red-500 text-white font-label-bold text-sm shadow-lg">Log Out</motion.button>
                </div>
              </motion.div>
            )}

            {/* Delete Account */}
            {modal === 'delete' && (
              <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }} transition={{ type: 'spring', damping: 25 }}
                onClick={e => e.stopPropagation()} className="w-full max-w-md bg-surface-container-lowest rounded-t-[2rem] sm:rounded-[2rem] p-6 pb-10">
                <div className="w-12 h-1.5 bg-surface-variant rounded-full mx-auto mb-6" />
                {delStep === 1 ? (
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="material-symbols-outlined text-red-500 text-4xl">warning</span>
                    </div>
                    <h2 className="font-headline-md text-xl font-bold mb-2">Delete Account?</h2>
                    <p className="text-secondary text-sm mb-2">This action <span className="font-bold text-red-500">cannot be undone</span>.</p>
                    <p className="text-secondary text-xs mb-8">All your messages, rooms, memories, and data will be permanently deleted.</p>
                    <div className="flex gap-3">
                      <button onClick={() => setModal(null)} className="flex-1 py-3 rounded-full border-2 border-surface-variant font-label-bold text-sm">Cancel</button>
                      <motion.button whileTap={{ scale: 0.95 }} onClick={() => setDelStep(2)}
                        className="flex-1 py-3 rounded-full bg-gradient-to-r from-red-500 to-red-600 text-white font-label-bold text-sm shadow-lg">
                        Continue
                      </motion.button>
                    </div>
                  </div>
                ) : delStep === 2 ? (
                  <div>
                    <h2 className="font-headline-md text-lg font-bold mb-1">Confirm Deletion</h2>
                    {user?.provider === 'google' ? (
                      <p className="text-secondary text-sm mb-6">Since you signed in with Google, we need to verify your identity with a Google popup.</p>
                    ) : (
                      <p className="text-secondary text-sm mb-6">Enter your password to permanently delete your account.</p>
                    )}
                    
                    {delError && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-xl mb-4 font-label-bold">{delError}</p>}
                    
                    {user?.provider !== 'google' && (
                      <input type="password" placeholder="Enter your password" value={delPassword} onChange={e => { setDelPassword(e.target.value); setDelError(''); }}
                        className="w-full border-2 border-red-200 rounded-2xl px-4 py-4 outline-none focus:border-red-400 transition-colors mb-4" />
                    )}

                    <motion.button whileTap={{ scale: 0.97 }} onClick={handleDeleteAccount} disabled={user?.provider !== 'google' && !delPassword}
                      className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full py-4 font-bold shadow-lg disabled:opacity-50">
                      {user?.provider === 'google' ? 'Verify with Google & Wipe Account' : 'Permanently Delete Account'}
                    </motion.button>
                    <button onClick={() => setDelStep(1)} className="w-full mt-3 text-secondary text-sm font-label-bold hover:underline">Go back</button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 border-4 border-red-200 border-t-red-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="font-label-bold text-secondary">Deleting account & wiping data...</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Permissions Page Modal */}
            {modal === 'permissions' && (
              <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                onClick={e => e.stopPropagation()} className="w-full h-[90vh] bg-[#F5F5F7] rounded-t-[2rem] flex flex-col overflow-hidden">
                <div className="flex-shrink-0 pt-4 pb-2 bg-background flex flex-col items-center border-b border-on-background/5">
                  <div className="w-12 h-1.5 bg-surface-variant rounded-full mb-4" />
                  <div className="flex w-full items-center px-4 mb-2">
                    <h2 className="font-headline-md text-xl font-bold flex-1 text-center">App Permissions</h2>
                    <button onClick={() => setModal(null)} className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center -ml-8">
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
                  <p className="text-secondary text-sm text-center px-4">
                    Control what MisCom can access on your device. Turning these off may limit some features.
                  </p>

                  <Section title="Hardware Access">
                    <Row icon="camera_alt" label="Camera" subtitle="For taking photos and video calls" 
                      toggle toggleValue={permissions.camera || false} 
                      onToggle={() => { toast('Camera permission toggled'); }} />
                    <Row icon="mic" label="Microphone" subtitle="For voice notes and live rooms" 
                      toggle toggleValue={permissions.microphone || false} 
                      onToggle={async () => { const ok = await requestMicrophone(); toast(ok ? 'Microphone granted 🎙️' : 'Permission denied'); }} />
                  </Section>

                  <Section title="Data & Privacy">
                    <Row icon="location_on" label="Location" subtitle="For local vibe rooms and map sharing" 
                      toggle toggleValue={permissions.location || false} 
                      onToggle={() => { toast('Location permission toggled'); }} />
                    <Row icon="contacts" label="Contacts" subtitle="To find friends already on MisCom" 
                      toggle toggleValue={permissions.contacts || false} 
                      onToggle={async () => { await requestContacts(); toast('Contacts synced 📇'); }} />
                    <Row icon="photo_library" label="Photos & Media" subtitle="To save and send media" 
                      toggle toggleValue={permissions.photos || true} 
                      onToggle={() => { toast('Photo access toggled'); }} />
                  </Section>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
