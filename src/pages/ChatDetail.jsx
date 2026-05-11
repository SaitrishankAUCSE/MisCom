import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGlobal } from '../context/GlobalContext';
import { useChat } from '../hooks/useChat';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import FirebaseSync from '../lib/firebase';
import Avatar from '../components/Avatar';
import MessageBubble from '../components/MessageBubble';
import EchoingIndicator from '../components/EchoingIndicator';

export default function ChatDetail() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { user } = useGlobal();

  const [otherUser, setOtherUser] = useState(null);
  const [inputText, setInputText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const messagesEndRef = useRef(null);

  const {
    messages, loading, isEchoing,
    sendEcho, announceEchoing, clearEchoing,
    addResonance, removeResonance,
  } = useChat(chatId, user?.uid);

  // ── Load other participant ──
  useEffect(() => {
    async function loadOther() {
      if (!FirebaseSync.isReady()) {
        // Fallback to local if Firebase not ready
        const otherId = chatId?.replace('chat-', '').split('-').find(id => id !== user?.uid);
        const users = JSON.parse(localStorage.getItem('miscom_users') || '[]');
        const u = users.find(x => x.uid === otherId);
        if (u) setOtherUser(u);
        return;
      }
      const chatMetaSnap = await getDoc(doc(db, `chat_meta/${chatId}`));
      if (!chatMetaSnap.exists()) return;
      const { participants } = chatMetaSnap.data();
      const otherId = participants.find(id => id !== user.uid);
      if (!otherId) return;
      const otherSnap = await getDoc(doc(db, `users`, otherId));
      if (otherSnap.exists()) setOtherUser({ uid: otherId, ...otherSnap.data() });
    }
    if (chatId && user?.uid) loadOther();
  }, [chatId, user?.uid]);

  // ── Set activeChat for notification suppression & clear unread ──
  useEffect(() => {
    if (!user?.uid || !FirebaseSync.isReady()) return;
    
    // Clear unread count for ME
    updateDoc(doc(db, `chat_meta`, chatId), {
      [`unreadCounts.${user.uid}`]: 0
    }).catch(() => {});

    updateDoc(doc(db, `users`, user.uid), { activeChat: chatId });
    return () => updateDoc(doc(db, `users`, user.uid), { activeChat: null });
  }, [chatId, user?.uid]);

  // ── Auto-scroll to bottom ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isEchoing]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    setReplyTo(null);
    await sendEcho({
      text,
      replyTo: replyTo ? {
        messageId: replyTo.id,
        text:      replyTo.text,
        senderId:  replyTo.senderId,
      } : null,
    });
  };

  const isLastInGroup = (idx) => {
    if (idx === messages.length - 1) return true;
    return messages[idx + 1]?.senderId !== messages[idx].senderId;
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary-container/30 border-t-primary-container rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="bg-background min-h-screen flex flex-col relative">
      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-50 flex items-center gap-3 px-4 h-20 bg-background/80 backdrop-blur-xl border-b border-on-background/5">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface hover:bg-on-surface/5 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar src={otherUser?.avatar || otherUser?.photoURL} size="w-10 h-10" />
          <div className="min-w-0">
            <h2 className="font-label-bold text-[16px] truncate">{otherUser?.name || otherUser?.displayName || otherUser?.username || 'User'}</h2>
            <p className="text-[10px] text-primary-container font-bold uppercase tracking-widest">
              {otherUser?.status === 'present' ? '⚡ Present' : '⚡ Reached'}
            </p>
          </div>
        </div>
        <button className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-on-surface/5">
          <span className="material-symbols-outlined">call</span>
        </button>
        <button className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-on-surface/5">
          <span className="material-symbols-outlined">more_vert</span>
        </button>
      </header>

      {/* Messages Feed */}
      <main className="flex-1 pt-24 pb-32 px-4 overflow-y-auto custom-scrollbar flex flex-col gap-1">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center opacity-20">
            <span className="material-symbols-outlined text-6xl mb-2">auto_awesome</span>
            <p className="text-sm font-label-bold">No echoes yet. Start the resonance.</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isMine={msg.senderId === user.uid}
            isLastInGroup={isLastInGroup(idx)}
            chatId={chatId}
            currentUserId={user.uid}
            onEchoBack={(m) => setReplyTo(m)}
            onAddResonance={addResonance}
            onRemoveResonance={removeResonance}
          />
        ))}

        <EchoingIndicator visible={isEchoing} name={otherUser?.name || otherUser?.displayName} />
        <div ref={messagesEndRef} className="h-4" />
      </main>

      {/* Input Section */}
      <div className="fixed bottom-0 left-0 w-full z-50 bg-background/90 backdrop-blur-2xl border-t border-on-background/5 p-4 pb-safe">
        <AnimatePresence>
          {replyTo && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-3 flex items-center gap-3 bg-on-background/5 rounded-xl p-2 pr-1 overflow-hidden"
            >
              <div className="w-1 h-8 bg-primary-container rounded-full shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-primary-container uppercase tracking-tighter">Echoing back</p>
                <p className="text-xs text-on-surface-variant truncate">{replyTo.text || '📷 Photo'}</p>
              </div>
              <button onClick={() => setReplyTo(null)} className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-3">
          <button className="w-11 h-11 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:bg-on-surface/10 transition-colors shrink-0">
            <span className="material-symbols-outlined">add</span>
          </button>
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputText}
              onChange={(e) => { setInputText(e.target.value); announceEchoing(); }}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
              onBlur={clearEchoing}
              placeholder="Send an echo…"
              className="w-full bg-surface-container-high text-on-surface rounded-3xl pl-5 pr-12 py-3.5 outline-none text-[15px] focus:ring-2 focus:ring-primary-container/20 transition-all border border-on-background/5"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors">
              <span className="material-symbols-outlined">mood</span>
            </button>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            disabled={!inputText.trim()}
            onClick={handleSend}
            className="w-11 h-11 rounded-full bg-primary-container flex items-center justify-center text-white shrink-0 shadow-lg shadow-primary-container/20 disabled:opacity-40 disabled:shadow-none transition-all"
          >
            <span className="material-symbols-outlined text-xl">arrow_upward</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
}
