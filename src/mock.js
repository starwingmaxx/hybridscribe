const STOP_WORDS = new Set("about also along among before because could during everyone followed from have into like near note open people question should that their them then there they this wait want were what when whether while will with would your".split(" "));
const ACTION = /\b(?:todo|action item|will|need to|needs to)\b|^(?:book|download|send|update|add|prepare|schedule|review|confirm|follow up|arrive|keep|check|contact|submit|call|email|finish|draft|publish|buy|pay)\b/i;
const RISK = /\b(?:risks?|open questions?|blocker|uncertain|concern)\b|\?$/i;
const DECISION = /\b(?:agreed|decided|approved|selected|chose)\b/i;

const labels = {
  Japanese: ["要点", "決定事項", "リスクと未解決の質問", "要約", "デモでは以下の原文を参照できます。"],
  Spanish: ["Puntos clave", "Decisiones", "Riesgos y preguntas abiertas", "Resumen", "Texto original para consultar en la demostración."],
  German: ["Kernaussagen", "Entscheidungen", "Risiken und offene Fragen", "Zusammenfassung", "Originaltext zur Ansicht in der Demo."],
  French: ["Points clés", "Décisions", "Risques et questions ouvertes", "Résumé", "Texte original à consulter dans la démo."],
};

const samplePhrases = new Map([
  ["We agreed to ship the new onboarding flow to 10% of users on Friday.", [
    "金曜日に新しいオンボーディングをユーザーの10%に公開することに合意しました。",
    "Acordamos lanzar el nuevo flujo de incorporación al 10 % de los usuarios el viernes.",
    "Wir haben beschlossen, den neuen Onboarding-Ablauf am Freitag für 10 % der Nutzer freizugeben.",
    "Nous avons convenu de lancer le nouveau parcours d’intégration vendredi pour 10 % des utilisateurs.",
  ]],
  ["Maya will update the welcome copy tomorrow.", [
    "Mayaは明日、ウェルカムメッセージを更新します。",
    "Maya actualizará el texto de bienvenida mañana.",
    "Maya aktualisiert morgen den Begrüßungstext.",
    "Maya mettra à jour le texte de bienvenue demain.",
  ]],
  ["Leo will set up the activation dashboard before launch.", [
    "Leoは公開前にアクティベーションダッシュボードを設定します。",
    "Leo configurará el panel de activación antes del lanzamiento.",
    "Leo richtet vor dem Start das Aktivierungsdashboard ein.",
    "Leo configurera le tableau de bord d’activation avant le lancement.",
  ]],
  ["Open question: can Support cover the rollout?", [
    "未解決の質問：サポートチームは公開に対応できますか？",
    "Pregunta abierta: ¿puede el equipo de soporte cubrir el lanzamiento?",
    "Offene Frage: Kann der Support die Einführung begleiten?",
    "Question ouverte : l’équipe de support peut-elle accompagner le déploiement ?",
  ]],
]);

function shorten(text, limit) {
  return text.length <= limit ? text : text.slice(0, limit - 1).trimEnd() + "…";
}

function extractTags(text) {
  const words = text.toLowerCase().match(/\p{L}[\p{L}\p{M}-]{3,}/gu) ?? [];
  const counts = new Map();
  for (const word of words) {
    if (!STOP_WORDS.has(word)) counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  const tags = [...counts.keys()].sort((a, b) => counts.get(b) - counts.get(a));
  const mood = /\b(?:excited|great|thrilled|love)\b/i.test(text) ? "Upbeat"
    : /\b(?:risk|worried|lost|blocked|urgent)\b/i.test(text) ? "Cautious"
    : "Practical";
  const language = /[\u3040-\u30ff]/u.test(text) ? "Japanese"
    : /\b(?:hola|gracias|para)\b/i.test(text) ? "Spanish"
    : /\b(?:bonjour|avec|merci)\b/i.test(text) ? "French"
    : /\b(?:danke|und|nicht)\b/i.test(text) ? "German"
    : /\p{Script=Latin}/u.test(text) ? "English" : "Undetermined";
  return { tags: [...new Set([...tags, "general", "notes", "reference"])].slice(0, 3), mood, language };
}

function translatePreview(text, language) {
  const [points, decisions, risks, summary, description] = labels[language];
  const hasHeadings = text.startsWith("## ");
  const languageIndex = Object.keys(labels).indexOf(language);
  let translated = text.replace(/^## Key points$/gm, "## " + points)
    .replace(/^## Decisions$/gm, "## " + decisions)
    .replace(/^## Risks & open questions$/gm, "## " + risks);
  let remaining = text.replace(/^## .+$/gm, "");
  for (const [phrase, translations] of samplePhrases) {
    translated = translated.replaceAll(phrase, translations[languageIndex]);
    remaining = remaining.replaceAll(phrase, "");
  }
  const heading = hasHeadings ? "" : "## " + summary + "\n";
  const hint = remaining.replace(/^[*-]\s*/gm, "").trim() ? description + "\n\n" : "";
  return heading + hint + translated;
}

export async function generateMock(action, text, route, language) {
  await new Promise((resolve) => setTimeout(resolve, route === "on_device" ? 310 : 640));
  const lines = new Intl.Segmenter(undefined, { granularity: "sentence" });
  const sentences = text.split(/\n+/).flatMap((line) =>
    Array.from(lines.segment(line), ({ segment }) => segment.trim()).filter(Boolean),
  );
  const bullets = (items, empty) => items.length
    ? items.map((line) => "- " + shorten(line, 250)).join("\n")
    : empty;

  switch (action) {
    case "summary":
      return shorten(sentences.slice(0, 2).join(" "), 260);
    case "tags":
      return JSON.stringify(extractTags(text));
    case "brief":
      return [
        "## Key points\n" + bullets(sentences.filter((line) => !RISK.test(line) && !DECISION.test(line)).slice(0, 3), "No key points found."),
        "## Decisions\n" + bullets(sentences.filter((line) => DECISION.test(line)).slice(0, 4), "No explicit decisions recorded."),
        "## Risks & open questions\n" + bullets(sentences.filter((line) => RISK.test(line)).slice(0, 4), "No explicit risks or open questions recorded."),
      ].join("\n\n");
    case "actions": {
      const tasks = sentences.filter((line) => ACTION.test(line) && !RISK.test(line)).slice(0, 8);
      return tasks.map((line) => "- [ ] " + line.replace(/^TODO:\s*/i, "")).join("\n") || "No explicit action items found.";
    }
    case "translate":
      return translatePreview(text, language);
    default:
      throw new Error("Unknown action.");
  }
}
