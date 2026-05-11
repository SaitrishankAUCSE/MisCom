import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import TopAppBar from '../components/TopAppBar';
import { useGlobal } from '../context/GlobalContext';
import Backend, { AVATARS } from '../lib/backend';

export default function Discover() {
  const navigate = useNavigate();
  const { user, socialVersion } = useGlobal();
  const [tab, setTab] = useState('discover');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [requests, setRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [toast, setToast] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  // Refresh when user changes OR when Firebase sync pushes new social data
  useEffect(() => { refreshData(); }, [user, socialVersion]);

  // Polling fallback — re-check every 3s for new requests
  useEffect(() => {
    const interval = setInterval(() => refreshData(), 3000);
    return () => clearInterval(interval);
  }, [user]);

  const refreshData = () => {
    if (!user) return;
    setRequests(Backend.social.getIncomingRequests(user.uid));
    setFriends(Backend.social.getFriends(user.uid));
  };

  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (query.length >= 2 && user) {
      // First try local search
      const localResults = Backend.social.searchUsers(query, user.uid);
      setResults(localResults);
      
      // If local found nothing, try Firebase directly
      if (localResults.length === 0) {
        setSearching(true);
        import('../lib/firebase').then(({ default: FirebaseSync }) => {
          if (FirebaseSync.isReady()) {
            FirebaseSync.searchUsers(query, user.uid).then(fbResults => {
              if (fbResults.length > 0) {
                // Deduplicate: normally we filter out current user, but keeping for now to verify data
                const filtered = fbResults; // fbResults.filter(r => r.uid !== user.uid || r.username !== user.username);
                setResults(prev => {
                  const merged = [...prev];
                  filtered.forEach(fr => {
                    if (!merged.find(m => m.uid === fr.uid)) merged.push(fr);
                  });
                  return merged;
                });
              }
              setSearching(false);
            }).catch(() => setSearching(false));
          } else {
            setSearching(false);
          }
        });
      }
    } else {
      setResults([]);
    }
  }, [query, user, socialVersion]);

  const handleConnect = (toId) => {
    setActionLoading(toId);
    const r = Backend.social.sendRequest(user.uid, toId);
    if (r.success) { showToast('Vibe Request sent ✨'); refreshData(); }
    else showToast(r.error);
    setTimeout(() => setActionLoading(null), 300);
  };

  const handleSync = (reqId) => {
    setActionLoading(reqId);
    const r = Backend.social.acceptRequest(user.uid, reqId);
    if (r.success) { showToast('Synced! You\'re now connected ⚡'); refreshData(); }
    setTimeout(() => setActionLoading(null), 300);
  };

  const handleIgnore = (reqId) => {
    Backend.social.declineRequest(user.uid, reqId);
    showToast('Request ignored');
    refreshData();
  };

  const getStatus = (uid) => Backend.social.getRequestStatus(user.uid, uid);
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };
  const reqCount = requests.length;

  // Snapchat-style: "Quick Add" suggestions — show all other users not yet connected
  const quickAdd = (() => {
    if (!user) return [];
    const allUsers = Backend.auth.getAllUsers();
    const friendIds = friends.map(f => f.uid);
    const outgoing = Backend.social.getOutgoingRequests(user.uid).map(r => r.to);
    const incoming = requests.map(r => r.from);
    
    const results = allUsers
      .filter(u => u.uid !== user.uid && 
                   u.username !== user.username && 
                   !friendIds.includes(u.uid) && 
                   !outgoing.includes(u.uid) && 
                   !incoming.includes(u.uid))
      .map(u => ({ uid: u.uid, username: u.username, name: u.name, avatar: u.avatar, aura: u.aura }));
      
    // Deduplicate by username
    const unique = [];
    const seen = new Set();
    for (const r of results) {
      if (!seen.has(r.username)) {
        seen.add(r.username);
        unique.push(r);
      }
    }
    return unique;
  })();

  const StatusButton = ({ uid, small }) => {
    const status = getStatus(uid);
    const base = small ? 'px-3 py-1.5 text-[11px]' : 'px-4 py-2 text-xs';
    
    if (uid === user.uid) {
      return <span className={`${base} rounded-full bg-surface-container-low text-secondary font-label-bold`}>It's You</span>;
    }

    // Instead of just showing "Synced", let's give them a message button for friends
    if (status === 'friends') {
      return (
        <motion.button whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); navigate(`/chat/chat-${[user.uid, uid].sort().join('-')}`); }}
          className={`${base} rounded-full bg-surface-container-low text-on-surface font-label-bold flex items-center gap-1`}>
          Message
        </motion.button>
      );
    }
    
    if (status === 'sent') return <span className={`${base} rounded-full bg-surface-container-low text-secondary font-label-bold`}>Requested</span>;
    if (status === 'received') {
      const req = requests.find(r => r.from === uid);
      return (
        <div className="flex gap-1.5">
          <motion.button whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); handleSync(req?.id); }}
            className={`${base} rounded-full bg-primary-container text-white font-label-bold shadow-lg`}>Accept</motion.button>
          <button onClick={(e) => { e.stopPropagation(); handleIgnore(req?.id); }}
            className={`${base} rounded-full bg-surface-container-low text-secondary font-label-bold`}>✕</button>
        </div>
      );
    }
    return (
      <div className="flex gap-2">
        <motion.button whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); handleConnect(uid); }}
          disabled={actionLoading === uid}
          className={`${base} rounded-full bg-primary-container text-white font-label-bold shadow-lg disabled:opacity-50`}>
          {actionLoading === uid ? '...' : '+ Connect'}
        </motion.button>
      </div>
    );
  };

  const UserCard = ({ u, delay = 0 }) => {
    const { createOrGetDM } = useGlobal();
    
    const handleCardClick = () => {
      if (u.uid === user.uid) return; // Can't message yourself
      
      // Instagram style: clicking a user goes to their DM. If not friends, it's a request.
      const chatId = createOrGetDM(u.uid);
      navigate(`/chat/${chatId}`);
    };
    
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
        onClick={handleCardClick}
        className={`flex items-center justify-between p-4 bg-white rounded-2xl border border-on-background/5 shadow-sm transition-colors ${u.uid === user.uid ? '' : 'cursor-pointer hover:bg-surface-container-lowest'}`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative shrink-0">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-surface-variant ring-2 ring-primary-container/20 ring-offset-1">
            {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" /> : (
              <div className="w-full h-full flex items-center justify-center"><span className="material-symbols-outlined text-secondary">person</span></div>
            )}
          </div>
        </div>
        <div className="min-w-0">
          <h3 className="font-label-bold text-sm truncate">{u.name || u.username}</h3>
          <p className="text-[11px] text-secondary truncate">@{u.username}{u.aura ? ` · ${u.aura}` : ''}</p>
        </div>
      </div>
      <StatusButton uid={u.uid} />
    </motion.div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-background text-on-background font-body-md min-h-screen pb-24">
      <TopAppBar />

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -30, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] bg-on-background text-white px-6 py-3 rounded-full font-label-bold text-sm shadow-2xl">{toast}</motion.div>
        )}
      </AnimatePresence>

      <main className="pt-24 px-margin-safe">
        {/* Search bar — always visible */}
        <div className="relative mb-5">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-secondary text-lg">search</span>
          <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Find your people..."
            className="w-full bg-surface-container-low rounded-full pl-11 pr-10 py-3.5 outline-none text-sm focus:ring-2 focus:ring-primary-container/30 transition-all" />
          {query && <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary"><span className="material-symbols-outlined text-lg">close</span></button>}
        </div>

        {/* Search Results (overlay-style when searching) */}
        {query.length >= 2 ? (
          <div>
            <h2 className="font-label-bold text-xs text-secondary uppercase tracking-wider mb-3">Search Results</h2>
            {results.length === 0 ? (
              <div className="text-center py-10">
                {searching ? (
                  <>
                    <div className="w-8 h-8 border-2 border-primary-container/30 border-t-primary-container rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-secondary text-sm">Searching cloud...</p>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-4xl text-surface-variant mb-2 block">person_search</span>
                    <p className="text-secondary text-sm">No one found for "{query}"</p>
                  </>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {results.map((u, i) => <UserCard key={u.uid} u={u} delay={i * 0.04} />)}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide">
              {[
                { k: 'discover', l: 'Quick Add', icon: 'person_add' },
                { k: 'requests', l: reqCount ? `Vibe Requests (${reqCount})` : 'Vibe Requests', icon: 'notifications' },
                { k: 'circle', l: `My Circle (${friends.length})`, icon: 'group' },
              ].map(t => (
                <button key={t.k} onClick={() => setTab(t.k)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-label-bold whitespace-nowrap transition-all ${
                    tab === t.k ? 'bg-primary-container text-white shadow-lg' : 'bg-surface-container-low text-secondary'
                  }`}>
                  <span className="material-symbols-outlined text-[16px]">{t.icon}</span>{t.l}
                </button>
              ))}
            </div>

            {/* ═══ QUICK ADD (Snapchat-style) ═══ */}
            {tab === 'discover' && (
              <div>
                {reqCount > 0 && (
                  <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setTab('requests')}
                    className="w-full mb-5 p-4 bg-gradient-to-r from-primary-container to-primary-container/80 text-white rounded-2xl flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined">person_add</span>
                      </div>
                      <div className="text-left">
                        <p className="font-label-bold text-sm">{reqCount} Vibe {reqCount === 1 ? 'Request' : 'Requests'}</p>
                        <p className="text-white/70 text-xs">Tap to review</p>
                      </div>
                    </div>
                    <span className="material-symbols-outlined">chevron_right</span>
                  </motion.button>
                )}

                <h2 className="font-label-bold text-xs text-secondary uppercase tracking-wider mb-3">Quick Add</h2>
                {quickAdd.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-surface-container-low rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="material-symbols-outlined text-3xl text-on-surface-variant">explore</span>
                    </div>
                    <h3 className="font-headline-md mb-1">All caught up!</h3>
                    <p className="text-secondary text-sm max-w-[220px] mx-auto">No new people to connect with right now. Invite friends to join MisCom!</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {quickAdd.map((u, i) => <UserCard key={u.uid} u={u} delay={i * 0.04} />)}
                  </div>
                )}
              </div>
            )}

            {/* ═══ VIBE REQUESTS ═══ */}
            {tab === 'requests' && (
              <div>
                {requests.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 bg-surface-container-low rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="material-symbols-outlined text-3xl text-on-surface-variant">inbox</span>
                    </div>
                    <h3 className="font-headline-md mb-1">No pending requests</h3>
                    <p className="text-secondary text-sm">When someone sends a Vibe Request, it shows here.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {requests.map((req, i) => (
                      <motion.div key={req.id} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                        className="p-4 bg-white rounded-2xl border border-on-background/5 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-14 h-14 rounded-full overflow-hidden bg-surface-variant ring-2 ring-primary-container/20 ring-offset-1">
                            {req.fromUser?.avatar ? <img src={req.fromUser.avatar} className="w-full h-full object-cover" /> : (
                              <div className="w-full h-full flex items-center justify-center"><span className="material-symbols-outlined text-secondary text-xl">person</span></div>
                            )}
                          </div>
                          <div>
                            <h3 className="font-label-bold text-[15px]">{req.fromUser?.name || 'User'}</h3>
                            <p className="text-xs text-secondary">@{req.fromUser?.username}{req.fromUser?.aura ? ` · ${req.fromUser.aura}` : ''}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleSync(req.id)}
                            className="flex-1 py-3 bg-primary-container text-white rounded-full text-sm font-label-bold shadow-lg">
                            Sync ⚡
                          </motion.button>
                          <button onClick={() => handleIgnore(req.id)}
                            className="flex-1 py-3 bg-surface-container-low text-secondary rounded-full text-sm font-label-bold">
                            Ignore
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ═══ MY CIRCLE ═══ */}
            {tab === 'circle' && (
              <div>
                {friends.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 bg-surface-container-low rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="material-symbols-outlined text-3xl text-on-surface-variant">group</span>
                    </div>
                    <h3 className="font-headline-md mb-1">Your circle is empty</h3>
                    <p className="text-secondary text-sm">Connect with people to build your circle!</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {friends.map((f, i) => (
                      <motion.div key={f.uid} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                        onClick={() => { const chatId = 'chat-' + [user.uid, f.uid].sort().join('-'); navigate(`/chat/${chatId}`); }}
                        className="flex items-center justify-between p-4 bg-white rounded-2xl border border-on-background/5 shadow-sm cursor-pointer hover:border-primary-container/20 transition-all">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-full overflow-hidden bg-surface-variant ring-2 ring-green-400/30 ring-offset-1 shrink-0">
                            {f.avatar ? <img src={f.avatar} className="w-full h-full object-cover" /> : (
                              <div className="w-full h-full flex items-center justify-center"><span className="material-symbols-outlined text-secondary">person</span></div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-label-bold text-sm truncate">{f.name || f.username}</h3>
                            <p className="text-[11px] text-green-600 font-label-bold">Synced ⚡</p>
                          </div>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-primary-container/10 flex items-center justify-center text-primary-container shrink-0">
                          <span className="material-symbols-outlined text-lg">chat</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </motion.div>
  );
}
