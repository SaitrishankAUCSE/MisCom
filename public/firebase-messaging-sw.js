importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// MisCom Firebase Configuration (Hardcoded for SW visibility)
firebase.initializeApp({
  apiKey: "AIzaSyALsXuYdXkuOAMHgaM6Ap8M5HW3nmZwbzE",
  authDomain: "miscom-app.firebaseapp.com",
  projectId: "miscom-app",
  storageBucket: "miscom-app.firebasestorage.app",
  messagingSenderId: "524446179930",
  appId: "1:524446179930:web:88834cfdf4f12f12742e63"
});

const messaging = firebase.messaging();

// Handle background notifications
messaging.onBackgroundMessage((payload) => {
  console.log('[MisCom SW] Background message received:', payload);
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || 'MisCom', {
    body:  body || '',
    icon:  '/logo192.png', // Assuming logo path
    badge: '/logo192.png',
    data:  payload.data,
    vibrate: [200, 100, 200],
  });
});

// Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  let url = '/';
  if (data.type === 'dm')   url = `/chat/${data.chatId}`;
  if (data.type === 'room') url = `/rooms/${data.roomId}`;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      clients.openWindow(url);
    })
  );
});
