// =====================================================
// intentDetector.js — NAHVI Smart Intent Engine
// Detects EXACT intent — no more wrong routing
// Uses scoring system — highest score wins
// Part of: Abhinay AI Industries — NAHVI OS
// =====================================================

// =====================================================
// INTENT DEFINITIONS
// Each intent has required keywords + optional boost words
// score = required matches × 10 + boost matches × 5
// =====================================================

const INTENTS = [

  // ── DATETIME ────────────────────────────────────────
  {
    name: "datetime",
    required: [["time", "date", "day", "clock", "today", "now", "baj", "kitna baj"]],
    boost: ["current", "what is", "tell me", "show", "batao"],
    // MUST NOT contain these words — prevents false matches
    excludes: ["open", "file", "find", "play", "movie", "real time", "real-time", "runtime", "sometime", "pastime", "lifetime", "fulltime", "part time", "anytime", "daytime", "nighttime"],
  },

  // ── WEATHER ─────────────────────────────────────────
  {
    name: "weather",
    required: [["weather", "mausam", "temperature", "forecast", "humid", "wind speed", "rain today", "barish"]],
    boost: ["check", "show", "tell", "city", "in", "at"],
    excludes: [],
  },

  // ── CALCULATOR ──────────────────────────────────────
  {
    name: "calculator",
    required: [[
      "calculate", "compute", "solve", "math", "maths",
      "plus", "minus", "multiply", "divide", "percent of",
      "percentage", "square root", "cube root", "power of",
      "ratio", "convert", "conversion", "to meters", "to km",
      "to celsius", "to fahrenheit", "sin", "cos", "tan", "log",
      "interest", "simple interest", "compound interest", "discount",
      "profit", "loss", "emi", "loan",
    ]],
    boost: ["what is", "result", "answer", "equals", "of", "by", "rate", "years", "units"],
    excludes: ["open calculator", "launch calculator"],
  },

  // ── SYSTEM INFO ─────────────────────────────────────
  {
    name: "systeminfo",
    required: [["system info", "system report", "pc info", "check pc", "pc check", "hardware info", "cpu usage", "ram usage", "disk space", "storage space", "memory usage", "processor speed", "check my pc", "my pc specs", "pc specs", "pc status"]],
    boost: ["show", "tell", "how much", "how many"],
    excludes: [],
  },

  // ── NETWORK INFO ────────────────────────────────────
  {
    name: "networkinfo",
    required: [["network info", "my ip", "ip address", "wifi status", "internet speed", "connection status", "network check"]],
    boost: ["show", "check", "what is"],
    excludes: [],
  },

  // ── JOKE ────────────────────────────────────────────
  {
    name: "joke",
    required: [["joke", "jokes", "funny", "make me laugh", "something funny", "joke sunao", "hasao"]],
    boost: ["tell", "say", "give"],
    excludes: [],
  },

  // ── MOTIVATIONAL ────────────────────────────────────
  {
    name: "motivational",
    required: [["motivate", "motivation", "inspire", "inspiration", "quote", "uplift", "encourage"]],
    boost: ["give", "tell", "say", "me"],
    excludes: [],
  },

  // ── REMINDER ────────────────────────────────────────
  {
    name: "reminder",
    required: [["remind me", "set reminder", "reminder set", "reminder lagao", "yaad dilana", "yaad kara"]],
    boost: ["to", "about", "for"],
    excludes: [],
  },

  // ── LIST REMINDERS ───────────────────────────────────
  {
    name: "listreminders",
    required: [["list reminders", "show reminders", "my reminders", "all reminders", "reminders dikhao"]],
    boost: ["show", "list", "tell"],
    excludes: [],
  },

  // ── NEWS ────────────────────────────────────────────
  {
    name: "news",
    required: [["news", "headlines", "latest news", "top news", "aaj ki khabar", "khabar", "breaking news"]],
    boost: ["show", "tell", "latest", "today"],
    excludes: [],
  },

  // ── AI STATUS ───────────────────────────────────────
  {
    name: "aistatus",
    required: [["ai status", "engine status", "which ai", "groq status", "gemini status", "ai engine"]],
    boost: ["check", "show", "tell"],
    excludes: [],
  },

  // ── CAPABILITIES ────────────────────────────────────
  {
    name: "capabilities",
    required: [["capabilities", "what can you do", "help me", "commands list", "features", "what do you do"]],
    boost: ["show", "list", "tell"],
    excludes: ["help me open", "help me find", "help me play"],
  },

  // ── WORKFLOW MODES ───────────────────────────────────
  {
    name: "workflow",
    required: [["study mode", "coding mode", "code mode", "gaming mode", "meeting mode", "night mode", "presentation mode", "focus mode"]],
    boost: ["start", "activate", "enable", "turn on", "switch to"],
    excludes: [],
  },

  // ── KILL PROCESS ────────────────────────────────────
  {
    name: "killprocess",
    required: [["kill", "force close", "terminate", "end process", "force quit", "force stop"]],
    boost: ["app", "process", "program", "application"],
    // Must be followed by an app name — not just "kill it"
    excludes: ["kill time", "kill the vibe", "killing it", "killer"],
  },

  // ── OPEN APP / WEBSITE ───────────────────────────────
  {
    name: "openapp",
    required: [["open", "launch", "start", "go to", "navigate to", "kholo", "chalao"]],
    boost: ["app", "website", "browser", "site"],
    // These are known apps/sites — handled by appLauncher
    appKeywords: [
      "youtube", "google", "github", "gmail", "twitter", "instagram",
      "whatsapp", "chatgpt", "linkedin", "stackoverflow", "netflix",
      "spotify", "reddit", "figma", "notion", "canva", "chrome", "edge",
      "firefox", "calculator", "notepad", "paint", "task manager",
      "file explorer", "explorer", "cmd", "command prompt", "terminal",
      "settings", "vs code", "vscode", "word", "excel", "powerpoint",
      "vlc", "discord", "slack", "zoom", "teams", "skype", "telegram",
      "snipping tool", "control panel", "steam", "obs", "spotify",
    ],
    excludes: [],
  },

  // ── OPEN FILE ───────────────────────────────────────
  {
    name: "openfile",
    required: [["open", "find", "locate", "search", "kholo", "dhundo"]],
    boost: ["file", "document", "pdf", "video", "movie", "film", "photo", "image", "folder", "notes", "resume", "report"],
    excludes: [],
  },

  // ── PLAY MOVIE ──────────────────────────────────────
  {
    name: "playmovie",
    required: [["movie", "film", "chalao", "play", "watch", "dekho"]],
    boost: ["vlc", "open", "play", "start"],
    excludes: ["movie mode", "film festival"],
  },

  // ── FILE ORGANIZER ───────────────────────────────────
  {
    name: "fileorganizer",
    required: [["arrange", "organize", "organise", "sort files", "clean up", "cleanup", "tidy", "remove duplicate", "folder stats", "empty folder", "delete empty"]],
    boost: ["desktop", "downloads", "documents", "files", "folders"],
    excludes: [],
  },

  // ── DESKTOP CONTROL ─────────────────────────────────
  {
    name: "desktopcontrol",
    required: [[
      "click", "right click", "double click", "scroll",
      "press enter", "press escape", "press tab", "press space",
      "press backspace", "type ", "screenshot", "screen capture",
      "minimize", "maximize", "close window", "show desktop",
      "volume up", "volume down", "mute", "unmute",
      "brightness up", "brightness down", "set brightness",
      "lock pc", "lock screen", "shutdown", "shut down",
      "restart", "reboot", "sleep", "hibernate",
      "alt tab", "switch window", "zoom in", "zoom out",
      "copy", "paste", "undo", "redo", "select all",
      "new tab", "close tab", "refresh page",
      "battery", "battery status", "battery level",
    ]],
    boost: ["my pc", "screen", "window", "computer"],
    excludes: [],
  },

  // ── BROWSER CONTROL ─────────────────────────────────
  {
    name: "browsercontrol",
    required: [["search youtube", "youtube search", "search google", "google search", "search for", "pause video", "resume video", "pause music", "resume music", "next song", "previous song", "skip song"]],
    boost: ["in browser", "on youtube", "on google"],
    excludes: [],
  },

  // ── DOCUMENT INTELLIGENCE ────────────────────────────
  {
    name: "documentai",
    required: [["summarize", "summary", "revision notes", "revision", "generate mcq", "mcq", "multiple choice", "flashcard", "simplify", "key terms", "key words", "definitions", "glossary", "meeting notes", "explain chapter", "analyze report"]],
    boost: ["file", "document", "pdf", "notes", "chapter"],
    excludes: [],
  },

  // ── INTERNET SEARCH ─────────────────────────────────
  {
    name: "internetsearch",
    required: [["search ", "look up", "google ", "bing ", "find information", "search the web"]],
    boost: ["online", "internet", "web", "for me"],
    excludes: ["search file", "search my", "file search", "search youtube", "search google maps"],
  },

  // ── AI CHAT (fallback) ──────────────────────────────
  {
    name: "aichat",
    required: [[]], // always matches as fallback
    boost: [],
    excludes: [],
    isFallback: true,
  },
];

// =====================================================
// SCORE CALCULATOR
// =====================================================

function scoreIntent(intent, message) {
  const lower = message.toLowerCase().trim();
  let score = 0;

  // Check excludes first — if any exclude matches, score = -1
  if (intent.excludes) {
    for (const ex of intent.excludes) {
      if (lower.includes(ex)) return -1;
    }
  }

  // Check required — at least ONE required group must match
  if (intent.required && intent.required.length > 0) {
    const [requiredGroup] = intent.required;
    let requiredMatched = 0;
    for (const req of requiredGroup) {
      if (lower.includes(req)) {
        requiredMatched++;
        score += 10;
      }
    }
    // No required keyword matched — skip this intent
    if (requiredMatched === 0 && !intent.isFallback) return 0;
  }

  // Boost keywords — increase confidence
  if (intent.boost) {
    for (const boost of intent.boost) {
      if (lower.includes(boost)) score += 5;
    }
  }

  return score;
}

// =====================================================
// OPEN APP vs OPEN FILE RESOLVER
// Decides if "open X" means app/website or file
// =====================================================

function resolveOpenIntent(message) {
  const lower = message.toLowerCase().trim();

  // Remove "open", "launch", "start" from beginning
  const stripped = lower
    .replace(/^(open|launch|start|go to|navigate to|kholo|chalao)\s+/i, "")
    .trim();

  // Check if it matches a known app/website
  const knownApps = INTENTS.find(i => i.name === "openapp")?.appKeywords || [];
  const isKnownApp = knownApps.some(app => stripped.includes(app) || app.includes(stripped));

  if (isKnownApp) return "openapp";

  // Has file-like keywords → file search
  const fileWords = ["file", "document", "pdf", "notes", "resume", "report",
    "photo", "image", "video", "movie", "film", "folder", "presentation",
    "spreadsheet", "assignment", "project", "essay", "thesis", "invoice",
    "certificate", "marksheet", "result", "admit card", "question paper"];

  const hasFileWord = fileWords.some(w => lower.includes(w));
  if (hasFileWord) return "openfile";

  // Has video/movie keywords → play movie
  const movieWords = ["movie", "film", "web series", "episode", "mkv", "mp4"];
  const hasMovieWord = movieWords.some(w => lower.includes(w));
  if (hasMovieWord) return "playmovie";

  // If stripped text looks like a filename (has extension or multiple words)
  const hasExtension = /\.(pdf|docx|doc|txt|mp4|mkv|jpg|png|xlsx|pptx)$/i.test(stripped);
  if (hasExtension) return "openfile";

  // Multi-word that's not an app → probably a file
  const wordCount = stripped.split(/\s+/).filter(Boolean).length;
  if (wordCount >= 2 && !isKnownApp) return "openfile";

  // Single unknown word → try app first, then file
  return "openapp";
}

// =====================================================
// MASTER INTENT DETECTOR
// =====================================================

export function detectIntent(message) {
  if (!message || typeof message !== "string") {
    return { intent: "aichat", score: 0, confidence: "low" };
  }

  const lower = message.toLowerCase().trim();

  // Special case — "open X" needs smart resolution
  const openTriggers = ["open ", "launch ", "start ", "go to ", "kholo ", "chalao "];
  const isOpenCommand = openTriggers.some(t => lower.startsWith(t) || lower.includes(t));

  if (isOpenCommand) {
    const resolved = resolveOpenIntent(message);
    return {
      intent: resolved,
      score: 50,
      confidence: "high",
      debug: `open-resolved → ${resolved}`,
    };
  }

  // Score all intents
  const scores = INTENTS
    .filter(i => !i.isFallback)
    .map(intent => ({
      name: intent.name,
      score: scoreIntent(intent, message),
    }))
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scores.length === 0) {
    return { intent: "aichat", score: 0, confidence: "low", debug: "no match → AI chat" };
  }

  const best = scores[0];
  const confidence = best.score >= 20 ? "high" : best.score >= 10 ? "medium" : "low";

  console.log(`NAHVI Intent: "${message}" → ${best.name} (score: ${best.score}, confidence: ${confidence})`);

  return {
    intent: best.name,
    score: best.score,
    confidence,
    debug: `matched: ${best.name} score: ${best.score}`,
  };
}

// =====================================================
// QUICK HELPERS — used in server.js
// =====================================================

export function isIntent(message, intentName) {
  return detectIntent(message).intent === intentName;
}

export function getTopIntents(message, count = 3) {
  const lower = message.toLowerCase().trim();
  return INTENTS
    .filter(i => !i.isFallback)
    .map(intent => ({ name: intent.name, score: scoreIntent(intent, message) }))
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, count);
}
