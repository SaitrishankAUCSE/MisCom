import { useState, useEffect, useRef, useCallback } from 'react';
import {
  collection, query, orderBy, limit,
  onSnapshot, addDoc, serverTimestamp,
  doc, updateDoc, getDoc, setDoc
} from 'firebase/firestore';
import { db, FirebaseSync } from '../lib/firebase';
import { STATUS, markThreadFelt, markThreadReached } from '../lib/messageStatus';

export function useChat(chatId, currentUserId) {
  const [messages,    setMessages]    = useState([]);
  const [isEchoing,   setIsEchoing]   = useState(false); 
  const [loading,     setLoading]     = useState(true);
  const [chatMeta,    setChatMeta]    = useState(null);
  const typingTimer = useRef(null);

  // ── Live chat meta listener (locking/connection status) ──────────────────
  useEffect(() => {
    if (!chatId || !FirebaseSync.isReady()) return;
    const unsub = onSnapshot(doc(db, 'chats', chatId), (snap) => {
      if (snap.exists()) setChatMeta(snap.data());
    });
    return unsub;
  }, [chatId]);

  // ── Live message listener ────────────────────────────────────────────────
  useEffect(() => {
    if (!chatId || !FirebaseSync.isReady()) return;
    const q = query(
      collection(db, `chats/${chatId}/messages`),
      orderBy('createdAt', 'asc'),
      limit(100)
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [chatId]);

  // ── Mark messages reached when chat loads ────────────────────────────────
  useEffect(() => {
    if (chatId && currentUserId && FirebaseSync.isReady()) {
      markThreadReached(chatId, currentUserId);
    }
  }, [chatId, currentUserId]);

  // ── Mark messages felt when user is actively viewing ─────────────────────
  useEffect(() => {
    if (!chatId || !currentUserId || loading || !FirebaseSync.isReady()) return;
    markThreadFelt(chatId, currentUserId);
  }, [chatId, currentUserId, messages, loading]);

  // ── Typing indicator listener ────────────────────────────────────────────
  useEffect(() => {
    if (!chatId || !currentUserId || !FirebaseSync.isReady()) return;
    const typingRef = doc(db, `typing_status/${chatId}`);
    const unsub = onSnapshot(typingRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      // Find if the OTHER person is typing
      const otherTyping = Object.entries(data).some(
        ([uid, val]) => uid !== currentUserId && val === true
      );
      setIsEchoing(otherTyping);
    });
    return unsub;
  }, [chatId, currentUserId]);

  // ── Announce "I am echoing..." ────────────────────────────────────────────
  const announceEchoing = useCallback(async () => {
    if (!chatId || !currentUserId || !FirebaseSync.isReady()) return;
    const typingRef = doc(db, `typing_status/${chatId}`);
    await setDoc(typingRef, { [currentUserId]: true }, { merge: true });

    // Auto-clear after 3s of no keystrokes
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(async () => {
      await setDoc(typingRef, { [currentUserId]: false }, { merge: true });
    }, 3000);
  }, [chatId, currentUserId]);

  const clearEchoing = useCallback(async () => {
    if (!chatId || !currentUserId || !FirebaseSync.isReady()) return;
    clearTimeout(typingTimer.current);
    const typingRef = doc(db, `typing_status/${chatId}`);
    await setDoc(typingRef, { [currentUserId]: false }, { merge: true });
  }, [chatId, currentUserId]);

  // ── Send a message (Echo) ────────────────────────────────────────────────────────
  const sendEcho = useCallback(async ({ text, type = 'text', mediaUrl = null, replyTo = null }) => {
    if (!chatId || !currentUserId || !FirebaseSync.isReady()) return;
    await clearEchoing();

    const payload = {
      senderId:   currentUserId,
      text:       text || null,
      type,                          // 'text' | 'image' | 'video' | 'audio' | 'file'
      mediaUrl,
      thumbnailUrl: type === 'video' ? (mediaUrl + '?thumb=1') : null, // Simulated thumbnail
      replyTo,                       
      status:     STATUS.ECHOED,     // 'sent'
      deliveredTo: [],               // Users who received the message
      seenBy:     [],                // Users who read the message
      resonances: {},                
      edited:     false,
      editedAt:   null,
      createdAt:  serverTimestamp(),
    };

    const ref = await addDoc(
      collection(db, `chats/${chatId}/messages`), payload
    );

    // Update chat metadata in 'chats' collection
    await updateDoc(doc(db, `chats/${chatId}`), {
      lastMessage:   text || (type === 'image' ? '📷 Photo' : '🎤 Voice'),
      lastSenderId:  currentUserId,
      lastTimestamp: serverTimestamp(),
      updatedAt:     serverTimestamp()
    });

    return ref.id;
  }, [chatId, currentUserId, clearEchoing]);

  // ── Add a resonance (reaction) ────────────────────────────────────────────
  const addResonance = useCallback(async (messageId, emoji) => {
    if (!FirebaseSync.isReady()) return;
    await updateDoc(
      doc(db, `chats/${chatId}/messages`, messageId),
      { [`resonances.${currentUserId}`]: emoji }
    );
  }, [chatId, currentUserId]);

  // ── Remove own resonance ──────────────────────────────────────────────────
  const removeResonance = useCallback(async (messageId) => {
    if (!FirebaseSync.isReady()) return;
    const { deleteField } = await import('firebase/firestore');
    await updateDoc(
      doc(db, `chats/${chatId}/messages`, messageId),
      { [`resonances.${currentUserId}`]: deleteField() }
    );
  }, [chatId, currentUserId]);

  const isLocked = chatMeta?.isRequest && !chatMeta?.requestAccepted && chatMeta?.requestFrom === currentUserId;

  return {
    messages,
    loading,
    isEchoing,
    isLocked,
    chatMeta,
    sendEcho,
    announceEchoing,
    clearEchoing,
    addResonance,
    removeResonance,
  };
}
