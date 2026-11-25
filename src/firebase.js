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
        const { initializeAppCheck, ReCaptchaV3Provider } = await import("firebase/app-check");
        initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider(appCheckSiteKey.trim()),
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
