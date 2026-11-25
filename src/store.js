const STORAGE_KEY = "hybridscribe.notes.v1";

export const seedNotes = [
  {
    id: "product", title: "Product sync", category: "Product", icon: "layers",
    text: "We agreed to ship the new onboarding flow to 10% of users on Friday.\n\nMaya will update the welcome copy tomorrow. Leo will set up the activation dashboard before launch.\n\nOpen question: can Support cover the rollout?",
  },
  {
    id: "research", title: "Offline UX research", category: "Research", icon: "book",
    text: `We interviewed eight people who regularly take notes on the train, at events, or between client visits. Six had lost a draft because an app appeared to save it while the connection was down. People understood an offline indicator when it sat next to the editor, but missed it when it lived in a menu.

In the prototype, everyone could add and edit a note in airplane mode. Five people tapped the summarize button and expected a result immediately. A short summary was enough for a daily note, but participants wanted a detailed brief for long interviews. Two people asked whether their notes left the device when they pressed an AI button.

We decided to keep the editor responsive during processing and show the actual inference route near each result. The first prototype will prefer local inference for short summaries and tags. The next study will compare recognition of the route badge with and without the rationale line.

Aisha will recruit six additional participants by Wednesday. Jordan will prepare a train-commute scenario with intermittent connectivity and record time to first usable result. TODO: Add a fallback condition to the study script and capture whether the participant notices a route change.

Risk: Older laptops may fail the browser requirements for the on-device model. Open question: Should the app give users a way to prevent cloud fallback for sensitive notes? We also need to measure whether a model download changes what users expect during their first session.`,
  },
  {
    id: "travel", title: "Kyoto weekend", category: "Personal", icon: "compass",
    text: `Arrive in Kyoto Friday evening and drop the bags near the station. Saturday morning is for the Nishiki Market, followed by a walk along the Kamo River. Keep Sunday flexible for an early visit to Fushimi Inari if the weather is clear.

Book the airport train before Thursday. Download the offline map and send the itinerary to Dana. Open question: Does the guesthouse offer luggage storage on Sunday?`,
  },
];

export function loadNotes() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved) && saved.length && saved.every(
      (note) => note && ["id", "title", "text"].every((key) => typeof note[key] === "string"),
    )) return saved;
  } catch {
    // Fall back to samples when storage is unavailable or unreadable.
  }
  return seedNotes.map((note) => ({ ...note }));
}

export function saveNotes(notes) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    return true;
  } catch {
    return false;
  }
}

export function createNote() {
  return { id: crypto.randomUUID(), title: "", text: "", category: "Personal", icon: "file" };
}
