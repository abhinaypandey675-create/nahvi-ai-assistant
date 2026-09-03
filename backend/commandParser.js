// =====================================================
// commandParser.js — NAHVI Smart Command Normalizer
// Fixes spelling mistakes, understands natural language
// Works BEFORE any command reaches the AI or functions
// Part of: Abhinay AI Industries — NAHVI OS
// =====================================================

// =====================================================
// SPELLING CORRECTIONS — common mistakes
// =====================================================

const SPELLING_FIXES = {
  // General
  "intellegent": "intelligent", "inteligent": "intelligent",
  "nahvi": "nahvi", "nahvii": "nahvi",
  "pleese": "please", "plese": "please", "plz": "please", "pls": "please",
  "thnx": "thanks", "thx": "thanks", "thankyou": "thank you",
  "wht": "what", "whts": "whats", "wats": "whats",
  "hwo": "how", "hw": "how",
  "mke": "make", "mkae": "make",
  "opne": "open", "oen": "open",
  "clsoe": "close", "cloze": "close",
  "searh": "search", "serach": "search", "seach": "search",
  "sarch": "search",
  "flie": "file", "fil": "file", "fles": "files",
  "floder": "folder", "fodler": "folder", "fodler": "folder",
  "doenload": "download", "downlod": "download", "dwonload": "download",
  "documnet": "document", "dcument": "document", "documet": "document",
  "summery": "summary", "sumary": "summary", "sumarize": "summarize",
  "summarise": "summarize", "sumarise": "summarize",
  "oragnize": "organize", "organise": "organize", "orgnaize": "organize",
  "arange": "arrange", "arrenge": "arrange",
  "screnshot": "screenshot", "screenshott": "screenshot", "screnshoot": "screenshot",
  "scrrenshot": "screenshot",
  "volem": "volume", "volum": "volume", "voloume": "volume",
  "shutdwon": "shutdown", "shtdown": "shutdown", "shutdonw": "shutdown",
  "restrat": "restart", "rsteart": "restart", "restarrt": "restart",
  "brwoser": "browser", "borwser": "browser",
  "youutbe": "youtube", "yotube": "youtube", "youtbe": "youtube",
  "gogle": "google", "googel": "google", "gooogle": "google",
  "weahter": "weather", "wheater": "weather", "wether": "weather",
  "caluculate": "calculate", "calcualte": "calculate", "calulate": "calculate",
  "sysytem": "system", "systme": "system", "sytem": "system",
  "informaton": "information", "infomation": "information",
  "passwrod": "password", "pasword": "password",
  "settigns": "settings", "setings": "settings", "sttings": "settings",
  "notepd": "notepad", "notpad": "notepad",
  "cacultor": "calculator", "calucator": "calculator",
  "brigthness": "brightness", "brigtness": "brightness",
  "bettary": "battery", "baterry": "battery", "batery": "battery",
  "netwrok": "network", "netwok": "network",
  "pwoer": "power", "powr": "power",
  "keybord": "keyboard", "keyborad": "keyboard",
  "moniter": "monitor", "mnitor": "monitor",
  "wiifi": "wifi", "wfi": "wifi", "wiffi": "wifi",
  "bluetoth": "bluetooth", "blutooth": "bluetooth",
  "screeen": "screen", "scrren": "screen",
  "mesage": "message", "messge": "message",
  "comand": "command", "commnad": "command", "comand": "command",
  "speek": "speak", "spek": "speak",
  "listten": "listen", "lisen": "listen",
  "microfone": "microphone", "micorphone": "microphone",
  "recrod": "record", "reocrd": "record",
  "palylist": "playlist", "plalyist": "playlist",
  "muisc": "music", "misuc": "music", "musci": "music",
  "shwo": "show", "shw": "show",
  "tpye": "type", "tyep": "type",
  "clcik": "click", "clik": "click", "clck": "click",
  "rigth": "right", "rihgt": "right",
  "lefft": "left", "lft": "left",
  "doenload": "download",
  "paswword": "password",
  "chekc": "check", "chek": "check", "cehck": "check",
  "repaort": "report", "reprot": "report",
  "procees": "process", "processs": "process",
  "runnign": "running", "runing": "running",
  "managre": "manager", "manaer": "manager",
  "expolrer": "explorer", "explrer": "explorer",
  "dowloads": "downloads", "downlaods": "downloads",
  "deskttop": "desktop", "destkop": "desktop", "deskotp": "desktop",
};

// =====================================================
// NATURAL LANGUAGE ALIASES
// Maps casual/voice phrases to exact command keywords
// =====================================================

const COMMAND_ALIASES = [
  // ── System Info ────────────────────────────────────
  { patterns: ["check my ram", "how much ram", "ram usage", "memory usage", "check memory", "ram check", "rom check", "ram rom check", "check ram rom", "pc status", "system status", "how is my pc", "pc health"], normalized: "system info" },

  // ── Screenshot ─────────────────────────────────────
  { patterns: ["take a picture of screen", "capture my screen", "take photo of screen", "snap screen", "screen snap", "take screen", "capture display"], normalized: "take screenshot" },

  // ── Volume ─────────────────────────────────────────
  { patterns: ["make it louder", "increase the volume", "turn the volume up", "crank it up", "volume badhao", "awaaz badhao"], normalized: "volume up" },
  { patterns: ["make it quieter", "decrease the volume", "turn the volume down", "volume kam karo", "awaaz kam karo"], normalized: "volume down" },
  { patterns: ["shut the sound", "no sound", "turn off sound", "silent mode", "band karo sound"], normalized: "mute" },

  // ── Lock / Power ───────────────────────────────────
  { patterns: ["lock my pc", "lock my computer", "lock my laptop", "screen lock", "lock kar do"], normalized: "lock pc" },
  { patterns: ["turn off pc", "turn off computer", "pc band karo", "computer band karo", "band kar do"], normalized: "shutdown" },
  { patterns: ["reboot", "reboot my pc", "restart my computer", "restart kar do"], normalized: "restart" },
  { patterns: ["put to sleep", "pc so jao", "sleep mode", "hibernate"], normalized: "sleep pc" },

  // ── Browser ────────────────────────────────────────
  { patterns: ["go to youtube", "launch youtube", "youtube kholo", "yt open karo"], normalized: "open youtube" },
  { patterns: ["go to google", "launch google", "google kholo"], normalized: "open google" },
  { patterns: ["go to github", "launch github"], normalized: "open github" },
  { patterns: ["open internet", "open browser", "launch browser", "browser kholo"], normalized: "open chrome" },

  // ── Apps ───────────────────────────────────────────
  { patterns: ["launch vs code", "open code editor", "coding editor", "start vs code"], normalized: "open vs code" },
  { patterns: ["open file manager", "open my files", "mera files dikhao", "files dikhao"], normalized: "open file explorer" },
  { patterns: ["open terminal", "command line", "cmd kholo", "terminal kholo"], normalized: "open cmd" },
  { patterns: ["open task manager", "show running apps", "task manager kholo"], normalized: "open task manager" },
  { patterns: ["open pc settings", "system settings", "settings kholo"], normalized: "open settings" },

  // ── Document Intelligence ──────────────────────────
  { patterns: ["make a summary", "give me summary", "summarize this", "make notes", "create notes", "notes banao", "summary banao"], normalized: "summarize" },
  { patterns: ["make questions", "create questions", "generate questions", "question paper banao"], normalized: "generate mcq" },
  { patterns: ["make flashcards", "create flashcards", "study cards banao"], normalized: "generate flashcards" },
  { patterns: ["simple bana do", "easy version", "simple version", "simplify karo"], normalized: "simplify" },

  // ── File Organizer ─────────────────────────────────
  { patterns: ["clean my desktop", "desktop clean karo", "sort my files", "files arrange karo", "organize karo", "files organize karo", "sab arrange karo"], normalized: "organize desktop" },
  { patterns: ["clean downloads", "downloads organize karo", "downloads clean karo"], normalized: "organize downloads" },

  // ── Music / YouTube ────────────────────────────────
  { patterns: ["chalao", "play karo", "song lagao", "music lagao", "gaana lagao", "bajao"], normalized: "play" },
  { patterns: ["band karo music", "music band karo", "song band karo", "stop music"], normalized: "pause video" },
  { patterns: ["agla song", "next song lagao", "skip karo"], normalized: "next song" },

  // ── Weather ────────────────────────────────────────
  { patterns: ["how is the weather", "weather kaisa hai", "aaj ka mausam", "mausam batao", "weather bolo"], normalized: "weather" },

  // ── Time / Date ────────────────────────────────────
  { patterns: ["what time is it", "kitna baj raha hai", "time bolo", "time batao", "aaj ka din"], normalized: "time" },
  { patterns: ["what is today's date", "aaj ki date", "date batao"], normalized: "date" },

  // ── Jokes ──────────────────────────────────────────
  { patterns: ["koi joke suna", "joke sunao", "make me laugh", "something funny"], normalized: "tell me a joke" },

  // ── Window control ─────────────────────────────────
  { patterns: ["chota karo window", "window choti karo", "minimize kar do"], normalized: "minimize" },
  { patterns: ["bada karo window", "window bada karo", "maximize kar do"], normalized: "maximize" },
  { patterns: ["band karo window", "window band karo", "close kar do"], normalized: "close window" },
  { patterns: ["desktop dikhao", "sab minimize karo"], normalized: "show desktop" },

  // ── Clipboard ──────────────────────────────────────
  { patterns: ["clipboard mein kya hai", "what did i copy", "clipboard check"], normalized: "show clipboard" },

  // ── Wifi ───────────────────────────────────────────
  { patterns: ["wifi kaisa hai", "internet check karo", "network check", "connection check"], normalized: "wifi status" },

  // ── Battery ────────────────────────────────────────
  { patterns: ["battery kitni hai", "battery check", "battery status", "kitni battery bachi"], normalized: "battery status" },

  // ── Reminder ───────────────────────────────────────
  { patterns: ["yaad dilana", "reminder lagao", "mujhe yaad kara"], normalized: "remind me" },
];

// =====================================================
// FIX SPELLING — word by word
// =====================================================

function fixSpelling(text) {
  const words = text.toLowerCase().split(/\s+/);
  const fixed = words.map(word => {
    const clean = word.replace(/[^a-z0-9]/g, "");
    return SPELLING_FIXES[clean] || word;
  });
  return fixed.join(" ");
}

// =====================================================
// MATCH ALIASES — find closest command
// =====================================================

function matchAlias(text) {
  const lower = text.toLowerCase().trim();

  for (const alias of COMMAND_ALIASES) {
    for (const pattern of alias.patterns) {
      if (lower.includes(pattern)) {
        // Replace matched pattern with normalized command
        // but keep rest of sentence (e.g. filename, song name)
        const remaining = lower
          .replace(pattern, "")
          .replace(/\s{2,}/g, " ")
          .trim();
        return remaining
          ? `${alias.normalized} ${remaining}`
          : alias.normalized;
      }
    }
  }

  return null; // no alias matched
}

// =====================================================
// LEVENSHTEIN DISTANCE — for fuzzy command matching
// =====================================================

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return dp[m][n];
}

// =====================================================
// FUZZY COMMAND MATCH — for close-but-wrong words
// =====================================================

const KNOWN_COMMANDS = [
  "summarize", "summary", "notes", "mcq", "flashcard", "simplify",
  "organize", "arrange", "screenshot", "volume", "mute", "shutdown",
  "restart", "sleep", "lock", "battery", "wifi", "weather", "time",
  "date", "joke", "reminder", "minimize", "maximize", "close", "open",
  "play", "pause", "stop", "search", "calculate", "type", "click",
  "scroll", "copy", "paste", "undo", "redo", "save", "refresh",
  "youtube", "google", "github", "spotify", "chrome", "notepad",
  "settings", "explorer", "terminal", "brightness", "clipboard",
];

function fuzzyCorrectWord(word) {
  const clean = word.toLowerCase().replace(/[^a-z]/g, "");
  if (clean.length < 4) return word; // skip short words

  let best = null;
  let bestDist = Infinity;

  for (const cmd of KNOWN_COMMANDS) {
    const dist = levenshtein(clean, cmd);
    const threshold = clean.length <= 6 ? 2 : 3;
    if (dist < bestDist && dist <= threshold) {
      bestDist = dist;
      best = cmd;
    }
  }

  return best || word;
}

// =====================================================
// MASTER NORMALIZE FUNCTION
// Call this on every message before routing
// =====================================================

export function normalizeCommand(rawMessage) {
  if (!rawMessage || typeof rawMessage !== "string") return rawMessage;

  let text = rawMessage.trim();

  // Step 1 — Fix known spelling mistakes word by word
  text = fixSpelling(text);

  // Step 2 — Check alias map (Hinglish + natural language)
  const aliasMatch = matchAlias(text);
  if (aliasMatch) {
    console.log(`NAHVI normalized: "${rawMessage}" → "${aliasMatch}"`);
    return aliasMatch;
  }

  // Step 3 — Fuzzy correct individual words
  const words = text.split(/\s+/);
  const corrected = words.map(w => fuzzyCorrectWord(w));
  const fuzzyText = corrected.join(" ");

  if (fuzzyText !== text) {
    console.log(`NAHVI fuzzy corrected: "${text}" → "${fuzzyText}"`);
  }

  return fuzzyText;
}

// =====================================================
// DETECT LANGUAGE — Hindi, Hinglish, English
// =====================================================

export function detectLanguage(text) {
  const hindiChars = /[\u0900-\u097F]/;
  if (hindiChars.test(text)) return "hindi";

  const hinglishWords = ["karo", "batao", "dikhao", "kholo", "band", "chalo",
    "aur", "mujhe", "mera", "meri", "yeh", "woh", "kya", "kaisa", "kitna",
    "abhi", "jaldi", "thoda", "bahut", "accha", "theek", "nahi", "haan",
    "lagao", "sunao", "bajao", "chalao", "likho", "padho", "khelo"];

  const lower = text.toLowerCase();
  const isHinglish = hinglishWords.some(w => lower.includes(w));
  if (isHinglish) return "hinglish";

  return "english";
}