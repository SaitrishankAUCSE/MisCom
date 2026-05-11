import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const NAV_ITEMS = [
  { path: '/home', label: 'Home', icon: 'home' },
  { path: '/chats', label: 'Chats', icon: 'chat_bubble' },
  { path: '/discover', label: 'Discover', icon: 'explore' },
  { path: '/secret-spaces', label: 'Spaces', icon: 'lock' },
  { path: '/profile', label: 'Profile', icon: 'person' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 w-full z-[55] flex justify-around items-center px-2 pb-[env(safe-area-inset-bottom)] bg-surface/95 backdrop-blur-2xl border-t border-surface-variant/30 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] h-20"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 4px)' }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <button
            key={item.path}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              navigate(item.path);
            }}
            className={`flex flex-col items-center justify-center min-w-[56px] py-2 px-3 transition-all active:scale-90 duration-200 rounded-xl relative cursor-pointer select-none ${
              isActive
                ? 'text-primary-container'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span
              className="material-symbols-outlined text-2xl mb-0.5 pointer-events-none"
              style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
              {item.icon}
            </span>
            <span className="font-label-bold text-[10px] pointer-events-none">{item.label}</span>
            {isActive && (
              <motion.div
                layoutId="activeTab"
                className="absolute -bottom-0.5 w-1.5 h-1.5 bg-primary-container rounded-full"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
