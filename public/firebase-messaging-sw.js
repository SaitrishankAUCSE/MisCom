importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

let messaging = null;

self.addEventListener('message', (event) => {
  const config = event.data?.type === 'FIREBASE_CONFIG' ? event.data.config : null;
  if (!config || messaging) return;

  try {
    firebase.initializeApp(config);
    messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      const { title, body } = payload.notification || {};
      self.registration.showNotification(title || 'MisCom', {
        body: body || '',
        icon: '/manifest-icon-192.maskable.png',
        badge: '/manifest-icon-192.maskable.png',
        data: payload.data || {},
        vibrate: [200, 100, 200],
      });
    });
  } catch (error) {
    console.warn('[MisCom SW] Firebase messaging init failed:', error.message);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  let url = '/';
  if (data.type === 'dm') url = `/chat/${data.chatId}`;
  if (data.type === 'room') url = `/room/${data.roomId}`;

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
