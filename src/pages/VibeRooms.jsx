import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import TopAppBar from '../components/TopAppBar';
import { useGlobal } from '../context/GlobalContext';

export default function VibeRooms() {
  const navigate = useNavigate();
  const { rooms, joinRoom, leaveRoom, createRoom } = useGlobal();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [newRoomType, setNewRoomType] = useState('live');
  const [joinedToast, setJoinedToast] = useState('');

  const handleJoin = (roomId, title) => {
    joinRoom(roomId);
    setJoinedToast(`Joined "${title}" 🎧`);
    setTimeout(() => setJoinedToast(''), 2500);
  };

  const handleLeave = (roomId) => {
    leaveRoom(roomId);
    setJoinedToast('Left room');
    setTimeout(() => setJoinedToast(''), 2000);
  };

  const handleCreateRoom = () => {
    if (!newRoomTitle.trim()) return;
    createRoom({ title: newRoomTitle, description: newRoomDesc, type: newRoomType });
    setShowCreateModal(false);
    setNewRoomTitle('');
    setNewRoomDesc('');
    setJoinedToast('Room created! 🎉');
    setTimeout(() => setJoinedToast(''), 2500);
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}
      className="font-body-md text-on-surface antialiased bg-background min-h-screen flex flex-col relative pb-24">
      <TopAppBar />

      {/* Toast */}
      <AnimatePresence>
        {joinedToast && (
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] bg-on-background text-white px-6 py-3 rounded-full font-label-bold text-sm shadow-2xl"
          >
            {joinedToast}
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-grow pt-24 px-margin-mobile">
        <section className="mb-10 mt-6">
          <h2 className="font-display text-display text-on-background mb-2">Vibe Rooms</h2>
          <p className="font-body-lg text-body-lg text-secondary">Join the frequency. Tap into live audio spaces.</p>
        </section>

        <div className="grid grid-cols-1 gap-6">
          {rooms.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-surface-container-low rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant">spatial_audio</span>
              </div>
              <h3 className="font-headline-md text-headline-md mb-2">No active rooms</h3>
              <p className="font-body-md text-secondary max-w-[250px] mx-auto">
                There are no public vibe rooms right now. Be the first to start one!
              </p>
            </div>
          ) : (
            rooms.map((room) => (
              <motion.article
                key={room.id}
                whileTap={{ scale: 0.98 }}
                className="relative bg-surface-bright rounded-xl p-6 border border-on-background/5 hover:border-on-background/10 transition-colors flex flex-col gap-4 cursor-pointer"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className={`inline-block px-3 py-1 rounded-full font-label-sm text-label-sm mb-3 ${
                      room.type === 'live' ? 'bg-on-background text-white' : 'bg-surface-variant text-on-surface-variant'
                    }`}>
                      {room.type === 'live' ? '● LIVE' : 'QUIET ROOM'}
                    </div>
                    <h3 className="font-headline-md text-headline-md text-on-background">{room.title}</h3>
                  </div>
                  <div className={`flex items-center gap-2 font-label-bold text-label-bold px-3 py-1 rounded-full ${
                    room.type === 'live' ? 'text-primary-container bg-primary-container/10' : 'text-secondary bg-surface-variant/50'
                  }`}>
                    <span className="material-symbols-outlined text-[16px]">headphones</span>
                    <span>{room.listeners >= 1000 ? `${(room.listeners/1000).toFixed(1)}k` : room.listeners}</span>
                  </div>
                </div>
                
                <p className="font-body-md text-body-md text-secondary">{room.description}</p>
                
                <div className="flex items-center justify-between pt-4 border-t border-on-background/5">
                  <div className="flex gap-2 text-xl">
                    {room.type === 'live' ? (
                      <><span className="animate-pulse">🔥</span><span className="animate-bounce">🎵</span></>
                    ) : (
                      <><span className="animate-pulse">☕</span><span className="animate-bounce">💻</span></>
                    )}
                  </div>
                  
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      room.joined ? handleLeave(room.id) : handleJoin(room.id, room.title);
                    }}
                    className={`px-5 py-2 rounded-full font-label-bold text-sm transition-all ${
                      room.joined
                        ? 'bg-surface-variant text-on-surface-variant hover:bg-error/10 hover:text-error'
                        : 'bg-primary-container text-white shadow-[0_4px_12px_rgba(225,29,72,0.3)] hover:shadow-[0_6px_16px_rgba(225,29,72,0.4)]'
                    }`}
                  >
                    {room.joined ? 'Leave' : 'Join Room'}
                  </motion.button>
                </div>
              </motion.article>
            ))
          )}
        </div>
      </main>

      {/* FAB - Create Room */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowCreateModal(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-primary-container text-on-primary rounded-full shadow-[0_8px_20px_rgba(225,29,72,0.4)] flex items-center justify-center z-40 border-2 border-white hover:shadow-[0_12px_25px_rgba(225,29,72,0.5)] transition-shadow"
      >
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
      </motion.button>

      {/* Create Room Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-end justify-center"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              transition={{ type: 'spring', damping: 25 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md bg-surface-container-lowest rounded-t-[2rem] p-6 pb-10"
            >
              <div className="w-12 h-1.5 bg-surface-variant rounded-full mx-auto mb-6" />
              <h2 className="font-headline-md text-headline-md mb-6">Create a Vibe Room</h2>
              
              <div className="flex flex-col gap-4">
                <input
                  type="text"
                  value={newRoomTitle}
                  onChange={e => setNewRoomTitle(e.target.value)}
                  placeholder="Room name..."
                  className="w-full border-2 border-surface-variant bg-surface-container-low text-on-background rounded-[1.25rem] px-4 py-4 outline-none focus:border-primary-container transition-colors"
                />
                <textarea
                  value={newRoomDesc}
                  onChange={e => setNewRoomDesc(e.target.value)}
                  placeholder="Description..."
                  rows={3}
                  className="w-full border-2 border-surface-variant bg-surface-container-low text-on-background rounded-[1.25rem] px-4 py-4 outline-none focus:border-primary-container transition-colors resize-none"
                />
                <div className="flex gap-3">
                  {['live', 'quiet'].map(type => (
                    <button
                      key={type}
                      onClick={() => setNewRoomType(type)}
                      className={`flex-1 py-3 rounded-full font-label-bold text-sm border-2 transition-all ${
                        newRoomType === type
                          ? 'border-primary-container bg-primary-container/10 text-primary-container'
                          : 'border-surface-variant text-secondary'
                      }`}
                    >
                      {type === 'live' ? '🔴 Live' : '🤫 Quiet'}
                    </button>
                  ))}
                </div>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleCreateRoom}
                  disabled={!newRoomTitle.trim()}
                  className="w-full bg-primary-container text-white rounded-full py-4 font-bold text-lg shadow-[0_8px_20px_rgba(225,29,72,0.3)] disabled:opacity-50 transition-all"
                >
                  Create Room 🎧
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
