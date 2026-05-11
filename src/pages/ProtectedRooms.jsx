import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import TopAppBar from '../components/TopAppBar';
import { useGlobal } from '../context/GlobalContext';
import Backend from '../lib/backend';

const CATEGORIES = Backend.protectedRooms._CATEGORIES;
const MOODS = Backend.protectedRooms._MOODS;
const THEME_COLORS = ['#E11D48','#7C3AED','#0EA5E9','#10B981','#F59E0B','#EC4899','#6366F1','#14B8A6'];
const EXPIRY_OPTIONS = [
  { label: 'No Expiry', value: null },
  { label: '1 Hour', value: 3600000 },
  { label: '24 Hours', value: 86400000 },
  { label: '7 Days', value: 604800000 },
];

export default function ProtectedRooms() {
  const navigate = useNavigate();
  const { user } = useGlobal();
  const [rooms, setRooms] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(null);
  const [joinPassword, setJoinPassword] = useState('');
  const [joinError, setJoinError] = useState('');
  const [toast, setToast] = useState('');
  const [filter, setFilter] = useState('my');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Create form
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState('Friends');
  const [mood, setMood] = useState('🔥 Lit');
  const [themeColor, setThemeColor] = useState('#E11D48');
  const [privacy, setPrivacy] = useState('private');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [anonymousMode, setAnonymousMode] = useState(false);
  const [ghostJoin, setGhostJoin] = useState(false);
  const [expiry, setExpiry] = useState(null);
  const [maxMembers, setMaxMembers] = useState(50);
  const [createStep, setCreateStep] = useState(1);

  useEffect(() => { refreshRooms(); }, []);

  const refreshRooms = () => {
    if (filter === 'my') setRooms(Backend.protectedRooms.getMyRooms(user?.uid));
    else if (filter === 'public') setRooms(Backend.protectedRooms.getPublicRooms());
  };

  const handleSearch = (q) => {
    setSearchQuery(q);
    if (!q.trim()) { setSearchResults([]); return; }
    setIsSearching(true);
    setTimeout(() => {
      setSearchResults(Backend.protectedRooms.searchRooms(q));
      setIsSearching(false);
    }, 300);
  };

  useEffect(() => { refreshRooms(); }, [filter, user]);

  const handleCreate = () => {
    if (!name.trim()) return;
    Backend.protectedRooms.create({ name, description: desc, category, mood, themeColor, privacy, password: password || null, anonymousMode, ghostJoinEnabled: ghostJoin, expiry, maxMembers }, user.uid);
    setShowCreate(false);
    resetForm();
    showToast('Room created! ✨');
    refreshRooms();
  };

  const resetForm = () => {
    setName(''); setDesc(''); setCategory('Friends'); setMood('🔥 Lit'); setThemeColor('#E11D48');
    setPrivacy('private'); setPassword(''); setAnonymousMode(false); setGhostJoin(false);
    setExpiry(null); setMaxMembers(50); setCreateStep(1);
  };

  const handleJoin = (roomId) => {
    const result = Backend.protectedRooms.joinRoom(roomId, user.uid, joinPassword);
    if (result.success) {
      setShowJoinModal(null); setJoinPassword(''); setJoinError('');
      showToast('Joined! 🎉');
      refreshRooms();
      navigate(`/room/${roomId}`);
    } else {
      setJoinError(result.error + (result.attemptsLeft !== undefined ? ` (${result.attemptsLeft} left)` : ''));
    }
  };

  const handleRoomTap = (room) => {
    if (room.members?.includes(user?.uid)) {
      navigate(`/room/${room.id}`);
    } else if (room.isPasswordProtected) {
      setShowJoinModal(room); setJoinPassword(''); setJoinError('');
    } else {
      const result = Backend.protectedRooms.joinRoom(room.id, user.uid);
      if (result.success) { showToast('Joined! 🎉'); refreshRooms(); navigate(`/room/${room.id}`); }
      else { showToast(result.error); }
    }
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const timeAgo = (ts) => {
    const d = Date.now() - ts;
    if (d < 60000) return 'Just now';
    if (d < 3600000) return `${Math.floor(d/60000)}m`;
    if (d < 86400000) return `${Math.floor(d/3600000)}h`;
    return `${Math.floor(d/86400000)}d`;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-background text-on-background font-body-md min-h-screen pb-24">
      <TopAppBar />

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] bg-on-background text-white px-6 py-3 rounded-full font-label-bold text-sm shadow-2xl">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <main className="pt-24 px-margin-safe">
        {/* Header */}
        <section className="mb-6">
          <h1 className="font-display text-3xl font-bold tracking-tight mb-1">Secret Spaces</h1>
          <p className="text-secondary text-sm">Password-protected rooms for your inner circle.</p>
        </section>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {[{k:'my',l:'My Rooms'},{k:'find',l:'Find Room'},{k:'public',l:'Discover'}].map(t => (
            <button key={t.k} onClick={() => { setFilter(t.k); setSearchQuery(''); setSearchResults([]); }}
              className={`px-5 py-2.5 rounded-full text-sm font-label-bold transition-all ${filter === t.k ? 'bg-primary-container text-white shadow-lg' : 'bg-surface-container-low text-secondary'}`}>
              {t.l}
            </button>
          ))}
        </div>

        {/* Search Bar — Find Room tab */}
        {filter === 'find' && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-secondary text-xl">search</span>
              <input
                type="text" value={searchQuery} onChange={e => handleSearch(e.target.value)}
                placeholder="Search by room name or paste room ID..."
                className="w-full bg-surface-container-low rounded-2xl pl-12 pr-4 py-4 outline-none text-sm focus:ring-2 focus:ring-primary-container/30 transition-all"
                autoFocus
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setSearchResults([]); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary">
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              )}
            </div>
            {isSearching && (
              <div className="flex items-center justify-center gap-2 py-6 text-secondary text-sm">
                <div className="w-4 h-4 border-2 border-primary-container/30 border-t-primary-container rounded-full animate-spin" />
                Searching...
              </div>
            )}
            {!isSearching && searchQuery && searchResults.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-surface-container-low rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-3xl text-on-surface-variant">search_off</span>
                </div>
                <h3 className="font-headline-md text-[15px] font-bold mb-1">No rooms found</h3>
                <p className="text-secondary text-xs max-w-[220px] mx-auto">Try a different name or paste the exact room ID.</p>
              </div>
            )}
            {!isSearching && searchResults.length > 0 && (
              <div className="flex flex-col gap-3 mt-4">
                <p className="text-xs text-secondary font-label-bold">{searchResults.length} room{searchResults.length > 1 ? 's' : ''} found</p>
                {searchResults.map((room, i) => (
                  <motion.div key={room.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    whileTap={{ scale: 0.98 }} onClick={() => handleRoomTap(room)}
                    className="relative bg-white rounded-[1.5rem] border border-on-background/5 overflow-hidden cursor-pointer hover:border-on-background/15 transition-all shadow-sm">
                    <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${room.themeColor}, ${room.themeColor}88)` }} />
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg font-bold shadow-lg" style={{ background: `linear-gradient(135deg, ${room.themeColor}, ${room.themeColor}99)` }}>
                            {room.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-headline-md text-[15px] font-bold">{room.name}</h3>
                              {room.isPasswordProtected && <span className="material-symbols-outlined text-[14px] text-on-surface-variant">lock</span>}
                            </div>
                            <p className="text-secondary text-xs">{room.category} · {room.mood}</p>
                          </div>
                        </div>
                        {room.members?.includes(user?.uid)
                          ? <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-green-50 text-green-600">Joined</span>
                          : <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-surface-container-low text-on-surface-variant">Tap to join</span>
                        }
                      </div>
                      {room.description && <p className="text-secondary text-sm mb-3 line-clamp-2">{room.description}</p>}
                      <div className="flex items-center gap-3 text-xs text-on-surface-variant">
                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">group</span>{room.memberCount}</span>
                        <span className="font-mono text-[10px] bg-surface-container-low px-2 py-0.5 rounded-full">ID: {room.id}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${room.privacy === 'public' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                          {room.privacy === 'public' ? 'Public' : 'Private'}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Room Cards — shown for my/public tabs only */}
        {filter !== 'find' && <div className="flex flex-col gap-4">
          {rooms.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-surface-container-low rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant">lock</span>
              </div>
              <h3 className="font-headline-md text-headline-md mb-2">{filter === 'my' ? 'No rooms yet' : 'No public rooms'}</h3>
              <p className="text-secondary text-sm max-w-[240px] mx-auto">
                {filter === 'my' ? 'Create a secret space for your crew.' : 'All rooms are currently private.'}
              </p>
            </div>
          ) : rooms.map((room, i) => (
            <motion.div key={room.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              whileTap={{ scale: 0.98 }} onClick={() => handleRoomTap(room)}
              className="relative bg-white rounded-[1.5rem] border border-on-background/5 overflow-hidden cursor-pointer hover:border-on-background/15 transition-all shadow-sm">
              {/* Color accent bar */}
              <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${room.themeColor}, ${room.themeColor}88)` }} />
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg font-bold shadow-lg" style={{ background: `linear-gradient(135deg, ${room.themeColor}, ${room.themeColor}99)` }}>
                      {room.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-headline-md text-[15px] font-bold">{room.name}</h3>
                        {room.isPasswordProtected && <span className="material-symbols-outlined text-[14px] text-on-surface-variant">lock</span>}
                      </div>
                      <p className="text-secondary text-xs">{room.category} · {room.mood}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-on-surface-variant">
                    {room.streak > 0 && <span className="text-orange-500 font-bold">🔥{room.streak}</span>}
                  </div>
                </div>
                {room.description && <p className="text-secondary text-sm mb-3 line-clamp-2">{room.description}</p>}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-on-surface-variant">
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">group</span>{room.memberCount}</span>
                    <span>{timeAgo(room.lastActivity)}</span>
                    {room.anonymousMode && <span className="bg-surface-variant px-2 py-0.5 rounded-full text-[10px] font-bold">ANON</span>}
                    {room.expiry && <span className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full text-[10px] font-bold">TEMP</span>}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${room.privacy === 'public' ? 'bg-green-50 text-green-600' : 'bg-surface-container-low text-on-surface-variant'}`}>
                    {room.privacy === 'public' ? 'Public' : 'Private'}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>}
      </main>

      {/* FAB - Create Room */}
      <motion.button whileTap={{ scale: 0.9 }} onClick={() => { setShowCreate(true); setCreateStep(1); }}
        className="fixed bottom-24 right-6 w-14 h-14 bg-primary-container text-white rounded-full shadow-[0_8px_20px_rgba(225,29,72,0.4)] flex items-center justify-center z-40">
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
      </motion.button>

      {/* ═══ Password Join Modal ═══ */}
      <AnimatePresence>
        {showJoinModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setShowJoinModal(null)}>
            <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 30 }}
              onClick={e => e.stopPropagation()} className="w-full max-w-sm bg-white rounded-[2rem] p-6 shadow-2xl">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white text-2xl font-bold" style={{ background: `linear-gradient(135deg, ${showJoinModal.themeColor}, ${showJoinModal.themeColor}99)` }}>
                <span className="material-symbols-outlined text-3xl">lock</span>
              </div>
              <h2 className="font-headline-md text-center text-lg font-bold mb-1">{showJoinModal.name}</h2>
              <p className="text-secondary text-center text-sm mb-6">Enter the room password to join</p>
              <AnimatePresence>
                {joinError && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="bg-error/10 text-error text-sm px-4 py-2.5 rounded-xl mb-4 text-center font-label-bold">{joinError}</motion.div>
                )}
              </AnimatePresence>
              <div className="relative mb-6">
                <input type={showPw ? 'text' : 'password'} value={joinPassword} onChange={e => { setJoinPassword(e.target.value); setJoinError(''); }}
                  placeholder="Room password" className="w-full bg-surface-container-low rounded-xl px-4 py-3.5 outline-none text-sm focus:ring-2 focus:ring-primary-container/30 pr-12" autoFocus />
                <button onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary">
                  <span className="material-symbols-outlined text-lg">{showPw ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowJoinModal(null)} className="flex-1 py-3 rounded-full bg-surface-container-low text-on-surface font-label-bold text-sm">Cancel</button>
                <button onClick={() => handleJoin(showJoinModal.id)} disabled={!joinPassword}
                  className="flex-1 py-3 rounded-full bg-primary-container text-white font-label-bold text-sm shadow-lg disabled:opacity-50">
                  Unlock
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Create Room Modal ═══ */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-end justify-center" onClick={() => setShowCreate(false)}>
            <motion.div initial={{ y: 500 }} animate={{ y: 0 }} exit={{ y: 500 }} transition={{ type: 'spring', damping: 25 }}
              onClick={e => e.stopPropagation()} className="w-full max-w-md bg-white rounded-t-[2rem] p-6 pb-10 max-h-[85vh] overflow-y-auto">
              <div className="w-12 h-1.5 bg-surface-variant rounded-full mx-auto mb-6" />

              {createStep === 1 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h2 className="font-headline-md text-xl font-bold mb-6">Create a Secret Space</h2>
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="text-xs font-label-bold text-secondary uppercase tracking-wider mb-1.5 block">Room Name *</label>
                      <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Midnight Squad" maxLength={30}
                        className="w-full bg-surface-container-low rounded-xl px-4 py-3.5 outline-none text-sm focus:ring-2 focus:ring-primary-container/30" />
                    </div>
                    <div>
                      <label className="text-xs font-label-bold text-secondary uppercase tracking-wider mb-1.5 block">Description</label>
                      <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="What's this room about?" maxLength={120} rows={2}
                        className="w-full bg-surface-container-low rounded-xl px-4 py-3 outline-none text-sm focus:ring-2 focus:ring-primary-container/30 resize-none" />
                    </div>
                    <div>
                      <label className="text-xs font-label-bold text-secondary uppercase tracking-wider mb-2 block">Category</label>
                      <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map(c => (
                          <button key={c} onClick={() => setCategory(c)}
                            className={`px-3 py-1.5 rounded-full text-xs font-label-bold transition-all ${category === c ? 'bg-primary-container text-white' : 'bg-surface-container-low text-secondary'}`}>{c}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-label-bold text-secondary uppercase tracking-wider mb-2 block">Mood / Aura</label>
                      <div className="flex flex-wrap gap-2">
                        {MOODS.map(m => (
                          <button key={m} onClick={() => setMood(m)}
                            className={`px-3 py-1.5 rounded-full text-xs font-label-bold transition-all ${mood === m ? 'bg-primary-container text-white' : 'bg-surface-container-low text-secondary'}`}>{m}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-label-bold text-secondary uppercase tracking-wider mb-2 block">Theme Color</label>
                      <div className="flex gap-3">
                        {THEME_COLORS.map(c => (
                          <button key={c} onClick={() => setThemeColor(c)}
                            className={`w-8 h-8 rounded-full transition-all ${themeColor === c ? 'ring-2 ring-offset-2 ring-on-background scale-110' : ''}`} style={{ background: c }} />
                        ))}
                      </div>
                    </div>
                    <button onClick={() => setCreateStep(2)} disabled={!name.trim()}
                      className="w-full py-4 bg-primary-container text-white rounded-full font-label-bold text-sm shadow-lg mt-2 disabled:opacity-50">
                      Next — Privacy & Security →
                    </button>
                  </div>
                </motion.div>
              )}

              {createStep === 2 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                  <button onClick={() => setCreateStep(1)} className="flex items-center gap-1 text-sm text-secondary mb-4">
                    <span className="material-symbols-outlined text-lg">arrow_back</span> Back
                  </button>
                  <h2 className="font-headline-md text-xl font-bold mb-6">Privacy & Security</h2>
                  <div className="flex flex-col gap-5">
                    {/* Privacy */}
                    <div>
                      <label className="text-xs font-label-bold text-secondary uppercase tracking-wider mb-2 block">Room Privacy</label>
                      <div className="flex gap-3">
                        {['private','public'].map(p => (
                          <button key={p} onClick={() => setPrivacy(p)}
                            className={`flex-1 py-3 rounded-xl text-sm font-label-bold capitalize transition-all ${privacy === p ? 'bg-primary-container text-white shadow-lg' : 'bg-surface-container-low text-secondary'}`}>
                            <span className="material-symbols-outlined text-lg align-middle mr-1">{p === 'private' ? 'lock' : 'public'}</span>{p}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Password */}
                    <div>
                      <label className="text-xs font-label-bold text-secondary uppercase tracking-wider mb-1.5 block">Room Password (optional)</label>
                      <div className="relative">
                        <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Set a join password"
                          className="w-full bg-surface-container-low rounded-xl px-4 py-3.5 outline-none text-sm focus:ring-2 focus:ring-primary-container/30 pr-12" />
                        <button onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary">
                          <span className="material-symbols-outlined text-lg">{showPw ? 'visibility_off' : 'visibility'}</span>
                        </button>
                      </div>
                      {password && <div className="mt-2 h-1.5 rounded-full bg-surface-variant overflow-hidden"><div className={`h-full rounded-full transition-all ${password.length >= 8 ? 'bg-green-500 w-full' : password.length >= 4 ? 'bg-yellow-400 w-2/3' : 'bg-red-400 w-1/3'}`} /></div>}
                    </div>
                    {/* Max Members */}
                    <div>
                      <label className="text-xs font-label-bold text-secondary uppercase tracking-wider mb-1.5 block">Max Members: {maxMembers}</label>
                      <input type="range" min={2} max={100} value={maxMembers} onChange={e => setMaxMembers(+e.target.value)} className="w-full accent-primary-container" />
                    </div>
                    {/* Expiry */}
                    <div>
                      <label className="text-xs font-label-bold text-secondary uppercase tracking-wider mb-2 block">Room Expiry</label>
                      <div className="flex flex-wrap gap-2">
                        {EXPIRY_OPTIONS.map(o => (
                          <button key={o.label} onClick={() => setExpiry(o.value)}
                            className={`px-3 py-1.5 rounded-full text-xs font-label-bold transition-all ${expiry === o.value ? 'bg-primary-container text-white' : 'bg-surface-container-low text-secondary'}`}>{o.label}</button>
                        ))}
                      </div>
                    </div>
                    {/* Toggles */}
                    <div className="flex items-center justify-between py-3 border-t border-surface-variant/30">
                      <div><p className="font-label-bold text-sm">Anonymous Mode</p><p className="text-xs text-secondary">Hide real usernames</p></div>
                      <button onClick={() => setAnonymousMode(!anonymousMode)} className={`w-12 h-7 rounded-full transition-all ${anonymousMode ? 'bg-primary-container' : 'bg-surface-variant'}`}>
                        <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${anonymousMode ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between py-3 border-t border-surface-variant/30">
                      <div><p className="font-label-bold text-sm">Ghost Join</p><p className="text-xs text-secondary">No join notifications</p></div>
                      <button onClick={() => setGhostJoin(!ghostJoin)} className={`w-12 h-7 rounded-full transition-all ${ghostJoin ? 'bg-primary-container' : 'bg-surface-variant'}`}>
                        <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${ghostJoin ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                    <button onClick={handleCreate} disabled={!name.trim()}
                      className="w-full py-4 bg-primary-container text-white rounded-full font-label-bold text-sm shadow-[0_8px_20px_rgba(225,29,72,0.4)] mt-2 disabled:opacity-50">
                      Create Secret Space ✨
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
