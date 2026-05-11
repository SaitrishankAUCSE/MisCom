import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGlobal } from '../context/GlobalContext';
import FirebaseSync from '../lib/firebase';
import Backend from '../lib/backend';
import Avatar from '../components/Avatar';

// ── Status terminology (MisCom style) ──
// "beaming"  → sent (message left your device)
// "landed"   → delivered (reached the server / other device)
// "vibed"    → seen/read by the recipient
const STATUS_LABELS = {
  beaming: '✦ Beaming',
  landed: '↯ Landed',
  vibed: '✧ Vibed',
};

function msgUid() { return 'msg-' + Date.now() + Math.random().toString(36).slice(2, 8); }

export default function ChatDetail() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { chats, user, markChatRead, timeAgo, refreshChats } = useGlobal();

  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatMeta, setChatMeta] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const unsubRef = useRef(null);

  // Find this chat — could be local or from Firebase sync
  const chat = chats.find(c => c.id === chatId);

  // Determine if users are friends
  const otherUserId = chatId?.replace('chat-', '').split('-').find(id => id !== user?.uid);
  const areFriends = (() => {
    if (!user || !otherUserId) return false;
    const friends = JSON.parse(localStorage.getItem('miscom_friends') || '{}');
    return (friends[user.uid] || []).includes(otherUserId);
  })();

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

  // Get other user's info
  const otherUser = (() => {
    if (!otherUserId) return null;
    const users = JSON.parse(localStorage.getItem('miscom_users') || '[]');
    return users.find(u => u.uid === otherUserId);
  })();

  // Is this a vibe request (non-friend message)?
  const isVibeRequest = chat?.isRequest && !chat?.requestAccepted;
  const isIncomingRequest = isVibeRequest && chat?.requestFrom !== user?.uid;

  // ── Send Message ──
  const handleSend = async () => {
    if (!newMsg.trim() || !user) return;
    const text = newMsg.trim();
    setNewMsg('');

    const msgId = msgUid();
    const msg = {
      id: msgId,
      senderId: user.uid,
      senderName: user.name || user.username,
      senderAvatar: user.avatar || null,
      text,
      timestamp: Date.now(),
      status: 'beaming',
      type: 'text',
    };

    // Optimistic update
    setMessages(prev => [...prev, msg]);

    // Save to Firebase
    if (FirebaseSync.isReady()) {
      await FirebaseSync.sendMessage(chatId, msg);
      await FirebaseSync.updateMessageStatus(chatId, msgId, 'landed').catch(() => {});

      // Save chat metadata for both users
      const chatMetaData = {
        id: chatId,
        participants: [user.uid, otherUserId],
        lastMessage: text,
        lastMessageTime: Date.now(),
        lastSenderId: user.uid,
        // If not friends, mark as a vibe request
        isRequest: !areFriends,
        requestFrom: user.uid,
        requestAccepted: areFriends,
        // Contact info for both sides
        name: otherUser?.name || otherUser?.username || 'User',
        avatar: otherUser?.avatar || null,
        contactId: otherUserId,
        // Sender info (for the receiver's view)
        senderName: user.name || user.username,
        senderAvatar: user.avatar || null,
      };
      await FirebaseSync.saveChatMeta(chatId, chatMetaData);
    }

    // Update local chat preview
    const allChats = JSON.parse(localStorage.getItem('miscom_chats') || '[]');
    const ci = allChats.findIndex(c => c.id === chatId);
    if (ci !== -1) {
      allChats[ci].lastMessage = text;
      allChats[ci].lastMessageTime = Date.now();
      localStorage.setItem('miscom_chats', JSON.stringify(allChats));
    } else {
      // Create local chat entry if it doesn't exist
      allChats.unshift({
        id: chatId,
        contactId: otherUserId,
        name: otherUser?.name || otherUser?.username || 'User',
        avatar: otherUser?.avatar || null,
        lastMessage: text,
        lastMessageTime: Date.now(),
        unread: 0,
        online: false,
        typing: false,
        isGroup: false,
        isRequest: !areFriends,
        requestFrom: user.uid,
        requestAccepted: areFriends,
        participants: [user.uid, otherUserId],
      });
      localStorage.setItem('miscom_chats', JSON.stringify(allChats));
    }
    refreshChats();
    inputRef.current?.focus();
  };

  // ── Accept Vibe Request ──
  const handleAcceptRequest = async () => {
    // Update local
    const allChats = JSON.parse(localStorage.getItem('miscom_chats') || '[]');
    const ci = allChats.findIndex(c => c.id === chatId);
    if (ci !== -1) {
      allChats[ci].isRequest = false;
      allChats[ci].requestAccepted = true;
      localStorage.setItem('miscom_chats', JSON.stringify(allChats));
    }
    refreshChats();

    // Update Firebase
    if (FirebaseSync.isReady()) {
      await FirebaseSync.acceptVibeChat(chatId);
    }
  };

  // ── Decline Vibe Request ──
  const handleDeclineRequest = async () => {
    // Remove local
    const allChats = JSON.parse(localStorage.getItem('miscom_chats') || '[]');
    localStorage.setItem('miscom_chats', JSON.stringify(allChats.filter(c => c.id !== chatId)));
    refreshChats();

    // Remove from Firebase
    if (FirebaseSync.isReady()) {
      await FirebaseSync.deleteVibeChat(chatId);
    }
    navigate('/chats');
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

  // Determine display name and avatar (show the OTHER person's info)
  const displayName = chat?.name || otherUser?.name || otherUser?.username || 'User';
  const displayAvatar = chat?.avatar || otherUser?.avatar;

  if (!chat && !otherUserId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
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
      className="bg-background min-h-screen flex flex-col"
    >
      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-50 flex items-center gap-3 px-4 h-20 bg-background/90 backdrop-blur-xl border-b border-surface-variant/30">
        <button onClick={() => navigate('/chats')} className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface hover:bg-surface-variant transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar 
            src={displayAvatar} 
            alt={displayName} 
            size="md" 
            online={areFriends}
            showStatus={areFriends}
          />
          <div className="min-w-0">
            <h2 className="font-headline-md text-[16px] font-bold truncate text-on-background">{displayName}</h2>
            <p className="text-xs text-secondary flex items-center gap-1">
              {isIncomingRequest ? (
                <span className="text-primary-container font-label-bold">Vibe Request</span>
              ) : !areFriends && !chat?.requestAccepted ? (
                <span className="text-orange-500 font-label-bold">Not Connected</span>
              ) : (
                <span>{areFriends ? '⚡ Connected' : 'Away'}</span>
              )}
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

      {/* Vibe Request Banner (for non-friends) */}
      {isIncomingRequest && (
        <div className="fixed top-20 left-0 w-full z-40 bg-gradient-to-r from-primary-container/10 to-surface border-b border-primary-container/20 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-container/20 rounded-full flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-primary-container">person_add</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-label-bold">{displayName} wants to vibe with you</p>
              <p className="text-[11px] text-secondary">Accept to start chatting freely</p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleDeclineRequest}
              className="flex-1 py-2 bg-surface-container-low text-error rounded-full text-sm font-label-bold">
              Decline
            </motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleAcceptRequest}
              className="flex-1 py-2 bg-primary-container text-white rounded-full text-sm font-label-bold shadow-lg">
              Accept ⚡
            </motion.button>
          </div>
        </div>
      )}

      {/* Messages */}
      <main className={`flex-1 ${isIncomingRequest ? 'pt-44' : 'pt-24'} pb-24 px-4 overflow-y-auto`}>
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
                    <Avatar 
                      src={msg.senderAvatar} 
                      alt={msg.senderName} 
                      size="xs" 
                      className="mr-2 mt-auto mb-1"
                    />
                  )}

                  <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                    isMe
                      ? 'bg-primary-container text-white rounded-br-md'
                      : 'bg-surface-container-low text-on-surface rounded-bl-md'
                  }`}>
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
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
              <div className="bg-surface-container-low rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1 items-center h-5">
                  {[0, 1, 2].map(i => (
                    <motion.div key={i} className="w-2 h-2 bg-secondary rounded-full"
                      animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input */}
      <div className="fixed bottom-0 left-0 w-full z-50 bg-background/95 backdrop-blur-xl border-t border-surface-variant/30 px-4 py-3">
        {/* If incoming request not yet accepted, block sending */}
        {isIncomingRequest ? (
          <div className="text-center py-2">
            <p className="text-sm text-secondary">Accept the vibe request to reply</p>
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
                placeholder={areFriends ? "Beam a message..." : "Send a vibe request..."}
                className="w-full bg-surface-container-low text-on-background rounded-full px-4 py-3 pr-12 outline-none text-[14px] focus:ring-2 focus:ring-primary-container/30 transition-all"
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
