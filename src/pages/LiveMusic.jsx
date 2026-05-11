import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TopAppBar from '../components/TopAppBar';
import { useGlobal } from '../context/GlobalContext';

export default function LiveMusic() {
  const { music, toggleMusic, skipTrack, joinMusicSession, addToQueue } = useGlobal();
  const [sessionJoined, setSessionJoined] = useState(false);
  const [showToast, setShowToast] = useState('');

  const np = music?.nowPlaying;
  const queue = music?.queue || [];
  const friends = music?.friends || [];

  const handleJoinSession = () => {
    joinMusicSession();
    setSessionJoined(true);
    setShowToast('Joined session! 🎧');
    setTimeout(() => setShowToast(''), 2500);
  };

  const handleToggle = () => {
    toggleMusic();
  };

  const handleSkip = () => {
    skipTrack();
    setShowToast('Skipped ⏭️');
    setTimeout(() => setShowToast(''), 2000);
  };

  const handleAddToQueue = () => {
    addToQueue({ title: 'Starboy (Remix)', artist: 'The Weeknd ft. Daft Punk', duration: 245 });
    setShowToast('Added to queue! 🎵');
    setTimeout(() => setShowToast(''), 2000);
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}
      className="bg-white font-body-md text-on-surface antialiased min-h-screen pb-24">
      <TopAppBar showBack />

      {/* Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] bg-on-background text-white px-6 py-3 rounded-full font-label-bold text-sm shadow-2xl"
          >
            {showToast}
          </motion.div>
        )}
      </AnimatePresence>

      <main className="pt-24 pb-8 px-margin-mobile max-w-screen-6 mx-auto">
        {!np ? (
          <div className="flex flex-col items-center justify-center text-center py-20">
            <div className="w-24 h-24 bg-surface-container-low rounded-full flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-5xl text-on-surface-variant">music_off</span>
            </div>
            <h2 className="font-headline-md text-headline-md mb-2">No Active Sessions</h2>
            <p className="font-body-md text-secondary max-w-[250px] mx-auto mb-8">
              None of your friends are currently broadcasting music. Check back later or start your own!
            </p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => alert("Start broadcasting coming soon!")}
              className="py-3 px-6 bg-primary-container text-on-primary font-label-bold rounded-full shadow-lg"
            >
              Start a Session
            </motion.button>
          </div>
        ) : (
        <section className="flex flex-col items-center text-center">
          {/* Album Art */}
          <div className="relative w-full aspect-square max-w-[280px] mb-8">
            <div className="absolute -inset-4 bg-primary/10 blur-3xl rounded-full opacity-50" />
            <motion.div
              animate={np.isPlaying ? { rotate: 360 } : {}}
              transition={np.isPlaying ? { repeat: Infinity, duration: 20, ease: 'linear' } : {}}
              className="relative z-10 w-full h-full rounded-full overflow-hidden aura-glow border-4 border-white/20 bg-gradient-to-br from-primary-container via-primary to-primary-container flex items-center justify-center shadow-2xl"
            >
              <span className="material-symbols-outlined text-white text-[80px]" style={{ fontVariationSettings: "'FILL' 1" }}>album</span>
              {/* Floating Reactions */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <span className="emoji-float absolute bottom-10 left-1/4 text-2xl" style={{ animationDelay: '0.2s' }}>🔥</span>
                <span className="emoji-float absolute bottom-10 left-1/2 text-2xl" style={{ animationDelay: '0.8s' }}>❤️</span>
                <span className="emoji-float absolute bottom-10 right-1/4 text-2xl" style={{ animationDelay: '1.5s' }}>✨</span>
              </div>
            </motion.div>
          </div>

          {/* Track Info */}
          <div className="mb-6 w-full">
            <h1 className="font-display text-4xl font-bold text-on-background mb-1">{np.title}</h1>
            <p className="font-headline-md text-lg text-secondary mb-4">{np.artist}{np.album ? ` — ${np.album}` : ''}</p>
            
            {/* Waveform */}
            <div className="flex items-end justify-center gap-1 h-8 mb-4">
              {[0.1, 0.4, 0.2, 0.6, 0.3, 0.5, 0.2].map((d, i) => (
                <div key={i} className={`waveform-bar w-1 rounded-full ${np.isPlaying ? 'bg-primary' : 'bg-surface-variant'}`} style={{ animationDelay: `${d}s`, animationPlayState: np.isPlaying ? 'running' : 'paused' }} />
              ))}
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-surface-variant rounded-full overflow-hidden mb-2">
              <motion.div
                className="h-full bg-primary-container rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: np.isPlaying ? '100%' : `${(np.progress / np.duration) * 100}%` }}
                transition={np.isPlaying ? { duration: np.duration - np.progress, ease: 'linear' } : {}}
              />
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-6 mb-8">
            <button className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface hover:bg-surface-variant transition-colors">
              <span className="material-symbols-outlined text-2xl">skip_previous</span>
            </button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleToggle}
              className="w-16 h-16 rounded-full bg-primary-container text-white flex items-center justify-center shadow-[0_8px_20px_rgba(225,29,72,0.4)] hover:shadow-[0_12px_25px_rgba(225,29,72,0.5)] transition-shadow"
            >
              <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                {np.isPlaying ? 'pause' : 'play_arrow'}
              </span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleSkip}
              className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface hover:bg-surface-variant transition-colors"
            >
              <span className="material-symbols-outlined text-2xl">skip_next</span>
            </motion.button>
          </div>

          {/* Join / Add to Queue */}
          <div className="flex gap-3 w-full mb-10">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleJoinSession}
              disabled={sessionJoined}
              className="flex-1 py-4 bg-primary-container text-on-primary font-headline-md rounded-full shadow-lg hover:opacity-90 transition-all uppercase tracking-widest disabled:opacity-50 text-sm"
            >
              {sessionJoined ? 'In Session ✓' : 'Join Session'}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleAddToQueue}
              className="py-4 px-6 bg-surface-container-low text-on-surface font-label-bold rounded-full hover:bg-surface-variant transition-colors text-sm"
            >
              + Queue
            </motion.button>
          </div>

          {/* Queue */}
          {queue.length > 0 && (
            <div className="w-full text-left mb-10">
              <h3 className="font-label-bold text-label-bold text-on-surface-variant uppercase tracking-wider mb-4">Up Next</h3>
              {queue.map((track, i) => (
                <div key={track.id || i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-surface-container-low transition-colors">
                  <div className="w-10 h-10 bg-surface-container-high rounded-lg flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined text-lg">music_note</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-label-bold text-sm truncate">{track.title}</p>
                    <p className="text-label-sm text-secondary truncate">{track.artist}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Friends Listening */}
          <div className="w-full text-left">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-label-bold text-label-bold text-on-surface-variant uppercase tracking-wider">Listening Now</h3>
              <span className="text-label-sm text-primary font-bold">{np.listeners} friends</span>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {friends.map((f, i) => (
                <motion.div
                  key={f.id || i}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center justify-between p-4 bg-surface-bright border border-black/5 rounded-xl cursor-pointer hover:border-primary-container/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <img src={f.avatar} alt={f.name} className="w-12 h-12 rounded-full object-cover" />
                    <div className="text-left">
                      <p className="font-label-bold text-on-surface">{f.name}</p>
                      <p className="text-label-sm text-secondary">{f.status}</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-primary">equalizer</span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
        )}
      </main>
    </motion.div>
  );
}
