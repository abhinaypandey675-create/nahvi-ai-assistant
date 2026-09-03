// =====================================================
// fileOrganizer.js — NAHVI File Organizer
// Actually moves files — no fake promises
// Part of: Abhinay AI Industries — NAHVI OS
// =====================================================

import fs from "fs-extra";
import path from "path";
import os from "os";
import { promisify } from "util";
import { exec } from "child_process";

const execAsync = promisify(exec);

// =====================================================
// FILE TYPE MAP — extension → folder name
// =====================================================

const FILE_TYPE_MAP = {
  // Images
  jpg: "Images", jpeg: "Images", png: "Images", gif: "Images",
  bmp: "Images", webp: "Images", svg: "Images", ico: "Images",
  tiff: "Images", heic: "Images", raw: "Images",

  // Videos
  mp4: "Videos", mkv: "Videos", avi: "Videos", mov: "Videos",
  wmv: "Videos", flv: "Videos", webm: "Videos", m4v: "Videos",
  "3gp": "Videos",

  // Audio
  mp3: "Music", wav: "Music", flac: "Music", aac: "Music",
  ogg: "Music", wma: "Music", m4a: "Music", opus: "Music",

  // Documents
  pdf: "Documents/PDFs", doc: "Documents/Word", docx: "Documents/Word",
  xls: "Documents/Excel", xlsx: "Documents/Excel",
  ppt: "Documents/PowerPoint", pptx: "Documents/PowerPoint",
  txt: "Documents/Text", md: "Documents/Text", rtf: "Documents/Text",
  csv: "Documents/Excel", odt: "Documents/Word",

  // Code
  js: "Code", ts: "Code", jsx: "Code", tsx: "Code",
  py: "Code", java: "Code", cpp: "Code", c: "Code",
  cs: "Code", html: "Code", css: "Code", php: "Code",
  go: "Code", rs: "Code", rb: "Code", swift: "Code",
  json: "Code", xml: "Code", yml: "Code", yaml: "Code",
  sh: "Code", bat: "Code", ps1: "Code",

  // Archives
  zip: "Archives", rar: "Archives", "7z": "Archives",
  tar: "Archives", gz: "Archives", bz2: "Archives",

  // Executables / Installers
  exe: "Programs", msi: "Programs", apk: "Programs",
  dmg: "Programs", iso: "Programs",

  // Fonts
  ttf: "Fonts", otf: "Fonts", woff: "Fonts", woff2: "Fonts",
};

// =====================================================
// GET TARGET FOLDER FROM COMMAND
// "desktop", "downloads", "documents", "custom path"
// =====================================================

function resolveTargetFolder(message) {
  const lower = message.toLowerCase();

  if (lower.includes("desktop"))   return path.join(os.homedir(), "Desktop");
  if (lower.includes("downloads")) return path.join(os.homedir(), "Downloads");
  if (lower.includes("documents")) return path.join(os.homedir(), "Documents");
  if (lower.includes("pictures"))  return path.join(os.homedir(), "Pictures");
  if (lower.includes("music"))     return path.join(os.homedir(), "Music");
  if (lower.includes("videos"))    return path.join(os.homedir(), "Videos");

  // Default to Desktop
  return path.join(os.homedir(), "Desktop");
}

// =====================================================
// ORGANIZE FOLDER — actually moves files
// =====================================================

export async function organizeFolder(targetFolder) {
  try {
    const exists = await fs.pathExists(targetFolder);
    if (!exists) return `Folder not found Boss: ${targetFolder}`;

    const entries = await fs.readdir(targetFolder, { withFileTypes: true });
    const files = entries.filter(e => e.isFile());

    if (files.length === 0) return `No files found in ${path.basename(targetFolder)} Boss. It is already clean.`;

    let moved = 0;
    let skipped = 0;
    const report = {};

    for (const file of files) {
      const ext = path.extname(file.name).replace(".", "").toLowerCase();
      if (!ext) { skipped++; continue; } // skip files with no extension

      const folderName = FILE_TYPE_MAP[ext] || "Others";
      const destDir = path.join(targetFolder, folderName);

      // Skip if file is already inside a subfolder we created
      const srcPath = path.join(targetFolder, file.name);

      await fs.ensureDir(destDir);

      // Handle duplicate filenames
      let destPath = path.join(destDir, file.name);
      if (await fs.pathExists(destPath)) {
        const nameNoExt = path.basename(file.name, path.extname(file.name));
        const timestamp = Date.now();
        destPath = path.join(destDir, `${nameNoExt}_${timestamp}${path.extname(file.name)}`);
      }

      await fs.move(srcPath, destPath);
      moved++;

      // Track for report
      const topFolder = folderName.split("/")[0];
      report[topFolder] = (report[topFolder] || 0) + 1;
    }

    // Build readable report
    const summary = Object.entries(report)
      .sort((a, b) => b[1] - a[1])
      .map(([folder, count]) => `${folder}: ${count} file${count > 1 ? "s" : ""}`)
      .join(", ");

    return `Done Boss. Organized ${moved} files in ${path.basename(targetFolder)}.\n\n${summary}${skipped > 0 ? `\n${skipped} files skipped (no extension).` : ""}\n\nAll files sorted into their folders Boss.`;

  } catch (err) {
    return `File organization failed Boss: ${err.message}`;
  }
}

// =====================================================
// UNDO LAST ORGANIZATION — move files back to root
// =====================================================

export async function undoOrganize(targetFolder) {
  try {
    const entries = await fs.readdir(targetFolder, { withFileTypes: true });
    const subfolders = entries.filter(e => e.isDirectory());

    let moved = 0;

    for (const subfolder of subfolders) {
      const subPath = path.join(targetFolder, subfolder.name);
      const subFiles = await fs.readdir(subPath, { withFileTypes: true });

      for (const file of subFiles) {
        if (!file.isFile()) continue;
        const srcPath = path.join(subPath, file.name);
        let destPath = path.join(targetFolder, file.name);

        // Handle duplicates
        if (await fs.pathExists(destPath)) {
          const nameNoExt = path.basename(file.name, path.extname(file.name));
          destPath = path.join(targetFolder, `${nameNoExt}_restored${path.extname(file.name)}`);
        }

        await fs.move(srcPath, destPath);
        moved++;
      }

      // Remove empty subfolder
      const remaining = await fs.readdir(subPath);
      if (remaining.length === 0) await fs.remove(subPath);
    }

    return `Undone Boss. Moved ${moved} files back to ${path.basename(targetFolder)}.`;
  } catch (err) {
    return `Undo failed Boss: ${err.message}`;
  }
}

// =====================================================
// CLEAN DUPLICATES — find and remove duplicate files
// =====================================================

export async function cleanDuplicates(targetFolder) {
  try {
    const entries = await fs.readdir(targetFolder, { withFileTypes: true });
    const files = entries.filter(e => e.isFile());

    const seen = {};
    let deleted = 0;

    for (const file of files) {
      const nameNoExt = path.basename(file.name, path.extname(file.name))
        .replace(/_\d{13}$/, "")   // remove timestamp suffix
        .replace(/\s*\(\d+\)$/, "") // remove (1), (2) suffix
        .toLowerCase()
        .trim();

      const ext = path.extname(file.name).toLowerCase();
      const key = nameNoExt + ext;

      if (seen[key]) {
        await fs.remove(path.join(targetFolder, file.name));
        deleted++;
      } else {
        seen[key] = true;
      }
    }

    return deleted > 0
      ? `Cleaned ${deleted} duplicate files from ${path.basename(targetFolder)} Boss.`
      : `No duplicates found in ${path.basename(targetFolder)} Boss. All files are unique.`;

  } catch (err) {
    return `Duplicate cleaning failed Boss: ${err.message}`;
  }
}

// =====================================================
// FOLDER STATS — what's in a folder
// =====================================================

export async function getFolderStats(targetFolder) {
  try {
    const entries = await fs.readdir(targetFolder, { withFileTypes: true });
    const files = entries.filter(e => e.isFile());
    const folders = entries.filter(e => e.isDirectory());

    const typeCounts = {};
    let totalSize = 0;

    for (const file of files) {
      const ext = path.extname(file.name).replace(".", "").toLowerCase() || "no extension";
      typeCounts[ext] = (typeCounts[ext] || 0) + 1;
      try {
        const stat = await fs.stat(path.join(targetFolder, file.name));
        totalSize += stat.size;
      } catch {}
    }

    const topTypes = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([ext, count]) => `${ext}: ${count}`)
      .join(", ");

    const sizeMB = (totalSize / 1024 / 1024).toFixed(2);

    return `${path.basename(targetFolder)} Stats Boss:\n\nFiles: ${files.length}\nFolders: ${folders.length}\nTotal size: ${sizeMB} MB\nFile types: ${topTypes || "none"}`;

  } catch (err) {
    return `Could not read folder Boss: ${err.message}`;
  }
}

// =====================================================
// DELETE EMPTY FOLDERS
// =====================================================

export async function deleteEmptyFolders(targetFolder) {
  try {
    const entries = await fs.readdir(targetFolder, { withFileTypes: true });
    const subfolders = entries.filter(e => e.isDirectory());
    let deleted = 0;

    for (const subfolder of subfolders) {
      const subPath = path.join(targetFolder, subfolder.name);
      const contents = await fs.readdir(subPath);
      if (contents.length === 0) {
        await fs.remove(subPath);
        deleted++;
      }
    }

    return deleted > 0
      ? `Deleted ${deleted} empty folders in ${path.basename(targetFolder)} Boss.`
      : `No empty folders found Boss.`;

  } catch (err) {
    return `Could not delete empty folders Boss: ${err.message}`;
  }
}

// =====================================================
// SMART COMMAND ROUTER
// =====================================================

export async function handleFileOrganizerCommand(message) {
  const lower = message.toLowerCase();

  // ── Organize / Arrange / Sort ──────────────────────
  if (
    lower.includes("arrange") || lower.includes("organize") ||
    lower.includes("organise") || lower.includes("sort files") ||
    lower.includes("clean up") || lower.includes("cleanup") ||
    lower.includes("tidy") || lower.includes("sort my")
  ) {
    if (lower.includes("undo") || lower.includes("reverse")) {
      const folder = resolveTargetFolder(message);
      return await undoOrganize(folder);
    }
    const folder = resolveTargetFolder(message);
    return await organizeFolder(folder);
  }

  // ── Duplicates ─────────────────────────────────────
  if (lower.includes("duplicate") || lower.includes("remove duplicate") || lower.includes("clean duplicate")) {
    const folder = resolveTargetFolder(message);
    return await cleanDuplicates(folder);
  }

  // ── Folder stats ───────────────────────────────────
  if (
    lower.includes("folder stats") || lower.includes("what is in") ||
    lower.includes("whats in") || lower.includes("how many files") ||
    lower.includes("folder size")
  ) {
    const folder = resolveTargetFolder(message);
    return await getFolderStats(folder);
  }

  // ── Empty folders ──────────────────────────────────
  if (lower.includes("empty folder") || lower.includes("delete empty")) {
    const folder = resolveTargetFolder(message);
    return await deleteEmptyFolders(folder);
  }

  return null;
}