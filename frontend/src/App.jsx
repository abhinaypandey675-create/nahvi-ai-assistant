import React, { useState, useRef, useEffect, useCallback } from "react";

// ── Brand colors ─────────────────────────────────────
const C = {
  cyan:    "#00D4FF",
  purple:  "#7B2FFF",
  gold:    "#FFB800",
  red:     "#FF3B3B",
  green:   "#00FF88",
  bg:      "#020408",
  panel:   "rgba(0,212,255,0.03)",
  border:  "rgba(0,212,255,0.12)",
};

// ══════════════════════════════════════════════════════
// PARTICLE CANVAS
// ══════════════════════════════════════════════════════
const ParticleCanvas = () => {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize(); window.addEventListener("resize", resize);
    const pts = Array.from({ length: 90 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      r: Math.random() * 1.4 + 0.2,
      dx: (Math.random() - 0.5) * 0.2, dy: (Math.random() - 0.5) * 0.2,
      a: Math.random() * 0.4 + 0.1,
      color: Math.random() > 0.7 ? "123,47,255" : "0,212,255",
    }));
    let id;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pts.forEach(p => {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color},${p.a})`; ctx.fill();
        p.x += p.dx; p.y += p.dy;
        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
      });
      id = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(id); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none", opacity:0.5 }} />;
};

// ══════════════════════════════════════════════════════
// LIVE CLOCK WIDGET
// ══════════════════════════════════════════════════════
const ClockWidget = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const iv = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(iv); }, []);
  const h = String(time.getHours()).padStart(2,"0");
  const m = String(time.getMinutes()).padStart(2,"0");
  const s = String(time.getSeconds()).padStart(2,"0");
  const date = time.toLocaleDateString("en-IN", { weekday:"short", day:"2-digit", month:"short", year:"numeric" });
  return (
    <div style={wStyle}>
      <div style={wLabel}>SYSTEM CLOCK</div>
      <div style={{ fontSize:32, fontWeight:900, letterSpacing:6, color:C.cyan, fontFamily:"'Courier New',monospace", textShadow:`0 0 20px ${C.cyan}` }}>
        {h}<span style={{ color:C.purple, animation:"blink 1s step-end infinite" }}>:</span>{m}<span style={{ color:C.purple, animation:"blink 1s step-end infinite" }}>:</span>
        <span style={{ fontSize:20, color:"rgba(0,212,255,0.5)" }}>{s}</span>
      </div>
      <div style={{ fontSize:9, letterSpacing:4, color:"rgba(255,255,255,0.3)", marginTop:6, fontFamily:"'Courier New',monospace" }}>{date.toUpperCase()}</div>
    </div>
  );
};

// ══════════════════════════════════════════════════════
// SYSTEM STATS WIDGET
// ══════════════════════════════════════════════════════
const StatBar = ({ label, value, color }) => (
  <div style={{ marginBottom:14 }}>
    <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, letterSpacing:3, color:"rgba(255,255,255,0.6)", fontFamily:"'Courier New',monospace", marginBottom:6 }}>
      <span>{label}</span>
      <span style={{ color, fontWeight:900, fontSize:13 }}>{value}%</span>
    </div>
    <div style={{ height:5, background:"rgba(255,255,255,0.05)", borderRadius:3 }}>
      <div style={{ height:"100%", width:`${value}%`, background:`linear-gradient(90deg,${color},${color}88)`, borderRadius:3, boxShadow:`0 0 10px ${color}`, transition:"width 1s ease" }} />
    </div>
  </div>
);

const SystemWidget = () => {
  const [stats, setStats] = useState({ cpu: 0, ram: 0, net: 0 });
  useEffect(() => {
    const iv = setInterval(() => {
      setStats({
        cpu: Math.floor(Math.random() * 40 + 20),
        ram: Math.floor(Math.random() * 20 + 50),
        net: Math.floor(Math.random() * 60 + 20),
      });
    }, 2000);
    return () => clearInterval(iv);
  }, []);
  return (
    <div style={wStyle}>
      <div style={wLabel}>SYSTEM VITALS</div>
      <StatBar label="PROCESSOR" value={stats.cpu} color={C.cyan} />
      <StatBar label="MEMORY" value={stats.ram} color={C.purple} />
      <StatBar label="NETWORK" value={stats.net} color={C.gold} />
      <div style={{ display:"flex", gap:8, marginTop:16 }}>
        {[["GROQ","ONLINE",C.green],["GEMINI","ONLINE",C.cyan],["CORE","ACTIVE",C.gold]].map(([l,v,c]) => (
          <div key={l} style={{ flex:1, textAlign:"center", border:`1px solid ${c}33`, padding:"10px 4px", borderRadius:2, background:`${c}08` }}>
            <div style={{ fontSize:10, letterSpacing:2, color:c, fontFamily:"'Courier New',monospace", fontWeight:900 }}>{l}</div>
            <div style={{ fontSize:9, letterSpacing:1, color:`${c}99`, fontFamily:"'Courier New',monospace", marginTop:2 }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════
// QUICK COMMANDS WIDGET
// ══════════════════════════════════════════════════════
const QuickWidget = ({ onCommand }) => {
  const cmds = [
    ["⏰","TIME"],["🌤","WEATHER"],["💻","SYSTEM"],["😂","JOKE"],
    ["📚","STUDY"],["👨‍💻","CODE"],["🎮","GAMING"],["💡","MOTIVATE"],
  ];
  return (
    <div style={wStyle}>
      <div style={wLabel}>QUICK COMMANDS</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        {cmds.map(([icon, cmd]) => (
          <button key={cmd} onClick={() => onCommand(
            cmd === "STUDY" ? "start study mode" :
            cmd === "CODE" ? "start coding mode" :
            cmd === "GAMING" ? "start gaming mode" :
            cmd === "MOTIVATE" ? "motivate me" :
            cmd.toLowerCase()
          )}
            style={{ background:"rgba(0,212,255,0.05)", border:`1px solid ${C.border}`, color:"rgba(255,255,255,0.7)", fontSize:11, letterSpacing:2, padding:"12px 6px", cursor:"pointer", fontFamily:"'Courier New',monospace", transition:"all 0.2s", borderRadius:2, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,212,255,0.12)"; e.currentTarget.style.color = C.cyan; e.currentTarget.style.borderColor = C.cyan; e.currentTarget.style.boxShadow = `0 0 12px rgba(0,212,255,0.2)`; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(0,212,255,0.05)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = "none"; }}
          >
            <span style={{ fontSize:18 }}>{icon}</span>
            <span style={{ fontSize:9, letterSpacing:3 }}>{cmd}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════
// VOICE VISUALIZER
// ══════════════════════════════════════════════════════
const VoiceVisualizer = ({ isListening, isThinking }) => {
  const bars = 20;
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:3, height:32 }}>
      {Array.from({ length: bars }).map((_, i) => (
        <div key={i} style={{
          width: 3, borderRadius: 2,
          background: isListening ? C.cyan : isThinking ? C.purple : "rgba(255,255,255,0.1)",
          height: isListening || isThinking ? `${Math.random() * 24 + 8}px` : "4px",
          boxShadow: isListening ? `0 0 6px ${C.cyan}` : isThinking ? `0 0 6px ${C.purple}` : "none",
          transition: "all 0.15s ease",
          animation: (isListening || isThinking) ? `voicePulse ${0.3 + Math.random() * 0.5}s ease-in-out infinite alternate` : "none",
          animationDelay: `${i * 0.05}s`,
        }} />
      ))}
    </div>
  );
};

// ══════════════════════════════════════════════════════
// ORION CORE (center HUD orb)
// ══════════════════════════════════════════════════════
const CoreOrb = ({ isListening, isThinking, status }) => {
  const color = isListening ? C.cyan : isThinking ? C.purple : C.gold;
  return (
    <div style={{ position:"relative", width:64, height:64 }}>
      <div style={{ position:"absolute", inset:0, borderRadius:"50%", border:`1px solid ${color}22`, animation:"spin 10s linear infinite" }} />
      <div style={{ position:"absolute", inset:5, borderRadius:"50%", border:`1px solid ${color}33`, animation:"spinR 7s linear infinite" }} />
      <div style={{ position:"absolute", inset:12, borderRadius:"50%", border:`1px dashed ${color}11`, animation:"spin 20s linear infinite" }} />
      <div style={{
        position:"absolute", inset:18, borderRadius:"50%",
        background:`radial-gradient(circle, ${color}22 0%, ${color}08 60%, transparent 100%)`,
        boxShadow:`0 0 30px ${color}66, 0 0 60px ${color}22`,
        display:"flex", alignItems:"center", justifyContent:"center",
        transition:"box-shadow 0.5s ease",
      }}>
        <div style={{ fontSize:14, fontWeight:900, fontFamily:"'Courier New',monospace", background:`linear-gradient(135deg,${C.cyan},${C.purple})`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>N</div>
      </div>
      {[0,60,120,180,240,300].map((d,i) => (
        <div key={i} style={{
          position:"absolute", width:4, height:4, borderRadius:"50%",
          background: i%2===0 ? C.cyan : C.purple,
          top:`${50-47*Math.cos(d*Math.PI/180)}%`, left:`${50+47*Math.sin(d*Math.PI/180)}%`,
          transform:"translate(-50%,-50%)",
          boxShadow:`0 0 6px ${i%2===0?C.cyan:C.purple}`,
        }} />
      ))}
    </div>
  );
};

// ══════════════════════════════════════════════════════
// WIDGET STYLE HELPERS
// ══════════════════════════════════════════════════════
const wStyle = {
  background: C.panel,
  border: `1px solid ${C.border}`,
  borderRadius: 2,
  padding: "16px",
  backdropFilter: "blur(10px)",
};
const wLabel = {
  fontSize: 8,
  letterSpacing: 4,
  color: "rgba(0,212,255,0.5)",
  fontFamily: "'Courier New',monospace",
  marginBottom: 12,
  borderBottom: `1px solid ${C.border}`,
  paddingBottom: 8,
};

// ══════════════════════════════════════════════════════
// CHAT MESSAGE
// ══════════════════════════════════════════════════════
const ChatMessage = ({ msg, index }) => {
  const isUser = msg.sender === "user";
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 50); }, []);
  return (
    <div style={{
      display:"flex", flexDirection:"column",
      alignItems: isUser ? "flex-end" : "flex-start",
      marginBottom: 12,
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(10px)",
      transition: "all 0.3s ease",
    }}>
      <div style={{ fontSize:8, letterSpacing:3, color: isUser ? "rgba(123,47,255,0.7)" : "rgba(0,212,255,0.7)", fontFamily:"'Courier New',monospace", marginBottom:4 }}>
        {isUser ? "YOU" : "NAHVI"} {msg.engine && !isUser ? `· ${msg.engine}` : ""}
      </div>
      <div style={{
        maxWidth:"85%",
        background: isUser ? "rgba(123,47,255,0.08)" : "rgba(0,212,255,0.05)",
        border: `1px solid ${isUser ? "rgba(123,47,255,0.2)" : "rgba(0,212,255,0.15)"}`,
        borderRadius: isUser ? "8px 2px 8px 8px" : "2px 8px 8px 8px",
        padding:"10px 14px",
        fontSize:12,
        lineHeight:1.8,
        color:"rgba(255,255,255,0.85)",
        fontFamily:"'Courier New',monospace",
        whiteSpace:"pre-wrap",
        wordBreak:"break-word",
      }}>
        {msg.text}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════
export default function App() {
  const [message, setMessage]       = useState("");
  const [chat, setChat]             = useState([{ sender:"NAHVI", text:"All systems online Boss. NAHVI is ready.", engine:"System" }]);
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [status, setStatus]         = useState("ONLINE");
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior:"smooth" }); }, [chat]);

  // ── Speak using voice field if available ──────────
  const speak = useCallback((text, voiceText) => {
    window.speechSynthesis.cancel();
    const toSpeak = voiceText || text;
    const speech = new SpeechSynthesisUtterance(toSpeak);
    speech.rate = 0.95; speech.pitch = 0.85; speech.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.name.includes("Google UK English Male") ||
      v.name.includes("Microsoft David") ||
      v.name.includes("Microsoft Mark") ||
      v.lang === "en-GB"
    );
    if (preferred) speech.voice = preferred;
    window.speechSynthesis.speak(speech);
  }, []);

  // ── Send message ──────────────────────────────────
  const sendMessage = useCallback(async (textOverride = null) => {
    const text = (textOverride || message).trim();
    if (!text) return;
    setChat(prev => [...prev, { sender:"user", text }]);
    setMessage("");
    setIsThinking(true);
    setStatus("PROCESSING...");
    try {
      const response = await fetch("http://localhost:5000/api/chat", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await response.json();
      const reply = data.reply || "No response Boss.";
      const voice = data.voice || reply;
      const engine = data.engine || "";
      setChat(prev => [...prev, { sender:"NAHVI", text:reply, engine }]);
      speak(reply, voice);
    } catch {
      const err = "Backend connection failed Boss.";
      setChat(prev => [...prev, { sender:"NAHVI", text:err }]);
      speak(err, err);
    } finally {
      setIsThinking(false);
      setStatus("ONLINE");
    }
  }, [message, speak]);

  // ── Voice input ───────────────────────────────────
  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Voice not supported. Use Chrome or Edge Boss."); return; }
    if (isListening && recognitionRef.current) { recognitionRef.current.stop(); return; }
    const recognition = new SR();
    recognitionRef.current = recognition;
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;
    recognition.onstart = () => { setIsListening(true); setStatus("LISTENING..."); };
    recognition.onresult = (e) => { sendMessage(e.results[0][0].transcript); };
    recognition.onerror = (e) => {
      setIsListening(false); setStatus("ONLINE");
      if (e.error === "not-allowed") alert("Mic permission denied Boss.");
    };
    recognition.onend = () => { setIsListening(false); setStatus("ONLINE"); };
    recognition.start();
  }, [isListening, sendMessage]);

  const statusColor = status === "ONLINE" ? C.green : status === "LISTENING..." ? C.cyan : C.purple;

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:"#fff", fontFamily:"'Courier New',monospace", overflow:"hidden", position:"relative" }}>
      <ParticleCanvas />

      {/* Grid */}
      <div style={{ position:"fixed", inset:0, zIndex:0, backgroundImage:`linear-gradient(rgba(0,212,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.025) 1px,transparent 1px)`, backgroundSize:"50px 50px", pointerEvents:"none" }} />

      {/* Scan line */}
      <ScanLine />

      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes spinR { from{transform:rotate(0deg)} to{transform:rotate(-360deg)} }
        @keyframes blink { 50%{opacity:0} }
        @keyframes voicePulse { from{height:4px} to{height:28px} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes scanMove { from{top:0%} to{top:100%} }
        @keyframes glowPulse { 0%,100%{opacity:0.3} 50%{opacity:0.8} }
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:3px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(0,212,255,0.3); border-radius:2px; }
        input::placeholder { color:rgba(0,212,255,0.25); }
        input:focus { outline:none; }
      `}</style>

      {/* ── TOP NAV BAR ── */}
      <div style={{ position:"fixed", top:0, left:0, right:0, zIndex:100, height:52, background:"rgba(2,4,8,0.9)", backdropFilter:"blur(20px)", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 24px" }}>
        {/* Left — brand */}
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <div style={{ fontSize:18, fontWeight:900, letterSpacing:10, background:`linear-gradient(135deg,${C.cyan},${C.purple})`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>NAHVI</div>
          <div style={{ fontSize:8, letterSpacing:3, color:"rgba(255,255,255,0.2)", borderLeft:`1px solid ${C.border}`, paddingLeft:16 }}>ABHINAY AI INDUSTRIES</div>
        </div>
        {/* Center — status */}
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:6, height:6, borderRadius:"50%", background:statusColor, boxShadow:`0 0 8px ${statusColor}`, animation:"glowPulse 2s ease infinite" }} />
          <div style={{ fontSize:9, letterSpacing:4, color:statusColor }}>{status}</div>
        </div>
        {/* Right — info */}
        <div style={{ fontSize:8, letterSpacing:3, color:"rgba(255,255,255,0.2)" }}>v1.0.0 · DUAL AI ACTIVE</div>
      </div>

      {/* ── MAIN LAYOUT ── */}
      <div style={{ display:"grid", gridTemplateColumns:"260px 1fr 260px", gap:12, padding:"64px 12px 12px", height:"100vh", position:"relative", zIndex:2 }}>

        {/* ── LEFT PANEL ── */}
        <div style={{ display:"flex", flexDirection:"column", gap:12, paddingTop:8 }}>
          <ClockWidget />
          <SystemWidget />

          {/* Creator badge */}
          <div style={{ ...wStyle, textAlign:"center", padding:"14px 16px" }}>
            <div style={{ fontSize:8, letterSpacing:4, color:"rgba(0,212,255,0.4)", marginBottom:8 }}>CREATOR</div>
            <div style={{ fontSize:20, fontWeight:900, letterSpacing:8, background:`linear-gradient(135deg,${C.cyan},${C.purple})`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", filter:`drop-shadow(0 0 12px rgba(0,212,255,0.4))` }}>ABHINAY</div>
            <div style={{ marginTop:8, height:1, background:`linear-gradient(90deg,transparent,${C.cyan}55,${C.purple}55,transparent)` }} />
            <div style={{ fontSize:9, letterSpacing:2, color:"rgba(255,255,255,0.3)", marginTop:8 }}>ABHINAY AI INDUSTRIES</div>
            <div style={{ marginTop:4, fontSize:8, letterSpacing:2, color:"rgba(0,212,255,0.3)" }}>NAHVI ← ABHINAY</div>
          </div>
        </div>

        {/* ── CENTER — MAIN CHAT ── */}
        <div style={{ display:"flex", flexDirection:"column", gap:0, paddingTop:8, height:"calc(100vh - 94px)" }}>

          {/* Compact top bar — orb + status + visualizer */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10, padding:"8px 20px", background:"rgba(0,212,255,0.03)", border:"1px solid rgba(0,212,255,0.12)", borderRadius:2 }}>
            <div style={{ fontSize:9, letterSpacing:4, color:"rgba(255,255,255,0.3)", fontFamily:"Courier New,monospace" }}>
              {isListening ? "🎤 VOICE ACTIVE" : isThinking ? "⚡ PROCESSING" : "◆ AWAITING COMMAND"}
            </div>
            <CoreOrb isListening={isListening} isThinking={isThinking} status={status} />
            <div style={{ width:120 }}>
              <VoiceVisualizer isListening={isListening} isThinking={isThinking} />
            </div>
          </div>

          {/* Chat box — fills all remaining height */}
          <div style={{ flex:1, background:"rgba(0,212,255,0.03)", border:"1px solid rgba(0,212,255,0.12)", borderRadius:2, display:"flex", flexDirection:"column", overflow:"hidden" }}>
            {/* Chat header */}
            <div style={{ padding:"10px 16px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ fontSize:8, letterSpacing:4, color:"rgba(0,212,255,0.5)" }}>COMMAND INTERFACE</div>
              <div style={{ display:"flex", gap:6 }}>
                {[C.red, C.gold, C.green].map((c,i) => <div key={i} style={{ width:8, height:8, borderRadius:"50%", background:c, opacity:0.6 }} />)}
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex:1, overflowY:"auto", padding:"16px", display:"flex", flexDirection:"column" }}>
              {chat.map((msg, i) => <ChatMessage key={i} msg={msg} index={i} />)}
              {isThinking && (
                <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-start", marginBottom:12 }}>
                  <div style={{ fontSize:8, letterSpacing:3, color:"rgba(0,212,255,0.7)", fontFamily:"'Courier New',monospace", marginBottom:4 }}>NAHVI</div>
                  <div style={{ background:"rgba(0,212,255,0.05)", border:`1px solid rgba(0,212,255,0.15)`, borderRadius:"2px 8px 8px 8px", padding:"10px 14px", fontSize:12, fontFamily:"'Courier New',monospace" }}>
                    <span style={{ color:C.cyan }}>█</span>
                    <span style={{ color:"rgba(0,212,255,0.5)", animation:"blink 0.8s step-end infinite" }}>█</span>
                    <span style={{ color:"rgba(0,212,255,0.2)", animation:"blink 1.2s step-end infinite" }}>█</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{ borderTop:`1px solid ${C.border}`, padding:"12px 16px", display:"flex", gap:8, alignItems:"center" }}>
              <div style={{ fontSize:10, color:"rgba(0,212,255,0.4)", letterSpacing:2 }}>›</div>
              <input
                ref={inputRef}
                type="text"
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") sendMessage(); }}
                placeholder={isListening ? "Listening Boss..." : "Enter command..."}
                disabled={isListening}
                style={{ flex:1, background:"transparent", border:"none", color:"#fff", fontSize:12, letterSpacing:2, fontFamily:"'Courier New',monospace" }}
              />
              <button onClick={startListening}
                style={{ width:36, height:36, borderRadius:"50%", border:`1px solid ${isListening ? C.cyan : C.border}`, background: isListening ? `rgba(0,212,255,0.15)` : "transparent", color: isListening ? C.cyan : "rgba(255,255,255,0.4)", fontSize:14, cursor:"pointer", transition:"all 0.3s", boxShadow: isListening ? `0 0 16px ${C.cyan}44` : "none" }}>
                {isListening ? "⏹" : "🎤"}
              </button>
              <button onClick={() => sendMessage()}
                disabled={isThinking || isListening || !message.trim()}
                style={{ padding:"8px 20px", border:`1px solid ${C.cyan}`, background: message.trim() ? `linear-gradient(135deg,${C.cyan}22,${C.purple}22)` : "transparent", color: message.trim() ? C.cyan : "rgba(255,255,255,0.2)", fontSize:9, letterSpacing:3, cursor:"pointer", fontFamily:"'Courier New',monospace", transition:"all 0.3s" }}>
                SEND
              </button>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={{ display:"flex", flexDirection:"column", gap:12, paddingTop:8 }}>
          <QuickWidget onCommand={sendMessage} />

          {/* AI Engine status */}
          <div style={wStyle}>
            <div style={wLabel}>AI ENGINES</div>
            {[["GROQ","LLaMA 3.3 70B","Fast Chat",C.green],["GEMINI","2.5 Flash","Deep Reasoning",C.cyan]].map(([name,model,role,c]) => (
              <div key={name} style={{ marginBottom:10, padding:"8px 10px", background:`${c}08`, border:`1px solid ${c}22`, borderRadius:2 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ fontSize:9, fontWeight:900, letterSpacing:3, color:c }}>{name}</div>
                  <div style={{ width:6, height:6, borderRadius:"50%", background:c, boxShadow:`0 0 6px ${c}`, animation:"glowPulse 2s ease infinite" }} />
                </div>
                <div style={{ fontSize:7, letterSpacing:2, color:"rgba(255,255,255,0.3)", marginTop:4 }}>{model}</div>
                <div style={{ fontSize:7, letterSpacing:2, color:`${c}88`, marginTop:2 }}>{role}</div>
              </div>
            ))}
          </div>

          {/* HUD corner decoration */}
          <div style={{ ...wStyle, textAlign:"center" }}>
            <div style={wLabel}>MISSION STATUS</div>
            {[["VOICE I/O","ACTIVE",C.green],["FILE SEARCH","ACTIVE",C.green],["AUTOMATION","ACTIVE",C.green],["MEMORY","ACTIVE",C.cyan],["VISION","COMING SOON",C.gold]].map(([f,s,c]) => (
              <div key={f} style={{ display:"flex", justifyContent:"space-between", marginBottom:8, fontSize:8, fontFamily:"'Courier New',monospace" }}>
                <span style={{ color:"rgba(255,255,255,0.4)", letterSpacing:2 }}>{f}</span>
                <span style={{ color:c, letterSpacing:2 }}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>


    </div>
  );
}

// Scan line component
const ScanLine = () => {
  const [pos, setPos] = useState(0);
  useEffect(() => {
    let frame, p = 0;
    const go = () => { p = (p + 0.2) % 100; setPos(p); frame = requestAnimationFrame(go); };
    frame = requestAnimationFrame(go);
    return () => cancelAnimationFrame(frame);
  }, []);
  return <div style={{ position:"fixed", left:0, right:0, top:`${pos}%`, height:1, background:"linear-gradient(90deg,transparent,rgba(0,212,255,0.15),transparent)", zIndex:1, pointerEvents:"none" }} />;
};