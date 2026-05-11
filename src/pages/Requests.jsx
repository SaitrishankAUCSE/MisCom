import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGlobal } from '../context/GlobalContext';
import TopAppBar from '../components/TopAppBar';
import Avatar from '../components/Avatar';

export default function Requests() {
  const navigate = useNavigate();
  const { 
    user, 
    getVibeRequests, 
    getIncomingMessageRequests, 
    acceptVibeRequest, 
    rejectVibeRequest,
    acceptMessageRequest,
    deleteMessageRequest,
    createOrGetDM,
    timeAgo
  } = useGlobal();

  const vibeRequests = getVibeRequests();
  const messageRequests = getIncomingMessageRequests();
  const total = vibeRequests.length + messageRequests.length;

  const [activeTab, setActiveTab] = useState('vibes'); // 'vibes' | 'messages'

  const handleAcceptVibe = async (id) => {
    const res = await acceptVibeRequest(id);
    if (res?.success) {
      navigate('/discover', { state: { tab: 'circle' } });
    }
  };

  const handleRejectVibe = async (id) => {
    await rejectVibeRequest(id);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="bg-background min-h-screen pb-24"
    >
      <TopAppBar greeting="Social Requests" />
      
      <main className="pt-24 px-margin-safe">
        <header className="mb-8">
          <h1 className="text-3xl font-display font-bold text-on-background mb-2">Pending Requests</h1>
          <p className="text-secondary font-body-md">You have {total} incoming requests</p>
        </header>

        {/* Tabs */}
        <div className="flex bg-surface-container-low p-1 rounded-2xl mb-6">
          <button 
            onClick={() => setActiveTab('vibes')}
            className={`flex-1 py-3 rounded-xl font-label-bold transition-all ${activeTab === 'vibes' ? 'bg-primary-container text-white shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            Vibes {vibeRequests.length > 0 && `(${vibeRequests.length})`}
          </button>
          <button 
            onClick={() => setActiveTab('messages')}
            className={`flex-1 py-3 rounded-xl font-label-bold transition-all ${activeTab === 'messages' ? 'bg-primary-container text-white shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            Messages {messageRequests.length > 0 && `(${messageRequests.length})`}
          </button>
        </div>

        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {activeTab === 'vibes' ? (
              vibeRequests.length > 0 ? (
                vibeRequests.map((req, i) => (
                  <RequestCard 
                    key={req.id} 
                    request={req} 
                    type="vibe" 
                    onAccept={() => handleAcceptVibe(req.id)}
                    onReject={() => handleRejectVibe(req.id)}
                    timeAgo={timeAgo(req.createdAt)}
                  />
                ))
              ) : <EmptyState icon="person_add" text="No pending Vibe Requests" />
            ) : (
              messageRequests.length > 0 ? (
                messageRequests.map((req, i) => (
                  <RequestCard 
                    key={req.id} 
                    request={req} 
                    type="message"
                    onAccept={() => {
                      acceptMessageRequest(req.id);
                      const chatId = createOrGetDM(req.senderId);
                      if (chatId) navigate(`/chat/${chatId}`);
                    }}
                    onReject={() => deleteMessageRequest(req.id)}
                    timeAgo={timeAgo(req.createdAt)}
                  />
                ))
              ) : <EmptyState icon="mail" text="No message requests" />
            )}
          </AnimatePresence>
        </div>
      </main>
    </motion.div>
  );
}

function RequestCard({ request, type, onAccept, onReject, timeAgo }) {
  const { fromUser, senderName, senderPhoto, message } = request;
  const name = fromUser?.displayName || fromUser?.name || senderName || 'Someone';
  const username = fromUser?.username || 'user';
  const avatar = fromUser?.avatar || senderPhoto;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-surface-container-lowest p-4 rounded-[2rem] border border-on-background/5 flex flex-col gap-4 shadow-sm"
    >
      <div className="flex items-center gap-4">
        <Avatar src={avatar} alt={name} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <h3 className="font-bold text-on-background truncate">{name}</h3>
            <span className="text-[10px] text-secondary font-label-bold uppercase tracking-wider">{timeAgo}</span>
          </div>
          <p className="text-sm text-secondary truncate">@{username}</p>
        </div>
      </div>

      {type === 'message' && message && (
        <div className="bg-surface-container-low p-3 rounded-2xl text-sm text-on-surface italic">
          "{message}"
        </div>
      )}

      <div className="flex gap-2">
        <button 
          onClick={onAccept}
          className="flex-1 bg-primary-container text-white py-3 rounded-2xl font-label-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">{type === 'vibe' ? 'check' : 'chat'}</span>
          {type === 'vibe' ? 'Accept Vibe' : 'View Chat'}
        </button>
        <button 
          onClick={onReject}
          className="w-14 h-14 bg-surface-container-high text-error rounded-2xl flex items-center justify-center hover:bg-error/10 transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
    </motion.div>
  );
}

function EmptyState({ icon, text }) {
  return (
    <div className="py-20 text-center">
      <div className="w-20 h-20 bg-surface-container-low rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="material-symbols-outlined text-3xl text-secondary/40">{icon}</span>
      </div>
      <p className="text-secondary font-label-bold">{text}</p>
    </div>
  );
}
