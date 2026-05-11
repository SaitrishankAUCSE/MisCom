import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGlobal } from '../context/GlobalContext';
import Backend from '../lib/backend';

export default function RoomChat() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useGlobal();
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [showInfo, setShowInfo] = useState(false);
  const [showReactions, setShowReactions] = useState(null);
  const [toast, setToast] = useState('');
  const bottomRef = useRef(null);
  const REACTIONS = ['❤️','🔥','😂','😮','👏','💜'];

  useEffect(() => {
    const r = Backend.protectedRooms.getById(roomId);
    if (!r || !r.members?.includes(user?.uid)) { navigate('/secret-spaces'); return; }
    setRoom(r);
    setMessages(Backend.protectedRooms.getMessages(roomId));
  }, [roomId, user]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = () => {
    if (!input.trim() || !room) return;
    const msg = Backend.protectedRooms.sendMessage(roomId, user.uid, input.trim());
    if (msg) { setMessages(prev => [...prev, msg]); setInput(''); }
  };

  const handleReaction = (msgId, emoji) => {
    Backend.protectedRooms.addReaction(roomId, msgId, user.uid, emoji);
    setMessages(Backend.protectedRooms.getMessages(roomId));
    setShowReactions(null);
  };

  const handleLeave = () => {
    Backend.protectedRooms.leaveRoom(roomId, user.uid);
    navigate('/secret-spaces');
  };

  const handleBan = (targetId) => {
    Backend.protectedRooms.banUser(roomId, user.uid, targetId);
    setRoom(Backend.protectedRooms.getById(roomId));
    showToastMsg('User removed');
  };

  const handleMute = (targetId) => {
    const isMuted = room.mutedUsers?.includes(targetId);
    if (isMuted) Backend.protectedRooms.unmuteUser(roomId, user.uid, targetId);
    else Backend.protectedRooms.muteUser(roomId, user.uid, targetId);
    setRoom(Backend.protectedRooms.getById(roomId));
    showToastMsg(isMuted ? 'Unmuted' : 'Muted');
  };

  const handleDelete = () => {
    if (confirm('Delete this room permanently?')) {
      Backend.protectedRooms.deleteRoom(roomId, user.uid);
      navigate('/secret-spaces');
    }
  };

  const showToastMsg = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2000); };
  const isAdmin = room?.admins?.includes(user?.uid);
  const isCreator = room?.creatorId === user?.uid;

  const timeStr = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (!room) return null;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-50 bg-surface/90 backdrop-blur-xl border-b border-surface-variant/10">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/secret-spaces')} className="w-9 h-9 rounded-full bg-surface-container-low flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">arrow_back</span>
            </button>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold" style={{ background: `linear-gradient(135deg, ${room.themeColor}, ${room.themeColor}99)` }}>
              {room.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="font-label-bold text-sm">{room.name}</h2>
                {room.isPasswordProtected && <span className="material-symbols-outlined text-[12px] text-on-surface-variant">lock</span>}
                {room.anonymousMode && <span className="bg-surface-variant px-1.5 py-0.5 rounded text-[9px] font-bold text-on-surface-variant">ANON</span>}
              </div>
              <p className="text-[11px] text-secondary">{room.memberCount} members · {room.mood}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {room.streak > 0 && <span className="text-xs font-bold text-orange-500 mr-2">🔥{room.streak}</span>}
            <button onClick={() => setShowInfo(true)} className="w-9 h-9 rounded-full bg-surface-container-low flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">info</span>
            </button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto pt-20 pb-20 px-4">
        <div className="flex flex-col gap-1">
          {messages.map((msg, i) => {
            if (msg.type === 'system') return (
              <div key={msg.id} className="text-center py-3">
                <span className="text-[11px] text-secondary bg-surface-container-low px-3 py-1 rounded-full">{msg.text}</span>
              </div>
            );
            const isMe = msg.senderId === user.uid || (room.anonymousMode && msg.senderId === 'anon-' + room.members.indexOf(user.uid));
            const reactions = msg.reactions || {};
            const hasReactions = Object.keys(reactions).length > 0;

            return (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} mb-1`}>
                {/* Sender name for others */}
                {!isMe && (i === 0 || messages[i-1]?.senderId !== msg.senderId || messages[i-1]?.type === 'system') && (
                  <div className="flex items-center gap-2 mb-1 ml-1">
                    {msg.senderAvatar ? (
                      <img src={msg.senderAvatar} className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-surface-variant flex items-center justify-center">
                        <span className="material-symbols-outlined text-[10px] text-secondary">person</span>
                      </div>
                    )}
                    <span className="text-[11px] font-label-bold text-secondary">{msg.senderName}</span>
                  </div>
                )}
                <div className="relative max-w-[80%]" onDoubleClick={() => setShowReactions(showReactions === msg.id ? null : msg.id)}>
                  <div className={`px-4 py-2.5 rounded-[1.2rem] text-sm leading-relaxed ${
                    isMe ? 'bg-primary-container text-white rounded-br-md' : 'bg-surface-container-low text-on-background rounded-bl-md'
                  }`}>
                    {msg.text}
                  </div>
                  <span className={`text-[10px] mt-0.5 block ${isMe ? 'text-right text-on-surface-variant/60' : 'text-on-surface-variant/60'}`}>{timeStr(msg.timestamp)}</span>
                  {/* Reactions */}
                  {hasReactions && (
                    <div className={`flex gap-1 mt-0.5 ${isMe ? 'justify-end' : ''}`}>
                      {Object.entries(reactions).map(([emoji, users]) => (
                        <button key={emoji} onClick={() => handleReaction(msg.id, emoji)}
                          className={`text-xs px-1.5 py-0.5 rounded-full border ${users.includes(user.uid) ? 'bg-primary-container/10 border-primary-container/30' : 'bg-surface-container-low border-transparent'}`}>
                          {emoji} {users.length > 1 && users.length}
                        </button>
                      ))}
                    </div>
                  )}
                  {/* Reaction picker */}
                  <AnimatePresence>
                    {showReactions === msg.id && (
                      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                        className={`absolute ${isMe ? 'right-0' : 'left-0'} -top-10 bg-white rounded-full shadow-xl border border-on-background/10 px-2 py-1 flex gap-1 z-30`}>
                        {REACTIONS.map(e => (
                          <button key={e} onClick={() => handleReaction(msg.id, e)} className="text-lg hover:scale-125 transition-transform p-0.5">{e}</button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </main>

      {/* Input */}
      <div className="fixed bottom-0 left-0 w-full bg-surface/90 backdrop-blur-xl border-t border-surface-variant/10 px-4 py-3 z-40">
        <div className="flex items-center gap-3">
          <input type="text" value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder={room.mutedUsers?.includes(user.uid) ? "You are muted" : "Type a message..."}
            disabled={room.mutedUsers?.includes(user.uid)}
            className="flex-1 bg-surface-container-low rounded-full px-5 py-3 outline-none text-sm focus:ring-2 focus:ring-primary-container/30 disabled:opacity-50" />
          <motion.button whileTap={{ scale: 0.9 }} onClick={handleSend} disabled={!input.trim()}
            className="w-11 h-11 bg-primary-container text-white rounded-full flex items-center justify-center shadow-lg disabled:opacity-40">
            <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
          </motion.button>
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[80] bg-on-background text-white px-5 py-2.5 rounded-full text-sm font-label-bold shadow-2xl">{toast}</motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Room Info Panel ═══ */}
      <AnimatePresence>
        {showInfo && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-end" onClick={() => setShowInfo(false)}>
            <motion.div initial={{ y: 500 }} animate={{ y: 0 }} exit={{ y: 500 }} transition={{ type: 'spring', damping: 25 }}
              onClick={e => e.stopPropagation()} className="w-full bg-white rounded-t-[2rem] p-6 pb-10 max-h-[80vh] overflow-y-auto">
              <div className="w-12 h-1.5 bg-surface-variant rounded-full mx-auto mb-6" />
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-xl" style={{ background: `linear-gradient(135deg, ${room.themeColor}, ${room.themeColor}88)` }}>
                  {room.name.charAt(0)}
                </div>
                <div>
                  <h2 className="font-headline-md text-lg font-bold">{room.name}</h2>
                  <p className="text-secondary text-sm">{room.category} · {room.mood}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">{room.memberCount}/{room.maxMembers} members</p>
                </div>
              </div>
              {room.description && <p className="text-secondary text-sm mb-6 bg-surface-container-low p-4 rounded-xl">{room.description}</p>}

              {/* Features badges */}
              <div className="flex flex-wrap gap-2 mb-6">
                {room.isPasswordProtected && <span className="bg-surface-container-low px-3 py-1 rounded-full text-xs font-label-bold">🔒 Password</span>}
                {room.anonymousMode && <span className="bg-purple-50 text-purple-600 px-3 py-1 rounded-full text-xs font-label-bold">🎭 Anonymous</span>}
                {room.ghostJoinEnabled && <span className="bg-surface-container-low px-3 py-1 rounded-full text-xs font-label-bold">👻 Ghost Join</span>}
                {room.expiry && <span className="bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-xs font-label-bold">⏳ Temporary</span>}
                {room.streak > 0 && <span className="bg-orange-50 text-orange-500 px-3 py-1 rounded-full text-xs font-label-bold">🔥 {room.streak} day streak</span>}
              </div>

              {/* Members */}
              <h3 className="font-label-bold text-xs text-secondary uppercase tracking-wider mb-3">Members</h3>
              <div className="flex flex-col gap-2 mb-6">
                {(room.members || []).map(memberId => {
                  const allUsers = Backend.auth.getAllUsers();
                  const memberUser = allUsers.find(u => u.uid === memberId);
                  const memberName = memberUser?.name || memberUser?.username || 'User';
                  const isRoomCreator = room.creatorId === memberId;
                  const isMuted = room.mutedUsers?.includes(memberId);
                  return (
                    <div key={memberId} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-surface-variant flex items-center justify-center overflow-hidden">
                          {memberUser?.avatar ? <img src={memberUser.avatar} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-sm text-secondary">person</span>}
                        </div>
                        <div>
                          <span className="text-sm font-label-bold">{memberName}</span>
                          {isRoomCreator && <span className="ml-1 text-[10px] bg-primary-container/10 text-primary-container px-1.5 py-0.5 rounded font-bold">ADMIN</span>}
                          {isMuted && <span className="ml-1 text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded font-bold">MUTED</span>}
                        </div>
                      </div>
                      {isAdmin && memberId !== user.uid && (
                        <div className="flex gap-1">
                          <button onClick={() => handleMute(memberId)} className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center">
                            <span className="material-symbols-outlined text-sm">{isMuted ? 'volume_up' : 'volume_off'}</span>
                          </button>
                          <button onClick={() => handleBan(memberId)} className="w-8 h-8 rounded-full bg-error/10 flex items-center justify-center text-error">
                            <span className="material-symbols-outlined text-sm">person_remove</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <button onClick={handleLeave} className="w-full py-3 bg-surface-container-low text-on-surface rounded-xl font-label-bold text-sm">Leave Room</button>
                {isCreator && <button onClick={handleDelete} className="w-full py-3 bg-error/10 text-error rounded-xl font-label-bold text-sm">Delete Room</button>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
