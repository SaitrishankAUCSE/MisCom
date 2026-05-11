import React from 'react';
import { format } from 'date-fns';
import { dissolveMessage, STATUS } from '../lib/messageStatus';

const RESONANCES = ['❤️', '🔥', '😂', '😮', '😢', '👏'];

export default function MessageBubble({
  message,
  isMine,
  isLastInGroup,
  chatId,
  currentUserId,
  onEchoBack,
  onAddResonance,
  onRemoveResonance,
}) {
  const [showTime, setShowTime] = React.useState(false);
  const [showPicker, setShowPicker] = React.useState(false);

  const myResonance = message.resonances?.[currentUserId];
  const allResonances = Object.values(message.resonances || {});
  const uniqueResonances = [...new Set(allResonances)];

  const timeStr = message.createdAt?.toDate
    ? format(message.createdAt.toDate(), 'h:mm a')
    : '';

  const statusLabel = () => {
    if (!isMine || !isLastInGroup) return null;
    const s = message.status;
    if (s === STATUS.SENDING) return 'Echoing…';
    if (s === STATUS.ECHOED)  return 'Echoed';
    if (s === STATUS.REACHED) return 'Reached';
    if (s === STATUS.FELT)    return 'Felt';
    return null;
  };

  if (message.dissolved || message.type === 'dissolved') {
    return (
      <div className={`flex w-full mb-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
        <div className="px-4 py-2 border border-dashed border-on-background/20 rounded-2xl opacity-40 italic text-xs">
          {isMine ? 'You dissolved this echo' : 'This echo dissolved'}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col w-full mb-0.5 ${isMine ? 'items-end' : 'items-start'}`}>
      <div className="relative group max-w-[80%]">
        {/* Reply Context */}
        {message.replyTo && (
          <div className="flex items-center gap-2 mb-1 px-1 opacity-50">
            <div className="w-0.5 h-6 bg-primary-container rounded-full" />
            <p className="text-[11px] truncate max-w-[150px]">{message.replyTo.text || '📷 Photo'}</p>
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* Bubble */}
          <div
            onClick={() => setShowTime(!showTime)}
            onContextMenu={(e) => { e.preventDefault(); setShowPicker(true); }}
            className={`px-4 py-2.5 rounded-2xl relative cursor-pointer select-none transition-all ${
              isMine 
                ? 'bg-primary-container text-white rounded-br-sm' 
                : 'bg-surface-container-high text-on-surface rounded-bl-sm border border-on-background/5'
            }`}
          >
            {message.type === 'text' && <p className="text-[15px] leading-tight">{message.text}</p>}
            {message.type === 'image' && (
              <img src={message.mediaUrl} alt="" className="max-w-full rounded-lg" />
            )}

            {/* Resonances */}
            {uniqueResonances.length > 0 && (
              <div className={`absolute -bottom-2 ${isMine ? 'left-2' : 'right-2'} bg-surface-container-highest border border-on-background/10 rounded-full px-1.5 py-0.5 flex items-center gap-0.5 shadow-lg z-10 scale-90 origin-center`}>
                <span className="text-xs">{uniqueResonances.join('')}</span>
                {allResonances.length > 1 && <span className="text-[9px] opacity-60 font-bold ml-0.5">{allResonances.length}</span>}
              </div>
            )}
          </div>
        </div>

        {/* Status / Time */}
        <div className={`flex flex-col mt-1 px-1 ${isMine ? 'items-end' : 'items-start'}`}>
          {showTime && <p className="text-[10px] opacity-40 uppercase tracking-tighter">{timeStr}</p>}
          {isMine && isLastInGroup && (
            <p className={`text-[10px] font-bold uppercase tracking-tighter ${message.status === STATUS.FELT ? 'text-primary-container' : 'opacity-30'}`}>
              {statusLabel()}
            </p>
          )}
        </div>

        {/* Reaction Picker Portal-like */}
        {showPicker && (
          <>
            <div className="fixed inset-0 z-[100]" onClick={() => setShowPicker(false)} />
            <div className={`absolute bottom-full mb-4 ${isMine ? 'right-0' : 'left-0'} z-[101] bg-surface-container-highest/95 backdrop-blur-xl border border-on-background/20 rounded-full p-2 flex items-center gap-2 shadow-2xl shadow-black/50 animate-in fade-in zoom-in slide-in-from-bottom-2 duration-200`}>
              {RESONANCES.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => {
                    myResonance === emoji ? onRemoveResonance(message.id) : onAddResonance(message.id, emoji);
                    setShowPicker(false);
                  }}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-125 ${myResonance === emoji ? 'bg-primary-container/20 ring-1 ring-primary-container' : ''}`}
                >
                  <span className="text-xl">{emoji}</span>
                </button>
              ))}
              <div className="w-px h-6 bg-on-background/10 mx-1" />
              <button
                onClick={() => { onEchoBack(message); setShowPicker(false); }}
                className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-on-background/5 text-on-surface"
              >
                <span className="material-symbols-outlined text-lg">reply</span>
              </button>
              {isMine && (
                <button
                  onClick={() => { dissolveMessage(chatId, message.id); setShowPicker(false); }}
                  className="px-3 h-9 rounded-full flex items-center justify-center hover:bg-error/10 text-error text-[11px] font-bold uppercase"
                >
                  Dissolve
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
