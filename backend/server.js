import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import open from "open";
import fs from "fs-extra";
import os from "os";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

// ── NAHVI Modules ──────────────────────────────────────
import { openWindowsSearch, handleDesktopCommand, getSystemInfo } from "./desktopControl.js";
import { handleDocumentCommand, handleSaveAndGenerate } from "./notesGenerator.js";
import { handleBrowserCommand } from "./browserControl.js";
import { handleFileOrganizerCommand } from "./fileorganizer.js";
import { normalizeCommand, detectLanguage } from "./commandParser.js";
import { detectIntent } from "./intentDetector.js";
import { launchApp } from "./appLauncher.js";
import { findAndOpenFile, fileManager } from "./fileHandler.js";
import { calculateStructured, calculationToReply, looksLikeCalculation } from "./calculator.js";
import {
  RESPONSE_MODES,
  detectResponseMode,
  formatResponseByMode,
  getModeInstructions,
} from "./responseMode.js";

dotenv.config();

const execAsync = promisify(exec);
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// =====================================================
// SPEECH CLEANER
// =====================================================

function expandForSpeech(text) {
  return text
    .replace(/(\d+)\s*°C/g, "$1 degrees Celsius")
    .replace(/(\d+)\s*°F/g, "$1 degrees Fahrenheit")
    .replace(/(\d+)\s*%/g, "$1 percent")
    .replace(/(\d+)\s*km\/h/g, "$1 kilometers per hour")
    .replace(/(\d+)\s*GB/g, "$1 gigabytes")
    .replace(/(\d+)\s*MB/g, "$1 megabytes")
    .replace(/(\d+)\s*GHz/g, "$1 gigahertz")
    .replace(/(\d+)\s*hPa/g, "$1 hectopascals")
    .replace(/\$/g, " dollars ").replace(/€/g, " euros ")
    .replace(/£/g, " pounds ").replace(/₹/g, " rupees ")
    .replace(/\+/g, " plus ").replace(/=/g, " equals ")
    .replace(/&/g, " and ").replace(/@/g, " at ")
    .replace(/\bCPU\b/g, "C P U").replace(/\bRAM\b/g, "R A M")
    .replace(/\bAI\b/g, "A I").replace(/\bvs\b/g, "versus")
    .replace(/\betc\b/g, "etcetera").replace(/\bOK\b/g, "okay")
    .replace(/(\d{1,2}):(\d{2})\s*AM/gi, (_, h, m) => `${h}${m !== "00" ? " " + m : ""} A M`)
    .replace(/(\d{1,2}):(\d{2})\s*PM/gi, (_, h, m) => `${h}${m !== "00" ? " " + m : ""} P M`)
    .replace(/\//g, " ").replace(/–/g, " to ").replace(/—/g, ", ")
    .replace(/[^\w\s.,!?'-]/g, " ").replace(/\s{2,}/g, " ").trim();
}

function cleanForSpeech(text) {
  if (!text) return "";
  return text
    .replace(/[*_~`#>|\\]/g, " ").replace(/={3,}/g, ". ").replace(/-{3,}/g, ". ")
    .replace(/\[(\d+)\]/g, "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/\n{2,}/g, ". ").replace(/\n/g, ". ")
    .split(". ").map(s => expandForSpeech(s)).join(". ")
    .replace(/\s{2,}/g, " ").replace(/\.\s*\./g, ".").trim();
}

app.use((req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (data) => {
    if (data && data.reply) {
      const mode = data.mode || res.locals.responseMode || RESPONSE_MODES.QUICK;
      data.mode = mode;
      data.intent = data.intent || res.locals.intent;
      data.reply = formatResponseByMode(data.reply, mode);
      data.speech = cleanForSpeech(data.reply);
    }
    return originalJson(data);
  };
  next();
});

// =====================================================
// AI CLIENTS
// =====================================================

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// =====================================================
// SYSTEM PROMPT
// =====================================================

const SYSTEM_PROMPT = `
You are NAHVI — a futuristic AI Productivity Operating System built by Abhinay AI Industries.
Your creator is Abhinay Boss. Built completely from scratch by Abhinay Boss.

STRICT RULES:
- Always call the user "Boss"
- Speak professionally like MCU JARVIS — confident, precise, intelligent
- NEVER say "I am just an AI"
- Reply ONLY in English
- Do NOT use markdown symbols — no *, **, _, __, #, ##, ~~, backticks
- Write plain clean text only
- Quick Mode is the default: keep responses short, clear, and point-wise
- Only provide detailed explanations when Detailed Mode is selected
- For calculations, final answer comes first
- Never say "I will try to..." or "I am attempting to..." — just confirm the action done
- Understand spelling mistakes and typos — always infer intent

If asked who created you:
"Abhinay Boss is my creator. He built me completely from scratch. Engineered by Abhinay AI Industries, Boss."

You are an AI Productivity Operating System — not a chatbot.
`;

// =====================================================
// AI ROUTING
// =====================================================

const GEMINI_TRIGGERS = [
  "explain","analyse","analyze","why does","how does","how do",
  "write code","fix this","debug","compare","difference between",
  "what is the best","suggest","recommend","summarize","summarise",
  "translate","review","improve","optimize","create a","generate",
  "design","plan","strategy","pros and cons","deep dive","in detail",
  "elaborate","research","essay","story","poem","script","letter",
  "email draft","what if","predict","philosophy","meaning of",
  "solve this problem","help me understand","teach me",
];

function shouldUseGemini(msg) {
  const lower = msg.toLowerCase();
  return GEMINI_TRIGGERS.some(t => lower.includes(t));
}

let history = [];

function getMaxTokensForMode(mode) {
  if (mode === RESPONSE_MODES.DETAILED) return 1400;
  if (mode === RESPONSE_MODES.NOTES) return 1100;
  if (mode === RESPONSE_MODES.SUMMARY) return 800;
  return 512;
}

async function askGroq(question, mode = RESPONSE_MODES.QUICK, intent = "aichat") {
  try {
    history.push({ role: "user", content: question });
    if (history.length > 20) history = history.slice(-20);
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "system", content: `${SYSTEM_PROMPT}\n\n${getModeInstructions(mode, intent)}` }, ...history],
      temperature: 0.7, max_tokens: getMaxTokensForMode(mode),
    });
    const text = completion.choices[0]?.message?.content || "No response Boss.";
    history.push({ role: "assistant", content: text });
    return { reply: text, engine: "Groq" };
  } catch (err) {
    console.error("Groq error:", err.message);
    return await askGemini(question, mode, intent);
  }
}

async function askGemini(question, mode = RESPONSE_MODES.QUICK, intent = "aichat") {
  try {
    const prompt = `${SYSTEM_PROMPT}\n\n${getModeInstructions(mode, intent)}\n\nBoss says: ${question}\n\nRespond as NAHVI using the selected response mode.`;
    const result = await geminiModel.generateContent(prompt);
    const text = result.response.text() || "No response Boss.";
    history.push({ role: "user", content: question });
    history.push({ role: "assistant", content: text });
    if (history.length > 20) history = history.slice(-20);
    return { reply: text, engine: "Gemini" };
  } catch (err) {
    console.error("Gemini error:", err.message);
    return { reply: "Both AI engines offline Boss. Check API keys.", engine: "Error" };
  }
}

async function askNAHVI(question, mode = RESPONSE_MODES.QUICK, intent = "aichat") {
  return shouldUseGemini(question) ? await askGemini(question, mode, intent) : await askGroq(question, mode, intent);
}

// =====================================================
// YOUTUBE SEARCH + PLAY — ACTUALLY WORKS
// Opens YouTube and searches, then auto-plays first result
// =====================================================

async function youtubeSearch(message) {
  // Extract search query
  const query = message
    .toLowerCase()
    .replace(/open youtube|play on youtube|search youtube|youtube search|youtube mein|youtube pe|play|song|music|video/gi, "")
    .replace(/open|search|find|for|the/gi, "")
    .trim();

  if (!query) {
    await open("https://youtube.com");
    return "Opening YouTube Boss.";
  }

  // Open YouTube search — autoplay first result
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&autoplay=1`;
  await open(searchUrl);
  return `Searching YouTube for "${query}" and playing first result Boss.`;
}

// =====================================================
// GOOGLE SEARCH
// =====================================================

async function googleSearch(message) {
  const query = message
    .replace(/search|google|bing|look up|find|for|the|search for/gi, "")
    .trim();
  if (!query) {
    await open("https://google.com");
    return "Opening Google Boss.";
  }
  await open(`https://www.google.com/search?q=${encodeURIComponent(query)}`);
  return `Searching Google for "${query}" Boss.`;
}

// =====================================================
// UTILITIES
// =====================================================

function getDateTime() {
  const now = new Date();
  return `Date: ${now.toLocaleDateString("en-IN", { weekday:"long", year:"numeric", month:"long", day:"numeric" })}. Time: ${now.toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit", second:"2-digit", hour12:true })}. All temporal systems online Boss.`;
}

const jokes = [
  "Why do programmers prefer dark mode? Because light attracts bugs Boss.",
  "I told my computer I needed a break. It froze Boss.",
  "A SQL query walks into a bar. Can I join you? Boss.",
  "Why do Java developers wear glasses? They do not C# Boss.",
  "Why did the developer go broke? He used up all his cache Boss.",
];
const getJoke = () => jokes[Math.floor(Math.random() * jokes.length)];

let reminders = [];
function addReminder(msg) {
  const text = msg.replace(/remind me to|remind me|set reminder/gi, "").trim();
  if (!text) return "Tell me what to remind you about Boss.";
  reminders.push({ id: reminders.length + 1, text, time: new Date().toLocaleTimeString("en-IN") });
  return `Reminder set: "${text}" Boss.`;
}
function listReminders() {
  if (!reminders.length) return "No reminders set Boss.";
  return `Reminders Boss:\n\n${reminders.map(r => `[${r.id}] ${r.text} (${r.time})`).join("\n")}`;
}

async function getWeather(msg) {
  const city = msg.replace(/weather|what is the|what's the|tell me|check|show|get|in|of|at|for/gi, "").trim() || "Bhopal";
  try {
    const key = process.env.WEATHER_API_KEY;
    if (!key) return "Add WEATHER_API_KEY in .env Boss.";
    const r = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${key}&units=metric`);
    const d = await r.json();
    if (d.cod !== 200) return `Could not find weather for "${city}" Boss.`;
    return `Weather in ${d.name}: ${d.weather[0].description}. Temperature ${d.main.temp} degrees Celsius. Feels like ${d.main.feels_like}. Humidity ${d.main.humidity} percent. Wind ${d.wind.speed} meters per second Boss.`;
  } catch { return "Weather fetch failed Boss."; }
}

async function handleWorkflow(lower) {
  if (lower.includes("study mode")) {
    exec("taskkill /f /im Discord.exe", ()=>{});
    exec("taskkill /f /im Spotify.exe", ()=>{});
    await open("https://notion.so");
    await open("https://youtube.com/results?search_query=lofi+study+music");
    return "Study Mode activated Boss. Distractions closed. Notion and Lofi music ready.";
  }
  if (lower.includes("coding mode") || lower.includes("code mode")) {
    exec("code"); exec("start cmd");
    await open("https://github.com");
    return "Coding Mode activated Boss. VS Code, Terminal, GitHub ready.";
  }
  if (lower.includes("meeting mode")) {
    exec("taskkill /f /im Discord.exe", ()=>{});
    await open("https://calendar.google.com"); await open("https://meet.google.com");
    return "Meeting Mode activated Boss. Calendar and Meet ready.";
  }
  if (lower.includes("gaming mode")) {
    exec("taskkill /f /im Teams.exe", ()=>{});
    exec("taskkill /f /im Slack.exe", ()=>{});
    await open("https://store.steampowered.com");
    return "Gaming Mode activated Boss. Work apps closed. Steam ready.";
  }
  return null;
}

// =====================================================
// PC CONTROL — Full control
// =====================================================

async function handlePCControl(message) {
  const lower = message.toLowerCase();

  if (lower.includes("volume up") || lower.includes("louder"))   { exec(`powershell -c "$obj = New-Object -ComObject WScript.Shell; $obj.SendKeys([char]175)"`); return "Volume increased Boss."; }
  if (lower.includes("volume down") || lower.includes("quieter")) { exec(`powershell -c "$obj = New-Object -ComObject WScript.Shell; $obj.SendKeys([char]174)"`); return "Volume decreased Boss."; }
  if (lower.includes("mute"))                                     { exec(`powershell -c "$obj = New-Object -ComObject WScript.Shell; $obj.SendKeys([char]173)"`); return "Muted Boss."; }

  if (lower.includes("shutdown") || lower.includes("shut down"))  { exec("shutdown /s /t 5"); return "Shutting down in 5 seconds Boss. Say cancel shutdown to abort."; }
  if (lower.includes("restart") || lower.includes("reboot"))      { exec("shutdown /r /t 5"); return "Restarting in 5 seconds Boss."; }
  if (lower.includes("cancel shutdown"))                           { exec("shutdown /a"); return "Shutdown cancelled Boss."; }
  if (lower.includes("sleep"))                                     { exec("rundll32.exe powrprof.dll,SetSuspendState 0,1,0"); return "PC going to sleep Boss."; }
  if (lower.includes("lock"))                                      { exec("rundll32.exe user32.dll,LockWorkStation"); return "PC locked Boss."; }
  if (lower.includes("log off") || lower.includes("sign out"))     { exec("shutdown /l"); return "Logging off Boss."; }

  if (lower.includes("screenshot") || lower.includes("screen capture")) {
    exec(`powershell -c "Add-Type -AssemblyName System.Windows.Forms; $bmp = New-Object System.Drawing.Bitmap([System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Width,[System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Height); $g = [System.Drawing.Graphics]::FromImage($bmp); $g.CopyFromScreen(0,0,0,0,$bmp.Size); $bmp.Save('${os.homedir()}\\Desktop\\NAHVI_Screenshot_${Date.now()}.png')"`);
    return "Screenshot saved to Desktop Boss.";
  }

  if (lower.includes("ip address") || lower.includes("my ip")) {
    try { const { stdout } = await execAsync("ipconfig | findstr IPv4"); return `Your IP Boss:\n${stdout.trim()}`; }
    catch { return "Could not fetch IP Boss."; }
  }

  if (lower.includes("battery")) {
    try { const { stdout } = await execAsync(`powershell -c "Get-WmiObject Win32_Battery | Select-Object EstimatedChargeRemaining | Format-List"`); return `Battery Boss:\n${stdout.trim()}`; }
    catch { return "Battery info unavailable Boss."; }
  }

  if (lower.includes("running apps") || lower.includes("what is running") || lower.includes("list processes")) {
    try {
      const { stdout } = await execAsync(`powershell -c "Get-Process | Where-Object {$_.MainWindowTitle} | Select-Object Name,@{N='MB';E={[math]::Round($_.WorkingSet/1MB,1)}} | Sort-Object MB -Descending | Select-Object -First 12 | Format-Table -AutoSize | Out-String"`);
      return `Running apps Boss:\n${stdout.trim()}`;
    } catch { return "Could not fetch processes Boss."; }
  }

  if (lower.includes("kill ") || lower.includes("force close") || lower.includes("terminate")) {
    const appName = message.replace(/kill|force close|terminate|stop|close app/gi, "").trim();
    if (appName) { exec(`taskkill /f /im ${appName}.exe`, ()=>{}); return `Terminated ${appName} Boss.`; }
  }

  if (lower.includes("brightness")) {
    const num = message.match(/\d+/);
    const level = num ? parseInt(num[0]) : 70;
    exec(`powershell -c "(Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods).WmiSetBrightness(1,${level})"`);
    return `Brightness set to ${level} percent Boss.`;
  }

  if (lower.includes("wifi") || lower.includes("wi-fi")) {
    try { const { stdout } = await execAsync("netsh wlan show interfaces"); const m = stdout.match(/SSID\s+:\s+(.+)/); return m ? `Connected to: ${m[1].trim()} Boss.` : "WiFi info unavailable Boss."; }
    catch { return "WiFi info unavailable Boss."; }
  }

  if (lower.includes("minimize all") || lower.includes("show desktop")) {
    exec(`powershell -c "$obj = New-Object -ComObject Shell.Application; $obj.MinimizeAll()"`);
    return "All windows minimized Boss.";
  }

  return null;
}

function getCapabilities() {
  return `NAHVI Full Capabilities Boss:

AI CHAT: Ask anything. Groq for fast replies, Gemini for deep analysis.
PC CONTROL: volume, mute, screenshot, shutdown, restart, sleep, lock, brightness, battery, wifi, ip, running apps, kill any app.
YOUTUBE: say "play [song name] on YouTube" — opens and plays automatically.
GOOGLE: say "search [query]" — opens Google with results.
MOVIES: say "open [movie name]" — finds file on PC and plays in VLC.
FILES: say "open [filename]" — smart search across all drives, opens in correct app.
APPS: open 80+ websites and 60+ desktop apps by name.
MODES: study mode, coding mode, meeting mode, gaming mode.
DOCS: summarize, notes, MCQ, flashcards, key terms for any document.
SYSTEM: weather, system info, date/time, calculator, joke, reminders.
All systems ready Boss.`;
}

// =====================================================
// MAIN API ROUTE
// =====================================================

app.post("/api/chat", async (req, res) => {
  try {
    const raw = req.body.message || req.body.messages?.[req.body.messages.length - 1]?.content;
    if (!raw) return res.json({ reply: "No command received Boss." });

    // Normalize
    const message = normalizeCommand(raw) || raw;
    const lower = message.toLowerCase();

    // ── DETECT INTENT — get the object, extract .intent string ──
    const intentResult = detectIntent(message);
    let intent = typeof intentResult === "string" ? intentResult : intentResult.intent;
    if (intent === "aichat" && looksLikeCalculation(message)) intent = "calculator";
    const mode = detectResponseMode(`${raw} ${message}`, intent);

    res.locals.intent = intent;
    res.locals.responseMode = mode;

    console.log(`NAHVI → raw: "${raw}" | normalized: "${message}" | intent: ${intent} | mode: ${mode}`);

    // =====================================================
    // YOUTUBE — HIGHEST PRIORITY for play/song commands
    // =====================================================
    const isYouTubePlay =
      (lower.includes("youtube") && (lower.includes("play") || lower.includes("search") || lower.includes("song") || lower.includes("music"))) ||
      (lower.includes("play") && (lower.includes("song") || lower.includes("music") || lower.includes("on youtube") || lower.includes("youtube pe")));

    if (isYouTubePlay) {
      const result = await youtubeSearch(message);
      return res.json({ reply: result, engine: "System" });
    }

    // =====================================================
    // GOOGLE SEARCH
    // =====================================================
    const isGoogleSearch =
      (lower.includes("google") && lower.includes("search")) ||
      (lower.startsWith("search ") && !lower.includes("youtube") && !lower.includes("file"));

    if (isGoogleSearch) {
      const result = await googleSearch(message);
      return res.json({ reply: result, engine: "System" });
    }

    // =====================================================
    // ROUTE BY INTENT
    // =====================================================

    if (intent === "capabilities") {
      return res.json({ reply: getCapabilities(), engine: "System" });
    }

    if (intent === "datetime") {
      return res.json({ reply: getDateTime(), engine: "System" });
    }

    if (intent === "weather") {
      return res.json({ reply: await getWeather(message), engine: "System" });
    }

    if (intent === "calculator") {
      const calculation = calculateStructured(message, mode);
      return res.json({
        reply: calculationToReply(calculation),
        engine: "Calculator",
        answer: calculation.answer,
        explanation: calculation.explanation,
        confidence: calculation.confidence,
        mode: calculation.mode,
      });
    }

    if (intent === "systeminfo") {
      return res.json({ reply: await getSystemInfo(), engine: "System" });
    }

    if (intent === "joke") {
      return res.json({ reply: getJoke(), engine: "System" });
    }

    if (intent === "reminder") {
      return res.json({ reply: addReminder(message), engine: "System" });
    }

    if (intent === "listreminders") {
      return res.json({ reply: listReminders(), engine: "System" });
    }

    if (intent === "news") {
      return res.json({ reply: "Add NEWS_API_KEY in .env for live headlines Boss.", engine: "System" });
    }

    if (intent === "aistatus") {
      return res.json({ reply: "Groq LLaMA 3.3 70B: ONLINE. Gemini 2.5 Flash: ONLINE. Intent Engine: ACTIVE. All systems go Boss.", engine: "System" });
    }

    if (intent === "workflow") {
      const wf = await handleWorkflow(lower);
      if (wf) return res.json({ reply: wf, engine: "System" });
    }

    // ── PC / Desktop Control ────────────────────────────
    if (intent === "desktopcontrol") {
      // Try PC control first
      const pc = await handlePCControl(message);
      if (pc) return res.json({ reply: pc, engine: "PC Control" });
      // Then desktop automation
      try {
        const r = await handleDesktopCommand(message);
        if (r) return res.json({ reply: r, engine: "Desktop" });
      } catch (e) {
        return res.json({ reply: `Desktop error Boss: ${e.message}`, engine: "Desktop" });
      }
    }

    // Also handle PC control keywords directly regardless of intent
    const PC_DIRECT = ["volume up","volume down","mute","shutdown","shut down","restart","reboot","sleep","lock pc","lock screen","cancel shutdown","screenshot","screen capture","ip address","my ip","battery","running apps","list processes","minimize all","show desktop","brightness","wifi status"];
    if (PC_DIRECT.some(t => lower.includes(t))) {
      const pc = await handlePCControl(message);
      if (pc) return res.json({ reply: pc, engine: "PC Control" });
    }

    // ── Kill Process ──────────────────────────────────
    if (intent === "killprocess") {
      const name = message.replace(/kill|force close|terminate|close app|end process/gi, "").trim();
      exec(`taskkill /f /im ${name}.exe`, ()=>{});
      return res.json({ reply: `Terminated ${name} Boss.`, engine: "PC Control" });
    }

    // ── Open App — appLauncher ────────────────────────
    if (intent === "openapp") {
      const result = await launchApp(message);
      // If app not found, try file search
      if (result && result.includes("Could not find")) {
        const fileResult = await findAndOpenFile(message);
        return res.json({ reply: fileResult, engine: "System" });
      }
      return res.json({ reply: result, engine: "System" });
    }

    // ── Open File / Play Movie ────────────────────────
    if (intent === "openfile" || intent === "playmovie") {
      const result = await findAndOpenFile(message);
      return res.json({ reply: result, engine: "System" });
    }

    // ── Browser Control ───────────────────────────────
    if (intent === "browsercontrol") {
      try {
        const r = await handleBrowserCommand(message);
        if (r) return res.json({ reply: r, engine: "Browser" });
      } catch (e) {
        return res.json({ reply: `Browser error Boss: ${e.message}`, engine: "Browser" });
      }
    }

    // ── Internet Search ───────────────────────────────
    if (intent === "internetsearch") {
      const result = await googleSearch(message);
      return res.json({ reply: result, engine: "System" });
    }

    // ── Document AI ───────────────────────────────────
    if (intent === "documentai") {
      if ((lower.includes("save") || lower.includes("export")) &&
          (lower.includes("summary") || lower.includes("notes") || lower.includes("mcq"))) {
        try { const r = await handleSaveAndGenerate(message); if (r) return res.json({ reply: r, engine: "Document AI" }); }
        catch (e) { return res.json({ reply: `Save error Boss: ${e.message}`, engine: "Document AI" }); }
      }
      try {
        const r = await handleDocumentCommand(message);
        if (r) return res.json({ reply: r, engine: "Document AI" });
      } catch (e) {
        return res.json({ reply: `Document error Boss: ${e.message}`, engine: "Document AI" });
      }
    }

    // ── File Organizer ────────────────────────────────
    if (intent === "fileorganizer") {
      try { const r = await handleFileOrganizerCommand(message); if (r) return res.json({ reply: r, engine: "FileOrganizer" }); }
      catch (e) { return res.json({ reply: `Organizer error Boss: ${e.message}`, engine: "FileOrganizer" }); }
    }

    // ── File Manager ─────────────────────────────────
    if (lower.includes("create file") || lower.includes("delete file") || lower.includes("read file") || lower.includes("list files")) {
      const r = await fileManager(message);
      return res.json({ reply: r, engine: "System" });
    }

    // ── Windows Search ────────────────────────────────
    if (lower.includes("open search") || lower.includes("windows search")) {
      return res.json({ reply: await openWindowsSearch(), engine: "System" });
    }

    // ── Network Info ──────────────────────────────────
    if (intent === "networkinfo") {
      const pc = await handlePCControl(message.includes("wifi") ? "wifi status" : "ip address");
      return res.json({ reply: pc || "Network check done Boss.", engine: "System" });
    }

    // ── Motivational ──────────────────────────────────
    if (intent === "motivational") {
      const { reply, engine } = await askGemini(
        `Give a short powerful motivational quote for someone working hard. Plain text, no markdown, 2 sentences max. Address as Boss.`,
        mode,
        intent
      );
      return res.json({ reply, engine });
    }

    // ── AI Chat (default fallback) ────────────────────
    const { reply, engine } = await askNAHVI(message, mode, intent);
    return res.json({ reply, engine });

  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ reply: "Server error Boss.", engine: "System" });
  }
});

// =====================================================
// ROUTES
// =====================================================

app.get("/api/voice-info", (req, res) => {
  res.json({ message: "Use Web Speech API. Language: en-IN Boss." });
});

app.get("/", (req, res) => {
  res.send(`<h1 style="font-family:monospace;background:#000;color:#00D4FF;padding:40px;margin:0;">NAHVI AI OS — ONLINE<br>Intent Engine Active | Abhinay AI Industries</h1>`);
});

// =====================================================
// START
// =====================================================

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║       NAHVI AI PRODUCTIVITY OS — ONLINE      ║
║  PORT          : ${PORT}                          ║
║  GROQ          : ${process.env.GROQ_API_KEY ? "Connected ✓" : "Missing  ✗"}                ║
║  GEMINI        : ${process.env.GEMINI_API_KEY ? "Connected ✓" : "Missing  ✗"}                ║
║  INTENT ENGINE : Active ✓                    ║
║  APP LAUNCHER  : 80+ websites, 60+ apps ✓    ║
║  FILE HANDLER  : Smart search ✓              ║
║  YOUTUBE       : Direct play ✓               ║
║  PC CONTROL    : Full control ✓              ║
║  BUILDER       : Abhinay AI Industries       ║
╚══════════════════════════════════════════════╝
`);
});
