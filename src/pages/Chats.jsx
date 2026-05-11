import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import TopAppBar from '../components/TopAppBar';
import { useGlobal } from '../context/GlobalContext';
import Avatar from '../components/Avatar';

export default function Chats() {
  const navigate = useNavigate();
  const { user, getRegularChats, getIncomingMessageRequests, deleteChat, timeAgo } = useGlobal();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [swipedChatId, setSwipedChatId] = useState(null);
  const [viewingRequests, setViewingRequests] = useState(false);

  const allChats = JSON.parse(localStorage.getItem('miscom_chats') || '[]');
  
  // Regular chats: either not a request, or request accepted, or sent by me
  const regularChats = allChats.filter(c => {
    if (!c.participants || !c.participants.includes(user?.uid)) {
      // Legacy chats without participants — keep for backwards compat
      if (!c.isRequest) return true;
      if (c.requestAccepted) return true;
      if (c.requestFrom === user?.uid) return true;
      return false;
    }
    if (!c.isRequest) return true;
    if (c.requestAccepted) return true;
    if (c.requestFrom === user?.uid) return true; // I sent it, show it to me
    return false;
  });

  // Vibe Requests: incoming requests from non-friends
  const vibeRequests = allChats.filter(c => {
    if (!c.isRequest || c.requestAccepted) return false;
    if (c.requestFrom === user?.uid) return false; // I sent this, not a request TO me
    if (c.participants && !c.participants.includes(user?.uid)) return false;
    return true;
  });
  
  const currentList = viewingRequests ? vibeRequests : regularChats;

  const filteredChats = currentList.filter(chat =>
    (chat.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (chat.senderName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = (chatId) => {
    deleteChat(chatId);
    setSwipedChatId(null);
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}
      className="bg-background text-on-background font-body-md min-h-screen pb-24">
      <TopAppBar greeting="Messages" />
      <main className="pt-24 px-margin-safe">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {viewingRequests && (
              <button onClick={() => setViewingRequests(false)} className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface hover:bg-surface-variant transition-colors">
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
            )}
            <h2 className="font-display text-display text-on-background">
              {viewingRequests ? 'Requests' : 'Chats'}
            </h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface hover:bg-surface-variant transition-colors"
            >
              <span className="material-symbols-outlined">{showSearch ? 'close' : 'search'}</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-4"
            >
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                autoFocus
                className="w-full bg-surface-container-low rounded-full px-5 py-3 outline-none text-[14px] focus:ring-2 focus:ring-primary-container/30 transition-all"
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between mb-6">
          <p className="font-body-lg text-body-lg text-secondary">{filteredChats.length} {viewingRequests ? 'requests' : 'conversations'}</p>
          {!viewingRequests && vibeRequests.length > 0 && (
            <button onClick={() => setViewingRequests(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-low text-primary-container rounded-full text-sm font-label-bold hover:bg-surface-variant transition-colors">
              <span className="material-symbols-outlined text-sm">mark_email_unread</span>
              {vibeRequests.length} Vibe {vibeRequests.length === 1 ? 'Request' : 'Requests'}
            </button>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <AnimatePresence>
            {filteredChats.map((chat, i) => (
              <motion.div
                key={chat.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: i * 0.05 }}
                className="relative"
              >
                {/* Delete button behind */}
                {swipedChatId === chat.id && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => handleDelete(chat.id)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-error flex items-center justify-center text-white z-10 shadow-lg"
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </motion.button>
                )}

                <motion.div
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/chat/${chat.id}`)}
                  onDoubleClick={() => setSwipedChatId(swipedChatId === chat.id ? null : chat.id)}
                  className="flex items-center p-4 bg-surface-container-lowest rounded-[1.5rem] border border-on-background/5 cursor-pointer hover:border-on-background/20 transition-colors relative z-20"
                >
                  <div className="relative mr-4 shrink-0">
                    {chat.isGroup ? (
                      <div className="w-14 h-14 rounded-full bg-primary-container flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-2xl">group</span>
                      </div>
                    ) : (
                      <Avatar 
                        src={viewingRequests ? (chat.senderAvatar || chat.avatar) : chat.avatar} 
                        alt={chat.name} 
                        size="lg" 
                        online={chat.online}
                        showStatus={!viewingRequests && chat.online}
                        fallbackIcon={viewingRequests ? 'person_add' : 'person'}
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h3 className="font-headline-md text-[16px] font-bold truncate">{viewingRequests ? (chat.senderName || chat.name) : chat.name}</h3>
                      <span className="font-label-sm text-label-sm text-on-surface-variant shrink-0 ml-2">{timeAgo(chat.lastMessageTime)}</span>
                    </div>
                    <p className={`font-body-md text-[14px] truncate ${chat.typing ? 'text-primary-container animate-pulse italic' : 'text-on-surface-variant'}`}>
                      {chat.typing ? 'vibing...' : (viewingRequests ? '✦ Wants to vibe with you' : chat.lastMessage)}
                    </p>
                  </div>
                  {(() => {
                    const unread = chat.unreadCounts?.[user?.uid] || chat.unread || 0;
                    if (unread > 0) {
                      return (
                        <div className="ml-4">
                          <div className="w-6 h-6 bg-primary-container rounded-full flex items-center justify-center font-label-sm text-[10px] text-on-primary shadow-sm font-bold animate-pulse">
                            {unread}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </motion.div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredChats.length === 0 && (
            <div className="text-center py-16">
              <span className="material-symbols-outlined text-5xl text-surface-variant mb-4 block">
                {viewingRequests ? 'mark_email_read' : 'chat_bubble'}
              </span>
              <p className="text-secondary font-label-bold">
                {viewingRequests ? 'No message requests' : 'No conversations found'}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* FAB - New Chat */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => navigate('/discover')}
        className="fixed bottom-24 right-6 w-14 h-14 bg-primary-container text-white rounded-full shadow-[0_8px_20px_rgba(225,29,72,0.4)] flex items-center justify-center z-40 hover:shadow-[0_12px_25px_rgba(225,29,72,0.5)] transition-shadow"
      >
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>edit</span>
      </motion.button>
    </motion.div>
  );
}
