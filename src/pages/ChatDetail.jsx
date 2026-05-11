import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGlobal } from '../context/GlobalContext';
import FirebaseSync from '../lib/firebase';

// ── Status terminology (MisCom style) ──
// "beaming"  → sent (message left your device)
// "landed"   → delivered (reached the server / other device)
// "vibed"    → seen/read by the recipient
const STATUS_LABELS = {
  beaming: '✦ Beaming',
  landed: '↯ Landed',
  vibed: '✧ Vibed',
};

function uid() { return 'msg-' + Date.now() + Math.random().toString(36).slice(2, 8); }

export default function ChatDetail() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { chats, user, markChatRead, acceptMessageRequest, deleteMessageRequest, timeAgo, refreshChats } = useGlobal();

  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const unsubRef = useRef(null);

  const chat = chats.find(c => c.id === chatId);

  // ── Real-time listener ──
  useEffect(() => {
    if (!chatId || !user) return;

    // Listen to Firebase for real-time messages
    if (FirebaseSync.isReady()) {
      unsubRef.current = FirebaseSync.listenMessages(chatId, (firebaseMessages) => {
        setMessages(firebaseMessages);

        // Mark unread messages from the other person as "vibed"
        firebaseMessages.forEach(msg => {
          if (msg.senderId !== user.uid && msg.status !== 'vibed') {
            FirebaseSync.updateMessageStatus(chatId, msg.id, 'vibed').catch(() => {});
          }
        });
      });
    }

    markChatRead(chatId);

    return () => {
      if (unsubRef.current) unsubRef.current();
    };
  }, [chatId, user]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send Message ──
  const handleSend = async () => {
    if (!newMsg.trim() || !user) return;
    const text = newMsg.trim();
    setNewMsg('');

    const msgId = uid();
    const msg = {
      id: msgId,
      senderId: user.uid,
      senderName: user.name || user.username,
      senderAvatar: user.avatar || null,
      text,
      timestamp: Date.now(),
      status: 'beaming', // Just sent
      type: 'text',
    };

    // Optimistic update — show immediately
    setMessages(prev => [...prev, msg]);

    // Save to Firebase
    if (FirebaseSync.isReady()) {
      await FirebaseSync.sendMessage(chatId, msg);
      // Update status to "landed" once Firebase confirms
      await FirebaseSync.updateMessageStatus(chatId, msgId, 'landed').catch(() => {});
    }

    // Update local chat preview
    const allChats = JSON.parse(localStorage.getItem('miscom_chats') || '[]');
    const ci = allChats.findIndex(c => c.id === chatId);
    if (ci !== -1) {
      allChats[ci].lastMessage = text;
      allChats[ci].lastMessageTime = Date.now();
      localStorage.setItem('miscom_chats', JSON.stringify(allChats));
      refreshChats();
    }

    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Status icon for sent messages ──
  const StatusIcon = ({ status }) => {
    if (!status) return null;
    const label = STATUS_LABELS[status] || status;
    const color = status === 'vibed' ? 'text-blue-400' : status === 'landed' ? 'text-white/70' : 'text-white/40';
    return <span className={`text-[9px] font-label-bold ${color} ml-1`}>{label}</span>;
  };

  if (!chat) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-surface-variant mb-4">chat_bubble</span>
          <p className="text-secondary">Chat not found</p>
          <button onClick={() => navigate('/chats')} className="mt-4 text-primary-container font-label-bold">Go back</button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="bg-white min-h-screen flex flex-col"
    >
      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-50 flex items-center gap-3 px-4 h-20 bg-white/90 backdrop-blur-xl border-b border-surface-variant/30">
        <button onClick={() => navigate('/chats')} className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface hover:bg-surface-variant transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {chat.avatar ? (
            <div className="relative shrink-0">
              <img src={chat.avatar} alt={chat.name} className="w-10 h-10 rounded-full object-cover" />
              {chat.online && <div className="absolute bottom-0 right-0 w-3 h-3 bg-tertiary-container rounded-full border-2 border-white" />}
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-white text-lg">group</span>
            </div>
          )}
          <div className="min-w-0">
            <h2 className="font-headline-md text-[16px] font-bold truncate">{chat.name}</h2>
            <p className="text-xs text-secondary flex items-center gap-1">
              {chat.isRequest && !chat.requestAccepted && chat.contactId === user?.uid ? (
                <span className="text-primary-container font-label-bold">Message Request</span>
              ) : isTyping ? (
                <span className="text-primary-container animate-pulse">vibing...</span>
              ) : chat.online ? 'In the Zone' : 'Away'}
            </p>
          </div>
        </div>
        <button className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface">
          <span className="material-symbols-outlined">call</span>
        </button>
        <button className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface">
          <span className="material-symbols-outlined">videocam</span>
        </button>
      </header>

      {/* Messages */}
      <main className="flex-1 pt-24 pb-24 px-4 overflow-y-auto">
        <div className="flex flex-col gap-2">
          {/* Date separator */}
          {messages.length > 0 && (
            <div className="text-center my-3">
              <span className="text-[10px] text-secondary bg-surface-container-low px-3 py-1 rounded-full font-label-bold">
                {new Date(messages[0].timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          )}

          <AnimatePresence>
            {messages.map((msg, i) => {
              const isMe = msg.senderId === user?.uid;
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2, delay: i < 20 ? i * 0.02 : 0 }}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  {/* Avatar for received messages */}
                  {!isMe && (
                    <div className="w-7 h-7 rounded-full overflow-hidden bg-surface-variant mr-2 shrink-0 mt-auto mb-1">
                      {msg.senderAvatar ? (
                        <img src={msg.senderAvatar} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-secondary text-sm">person</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                    isMe
                      ? 'bg-primary-container text-white rounded-br-md'
                      : 'bg-surface-container-low text-on-surface rounded-bl-md'
                  }`}>
                    {/* Sender name for group-style context */}
                    {!isMe && msg.senderName && (
                      <p className="text-[11px] font-label-bold text-primary-container mb-1">{msg.senderName}</p>
                    )}
                    <p className="text-[14px] leading-relaxed">{msg.text}</p>
                    <p className={`text-[10px] mt-1 flex items-center gap-1 ${isMe ? 'text-white/60 justify-end' : 'text-secondary'}`}>
                      {timeAgo(msg.timestamp)}
                      {isMe && <StatusIcon status={msg.status} />}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="bg-surface-container-low rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1 items-center h-5">
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 bg-secondary rounded-full"
                      animate={{ y: [0, -6, 0] }}
                      transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input or Request Banner */}
      <div className="fixed bottom-0 left-0 w-full z-50 bg-white/95 backdrop-blur-xl border-t border-surface-variant/30 px-4 py-3">
        {chat.isRequest && !chat.requestAccepted && chat.contactId === user?.uid ? (
          <div className="flex flex-col gap-3 pb-2">
            <div className="text-center pb-2 border-b border-surface-variant/30">
              <p className="font-label-bold text-sm">Accept message request from {chat.name}?</p>
              <p className="text-xs text-secondary mt-1">If you accept, they will be able to see when you've vibed their messages.</p>
            </div>
            <div className="flex gap-2">
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => { deleteMessageRequest(chatId); navigate('/chats'); }}
                className="flex-1 py-2.5 bg-surface-container-low text-error rounded-full text-sm font-label-bold">
                Decline
              </motion.button>
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => acceptMessageRequest(chatId)}
                className="flex-1 py-2.5 bg-primary-container text-white rounded-full text-sm font-label-bold shadow-lg">
                Accept
              </motion.button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-secondary shrink-0 hover:bg-surface-variant transition-colors">
              <span className="material-symbols-outlined text-xl">add</span>
            </button>
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={newMsg}
                onChange={e => setNewMsg(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Beam a message..."
                className="w-full bg-surface-container-low rounded-full px-4 py-3 pr-12 outline-none text-[14px] focus:ring-2 focus:ring-primary-container/30 transition-all"
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined text-xl">mood</span>
              </button>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleSend}
              disabled={!newMsg.trim()}
              className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-white shrink-0 shadow-lg shadow-primary-container/30 disabled:opacity-40 disabled:shadow-none transition-all"
            >
              <span className="material-symbols-outlined text-xl">send</span>
            </motion.button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
