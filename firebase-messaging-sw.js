importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyD8DOpnDhFMXXVOscjhLoW3If0ZhlKUBpo",
  authDomain: "staynotify-61da5.firebaseapp.com",
  projectId: "staynotify-61da5",
  storageBucket: "staynotify-61da5.appspot.com",
  messagingSenderId: "580938949690",
  appId: "1:580938949690:web:2b6234577a9cbe7aad4103",
  measurementId: "G-RXTK4F53FS"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  console.log('[SW] Background message:', payload);
  if (payload.notification) {
    self.registration.showNotification(payload.notification.title, {
      body: payload.notification.body,
      icon: '/icon.png'
    });
  }
});
