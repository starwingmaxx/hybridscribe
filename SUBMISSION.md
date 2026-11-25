# #BuildHybridAI 2026 — Submission Pack: HybridScribe

- **Hackathon**: #BuildHybridAI 2026 (Devpost) — https://firebasehybridaihackathon.devpost.com
- **Deadline**: **2026-12-01 07:00 JST** (Nov 30, 2026 2:00 PM PT) — fixed, no extensions
- **Prize pool**: $30,000 (Grand Prize $10,000 / Best Web/Chrome App $3,000, etc.)
- **Status**: App built and verified locally in Demo Mode (14/14 browser checks passed). Remaining: your Firebase project + config paste + deploy + Devpost submission (below).

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
- App Check (reCAPTCHA v3) is initialized when a site key is configured; debug tokens work for local development.
- The SDK is loaded lazily via dynamic import through a CDN import map, so the app has **zero build step** and deploys to Firebase Hosting as plain static files.

**Why hybrid matters here**: short, sensitive notes stay on the device (privacy, latency, cost, offline), while long or complex work gets cloud quality — and the user can see and audit every routing decision. That's the hybrid pattern Firebase AI Logic was designed for, made visible.

**Tech stack**: Vanilla JavaScript + CSS (no framework, no build step), Firebase JS SDK 13 (`firebase/app`, `firebase/ai`, `firebase/app-check`), Firebase Hosting.

**Try it**: The repository runs in a clearly-labeled Demo Mode (deterministic local mock with simulated routes) when no Firebase config is present, so anyone can explore the full UX before connecting a project.

---

## Your remaining steps (tomorrow, ~30–40 min total)

### 1. Devpost registration — ~3 min
Open https://firebasehybridaihackathon.devpost.com and join the hackathon (account: starwingmaxx). *(Kinako cannot do this — it needs your logged-in browser.)*

### 2. Create the Firebase project — ~5 min
1. Go to https://console.firebase.google.com → **Add project** → name it e.g. `hybridscribe` → continue (Google Analytics can be off) → Create. The free **Spark** plan is enough; do **not** add billing.

### 3. Enable AI Logic — ~2 min
1. In the project, open **Build → AI Logic** → **Get started**.
2. Choose the **Gemini Developer API** provider (the free option) and enable it.

### 4. Register the web app and hand me the config — ~3 min
1. Project overview → **</>** (Web) → register an app (nickname `hybridscribe-web`; also check "Firebase Hosting" if offered).
2. Copy the `firebaseConfig` object values and paste them into `src/firebase-config.js` in this repo (replace every `REPLACE_ME`), and set the project id in `.firebaserc`.
   - Easiest: paste the config block into the chat and Kinako will place it.

### 5. (Recommended) App Check — ~5 min
AI Logic expects App Check. In the console: **Build → App Check** → register the web app with **reCAPTCHA v3** → copy the site key into `appCheckSiteKey` in `src/firebase-config.js`. For localhost testing, the debug-token flow in the README also works.

### 6. Deploy — ~5 min (Kinako can verify right after)
From the repo root, with the Firebase CLI signed in to your account:
```sh
npx firebase-tools login
npx firebase-tools deploy --only hosting
```
Your app URL will be `https://<project-id>.web.app`. Paste it into the Devpost submission ("hosted project URL" is strongly encouraged).

### 7. Public repository — Kinako does this
The repo is git-initialized with an MIT LICENSE. Once you say go, Kinako pushes it to a public GitHub repo under starwingmaxx (gh is already authenticated) — the Devpost form needs the repo URL.

### 8. Demo video — ~10 min (needs you or your Chrome)
Required: public YouTube video, **≤ 3 minutes**, English or English subtitles. Suggested flow (the app in Demo Mode is fine for UI, but record with the real config so routes are genuine):
1. (0:00) The problem: note AI sends everything to the cloud.
2. (0:20) Product sync note → TL;DR + Tags: watch the **On-device** badge and latency.
3. (0:50) Long research note → Deep brief + Action items: **Cloud** badges; point at the routing footer.
4. (1:30) Translate the brief to Japanese.
5. (1:50) Show `ROUTING_POLICY` in `src/ai.js` and the `inferenceSource` badge logic; close with the privacy/cost/offline rationale.

### 9. Submit on Devpost — ~5 min
Create the project on Devpost, paste the submission text above, add: repo URL, `https://<project-id>.web.app`, the YouTube video, and screenshots (in `screenshots/`). Submit **before 2026-12-01 07:00 JST**.

---

## Local verification already done (2026-11-25)
- Codex logic smoke tests: five demo actions, four languages, 600/601-char routing boundary, Nano status, persistence — passed.
- Independent browser verification (headless Chrome, Demo Mode): **14/14 checks passed** — page load, demo banner, 3 seed notes, Nano status, TL;DR (simulated on-device), Tags (3 tags), Deep brief (simulated cloud), Action items, Japanese translation, long-note cloud routing, new-note flow, mobile layout, zero page errors.
- Screenshots: `screenshots/01-workspace.png`, `02-results.png`, `03-long-note-cloud.png`, `04-mobile.png`.
- Note: this VM's npm is currently broken (EPERM on write), so the app was deliberately restructured from Vite to a **zero-build static app** (Firebase SDK via CDN import map, lazy dynamic import). Functionality is unchanged; judges can run it with any static server. Live Firebase inference can only be verified after step 4 (needs your project).
