import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGlobal } from '../context/GlobalContext';

const THEMES = [
  { id: 'light', label: 'Light', icon: 'light_mode', desc: 'Clean & bright' },
  { id: 'dark', label: 'Dark', icon: 'dark_mode', desc: 'Nocturnal Crimson' },
  { id: 'system', label: 'System', icon: 'settings_suggest', desc: 'Match device' },
];

const FONT_SIZES = [
  { id: 'small', label: 'Small', scale: 0.9 },
  { id: 'default', label: 'Default', scale: 1 },
  { id: 'large', label: 'Large', scale: 1.1 },
  { id: 'xlarge', label: 'Extra Large', scale: 1.2 },
];

const CHAT_BUBBLES = [
  { id: 'rounded', label: 'Rounded', radius: '1rem' },
  { id: 'pill', label: 'Pill', radius: '1.5rem' },
  { id: 'sharp', label: 'Sharp', radius: '0.5rem' },
];

function getAppearance() {
  try { return JSON.parse(localStorage.getItem('miscom_appearance') || '{}'); } catch { return {}; }
}
function saveAppearance(data) {
  localStorage.setItem('miscom_appearance', JSON.stringify(data));
  applyExtras(data);
}

// Apply non-theme extras (font size, chat bubble, reduce motion)
export function applyExtras(cfg) {
  if (!cfg) cfg = getAppearance();
  const root = document.documentElement;

  // Font size
  const fs = FONT_SIZES.find(f => f.id === cfg.fontSize);
  if (fs) root.style.setProperty('--font-scale', fs.scale);

  // Chat bubble radius
  const cb = CHAT_BUBBLES.find(b => b.id === cfg.chatBubble);
  if (cb) root.style.setProperty('--chat-radius', cb.radius);

  // Reduced motion
  root.classList.toggle('reduce-motion', !!cfg.reduceMotion);
}

// Legacy export for backward compatibility
export function applyTheme(cfg) {
  if (!cfg) cfg = getAppearance();
  const root = document.documentElement;

  const theme = cfg.theme || 'light';
  let isDark = theme === 'dark';
  if (theme === 'system') isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  root.classList.toggle('dark', isDark);
  
  applyExtras(cfg);
}

export default function Appearance() {
  const navigate = useNavigate();
  const { theme, setTheme } = useGlobal();
  const [cfg, setCfg] = useState(getAppearance);

  useEffect(() => { applyExtras(cfg); }, [cfg]);

  const update = (key, val) => {
    const next = { ...cfg, [key]: val };
    setCfg(next);
    saveAppearance(next);
  };

  const handleThemeChange = (themeId) => {
    update('theme', themeId);
    if (themeId === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(isDark ? 'dark' : 'light');
    } else {
      setTheme(themeId);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
      className="bg-background text-on-background font-body-md min-h-screen pb-24">
      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-50 flex items-center gap-3 px-4 h-16 bg-background/80 backdrop-blur-xl border-b border-on-background/5">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="font-headline-md text-lg font-bold">Appearance</h1>
      </header>

      <main className="pt-20 px-5">
        {/* ── Theme ── */}
        <section className="mb-8">
          <h2 className="font-label-bold text-xs text-secondary uppercase tracking-wider mb-3">Theme</h2>
          <div className="grid grid-cols-3 gap-3">
            {THEMES.map(t => {
              const isActive = (cfg.theme || 'light') === t.id;
              return (
                <motion.button key={t.id} whileTap={{ scale: 0.95 }} onClick={() => handleThemeChange(t.id)}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                    isActive ? 'border-primary-container bg-primary-container/10 shadow-lg' : 'border-transparent bg-surface-container-low hover:bg-surface-container'}`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                    isActive ? 'bg-primary-container text-white shadow-[0_0_20px_rgba(225,29,72,0.3)]' : 'bg-surface-variant text-on-surface-variant'}`}>
                    <span className="material-symbols-outlined text-xl">{t.icon}</span>
                  </div>
                  <span className={`text-xs font-label-bold ${isActive ? 'text-primary-container' : 'text-on-surface'}`}>{t.label}</span>
                  <span className="text-[10px] text-secondary">{t.desc}</span>
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* ── Live Preview ── */}
        <section className="mb-8">
          <h2 className="font-label-bold text-xs text-secondary uppercase tracking-wider mb-3">Preview</h2>
          <div className="p-4 bg-surface-container-low rounded-2xl border border-on-background/5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-lg">person</span>
              </div>
              <div>
                <p className="font-label-bold text-sm text-on-surface">Alex ✨</p>
                <p className="text-[11px] text-secondary">@alexvibes</p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="self-start bg-surface-container rounded-2xl rounded-bl-md px-3 py-2 max-w-[70%]">
                <p className="text-[13px] text-on-surface">Hey! Love this theme 🔥</p>
              </div>
              <div className="self-end bg-primary-container text-white rounded-2xl rounded-br-md px-3 py-2 max-w-[70%]">
                <p className="text-[13px]">Right? The crimson vibes hit different ✨</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Font Size ── */}
        <section className="mb-8">
          <h2 className="font-label-bold text-xs text-secondary uppercase tracking-wider mb-3">Font Size</h2>
          <div className="flex gap-2">
            {FONT_SIZES.map(f => (
              <button key={f.id} onClick={() => update('fontSize', f.id)}
                className={`flex-1 py-3 rounded-xl text-center transition-all ${
                  (cfg.fontSize || 'default') === f.id ? 'bg-primary-container text-white font-bold shadow-lg' : 'bg-surface-container-low text-secondary'}`}>
                <span className="block text-sm font-label-bold">{f.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ── Chat Bubble Style ── */}
        <section className="mb-8">
          <h2 className="font-label-bold text-xs text-secondary uppercase tracking-wider mb-3">Chat Bubble Style</h2>
          <div className="flex gap-3">
            {CHAT_BUBBLES.map(b => (
              <button key={b.id} onClick={() => update('chatBubble', b.id)}
                className={`flex-1 py-3 rounded-xl text-center transition-all ${
                  (cfg.chatBubble || 'rounded') === b.id ? 'bg-primary-container text-white font-bold shadow-lg' : 'bg-surface-container-low text-secondary'}`}>
                <span className="text-sm font-label-bold">{b.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ── Toggles ── */}
        <section className="mb-8">
          <h2 className="font-label-bold text-xs text-secondary uppercase tracking-wider mb-4">Accessibility</h2>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl">
              <div>
                <p className="font-label-bold text-sm">Reduce Motion</p>
                <p className="text-[11px] text-secondary">Minimize animations throughout the app</p>
              </div>
              <button onClick={() => update('reduceMotion', !cfg.reduceMotion)}
                className={`w-12 h-7 rounded-full transition-all relative ${cfg.reduceMotion ? 'bg-primary-container' : 'bg-surface-variant'}`}>
                <div className={`w-5 h-5 bg-surface-container-lowest rounded-full absolute top-1 shadow transition-all ${cfg.reduceMotion ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl">
              <div>
                <p className="font-label-bold text-sm">Compact Mode</p>
                <p className="text-[11px] text-secondary">Smaller spacing for more content on screen</p>
              </div>
              <button onClick={() => update('compact', !cfg.compact)}
                className={`w-12 h-7 rounded-full transition-all relative ${cfg.compact ? 'bg-primary-container' : 'bg-surface-variant'}`}>
                <div className={`w-5 h-5 bg-surface-container-lowest rounded-full absolute top-1 shadow transition-all ${cfg.compact ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
          </div>
        </section>

        {/* ── Reset ── */}
        <button onClick={() => { 
          const def = { theme: 'light', fontSize: 'default', chatBubble: 'rounded' }; 
          setCfg(def); 
          saveAppearance(def); 
          setTheme('light'); 
        }}
          className="w-full py-3 bg-surface-container-low text-secondary rounded-2xl text-sm font-label-bold mb-4">
          Reset to Default
        </button>
      </main>
    </motion.div>
  );
}
