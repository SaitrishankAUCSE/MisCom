import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGlobal } from '../context/GlobalContext';
import TopAppBar from '../components/TopAppBar';
import Backend, { AVATARS } from '../lib/backend';
import { registerFCMToken } from '../lib/fcm';

export default function Home() {
  const navigate = useNavigate();
  const { user, profile, chats, rooms, music, timeAgo } = useGlobal();

  React.useEffect(() => {
    if (user?.uid) {
      registerFCMToken(user.uid);
    }
  }, [user]);

  const np = music?.nowPlaying || {};
  
  const allUsers = Backend.auth.getAllUsers();
  const auraUsers = allUsers.map(u => {
    const isMe = u.uid === user?.uid;
    return {
      name: isMe ? (profile?.displayName || u.name || u.username) : (u.name || u.username),
      status: isMe ? (profile?.aura || u.aura || '✨ Exploring') : (u.aura || '✨ Exploring'),
      img: isMe ? (profile?.avatar || u.avatar || AVATARS[4]) : (u.avatar || AVATARS[4]),
      active: isMe,
      uid: u.uid
    };
  });
  
  // Make sure current user is always first
  auraUsers.sort((a, b) => (a.active ? -1 : (b.active ? 1 : 0)));

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
      className="bg-background text-on-background font-body-md antialiased pb-24">
      <TopAppBar greeting={`${getGreeting()}, ${profile?.displayName || user?.name || 'Alex'} ✨`} />

      <main className="pt-24 px-margin-safe flex flex-col gap-10 pb-16">
        {/* AURA STATUS */}
        <section>
          <h2 className="font-headline-md text-headline-md mb-6 text-on-background">Aura Status</h2>
          <div className="flex gap-6 overflow-x-auto scrollbar-hide pb-4 -mx-margin-safe px-margin-safe">
            {auraUsers.map((auraUser, i) => (
              <motion.div 
                key={i} 
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate('/profile')}
                className="flex flex-col items-center gap-2 shrink-0 w-20 cursor-pointer group"
              >
                <div className="relative">
                  <img src={auraUser.img} alt={auraUser.name} className={`w-16 h-16 rounded-full object-cover p-1 border-2 ${auraUser.active ? 'border-primary-container' : 'border-outline-variant'} group-hover:scale-105 transition-transform duration-300`} />
                  {auraUser.status && (
                    <div className="absolute -bottom-2 -right-2 bg-surface text-label-sm px-2 py-1 rounded-full border border-surface-container-highest shadow-sm z-10 whitespace-nowrap text-[10px]">
                      {auraUser.status}
                    </div>
                  )}
                </div>
                <span className="font-label-bold text-label-bold text-on-surface mt-2 text-center truncate w-full text-[12px]">{auraUser.name}</span>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CHATS */}
        <section>
          <div className="flex justify-between items-end mb-6">
            <h2 className="font-headline-md text-headline-md text-on-background">Recent Chats</h2>
            <button onClick={() => navigate('/chats')} className="font-label-bold text-label-bold text-primary-container hover:underline">See all</button>
          </div>
          <div className="flex flex-col gap-4">
            {chats.length === 0 ? (
              <div className="text-center py-6 bg-surface-container-lowest rounded-[1.5rem] border border-on-background/5">
                <span className="material-symbols-outlined text-3xl text-surface-variant mb-2 block">chat_bubble</span>
                <p className="text-secondary font-label-bold text-sm">No recent conversations.</p>
              </div>
            ) : (
              chats.slice(0, 3).map((chat, i) => (
                <motion.div key={chat.id} 
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/chat/${chat.id}`)}
                  className="flex items-center p-4 bg-surface-container-lowest rounded-[1.5rem] border border-on-background/5 cursor-pointer hover:border-on-background/20 transition-colors"
                >
                  <div className="relative mr-4 shrink-0">
                    {chat.isGroup ? (
                      <div className="w-14 h-14 rounded-full bg-primary-container flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-2xl">group</span>
                      </div>
                    ) : chat.avatar ? (
                      <>
                        <img src={chat.avatar} alt={chat.name} className="w-14 h-14 rounded-full object-cover" />
                        {chat.online && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-tertiary-container rounded-full border-2 border-surface-container-lowest" />}
                      </>
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-surface-variant flex items-center justify-center">
                        <span className="material-symbols-outlined text-secondary">person</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h3 className="font-headline-md text-[16px] font-bold truncate">{chat.name}</h3>
                      <span className="font-label-sm text-label-sm text-on-surface-variant shrink-0 ml-2">{timeAgo(chat.lastMessageTime)}</span>
                    </div>
                    <p className={`font-body-md text-[14px] truncate ${chat.typing ? 'text-primary-container animate-pulse italic' : 'text-on-surface-variant'}`}>
                      {chat.typing ? 'typing...' : chat.lastMessage}
                    </p>
                  </div>
                  {chat.unread > 0 && (
                    <div className="ml-4"><div className="w-5 h-5 bg-primary-container rounded-full flex items-center justify-center font-label-sm text-[10px] text-on-primary">{chat.unread}</div></div>
                  )}
                </motion.div>
              ))
            )}
          </div>
        </section>

        {/* VIBE ROOMS */}
        <section>
          <div className="flex justify-between items-end mb-6">
            <h2 className="font-headline-md text-headline-md text-on-background">Active Vibe Rooms</h2>
            <button onClick={() => navigate('/vibe-rooms')} className="font-label-bold text-label-bold text-primary-container hover:underline">See all</button>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {rooms.length === 0 ? (
              <div className="text-center py-6 bg-surface-container-lowest rounded-[1.5rem] border border-on-background/5">
                <span className="material-symbols-outlined text-3xl text-surface-variant mb-2 block">spatial_audio</span>
                <p className="text-secondary font-label-bold text-sm">No active vibe rooms right now.</p>
              </div>
            ) : (
              rooms.slice(0, 2).map((room, i) => (
                <motion.div key={room.id} whileTap={{ scale: 0.98 }} onClick={() => navigate('/vibe-rooms')} className="relative h-52 rounded-[1.5rem] overflow-hidden group cursor-pointer border border-on-background/5">
                  <div className={`absolute inset-0 bg-gradient-to-br ${i % 2 === 0 ? 'from-primary-container via-primary to-primary-container' : 'from-tertiary-container via-tertiary to-tertiary-container'}`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-on-background/90 via-on-background/40 to-transparent" />
                  <div className="absolute inset-0 p-5 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <span className="bg-surface/20 backdrop-blur-md text-white font-label-bold text-label-bold px-3 py-1.5 rounded-full border border-surface/30 flex items-center gap-1">
                        {room.type === 'live' ? <span className="w-2 h-2 rounded-full bg-tertiary-fixed-dim animate-pulse" /> : <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />}
                        {room.type === 'live' ? 'Live Now' : 'Quiet Room'}
                      </span>
                      <span className="bg-black/30 backdrop-blur-md text-white font-label-bold text-xs px-3 py-1.5 rounded-full flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">headphones</span> {room.listeners >= 1000 ? `${(room.listeners/1000).toFixed(1)}k` : room.listeners}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-headline-lg text-2xl font-bold text-white mb-1">{room.title}</h3>
                      <p className="font-body-md text-surface-dim text-sm">{room.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </section>

        {/* AI INSIGHTS + WIDGETS */}
        <section className="grid grid-cols-2 gap-4">
          <motion.div whileTap={{ scale: 0.95 }} onClick={() => navigate('/ai-insights')} className="bg-surface-container-lowest rounded-[1.5rem] border border-on-background/5 p-4 flex flex-col justify-center relative overflow-hidden cursor-pointer hover:border-on-background/20 transition-colors shadow-sm">
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-primary-fixed blur-2xl rounded-full opacity-50" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-primary-container text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                <span className="font-label-bold text-[10px] text-on-surface-variant uppercase tracking-wider">AI Insight</span>
              </div>
              <p className="font-body-lg text-[14px] text-on-surface leading-snug">You talked most with <span className="font-bold">{chats[0]?.name.split(' ')[0] || 'Elena'}</span> this week 💜</p>
            </div>
          </motion.div>

          <motion.div whileTap={{ scale: 0.95 }} onClick={() => navigate('/music')} className="bg-surface-container-lowest rounded-[1.5rem] border border-on-background/5 p-4 flex items-center gap-3 cursor-pointer hover:border-on-background/20 transition-colors shadow-sm">
            <div className="w-12 h-12 bg-on-background rounded-lg flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-surface-bright" style={{ fontVariationSettings: "'FILL' 1" }}>music_note</span>
            </div>
            <div className="min-w-0">
              <p className="font-label-sm text-[10px] text-on-surface-variant uppercase mb-1 flex items-center gap-1">
                Now Playing
                {np.isPlaying && (
                  <span className="flex gap-[2px] h-2 items-end">
                    <span className="w-1 bg-primary-container h-full rounded-full" />
                    <span className="w-1 bg-primary-container h-1/2 rounded-full" />
                    <span className="w-1 bg-primary-container h-3/4 rounded-full" />
                  </span>
                )}
              </p>
              <p className="font-label-bold text-[12px] text-on-surface truncate">{np.title || 'Midnight City'}</p>
              <p className="text-[11px] text-on-surface-variant truncate">{np.artist || 'M83'}</p>
            </div>
          </motion.div>
        </section>

        {/* STREAKS */}
        <section>
          <motion.div whileTap={{ scale: 0.98 }} onClick={() => navigate('/memories')} className="bg-surface-container-lowest rounded-[1.5rem] border border-on-background/5 p-4 flex items-center gap-3 relative overflow-hidden cursor-pointer hover:border-on-background/20 transition-colors shadow-sm">
            <div className="absolute -left-4 -bottom-4 w-16 h-16 bg-error-container blur-xl rounded-full opacity-50" />
            <div className="w-12 h-12 bg-primary-fixed rounded-full flex items-center justify-center shrink-0 relative z-10 border border-primary-fixed-dim">
              <span className="material-symbols-outlined text-primary-container text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
            </div>
            <div className="min-w-0 relative z-10">
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase mb-1">Social Energy</p>
              <p className="font-headline-md text-[18px] text-on-surface">{user?.socialEnergy || 85}% <span className="text-primary-container">⚡</span></p>
              <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">Level {user?.streakDays ? user.streakDays * 6 : 42} Energy</p>
            </div>
          </motion.div>
        </section>
      </main>
    </motion.div>
  );
}
