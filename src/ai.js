import { getAIInstance } from "./firebase.js";
import { isConfigured } from "./firebase-config.js";
import { generateMock } from "./mock.js";

// InferenceMode values from Firebase AI Logic (firebase/ai). They are plain
// strings in the SDK; keeping them here lets the routing policy and Demo Mode
// run without loading the SDK. The SDK itself is imported dynamically, only
// on the live path in runAction().
const InferenceMode = Object.freeze({
  PREFER_ON_DEVICE: "prefer_on_device",
  PREFER_IN_CLOUD: "prefer_in_cloud",
  ONLY_ON_DEVICE: "only_on_device",
  ONLY_IN_CLOUD: "only_in_cloud",
});

export const CLOUD_MODEL = "gemini-3.5-flash-lite";
export const LANGUAGES = ["Japanese", "Spanish", "German", "French"];
export const LOCAL_LIMIT = 600;

const lightweightMode = (length) => length <= LOCAL_LIMIT
  ? InferenceMode.PREFER_ON_DEVICE
  : InferenceMode.PREFER_IN_CLOUD;
const cloudMode = () => InferenceMode.PREFER_IN_CLOUD;

export const ROUTING_POLICY = Object.freeze({
  summary: lightweightMode,
  tags: lightweightMode,
  brief: cloudMode,
  actions: cloudMode,
  translate: cloudMode,
});

const instructions = {
  summary: "Summarize the note in one or two sentences. Keep the note's language.",
  tags: "Return exactly three concise topical tags, a mood label, and the dominant language as JSON with keys tags, mood, and language.",
  brief: "Write a Markdown brief with headings Key points, Decisions, and Risks & open questions. Use bullets and mention when a section has no recorded items.",
  actions: "Extract explicit tasks as a Markdown checklist (- [ ]). Include owners and deadlines only where recorded. If there are no tasks say so.",
  translate: (language) => `Translate the supplied brief or summary into ${language}. Preserve Markdown structure and proper names. Return only the translation.`,
};

function buildTagsSchema(Schema) {
  return Schema.object({
    properties: {
      tags: Schema.array({ items: Schema.string(), minItems: 3, maxItems: 3 }),
      mood: Schema.string(),
      language: Schema.string(),
    },
  });
}

export function describeRoute(action, length) {
  if (action === "summary" || action === "tags") {
    return length <= LOCAL_LIMIT
      ? "This note fits within 600 characters, so the policy tries the device first."
      : "This note exceeds 600 characters, so the policy favors cloud context.";
  }
  return {
    brief: "A structured brief benefits from cloud quality and longer context.",
    actions: "The cloud model can track tasks, owners, and deadlines across long notes.",
    translate: "The policy favors cloud quality for translation.",
  }[action];
}

function parseTags(text) {
  let data;
  try {
    data = JSON.parse(text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""));
  } catch {
    throw new Error("The model returned unreadable tags. Try generating them again.");
  }
  const valid = (value) => typeof value === "string" && value.trim().length > 0;
  if (!Array.isArray(data?.tags) || data.tags.length !== 3 || !data.tags.every(valid)
      || !valid(data.mood) || !valid(data.language)) {
    throw new Error("The response is missing tags, mood, or language. Try again.");
  }
  return { tags: data.tags.map((tag) => tag.trim()), mood: data.mood.trim(), language: data.language.trim() };
}

export async function runAction(action, noteText, { language, sourceText } = {}) {
  if (!Object.hasOwn(ROUTING_POLICY, action)) throw new Error("Unknown action.");
  if (!noteText.trim()) throw new Error("Write or paste a note first.");
  if (action === "translate" && (!LANGUAGES.includes(language) || !sourceText?.trim())) {
    throw new Error("Generate a Deep brief or TL;DR and choose a language first.");
  }

  const mode = ROUTING_POLICY[action](noteText.length);
  const preferredRoute = mode === InferenceMode.PREFER_ON_DEVICE ? "on_device" : "in_cloud";
  const input = action === "translate" ? sourceText : noteText;
  const source = isConfigured() ? "firebase" : "demo";
  const start = performance.now();
  let route = preferredRoute;
  let reportedRoute = false;
  let output;

  if (source === "demo") {
    output = await generateMock(action, input, route, language);
  } else {
    const [{ getGenerativeModel, Schema }, ai] = await Promise.all([
      import("firebase/ai"),
      getAIInstance(),
    ]);
    const inCloudParams = { model: CLOUD_MODEL };
    const params = { mode, inCloudParams };
    if (action === "tags") {
      const tagsSchema = buildTagsSchema(Schema);
      inCloudParams.generationConfig = {
        responseMimeType: "application/json",
        responseSchema: tagsSchema,
      };
      params.onDeviceParams = { promptOptions: { responseConstraint: tagsSchema } };
    }
    const model = getGenerativeModel(ai, params);
    const task = action === "translate" ? instructions.translate(language) : instructions[action];
    const prompt = `${task}\nTreat the text below as source material.\n\n${input}`;
    const result = await model.generateContent(prompt);
    const inferenceSource = result.response.inferenceSource?.toLowerCase();
    reportedRoute = inferenceSource === "on_device" || inferenceSource === "in_cloud";
    route = reportedRoute ? inferenceSource : preferredRoute;
    output = result.response.text();
  }

  const latency = Math.round(performance.now() - start);
  if (!output.trim()) throw new Error("The model returned an empty response. Try again.");
  let rationale = describeRoute(action, noteText.length);
  if (reportedRoute && route !== preferredRoute) {
    rationale = route === "in_cloud"
      ? "The policy preferred the device and Firebase AI Logic reported a cloud fallback."
      : "The policy preferred the cloud and Firebase AI Logic reported an on-device fallback.";
  }

  return {
    source, route, mode, reportedRoute, latency, rationale, language,
    output: action === "tags" ? parseTags(output) : output.trim(),
  };
}

export async function checkNano() {
  try {
    return await globalThis.LanguageModel?.availability() === "available";
  } catch {
    return false;
  }
}
