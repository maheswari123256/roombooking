import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging.js";

const firebaseConfig = {
  apiKey: "AIzaSyD8DOpnDhFMXXVOscjhLoW3If0ZhlKUBpo",
  authDomain: "staynotify-61da5.firebaseapp.com",
  projectId: "staynotify-61da5",
  storageBucket: "staynotify-61da5.appspot.com",
  messagingSenderId: "580938949690",
  appId: "1:580938949690:web:2b6234577a9cbe7aad4103"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Request permission
Notification.requestPermission().then((permission) => {
  if (permission === "granted") {
    console.log("Notification permission granted.");
    getToken(messaging, { vapidKey: "YOUR_VAPID_KEY" }).then((token) => {
      console.log("FCM Token:", token);

      // send token to backend
      fetch("/save-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "USER_ID_HERE", token }),
      });
    });
  }
});
