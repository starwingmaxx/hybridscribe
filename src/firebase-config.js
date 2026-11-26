// Web app config from Firebase console > Project settings > Your apps > Web app
// (project "star", star-10506). These are client-public values, safe to ship.
// Firebase AI Logic is enabled with the Gemini Developer API provider.
// App Check uses Fraud Defense (reCAPTCHA Enterprise); the site key below is
// the registered web key for this app.
export const firebaseConfig = {
  apiKey: "AIzaSyCks4h7nSSWO0sSnDcfG2-Lp--OoSjdj7s",
  authDomain: "star-10506.firebaseapp.com",
  projectId: "star-10506",
  storageBucket: "star-10506.firebasestorage.app",
  messagingSenderId: "581422321404",
  appId: "1:581422321404:web:25e25ac88edef4f230d179",
  measurementId: "G-79EWS43WPM",
};

export const appCheckSiteKey = "6LdlNTMuAAAAAAGVMoT5PoBzmPe808yPdo-gZy76";
export const isConfigured = () => firebaseConfig.apiKey !== "REPLACE_ME";
