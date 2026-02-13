// utils/notification.js
const { admin } = require("./firebaseAdmin"); // ensure correct path
/**
 * tokens: string | string[]
 */
const sendNotification = async (tokens, title, body) => {
  if (!tokens) return;
  // Normalize to array
  const tokensArray = Array.isArray(tokens) ? tokens.filter(Boolean) : [tokens];

  if (!tokensArray.length) return;

 const message = {
  notification: { title, body },
  tokens: tokensArray  // tokens array pass பண்ண வேண்டும்
};

const response = await admin.messaging().sendMulticast(message);
  try {
    const response = await admin.messaging().sendMulticast(message);
    console.log("✅ Notifications sent:", response.successCount, "/", tokensArray.length);

    // cleanup invalid tokens that failed
    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const err = resp.error;
          const badToken = tokensArray[idx];
          if (err && (err.code === 'messaging/registration-token-not-registered' || err.message?.includes('not a valid FCM'))) {
            // remove token from DB
            const User = require("../model/User");
            User.findOneAndUpdate(
              { fcmTokens: badToken },
              { $pull: { fcmTokens: badToken } }
            ).then(() => {
              console.log(`🧹 Removed invalid token ${badToken}`);
            }).catch(e => console.error("🧯 token cleanup error:", e.message));
          }
        }
      });
    }

  } catch (err) {
    console.error("❌ Error sending notification:", err.message);
  }
};

module.exports = { sendNotification };
