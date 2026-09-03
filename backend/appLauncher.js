// =====================================================
// appLauncher.js — NAHVI Smart App Launcher
// Opens any app or website with zero confusion
// Part of: Abhinay AI Industries — NAHVI OS
// =====================================================

import { exec } from "child_process";
import { promisify } from "util";
import open from "open";

const execAsync = promisify(exec);

// =====================================================
// WEBSITES — keyword → URL
// =====================================================

const WEBSITES = {
  // Video
  youtube:        "https://youtube.com",
  "youtube music":"https://music.youtube.com",
  netflix:        "https://netflix.com",
  "prime video":  "https://primevideo.com",
  hotstar:        "https://hotstar.com",
  twitch:         "https://twitch.tv",
  vimeo:          "https://vimeo.com",

  // Social
  instagram:      "https://instagram.com",
  twitter:        "https://twitter.com",
  "x.com":        "https://x.com",
  facebook:       "https://facebook.com",
  linkedin:       "https://linkedin.com",
  reddit:         "https://reddit.com",
  pinterest:      "https://pinterest.com",
  snapchat:       "https://snapchat.com",

  // Dev
  github:         "https://github.com",
  stackoverflow:  "https://stackoverflow.com",
  "stack overflow":"https://stackoverflow.com",
  codepen:        "https://codepen.io",
  replit:         "https://replit.com",
  vercel:         "https://vercel.com",
  netlify:        "https://netlify.com",
  "npm":          "https://npmjs.com",
  "docker hub":   "https://hub.docker.com",
  "product hunt": "https://producthunt.com",

  // Google services
  google:         "https://google.com",
  gmail:          "https://gmail.com",
  "google drive": "https://drive.google.com",
  "google docs":  "https://docs.google.com",
  "google sheets":"https://sheets.google.com",
  "google slides":"https://slides.google.com",
  "google meet":  "https://meet.google.com",
  "google maps":  "https://maps.google.com",
  "google photos":"https://photos.google.com",
  "google calendar":"https://calendar.google.com",
  "google translate":"https://translate.google.com",
  "google classroom":"https://classroom.google.com",

  // AI Tools
  chatgpt:        "https://chat.openai.com",
  "chat gpt":     "https://chat.openai.com",
  claude:         "https://claude.ai",
  gemini:         "https://gemini.google.com",
  perplexity:     "https://perplexity.ai",
  "midjourney":   "https://midjourney.com",
  "hugging face": "https://huggingface.co",
  ideogram:       "https://ideogram.ai",

  // Communication
  whatsapp:       "https://web.whatsapp.com",
  telegram:       "https://web.telegram.org",
  discord:        "https://discord.com/app",
  slack:          "https://slack.com",
  "google chat":  "https://chat.google.com",

  // Shopping
  amazon:         "https://amazon.in",
  flipkart:       "https://flipkart.com",
  meesho:         "https://meesho.com",
  myntra:         "https://myntra.com",

  // Music
  spotify:        "https://open.spotify.com",
  "gaana":        "https://gaana.com",
  "jiosaavn":     "https://jiosaavn.com",
  "wynk":         "https://wynk.in",

  // Productivity
  notion:         "https://notion.so",
  trello:         "https://trello.com",
  asana:          "https://asana.com",
  figma:          "https://figma.com",
  canva:          "https://canva.com",
  "miro":         "https://miro.com",
  "loom":         "https://loom.com",

  // Finance
  "zerodha":      "https://kite.zerodha.com",
  "groww":        "https://groww.in",
  "paytm":        "https://paytm.com",
  "phonepe":      "https://phonepe.com",

  // News
  "times of india": "https://timesofindia.com",
  "ndtv":           "https://ndtv.com",
  "bbc":            "https://bbc.com",
  "cnn":            "https://cnn.com",
  "the hindu":      "https://thehindu.com",

  // Education
  "coursera":     "https://coursera.org",
  "udemy":        "https://udemy.com",
  "khan academy": "https://khanacademy.org",
  "unacademy":    "https://unacademy.com",
  "byju":         "https://byjus.com",
  "youtube learning": "https://youtube.com/learning",

  // Misc
  "gumroad":      "https://gumroad.com",
  "lemonsqueezy": "https://lemonsqueezy.com",
  "lemon squeezy":"https://lemonsqueezy.com",
  "anthropic":    "https://anthropic.com",
  "openai":       "https://openai.com",
};

// =====================================================
// DESKTOP APPS — keyword → command
// =====================================================

const DESKTOP_APPS = [
  // Browsers
  { keys: ["chrome", "google chrome"],          cmd: "start chrome",                    label: "Google Chrome" },
  { keys: ["edge", "microsoft edge"],           cmd: "start msedge",                    label: "Microsoft Edge" },
  { keys: ["firefox", "mozilla"],               cmd: "start firefox",                   label: "Firefox" },
  { keys: ["opera"],                            cmd: "start opera",                     label: "Opera" },
  { keys: ["brave"],                            cmd: "start brave",                     label: "Brave" },

  // Media
  { keys: ["vlc", "vlc player", "vlc media"],  cmd: `"C:\\Program Files\\VideoLAN\\VLC\\vlc.exe"`, label: "VLC Media Player" },
  { keys: ["windows media player", "wmp"],     cmd: "start wmplayer",                  label: "Windows Media Player" },
  { keys: ["groove", "groove music"],          cmd: "start mswindowsmusic:",            label: "Groove Music" },
  { keys: ["photos", "photo app", "windows photos"], cmd: "start ms-photos:",          label: "Photos" },
  { keys: ["movies tv", "movies and tv"],      cmd: "start mswindowsvideo:",            label: "Movies and TV" },

  // Microsoft Office
  { keys: ["word", "ms word", "microsoft word"],       cmd: "start winword",            label: "Microsoft Word" },
  { keys: ["excel", "ms excel", "microsoft excel"],    cmd: "start excel",              label: "Microsoft Excel" },
  { keys: ["powerpoint", "ppt", "ms powerpoint"],     cmd: "start powerpnt",           label: "PowerPoint" },
  { keys: ["outlook", "ms outlook"],                  cmd: "start outlook",            label: "Outlook" },
  { keys: ["onenote"],                                cmd: "start onenote",            label: "OneNote" },
  { keys: ["access", "ms access"],                    cmd: "start msaccess",           label: "Access" },

  // Dev Tools
  { keys: ["vs code", "vscode", "visual studio code", "code editor"], cmd: "code",     label: "VS Code" },
  { keys: ["visual studio"],                          cmd: "start devenv",             label: "Visual Studio" },
  { keys: ["android studio"],                        cmd: "start androidstudio",       label: "Android Studio" },
  { keys: ["postman"],                               cmd: "start postman",             label: "Postman" },
  { keys: ["git bash"],                              cmd: `"C:\\Program Files\\Git\\bin\\bash.exe"`, label: "Git Bash" },
  { keys: ["docker"],                               cmd: "start docker",               label: "Docker" },

  // System Tools
  { keys: ["notepad"],                               cmd: "notepad",                   label: "Notepad" },
  { keys: ["notepad++", "notepadpp"],               cmd: "start notepad++",            label: "Notepad++" },
  { keys: ["calculator", "calc"],                   cmd: "calc",                       label: "Calculator" },
  { keys: ["paint", "ms paint"],                    cmd: "mspaint",                    label: "Paint" },
  { keys: ["paint 3d"],                             cmd: "start ms-paint:",            label: "Paint 3D" },
  { keys: ["task manager", "taskmgr"],              cmd: "taskmgr",                    label: "Task Manager" },
  { keys: ["file explorer", "explorer", "my files", "files", "this pc"], cmd: "explorer", label: "File Explorer" },
  { keys: ["cmd", "command prompt", "command line"], cmd: "start cmd",                label: "Command Prompt" },
  { keys: ["powershell"],                           cmd: "start powershell",           label: "PowerShell" },
  { keys: ["terminal", "windows terminal"],         cmd: "start wt",                   label: "Windows Terminal" },
  { keys: ["settings", "windows settings"],         cmd: "start ms-settings:",         label: "Settings" },
  { keys: ["control panel"],                        cmd: "control",                    label: "Control Panel" },
  { keys: ["device manager"],                       cmd: "devmgmt.msc",                label: "Device Manager" },
  { keys: ["disk management"],                      cmd: "diskmgmt.msc",               label: "Disk Management" },
  { keys: ["registry", "regedit"],                  cmd: "regedit",                    label: "Registry Editor" },
  { keys: ["snipping tool", "snip", "screenshot tool"], cmd: "snippingtool",           label: "Snipping Tool" },
  { keys: ["screen recorder", "xbox game bar"],     cmd: "start ms-gamebar:",          label: "Xbox Game Bar" },

  // Communication
  { keys: ["discord"],                              cmd: "start discord",              label: "Discord" },
  { keys: ["teams", "microsoft teams"],             cmd: "start teams",                label: "Microsoft Teams" },
  { keys: ["zoom"],                                 cmd: "start zoom",                 label: "Zoom" },
  { keys: ["skype"],                                cmd: "start skype:",               label: "Skype" },
  { keys: ["telegram"],                             cmd: "start telegram",             label: "Telegram" },
  { keys: ["whatsapp desktop", "whatsapp app"],     cmd: "start whatsapp:",            label: "WhatsApp" },

  // Gaming
  { keys: ["steam"],                                cmd: "start steam",                label: "Steam" },
  { keys: ["epic games", "epic"],                   cmd: "start epicgameslauncher",    label: "Epic Games" },
  { keys: ["origin", "ea"],                         cmd: "start origin",               label: "Origin" },
  { keys: ["xbox"],                                 cmd: "start xbox:",                label: "Xbox" },

  // Utilities
  { keys: ["obs", "obs studio"],                    cmd: "start obs64",                label: "OBS Studio" },
  { keys: ["winrar"],                               cmd: "start winrar",               label: "WinRAR" },
  { keys: ["7zip", "7-zip"],                        cmd: `"C:\\Program Files\\7-Zip\\7zFM.exe"`, label: "7-Zip" },
  { keys: ["spotify app", "spotify desktop"],       cmd: "start spotify",              label: "Spotify" },
  { keys: ["itunes"],                               cmd: "start itunes",               label: "iTunes" },
  { keys: ["malwarebytes"],                         cmd: "start malwarebytes",         label: "Malwarebytes" },
  { keys: ["task scheduler"],                       cmd: "taskschd.msc",               label: "Task Scheduler" },
  { keys: ["event viewer"],                         cmd: "eventvwr.msc",               label: "Event Viewer" },
  { keys: ["lively", "lively wallpaper"],           cmd: `start "" "C:\\Users\\${process.env.USERNAME || "User"}\\AppData\\Local\\Programs\\Lively Wallpaper\\Lively.exe"`, label: "Lively Wallpaper" },
  { keys: ["wallpaper engine"],                     cmd: "start wallpaper32",          label: "Wallpaper Engine" },
  { keys: ["rainmeter"],                            cmd: "start rainmeter",            label: "Rainmeter" },

  // Windows Built-in
  { keys: ["camera"],                               cmd: "start microsoft.windows.camera:", label: "Camera" },
  { keys: ["clock", "alarm", "alarms"],             cmd: "start ms-clock:",            label: "Clock" },
  { keys: ["maps", "windows maps"],                 cmd: "start bingmaps:",            label: "Maps" },
  { keys: ["weather app"],                          cmd: "start bingweather:",         label: "Weather App" },
  { keys: ["store", "microsoft store"],             cmd: "start ms-windows-store:",    label: "Microsoft Store" },
  { keys: ["mail app", "windows mail"],             cmd: "start outlookmail:",         label: "Mail" },
  { keys: ["sticky notes", "sticky"],               cmd: "start ms-stickynotes:",      label: "Sticky Notes" },
];

// =====================================================
// EXTRACT APP NAME FROM MESSAGE
// =====================================================

function extractAppName(message) {
  return message
    .toLowerCase()
    .replace(/\b(open|launch|start|go to|navigate to|kholo|chalao|please|boss|now|for me|me|the|a|an)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

// =====================================================
// FIND WEBSITE MATCH
// =====================================================

function findWebsite(appName) {
  // Exact match first
  if (WEBSITES[appName]) return WEBSITES[appName];

  // Partial match
  for (const [key, url] of Object.entries(WEBSITES)) {
    if (appName.includes(key) || key.includes(appName)) {
      return url;
    }
  }
  return null;
}

// =====================================================
// FIND DESKTOP APP MATCH
// =====================================================

function findDesktopApp(appName) {
  for (const app of DESKTOP_APPS) {
    if (app.keys.some(k => appName.includes(k) || k.includes(appName))) {
      return app;
    }
  }
  return null;
}

// =====================================================
// MAIN LAUNCHER FUNCTION
// =====================================================

export async function launchApp(message) {
  const appName = extractAppName(message);

  if (!appName || appName.length < 1) {
    return "Please tell me which app or website to open Boss.";
  }

  console.log(`NAHVI App Launch: "${message}" → looking for: "${appName}"`);

  // 1. Try website first
  const url = findWebsite(appName);
  if (url) {
    try {
      await open(url);
      const name = appName.charAt(0).toUpperCase() + appName.slice(1);
      return `Opening ${name} Boss.`;
    } catch (e) {
      return `Could not open ${appName} Boss. Try manually.`;
    }
  }

  // 2. Try desktop app
  const app = findDesktopApp(appName);
  if (app) {
    try {
      exec(app.cmd, (err) => {
        if (err) console.error(`Launch error for ${app.label}:`, err.message);
      });
      return `Opening ${app.label} Boss.`;
    } catch (e) {
      return `Could not launch ${app.label} Boss. ${e.message}`;
    }
  }

  // 3. Try direct exec as last resort
  try {
    exec(`start ${appName}`, (err) => {});
    return `Attempting to open ${appName} Boss.`;
  } catch {
    return `Could not find ${appName} Boss. Make sure it is installed.`;
  }
}

// =====================================================
// OPEN SPECIFIC URL (for internet search etc)
// =====================================================

export async function openURL(url, label) {
  try {
    await open(url);
    return label ? `Opening ${label} Boss.` : `Opening ${url} Boss.`;
  } catch (e) {
    return `Could not open URL Boss. ${e.message}`;
  }
}

// =====================================================
// CHECK IF MESSAGE IS A KNOWN APP
// =====================================================

export function isKnownApp(message) {
  const appName = extractAppName(message);
  return !!(findWebsite(appName) || findDesktopApp(appName));
}