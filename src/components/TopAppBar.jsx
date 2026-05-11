import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGlobal } from '../context/GlobalContext';
import Logo from './Logo';

export default function TopAppBar({ title = 'MisCom', showBack = false, greeting = '' }) {
  const navigate = useNavigate();
  const { user, notifications, unreadNotifCount, markNotificationsRead, markNotificationRead } = useGlobal();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleOpenNotifications = () => {
    setShowNotifications(true);
    setShowSearch(false);
  };

  const handleCloseNotifications = () => {
    setShowNotifications(false);
    markNotificationsRead();
  };

  const timeAgo = (ts) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  return (
    <>
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-margin-safe h-20 bg-surface/80 backdrop-blur-xl border-b border-surface-variant/10">
        <div className="flex items-center gap-2">
          {showBack ? (
            <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface hover:bg-surface-variant transition-colors">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
          ) : (
            <div className="relative cursor-pointer" onClick={() => navigate('/profile')}>
              <div className="w-10 h-10 rounded-full bg-surface-variant border-2 border-primary-container p-0.5 flex items-center justify-center overflow-hidden">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user?.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                )}
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-primary-container rounded-full border-2 border-surface" />
            </div>
          )}
          <div className="flex flex-col">
            {title === 'MisCom' ? (
              <div className="flex items-center -ml-1">
                <Logo className="w-8 h-8" showText={true} layout="horizontal" textColor="text-on-background" />
              </div>
            ) : (
              <span className="font-headline-lg text-headline-lg font-extrabold tracking-tight text-on-background leading-none">{title}</span>
            )}
            {greeting && <span className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">{greeting}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/discover')}
            className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-primary hover:opacity-70 transition-opacity active:scale-95"
          >
            <span className="material-symbols-outlined">search</span>
          </button>
          <button
            onClick={handleOpenNotifications}
            className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface hover:opacity-70 transition-opacity active:scale-95 relative"
          >
            <span className="material-symbols-outlined">notifications</span>
            {unreadNotifCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-primary-container rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-sm"
              >
                {unreadNotifCount}
              </motion.div>
            )}
          </button>
        </div>
      </header>

      {/* Search Overlay */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-20 left-0 w-full z-[55] bg-surface/95 backdrop-blur-xl px-margin-safe py-4 border-b border-surface-variant/20 shadow-lg"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search MisCom..."
              autoFocus
              className="w-full bg-surface-container-low rounded-full px-5 py-3 outline-none text-[14px] focus:ring-2 focus:ring-primary-container/30 transition-all"
            />
            {searchQuery && (
              <div className="mt-3 space-y-2">
                {['Chats', 'Vibe Rooms', 'Music', 'AI Insights'].filter(item =>
                  item.toLowerCase().includes(searchQuery.toLowerCase())
                ).map(result => (
                  <motion.button
                    key={result}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      const paths = { 'Chats': '/chats', 'Vibe Rooms': '/vibe-rooms', 'Music': '/music', 'AI Insights': '/ai-insights' };
                      navigate(paths[result]);
                      setShowSearch(false);
                      setSearchQuery('');
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-surface-container-low transition-colors text-left"
                  >
                    <span className="material-symbols-outlined text-secondary text-lg">search</span>
                    <span className="font-label-bold text-sm">{result}</span>
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications Panel */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm"
            onClick={handleCloseNotifications}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              onClick={e => e.stopPropagation()}
              className="absolute right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-surface-variant/20">
                <h2 className="font-headline-md text-xl font-bold">Notifications</h2>
                <button onClick={handleCloseNotifications} className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {notifications && notifications.length > 0 ? notifications.map((notif) => (
                  <motion.div
                    key={notif.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => markNotificationRead(notif.id)}
                    className={`flex items-start gap-3 p-4 rounded-2xl cursor-pointer transition-colors ${
                      notif.read ? 'bg-transparent hover:bg-surface-container-low' : 'bg-primary-container/5 hover:bg-primary-container/10'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      notif.read ? 'bg-surface-container-low' : 'bg-primary-container/10'
                    }`}>
                      <span className={`material-symbols-outlined text-lg ${notif.read ? 'text-secondary' : 'text-primary-container'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                        {notif.icon || 'notifications'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-label-bold text-sm">{notif.title}</p>
                      <p className="text-secondary text-xs truncate">{notif.body}</p>
                      <p className="text-[10px] text-secondary mt-1">{timeAgo(notif.time)}</p>
                    </div>
                    {!notif.read && <div className="w-2 h-2 bg-primary-container rounded-full mt-2 shrink-0" />}
                  </motion.div>
                )) : (
                  <div className="text-center py-16">
                    <span className="material-symbols-outlined text-5xl text-surface-variant mb-4 block">notifications_off</span>
                    <p className="text-secondary font-label-bold">No notifications</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
