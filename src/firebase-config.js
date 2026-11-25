// Copy your web app config from Firebase console > Project settings > Your apps > Web app.
// Enable Firebase AI Logic in the project with the Gemini Developer API provider.
// If you register the web app with App Check, paste its reCAPTCHA v3 site key below.
export const firebaseConfig = {
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME.firebaseapp.com",
  projectId: "REPLACE_ME",
  storageBucket: "REPLACE_ME.firebasestorage.app",
  messagingSenderId: "REPLACE_ME",
  appId: "REPLACE_ME",
};

export const appCheckSiteKey = "";
export const isConfigured = () => firebaseConfig.apiKey !== "REPLACE_ME";
