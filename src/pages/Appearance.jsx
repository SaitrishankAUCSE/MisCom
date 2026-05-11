import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Backend from '../lib/backend';

const THEMES = [
  { id: 'light', label: 'Light', icon: 'light_mode', preview: 'bg-white text-black' },
  { id: 'dark', label: 'Dark', icon: 'dark_mode', preview: 'bg-[#1a1a2e] text-white' },
  { id: 'system', label: 'System', icon: 'settings_suggest', preview: 'bg-gradient-to-b from-white to-[#1a1a2e] text-gray-600' },
];

const ACCENT_COLORS = [
  { id: 'rose', label: 'Rose', color: '#e11d48', css: '225 29 72' },
  { id: 'violet', label: 'Violet', color: '#7c3aed', css: '124 58 237' },
  { id: 'blue', label: 'Ocean', color: '#2563eb', css: '37 99 235' },
  { id: 'emerald', label: 'Emerald', color: '#059669', css: '5 150 105' },
  { id: 'amber', label: 'Amber', color: '#d97706', css: '217 119 6' },
  { id: 'pink', label: 'Pink', color: '#ec4899', css: '236 72 153' },
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
  applyTheme(data);
}

export function applyTheme(cfg) {
  if (!cfg) cfg = getAppearance();
  const root = document.documentElement;

  // Dark mode
  const theme = cfg.theme || 'light';
  let isDark = theme === 'dark';
  if (theme === 'system') isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  root.classList.toggle('dark', isDark);

  // Accent color
  const accent = ACCENT_COLORS.find(a => a.id === cfg.accent);
  if (accent) root.style.setProperty('--accent-rgb', accent.css);

  // Font size
  const fs = FONT_SIZES.find(f => f.id === cfg.fontSize);
  if (fs) root.style.setProperty('--font-scale', fs.scale);

  // Chat bubble radius
  const cb = CHAT_BUBBLES.find(b => b.id === cfg.chatBubble);
  if (cb) root.style.setProperty('--chat-radius', cb.radius);

  // Reduced motion
  root.classList.toggle('reduce-motion', !!cfg.reduceMotion);
}

export default function Appearance() {
  const navigate = useNavigate();
  const [cfg, setCfg] = useState(getAppearance);

  useEffect(() => { applyTheme(cfg); }, [cfg]);

  const update = (key, val) => {
    const next = { ...cfg, [key]: val };
    setCfg(next);
    saveAppearance(next);
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
      className="bg-background text-on-background font-body-md min-h-screen pb-24">
      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-50 flex items-center gap-3 px-4 h-16 bg-surface/80 backdrop-blur-xl border-b border-surface-variant/10">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="font-headline-md text-lg font-bold">Appearance</h1>
      </header>

      <main className="pt-20 px-5">
        {/* ── Theme ── */}
        <section className="mb-8">
          <h2 className="font-label-bold text-xs text-secondary uppercase tracking-wider mb-3">Theme</h2>
          <div className="grid grid-cols-3 gap-3">
            {THEMES.map(t => (
              <motion.button key={t.id} whileTap={{ scale: 0.95 }} onClick={() => update('theme', t.id)}
                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                  (cfg.theme || 'light') === t.id ? 'border-primary-container bg-primary-container/5 shadow-lg' : 'border-transparent bg-surface-container-low'}`}>
                <div className={`w-10 h-10 rounded-full ${t.preview} flex items-center justify-center shadow-inner`}>
                  <span className="material-symbols-outlined text-lg">{t.icon}</span>
                </div>
                <span className="text-xs font-label-bold">{t.label}</span>
              </motion.button>
            ))}
          </div>
        </section>

        {/* ── Accent Color ── */}
        <section className="mb-8">
          <h2 className="font-label-bold text-xs text-secondary uppercase tracking-wider mb-3">Accent Color</h2>
          <div className="flex gap-3 flex-wrap">
            {ACCENT_COLORS.map(a => (
              <motion.button key={a.id} whileTap={{ scale: 0.9 }} onClick={() => update('accent', a.id)}
                className={`w-12 h-12 rounded-full border-4 transition-all ${
                  (cfg.accent || 'rose') === a.id ? 'border-on-background scale-110 shadow-lg' : 'border-transparent'}`}
                style={{ backgroundColor: a.color }}>
                {(cfg.accent || 'rose') === a.id && <span className="material-symbols-outlined text-white text-sm">check</span>}
              </motion.button>
            ))}
          </div>
          <p className="text-[10px] text-secondary mt-2">Changes buttons, links, and highlights throughout the app.</p>
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
                <div className={`w-5 h-5 bg-white rounded-full absolute top-1 shadow transition-all ${cfg.reduceMotion ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl">
              <div>
                <p className="font-label-bold text-sm">Compact Mode</p>
                <p className="text-[11px] text-secondary">Smaller spacing for more content on screen</p>
              </div>
              <button onClick={() => update('compact', !cfg.compact)}
                className={`w-12 h-7 rounded-full transition-all relative ${cfg.compact ? 'bg-primary-container' : 'bg-surface-variant'}`}>
                <div className={`w-5 h-5 bg-white rounded-full absolute top-1 shadow transition-all ${cfg.compact ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
          </div>
        </section>

        {/* ── Reset ── */}
        <button onClick={() => { const def = { theme: 'light', accent: 'rose', fontSize: 'default', chatBubble: 'rounded' }; setCfg(def); saveAppearance(def); }}
          className="w-full py-3 bg-surface-container-low text-secondary rounded-2xl text-sm font-label-bold mb-4">
          Reset to Default
        </button>
      </main>
    </motion.div>
  );
}
