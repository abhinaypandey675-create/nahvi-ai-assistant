export const RESPONSE_MODES = Object.freeze({
  QUICK: "quick",
  SUMMARY: "summary",
  DETAILED: "detailed",
  NOTES: "notes",
});

const DETAILED_TRIGGERS = [
  /\bexplain\b/i,
  /\bexplain in detail\b/i,
  /\bfull explanation\b/i,
  /\bdeep dive\b/i,
];

const NOTES_TRIGGERS = [
  /\bnotes\b/i,
  /\bmake notes\b/i,
  /\bcreate notes\b/i,
  /\brevision notes\b/i,
  /\bstructured notes\b/i,
];

const SUMMARY_TRIGGERS = [
  /\bsummary\b/i,
  /\bsummarize\b/i,
  /\bsummarise\b/i,
  /\bkey points\b/i,
  /\bshort summary\b/i,
  /\bbrief\b/i,
];

function matchesAny(message, patterns) {
  return patterns.some((pattern) => pattern.test(message));
}

export function detectResponseMode(message = "", intent = "aichat") {
  const text = String(message).trim();

  if (matchesAny(text, DETAILED_TRIGGERS)) return RESPONSE_MODES.DETAILED;
  if (matchesAny(text, NOTES_TRIGGERS)) return RESPONSE_MODES.NOTES;
  if (matchesAny(text, SUMMARY_TRIGGERS)) return RESPONSE_MODES.SUMMARY;
  if (intent === "documentai") return RESPONSE_MODES.SUMMARY;

  return RESPONSE_MODES.QUICK;
}

export function getModeInstructions(mode = RESPONSE_MODES.QUICK, intent = "aichat") {
  const base = [
    "Follow the selected response mode exactly.",
    "Always address the user as Boss.",
    "Use clean plain text only.",
    "Do not use markdown symbols like *, **, _, #, or backticks.",
  ];

  const instructions = {
    [RESPONSE_MODES.QUICK]: [
      "Response Mode: Quick Mode.",
      "Default behavior: short, clear, and point-wise.",
      "Use 1 to 5 short lines.",
      "Avoid long explanations unless the user explicitly requested Detailed Mode.",
    ],
    [RESPONSE_MODES.SUMMARY]: [
      "Response Mode: Summary Mode.",
      "Give a concise summary first.",
      "Then list key points.",
      "Add action items only when relevant.",
    ],
    [RESPONSE_MODES.DETAILED]: [
      "Response Mode: Detailed Mode.",
      "Give a structured explanation with clear sections.",
      "Include reasoning, examples, or steps when useful.",
      "Stay focused and avoid filler.",
    ],
    [RESPONSE_MODES.NOTES]: [
      "Response Mode: Notes Mode.",
      "Convert content into structured notes.",
      "Use clear headings and concise bullet-style lines.",
      "Remove repetition and unnecessary information.",
      "Add key points and action items when relevant.",
    ],
  };

  const intentInstructions = [];
  if (intent === "calculator") {
    intentInstructions.push(
      "For calculations, show the final answer first.",
      "Keep math explanation minimal unless Detailed Mode is active."
    );
  }
  if (intent === "documentai") {
    intentInstructions.push(
      "For documents, read intelligently, extract key points, and summarize concisely.",
      "For notes, organize long content under headings and remove unnecessary information."
    );
  }

  return [...base, ...(instructions[mode] || instructions.quick), ...intentInstructions].join("\n");
}

export function formatResponseByMode(reply = "", mode = RESPONSE_MODES.QUICK) {
  if (!reply) return reply;

  let text = String(reply)
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  if (mode === RESPONSE_MODES.QUICK) {
    const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
    if (lines.length > 6) text = lines.slice(0, 6).join("\n");
  }

  return text;
}
