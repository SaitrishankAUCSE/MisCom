import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function NotificationToast({ toast, onDismiss }) {
  const navigate = useNavigate();
  if (!toast) return null;

  const handleTap = () => {
    onDismiss();
    if (toast.data?.type === 'dm')   navigate(`/chat/${toast.data.chatId}`);
    if (toast.data?.type === 'room') navigate(`/room/${toast.data.roomId}`);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.9 }}
        animate={{ opacity: 1, y: 16, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.9 }}
        onClick={handleTap}
        className="fixed top-0 left-4 right-4 z-[100] cursor-pointer max-w-md mx-auto"
      >
        <div className="bg-surface-container-high/90 backdrop-blur-xl border border-on-background/10 rounded-2xl p-4 shadow-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-primary-container/20 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary-container text-2xl">chat</span>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-label-bold text-[15px] text-on-surface truncate">{toast.title}</h4>
            <p className="font-body-sm text-[13px] text-on-surface-variant truncate mt-0.5">{toast.body}</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onDismiss(); }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-on-surface/5 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
