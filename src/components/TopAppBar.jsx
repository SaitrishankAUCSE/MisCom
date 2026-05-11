import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobal } from '../context/GlobalContext';
import Avatar from './Avatar';
import Logo from './Logo';
import { useNotifications } from '../hooks/useNotifications';
import NotificationBell from './NotificationBell';

export default function TopAppBar({ title = 'MisCom', showBack = false, greeting = '' }) {
  const navigate = useNavigate();
  const { user, profile } = useGlobal();
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(profile?.uid);

  return (
    <>
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-margin-safe h-20 bg-surface/80 backdrop-blur-xl border-b border-surface-variant/10">
        <div className="flex items-center gap-2">
          {showBack ? (
            <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface hover:bg-surface-variant transition-colors">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
          ) : (
            <Avatar 
              src={user?.avatar || profile?.avatar} 
              alt={user?.name || profile?.name} 
              size="md" 
              border={true}
              online={true}
              showStatus={true}
              onClick={() => navigate('/profile')}
            />
          )}
          <div className="flex flex-col">
            {title === 'MisCom' ? (
              <div className="flex items-center -ml-1">
                <Logo className="w-8 h-8" showText={true} layout="horizontal" textColor="text-on-background" />
              </div>
            ) : (
              <span className="font-headline-lg text-headline-lg font-extrabold tracking-tight text-on-background leading-none">{title}</span>
            )}
            {greeting && <span className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">{greeting}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/discover')}
            className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-primary hover:opacity-70 transition-opacity active:scale-95"
          >
            <span className="material-symbols-outlined">search</span>
          </button>
          
          <NotificationBell 
            notifications={notifications} 
            unreadCount={unreadCount} 
            markRead={markRead} 
            markAllRead={markAllRead} 
          />
        </div>
      </header>
    </>
  );
}
