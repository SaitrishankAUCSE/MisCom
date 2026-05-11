import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import TopAppBar from '../components/TopAppBar';
import { useGlobal } from '../context/GlobalContext';
import Backend from '../lib/backend';

export default function MemoryTimeline() {
  const navigate = useNavigate();
  const { user } = useGlobal();
  const storedMemories = JSON.parse(localStorage.getItem('miscom_memories') || '[]');
  const chatHighlights = Backend.chats.getAll().slice(0, 4).map(chat => ({
    id: `chat-${chat.id}`,
    title: chat.lastMessage || `Started chatting with ${chat.name}`,
    label: chat.name || 'Conversation',
    timestamp: chat.lastTimestamp || chat.lastMessageTime || Date.now(),
    icon: 'chat_bubble',
  }));
  const memoryItems = [...storedMemories, ...chatHighlights].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}
      className="bg-background text-on-background font-body-md min-h-screen pt-20 pb-24">
      <TopAppBar />

      {/* Energy Meter */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="fixed top-24 left-1/2 -translate-x-1/2 z-40 bg-surface shadow-[0_8px_30px_rgb(0,0,0,0.12)] border-2 border-background rounded-full px-4 py-2 flex items-center gap-2"
      >
        <span className="material-symbols-outlined text-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
        <div className="w-24 h-2 bg-surface-variant rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary-container rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${user?.socialEnergy || 85}%` }}
            transition={{ duration: 1, delay: 0.5 }}
          />
        </div>
        <span className="font-label-bold text-label-bold text-on-surface">{user?.socialEnergy || 85}%</span>
      </motion.div>

      <main className="max-w-md mx-auto px-margin-mobile space-y-16 pt-16">
        {memoryItems.length === 0 && (
          <section className="py-24 text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-surface-container-low flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-4xl text-secondary/50">auto_awesome</span>
            </div>
            <h2 className="font-headline-md text-xl font-bold mb-2">No memories yet</h2>
            <p className="text-secondary text-sm max-w-[260px] mx-auto">Start chats, join rooms, and save moments. Your best social highlights will appear here.</p>
          </section>
        )}

        {memoryItems.length > 0 && (
          <section className="relative group">
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-surface-variant/50 -z-10" />
            <div className="flex flex-col gap-4 relative">
              <div className="flex items-center gap-4">
                <div className="w-4 h-4 rounded-full bg-primary-container border-4 border-background shadow-[0_0_15px_rgba(225,29,72,0.6)]" />
                <span className="font-label-bold text-label-bold text-primary-container tracking-widest uppercase">Your Highlights</span>
              </div>
              <div className="ml-7 space-y-3">
                {memoryItems.map(item => (
                  <motion.div key={item.id} whileTap={{ scale: 0.98 }}
                    className="bg-surface-bright border border-background shadow-[0_12px_40px_-12px_rgba(225,29,72,0.15)] rounded-[22px] p-4 flex items-start gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-primary-container/10 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-primary-container">{item.icon || 'auto_awesome'}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-secondary font-label-bold uppercase tracking-wider mb-1">{item.label || 'Memory'} · {Backend.timeAgo(item.timestamp || Date.now())}</p>
                      <h2 className="font-label-bold text-on-surface leading-snug">{item.title}</h2>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Timeline 1 */}
        {memoryItems.length === 0 && <section className="relative group">
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-surface-variant/50 -z-10" />
          <div className="flex flex-col gap-4 relative">
            <div className="flex items-center gap-4">
              <div className="w-3 h-3 rounded-full bg-primary-container border-2 border-background shadow-[0_0_10px_rgba(225,29,72,0.5)]" />
              <span className="font-label-bold text-label-bold text-secondary tracking-widest uppercase">October 2023</span>
            </div>
            <motion.div
              whileTap={{ scale: 0.98 }}
              className="ml-7 bg-surface-bright border border-background shadow-[0_12px_40px_-12px_rgba(225,29,72,0.15)] rounded-[24px] overflow-hidden group-hover:-translate-y-1 transition-transform duration-300 cursor-pointer"
            >
              <div className="relative aspect-[1.4] w-full bg-gradient-to-br from-primary-container/20 to-surface-variant/30">
                <div className="absolute inset-0 bg-gradient-to-t from-on-background/80 via-on-background/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col gap-3">
                  <div className="flex flex-wrap gap-2">
                    <span className="bg-primary-container text-on-primary-container font-label-sm text-label-sm px-3 py-1.5 rounded-full shadow-[0_4px_12px_rgba(225,29,72,0.4)]">Late-night duo</span>
                    <span className="bg-surface/90 text-on-surface font-label-sm text-label-sm px-3 py-1.5 rounded-full backdrop-blur-md">Vibes: Immaculate</span>
                  </div>
                  <h2 className="font-headline-md text-headline-md text-white leading-tight">3AM Diner Runs &amp; Deep Talks</h2>
                </div>
              </div>
            </motion.div>
          </div>
        </section>}

        {/* Timeline 2 */}
        {memoryItems.length === 0 && <section className="relative group">
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-surface-variant/50 -z-10" />
          <div className="flex flex-col gap-4 relative">
            <div className="flex items-center gap-4">
              <div className="w-3 h-3 rounded-full bg-background border-2 border-secondary-fixed-dim" />
              <span className="font-label-bold text-label-bold text-secondary tracking-widest uppercase">December 2023</span>
            </div>
            <div className="ml-7 grid grid-cols-2 gap-2">
              <motion.div whileTap={{ scale: 0.98 }} className="col-span-2 relative aspect-video rounded-[20px] overflow-hidden bg-gradient-to-br from-primary-container/30 to-surface-variant cursor-pointer">
                <div className="absolute inset-0 bg-black/30" />
                <div className="absolute bottom-4 left-4">
                  <span className="bg-surface text-on-surface font-label-bold text-label-bold px-3 py-1.5 rounded-full shadow-lg">The Eras Tour</span>
                </div>
              </motion.div>
              <motion.div whileTap={{ scale: 0.95 }} className="aspect-square rounded-[20px] overflow-hidden bg-surface-variant relative flex items-center justify-center cursor-pointer hover:bg-primary-container/20 transition-colors">
                <span className="material-symbols-outlined text-primary-container text-[48px]" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
              </motion.div>
              <motion.div whileTap={{ scale: 0.95 }} className="aspect-square rounded-[20px] bg-primary-container p-4 flex flex-col justify-between text-on-primary-container cursor-pointer">
                <span className="material-symbols-outlined">format_quote</span>
                <p className="font-body-lg text-body-lg font-medium text-[14px]">"I literally can't even right now."</p>
              </motion.div>
            </div>
          </div>
        </section>}

        {/* Now */}
        {memoryItems.length === 0 && <section className="relative group">
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-surface-variant/50 to-transparent -z-10" />
          <div className="flex flex-col gap-4 relative">
            <div className="flex items-center gap-4">
              <div className="w-4 h-4 rounded-full bg-primary-container border-4 border-background shadow-[0_0_15px_rgba(225,29,72,0.6)] animate-pulse" />
              <span className="font-label-bold text-label-bold text-primary-container tracking-widest uppercase">Right Now</span>
            </div>
            <motion.div whileTap={{ scale: 0.98 }} className="ml-7 bg-surface-bright border border-background shadow-[0_12px_40px_-12px_rgba(225,29,72,0.15)] rounded-[24px] overflow-hidden cursor-pointer">
              <div className="relative aspect-square w-full bg-gradient-to-br from-surface-variant/40 to-primary-container/10 flex items-center justify-center">
                <motion.span
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="material-symbols-outlined text-primary-container text-[80px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  local_fire_department
                </motion.span>
                <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col gap-3 bg-gradient-to-t from-surface via-transparent to-transparent">
                  <span className="bg-primary-container text-on-primary-container font-label-sm text-label-sm px-3 py-1.5 rounded-full w-fit flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>Comfort person
                  </span>
                  <h2 className="font-headline-md text-headline-md text-on-surface leading-tight">Yapping Session #492</h2>
                </div>
              </div>
            </motion.div>
          </div>
        </section>}
      </main>
    </motion.div>
  );
}
