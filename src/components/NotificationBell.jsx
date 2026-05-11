import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import Avatar from './Avatar';

export default function NotificationBell({ notifications, unreadCount, markRead, markAllRead }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleNotifClick = (notif) => {
    markRead(notif.id);
    setIsOpen(false);
    if (notif.type === 'dm')   navigate(`/chat/${notif.chatId}`);
    if (notif.type === 'room') navigate(`/room/${notif.roomId}`);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-on-surface/5 transition-colors relative"
      >
        <span className="material-symbols-outlined text-2xl">notifications</span>
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute top-2 right-2 w-4 h-4 bg-primary-container text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-surface"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-12 right-0 w-80 max-h-[480px] overflow-hidden bg-surface-container-high/95 backdrop-blur-xl border border-on-background/10 rounded-2xl shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-on-background/5 flex items-center justify-between">
              <h3 className="font-label-bold text-[15px]">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs font-bold text-primary-container hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <span className="material-symbols-outlined text-on-surface-variant/20 text-4xl mb-2">notifications_off</span>
                  <p className="text-on-surface-variant text-sm">No notifications yet</p>
                </div>
              ) : (
                notifications.map(notif => (
                  <button
                    key={notif.id}
                    onClick={() => handleNotifClick(notif)}
                    className={`w-full p-4 flex items-start gap-3 text-left transition-colors border-b border-on-background/5 hover:bg-on-surface/5 ${!notif.read ? 'bg-primary-container/5' : ''}`}
                  >
                    <div className="relative shrink-0">
                      <Avatar src={notif.senderPhoto} size="w-10 h-10" />
                      {!notif.read && (
                        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary-container rounded-full ring-2 ring-surface" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">
                        <span className="font-bold">{notif.senderName}</span>
                        <span className="text-on-surface-variant">
                          {notif.type === 'dm' ? ' echoed you' : ` in ${notif.roomName}`}
                        </span>
                      </p>
                      <p className="text-xs text-on-surface-variant line-clamp-2 mt-1">{notif.body}</p>
                      <p className="text-[10px] text-on-surface-variant/60 mt-1 uppercase font-bold tracking-tighter">
                        {notif.createdAt?.toDate ? formatDistanceToNow(notif.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
