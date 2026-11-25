# HybridScribe

HybridScribe is a #BuildHybridAI 2026 notes workspace. Write or paste a note, then generate a quick summary, tags and mood, a deep brief, an action checklist, or a translation. Each result shows its route, requested inference mode, measured latency, and the reason for the routing preference.

## Run locally

HybridScribe is a zero-build static web app — there is nothing to install or compile. Serve the repository root with any static file server, for example:

```sh
python3 -m http.server 8080
# then open http://localhost:8080
```

The Firebase JS SDK (v13.4.0) is loaded as ES modules from the official CDN through the import map in [index.html](index.html), and only when a real Firebase config is present (see Demo mode). Opening `index.html` via `file://` will not work because ES modules require HTTP.

The starter workspace includes a product sync, an offline UX research dump, and a Kyoto itinerary. Notes save to the current browser's localStorage. Results are kept in memory per note and cleared when the note text changes. To translate, generate a Deep brief or TL;DR, select Japanese, Spanish, German, or French, and click **Translate brief**. A completed Deep brief takes priority over TL;DR.

## Demo mode

With the placeholder Firebase API key, all five actions use a deterministic local mock with simulated routes and latency. Open **Product sync** to try both route types and see sample translations in all four languages. For arbitrary notes, demo translation previews the localized structure and keeps any unrecognized text in its original language. Full translation is available with Firebase configured. Demo mode makes no inference requests.

## How routing works

`src/ai.js` exports `ROUTING_POLICY` and applies it before making any request.

| Action | Condition | Requested mode | Rationale |
| --- | --- | --- | --- |
| TL;DR, Tags & mood | 600 characters or fewer | `PREFER_ON_DEVICE` | Small transformations can try Gemini Nano first. |
| TL;DR, Tags & mood | More than 600 characters | `PREFER_IN_CLOUD` | Favor the cloud model for longer context. |
| Deep brief | Any length | `PREFER_IN_CLOUD` | Favor synthesis quality and longer context. |
| Action items | Any length | `PREFER_IN_CLOUD` | Extract tasks, owners, and deadlines across the note. |
| Translate brief | Any length | `PREFER_IN_CLOUD` | Favor translation quality and structure preservation. |

Firebase AI Logic handles hybrid fallback. The badge uses `result.response.inferenceSource` when supplied. When the field is unavailable, the card states that its badge reflects the requested mode. The Gemini Nano status chip checks browser availability without running inference. On-device support depends on Chrome, the device, and model availability. [Firebase hybrid web setup](https://firebase.google.com/docs/ai-logic/hybrid/web/get-started)

## Configure Firebase

1. Create a project in the [Firebase console](https://console.firebase.google.com/).
2. Enable **Firebase AI Logic** and select the **Gemini Developer API** provider.
3. Register a web app under **Project settings → Your apps**. Copy its config into [src/firebase-config.js](src/firebase-config.js).
4. To use **App Check**, register the web app with reCAPTCHA v3 and set `appCheckSiteKey`. The app initializes App Check only when a site key is present. For local development with App Check enabled, temporarily set `self.FIREBASE_APPCHECK_DEBUG_TOKEN = true` before `initializeAppCheck`, reload, and register the token printed in the browser console. Keep the token private and remove the debug setting before deployment. [App Check web debug provider](https://firebase.google.com/docs/app-check/web/debug-provider)
5. Open the app and run TL;DR on both the product sample and the research sample to see the different requested modes.

The configured cloud model is `gemini-3.5-flash-lite` (the Firebase JS SDK 13 default for the Gemini Developer API backend; change the single `CLOUD_MODEL` constant in `src/ai.js` to use another model).

### SDK integration

```js
import { initializeApp } from "firebase/app";
import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode } from "firebase/ai";

const app = initializeApp(firebaseConfig);
const ai = getAI(app, { backend: new GoogleAIBackend() });
const hybridModel = getGenerativeModel(ai, {
  mode: InferenceMode.PREFER_ON_DEVICE,
  inCloudParams: { model: CLOUD_MODEL }
});
const cloudModel = getGenerativeModel(ai, {
  mode: InferenceMode.PREFER_IN_CLOUD,
  inCloudParams: { model: CLOUD_MODEL }
});
const model = useDeviceFirst ? hybridModel : cloudModel;
const result = await model.generateContent(prompt);
const text = result.response.text();
const route = result.response.inferenceSource;
```

In the shipped code the SDK modules are resolved through the CDN import map in `index.html` and imported dynamically (`await import("firebase/ai")`) on first live use, so Demo Mode never touches the network. The app initializes Firebase lazily. Tags & mood adds `generationConfig: { responseMimeType: "application/json", responseSchema: tagsSchema }` to `inCloudParams` and the equivalent schema under `onDeviceParams.promptOptions.responseConstraint`. The result is validated before rendering. [Firebase hybrid structured output](https://firebase.google.com/docs/ai-logic/hybrid/web/generate-structured-output)

## Deploy

There is no build step. Set your project ID in `.firebaserc`, sign in with the Firebase CLI, and deploy the repository root as-is:

```sh
firebase deploy --only hosting
```

Firebase Hosting serves the directory configured in [firebase.json](firebase.json) (the repository root) and rewrites app routes to `index.html`. Any other static host (GitHub Pages, Netlify, Cloudflare Pages) works the same way — just publish the repository root.

## Stack and license

Vanilla JavaScript and CSS (no build step), Firebase JS SDK 13 loaded via CDN import map, Firebase Hosting. MIT licensed. See [LICENSE](LICENSE).
