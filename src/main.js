import { LANGUAGES, LOCAL_LIMIT, checkNano, runAction } from "./ai.js";
import { isConfigured } from "./firebase-config.js";
import { createNote, loadNotes, saveNotes } from "./store.js";

const icons = {
  bolt: '<path d="m13 2-9 12h7l-1 8 10-12h-7l1-8Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  file: '<path d="M13 3H5v18h14V9Zm0 0v6h6M8 13h8m-8 4h6"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5m-18 4 9 5 9-5"/>',
  book: '<path d="M5 3h14v18H6a2 2 0 0 1-2-2V5a2 2 0 0 1 1-2Zm-1 15a2 2 0 0 1 2-2h13M8 7h7m-7 4h5"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6 6-2Z"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  spark: '<path d="M12 2c0 6 4 10 10 10-6 0-10 4-10 10 0-6-4-10-10-10 6 0 10-4 10-10Z"/>',
  summary: '<path d="M4 6h16M4 12h12M4 18h8"/>',
  tag: '<path d="M3 4h8l10 10-7 7L3 10V4Z"/><path d="M7.5 8h.01"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  list: '<path d="m3 6 1 1 2-2m-3 7 1 1 2-2m-3 7 1 1 2-2M9 6h12M9 12h12M9 18h12"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18m-9-9c6 5 6 13 0 18-6-5-6-13 0-18Z"/>',
  cloud: '<path d="M7 18h11a4 4 0 0 0 0-8h-1A6 6 0 0 0 5.5 9 4.5 4.5 0 0 0 7 18Z"/>',
  shield: '<path d="m12 22 2-1c4-2 6-5 6-9V5l-8-3-8 3v7c0 4 2 7 6 9l2 1Z"/><path d="m9 12 2 2 4-4"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>',
};

const icon = (name, size = 18) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (char) => (
  { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]
));

const actions = [
  { id: "summary", title: "TL;DR", detail: "A quick summary", icon: "summary", light: true },
  { id: "tags", title: "Tags & mood", detail: "Topics and tone", icon: "tag", light: true },
  { id: "brief", title: "Deep brief", detail: "Key points and decisions", icon: "book" },
  { id: "actions", title: "Action items", detail: "A checklist to follow", icon: "list" },
  { id: "translate", title: "Translate brief", icon: "globe" },
];

const demoMode = !isConfigured();
const notes = loadNotes();
const sessions = new Map();
let selectedId = notes[0].id;
const app = document.querySelector("#app");
const currentNote = () => notes.find(({ id }) => id === selectedId);

function sessionFor(id) {
  if (!sessions.has(id)) sessions.set(id, { language: LANGUAGES[0], cards: new Map() });
  return sessions.get(id);
}

function renderHeader() {
  return `<header class="topbar">
    <div class="brand"><span class="brand-icon">${icon("bolt", 21)}</span><div><div class="brand-title">HybridScribe</div><div class="brand-subtitle">HYBRID AI NOTES</div></div></div>
    <div class="header-status"><span class="status-chip" id="nano-status" aria-live="polite"><i></i>Gemini Nano: not checked yet</span><span class="event-chip">#BuildHybridAI 2026</span></div>
  </header>
  ${demoMode ? `<div class="demo-banner"><span class="demo-tag">${icon("info", 15)} Demo Mode</span><span>AI routes are simulated. Try all five actions without a Firebase project.</span></div>` : ""}`;
}

function renderNotes() {
  const noteList = document.querySelector("#note-list");
  noteList.innerHTML = notes.map((note, index) => `<button class="note-item" data-note="${index}" ${note.id === selectedId ? 'aria-current="true"' : ""}>
    <span class="note-icon tone-${["product", "research", "travel"].includes(note.id) ? note.id : "custom"}">${icon(Object.hasOwn(icons, note.icon) ? note.icon : "file", 17)}</span>
    <span class="note-label"><strong>${escapeHTML(note.title.trim() || "Untitled note")}</strong><small>${escapeHTML(note.category || "Personal")} <span>·</span> ${note.text.length.toLocaleString()} chars</small></span>
    <span class="note-chevron">${icon("chevron", 14)}</span>
  </button>`).join("");
  document.querySelector("#note-count").textContent = notes.length;
}

function renderEditor() {
  const note = currentNote();
  document.querySelector("#editor").innerHTML = `
    <div class="panel-heading editor-heading"><span class="panel-icon">${icon("file", 20)}</span><div><h2>Note editor</h2><p>Write or paste your notes</p></div><span class="save-status" id="save-status">${icon("shield", 15)} Local storage</span></div>
    <div class="editor-fields">
      <input id="note-title" aria-label="Note title" placeholder="Untitled note" value="${escapeHTML(note.title)}">
      <p class="editor-category">${escapeHTML(note.category || "Personal")}</p>
      <textarea id="note-text" aria-label="Note text" placeholder="Write or paste a note to get started…" spellcheck="true"></textarea>
    </div>
    <div class="editor-footer"><span id="note-length"></span><span class="route-hint" id="route-hint"></span></div>`;
  document.querySelector("#note-text").value = note.text;
  renderEditorStats();
}

function renderEditorStats() {
  const length = currentNote().text.length;
  document.querySelector("#note-length").textContent = `${length.toLocaleString()} ${length === 1 ? "character" : "characters"}`;
  const badge = document.querySelector("#route-hint");
  badge.classList.toggle("cloud", length > LOCAL_LIMIT);
  badge.innerHTML = length > LOCAL_LIMIT
    ? `${icon("cloud", 15)} Cloud preferred for quick actions`
    : `${icon("bolt", 14)} On-device preferred for quick actions`;
}

function renderActions() {
  document.querySelector("#actions").innerHTML = `
    <div class="panel-heading"><span class="panel-icon purple">${icon("spark", 20)}</span><div><h2>AI actions</h2><p>Turn your note into something useful</p></div></div>
    <div class="actions-grid">${actions.filter(({ id }) => id !== "translate").map((action) => `
      <button class="action-button" data-action="${action.id}"><span class="action-icon ${action.light ? "green" : "purple"}">${icon(action.icon, 17)}</span><span><strong>${action.title}</strong><small>${action.detail}</small></span></button>
    `).join("")}</div>
    <div class="translate-row">
      <button class="action-button translate-button" data-action="translate" aria-describedby="translate-hint"><span class="action-icon purple">${icon("globe", 17)}</span><span><strong>Translate brief</strong><small id="translate-hint"></small></span></button>
      <label class="language-picker"><span class="sr-only">Target language</span><select id="language">${LANGUAGES.map((language) => `<option>${language}</option>`).join("")}</select>${icon("down", 14)}</label>
    </div>`;
  document.querySelector("#language").value = sessionFor(selectedId).language;
  updateActionState();
}

function updateActionState() {
  const { cards } = sessionFor(selectedId);
  const hasText = Boolean(currentNote().text.trim());
  const source = translationSource(cards);
  for (const button of document.querySelectorAll("[data-action]")) {
    const { action } = button.dataset;
    button.disabled = !hasText || cards.get(action)?.status === "pending" || (action === "translate" && !source);
  }
  document.querySelector("#translate-hint").textContent = source
    ? `Translate the generated ${cards.get("brief")?.result ? "brief" : "TL;DR"}`
    : "Generate a brief or TL;DR first";
}

function translationSource(cards) {
  return cards.get("brief")?.result?.output ?? cards.get("summary")?.result?.output;
}

function inlineMarkdown(value) {
  return escapeHTML(value).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

function renderMarkdown(text) {
  const groups = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const heading = trimmed.match(/^#{1,6}\s+(.+)$/);
    const checklist = trimmed.match(/^[-*]\s+\[([ xX])\]\s+(.+)$/);
    const bullet = trimmed.match(/^[-*]\s+(.+)$/);
    if (heading) {
      groups.push({ html: `<h4>${inlineMarkdown(heading[1])}</h4>` });
    } else if (checklist || bullet) {
      const listItem = checklist
        ? `<li class="check-item"><label><input type="checkbox" ${checklist[1] === " " ? "" : "checked"}><span>${inlineMarkdown(checklist[2])}</span></label></li>`
        : `<li>${inlineMarkdown(bullet[1])}</li>`;
      if (groups.at(-1)?.items) groups.at(-1).items.push(listItem);
      else groups.push({ items: [listItem] });
    } else {
      groups.push({ html: `<p>${inlineMarkdown(trimmed)}</p>` });
    }
  }
  return groups.map(({ items, html }) => items ? `<ul>${items.join("")}</ul>` : html).join("");
}

function renderResult(action, card) {
  const title = actions.find(({ id }) => id === action).title;
  if (card.status === "pending") {
    return `<article class="result-card pending"><h3>${title}</h3><p>Generating…</p><div class="skeleton"></div><div class="skeleton short"></div></article>`;
  }
  if (card.status === "error") {
    return `<article class="result-card error" role="alert"><h3>${title} failed</h3><p>${escapeHTML(card.error)}</p></article>`;
  }
  const { result } = card;
  const local = result.route === "on_device";
  const badge = result.source === "demo"
    ? `Demo (simulated ${local ? "on-device" : "cloud"})`
    : local ? "On-device" : "Cloud";
  const mode = String(result.mode).toUpperCase();
  const output = action === "tags"
    ? `<div class="tags">${result.output.tags.map((tag) => `<span>${escapeHTML(tag)}</span>`).join("")}</div><dl class="tag-details"><div><dt>Mood</dt><dd>${escapeHTML(result.output.mood)}</dd></div><div><dt>Language</dt><dd>${escapeHTML(result.output.language)}</dd></div></dl>`
    : renderMarkdown(result.output);
  return `<article class="result-card">
    <div class="result-top"><h3>${title}${result.language && action === "translate" ? " · " + escapeHTML(result.language) : ""}</h3><span class="result-badge ${local ? "green" : "purple"}">${icon(local ? "bolt" : "cloud", 14)} ${badge}</span></div>
    <div class="result-meta"><span>Requested <code>${escapeHTML(mode)}</code></span><span>${result.latency} ms</span></div>
    <div class="result-copy">${output}</div>
    <p class="rationale">${icon("info", 14)}<span>${escapeHTML(result.rationale)}${result.source === "firebase" && !result.reportedRoute ? " Badge reflects the requested mode." : ""}</span></p>
  </article>`;
}

function renderResults() {
  const { cards } = sessionFor(selectedId);
  document.querySelector("#results").innerHTML = `
    <div class="results-heading"><h2>Results</h2>${cards.size ? `<span>${cards.size}</span>` : ""}</div>
    ${cards.size ? `<div class="result-list">${[...cards].reverse().map(([action, card]) => renderResult(action, card)).join("")}</div>`
      : `<div class="empty-results"><span class="empty-icon">${icon("spark", 20)}</span><strong>No results yet</strong><p>Pick an AI action to see its output and route here.</p></div>`}`;
}

function renderFooter() {
  return `<footer class="routing-footer" aria-labelledby="routing-title">
    <div class="routing-heading"><span class="panel-icon">${icon("layers", 19)}</span><div><h2 id="routing-title">How routing works</h2><p>Firebase AI Logic picks an available route based on the app’s requested mode.</p></div></div>
    <div class="routing-detail"><span class="green">${icon("bolt", 16)} On-device first</span><p>TL;DR and tags try Gemini Nano first for notes up to 600 characters.</p></div>
    <div class="routing-detail"><span class="purple">${icon("cloud", 17)} Cloud preferred</span><p>Long notes, deep briefs, action items, and translations favor the cloud Gemini Flash model.</p></div>
  </footer>`;
}

app.innerHTML = `${renderHeader()}
  <div class="workspace">
    <aside class="sidebar" aria-label="Notes">
      <div class="sidebar-heading"><h2>My notes <span id="note-count"></span></h2><button id="new-note" class="new-note">${icon("plus", 17)} New note</button></div>
      <nav id="note-list" class="note-list" aria-label="Note list"></nav>
      <p class="sidebar-footer">${icon("shield", 16)} Notes are stored in this browser.</p>
    </aside>
    <main>
      <div class="workspace-heading"><div class="breadcrumb">Workspace ${icon("chevron", 12)} <span>Notes</span></div><h1>Notes workspace</h1><p>Capture ideas, then choose how to work with them.</p></div>
      <div class="work-grid">
        <section class="panel editor" id="editor" aria-label="Note editor"></section>
        <div class="assistant-column"><section class="panel" id="actions" aria-label="AI actions"></section><section class="results" id="results" aria-live="polite" aria-label="AI results"></section></div>
      </div>
      ${renderFooter()}
    </main>
  </div>`;

function renderWorkspace() {
  renderNotes();
  renderEditor();
  renderActions();
  renderResults();
}

function persistNotes() {
  document.querySelector("#save-status").innerHTML = saveNotes(notes)
    ? `${icon("check", 15)} Saved locally`
    : `${icon("info", 15)} Storage unavailable`;
}

app.addEventListener("input", (event) => {
  if (!["note-title", "note-text"].includes(event.target.id)) return;
  const note = currentNote();
  if (event.target.id === "note-title") {
    note.title = event.target.value;
  } else {
    note.text = event.target.value;
    sessionFor(note.id).cards.clear();
    renderEditorStats();
    renderResults();
    updateActionState();
  }
  persistNotes();
  renderNotes();
});

app.addEventListener("change", (event) => {
  if (event.target.id === "language") sessionFor(selectedId).language = event.target.value;
});

app.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.id === "new-note") {
    const note = createNote();
    notes.unshift(note);
    selectedId = note.id;
    renderWorkspace();
    persistNotes();
    document.querySelector("#note-title").focus();
    return;
  }
  if (button.dataset.note !== undefined) {
    selectedId = notes[Number(button.dataset.note)].id;
    renderWorkspace();
    document.querySelector('[aria-current="true"]').focus();
    return;
  }

  const action = button.dataset.action;
  if (!action || button.disabled) return;
  const note = currentNote();
  const { cards, language } = sessionFor(note.id);
  const sourceText = translationSource(cards);
  const pending = { status: "pending" };
  cards.delete(action);
  cards.set(action, pending);
  renderResults();
  updateActionState();

  try {
    const result = await runAction(action, note.text, { language, sourceText });
    if (cards.get(action) === pending) cards.set(action, { status: "done", result });
  } catch (error) {
    if (cards.get(action) === pending) {
      cards.set(action, { status: "error", error: error?.message || "Try generating this result again." });
    }
  }
  if (note.id === selectedId) {
    renderResults();
    updateActionState();
  }
});

renderWorkspace();
checkNano().then((available) => {
  const status = document.querySelector("#nano-status");
  status.classList.toggle("available", available);
  status.innerHTML = `<i></i>Gemini Nano: ${available ? "available" : "unavailable"}`;
});
