import { useState, useEffect, useCallback } from 'react';
import {
  collection, query, orderBy, limit,
  onSnapshot, updateDoc, doc, writeBatch
} from 'firebase/firestore';
import { db, FirebaseSync } from '../lib/firebase';
import { onForegroundMessage } from '../lib/fcm';

export function useNotifications(uid) {
  const [notifications, setNotifications] = useState([]);
  const [toast, setToast]                 = useState(null); // { title, body, data }
  const unreadCount = notifications.filter(n => !n.read).length;

  // Live listener on Firestore notification feed
  useEffect(() => {
    if (!uid || !FirebaseSync.isReady()) return;
    const q = query(
      collection(db, `notifications/${uid}/user_notifs`),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [uid]);

  // Foreground push — show in-app toast instead of system notification
  useEffect(() => {
    if (!uid || !FirebaseSync.isReady()) return;
    const unsub = onForegroundMessage(({ title, body, data }) => {
      setToast({ title, body, data });
      // Auto-dismiss after 4s
      setTimeout(() => setToast(null), 4000);
    });
    return unsub;
  }, [uid]);

  // Mark a single notification read
  const markRead = useCallback(async (notifId) => {
    if (!uid || !FirebaseSync.isReady()) return;
    await updateDoc(doc(db, `notifications/${uid}/user_notifs`, notifId), { read: true });
  }, [uid]);

  // Mark all as read
  const markAllRead = useCallback(async () => {
    if (!uid || !notifications.length || !FirebaseSync.isReady()) return;
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;
    
    const batch  = writeBatch(db);
    unread.forEach(n => {
      batch.update(doc(db, `notifications/${uid}/user_notifs`, n.id), { read: true });
    });
    await batch.commit();
  }, [uid, notifications]);

  return { notifications, unreadCount, toast, setToast, markRead, markAllRead };
}
