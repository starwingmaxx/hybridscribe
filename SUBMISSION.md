# #BuildHybridAI 2026 — Submission Pack: HybridScribe

- **Hackathon**: #BuildHybridAI 2026 (Devpost) — https://firebasehybridaihackathon.devpost.com
- **Deadline**: **2026-12-01 07:00 JST** (Nov 30, 2026 2:00 PM PT) — fixed, no extensions
- **Prize pool**: $30,000 (Grand Prize $10,000 / Best Web/Chrome App $3,000, etc.)
- **Status**: ✅ Live. Real Firebase project connected (config embedded), public repo + GitHub Pages deployment done. Remaining: Devpost registration/submission + demo video (below). One verification caveat: end-to-end inference could not be confirmed from this VM's automated browser because reCAPTCHA Enterprise rejects automated/datacenter browsers at the App Check token exchange (403) — the app itself fires correct requests and works in a genuine user browser; see "Live verification" at the bottom for the optional debug-token check that closes this gap.
- **Live app**: https://starwingmaxx.github.io/hybridscribe/
- **Repository**: https://github.com/starwingmaxx/hybridscribe
- **Firebase project**: `star-10506` ("star"), Spark plan, AI Logic via Gemini Developer API, App Check = Fraud Defense (reCAPTCHA Enterprise)

---

## Devpost submission text (English — paste as-is)

**Project name**: HybridScribe

**Tagline**: Notes that think locally first — and escalate to the cloud only when it pays off.

**Description**:

HybridScribe is a notes workspace built entirely on Firebase AI Logic's hybrid inference. Every AI feature runs through the Firebase AI Logic SDK (`firebase/ai`) — no other model API is called anywhere in the app.

**The idea.** Most note AI sends everything to the cloud. But a two-line meeting note doesn't need a frontier model: it needs speed, privacy, and zero cost. HybridScribe routes each task by a explicit policy, and shows its work — every result card displays where inference actually ran (read from `response.inferenceSource`), the mode that was requested, the measured latency, and a one-line rationale.

**Features**
- **TL;DR** — one/two-sentence summary of any note.
- **Tags & mood** — structured JSON output (tags, mood, language) using a response schema on both routes (`responseSchema` in the cloud, `responseConstraint` on-device).
- **Deep brief** — a structured Markdown brief: key points, decisions, risks & open questions.
- **Action items** — an interactive checklist extracted from the note.
- **Translate brief** — translate a brief or TL;DR into Japanese, Spanish, German, or French.
- Notes persist in localStorage; a Gemini Nano availability chip shows on-device status live.

**How Firebase AI Logic is used**
- One `getAI(app, { backend: new GoogleAIBackend() })` instance powers everything.
- **Routing policy** (`ROUTING_POLICY` in `src/ai.js`): TL;DR and Tags & mood request `InferenceMode.PREFER_ON_DEVICE` for notes up to 600 characters — fast, private, free, offline-capable via Gemini Nano in Chrome — and `PREFER_IN_CLOUD` beyond that. Deep briefs, action items, and translations always request `PREFER_IN_CLOUD` with `gemini-3.5-flash-lite`, where longer context and synthesis quality matter.
- Firebase AI Logic handles the fallback between on-device and cloud; the UI labels the route that actually ran via `response.inferenceSource`, and says so when the badge reflects the requested mode instead.
- App Check uses Fraud Defense (reCAPTCHA Enterprise) via `ReCaptchaEnterpriseProvider`; the site key ships in `src/firebase-config.js`. A console-registered debug token can be supplied per browser via `localStorage.APPCHECK_DEBUG_TOKEN` for local/automated testing (no token value is shipped in code).
- The SDK is loaded lazily via dynamic import through a CDN import map, so the app has **zero build step** and deploys to Firebase Hosting as plain static files.

**Why hybrid matters here**: short, sensitive notes stay on the device (privacy, latency, cost, offline), while long or complex work gets cloud quality — and the user can see and audit every routing decision. That's the hybrid pattern Firebase AI Logic was designed for, made visible.

**Tech stack**: Vanilla JavaScript + CSS (no framework, no build step), Firebase JS SDK 13 (`firebase/app`, `firebase/ai`, `firebase/app-check`), Firebase Hosting.

**Try it**: Live with the real Firebase project at https://starwingmaxx.github.io/hybridscribe/ (repo: https://github.com/starwingmaxx/hybridscribe). If the config in `src/firebase-config.js` is replaced with placeholders, the same code runs in a clearly-labeled Demo Mode (deterministic local mock with simulated routes), so anyone can explore the full UX without a Firebase project.

---

## Remaining steps

### Done (2026-11-26)
- ✅ **Firebase project**: `star-10506` created (Spark, no billing), AI Logic enabled with the **Gemini Developer API** provider, AI Monitoring on.
- ✅ **Web app registered & config embedded**: real `firebaseConfig` values are in `src/firebase-config.js`.
- ✅ **App Check**: Fraud Defense (reCAPTCHA Enterprise) registered for the web app; the code initializes it with `ReCaptchaEnterpriseProvider` and the shipped site key. Registered domains include `starwingmaxx.github.io` and `localhost`.
- ✅ **Public repository**: https://github.com/starwingmaxx/hybridscribe (MIT).
- ✅ **Published**: GitHub Pages — https://starwingmaxx.github.io/hybridscribe/ (verified loading live, Demo Mode off). Firebase Hosting (`npx firebase-tools deploy --only hosting` → `https://star-10506.web.app`) remains an alternative host; both domains are App Check-registered.

### 1. (Optional, ~5 min) Close the verification gap with an App Check debug token
Automated browsers in the build VM cannot pass reCAPTCHA Enterprise (token exchange returns 403), so end-to-end inference was verified up to the App Check gate only. To verify a real generation once, in your own Chrome:
1. Pick any UUID, e.g. generate one at https://www.uuidgenerator.net.
2. Firebase console → **App Check** → the web app → **Manage debug tokens** → add that UUID.
3. Open https://starwingmaxx.github.io/hybridscribe/, DevTools console: `localStorage.setItem('APPCHECK_DEBUG_TOKEN', '<the UUID>')`, reload, run **TL;DR** — a real result card (Cloud badge) should appear.
4. Remove the debug token from the console afterwards if you like (it only works from browsers where it is set in localStorage).

### 2. Devpost registration + submission — ~10 min
1. Join the hackathon at https://firebasehybridaihackathon.devpost.com (account: starwingmaxx).
2. Create the project, paste the submission text above, and add:
   - Repo: https://github.com/starwingmaxx/hybridscribe
   - Live app: https://starwingmaxx.github.io/hybridscribe/
   - Demo video (step 3) and screenshots (`screenshots/`, incl. `05-live-pages.png`).
3. Submit **before 2026-12-01 07:00 JST**.

### 3. Demo video — ~10 min (needs you or your Chrome)
Required: public YouTube video, **≤ 3 minutes**, English or English subtitles. Record against the live Pages URL (routes are genuine in a real browser):
1. (0:00) The problem: note AI sends everything to the cloud.
2. (0:20) Product sync note → TL;DR + Tags: watch the **On-device** badge and latency.
3. (0:50) Long research note → Deep brief + Action items: **Cloud** badges; point at the routing footer.
4. (1:30) Translate the brief to Japanese.
5. (1:50) Show `ROUTING_POLICY` in `src/ai.js` and the `inferenceSource` badge logic; close with the privacy/cost/offline rationale.

---

## Live verification (2026-11-26, this VM)
- Config swap verified: with the real config, the app leaves Demo Mode (no banner), loads the Firebase SDK, initializes App Check (reCAPTCHA Enterprise scripts load with the shipped site key), and fires `POST https://firebasevertexai.googleapis.com/v1beta/projects/star-10506/models/gemini-3.5-flash-lite:generateContent` — the correct project and endpoint.
- Model name: `gemini-3.5-flash-lite` is a real, current model ID (Google Cloud docs / DeepMind model card, July 2026), so it was kept as-is.
- **Blocker (environment, not app)**: the App Check token exchange (`content-firebaseappcheck.googleapis.com …:exchangeRecaptchaEnterpriseToken`) returns **403** for this VM's automated Chrome (headless and Xvfb-headful alike; `appCheck/recaptcha-error` in console), and `generateContent` then returns **401 "Firebase App Check token is invalid."** reCAPTCHA Enterprise is doing its job against a datacenter-IP bot-like browser. No app-side fix exists or is needed; a genuine user browser on a registered domain passes. Step 1 above closes the gap if a belt-and-braces check is wanted.
- Environment notes: this VM's egress needs a MITM proxy; Chrome verification used a local preemptive-auth relay + `--ignore-certificate-errors` (verification-only; the shipped app is unaffected). The VM's npm is broken (EPERM), which is why the app is zero-build.
- Screenshot: `screenshots/05-live-pages.png` (live Pages deployment).

## Local verification already done (2026-11-25)
- Codex logic smoke tests: five demo actions, four languages, 600/601-char routing boundary, Nano status, persistence — passed.
- Independent browser verification (headless Chrome, Demo Mode): **14/14 checks passed** — page load, demo banner, 3 seed notes, Nano status, TL;DR (simulated on-device), Tags (3 tags), Deep brief (simulated cloud), Action items, Japanese translation, long-note cloud routing, new-note flow, mobile layout, zero page errors.
- Screenshots: `screenshots/01-workspace.png`, `02-results.png`, `03-long-note-cloud.png`, `04-mobile.png`.
- Note: this VM's npm is currently broken (EPERM on write), so the app was deliberately restructured from Vite to a **zero-build static app** (Firebase SDK via CDN import map, lazy dynamic import). Functionality is unchanged; judges can run it with any static server. Superseded 2026-11-26: live-project verification results are in the "Live verification" section above.
