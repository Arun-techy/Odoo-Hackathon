import { useState, useEffect, useRef } from "react";
import api from "../api.js";

// Sound effects synthesizer via Web Audio API (zero external assets needed)
function playChime(type = "receive") {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "send") {
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else {
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);
      osc.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch (e) {
    // Ignore audio context errors in restricted autoplay environments
  }
}

// Markdown parser & renderer for rich text styling
function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split("\n");
  
  return (
    <div className="space-y-1.5 text-[13.5px] leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1.5" />;

        // Header 3 / 2 / 1
        if (trimmed.startsWith("### ")) {
          return (
            <h4 key={idx} className="font-display font-bold text-indigo-300 text-sm mt-2 mb-1 flex items-center gap-1.5">
              {trimmed.replace("### ", "")}
            </h4>
          );
        }
        if (trimmed.startsWith("## ") || trimmed.startsWith("# ")) {
          return (
            <h3 key={idx} className="font-display font-bold text-white text-base mt-2 mb-1">
              {trimmed.replace(/^#+\s/, "")}
            </h3>
          );
        }

        // Blockquotes / Alerts
        if (trimmed.startsWith("> ")) {
          return (
            <div key={idx} className="border-l-2 border-indigo-400 bg-indigo-950/40 px-3 py-1.5 rounded-r-lg text-indigo-200 text-xs my-1 italic">
              {parseInlineStyles(trimmed.replace("> ", ""))}
            </div>
          );
        }

        // Bullet lists
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1.5">
              <span className="text-indigo-400 mt-1 text-xs">•</span>
              <span className="flex-1">{parseInlineStyles(trimmed.substring(2))}</span>
            </div>
          );
        }

        // Numbered lists
        const numMatch = trimmed.match(/^(\d+)\.\s(.*)/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1.5">
              <span className="text-purple-400 font-mono text-xs font-semibold">{numMatch[1]}.</span>
              <span className="flex-1">{parseInlineStyles(numMatch[2])}</span>
            </div>
          );
        }

        return <p key={idx}>{parseInlineStyles(line)}</p>;
      })}
    </div>
  );
}

// Inline styling parser: **bold**, *italic*, `code`, [ACTION]
function parseInlineStyles(str) {
  if (!str) return "";
  // Split by bold (**...**), code (`...`), italic (*...*)
  const tokens = str.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*)/g);
  return tokens.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="px-1.5 py-0.5 rounded bg-indigo-950/80 border border-indigo-500/30 text-indigo-300 font-mono text-xs">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && !part.startsWith("**")) {
      return (
        <em key={i} className="text-slate-300 italic">
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
}

export default function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState(null);
  const [stats, setStats] = useState(null);
  const [actionStatus, setActionStatus] = useState({});

  const user = JSON.parse(localStorage.getItem("dayflow_user") || "{}");
  const isAdmin = user.role === "admin";

  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: `### Welcome to Dayflow AI Cortex 👋\n\nI am your real-time **HR & Operations Assistant**. Ask me anything about your **leave quotas, attendance logs, company policy**, or click one of the quick action pills below!`,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
  ]);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Auto-scroll on new message
  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open, loading]);

  // Load quick live stats on mount or open
  const fetchLiveStats = async () => {
    try {
      const { data } = await api.get("/assistant/stats");
      setStats(data);
    } catch (err) {
      // Fallback silent
    }
  };

  useEffect(() => {
    if (open) fetchLiveStats();
  }, [open]);

  // Speech to Text (Web Speech Recognition)
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join("");
      setQuestion(transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  // Text to Speech
  const speakMessage = (text, idx) => {
    if (!window.speechSynthesis) return;

    if (speakingIdx === idx) {
      window.speechSynthesis.cancel();
      setSpeakingIdx(null);
      return;
    }

    window.speechSynthesis.cancel();
    // Strip markdown formatting for cleaner speech
    const cleanText = text
      .replace(/###/g, "")
      .replace(/\*\*/g, "")
      .replace(/>/g, "")
      .replace(/[-*]\s/g, "");

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.onend = () => setSpeakingIdx(null);
    utterance.onerror = () => setSpeakingIdx(null);

    setSpeakingIdx(idx);
    window.speechSynthesis.speak(utterance);
  };

  // Ask Question
  const ask = async (overrideQuestion = null) => {
    const q = overrideQuestion || question;
    if (!q.trim() || loading) return;

    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const updatedMessages = [...messages, { role: "user", text: q, time }];
    setMessages(updatedMessages);
    setQuestion("");
    setLoading(true);

    if (soundEnabled) playChime("send");

    try {
      // Build conversation history for multi-turn dialogue
      const history = messages
        .filter((m) => m.role === "user" || m.role === "bot")
        .slice(-4)
        .map((m) => ({
          role: m.role === "user" ? "user" : "model",
          text: m.text
        }));

      const { data } = await api.post("/assistant/ask", { question: q, history });

      if (data.balances) {
        setStats((prev) => ({ ...prev, balances: data.balances }));
      }

      setMessages((m) => [
        ...m,
        {
          role: "bot",
          text: data.answer,
          action: data.action,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          source: data.source
        }
      ]);

      if (soundEnabled) playChime("receive");
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: "bot",
          text: `⚠️ **Could not connect to AI service.** Please ensure the backend is running.`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Execute Action (Confirm Leave or Check In directly from chat)
  const executeLeaveAction = async (payload, msgIndex) => {
    setActionStatus((prev) => ({ ...prev, [msgIndex]: "loading" }));
    try {
      const res = await api.post("/leave", payload);
      setActionStatus((prev) => ({ ...prev, [msgIndex]: "success" }));
      fetchLiveStats();
      setMessages((m) => [
        ...m,
        {
          role: "bot",
          text: `🎉 **Leave Request Submitted Successfully!**\n\nYour application for **${payload.leave_type}** (${payload.start_date} → ${payload.end_date}) has been sent for HR approval (Reference ID: #${res.data.id}).`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);
      if (soundEnabled) playChime("receive");
    } catch (err) {
      setActionStatus((prev) => ({ ...prev, [msgIndex]: "error" }));
      setMessages((m) => [
        ...m,
        {
          role: "bot",
          text: `❌ **Failed to submit leave:** ${err.response?.data?.error || "An error occurred."}`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    }
  };

  const executeCheckInAction = async (msgIndex) => {
    setActionStatus((prev) => ({ ...prev, [msgIndex]: "loading" }));
    try {
      const { data } = await api.post("/attendance/check-in");
      setActionStatus((prev) => ({ ...prev, [msgIndex]: "success" }));
      fetchLiveStats();
      setMessages((m) => [
        ...m,
        {
          role: "bot",
          text: `✅ **Checked In Successfully!**\n\nYour check-in time of **${data.time}** has been recorded in the attendance registry. Have a productive day! 🚀`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);
      if (soundEnabled) playChime("receive");
    } catch (err) {
      setActionStatus((prev) => ({ ...prev, [msgIndex]: "error" }));
      setMessages((m) => [
        ...m,
        {
          role: "bot",
          text: `⚠️ ${err.response?.data?.error || "Check-in failed."}`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: "bot",
        text: `### Conversation Cleared ✨\n\nHow can I help you next?`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }
    ]);
  };

  // Quick Suggestion Chips
  const promptChips = isAdmin
    ? [
        { label: "🌴 Leave Quotas", query: "What are my leave balances?" },
        { label: "🛡️ Team Conflicts & Approvals", query: "Show all pending leave requests and flag team conflicts" },
        { label: "🕒 Today's Check-ins", query: "How many employees checked in today?" },
        { label: "📜 HR Policy", query: "What is the policy for sick leave and overtime?" }
      ]
    : [
        { label: "🌴 Leave Balance", query: "How many leaves do I have left?" },
        { label: "🕒 My Attendance Rate", query: "What is my attendance punctuality rate this month?" },
        { label: "✍️ Apply Sick Leave", query: "Apply for 1 day sick leave tomorrow" },
        { label: "📜 Sick Policy", query: "What is the sick leave policy?" },
        { label: "📅 Holidays", query: "When is the next company holiday?" }
      ];

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Expanded / Floating Chat Box */}
      {open && (
        <div
          className={`glass-panel rounded-3xl shadow-[0_25px_60px_-15px_rgba(79,70,229,0.35)] flex flex-col mb-4 overflow-hidden border border-indigo-500/20 transition-all duration-300 ease-out ${
            expanded
              ? "w-[92vw] sm:w-[540px] h-[85vh] max-h-[750px]"
              : "w-[92vw] sm:w-[410px] h-[580px]"
          }`}
        >
          {/* Top Aurora Gradient Header */}
          <div className="aurora-header-gradient p-4 text-white flex flex-col justify-between shadow-lg relative overflow-hidden">
            {/* Ambient background glow effect */}
            <div className="absolute -right-6 -top-6 w-32 h-32 bg-pink-500/30 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -left-6 -bottom-6 w-32 h-32 bg-indigo-400/30 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                    <span className="text-xl">✨</span>
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 border-2 border-indigo-900 rounded-full animate-pulse"></span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-bold text-white text-base tracking-wide">
                      Dayflow Cortex AI
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/20 backdrop-blur-sm text-indigo-100 uppercase tracking-wider">
                      {isAdmin ? "Admin Intel" : "HR Assistant"}
                    </span>
                  </div>
                  <p className="text-xs text-indigo-100/80 font-medium">
                    Personalized with Live Quotas & Database
                  </p>
                </div>
              </div>

              {/* Header Action Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  title={soundEnabled ? "Mute sounds" : "Unmute sounds"}
                  className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/90 transition text-xs"
                >
                  {soundEnabled ? "🔔" : "🔕"}
                </button>
                <button
                  onClick={clearChat}
                  title="Clear conversation"
                  className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/90 transition text-xs"
                >
                  🧹
                </button>
                <button
                  onClick={() => setExpanded(!expanded)}
                  title={expanded ? "Collapse view" : "Expand view"}
                  className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/90 transition text-xs hidden sm:flex"
                >
                  {expanded ? "↙️" : "↗️"}
                </button>
                <button
                  onClick={() => setOpen(false)}
                  title="Close Assistant"
                  className="w-8 h-8 rounded-xl bg-white/10 hover:bg-red-500/80 flex items-center justify-center text-white transition text-xs font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Quick Live Balance Bar */}
            {stats?.balances && (
              <div className="mt-3 pt-2.5 border-t border-white/15 grid grid-cols-3 gap-2 text-center text-xs relative z-10">
                <div className="bg-black/20 backdrop-blur-md rounded-xl py-1.5 px-1 border border-white/10">
                  <div className="text-[10px] text-indigo-200">Paid Leave</div>
                  <div className="font-bold text-white text-xs">
                    {stats.balances.paid_leave.remaining}
                    <span className="text-[10px] font-normal text-indigo-200/80">/18 left</span>
                  </div>
                </div>
                <div className="bg-black/20 backdrop-blur-md rounded-xl py-1.5 px-1 border border-white/10">
                  <div className="text-[10px] text-purple-200">Sick Leave</div>
                  <div className="font-bold text-white text-xs">
                    {stats.balances.sick_leave.remaining}
                    <span className="text-[10px] font-normal text-purple-200/80">/12 left</span>
                  </div>
                </div>
                <div className="bg-black/20 backdrop-blur-md rounded-xl py-1.5 px-1 border border-white/10">
                  <div className="text-[10px] text-cyan-200">On-Time Rate</div>
                  <div className="font-bold text-white text-xs">
                    {stats.attendanceStats?.on_time_rate_pct ?? 100}%
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-950/70">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex flex-col ${
                  m.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`group relative rounded-2xl p-3.5 max-w-[88%] shadow-md transition-all ${
                    m.role === "user"
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-tr-sm"
                      : "glass-card text-slate-200 rounded-tl-sm border border-indigo-500/20"
                  }`}
                >
                  {/* Bot header / Speaker icon */}
                  {m.role === "bot" && (
                    <div className="flex items-center justify-between mb-1 pb-1 border-b border-white/5 text-[11px] text-indigo-300/80">
                      <span className="flex items-center gap-1 font-semibold">
                        🤖 Dayflow AI
                        {m.source === "local_engine" && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-900/60 text-indigo-300 font-mono">
                            Live DB
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                        <button
                          onClick={() => speakMessage(m.text, i)}
                          title="Read aloud"
                          className="hover:text-white text-indigo-300"
                        >
                          {speakingIdx === i ? "⏹️ Stop" : "🔊 Listen"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Message Body */}
                  {m.role === "bot" ? (
                    renderMarkdown(m.text)
                  ) : (
                    <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap">{m.text}</p>
                  )}

                  {/* Action Card: One-Click Apply Leave Confirmation */}
                  {m.action?.type === "APPLY_LEAVE" && m.action?.payload && (
                    <div className="mt-3 p-3 rounded-xl bg-indigo-950/80 border border-indigo-500/40 shadow-inner">
                      <div className="flex items-center justify-between text-xs font-semibold text-indigo-200 mb-2">
                        <span className="flex items-center gap-1.5">
                          ⚡ Action Proposal: Apply Leave
                        </span>
                        <span className="px-2 py-0.5 rounded bg-indigo-800/80 text-white text-[10px]">
                          {m.action.payload.leave_type}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 mb-2.5">
                        <div className="bg-black/30 p-2 rounded-lg">
                          <span className="text-slate-400 block text-[10px]">From Date</span>
                          <span className="font-semibold text-white">{m.action.payload.start_date}</span>
                        </div>
                        <div className="bg-black/30 p-2 rounded-lg">
                          <span className="text-slate-400 block text-[10px]">To Date</span>
                          <span className="font-semibold text-white">{m.action.payload.end_date}</span>
                        </div>
                      </div>

                      {m.action.payload.remarks && (
                        <p className="text-[11px] text-slate-400 italic mb-3">
                          Remarks: "{m.action.payload.remarks}"
                        </p>
                      )}

                      {actionStatus[i] === "success" ? (
                        <div className="w-full py-2 bg-emerald-600/30 border border-emerald-500/50 text-emerald-300 rounded-lg text-xs font-semibold text-center">
                          ✅ Submitted to HR
                        </div>
                      ) : (
                        <button
                          disabled={actionStatus[i] === "loading"}
                          onClick={() => executeLeaveAction(m.action.payload, i)}
                          className="w-full py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-lg text-xs font-semibold shadow-md transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          {actionStatus[i] === "loading" ? "Submitting..." : "⚡ Confirm & Submit Application"}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Action Card: One-Click Check-In */}
                  {m.action?.type === "CHECK_IN" && (
                    <div className="mt-3 p-3 rounded-xl bg-indigo-950/80 border border-indigo-500/40">
                      <div className="flex items-center justify-between text-xs font-semibold text-indigo-200 mb-2">
                        <span>🕒 Quick Action: Clock In</span>
                      </div>
                      {actionStatus[i] === "success" ? (
                        <div className="w-full py-2 bg-emerald-600/30 border border-emerald-500/50 text-emerald-300 rounded-lg text-xs font-semibold text-center">
                          ✅ Checked In
                        </div>
                      ) : (
                        <button
                          disabled={actionStatus[i] === "loading"}
                          onClick={() => executeCheckInAction(i)}
                          className="w-full py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-lg text-xs font-semibold shadow transition disabled:opacity-50"
                        >
                          {actionStatus[i] === "loading" ? "Recording..." : "⚡ Punch In Now"}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Timestamp */}
                  <span
                    className={`text-[10px] mt-1.5 block text-right ${
                      m.role === "user" ? "text-indigo-200/70" : "text-slate-400"
                    }`}
                  >
                    {m.time}
                  </span>
                </div>
              </div>
            ))}

            {/* Typing / Thinking indicator */}
            {loading && (
              <div className="flex items-center gap-2 p-3 glass-card rounded-2xl w-fit border border-indigo-500/20">
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                <span className="text-xs text-indigo-300 font-medium ml-1.5">Analyzing HR records...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Pills */}
          <div className="px-3 py-2 bg-slate-900/90 border-t border-white/5 overflow-x-auto flex gap-1.5 custom-scrollbar">
            {promptChips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => ask(chip.query)}
                className="whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-medium text-indigo-200 aurora-pill-gradient transition-all flex items-center gap-1 shadow-sm"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Input & Voice Control Bar */}
          <div className="p-3 bg-slate-900 border-t border-indigo-500/20 flex items-center gap-2">
            {/* Voice Microphone Input */}
            <button
              onClick={toggleListening}
              title={isListening ? "Stop listening" : "Speak to AI"}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition shadow ${
                isListening
                  ? "bg-red-500 text-white animate-pulse"
                  : "bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30"
              }`}
            >
              {isListening ? (
                <div className="flex items-center gap-0.5 h-4">
                  <span className="w-0.5 bg-white rounded audio-bar"></span>
                  <span className="w-0.5 bg-white rounded audio-bar"></span>
                  <span className="w-0.5 bg-white rounded audio-bar"></span>
                </div>
              ) : (
                "🎙️"
              )}
            </button>

            {/* Input field */}
            <div className="flex-1 relative">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && ask()}
                placeholder={isListening ? "Listening to your voice..." : "Ask balance, apply leave, policy..."}
                disabled={loading}
                className="w-full text-sm bg-slate-950/80 text-white placeholder-slate-400 px-3.5 py-2.5 rounded-xl border border-indigo-500/30 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 transition"
              />
            </div>

            {/* Send button */}
            <button
              onClick={() => ask()}
              disabled={!question.trim() || loading}
              className="w-10 h-10 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white flex items-center justify-center font-bold disabled:opacity-40 transition shadow-md"
            >
              ➤
            </button>
          </div>
        </div>
      )}

      {/* Floating Launcher Bubble (Unopened State) */}
      <button
        onClick={() => setOpen(!open)}
        className="group relative w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white shadow-[0_10px_35px_rgba(99,102,241,0.5)] hover:shadow-[0_15px_45px_rgba(168,85,247,0.7)] flex items-center justify-center text-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 glow-border"
      >
        {/* Animated halo pulses */}
        <span className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-indigo-500 to-pink-500 opacity-40 blur group-hover:opacity-75 transition duration-500 animate-pulse-slow"></span>

        <span className="relative z-10 flex items-center justify-center font-display font-bold">
          {open ? "✕" : "💬"}
        </span>

        {/* Unread / AI Online Indicator Pill */}
        {!open && (
          <span className="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-bold text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-widest shadow-md border-2 border-slate-900">
            AI
          </span>
        )}
      </button>
    </div>
  );
}

