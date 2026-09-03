// =====================================================
// notesGenerator.js â€” NAHVI Document Intelligence
// Generates: Summaries, Notes, MCQs, Flashcards,
//            Explanations, Revision Sheets
// Part of: Abhinay AI Industries â€” NAHVI OS
// =====================================================

import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { findAndReadDocument, truncateForAI } from "./documentReader.js";
import { RESPONSE_MODES, detectResponseMode } from "./responseMode.js";
import fs from "fs-extra";
import path from "path";
import os from "os";

dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// =====================================================
// AI CALL â€” uses Gemini for document tasks (smarter)
// Falls back to Groq if Gemini fails
// =====================================================

async function callAI(prompt) {
  try {
    const result = await geminiModel.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    console.error("Gemini failed in notesGenerator, using Groq:", err.message);
    try {
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5,
        max_tokens: 2048,
      });
      return completion.choices[0]?.message?.content || "";
    } catch (err2) {
      throw new Error("Both AI engines failed Boss: " + err2.message);
    }
  }
}

// =====================================================
// BASE PROMPT WRAPPER
// =====================================================

function buildDocMetadata(doc) {
  const headings = doc.headings?.length
    ? doc.headings.slice(0, 12).map((heading) => "- " + heading.title).join("\n")
    : "No clear headings detected.";

  const importantSections = doc.importantSections?.length
    ? doc.importantSections.slice(0, 8).map((section) => `${section.heading}: ${section.preview}`).join("\n")
    : "No reliable important sections detected.";

  const warnings = doc.extractionQuality?.warnings?.length
    ? doc.extractionQuality.warnings.map((warning) => "- " + warning).join("\n")
    : "None.";

  return `
DOCUMENT METADATA:
File: ${doc.fileName}
Type: ${doc.documentType}
Title: ${doc.title}
Words: ${doc.wordCount}
Estimated reading time: ${doc.readingTime?.label || "Unknown"}
Extraction confidence: ${doc.extractionQuality?.level || "unknown"} (${doc.extractionQuality?.score ?? 0}/100)
Extraction warnings:
${warnings}

Detected headings:
${headings}

Important sections:
${importantSections}
`;
}

function getQualityNotice(doc) {
  if (doc.extractionQuality?.level !== "low") return "";
  const warnings = doc.extractionQuality.warnings?.join(" ") || "Extraction quality is low.";
  return `Extraction confidence is low Boss. ${warnings}\n\n`;
}

function getDocumentModeInstructions(mode) {
  if (mode === RESPONSE_MODES.DETAILED) {
    return `
Detailed Mode:
Give a full explanation section by section.
Preserve context from the document.
Use detected headings when available.
If extraction quality is low, say what is uncertain instead of guessing.
`;
  }

  if (mode === RESPONSE_MODES.NOTES) {
    return `
Notes Mode:
Create structured notes.
Use headings, numbered points, key facts, and important terms.
Remove unnecessary information and repetition.
If extraction quality is low, say what is uncertain instead of guessing.
`;
  }

  if (mode === RESPONSE_MODES.SUMMARY) {
    return `
Summary Mode:
Return this structure:
Document Title
Key Points: 3 to 7 concise points
Short Summary: 2 to 4 sentences
Action Items: only include relevant actions, otherwise say None found
If extraction quality is low, say what is uncertain instead of guessing.
`;
  }

  return `
Quick Mode:
Return maximum 5 key points.
Keep it short and useful.
If extraction quality is low, say what is uncertain instead of guessing.
`;
}

function buildPrompt(task, doc, extra = "", mode = RESPONSE_MODES.SUMMARY) {
  const docText = truncateForAI(doc.text);
  return `
You are NAHVI, an AI assistant by Abhinay AI Industries.
Always address the user as "Boss".
Do NOT use markdown symbols like *, **, _, #, or backticks.
Write in clean plain text only.
Be clear, accurate, and professional.
Do not invent content that is not supported by the document.
If extraction confidence is low, clearly say that confidence is low before giving limited findings.

${extra}
${getDocumentModeInstructions(mode)}
${buildDocMetadata(doc)}

DOCUMENT CONTENT:
${docText}

TASK: ${task}
`;
}

// =====================================================
// 1. SUMMARIZE
// =====================================================

export async function summarizeDocument(query, mode = RESPONSE_MODES.SUMMARY) {
  const doc = await findAndReadDocument(query);
  if (!doc.success) return doc.error;

  const prompt = buildPrompt(
    `Summarize this document using the selected response mode.
     End with: "Summary complete Boss."`,
    doc,
    "",
    mode
  );

  const result = await callAI(prompt);
  return `${getQualityNotice(doc)}Document: ${doc.fileName}\nType: ${doc.documentType}\nTitle: ${doc.title}\nWords: ${doc.wordCount}\nReading time: ${doc.readingTime.label}\nConfidence: ${doc.extractionQuality.level} (${doc.extractionQuality.score}/100)\n\n${result}`;
}

// =====================================================
// 2. GENERATE REVISION NOTES
// =====================================================

export async function generateNotes(query, mode = RESPONSE_MODES.NOTES) {
  const doc = await findAndReadDocument(query);
  if (!doc.success) return doc.error;

  const prompt = buildPrompt(
    `Generate well-structured notes from this document using the selected response mode.
     Include headings, numbered points, key facts, and important terms.
     End with: "Revision notes ready Boss."`,
    doc,
    "You are generating study notes for a student.",
    mode
  );

  const result = await callAI(prompt);
  return `${getQualityNotice(doc)}Revision Notes: ${doc.fileName}\nTitle: ${doc.title}\nConfidence: ${doc.extractionQuality.level} (${doc.extractionQuality.score}/100)\n\n${result}`;
}

// =====================================================
// 3. GENERATE MCQs
// =====================================================

export async function generateMCQs(query, count = 10) {
  const doc = await findAndReadDocument(query);
  if (!doc.success) return doc.error;

  const prompt = buildPrompt(
    `Generate ${count} multiple choice questions from this document.
     Format each question EXACTLY like this:

     Q1. [Question text]
     A) [Option]
     B) [Option]
     C) [Option]
     D) [Option]
     Answer: [Correct letter]

     Questions should test understanding, not just memory.
     Cover different topics from the document.
     End with: "${count} MCQs generated Boss."`,
    doc,
    "You are a teacher creating an exam question paper.",
    RESPONSE_MODES.DETAILED
  );

  const result = await callAI(prompt);
  return `MCQ Test: ${doc.fileName}\n\n${result}`;
}

// =====================================================
// 4. GENERATE FLASHCARDS
// =====================================================

export async function generateFlashcards(query, count = 15) {
  const doc = await findAndReadDocument(query);
  if (!doc.success) return doc.error;

  const prompt = buildPrompt(
    `Generate ${count} flashcards from this document.
     Format each flashcard EXACTLY like this:

     CARD ${1}
     FRONT: [Question or term]
     BACK: [Answer or definition]

     Make flashcards that help with quick memorization.
     Cover key terms, definitions, dates, formulas, and concepts.
     End with: "${count} flashcards ready Boss."`,
    doc,
    "You are creating study flashcards for a student.",
    RESPONSE_MODES.NOTES
  );

  const result = await callAI(prompt);
  return `Flashcards: ${doc.fileName}\n\n${result}`;
}

// =====================================================
// 5. EXPLAIN DOCUMENT / TOPIC
// =====================================================

export async function explainDocument(query, topic = "", mode = RESPONSE_MODES.DETAILED) {
  const doc = await findAndReadDocument(query);
  if (!doc.success) return doc.error;

  const focusPart = topic ? `Focus specifically on the topic: "${topic}"` : "Explain the entire document";

  const prompt = buildPrompt(
    `${focusPart}.
     Explain section by section and preserve context.
     End with: "Explanation complete Boss."`,
    doc,
    "You are a teacher explaining a concept to a student.",
    mode
  );

  const result = await callAI(prompt);
  return `${getQualityNotice(doc)}Explanation: ${doc.fileName}\nTitle: ${doc.title}\nConfidence: ${doc.extractionQuality.level} (${doc.extractionQuality.score}/100)\n\n${result}`;
}

// =====================================================
// 6. SIMPLIFY DOCUMENT
// =====================================================

export async function simplifyDocument(query) {
  const doc = await findAndReadDocument(query);
  if (!doc.success) return doc.error;

  const prompt = buildPrompt(
    `Rewrite this document in very simple, plain English.
     Remove all jargon. Use short sentences.
     Make it readable by anyone, even someone with no background in the subject.
     Keep all important information but make it much easier to understand.
     End with: "Simplified version ready Boss."`,
    doc,
    "You are simplifying a complex document for a general reader.",
    RESPONSE_MODES.SUMMARY
  );

  const result = await callAI(prompt);
  return `Simplified: ${doc.fileName}\n\n${result}`;
}

// =====================================================
// 7. KEY TERMS & DEFINITIONS
// =====================================================

export async function extractKeyTerms(query) {
  const doc = await findAndReadDocument(query);
  if (!doc.success) return doc.error;

  const prompt = buildPrompt(
    `Extract all important key terms, concepts, and definitions from this document.
     Format as:

     TERM: [term name]
     DEFINITION: [clear definition]

     List at least 15 key terms if available.
     End with: "Key terms extracted Boss."`,
    doc,
    "You are creating a glossary from a document.",
    RESPONSE_MODES.NOTES
  );

  const result = await callAI(prompt);
  return `Key Terms: ${doc.fileName}\n\n${result}`;
}

// =====================================================
// 8. CHAPTER / SECTION EXPLANATION
// =====================================================

export async function explainChapter(query, chapterRef) {
  const doc = await findAndReadDocument(query);
  if (!doc.success) return doc.error;

  const prompt = buildPrompt(
    `Find and explain "${chapterRef}" from this document.
     Give a thorough explanation of what that chapter or section covers.
     Include key points, concepts, and important details.
     If the specific chapter is not found, explain the most relevant matching section.
     End with: "Chapter explanation complete Boss."`,
    doc,
    `You are explaining a specific chapter to a student.`,
    RESPONSE_MODES.DETAILED
  );

  const result = await callAI(prompt);
  return `Chapter Explanation: ${doc.fileName}\n\n${result}`;
}

// =====================================================
// 9. MEETING NOTES GENERATOR
// =====================================================

export async function generateMeetingNotes(query) {
  const doc = await findAndReadDocument(query);
  if (!doc.success) return doc.error;

  const prompt = buildPrompt(
    `Generate professional meeting notes from this document.
     Structure as:

     MEETING SUMMARY
     Key Discussion Points:
     1. [point]
     2. [point]

     Decisions Made:
     1. [decision]

     Action Items:
     1. [action item] - [responsible party if mentioned]

     Next Steps:
     [next steps]

     End with: "Meeting notes ready Boss."`,
    doc,
    "You are a professional assistant generating meeting notes.",
    RESPONSE_MODES.NOTES
  );

  const result = await callAI(prompt);
  return `Meeting Notes: ${doc.fileName}\n\n${result}`;
}

// =====================================================
// 10. REPORT ANALYSIS (for Business Owners)
// =====================================================

export async function analyzeReport(query) {
  const doc = await findAndReadDocument(query);
  if (!doc.success) return doc.error;

  const prompt = buildPrompt(
    `Analyze this business report or document professionally.
     Provide:

     EXECUTIVE SUMMARY
     [2-3 sentence overview]

     KEY FINDINGS
     1. [finding]
     2. [finding]

     STRENGTHS
     [identified strengths]

     CONCERNS OR RISKS
     [identified issues]

     RECOMMENDATIONS
     1. [recommendation]
     2. [recommendation]

     End with: "Report analysis complete Boss."`,
    doc,
    "You are a senior business analyst reviewing a report.",
    RESPONSE_MODES.DETAILED
  );

  const result = await callAI(prompt);
  return `Report Analysis: ${doc.fileName}\n\n${result}`;
}

// =====================================================
// SMART INTENT ROUTER
// Detects what the user wants based on their command
// =====================================================

export async function handleDocumentCommand(message, mode = detectResponseMode(message, "documentai")) {
  const lower = message.toLowerCase();

  // Extract document name from message
  // Supports: "summarize economics.pdf" or "summarize my economics notes"
  const docQuery = message
    .replace(/summarize|summary|explain|generate mcq|mcq|flashcard|simplify|key terms|meeting notes|analyze report|revision notes|notes|chapter/gi, "")
    .replace(/\b(my|the|this|a|an|from|of)\b/gi, "")
    .trim();

  // Detect chapter references like "explain chapter 5" or "chapter 3 of"
  const chapterMatch = message.match(/chapter\s+(\d+|[ivxlcdm]+|\w+)/i);

  // â”€â”€ Route to correct function â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  if (lower.includes("summarize") || lower.includes("summary")) {
    return await summarizeDocument(docQuery, mode);
  }

  if (lower.includes("revision notes") || lower.includes("revision")) {
    return await generateNotes(docQuery, RESPONSE_MODES.NOTES);
  }

  if (lower.includes("mcq") || lower.includes("multiple choice") || lower.includes("quiz")) {
    const countMatch = message.match(/(\d+)\s*(mcq|question)/i);
    const count = countMatch ? parseInt(countMatch[1]) : 10;
    return await generateMCQs(docQuery, count);
  }

  if (lower.includes("flashcard")) {
    const countMatch = message.match(/(\d+)\s*flashcard/i);
    const count = countMatch ? parseInt(countMatch[1]) : 15;
    return await generateFlashcards(docQuery, count);
  }

  if (lower.includes("simplify") || lower.includes("simple version")) {
    return await simplifyDocument(docQuery);
  }

  if (lower.includes("key terms") || lower.includes("key words") || lower.includes("definitions") || lower.includes("glossary")) {
    return await extractKeyTerms(docQuery);
  }

  if (lower.includes("meeting notes") || lower.includes("meeting summary")) {
    return await generateMeetingNotes(docQuery);
  }

  if (lower.includes("analyze report") || lower.includes("analyse report") || lower.includes("report analysis")) {
    return await analyzeReport(docQuery);
  }

  if (chapterMatch) {
    const chapterRef = chapterMatch[0];
    return await explainChapter(docQuery.replace(chapterRef, "").trim(), chapterRef);
  }

  if (lower.includes("explain") || lower.includes("notes")) {
    if (lower.includes("notes")) return await generateNotes(docQuery, RESPONSE_MODES.NOTES);
    return await explainDocument(docQuery, "", mode);
  }

  return null; // not a document command â€” pass to AI chat
}

// =====================================================
// SAVE RESULT TO FILE
// =====================================================

export async function saveResultToFile(content, fileName, saveFolder) {
  try {
    let targetFolder;
    if (saveFolder) {
      const desktopPath = path.join(os.homedir(), "Desktop", saveFolder);
      const docsPath = path.join(os.homedir(), "Documents", saveFolder);
      if (await fs.pathExists(desktopPath)) {
        targetFolder = desktopPath;
      } else if (await fs.pathExists(docsPath)) {
        targetFolder = docsPath;
      } else {
        targetFolder = desktopPath;
        await fs.ensureDir(targetFolder);
      }
    } else {
      targetFolder = path.join(os.homedir(), "Desktop", "NAHVI-Summaries");
      await fs.ensureDir(targetFolder);
    }

    const cleanName = fileName.replace(/[<>:"/\\|?*]/g, "-").replace(/\s+/g, "_").trim();
    const timestamp = new Date().toISOString().slice(0, 10);
    const filePath = path.join(targetFolder, cleanName + "_" + timestamp + ".txt");

    await fs.writeFile(filePath, content, "utf-8");
    return { success: true, path: filePath, message: "Saved to " + filePath + " Boss." };
  } catch (err) {
    return { success: false, message: "Save failed Boss: " + err.message };
  }
}

export async function handleSaveAndGenerate(message) {
  const lower = message.toLowerCase();

  const wantsSave = lower.includes("save") || lower.includes("store it") || lower.includes("export");
  if (!wantsSave) return null;

  // Extract folder name
  let saveFolder = null;
  const fm = message.match(/save\s+(?:it\s+)?(?:to|in|into|on)\s+([a-zA-Z0-9 _-]+?)(?:\s+folder)?$/i)
    || message.match(/store\s+(?:it\s+)?(?:to|in|into)\s+([a-zA-Z0-9 _-]+?)(?:\s+folder)?$/i);
  if (fm) {
    saveFolder = fm[1].replace(/folder/gi, "").trim();
  }

  // Extract document name
  let docQuery = message
    .replace(/(?:and\s+)?(?:save|store|export)\s+(?:it\s+)?(?:to|in|into|on)\s+[a-zA-Z0-9 _-]+(?:\s+folder)?/gi, "")
    .replace(/(create|make|generate|write|build|give me|get|produce)/gi, "")
    .replace(/(summary|summarize|summarise|revision notes|notes|mcq|flashcard|simplify)/gi, "")
    .replace(/\bmy\b|\bthe\b|\bthis\b|\ba\b|\ban\b|\bfrom\b|\bof\b|\bfor\b|\bon\b|\bfile\b|\bdocument\b|\bdoc\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (!docQuery) return null;

  // Detect task
  let result = "";
  let taskLabel = "summary";

  if (lower.includes("mcq") || lower.includes("multiple choice") || lower.includes("quiz")) {
    const cm = message.match(/(\d+)\s*(mcq|question)/i);
    const count = cm ? parseInt(cm[1]) : 10;
    result = await generateMCQs(docQuery, count);
    taskLabel = "mcqs";
  } else if (lower.includes("flashcard")) {
    result = await generateFlashcards(docQuery);
    taskLabel = "flashcards";
  } else if (lower.includes("revision notes") || lower.includes("revision")) {
    result = await generateNotes(docQuery);
    taskLabel = "notes";
  } else {
    result = await summarizeDocument(docQuery);
    taskLabel = "summary";
  }

  // Clean filename
  const cleanDocName = docQuery
    .split(/\s+/).slice(0, 4).join("_")
    .replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase();

  const fileLabel = taskLabel + "_" + (cleanDocName || "document");
  const saveResult = await saveResultToFile(result, fileLabel, saveFolder);

  if (saveResult.success) {
    return result + "\n\nSaved to: " + saveResult.path + " Boss.";
  } else {
    return result + "\n\n" + saveResult.message;
  }
}
