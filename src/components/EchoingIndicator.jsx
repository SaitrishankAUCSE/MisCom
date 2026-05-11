import React from 'react';
import { motion } from 'framer-motion';

export default function EchoingIndicator({ visible, name }) {
  if (!visible) return null;
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center gap-3 px-4 py-2 opacity-60"
    >
      <div className="flex gap-1.5 items-center">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            animate={{ 
              scale: [0.6, 1, 0.6],
              opacity: [0.3, 1, 0.3]
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 1.2, 
              delay: i * 0.2 
            }}
            className="w-2 h-2 bg-on-background rounded-full"
          />
        ))}
      </div>
      <span className="text-xs font-label-bold uppercase tracking-widest text-primary-container">
        {name ? `${name} is echoing…` : 'Echoing…'}
      </span>
    </motion.div>
  );
}
