import React from 'react';

export default function Logo({ className = "w-10 h-10", showText = false, textColor = "text-primary", layout = "vertical" }) {
  const isHorizontal = layout === "horizontal";
  
  return (
    <div className={`flex ${isHorizontal ? 'flex-row items-center gap-2' : 'flex-col items-center justify-center'}`}>
      {/* The Logo Icon SVG */}
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        {/* The 'M' Shape */}
        <path 
          d="M25 80 V35 C25 25 35 20 42 28 L50 38 L58 28 C65 20 75 25 75 35 V80" 
          stroke="currentColor" 
          strokeWidth="18" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className="text-primary"
        />
        {/* The Chat Bubble Overlap */}
        <g transform="translate(32, 50)">
          {/* Bubble Background */}
          <path 
            d="M 18 36 C 28 36 36 28 36 18 C 36 8 28 0 18 0 C 8 0 0 8 0 18 C 0 23 2 27 5 30 L 2 36 L 9 34 C 12 35.5 15 36 18 36 Z" 
            fill="currentColor" 
            className="text-primary"
          />
          {/* Three Dots */}
          <circle cx="10" cy="18" r="2.5" fill="white" />
          <circle cx="18" cy="18" r="2.5" fill="white" />
          <circle cx="26" cy="18" r="2.5" fill="white" />
        </g>
      </svg>

      {/* Optional 'MisCom' Text */}
      {showText && (
        <span className={`font-display font-bold tracking-tight ${isHorizontal ? 'text-2xl mt-0' : 'text-2xl mt-1'} ${textColor}`}>
          MisCom
        </span>
      )}
    </div>
  );
}
