// Firebase Messaging Service Worker
// This service worker handles background push notifications

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Firebase configuration will be injected at runtime
// For now, we'll use a placeholder that will be replaced during build
const firebaseConfig = {
  apiKey: self.FIREBASE_API_KEY || '',
  authDomain: self.FIREBASE_AUTH_DOMAIN || '',
  projectId: self.FIREBASE_PROJECT_ID || '',
  storageBucket: self.FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: self.FIREBASE_MESSAGING_SENDER_ID || '',
  appId: self.FIREBASE_APP_ID || '',
};

// Only initialize if config is available
if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  // Handle background messages
  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message:', payload);

    const notificationTitle = payload.notification?.title || 'Ortho Innovations';
    const notificationOptions = {
      body: payload.notification?.body || 'У вас новое уведомление',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: payload.data?.tag || 'default',
      data: payload.data,
      actions: [
        {
          action: 'open',
          title: 'Открыть',
        },
        {
          action: 'dismiss',
          title: 'Закрыть',
        },
      ],
      vibrate: [200, 100, 200],
      requireInteraction: true,
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });

  // Handle notification click
  self.addEventListener('notificationclick', (event) => {
    console.log('[firebase-messaging-sw.js] Notification click:', event);
    event.notification.close();

    const action = event.action;
    const data = event.notification.data;

    if (action === 'dismiss') {
      return;
    }

    // Open the app or focus existing window
    const urlToOpen = data?.url || '/';

    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        // Check if there's already a window open
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            if (data?.url) {
              client.navigate(urlToOpen);
            }
            return;
          }
        }
        // Open new window if none exists
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  });
} else {
  console.log('[firebase-messaging-sw.js] Firebase not configured - push notifications disabled');
}
