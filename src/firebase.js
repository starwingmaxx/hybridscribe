import { firebaseConfig, appCheckSiteKey, isConfigured } from "./firebase-config.js";

// The Firebase SDK is loaded lazily (dynamic import, resolved through the
// import map in index.html) so that Demo Mode — which needs no network and
// no Firebase project — always works, even fully offline.
let aiPromise;

export function getAIInstance() {
  if (!isConfigured()) return Promise.resolve(undefined);
  if (!aiPromise) {
    aiPromise = (async () => {
      const { getApps, initializeApp } = await import("firebase/app");
      const { getAI, GoogleAIBackend } = await import("firebase/ai");

      const app = getApps().find(({ name }) => name === "[DEFAULT]") ?? initializeApp(firebaseConfig);
      if (appCheckSiteKey.trim()) {
        // Optional: a console-registered App Check debug token, set per browser
        // via localStorage, lets automated/local browsers pass App Check where
        // reCAPTCHA cannot run. Nothing is shipped in code; without a token
        // registered in the Firebase console the value is useless.
        try {
          const debugToken = globalThis.localStorage?.getItem("APPCHECK_DEBUG_TOKEN");
          if (debugToken) globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
        } catch { /* storage unavailable — continue with reCAPTCHA */ }
        const { initializeAppCheck, ReCaptchaEnterpriseProvider } = await import("firebase/app-check");
        initializeAppCheck(app, {
          provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey.trim()),
          isTokenAutoRefreshEnabled: true,
        });
      } else {
        console.info("HybridScribe: App Check skipped because no site key is configured.");
      }

      return getAI(app, { backend: new GoogleAIBackend() });
    })();
  }
  return aiPromise;
}
