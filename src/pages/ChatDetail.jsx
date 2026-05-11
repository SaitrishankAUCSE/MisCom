import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGlobal } from '../context/GlobalContext';
import E2E from '../lib/e2e';

export default function ChatDetail() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { getMessages, sendMessage, markChatRead, chats, timeAgo, acceptMessageRequest, deleteMessageRequest, user } = useGlobal();

  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [e2eEnabled] = useState(E2E.isAvailable());
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const chat = chats.find(c => c.id === chatId);

  useEffect(() => {
    if (chatId) {
      const raw = getMessages(chatId);
      // Decrypt messages
      if (e2eEnabled) {
        Promise.all(raw.map(async m => ({
          ...m,
          text: await E2E.decrypt(m.text),
          _encrypted: E2E.isEncrypted(m.text),
        }))).then(setMessages);
      } else {
        setMessages(raw);
      }
      markChatRead(chatId);
    }
  }, [chatId, getMessages, markChatRead, e2eEnabled]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!newMsg.trim()) return;
    const plain = newMsg.trim();
    setNewMsg('');

    // Encrypt before storing
    const toStore = e2eEnabled ? await E2E.encrypt(plain) : plain;
    sendMessage(chatId, toStore);

    // Show decrypted version immediately in UI
    const raw = getMessages(chatId);
    if (e2eEnabled) {
      Promise.all(raw.map(async m => ({
        ...m,
        text: await E2E.decrypt(m.text),
        _encrypted: E2E.isEncrypted(m.text),
      }))).then(setMessages);
    } else {
      setMessages(raw);
    }

    // Show typing indicator then refresh for auto-reply
    setIsTyping(true);
    setTimeout(async () => {
      setIsTyping(false);
      const updated = getMessages(chatId);
      if (e2eEnabled) {
        const decrypted = await Promise.all(updated.map(async m => ({
          ...m,
          text: await E2E.decrypt(m.text),
          _encrypted: E2E.isEncrypted(m.text),
        })));
        setMessages(decrypted);
      } else {
        setMessages(updated);
      }
    }, 2000 + Math.random() * 2000);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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
                <span className="text-primary-container animate-pulse">typing...</span>
              ) : chat.online ? 'Online' : 'Offline'}
              {e2eEnabled && <span className="inline-flex items-center gap-0.5 text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full font-bold ml-1"><span className="material-symbols-outlined text-[10px]">lock</span>E2E</span>}
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
          <AnimatePresence>
            {messages.map((msg, i) => {
              const isMe = msg.sender === 'me';
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2, delay: i * 0.02 }}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                    isMe
                      ? 'bg-primary-container text-white rounded-br-md'
                      : 'bg-surface-container-low text-on-surface rounded-bl-md'
                  }`}>
                    <p className="text-[14px] leading-relaxed">{msg.text}</p>
                    <p className={`text-[10px] mt-1 flex items-center gap-1 ${isMe ? 'text-white/60' : 'text-secondary'}`}>
                      {timeAgo(msg.timestamp)}
                      {msg._encrypted && <span className="material-symbols-outlined text-[10px]">lock</span>}
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
              <p className="text-xs text-secondary mt-1">If you accept, they will be able to see when you've read messages.</p>
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
                placeholder="Type a message..."
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
