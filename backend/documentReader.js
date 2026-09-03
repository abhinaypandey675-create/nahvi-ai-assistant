// =====================================================
// documentReader.js — NAHVI Document Intelligence
// Reads PDF, DOCX, TXT files and returns clean text
// Part of: Abhinay AI Industries — NAHVI OS
// =====================================================

import fs from "fs-extra";
import path from "path";
import os from "os";

// ── PDF parsing ──────────────────────────────────────
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

// ── DOCX parsing ─────────────────────────────────────
import mammoth from "mammoth";

// =====================================================
// COMMON SEARCH ROOTS — where NAHVI looks for files
// =====================================================

const SEARCH_ROOTS = [
  path.join(os.homedir(), "Desktop"),
  path.join(os.homedir(), "Documents"),
  path.join(os.homedir(), "Downloads"),
  path.join(os.homedir(), "OneDrive", "Documents"),
  path.join(os.homedir(), "OneDrive", "Desktop"),
  path.resolve("./-files"),            // NAHVI internal file storage
];

const DOCUMENT_TYPES = {
  ".pdf": "PDF document",
  ".doc": "Word document",
  ".docx": "Word document",
  ".txt": "Text document",
  ".md": "Markdown document",
};

// =====================================================
// FIND FILE BY NAME (fuzzy, case-insensitive)
// =====================================================

async function findFileByName(query) {
  const lowerQuery = query.toLowerCase().trim();

  for (const root of SEARCH_ROOTS) {
    if (!(await fs.pathExists(root))) continue;

    try {
      const entries = await fs.readdir(root, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        const nameLower = entry.name.toLowerCase();

        // Match: full name, partial name, name without extension
        const nameNoExt = nameLower.replace(/\.[^/.]+$/, "");
        if (
          nameLower.includes(lowerQuery) ||
          nameNoExt.includes(lowerQuery) ||
          lowerQuery.includes(nameNoExt)
        ) {
          return path.join(root, entry.name);
        }
      }
    } catch {
      // skip inaccessible directories
    }
  }

  return null;
}

// =====================================================
// READ PDF
// =====================================================

async function readPDF(filePath) {
  const buffer = await fs.readFile(filePath);
  const data = await pdfParse(buffer);
  return data.text || "";
}

// =====================================================
// READ DOCX
// =====================================================

async function readDOCX(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value || "";
}

// =====================================================
// READ TXT / MD
// =====================================================

async function readTXT(filePath) {
  return await fs.readFile(filePath, "utf-8");
}

function cleanLine(line) {
  return line.replace(/\s+/g, " ").trim();
}

function looksLikeHeading(line) {
  const clean = cleanLine(line);
  if (!clean || clean.length < 3 || clean.length > 120) return false;
  if (/^[\d.]+\s+[A-Z]/.test(clean)) return true;
  if (/^(chapter|section|unit|part|module|topic|lesson)\s+[\w\d]+/i.test(clean)) return true;
  if (/^#{1,6}\s+\S/.test(clean)) return true;
  if (clean === clean.toUpperCase() && /[A-Z]/.test(clean) && clean.split(/\s+/).length <= 12) return true;
  return false;
}

function extractTitle(text, filePath, headings) {
  const fileTitle = path.basename(filePath, path.extname(filePath)).replace(/[_-]+/g, " ").trim();
  const lines = text.split("\n").map(cleanLine).filter(Boolean);
  const firstUsefulLine = lines.find((line) => line.length >= 4 && line.length <= 140);
  const headingTitle = headings[0]?.title;

  if (headingTitle && headingTitle.length >= 4) return headingTitle.replace(/^#{1,6}\s+/, "");
  if (firstUsefulLine) return firstUsefulLine.replace(/^#{1,6}\s+/, "");
  return fileTitle || "Untitled document";
}

function extractHeadings(text) {
  const lines = text.split("\n");
  const headings = [];

  for (let i = 0; i < lines.length; i++) {
    const line = cleanLine(lines[i]);
    if (!looksLikeHeading(line)) continue;

    const normalized = line.replace(/^#{1,6}\s+/, "");
    if (headings.some((h) => h.title.toLowerCase() === normalized.toLowerCase())) continue;
    headings.push({ title: normalized, line: i + 1 });
    if (headings.length >= 20) break;
  }

  return headings;
}

function splitSentences(text) {
  return text
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map(cleanLine)
    .filter((sentence) => sentence.length >= 40 && sentence.length <= 260);
}

function scoreSentence(sentence) {
  const lower = sentence.toLowerCase();
  let score = 0;
  const keywords = [
    "important", "key", "objective", "conclusion", "summary", "result",
    "recommendation", "action", "deadline", "risk", "issue", "decision",
    "finding", "impact", "benefit", "requirement", "must", "should",
  ];

  for (const keyword of keywords) {
    if (lower.includes(keyword)) score += 2;
  }
  if (/\d/.test(sentence)) score += 1;
  if (sentence.length >= 70 && sentence.length <= 180) score += 1;
  return score;
}

function extractImportantSections(text, headings) {
  const sections = [];
  const lines = text.split("\n");

  if (headings.length) {
    for (let i = 0; i < Math.min(headings.length, 8); i++) {
      const start = headings[i].line - 1;
      const end = headings[i + 1] ? headings[i + 1].line - 1 : Math.min(lines.length, start + 18);
      const body = lines.slice(start + 1, end).map(cleanLine).filter(Boolean).join(" ");
      if (body.length >= 80) {
        sections.push({
          heading: headings[i].title,
          preview: body.slice(0, 450),
        });
      }
    }
  }

  if (sections.length >= 3) return sections;

  const ranked = splitSentences(text)
    .map((sentence) => ({ sentence, score: scoreSentence(sentence) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .filter((item) => item.score > 0);

  return ranked.map((item, index) => ({
    heading: `Important point ${index + 1}`,
    preview: item.sentence,
  }));
}

function getReadingTime(wordCount) {
  const minutes = Math.max(1, Math.ceil(wordCount / 220));
  return {
    minutes,
    label: minutes === 1 ? "1 minute" : `${minutes} minutes`,
  };
}

function getExtractionQuality({ text, wordCount, headings, importantSections, title }) {
  let score = 0;
  const warnings = [];

  if (wordCount >= 100) score += 25;
  else warnings.push("Document has limited readable text.");

  if (title && title !== "Untitled document") score += 20;
  else warnings.push("Title could not be confidently extracted.");

  if (headings.length >= 2) score += 25;
  else if (headings.length === 1) score += 12;
  else warnings.push("No clear headings were detected.");

  if (importantSections.length >= 3) score += 20;
  else if (importantSections.length > 0) score += 10;
  else warnings.push("Important sections could not be confidently extracted.");

  const textDensity = text.replace(/\s/g, "").length / Math.max(text.length, 1);
  if (textDensity > 0.55) score += 10;
  else warnings.push("Extracted text appears sparse or noisy.");

  const boundedScore = Math.max(0, Math.min(100, score));
  const level = boundedScore >= 75 ? "high" : boundedScore >= 50 ? "medium" : "low";

  return {
    score: boundedScore,
    level,
    warnings,
  };
}

function analyzeDocument(text, filePath, ext) {
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const headings = extractHeadings(text);
  const title = extractTitle(text, filePath, headings);
  const importantSections = extractImportantSections(text, headings);
  const readingTime = getReadingTime(wordCount);
  const extractionQuality = getExtractionQuality({ text, wordCount, headings, importantSections, title });

  return {
    documentType: DOCUMENT_TYPES[ext] || "Document",
    title,
    headings,
    importantSections,
    readingTime,
    extractionQuality,
  };
}

// =====================================================
// MASTER READER — auto-detects file type
// =====================================================

export async function readDocument(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  try {
    let text = "";

    if (ext === ".pdf")                       text = await readPDF(filePath);
    else if (ext === ".docx" || ext === ".doc") text = await readDOCX(filePath);
    else if (ext === ".txt" || ext === ".md")   text = await readTXT(filePath);
    else {
      return {
        success: false,
        error: `Unsupported file type: ${ext}. Supported types: PDF, DOCX, TXT, MD Boss.`,
      };
    }

    // Clean up extracted text
    text = text
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim();

    if (!text || text.length < 20) {
      return {
        success: false,
        error: "Could not extract readable text from the file Boss. It may be scanned or image-based.",
      };
    }

    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const analysis = analyzeDocument(text, filePath, ext);

    return {
      success: true,
      text,
      fileName: path.basename(filePath),
      filePath,
      ext,
      charCount: text.length,
      wordCount,
      ...analysis,
    };
  } catch (err) {
    return {
      success: false,
      error: `Failed to read file Boss: ${err.message}`,
    };
  }
}

// =====================================================
// FIND + READ — find file by name then read it
// =====================================================

export async function findAndReadDocument(query) {
  // 1. Check if it's a direct file path
  if (await fs.pathExists(query)) {
    return await readDocument(query);
  }

  // 2. Search by name
  const filePath = await findFileByName(query);
  if (!filePath) {
    return {
      success: false,
      error: `No file found matching "${query}" Boss. Try: summarize <exact filename>`,
    };
  }

  return await readDocument(filePath);
}

// =====================================================
// CHUNK TEXT — split large docs for AI processing
// Max ~3000 words per chunk to stay within token limits
// =====================================================

export function chunkText(text, maxWords = 3000) {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return [text];

  const chunks = [];
  for (let i = 0; i < words.length; i += maxWords) {
    chunks.push(words.slice(i, i + maxWords).join(" "));
  }
  return chunks;
}

// =====================================================
// TRUNCATE — safe text for AI prompt (max ~4000 words)
// =====================================================

export function truncateForAI(text, maxWords = 4000) {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(" ") + "\n\n[Document truncated for processing]";
}
