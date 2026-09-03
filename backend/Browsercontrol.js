// =====================================================
// browserControl.js — NAHVI Browser Automation
// Opens Chrome, searches YouTube, clicks play
// 100% PowerShell + Native Windows — zero dependencies
// Part of: Abhinay AI Industries — NAHVI OS
// =====================================================

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// =====================================================
// POWERSHELL RUNNER
// =====================================================

async function ps(script) {
  try {
    const { stdout } = await execAsync(
      `powershell -NoProfile -NonInteractive -Command "${script}"`,
      { timeout: 20000 }
    );
    return { ok: true, out: (stdout || "").trim() };
  } catch (err) {
    return { ok: false, out: err.message };
  }
}

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

// =====================================================
// CLICK AT POSITION (reused from desktopControl)
// =====================================================

async function clickAt(x, y) {
  await ps(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y}); $sig = '[DllImport(\\"user32.dll\\")] public static extern void mouse_event(int f, int x, int y, int d, int e);'; Add-Type -MemberDefinition $sig -Name NM -Namespace W32; [W32.NM]::mouse_event(0x0002, 0, 0, 0, 0); [W32.NM]::mouse_event(0x0004, 0, 0, 0, 0)`);
}

async function typeText(text) {
  const escaped = text.replace(/'/g, "''")
    .replace(/\{/g, "{{}").replace(/\}/g, "{}}")
    .replace(/\+/g, "{+}").replace(/\^/g, "{^}")
    .replace(/\%/g, "{%}");
  await ps(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${escaped}')`);
}

async function pressKey(key) {
  await ps(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${key}')`);
}

// =====================================================
// GET SCREEN SIZE — to calculate click positions
// =====================================================

async function getScreenSize() {
  const r = await ps(`Add-Type -AssemblyName System.Windows.Forms; $s = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds; Write-Output "$($s.Width),$($s.Height)"`);
  if (r.ok && r.out.includes(",")) {
    const [w, h] = r.out.split(",").map(Number);
    return { w, h };
  }
  return { w: 1920, h: 1080 }; // fallback
}

// =====================================================
// FOCUS CHROME WINDOW
// =====================================================

async function focusChrome() {
  await ps(`$w = Get-Process | Where-Object {$_.MainWindowTitle -like '*Chrome*' -or $_.Name -like '*chrome*'} | Select-Object -First 1; if($w){Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class WinFocus { [DllImport(\\"user32.dll\\")] public static extern bool SetForegroundWindow(IntPtr h); }'; [WinFocus]::SetForegroundWindow($w.MainWindowHandle) | Out-Null}`);
  await sleep(500);
}

// =====================================================
// OPEN CHROME WITH URL
// =====================================================

async function openChromeUrl(url) {
  // Try Chrome first, fallback to default browser
  const chromeExe = `"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"`;
  const chromeBeta = `"C:\\Program Files\\Google\\Chrome Beta\\Application\\chrome.exe"`;

  try {
    await execAsync(`${chromeExe} "${url}"`, { timeout: 5000 });
    return true;
  } catch {
    try {
      await execAsync(`${chromeBeta} "${url}"`, { timeout: 5000 });
      return true;
    } catch {
      // Fallback: use Windows default browser
      exec(`start "" "${url}"`);
      return true;
    }
  }
}

// =====================================================
// PLAY SONG ON YOUTUBE
// Full flow: open → wait → focus → click address bar
//            → type search URL → wait → click first result
// =====================================================

export async function playOnYouTube(songName) {
  try {
    const query = encodeURIComponent(songName + " official");
    const searchUrl = `https://www.youtube.com/results?search_query=${query}`;

    // Step 1 — Open YouTube search
    await openChromeUrl(searchUrl);
    await sleep(3500); // wait for page to load

    // Step 2 — Focus Chrome
    await focusChrome();
    await sleep(400);

    // Step 3 — Get screen size for relative click positions
    const { w, h } = await getScreenSize();

    // Step 4 — Click the first video result
    // YouTube first video thumbnail is approximately at:
    // x: ~24% from left (thumbnail center)
    // y: ~42% from top (first result)
    // These are calibrated for standard 1080p/1440p layouts
    const thumbX = Math.round(w * 0.24);
    const thumbY = Math.round(h * 0.42);

    await clickAt(thumbX, thumbY);
    await sleep(2000);

    // Step 5 — Verify by checking active window title
    const titleCheck = await ps(`Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; using System.Text; public class WinTitle { [DllImport(\\"user32.dll\\")] public static extern IntPtr GetForegroundWindow(); [DllImport(\\"user32.dll\\")] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n); }'; $h = [WinTitle]::GetForegroundWindow(); $s = New-Object System.Text.StringBuilder 256; [WinTitle]::GetWindowText($h, $s, 256) | Out-Null; Write-Output $s.ToString()`);

    const windowTitle = titleCheck.out || "";

    if (windowTitle.toLowerCase().includes("youtube") || windowTitle.toLowerCase().includes("chrome")) {
      return `Playing "${songName}" on YouTube Boss. Clicked first result. If wrong song, say "next result" Boss.`;
    }

    return `Opened YouTube and searched for "${songName}" Boss. Click the video to play if it did not auto-click.`;

  } catch (err) {
    return `YouTube automation failed Boss: ${err.message}`;
  }
}

// =====================================================
// CLICK NEXT VIDEO RESULT
// If first click was wrong video
// =====================================================

export async function clickNextResult() {
  try {
    await focusChrome();
    const { w, h } = await getScreenSize();

    // Second result is ~120px below the first
    const thumbX = Math.round(w * 0.24);
    const thumbY = Math.round(h * 0.55);

    await clickAt(thumbX, thumbY);
    return `Clicked next result Boss.`;
  } catch (err) {
    return `Could not click next result Boss: ${err.message}`;
  }
}

// =====================================================
// PAUSE / RESUME VIDEO (Spacebar on YouTube)
// =====================================================

export async function pauseVideo() {
  await focusChrome();
  await sleep(300);
  // Click center of screen first to focus video player
  const { w, h } = await getScreenSize();
  await clickAt(Math.round(w * 0.5), Math.round(h * 0.5));
  await sleep(200);
  await pressKey(" "); // spacebar = pause/resume on YouTube
  return `Video paused Boss.`;
}

export async function resumeVideo() {
  await focusChrome();
  await sleep(300);
  const { w, h } = await getScreenSize();
  await clickAt(Math.round(w * 0.5), Math.round(h * 0.5));
  await sleep(200);
  await pressKey(" ");
  return `Video resumed Boss.`;
}

// =====================================================
// SKIP VIDEO (next track in YouTube)
// =====================================================

export async function skipVideo() {
  await focusChrome();
  await sleep(300);
  // Press Shift+N = next video on YouTube
  await ps(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('+n')`);
  return `Skipped to next video Boss.`;
}

// =====================================================
// SEARCH YOUTUBE (just search, don't click)
// =====================================================

export async function searchYouTube(query) {
  const encoded = encodeURIComponent(query);
  const url = `https://www.youtube.com/results?search_query=${encoded}`;
  await openChromeUrl(url);
  return `Searched YouTube for "${query}" Boss.`;
}

// =====================================================
// PLAY SPOTIFY (open song search)
// =====================================================

export async function playOnSpotify(songName) {
  const query = encodeURIComponent(songName);
  const url = `https://open.spotify.com/search/${query}`;
  await openChromeUrl(url);
  await sleep(3000);
  await focusChrome();

  // Spotify web player — click first track result
  const { w, h } = await getScreenSize();
  await clickAt(Math.round(w * 0.35), Math.round(h * 0.38));

  return `Opened Spotify and searched for "${songName}" Boss. Click play if it did not auto-start.`;
}

// =====================================================
// OPEN ANY URL IN CHROME
// =====================================================

export async function openUrl(url) {
  if (!url.startsWith("http")) url = "https://" + url;
  await openChromeUrl(url);
  return `Opened ${url} Boss.`;
}

// =====================================================
// BROWSER NAVIGATION
// =====================================================

export async function browserBack() {
  await focusChrome();
  await ps(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('%{LEFT}')`);
  return `Went back Boss.`;
}

export async function browserForward() {
  await focusChrome();
  await ps(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('%{RIGHT}')`);
  return `Went forward Boss.`;
}

export async function browserRefresh() {
  await focusChrome();
  await ps(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('{F5}')`);
  return `Page refreshed Boss.`;
}

export async function newTab(url = "") {
  await focusChrome();
  await ps(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^t')`);
  if (url) {
    await sleep(500);
    await typeText(url);
    await pressKey("{ENTER}");
  }
  return url ? `Opened new tab with ${url} Boss.` : `New tab opened Boss.`;
}

export async function closeTab() {
  await focusChrome();
  await ps(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^w')`);
  return `Tab closed Boss.`;
}

export async function searchGoogle(query) {
  const encoded = encodeURIComponent(query);
  await openChromeUrl(`https://www.google.com/search?q=${encoded}`);
  return `Searched Google for "${query}" Boss.`;
}

// =====================================================
// SMART BROWSER COMMAND ROUTER
// =====================================================

export async function handleBrowserCommand(message) {
  const lower = message.toLowerCase();

  // ── YouTube music ──────────────────────────────────
  if (
    (lower.includes("play") && lower.includes("youtube")) ||
    (lower.includes("play") && lower.includes("song")) ||
    (lower.includes("play") && lower.includes("music")) ||
    (lower.includes("play") && lower.includes("video"))
  ) {
    const song = message
      .replace(/play|on youtube|on yt|song|music|video/gi, "")
      .trim();
    if (!song) return "Please tell me what to play Boss. Example: play Believer on YouTube.";
    return await playOnYouTube(song);
  }

  // ── Spotify ────────────────────────────────────────
  if (lower.includes("play") && lower.includes("spotify")) {
    const song = message.replace(/play|on spotify/gi, "").trim();
    return await playOnSpotify(song);
  }

  // ── YouTube search only ────────────────────────────
  if (lower.includes("search youtube") || lower.includes("youtube search")) {
    const query = message.replace(/search youtube|youtube search/gi, "").trim();
    return await searchYouTube(query);
  }

  // ── Google search ──────────────────────────────────
  if (lower.includes("google search") || lower.includes("search google") || lower.includes("search for")) {
    const query = message.replace(/google search|search google|search for/gi, "").trim();
    return await searchGoogle(query);
  }

  // ── Video controls ─────────────────────────────────
  if (lower.includes("pause video") || lower.includes("pause song") || lower.includes("pause music")) {
    return await pauseVideo();
  }
  if (lower.includes("resume video") || lower.includes("resume song") || lower.includes("resume music") || lower.includes("unpause")) {
    return await resumeVideo();
  }
  if (lower.includes("next video") || lower.includes("skip video") || lower.includes("next song") || lower.includes("skip song")) {
    return await skipVideo();
  }
  if (lower.includes("next result")) {
    return await clickNextResult();
  }

  // ── Navigation ─────────────────────────────────────
  if (lower.includes("go back") || lower.includes("browser back")) return await browserBack();
  if (lower.includes("go forward") || lower.includes("browser forward")) return await browserForward();
  if (lower.includes("new tab")) {
    const url = message.match(/new tab\s+(.+)/i)?.[1] || "";
    return await newTab(url);
  }
  if (lower.includes("close tab")) return await closeTab();

  // ── Open URL ───────────────────────────────────────
  if (lower.includes("open website") || lower.includes("go to website") || lower.includes("navigate to")) {
    const url = message.replace(/open website|go to website|navigate to/gi, "").trim();
    return await openUrl(url);
  }

  return null;
}