// =====================================================
// desktopControl.js — NAHVI Full PC Control System
// 100% PowerShell — Zero native dependencies
// Voice + Text command support
// Part of: Abhinay AI Industries — NAHVI OS
// =====================================================

import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs-extra";
import os from "os";

const execAsync = promisify(exec);

// =====================================================
// CORE POWERSHELL RUNNER
// =====================================================

async function ps(script) {
  try {
    const { stdout } = await execAsync(
      `powershell -NoProfile -NonInteractive -Command "${script}"`,
      { timeout: 15000 }
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
// MOUSE CONTROL
// =====================================================

export async function moveMouse(x, y) {
  const r = await ps(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y})`);
  return r.ok ? `Mouse moved to ${x}, ${y} Boss.` : `Mouse move failed Boss: ${r.out}`;
}

export async function clickMouse(x = null, y = null, button = "left") {
  let script = `Add-Type -AssemblyName System.Windows.Forms; `;
  if (x !== null && y !== null) {
    script += `[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y}); Start-Sleep -Milliseconds 100; `;
  }
  const downFlag = button === "right" ? "0x0008" : "0x0002";
  const upFlag   = button === "right" ? "0x0010" : "0x0004";
  script += `$s='[DllImport("user32.dll")] public static extern void mouse_event(int f,int x,int y,int d,int e);'; Add-Type -MemberDefinition $s -Name NM -Namespace W32 -ErrorAction SilentlyContinue; [W32.NM]::mouse_event(${downFlag},0,0,0,0); [W32.NM]::mouse_event(${upFlag},0,0,0,0)`;
  const r = await ps(script);
  return r.ok ? `Clicked${x !== null ? ` at ${x},${y}` : ""} Boss.` : `Click failed Boss: ${r.out}`;
}

export async function doubleClick(x = null, y = null) {
  await clickMouse(x, y);
  await sleep(120);
  await clickMouse(x, y);
  return `Double clicked Boss.`;
}

export async function rightClick(x = null, y = null) {
  return await clickMouse(x, y, "right");
}

export async function scrollMouse(direction = "down", amount = 3) {
  const delta = direction === "up" ? 120 * amount : -120 * amount;
  const r = await ps(`$s='[DllImport("user32.dll")] public static extern void mouse_event(int f,int x,int y,int d,int e);'; Add-Type -MemberDefinition $s -Name NM2 -Namespace W32B -ErrorAction SilentlyContinue; [W32B.NM2]::mouse_event(0x0800,0,0,${delta},0)`);
  return r.ok ? `Scrolled ${direction} Boss.` : `Scroll failed Boss: ${r.out}`;
}

export async function getMousePosition() {
  const r = await ps(`Add-Type -AssemblyName System.Windows.Forms; $p=[System.Windows.Forms.Cursor]::Position; Write-Output "$($p.X),$($p.Y)"`);
  if (r.ok && r.out.includes(",")) {
    const [x, y] = r.out.split(",");
    return `Mouse is at X: ${x}, Y: ${y} Boss.`;
  }
  return `Could not get mouse position Boss.`;
}

// =====================================================
// KEYBOARD CONTROL
// =====================================================

export async function typeText(text) {
  const escaped = text
    .replace(/\{/g, "{{}").replace(/\}/g, "{}}")
    .replace(/\[/g, "{[}").replace(/\]/g, "{]}")
    .replace(/\+/g, "{+}").replace(/\^/g, "{^}")
    .replace(/\%/g, "{%}").replace(/\~/g, "{~}")
    .replace(/'/g, "''");
  const r = await ps(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${escaped}')`);
  return r.ok ? `Typed: "${text}" Boss.` : `Type failed Boss: ${r.out}`;
}

export async function pressKey(keyName) {
  const keyMap = {
    "enter": "{ENTER}", "escape": "{ESC}", "esc": "{ESC}",
    "space": " ", "tab": "{TAB}", "backspace": "{BACKSPACE}",
    "delete": "{DELETE}", "up": "{UP}", "down": "{DOWN}",
    "left": "{LEFT}", "right": "{RIGHT}", "home": "{HOME}",
    "end": "{END}", "pageup": "{PGUP}", "pagedown": "{PGDN}",
    "f1":"{F1}","f2":"{F2}","f3":"{F3}","f4":"{F4}","f5":"{F5}",
    "f6":"{F6}","f7":"{F7}","f8":"{F8}","f9":"{F9}","f10":"{F10}",
    "f11":"{F11}","f12":"{F12}","insert":"{INSERT}","capslock":"{CAPSLOCK}",
  };
  const k = keyMap[keyName.toLowerCase()];
  if (!k) return `Unknown key "${keyName}" Boss.`;
  const r = await ps(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${k}')`);
  return r.ok ? `Pressed ${keyName} Boss.` : `Key press failed Boss: ${r.out}`;
}

export async function pressShortcut(shortcut) {
  const map = {
    "ctrl+c":"^c","ctrl+v":"^v","ctrl+x":"^x","ctrl+z":"^z",
    "ctrl+y":"^y","ctrl+a":"^a","ctrl+s":"^s","ctrl+n":"^n",
    "ctrl+w":"^w","ctrl+t":"^t","ctrl+f":"^f","ctrl+p":"^p",
    "ctrl+r":"^r","ctrl+l":"^l","ctrl+d":"^d",
    "ctrl+home":"^{HOME}","ctrl+end":"^{END}",
    "alt+f4":"%{F4}","alt+tab":"%{TAB}",
  };
  const lower = shortcut.toLowerCase().replace(/\s/g,"");
  if (lower === "win+d") { exec(`explorer shell:::{3080F90D-D7AD-11D9-BD98-0000947B0257}`); return `Showing desktop Boss.`; }
  if (lower === "win+e") { exec(`explorer`); return `Opening File Explorer Boss.`; }
  if (lower === "win+l") { exec(`rundll32.exe user32.dll,LockWorkStation`); return `PC locked Boss.`; }
  if (lower === "win+r") { exec(`start ms-settings:`); return `Opening settings Boss.`; }
  if (lower === "ctrl+shift+esc") { exec(`taskmgr`); return `Opening Task Manager Boss.`; }
  const keys = map[lower];
  if (!keys) return `Unknown shortcut "${shortcut}" Boss.`;
  const r = await ps(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${keys}')`);
  return r.ok ? `Shortcut ${shortcut} executed Boss.` : `Shortcut failed Boss: ${r.out}`;
}

// =====================================================
// SCREENSHOT
// =====================================================

const SCREENSHOT_DIR = path.join(os.homedir(), "Desktop", "NAHVI-Screenshots");

export async function takeScreenshot(label = "") {
  try {
    await fs.ensureDir(SCREENSHOT_DIR);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `nahvi-${label ? label.replace(/\s+/g,"-") + "-" : ""}${timestamp}.png`;
    const filePath = path.join(SCREENSHOT_DIR, filename).replace(/\\/g, "\\\\");
    const script = `Add-Type -AssemblyName System.Windows.Forms,System.Drawing; $s=[System.Windows.Forms.Screen]::PrimaryScreen.Bounds; $b=New-Object System.Drawing.Bitmap($s.Width,$s.Height); $g=[System.Drawing.Graphics]::FromImage($b); $g.CopyFromScreen($s.Location,[System.Drawing.Point]::Empty,$s.Size); $b.Save('${filePath}'); $g.Dispose(); $b.Dispose(); Write-Output 'done'`;
    const r = await ps(script);
    return r.ok ? `Screenshot saved to Desktop/NAHVI-Screenshots/${filename} Boss.` : `Screenshot failed Boss: ${r.out}`;
  } catch (err) {
    return `Screenshot error Boss: ${err.message}`;
  }
}

export async function getScreenSize() {
  const r = await ps(`Add-Type -AssemblyName System.Windows.Forms; $s=[System.Windows.Forms.Screen]::PrimaryScreen.Bounds; Write-Output "$($s.Width)x$($s.Height)"`);
  return r.ok ? `Screen resolution: ${r.out} pixels Boss.` : `Could not get screen size Boss.`;
}

// =====================================================
// WINDOW MANAGEMENT
// =====================================================

export async function getActiveWindow() {
  const r = await ps(`Add-Type -TypeDefinition 'using System;using System.Runtime.InteropServices;using System.Text;public class WA{[DllImport("user32.dll")]public static extern IntPtr GetForegroundWindow();[DllImport("user32.dll")]public static extern int GetWindowText(IntPtr h,StringBuilder s,int n);}'; $h=[WA]::GetForegroundWindow(); $s=New-Object System.Text.StringBuilder 256; [WA]::GetWindowText($h,$s,256)|Out-Null; Write-Output $s.ToString()`);
  return r.ok && r.out ? `Active window: "${r.out}" Boss.` : `Could not detect active window Boss.`;
}

export async function minimizeWindow() {
  const r = await ps(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('% n')`);
  return r.ok ? `Window minimized Boss.` : `Minimize failed Boss.`;
}

export async function maximizeWindow() {
  const r = await ps(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('% x')`);
  return r.ok ? `Window maximized Boss.` : `Maximize failed Boss.`;
}

export async function closeWindow() {
  const r = await ps(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('%{F4}')`);
  return r.ok ? `Window closed Boss.` : `Close failed Boss.`;
}

export async function showDesktop() {
  exec(`explorer shell:::{3080F90D-D7AD-11D9-BD98-0000947B0257}`);
  return `Showing desktop Boss.`;
}

export async function switchWindow() {
  const r = await ps(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('%{TAB}')`);
  return r.ok ? `Switched window Boss.` : `Switch failed Boss.`;
}

export async function getAllWindows() {
  const r = await ps(`Get-Process | Where-Object {$_.MainWindowTitle -ne ''} | Select-Object Name,MainWindowTitle | Format-Table -AutoSize | Out-String`);
  return r.ok ? `Open windows Boss:\n\n${r.out}` : `Could not list windows Boss.`;
}

// =====================================================
// VOLUME CONTROL
// =====================================================

export async function volumeUp(steps = 5) {
  let s = `Add-Type -AssemblyName System.Windows.Forms; `;
  for (let i = 0; i < steps; i++) s += `[System.Windows.Forms.SendKeys]::SendWait([char]175); `;
  const r = await ps(s);
  return r.ok ? `Volume increased Boss.` : `Volume up failed Boss.`;
}

export async function volumeDown(steps = 5) {
  let s = `Add-Type -AssemblyName System.Windows.Forms; `;
  for (let i = 0; i < steps; i++) s += `[System.Windows.Forms.SendKeys]::SendWait([char]174); `;
  const r = await ps(s);
  return r.ok ? `Volume decreased Boss.` : `Volume down failed Boss.`;
}

export async function muteVolume() {
  const r = await ps(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait([char]173)`);
  return r.ok ? `Volume muted Boss.` : `Mute failed Boss.`;
}

// =====================================================
// CLIPBOARD
// =====================================================

export async function copyToClipboard(text) {
  const safe = text.replace(/'/g, "''");
  const r = await ps(`Set-Clipboard -Value '${safe}'`);
  return r.ok ? `Copied to clipboard Boss.` : `Clipboard copy failed Boss.`;
}

export async function getClipboard() {
  const r = await ps(`Get-Clipboard`);
  return r.ok ? `Clipboard contents Boss:\n\n${r.out}` : `Could not read clipboard Boss.`;
}

// =====================================================
// PROCESS MANAGEMENT
// =====================================================

export async function killProcess(name) {
  const clean = name.replace(/\.exe$/i, "");
  await ps(`Stop-Process -Name '${clean}' -Force -ErrorAction SilentlyContinue`);
  return `Process "${name}" terminated Boss.`;
}

export async function listProcesses() {
  const r = await ps(`Get-Process | Sort-Object CPU -Descending | Select-Object -First 20 | Format-Table Name,Id,@{N='CPU%';E={$_.CPU}} -AutoSize | Out-String`);
  return r.ok ? `Top processes Boss:\n\n${r.out}` : `Could not list processes Boss.`;
}

export async function startApp(appName) {
  const appMap = {
    "notepad": "notepad", "paint": "mspaint", "calculator": "calc",
    "task manager": "taskmgr", "file explorer": "explorer",
    "cmd": "cmd", "command prompt": "cmd",
    "vs code": "code", "vscode": "code",
    "word": "winword", "excel": "excel", "powerpoint": "powerpnt",
    "chrome": `"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"`,
    "edge": "msedge", "firefox": "firefox",
    "spotify": "spotify", "discord": "discord",
    "obs": "obs64", "vlc": "vlc",
    "settings": "ms-settings:",
    "control panel": "control",
    "device manager": "devmgmt.msc",
    "registry": "regedit",
    "task scheduler": "taskschd.msc",
    "event viewer": "eventvwr",
    "disk management": "diskmgmt.msc",
    "snipping tool": "snippingtool",
    "sticky notes": "stikynot",
    "wordpad": "write",
    "character map": "charmap",
  };
  const lower = appName.toLowerCase().trim();
  const cmd = appMap[lower];
  if (cmd) {
    if (cmd.startsWith("ms-")) exec(`start ${cmd}`);
    else if (cmd.endsWith(".msc")) exec(`start ${cmd}`);
    else exec(`start "" "${cmd}"`);
    return `Opening ${appName} Boss.`;
  }
  // Try directly
  exec(`start "" "${appName}"`);
  return `Attempting to open "${appName}" Boss.`;
}

// =====================================================
// WIFI / NETWORK
// =====================================================

export async function getWifiStatus() {
  const r = await ps(`netsh wlan show interfaces | Select-String 'SSID|State|Signal|Radio'`);
  return r.ok && r.out ? `WiFi Status Boss:\n\n${r.out}` : `Could not get WiFi status Boss.`;
}

export async function getNetworkInfo() {
  const r = await ps(`Get-NetIPAddress | Where-Object {$_.AddressFamily -eq 'IPv4' -and $_.IPAddress -ne '127.0.0.1'} | Select-Object InterfaceAlias,IPAddress | Format-Table -AutoSize | Out-String`);
  return r.ok ? `Network Info Boss:\n\n${r.out}` : `Could not get network info Boss.`;
}

export async function pingAddress(address) {
  const r = await ps(`Test-Connection -ComputerName '${address}' -Count 3 | Format-Table -AutoSize | Out-String`);
  return r.ok ? `Ping results for ${address} Boss:\n\n${r.out}` : `Ping failed Boss: ${r.out}`;
}

// =====================================================
// BATTERY
// =====================================================

export async function getBatteryStatus() {
  const r = await ps(`$b=Get-WmiObject Win32_Battery; if($b){Write-Output "Battery: $($b.EstimatedChargeRemaining)% | Status: $($b.BatteryStatus)"}else{Write-Output "No battery - Desktop PC Boss."}`);
  return r.ok ? `${r.out} Boss.` : `Could not get battery status Boss.`;
}

// =====================================================
// BRIGHTNESS
// =====================================================

export async function setBrightness(level) {
  const r = await ps(`(Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods).WmiSetBrightness(1,${level})`);
  return r.ok ? `Brightness set to ${level} percent Boss.` : `Brightness not supported on this display Boss.`;
}

export async function getBrightness() {
  const r = await ps(`(Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightness).CurrentBrightness`);
  return r.ok && r.out ? `Current brightness: ${r.out} percent Boss.` : `Could not get brightness Boss.`;
}

// =====================================================
// POWER CONTROLS
// =====================================================

export async function lockPC() {
  exec(`rundll32.exe user32.dll,LockWorkStation`);
  return `PC locked Boss.`;
}

export async function sleepPC() {
  exec(`rundll32.exe powrprof.dll,SetSuspendState 0,1,0`);
  return `Going to sleep Boss.`;
}

export async function shutdownPC(delay = 30) {
  exec(`shutdown /s /t ${delay}`);
  return `PC will shutdown in ${delay} seconds Boss. Say cancel shutdown to abort.`;
}

export async function restartPC(delay = 30) {
  exec(`shutdown /r /t ${delay}`);
  return `PC will restart in ${delay} seconds Boss. Say cancel shutdown to abort.`;
}

export async function cancelShutdown() {
  exec(`shutdown /a`);
  return `Shutdown cancelled Boss.`;
}

export async function logOff() {
  exec(`shutdown /l`);
  return `Logging off Boss.`;
}

// =====================================================
// FILE OPERATIONS
// =====================================================

export async function openFolder(folderPath) {
  exec(`explorer "${folderPath}"`);
  return `Opened folder: ${folderPath} Boss.`;
}

export async function openDesktop() {
  exec(`explorer "${path.join(os.homedir(), "Desktop")}"`);
  return `Opened Desktop Boss.`;
}

export async function openDownloads() {
  exec(`explorer "${path.join(os.homedir(), "Downloads")}"`);
  return `Opened Downloads Boss.`;
}

export async function openDocuments() {
  exec(`explorer "${path.join(os.homedir(), "Documents")}"`);
  return `Opened Documents Boss.`;
}

// =====================================================
// SYSTEM COMMANDS
// =====================================================

export async function runCommand(command) {
  try {
    const { stdout, stderr } = await execAsync(command, { timeout: 10000 });
    return `Result Boss:\n\n${(stdout || stderr || "Done.").trim()}`;
  } catch (err) {
    return `Command failed Boss: ${err.message}`;
  }
}

export async function getSystemInfo() {
  const uptime = os.uptime();
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const totalRAM = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
  const freeRAM = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
  const usedRAM = (totalRAM - freeRAM).toFixed(2);
  const ramPercent = ((usedRAM / totalRAM) * 100).toFixed(1);
  const cpus = os.cpus();

  let diskInfo = "";
  try {
    const { stdout } = await execAsync(
      `powershell -NoProfile -Command "Get-PSDrive -PSProvider FileSystem | Select-Object Name,@{N='Used(GB)';E={[math]::Round($_.Used/1GB,2)}},@{N='Free(GB)';E={[math]::Round($_.Free/1GB,2)}},@{N='Total(GB)';E={[math]::Round(($_.Used+$_.Free)/1GB,2)}} | Format-Table -AutoSize | Out-String"`,
      { timeout: 8000 }
    );
    diskInfo = stdout.trim();
  } catch {}

  return `NAHVI SYSTEM REPORT

PROCESSOR
CPU       : ${cpus[0]?.model || "Unknown"}
Cores     : ${cpus.length}
Speed     : ${(cpus[0]?.speed / 1000).toFixed(2)} GHz

RAM
Total     : ${totalRAM} GB
Used      : ${usedRAM} GB (${ramPercent}%)
Free      : ${freeRAM} GB

STORAGE
${diskInfo || "Unavailable"}

SYSTEM
Platform  : ${os.platform()} (${os.arch()})
Hostname  : ${os.hostname()}
Uptime    : ${hours}h ${minutes}m
Node.js   : ${process.version}

All systems operational Boss.`;
}

export async function openWindowsSearch() {
  exec(`start ms-search:`);
  return `Windows Search opened Boss.`;
}

// =====================================================
// SMART COMMAND ROUTER — Natural language to action
// =====================================================

export async function handleDesktopCommand(message) {
  const lower = message.toLowerCase();

  // ── Mouse ─────────────────────────────────────────
  if (lower.match(/click at \d+/) || (lower.includes("click") && lower.match(/\d+.*\d+/))) {
    const coords = message.match(/(\d+)[,\s]+(\d+)/);
    if (coords) return await clickMouse(parseInt(coords[1]), parseInt(coords[2]));
  }
  if (lower.includes("right click"))  return await rightClick();
  if (lower.includes("double click")) return await doubleClick();
  if (lower.includes("scroll down"))  return await scrollMouse("down", parseInt(message.match(/(\d+)/)?.[1] || 3));
  if (lower.includes("scroll up"))    return await scrollMouse("up",   parseInt(message.match(/(\d+)/)?.[1] || 3));
  if (lower.includes("mouse position") || lower.includes("where is mouse") || lower.includes("where is cursor")) return await getMousePosition();

  // ── Typing ────────────────────────────────────────
  if (lower.match(/^(nahvi\s+)?type\s+/i)) {
    const text = message.replace(/^(nahvi\s+)?type\s+/i, "").trim();
    return await typeText(text);
  }

  // ── Keys ──────────────────────────────────────────
  if (lower.includes("press enter"))      return await pressKey("enter");
  if (lower.includes("press escape") || lower.includes("press esc")) return await pressKey("escape");
  if (lower.includes("press tab"))        return await pressKey("tab");
  if (lower.includes("press space"))      return await pressKey("space");
  if (lower.includes("press backspace"))  return await pressKey("backspace");
  if (lower.includes("press delete"))     return await pressKey("delete");
  if (lower.includes("press f5"))         return await pressKey("f5");
  if (lower.includes("press f11"))        return await pressKey("f11");
  if (lower.includes("press f12"))        return await pressKey("f12");

  // ── Shortcuts ─────────────────────────────────────
  if (lower.includes("copy") && !lower.includes("clipboard") && !lower.includes("copy to")) return await pressShortcut("ctrl+c");
  if (lower.includes("paste"))           return await pressShortcut("ctrl+v");
  if (lower.includes("cut"))             return await pressShortcut("ctrl+x");
  if (lower.includes("undo"))            return await pressShortcut("ctrl+z");
  if (lower.includes("redo"))            return await pressShortcut("ctrl+y");
  if (lower.includes("select all"))      return await pressShortcut("ctrl+a");
  if (lower.includes("save file") || lower.includes("save document")) return await pressShortcut("ctrl+s");
  if (lower.includes("new tab"))         return await pressShortcut("ctrl+t");
  if (lower.includes("close tab"))       return await pressShortcut("ctrl+w");
  if (lower.includes("refresh") && !lower.includes("wifi")) return await pressShortcut("ctrl+r");
  if (lower.includes("find on page") || lower.includes("search page")) return await pressShortcut("ctrl+f");
  if (lower.includes("alt tab") || lower.includes("switch app")) return await pressShortcut("alt+tab");
  if (lower.includes("show desktop"))    return await showDesktop();
  if (lower.includes("print page") || lower.includes("ctrl+p")) return await pressShortcut("ctrl+p");
  if (lower.includes("zoom in"))         { await ps(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^{+}')`); return `Zoomed in Boss.`; }
  if (lower.includes("zoom out"))        { await ps(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^-')`); return `Zoomed out Boss.`; }

  // ── Screenshot ────────────────────────────────────
  if (lower.includes("screenshot") || lower.includes("screen capture") || lower.includes("capture screen")) {
    const label = message.replace(/screenshot|screen capture|capture screen|take a|take/gi, "").trim();
    return await takeScreenshot(label);
  }
  if (lower.includes("screen size") || lower.includes("screen resolution")) return await getScreenSize();

  // ── Windows ───────────────────────────────────────
  if (lower.includes("minimize"))         return await minimizeWindow();
  if (lower.includes("maximize"))         return await maximizeWindow();
  if (lower.includes("close window"))     return await closeWindow();
  if (lower.includes("all open windows") || lower.includes("list windows") || lower.includes("what windows")) return await getAllWindows();
  if (lower.includes("active window") || lower.includes("what is open") || lower.includes("whats open")) return await getActiveWindow();
  if (lower.includes("switch window"))    return await switchWindow();

  // ── Volume ────────────────────────────────────────
  if (lower.includes("volume up") || lower.includes("increase volume") || lower.includes("louder") || lower.includes("turn up")) {
    return await volumeUp(parseInt(message.match(/(\d+)/)?.[1] || 5));
  }
  if (lower.includes("volume down") || lower.includes("decrease volume") || lower.includes("quieter") || lower.includes("turn down")) {
    return await volumeDown(parseInt(message.match(/(\d+)/)?.[1] || 5));
  }
  if (lower.includes("mute") || lower.includes("silence"))  return await muteVolume();

  // ── Clipboard ─────────────────────────────────────
  if (lower.includes("copy to clipboard")) {
    return await copyToClipboard(message.replace(/copy to clipboard/gi, "").trim());
  }
  if (lower.includes("clipboard") || lower.includes("what is copied") || lower.includes("show clipboard")) {
    return await getClipboard();
  }

  // ── Apps ──────────────────────────────────────────
  if (lower.includes("open task manager") || lower.includes("task manager")) return await startApp("task manager");
  if (lower.includes("open notepad"))       return await startApp("notepad");
  if (lower.includes("open paint"))         return await startApp("paint");
  if (lower.includes("open calculator"))    return await startApp("calculator");
  if (lower.includes("open file explorer") || lower.includes("open explorer")) return await startApp("file explorer");
  if (lower.includes("open cmd") || lower.includes("open terminal") || lower.includes("open command prompt")) return await startApp("cmd");
  if (lower.includes("open settings"))      return await startApp("settings");
  if (lower.includes("open vs code") || lower.includes("open vscode")) return await startApp("vs code");
  if (lower.includes("open chrome"))        return await startApp("chrome");
  if (lower.includes("open edge"))          return await startApp("edge");
  if (lower.includes("open word"))          return await startApp("word");
  if (lower.includes("open excel"))         return await startApp("excel");
  if (lower.includes("open powerpoint"))    return await startApp("powerpoint");
  if (lower.includes("open discord"))       return await startApp("discord");
  if (lower.includes("open spotify"))       return await startApp("spotify");
  if (lower.includes("open vlc"))           return await startApp("vlc");
  if (lower.includes("open snipping tool")) return await startApp("snipping tool");
  if (lower.includes("open control panel")) return await startApp("control panel");
  if (lower.includes("open device manager")) return await startApp("device manager");
  if (lower.includes("open registry"))      return await startApp("registry");

  // ── Folders ───────────────────────────────────────
  if (lower.includes("open desktop folder")) return await openDesktop();
  if (lower.includes("open downloads"))      return await openDownloads();
  if (lower.includes("open documents"))      return await openDocuments();

  // ── Processes ─────────────────────────────────────
  if (lower.includes("kill ") || lower.includes("force close") || lower.includes("terminate")) {
    const name = message.replace(/kill|force close|terminate/gi, "").trim();
    if (name) return await killProcess(name);
    return "Tell me which app to close Boss.";
  }
  if (lower.includes("list processes") || lower.includes("running apps") || lower.includes("what is running")) {
    return await listProcesses();
  }

  // ── Network ───────────────────────────────────────
  if (lower.includes("wifi") || lower.includes("wi-fi"))  return await getWifiStatus();
  if (lower.includes("network info") || lower.includes("ip address") || lower.includes("my ip")) return await getNetworkInfo();
  if (lower.includes("ping ")) {
    const addr = message.replace(/ping/gi, "").trim();
    return await pingAddress(addr);
  }

  // ── Battery / Brightness ──────────────────────────
  if (lower.includes("battery"))            return await getBatteryStatus();
  if (lower.includes("set brightness")) {
    const n = message.match(/(\d+)/)?.[1] || 70;
    return await setBrightness(parseInt(n));
  }
  if (lower.includes("brightness"))         return await getBrightness();

  // ── Run command ───────────────────────────────────
  if (lower.startsWith("run command ") || lower.startsWith("execute ")) {
    return await runCommand(message.replace(/^(run command|execute)\s+/i, "").trim());
  }

  // ── Power ─────────────────────────────────────────
  if (lower.includes("lock pc") || lower.includes("lock computer") || lower.includes("lock screen")) return await lockPC();
  if ((lower.includes("sleep") && (lower.includes("pc") || lower.includes("computer") || lower.includes("laptop")))) return await sleepPC();
  if (lower.includes("log off") || lower.includes("sign out"))  return await logOff();
  if (lower.includes("cancel shutdown") || lower.includes("abort shutdown")) return await cancelShutdown();
  if (lower.includes("shutdown") || lower.includes("shut down")) {
    const n = parseInt(message.match(/(\d+)/)?.[1] || 30);
    return await shutdownPC(n);
  }
  if (lower.includes("restart") || lower.includes("reboot")) {
    const n = parseInt(message.match(/(\d+)/)?.[1] || 30);
    return await restartPC(n);
  }

  // ── Windows Search ────────────────────────────────
  if (lower.includes("open search") || lower.includes("windows search")) return await openWindowsSearch();

  return null;
}