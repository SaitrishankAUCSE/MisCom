import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc }                    from 'firebase/firestore';
import { db } from './firebase';
import FirebaseSync from './firebase';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

let messaging = null;

// Call this once after the user logs in and has completed onboarding
export async function registerFCMToken(uid) {
  if (!FirebaseSync.isReady() || !VAPID_KEY) return;
  try {
    messaging = getMessaging();
    const registration = await navigator.serviceWorker?.ready;
    const firebaseConfig = FirebaseSync.getConfig();
    if (registration && firebaseConfig) {
      registration.active?.postMessage({ type: 'FIREBASE_CONFIG', config: firebaseConfig });
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('[MisCom] Notification permission denied');
      return;
    }

    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
    if (!token) return;

    // Save to Firestore so Cloud Function can read it
    await updateDoc(doc(db, 'users', uid), { fcmToken: token });
    console.log('[MisCom] FCM Token registered');
  } catch (err) {
    console.error('[MisCom] FCM registration failed:', err);
  }
}

// Subscribe to foreground messages — returns an unsubscribe function
export function onForegroundMessage(callback) {
  if (!messaging || !FirebaseSync.isReady()) return () => {};
  return onMessage(messaging, (payload) => {
    callback({
      title: payload.notification?.title || '',
      body:  payload.notification?.body  || '',
      data:  payload.data || {},
    });
  });
}
