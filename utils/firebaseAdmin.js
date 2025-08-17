// config/firebase.js
const admin = require("firebase-admin");

let auth = null;

try {
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    console.warn("⚠️ Firebase environment variables are missing. Firebase features will be disabled.");
  } else if (process.env.FIREBASE_PRIVATE_KEY === "-----BEGIN PRIVATE KEY-----\\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQC7ZJf...\\n-----END PRIVATE KEY-----") {
    console.warn("⚠️ Firebase using placeholder credentials. Please provide real Firebase credentials.");
  } else {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
    
    console.log("✅ Firebase Admin Initialized");
    auth = admin.auth();
  }
} catch (error) {
  console.warn("⚠️ Firebase initialization failed:", error.message);
  console.warn("Firebase features will be disabled. Please provide valid Firebase credentials.");
}

module.exports = { admin, auth };
