// =====================================================
// fileHandler.js — NAHVI Smart File Handler
// Fixed: correct app per type + docx scores over txt
// Part of: Abhinay AI Industries — NAHVI OS
// =====================================================

import fs from "fs-extra";
import path from "path";
import os from "os";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// =====================================================
// SEARCH DIRECTORIES
// =====================================================

const SEARCH_DIRS = [
  path.join(os.homedir(), "Desktop"),
  path.join(os.homedir(), "Downloads"),
  path.join(os.homedir(), "Documents"),
  path.join(os.homedir(), "Videos"),
  path.join(os.homedir(), "Pictures"),
  path.join(os.homedir(), "Music"),
  path.join(os.homedir(), "OneDrive"),
  path.join(os.homedir(), "OneDrive", "Desktop"),
  path.join(os.homedir(), "OneDrive", "Documents"),
  path.join(os.homedir(), "OneDrive", "Pictures"),
  "C:\\Users\\Public\\Desktop",
  "C:\\Users\\Public\\Documents",
  "C:\\Users\\Public\\Videos",
  "D:\\",
  "D:\\Movies",
  "D:\\Videos",
  "D:\\Films",
  "D:\\Documents",
  "D:\\Downloads",
  "D:\\Music",
  "E:\\",
  "E:\\Movies",
  "E:\\Videos",
  "E:\\Documents",
  "F:\\",
  "F:\\Movies",
  "F:\\Videos",
];

// =====================================================
// FILE TYPE SETS
// =====================================================

const VIDEO_EXTS   = new Set([".mkv", ".mp4", ".avi", ".mov", ".wmv", ".m4v", ".flv", ".webm", ".3gp", ".ts"]);
const DOC_EXTS     = new Set([".docx", ".doc", ".odt", ".rtf"]);
const PDF_EXTS     = new Set([".pdf"]);
const SHEET_EXTS   = new Set([".xlsx", ".xls", ".csv", ".ods"]);
const SLIDE_EXTS   = new Set([".pptx", ".ppt", ".odp"]);
const IMAGE_EXTS   = new Set([".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg", ".heic"]);
const AUDIO_EXTS   = new Set([".mp3", ".wav", ".flac", ".aac", ".ogg", ".m4a", ".wma"]);
const TEXT_EXTS    = new Set([".txt"]);
const CODE_EXTS    = new Set([".js", ".ts", ".py", ".html", ".css", ".json", ".jsx", ".tsx", ".cpp", ".java", ".cs", ".php", ".go", ".rs"]);
const ARCHIVE_EXTS = new Set([".zip", ".rar", ".7z", ".tar", ".gz"]);

// =====================================================
// JUNK EXTENSIONS — NEVER MATCH THESE
// =====================================================

const JUNK_EXTS = new Set([
  ".pyc", ".pyo", ".pyd", ".so", ".dll", ".exe", ".sys", ".ini",
  ".log", ".tmp", ".temp", ".cache", ".bak", ".old", ".lock",
  ".class", ".obj", ".o", ".a", ".lib", ".pdb", ".ilk", ".exp",
  ".db", ".sqlite", ".lnk", ".url", ".manifest", ".cat",
  ".msi", ".cab", ".inf", ".reg", ".bat", ".cmd", ".vbs",
]);

// =====================================================
// JUNK DIRECTORIES — SKIP THESE
// =====================================================

const JUNK_DIRS = new Set([
  "node_modules", "AppData", "$Recycle.Bin",
  "System Volume Information", "Windows",
  "Program Files", "Program Files (x86)", "ProgramData",
  "__pycache__", ".git", ".vscode", "dist", "build",
  "site-packages", "lib", "include", "Scripts",
]);

const VLC_PATH = `"C:\\Program Files\\VideoLAN\\VLC\\vlc.exe"`;

// =====================================================
// FILE TYPE BONUS — docx scores higher than txt
// =====================================================

function getTypeBonus(ext) {
  const e = ext.toLowerCase();
  if (DOC_EXTS.has(e))   return 30;  // .docx .doc → highest doc priority
  if (SHEET_EXTS.has(e)) return 30;  // .xlsx
  if (SLIDE_EXTS.has(e)) return 30;  // .pptx
  if (PDF_EXTS.has(e))   return 25;  // .pdf
  if (VIDEO_EXTS.has(e)) return 20;  // .mkv .mp4
  if (AUDIO_EXTS.has(e)) return 15;  // .mp3
  if (IMAGE_EXTS.has(e)) return 10;  // .jpg
  if (TEXT_EXTS.has(e))  return 5;   // .txt — lowest
  if (CODE_EXTS.has(e))  return 2;   // .py .js — very low
  return 0;
}

// =====================================================
// FILLER WORDS — strip from query
// Includes app names so "open ethics in ms word" → query = "ethics"
// =====================================================

const FILLER_WORDS = new Set([
  // Actions
  "open","find","search","locate","show","get","launch","start",
  "play","watch","read","view","load","stream","run","access",
  // Prepositions / conjunctions
  "my","the","a","an","that","this","please","now","for","me",
  "in","on","with","using","via","into","through","by",
  // NAHVI specific
  "boss","nahvi","can","you","could","would","will","should",
  "help","need","want","it","up","here","there","quickly","fast","asap",
  // File type words (keep content words)
  "file","document","video","movie","film","photo","image",
  "song","music","folder",
  // App names — strip these so "open X in word" → query = "X"
  "ms","word","excel","powerpoint","ppt","vlc","notepad",
  "chrome","edge","firefox","adobe","acrobat","photos",
  "microsoft","windows","default","app","application","viewer",
  // Hindi/Hinglish
  "ka","ki","ko","hai","karo","kholo","chalao","dikhao","mein","pe",
]);

// =====================================================
// CLEAN QUERY
// =====================================================

export function cleanQuery(rawMessage) {
  const words = rawMessage.toLowerCase().trim().split(/\s+/);
  const filtered = words.filter(w => {
    const clean = w.replace(/[^a-z0-9]/g, "");
    return !FILLER_WORDS.has(clean) && clean.length > 1;
  });
  return filtered.join(" ").trim();
}

// =====================================================
// SCORE FILENAME AGAINST QUERY
// =====================================================

function scoreFile(fileName, query) {
  const ext = path.extname(fileName).toLowerCase();

  // Hard block — never match junk
  if (JUNK_EXTS.has(ext)) return -1;

  const cleanName = fileName
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 1);
  if (queryWords.length === 0) return 0;

  let score = 0;
  let matchedCount = 0;

  for (const qw of queryWords) {
    if (cleanName === qw) {
      score += 100; matchedCount++;
    } else if (cleanName.startsWith(qw)) {
      score += 40; matchedCount++;
    } else if (cleanName.includes(qw)) {
      score += 20; matchedCount++;
    } else {
      const nameWords = cleanName.split(/\s+/);
      const partial = nameWords.some(nw => nw.includes(qw) || qw.includes(nw));
      if (partial) { score += 8; matchedCount++; }
    }
  }

  // Bonus — all query words matched
  if (matchedCount === queryWords.length && queryWords.length > 0) score += 60;

  // Proportional match bonus
  score += Math.floor((matchedCount / queryWords.length) * 30);

  // Penalty — too many extra words in filename
  const nameWordCount = cleanName.split(/\s+/).length;
  const extraWords = Math.max(0, nameWordCount - queryWords.length);
  score -= extraWords * 2;

  // Add file type bonus — docx always beats txt
  score += getTypeBonus(ext);

  return Math.max(0, score);
}

// =====================================================
// FILE SIZE HELPER
// =====================================================

function getFileSize(filePath) {
  try {
    const bytes = fs.statSync(filePath).size;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  } catch { return ""; }
}

// =====================================================
// WALK DIRECTORY
// =====================================================

function walkDir(dir, query, results, depth = 0, maxDepth = 3) {
  if (depth > maxDepth) return;
  try {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      if (JUNK_DIRS.has(entry.name)) continue;

      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath, query, results, depth + 1, maxDepth);
      } else {
        const score = scoreFile(entry.name, query);
        if (score > 0) {
          results.push({
            name: entry.name,
            path: fullPath,
            ext: path.extname(entry.name).toLowerCase(),
            score,
            dir: path.dirname(fullPath),
            size: getFileSize(fullPath),
          });
        }
      }
    }
  } catch { /* skip inaccessible */ }
}

// =====================================================
// OPEN FILE IN CORRECT APP — SMART
// =====================================================

export function openFileInCorrectApp(filePath, ext) {
  const e = ext.toLowerCase();
  try {
    if (VIDEO_EXTS.has(e) || AUDIO_EXTS.has(e)) {
      exec(`${VLC_PATH} "${filePath}"`, (err) => {
        if (err) exec(`start "" "${filePath}"`);
      });
    } else if (DOC_EXTS.has(e)) {
      exec(`start winword "${filePath}"`, (err) => {
        if (err) exec(`start "" "${filePath}"`);
      });
    } else if (PDF_EXTS.has(e)) {
      exec(`start "" "${filePath}"`);
    } else if (SHEET_EXTS.has(e)) {
      exec(`start excel "${filePath}"`, (err) => {
        if (err) exec(`start "" "${filePath}"`);
      });
    } else if (SLIDE_EXTS.has(e)) {
      exec(`start powerpnt "${filePath}"`, (err) => {
        if (err) exec(`start "" "${filePath}"`);
      });
    } else if (IMAGE_EXTS.has(e)) {
      exec(`start ms-photos:"${filePath}"`, (err) => {
        if (err) exec(`start "" "${filePath}"`);
      });
    } else if (CODE_EXTS.has(e)) {
      exec(`code "${filePath}"`, (err) => {
        if (err) exec(`start "" "${filePath}"`);
      });
    } else if (TEXT_EXTS.has(e)) {
      exec(`notepad "${filePath}"`);
    } else {
      exec(`start "" "${filePath}"`);
    }
  } catch {
    exec(`start "" "${filePath}"`);
  }
}

// =====================================================
// APP LABEL FOR RESPONSE
// =====================================================

function getAppLabel(ext) {
  const e = ext.toLowerCase();
  if (VIDEO_EXTS.has(e))   return "VLC Media Player";
  if (AUDIO_EXTS.has(e))   return "VLC Media Player";
  if (DOC_EXTS.has(e))     return "Microsoft Word";
  if (PDF_EXTS.has(e))     return "PDF Viewer";
  if (SHEET_EXTS.has(e))   return "Microsoft Excel";
  if (SLIDE_EXTS.has(e))   return "Microsoft PowerPoint";
  if (IMAGE_EXTS.has(e))   return "Photos";
  if (CODE_EXTS.has(e))    return "VS Code";
  if (TEXT_EXTS.has(e))    return "Notepad";
  return "default app";
}

// =====================================================
// MASTER SEARCH + OPEN
// =====================================================

export async function findAndOpenFile(rawMessage) {
  const query = cleanQuery(rawMessage);

  if (!query || query.length < 2) {
    return "Please tell me the name of the file you want to open Boss.";
  }

  console.log(`NAHVI File Search: "${rawMessage}" → query: "${query}"`);

  const results = [];
  for (const dir of SEARCH_DIRS) {
    walkDir(dir, query, results);
  }

  if (results.length === 0) {
    return `No file found matching "${query}" Boss. Try a more specific name.`;
  }

  results.sort((a, b) => b.score - a.score);

  // Deduplicate
  const seen = new Set();
  const unique = results.filter(r => {
    if (seen.has(r.path)) return false;
    seen.add(r.path);
    return true;
  });

  const best = unique[0];

  // Low confidence
  if (best.score < 20) {
    const options = unique.slice(0, 4)
      .map((r, i) => `${i + 1}. ${r.name} (${r.dir})`)
      .join("\n");
    return `Not sure which file Boss:\n\n${options}\n\nPlease be more specific.`;
  }

  console.log(`NAHVI opening: "${best.name}" score:${best.score} app:${getAppLabel(best.ext)}`);
  openFileInCorrectApp(best.path, best.ext);

  const appLabel = getAppLabel(best.ext);

  if (unique.length === 1) {
    return `Opening "${best.name}" in ${appLabel} Boss.`;
  }

  const others = unique.slice(1, 4).map((r, i) => `${i + 2}. ${r.name}`).join(", ");
  return `Opening "${best.name}" in ${appLabel} Boss.\n\nOther matches: ${others}`;
}

// =====================================================
// SEARCH ONLY
// =====================================================

export async function searchOnly(rawMessage) {
  const query = cleanQuery(rawMessage);
  if (!query || query.length < 2) return [];

  const results = [];
  for (const dir of SEARCH_DIRS) {
    walkDir(dir, query, results);
  }

  results.sort((a, b) => b.score - a.score);
  const seen = new Set();
  return results.filter(r => {
    if (seen.has(r.path)) return false;
    seen.add(r.path);
    return true;
  }).slice(0, 8);
}

// =====================================================
// OPEN BY EXACT PATH
// =====================================================

export function openByPath(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (fs.existsSync(filePath)) {
    openFileInCorrectApp(filePath, ext);
    return `Opening ${path.basename(filePath)} Boss.`;
  }
  return `File not found at that path Boss.`;
}

// =====================================================
// FILE MANAGER — internal storage
// =====================================================

const SAFE_ROOT = path.resolve("./-files");

export async function fileManager(message) {
  try {
    await fs.ensureDir(SAFE_ROOT);
    const lower = message.toLowerCase();

    if (lower.includes("create file")) {
      const name = message.replace(/create file/gi, "").trim();
      if (!name) return "Please provide a filename Boss.";
      await fs.writeFile(path.join(SAFE_ROOT, name), `Created by NAHVI\nDate: ${new Date().toLocaleString()}\n`);
      return `File "${name}" created Boss.`;
    }
    if (lower.includes("delete file")) {
      const name = message.replace(/delete file/gi, "").trim();
      const filePath = path.join(SAFE_ROOT, name);
      if (await fs.pathExists(filePath)) { await fs.remove(filePath); return `File "${name}" deleted Boss.`; }
      return `File "${name}" not found Boss.`;
    }
    if (lower.includes("read file")) {
      const name = message.replace(/read file/gi, "").trim();
      const filePath = path.join(SAFE_ROOT, name);
      if (await fs.pathExists(filePath)) return `Contents of "${name}":\n\n${await fs.readFile(filePath, "utf-8")}`;
      return `File "${name}" not found Boss.`;
    }
    if (lower.includes("list files") || lower.includes("show files")) {
      const files = await fs.readdir(SAFE_ROOT);
      if (!files.length) return "No files in NAHVI storage Boss.";
      return `Files Boss:\n\n${files.map((f, i) => `${i + 1}. ${f}`).join("\n")}`;
    }
    return "File manager ready Boss. Commands: create file, delete file, read file, list files.";
  } catch (err) {
    return `File manager error Boss: ${err.message}`;
  }
}