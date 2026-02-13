// utils/firebaseAdmin.js
const admin = require("firebase-admin");
const User = require("../model/User"); 

// ✅ Load service account from ENV
const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

/**
 * ✅ Save FCM token to user document (no duplicates)
 */
const saveFcmToken = async (userId, token) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    if (!user.fcmTokens.includes(token)) {
      user.fcmTokens.push(token);
      await user.save();
    }
  } catch (err) {
    console.error("Error saving FCM token:", err);
  }
};

/**
 * ✅ Send notification to multiple tokens
 */
const sendNotification = async (tokens, title, body, data = {}) => {
  if (!tokens || tokens.length === 0) return;

  try {
    const message = {
      notification: { title, body },
      data,
      tokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    const invalidTokens = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        console.error("FCM error:", resp.error);
        invalidTokens.push(tokens[idx]);
      }
    });

    if (invalidTokens.length > 0) {
      await User.updateMany(
        { fcmTokens: { $in: invalidTokens } },
        { $pull: { fcmTokens: { $in: invalidTokens } } }
      );
      console.log("❌ Invalid tokens removed:", invalidTokens);
    }

    return response;
  } catch (err) {
    console.error("Error sending notification:", err);
  }
};

module.exports = { admin, saveFcmToken, sendNotification };
