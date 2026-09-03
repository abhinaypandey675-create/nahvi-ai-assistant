import fs from "fs";
import path from "path";
import os from "os";
import { exec } from "child_process";

// =====================================================
// SEARCH DIRECTORIES — Most common Windows locations
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
  "C:\\Users\\Public\\Desktop",
];

// =====================================================
// FILE TYPE CATEGORIES
// =====================================================

const FILE_TYPES = {
  document : [".pdf", ".docx", ".doc", ".txt", ".pptx", ".ppt", ".xlsx", ".xls", ".odt"],
  video    : [".mp4", ".mkv", ".avi", ".mov", ".wmv", ".flv", ".webm"],
  image    : [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg", ".webp"],
  audio    : [".mp3", ".wav", ".flac", ".aac", ".ogg", ".m4a"],
  code     : [".js", ".py", ".html", ".css", ".json", ".ts", ".jsx", ".tsx", ".cpp", ".java"],
  archive  : [".zip", ".rar", ".7z", ".tar", ".gz"],
};

// =====================================================
// SMART QUERY CLEANER
// Removes filler words to get the real search term
// =====================================================

function cleanQuery(query) {
  return query
    .replace(/open/gi, "")
    .replace(/find/gi, "")
    .replace(/search/gi, "")
    .replace(/locate/gi, "")
    .replace(/show/gi, "")
    .replace(/get/gi, "")
    .replace(/my/gi, "")
    .replace(/the/gi, "")
    .replace(/file/gi, "")
    .replace(/folder/gi, "")
    .replace(/document/gi, "")
    .replace(/video/gi, "")
    .replace(/movie/gi, "")
    .replace(/photo/gi, "")
    .replace(/image/gi, "")
    .replace(/please/gi, "")
    .replace(/boss/gi, "")
    .trim()
    .toLowerCase();
}

// =====================================================
// SCORE MATCH — smarter relevance ranking
// =====================================================

function scoreMatch(fileName, query) {
  const name = fileName.toLowerCase();
  const q = query.toLowerCase();

  // Exact name match (without extension) — highest score
  const nameWithoutExt = name.replace(/\.[^/.]+$/, "");
  if (nameWithoutExt === q) return 100;

  // Starts with query
  if (nameWithoutExt.startsWith(q)) return 80;

  // Contains full query
  if (name.includes(q)) return 60;

  // All words of query appear in filename
  const words = q.split(" ").filter(Boolean);
  const allWordsMatch = words.every((w) => name.includes(w));
  if (allWordsMatch && words.length > 1) return 50;

  // Some words match
  const someWordsMatch = words.filter((w) => name.includes(w)).length;
  if (someWordsMatch > 0) return someWordsMatch * 15;

  return 0;
}

// =====================================================
// WALK DIRECTORY — recursive with depth limit
// =====================================================

function walkDir(dir, query, results, depth = 0) {
  if (depth > 4) return; // don't go too deep

  try {
    if (!fs.existsSync(dir)) return;

    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
      // Skip system/hidden folders
      if (item.name.startsWith(".")) continue;
      if (item.name === "node_modules") continue;
      if (item.name === "AppData") continue;
      if (item.name === "$Recycle.Bin") continue;
      if (item.name === "System Volume Information") continue;

      const fullPath = path.join(dir, item.name);

      if (item.isDirectory()) {
        walkDir(fullPath, query, results, depth + 1);
      } else {
        const score = scoreMatch(item.name, query);
        if (score > 0) {
          const ext = path.extname(item.name).toLowerCase();
          const type = Object.entries(FILE_TYPES).find(([, exts]) =>
            exts.includes(ext)
          )?.[0] || "other";

          results.push({
            name    : item.name,
            path    : fullPath,
            dir     : path.dirname(fullPath),
            type,
            ext,
            score,
            size    : getFileSize(fullPath),
            modified: getModifiedDate(fullPath),
          });
        }
      }
    }
  } catch {
    // Skip folders we don't have permission to access
  }
}

// =====================================================
// FILE SIZE HELPER
// =====================================================

function getFileSize(filePath) {
  try {
    const stat = fs.statSync(filePath);
    const bytes = stat.size;
    if (bytes < 1024)        return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  } catch {
    return "Unknown";
  }
}

// =====================================================
// MODIFIED DATE HELPER
// =====================================================

function getModifiedDate(filePath) {
  try {
    const stat = fs.statSync(filePath);
    return stat.mtime.toLocaleDateString("en-IN");
  } catch {
    return "Unknown";
  }
}

// =====================================================
// MAIN SEARCH FUNCTION
// =====================================================

export function searchFiles(rawQuery) {
  const query = cleanQuery(rawQuery);

  if (!query || query.length < 2) {
    return [];
  }

  const results = [];

  for (const dir of SEARCH_DIRS) {
    walkDir(dir, query, results);
  }

  // Sort by score (highest first), then by modified date
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(b.modified) - new Date(a.modified);
  });

  // Remove duplicates by path
  const seen = new Set();
  const unique = results.filter((r) => {
    if (seen.has(r.path)) return false;
    seen.add(r.path);
    return true;
  });

  return unique.slice(0, 8); // top 8 results
}

// =====================================================
// OPEN FILE — Windows
// =====================================================

export function openFile(filePath) {
  try {
    exec(`start "" "${filePath}"`, (err) => {
      if (err) console.error("Open file error:", err.message);
    });
  } catch (error) {
    console.error("Could not open file:", error.message);
  }
}

// =====================================================
// OPEN FOLDER — opens containing folder
// =====================================================

export function openFolder(filePath) {
  try {
    exec(`explorer /select,"${filePath}"`, (err) => {
      if (err) console.error("Open folder error:", err.message);
    });
  } catch (error) {
    console.error("Could not open folder:", error.message);
  }
}

// =====================================================
// FORMAT RESULTS — for NAHVI reply
// =====================================================

export function formatSearchResults(results, query) {
  if (results.length === 0) {
    return `No file found matching "${query}" Boss. Try a different name or check if the file exists.`;
  }

  const best = results[0];

  // Auto open best match
  openFile(best.path);

  if (results.length === 1) {
    return `
========================================
📁 FILE FOUND & OPENED
========================================
Name     : ${best.name}
Type     : ${best.type.toUpperCase()}
Size     : ${best.size}
Modified : ${best.modified}
Location : ${best.dir}
========================================
Opening "${best.name}" Boss.
`;
  }

  const otherMatches = results
    .slice(1)
    .map((r, i) => `  ${i + 2}. ${r.name} (${r.type}, ${r.size})`)
    .join("\n");

  return `
========================================
📁 BEST MATCH FOUND & OPENED
========================================
Name     : ${best.name}
Type     : ${best.type.toUpperCase()}
Size     : ${best.size}
Modified : ${best.modified}
Location : ${best.dir}
========================================
Other matches found Boss:
${otherMatches}
========================================
Opening best match: "${best.name}" Boss.
`;
}