"use client";

import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase =
  | "landing" | "workspace" | "upload"
  | "ingesting" | "map" | "insight" | "intelligence";

type ContractType = "employment" | "rental" | "freelance" | "service" | "other";

interface AnalyzedContract {
  id: string; name: string; type: ContractType;
  uploadedAt: number; obligationCount: number; vulnerabilityCount: number;
}

interface UserSession {
  id: string; shortId: string; createdAt: number; contracts: AnalyzedContract[];
}

// ─── Content ──────────────────────────────────────────────────────────────────

const obligations = [
  { id: "noncompete",  label: "Non-compete",          detail: "18 months · 50-mile radius", risk: "high",   x: 50, y: 10 },
  { id: "ip",          label: "IP assignment",         detail: "All work product",            risk: "high",   x: 80, y: 23 },
  { id: "autorenewal", label: "Auto-renewal",          detail: "12-month cycles",             risk: "medium", x: 83, y: 57 },
  { id: "termination", label: "Termination",           detail: "14 days notice",              risk: "medium", x: 62, y: 85 },
  { id: "arbitration", label: "Arbitration",           detail: "No class action",             risk: "medium", x: 25, y: 82 },
  { id: "amendment",   label: "Unilateral amendments", detail: "No consent required",         risk: "high",   x: 15, y: 44 },
] as const;

// Spatial clause positions for the ingestion animation
const clauses = [
  { text: "Non-compete clause",    primary: true,  x: "5%",   y: "8%",  delay: 260 },
  { text: "IP assignment",         primary: true,  x: "56%",  y: "5%",  delay: 580 },
  { text: "Unilateral amendments", primary: true,  x: "7%",   y: "50%", delay: 900 },
  { text: "Termination",           primary: false, x: "72%",  y: "36%", delay: 1350 },
  { text: "Auto-renewal",          primary: false, x: "30%",  y: "76%", delay: 1520 },
  { text: "Arbitration required",  primary: false, x: "54%",  y: "62%", delay: 1690 },
  { text: "Confidentiality",       primary: false, x: "12%",  y: "86%", delay: 1810 },
  { text: "Governing law",         primary: false, x: "80%",  y: "78%", delay: 1890 },
  { text: "Force majeure",         primary: false, x: "43%",  y: "90%", delay: 1960 },
  { text: "Indemnification",       primary: false, x: "6%",   y: "70%", delay: 2030 },
  { text: "Data processing",       primary: false, x: "86%",  y: "56%", delay: 2090 },
  { text: "Notice: 14 days",       primary: false, x: "36%",  y: "58%", delay: 2150 },
] as const;

const globalPatterns = [
  { id: "term",      category: "Employment", count: 847, rising: true,
    headline: "Termination asymmetry is the most common hidden exposure",
    detail: "7 of 10 employment agreements give employers a 14-day exit window while requiring 30+ days from employees." },
  { id: "nonc",      category: "Employment", count: 312, rising: true,
    headline: "Non-compete durations have grown 34% since 2022",
    detail: "The average clause has extended from 9 to 14 months. 18-month clauses are now common across most sectors." },
  { id: "unilat",   category: "Service",    count: 205, rising: false,
    headline: "Unilateral amendment rights appear in 12% of agreements",
    detail: "Disproportionately common in SaaS and service contracts — rarely disclosed clearly to signatories." },
  { id: "ip",        category: "Employment", count: 634, rising: true,
    headline: "IP clauses routinely exceed employment scope",
    detail: "94% of uploaded employment agreements assign all work product — including personal projects — to the employer." },
] as const;

const knowledgeDocs = [
  "EU Directive 2019/1023 — Restructuring",
  "UK Employment Rights Act 1996",
  "California AB5 — Worker Classification",
];

// ─── Session ──────────────────────────────────────────────────────────────────

function shortId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function loadSession(): UserSession {
  if (typeof window === "undefined")
    return { id: "ssr", shortId: "000000", createdAt: 0, contracts: [] };
  try {
    const raw = localStorage.getItem("atlas_session");
    if (raw) return JSON.parse(raw) as UserSession;
  } catch {}
  const s: UserSession = { id: `a_${Date.now()}`, shortId: shortId(), createdAt: Date.now(), contracts: [] };
  localStorage.setItem("atlas_session", JSON.stringify(s));
  return s;
}

function saveSession(s: UserSession) {
  if (typeof window !== "undefined") localStorage.setItem("atlas_session", JSON.stringify(s));
}

// ─── Motion ───────────────────────────────────────────────────────────────────

const E = [0.22, 0.1, 0.28, 1.0] as [number, number, number, number];

const page = {
  initial:    { opacity: 0, y: 36, filter: "blur(8px)" },
  animate:    { opacity: 1, y: 0,  filter: "blur(0px)" },
  exit:       { opacity: 0, y: -22, filter: "blur(5px)" },
  transition: { duration: 0.95, ease: E },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function Home() {
  const [phase, setPhase]               = useState<Phase>("landing");
  const [session, setSession]           = useState<UserSession | null>(null);
  const [file, setFile]                 = useState<File | null>(null);
  const [dragging, setDragging]         = useState(false);
  const [progress, setProgress]         = useState(0);
  const [visibleClauses, setVisible]    = useState<Set<number>>(new Set());
  const [activeNode, setActiveNode]     = useState<string | null>(null);
  const [showKnowledge, setShowKb]      = useState(false);
  const [kbFile, setKbFile]             = useState<File | null>(null);
  const [kbAbsorbing, setKbAbsorbing]   = useState(false);

  const inputRef   = useRef<HTMLInputElement>(null);
  const kbInputRef = useRef<HTMLInputElement>(null);
  const snapSession = useRef<UserSession | null>(null);
  const snapFile    = useRef<File | null>(null);

  useEffect(() => { snapSession.current = session; }, [session]);
  useEffect(() => { snapFile.current = file; }, [file]);

  // ── Session init ──────────────────────────────────────────────────
  useEffect(() => { setSession(loadSession()); }, []);

  // ── Cursor tracking → spring-smoothed ────────────────────────────
  const rawX = useMotionValue(0.5);
  const rawY = useMotionValue(0.5);
  const cx   = useSpring(rawX, { stiffness: 28, damping: 28, mass: 0.6 });
  const cy   = useSpring(rawY, { stiffness: 28, damping: 28, mass: 0.6 });

  // Orb 1 follows cursor (warmth, top-left)
  const orb1x = useTransform(cx, [0, 1], ["-6%",  "10%"]);
  const orb1y = useTransform(cy, [0, 1], ["-4%",   "6%"]);
  // Orb 2 moves opposite (cool, top-right)
  const orb2x = useTransform(cx, [0, 1], [ "5%", "-8%"]);
  const orb2y = useTransform(cy, [0, 1], [ "3%", "-5%"]);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      rawX.set(e.clientX / window.innerWidth);
      rawY.set(e.clientY / window.innerHeight);
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, [rawX, rawY]);

  // ── Ingestion choreography ────────────────────────────────────────
  useEffect(() => {
    if (phase !== "ingesting") return;
    setProgress(0);
    setVisible(new Set());

    const timers: ReturnType<typeof setTimeout>[] = [];

    clauses.forEach((c, i) => {
      timers.push(setTimeout(() => setVisible(prev => new Set([...prev, i])), c.delay));
    });

    const prog = setInterval(() => setProgress(p => Math.min(p + 1, 100)), 40);

    timers.push(setTimeout(() => {
      const s = snapSession.current;
      const f = snapFile.current;
      if (s) {
        const contract: AnalyzedContract = {
          id: `c_${Date.now()}`,
          name: f?.name?.replace(/\.[^/.]+$/, "") ?? "Employment Agreement",
          type: "employment", uploadedAt: Date.now(),
          obligationCount: 6, vulnerabilityCount: 3,
        };
        const updated = { ...s, contracts: [...s.contracts, contract] };
        setSession(updated);
        saveSession(updated);
      }
      setPhase("map");
    }, 4400));

    return () => { timers.forEach(clearTimeout); clearInterval(prog); };
  }, [phase]);

  // ── Handlers ─────────────────────────────────────────────────────
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0]; if (f) setFile(f);
  };

  const startNewSession = () => {
    const s: UserSession = { id: `a_${Date.now()}`, shortId: shortId(), createdAt: Date.now(), contracts: [] };
    saveSession(s); setSession(s); setFile(null); setPhase("landing");
  };

  const absorb = (f: File) => {
    setKbFile(f); setKbAbsorbing(true);
    setTimeout(() => setKbAbsorbing(false), 3200);
  };

  const contractName =
    file?.name?.replace(/\.[^/.]+$/, "") ??
    session?.contracts.at(-1)?.name ??
    "Employment Agreement";

  const totalAnalyzed = 2847 + (session?.contracts.length ?? 0);

  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen bg-[#F6F4F0] text-[#15120E]">

      {/* ── AMBIENT LAYER ─────────────────────────────────────────────
          Cursor-reactive orbs. Always present, always breathing.       */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        {/* Warm orb — follows cursor */}
        <motion.div
          className="orb-breathe absolute -top-72 -left-32 h-[800px] w-[800px] rounded-full bg-amber-100/38 blur-[180px]"
          style={{ x: orb1x, y: orb1y }}
        />
        {/* Cool orb — counter-cursor */}
        <motion.div
          className="absolute -top-24 right-[2%] h-[580px] w-[580px] rounded-full bg-stone-200/28 blur-[150px]"
          style={{ x: orb2x, y: orb2y }}
          animate={{ scale: [1, 1.06, 1], opacity: [0.28, 0.44, 0.28] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 5 }}
        />
        {/* Low ground warmth */}
        <motion.div
          className="orb-drift absolute bottom-[-80px] left-[24%] h-[420px] w-[420px] rounded-full bg-amber-50/45 blur-[120px]"
          style={{ animationDelay: "8s" }}
        />
      </div>

      {/* ── GHOST GRAPH — visible only on landing, large screens ──── */}
      <AnimatePresence>
        {phase === "landing" && (
          <motion.div
            className="pointer-events-none fixed right-[-4%] top-[8%] hidden h-[560px] w-[560px] opacity-0 lg:block"
            initial={{ opacity: 0 }} animate={{ opacity: 0.055 }} exit={{ opacity: 0 }}
            transition={{ duration: 3, delay: 1.6 }}
          >
            <svg viewBox="0 0 100 100" className="h-full w-full">
              {obligations.map(o => (
                <line key={o.id} x1="50" y1="50" x2={o.x} y2={o.y}
                  stroke="#15120E" strokeWidth="0.4"/>
              ))}
              {obligations.map(o => (
                <circle key={o.id} cx={o.x} cy={o.y} r="1.2" fill="#15120E" />
              ))}
              <circle cx="50" cy="50" r="2.2" fill="#15120E" />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SESSION WORDMARK ──────────────────────────────────────── */}
      {session && (
        <motion.div className="fixed left-7 top-7 z-50 flex items-center gap-3"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 1.6 }}
        >
          <button onClick={() => setPhase("landing")}
            className="text-[12px] font-medium uppercase tracking-[0.16em] text-[#15120E]/38
                       transition-colors duration-500 hover:text-[#15120E]">
            Atlas
          </button>
          <AnimatePresence>
            {phase !== "landing" && (
              <motion.span
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }} transition={{ duration: 0.4 }}
                className="font-mono text-[10px] tracking-[0.18em] text-[#15120E]/18"
              >
                {session.shortId}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ── TOP-RIGHT NAV ─────────────────────────────────────────── */}
      <AnimatePresence>
        {phase !== "landing" && session && (
          <motion.div className="fixed right-7 top-7 z-50 flex items-center gap-6"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <button onClick={() => setShowKb(true)}
              className="text-[10px] uppercase tracking-[0.24em] text-[#15120E]/22
                         transition-colors duration-300 hover:text-[#15120E]/52">
              Knowledge
            </button>
            {(session.contracts.length ?? 0) > 0 && (
              <button onClick={() => setPhase("workspace")}
                className="text-[10px] uppercase tracking-[0.24em] text-[#15120E]/22
                           transition-colors duration-300 hover:text-[#15120E]/52">
                {session.contracts.length}&thinsp;
                {session.contracts.length === 1 ? "agreement" : "agreements"}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MAIN ──────────────────────────────────────────────────── */}
      <main className="relative z-10 mx-auto max-w-5xl px-6 sm:px-10 lg:px-14">
        <AnimatePresence mode="wait">

          {/* ══ LANDING ════════════════════════════════════════════ */}
          {phase === "landing" && (
            <motion.div key="landing" {...page}
              className="flex min-h-screen flex-col justify-center pb-28"
            >
              <div className="max-w-3xl space-y-14">

                {/* Label */}
                <motion.p className="text-[10px] uppercase tracking-[0.36em] text-[#15120E]/26"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ duration: 1.1, delay: 0.32 }}
                >
                  Contractual intelligence
                </motion.p>

                {/* Hero headline — enormous scale contrast */}
                <motion.h1
                  className="space-y-1"
                  initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1.2, delay: 0.44, ease: E }}
                >
                  <span className="block text-[clamp(3.8rem,9.5vw,8rem)] font-extralight
                                   leading-[0.97] tracking-[-0.055em] text-[#15120E]">
                    Every agreement
                  </span>
                  <span className="block text-[clamp(3.8rem,9.5vw,8rem)] font-extralight
                                   leading-[0.97] tracking-[-0.055em] text-[#15120E]/24">
                    contains asymmetry.
                  </span>
                </motion.h1>

                {/* Sub */}
                <motion.p
                  className="max-w-[420px] text-[1.15rem] font-light leading-[1.9] text-[#15120E]/40"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ duration: 1, delay: 0.78 }}
                >
                  Atlas surfaces obligations, exposure, and leverage before they become consequence.
                </motion.p>

                {/* CTA */}
                <motion.div className="flex flex-wrap items-center gap-7"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 1.1 }}
                >
                  <button onClick={() => setPhase("upload")}
                    className="group inline-flex items-center gap-3 rounded-full bg-[#15120E] px-8 py-[15px]
                               text-[13px] font-medium text-[#F6F4F0] transition-all duration-500
                               hover:bg-[#15120E]/78 active:scale-[0.98]">
                    Upload an agreement
                    <span className="text-[#F6F4F0]/28 transition-transform duration-500
                                     group-hover:translate-x-0.5">→</span>
                  </button>
                  {(session?.contracts.length ?? 0) > 0 && (
                    <button onClick={() => setPhase("workspace")}
                      className="text-[13px] text-[#15120E]/32 transition-colors hover:text-[#15120E]/60">
                      Your workspace
                    </button>
                  )}
                </motion.div>

                {/* Intelligence signal */}
                <motion.div
                  className="max-w-[480px] space-y-2.5 border-t border-[#15120E]/6 pt-10"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ duration: 1, delay: 1.45 }}
                >
                  <p className="text-[9px] uppercase tracking-[0.34em] text-[#15120E]/20">
                    Collective corpus · {totalAnalyzed.toLocaleString()} agreements
                  </p>
                  <p className="text-[13px] font-light leading-7 text-[#15120E]/32">
                    7 of 10 employment agreements contain asymmetrical termination protections.
                    Non-compete durations have grown 34% since 2022.
                  </p>
                </motion.div>

              </div>
            </motion.div>
          )}

          {/* ══ WORKSPACE ══════════════════════════════════════════ */}
          {phase === "workspace" && (
            <motion.div key="workspace" {...page}
              className="min-h-screen space-y-16 py-28"
            >
              <motion.div className="max-w-xl space-y-4"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, ease: E }}
              >
                <p className="text-[10px] uppercase tracking-[0.32em] text-[#15120E]/25">Your workspace</p>
                <h2 className="text-[clamp(2.6rem,6vw,4.5rem)] font-extralight tracking-[-0.04em] text-[#15120E]">
                  Session {session?.shortId}
                </h2>
                <p className="text-lg font-light text-[#15120E]/40">
                  {(session?.contracts.length ?? 0) > 0
                    ? `${session!.contracts.length} agreement${session!.contracts.length > 1 ? "s" : ""} analyzed. Private to this session.`
                    : "No agreements yet."}
                </p>
              </motion.div>

              {(session?.contracts.length ?? 0) > 0 && (
                <div className="max-w-xl">
                  {session!.contracts.map((c, i) => (
                    <motion.div key={c.id}
                      className="flex items-center justify-between border-b border-[#15120E]/5
                                 py-7 first:border-t first:border-t-[#15120E]/5"
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: i * 0.08 }}
                    >
                      <div className="space-y-1">
                        <p className="text-[13px] font-medium text-[#15120E]">{c.name}</p>
                        <p className="text-[11px] text-[#15120E]/30">
                          {c.obligationCount} obligations · {c.vulnerabilityCount} asymmetries
                        </p>
                      </div>
                      <button onClick={() => setPhase("map")}
                        className="text-[11px] text-[#15120E]/25 transition-colors hover:text-[#15120E]/58">
                        View →
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}

              <motion.div className="flex flex-wrap items-center gap-6"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.4 }}
              >
                <button onClick={() => setPhase("upload")}
                  className="group inline-flex items-center gap-3 rounded-full bg-[#15120E] px-8 py-[15px]
                             text-[13px] font-medium text-[#F6F4F0] transition-all duration-500
                             hover:bg-[#15120E]/78 active:scale-[0.98]">
                  Upload agreement
                  <span className="text-[#F6F4F0]/28 transition-transform duration-500
                                   group-hover:translate-x-0.5">→</span>
                </button>
                <button onClick={() => setPhase("intelligence")}
                  className="text-[13px] text-[#15120E]/32 transition-colors hover:text-[#15120E]/58">
                  Collective intelligence →
                </button>
                <button onClick={startNewSession}
                  className="text-[13px] text-[#15120E]/20 transition-colors hover:text-[#15120E]/42">
                  New session
                </button>
              </motion.div>
            </motion.div>
          )}

          {/* ══ UPLOAD ═════════════════════════════════════════════ */}
          {phase === "upload" && (
            <motion.div key="upload" {...page}
              className="flex min-h-screen flex-col justify-center pb-28"
            >
              <div className="w-full max-w-xl space-y-12">
                <div className="space-y-5">
                  <p className="text-[10px] uppercase tracking-[0.32em] text-[#15120E]/25">Upload</p>
                  <h2 className="text-[clamp(3rem,7vw,5.5rem)] font-extralight tracking-[-0.046em]
                                 leading-[1.02] text-[#15120E]">
                    Your agreement.
                  </h2>
                  <p className="text-[1.05rem] font-light leading-[1.9] text-[#15120E]/38">
                    Employment, rental, freelance, or service —
                    <br />Atlas reads any agreement.
                  </p>
                </div>

                <input ref={inputRef} type="file" accept=".pdf,.doc,.docx,.txt" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f); }}
                />

                {/* Drop zone — glass surface */}
                <motion.div
                  onDrop={onDrop}
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onClick={() => inputRef.current?.click()}
                  animate={{
                    borderColor: dragging
                      ? "rgba(192,144,96,0.45)"
                      : file ? "rgba(21,18,14,0.12)" : "rgba(21,18,14,0.065)",
                  }}
                  transition={{ duration: 0.3 }}
                  className="glass-surface-subtle relative cursor-pointer overflow-hidden
                             rounded-[24px] border px-10 py-[52px]"
                >
                  <AnimatePresence mode="wait">
                    {file ? (
                      <motion.div key="sel"
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.38 }}
                        className="flex items-center gap-5"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center
                                        rounded-xl bg-[#15120E]/5">
                          <svg width="13" height="16" viewBox="0 0 13 16" fill="none">
                            <path d="M7.5 1H2.5C2 1 1.5 1.4 1.5 2v12c0 .6.4 1 1 1h9c.6 0 1-.4 1-1V5.5L7.5 1z"
                              stroke="#15120E" strokeWidth="0.9" strokeLinejoin="round" opacity=".4"/>
                            <path d="M7.5 1v4.5H12" stroke="#15120E" strokeWidth="0.9"
                              strokeLinejoin="round" opacity=".4"/>
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium text-[#15120E]">
                            {file.name}
                          </p>
                          <p className="mt-0.5 text-[11px] text-[#15120E]/30">
                            {(file.size / 1024).toFixed(0)} KB
                          </p>
                        </div>
                        <button onClick={e => { e.stopPropagation(); setFile(null); }}
                          className="text-lg leading-none text-[#15120E]/20
                                     transition-colors hover:text-[#15120E]/48">×</button>
                      </motion.div>
                    ) : (
                      <motion.div key="empty"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="text-center"
                      >
                        <p className="text-[1.2rem] font-extralight text-[#15120E]/22">
                          Drop your contract here
                        </p>
                        <p className="mt-2 text-[11px] text-[#15120E]/16">
                          PDF · DOCX · TXT · or click to browse
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                <div className="flex flex-wrap items-center gap-5">
                  <AnimatePresence>
                    {file && (
                      <motion.button
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.42 }}
                        onClick={() => setPhase("ingesting")}
                        className="group inline-flex items-center gap-3 rounded-full bg-[#15120E] px-8 py-[15px]
                                   text-[13px] font-medium text-[#F6F4F0] transition-all duration-500
                                   hover:bg-[#15120E]/78 active:scale-[0.98]"
                      >
                        Analyze
                        <span className="text-[#F6F4F0]/28 transition-transform duration-500
                                         group-hover:translate-x-0.5">→</span>
                      </motion.button>
                    )}
                  </AnimatePresence>
                  <button onClick={() => setPhase("ingesting")}
                    className="text-[13px] text-[#15120E]/22 transition-colors hover:text-[#15120E]/48">
                    Use demo agreement
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ══ INGESTING ══════════════════════════════════════════ */}
          {phase === "ingesting" && (
            <motion.div key="ingesting" {...page}
              className="flex min-h-screen flex-col justify-center pb-28"
            >
              <div className="w-full max-w-3xl space-y-14">
                <div className="space-y-3">
                  <p className="text-[10px] uppercase tracking-[0.32em] text-[#15120E]/25">
                    Analysis
                  </p>
                  <h2 className="text-[clamp(3rem,7vw,5.5rem)] font-extralight
                                 tracking-[-0.046em] leading-[1.02] text-[#15120E]">
                    Reading.
                  </h2>
                </div>

                {/* ── Spatial clause extraction — desktop ── */}
                <div className="relative hidden h-[360px] w-full overflow-hidden md:block">
                  {clauses.map((c, i) => (
                    <AnimatePresence key={c.text}>
                      {visibleClauses.has(i) && (
                        <motion.span
                          className={`absolute font-extralight text-[#15120E] ${
                            c.primary
                              ? "text-[1.35rem] opacity-80"
                              : "text-[0.8rem] opacity-25"
                          }`}
                          style={{ left: c.x, top: c.y }}
                          initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
                          animate={{
                            opacity: c.primary ? 0.8 : 0.25,
                            y: 0, filter: "blur(0px)",
                          }}
                          transition={{ duration: 0.65, ease: E }}
                        >
                          {c.text}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  ))}
                </div>

                {/* ── Mobile: simple stacked reveal ── */}
                <div className="space-y-3 md:hidden">
                  {clauses.filter(c => c.primary).map((c, i) => (
                    <AnimatePresence key={c.text}>
                      {visibleClauses.has(i) && (
                        <motion.p
                          className="text-xl font-extralight text-[#15120E]/78"
                          initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.55, ease: E }}
                        >
                          {c.text}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  ))}
                </div>

                {/* Progress */}
                <div className="space-y-3">
                  <div className="relative h-px w-full overflow-hidden rounded-full bg-[#15120E]/6">
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full bg-[#15120E]/18"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-[#15120E]/25">
                    {progress < 26 ? "Extracting clauses" :
                     progress < 55 ? "Mapping obligations" :
                     progress < 80 ? "Identifying asymmetries" :
                     "Surfacing vulnerabilities"}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ══ MAP ════════════════════════════════════════════════ */}
          {phase === "map" && (
            <motion.div key="map" {...page}
              className="min-h-screen space-y-14 py-28"
            >
              <motion.div className="max-w-2xl space-y-4"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, ease: E }}
              >
                <p className="text-[10px] uppercase tracking-[0.32em] text-[#15120E]/25">
                  Obligation map
                </p>
                <h2 className="text-[clamp(2.6rem,6vw,4.8rem)] font-extralight
                               tracking-[-0.045em] leading-[1.04] text-[#15120E]">
                  {contractName}
                </h2>
                <p className="text-[#15120E]/32 text-lg font-extralight tracking-[-0.01em]">
                  6 obligations · 3 asymmetries detected
                </p>
              </motion.div>

              {/* ── Living graph — desktop ────────────────────────── */}
              <div className="relative hidden h-[560px] w-full md:block">

                {/* Glass background + atmospheric fog */}
                <div className="glass-surface-subtle graph-fog absolute inset-0 rounded-[36px]" />

                {/* Subtle corner depth shadows */}
                <div className="pointer-events-none absolute inset-0 rounded-[36px]
                                shadow-[inset_0_0_80px_rgba(21,18,14,0.025)]" />

                {/* SVG — connection paths with animated draw */}
                <svg className="absolute inset-0 h-full w-full rounded-[36px]"
                  viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden
                >
                  {/* Radiating rings from center */}
                  {[4, 8, 13].map((r, i) => (
                    <motion.circle key={r} cx="50" cy="50" r={r}
                      fill="none" stroke="rgba(21,18,14,0.06)" strokeWidth="0.2"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 1.2, delay: 0.1 + i * 0.2, ease: E }}
                    />
                  ))}

                  {/* Connection paths */}
                  {obligations.map((o, i) => {
                    const isActive  = activeNode === o.id;
                    const hasActive = activeNode !== null;
                    return (
                      <g key={o.id}>
                        {/* Base path — always visible */}
                        <motion.path
                          d={`M 50 50 L ${o.x} ${o.y}`}
                          fill="none"
                          stroke="rgba(21,18,14,0.055)"
                          strokeWidth="0.22"
                          initial={{ pathLength: 0, opacity: 0 }}
                          animate={{ pathLength: 1, opacity: hasActive && !isActive ? 0.3 : 1 }}
                          transition={{ duration: 1.5, delay: 0.28 + i * 0.16, ease: E }}
                        />
                        {/* Activation path — appears on hover */}
                        <AnimatePresence>
                          {isActive && (
                            <motion.path
                              d={`M 50 50 L ${o.x} ${o.y}`}
                              fill="none"
                              stroke={o.risk === "high"
                                ? "rgba(192,112,24,0.28)"
                                : "rgba(21,18,14,0.2)"}
                              strokeWidth="0.5"
                              initial={{ pathLength: 0, opacity: 0 }}
                              animate={{ pathLength: 1, opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.38, ease: "easeOut" }}
                            />
                          )}
                        </AnimatePresence>
                      </g>
                    );
                  })}
                </svg>

                {/* Center node */}
                <div className="absolute" style={{ left: "50%", top: "50%", transform: "translate(-50%,-50%)" }}>
                  <motion.div className="flex flex-col items-center gap-2"
                    initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1.0, ease: E }}
                  >
                    {/* Pulsing rings */}
                    <div className="relative flex items-center justify-center">
                      {[0, 1].map(i => (
                        <motion.div key={i}
                          className="absolute rounded-full border border-[#15120E]/8"
                          style={{ width: 24 + i * 14, height: 24 + i * 14 }}
                          animate={{ scale: [1, 1.6, 1], opacity: [0.08, 0, 0.08] }}
                          transition={{ duration: 3.5, delay: i * 1.4, repeat: Infinity, ease: "easeOut" }}
                        />
                      ))}
                      <motion.div
                        className="h-3 w-3 rounded-full bg-[#15120E]/14"
                        animate={{ scale: [1, 1.2, 1], opacity: [0.14, 0.28, 0.14] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                      />
                    </div>
                    <p className="whitespace-nowrap text-[9px] uppercase tracking-[0.26em] text-[#15120E]/25">
                      {contractName}
                    </p>
                  </motion.div>
                </div>

                {/* Obligation nodes */}
                {obligations.map((o, i) => {
                  const isActive  = activeNode === o.id;
                  const hasActive = activeNode !== null;
                  return (
                    <motion.div key={o.id} className="absolute cursor-pointer"
                      style={{ left: `${o.x}%`, top: `${o.y}%`, transform: "translate(-50%,-50%)" }}
                      initial={{ opacity: 0, scale: 0.65, filter: "blur(6px)" }}
                      animate={{
                        opacity: hasActive && !isActive ? 0.35 : 1,
                        scale: 1, filter: "blur(0px)",
                      }}
                      transition={{ duration: 0.9, delay: 0.22 + i * 0.12, ease: E }}
                      onHoverStart={() => setActiveNode(o.id)}
                      onHoverEnd={() => setActiveNode(null)}
                      whileHover={{ scale: 1.12 }}
                    >
                      <div className="flex flex-col items-center gap-[5px] text-center">
                        {/* Node dot with pulse for high risk */}
                        <div className="relative flex items-center justify-center">
                          {o.risk === "high" && (
                            <motion.div
                              className="absolute h-4 w-4 rounded-full bg-amber-600/15"
                              animate={{ scale: [1, 1.8, 1], opacity: [0.15, 0, 0.15] }}
                              transition={{ duration: 2.8, repeat: Infinity, ease: "easeOut", delay: i * 0.6 }}
                            />
                          )}
                          <motion.div
                            className={`h-[5px] w-[5px] rounded-full ${
                              o.risk === "high" ? "bg-amber-700/55" : "bg-[#15120E]/18"
                            }`}
                            animate={isActive ? { scale: [1, 1.4, 1] } : {}}
                            transition={{ duration: 0.5 }}
                          />
                        </div>
                        <p className={`whitespace-nowrap text-[11px] font-medium leading-none ${
                          o.risk === "high" ? "text-[#15120E]" : "text-[#15120E]/45"
                        }`}>
                          {o.label}
                        </p>
                        <p className="whitespace-nowrap text-[9px] text-[#15120E]/28 leading-none">
                          {o.detail}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* ── Mobile list ──────────────────────────────────── */}
              <div className="space-y-5 md:hidden">
                {obligations.map((o, i) => (
                  <motion.div key={o.id} className="flex items-start gap-4"
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: i * 0.08 }}
                  >
                    <div className={`mt-[7px] h-[4px] w-[4px] shrink-0 rounded-full
                      ${o.risk === "high" ? "bg-amber-700/55" : "bg-[#15120E]/18"}`}
                    />
                    <div>
                      <p className={`text-[13px] font-medium
                        ${o.risk === "high" ? "text-[#15120E]" : "text-[#15120E]/45"}`}>
                        {o.label}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#15120E]/28">{o.detail}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <motion.button onClick={() => setPhase("insight")}
                className="group inline-flex items-center gap-3 rounded-full bg-[#15120E] px-8 py-[15px]
                           text-[13px] font-medium text-[#F6F4F0] transition-all duration-500
                           hover:bg-[#15120E]/78 active:scale-[0.98]"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 1.1 }}
                whileHover={{ scale: 0.99 }}
              >
                Surface primary asymmetry
                <span className="text-[#F6F4F0]/28 transition-transform duration-500
                                 group-hover:translate-x-0.5">→</span>
              </motion.button>
            </motion.div>
          )}

          {/* ══ INSIGHT ════════════════════════════════════════════ */}
          {phase === "insight" && (
            <motion.div key="insight" {...page}
              className="min-h-screen space-y-20 py-28"
            >
              <motion.div className="max-w-3xl space-y-5"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, ease: E }}
              >
                <p className="text-[10px] uppercase tracking-[0.32em] text-[#15120E]/25">
                  Primary finding
                </p>
                <h2 className="text-[clamp(2.8rem,6.5vw,5rem)] font-extralight
                               leading-[1.03] tracking-[-0.05em] text-[#15120E]">
                  Asymmetry
                  <br />
                  <span className="text-[#15120E]/26">detected.</span>
                </h2>
              </motion.div>

              <div className="max-w-3xl space-y-14">
                <motion.div className="space-y-6"
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.85, delay: 0.36, ease: E }}
                >
                  <p className="text-[1.3rem] font-extralight leading-[1.65] text-[#15120E]">
                    Your non-compete extends 18 months beyond industry standard with no carve-out for remote work.
                  </p>
                  <p className="text-[1.05rem] font-light leading-[1.85] text-[#15120E]/42">
                    Combined with unilateral amendment rights — permitting modification after signing without consent — this creates a compound exposure Atlas observes in 8% of agreements.
                  </p>
                </motion.div>

                {/* Glass comparison table */}
                <motion.div
                  className="glass-surface overflow-hidden rounded-[24px] p-8"
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.6, ease: E }}
                >
                  {[
                    { label: "Non-compete",      yours: "18 months",                            norm: "6–12 months typical" },
                    { label: "Geographic scope", yours: "50-mile radius · no remote exception", norm: "89% include remote carve-outs" },
                    { label: "Amendment rights", yours: "Unilateral · no notice required",      norm: "12% of agreements allow this" },
                  ].map((row, i) => (
                    <motion.div key={row.label}
                      className="grid gap-2 border-b border-[#15120E]/5 py-5 last:border-b-0
                                 sm:grid-cols-3 sm:items-baseline sm:gap-7"
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.45, delay: 0.72 + i * 0.09 }}
                    >
                      <p className="text-[9.5px] uppercase tracking-[0.24em] text-[#15120E]/25">
                        {row.label}
                      </p>
                      <p className="text-[13px] font-medium text-[#15120E]">{row.yours}</p>
                      <p className="text-[12px] text-[#15120E]/35">{row.norm}</p>
                    </motion.div>
                  ))}
                </motion.div>
              </div>

              <motion.div className="flex flex-wrap items-center gap-6"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 1.15 }}
              >
                <button onClick={() => setPhase("intelligence")}
                  className="group inline-flex items-center gap-3 rounded-full bg-[#15120E] px-8 py-[15px]
                             text-[13px] font-medium text-[#F6F4F0] transition-all duration-500
                             hover:bg-[#15120E]/78 active:scale-[0.98]">
                  Collective intelligence
                  <span className="text-[#F6F4F0]/28 transition-transform duration-500
                                   group-hover:translate-x-0.5">→</span>
                </button>
                <button onClick={() => setPhase("workspace")}
                  className="text-[13px] text-[#15120E]/28 transition-colors hover:text-[#15120E]/55">
                  Your workspace
                </button>
              </motion.div>
            </motion.div>
          )}

          {/* ══ INTELLIGENCE ═══════════════════════════════════════ */}
          {phase === "intelligence" && (
            <motion.div key="intelligence" {...page}
              className="min-h-screen space-y-20 py-28"
            >
              <motion.div className="max-w-3xl space-y-5"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, ease: E }}
              >
                <p className="text-[10px] uppercase tracking-[0.32em] text-[#15120E]/25">
                  Collective corpus · {totalAnalyzed.toLocaleString()} agreements
                </p>
                <h2 className="text-[clamp(2.8rem,6.5vw,5rem)] font-extralight
                               leading-[1.03] tracking-[-0.05em] text-[#15120E]">
                  Patterns across
                  <br />
                  <span className="text-[#15120E]/26">all agreements.</span>
                </h2>
                <p className="text-[1.05rem] font-light text-[#15120E]/38">
                  Drawn from anonymized analysis. No personal data is shared.
                </p>
              </motion.div>

              {/* Intelligence stream */}
              <div className="max-w-3xl">
                {globalPatterns.map((p, i) => (
                  <motion.div key={p.id}
                    className="border-b border-[#15120E]/5 py-12 last:border-b-0"
                    initial={{ opacity: 0, y: 20, filter: "blur(5px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 0.75, delay: 0.18 + i * 0.15, ease: E }}
                  >
                    <div className="flex items-start gap-8">
                      <div className="w-16 shrink-0 space-y-1.5 pt-[2px]">
                        <p className="text-[9px] uppercase tracking-[0.24em] text-[#15120E]/22">
                          {p.category}
                        </p>
                        <p className="font-mono text-[10px] tabular-nums text-[#15120E]/16">
                          {p.count.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex-1 space-y-3">
                        <p className="text-[1.1rem] font-extralight leading-[1.5] text-[#15120E]">
                          {p.headline}
                        </p>
                        <p className="text-[14px] font-light leading-7 text-[#15120E]/40">
                          {p.detail}
                        </p>
                        {p.rising && (
                          <motion.p
                            className="text-[9px] uppercase tracking-[0.26em] text-amber-700/45"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            transition={{ duration: 0.6, delay: 0.55 + i * 0.15 }}
                          >
                            Increasing
                          </motion.p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <motion.div className="flex flex-wrap items-center gap-6"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 1.05 }}
              >
                <button onClick={() => { setFile(null); setPhase("upload"); }}
                  className="group inline-flex items-center gap-3 rounded-full bg-[#15120E] px-8 py-[15px]
                             text-[13px] font-medium text-[#F6F4F0] transition-all duration-500
                             hover:bg-[#15120E]/78 active:scale-[0.98]">
                  Analyze another agreement
                  <span className="text-[#F6F4F0]/28 transition-transform duration-500
                                   group-hover:translate-x-0.5">→</span>
                </button>
                <button onClick={() => setPhase("workspace")}
                  className="text-[13px] text-[#15120E]/28 transition-colors hover:text-[#15120E]/55">
                  Your workspace
                </button>
              </motion.div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* ── KNOWLEDGE OVERLAY ─────────────────────────────────────── */}
      <AnimatePresence>
        {showKnowledge && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.38 }}
          >
            {/* Scrim */}
            <motion.div
              className="absolute inset-0 bg-[#F6F4F0]/70 backdrop-blur-2xl"
              onClick={() => setShowKb(false)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            />

            {/* Sheet */}
            <motion.div
              className="glass-surface relative z-10 w-full max-w-[540px] overflow-hidden
                         rounded-t-[28px] px-10 py-12 sm:rounded-[28px]"
              initial={{ opacity: 0, y: 52, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.97 }}
              transition={{ duration: 0.52, ease: E }}
            >
              <div className="space-y-8">
                <div className="space-y-3">
                  <p className="text-[10px] uppercase tracking-[0.32em] text-[#15120E]/25">
                    Knowledge layer
                  </p>
                  <h3 className="text-[2rem] font-extralight tracking-[-0.035em] text-[#15120E]">
                    Atlas absorbs context.
                  </h3>
                  <p className="text-[14px] font-light leading-7 text-[#15120E]/40">
                    Upload labor protections, tenant rights, fairness frameworks, or regulatory guidance.
                  </p>
                </div>

                <input ref={kbInputRef} type="file" accept=".pdf,.doc,.docx,.txt"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) absorb(f); }}
                />

                <AnimatePresence mode="wait">
                  {kbAbsorbing ? (
                    <motion.div key="absorbing"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="space-y-5 rounded-[18px] bg-[#15120E]/3 px-6 py-7"
                    >
                      <p className="text-[13px] font-light text-[#15120E]/50">
                        Absorbing{kbFile ? ` ${kbFile.name}` : ""}
                      </p>
                      <div className="relative h-px w-full overflow-hidden rounded-full bg-[#15120E]/7">
                        <motion.div
                          className="absolute inset-y-0 left-0 h-full rounded-full bg-[#15120E]/22"
                          initial={{ width: "0%" }} animate={{ width: "100%" }}
                          transition={{ duration: 3, ease: [0.2, 0, 0.4, 1] }}
                        />
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div key="idle"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="space-y-4"
                    >
                      <button
                        onClick={() => kbInputRef.current?.click()}
                        className="glass-surface-subtle w-full cursor-pointer rounded-[18px]
                                   border border-[#15120E]/6 px-6 py-7 text-center
                                   transition-colors hover:bg-white/65"
                      >
                        <p className="text-[13px] font-light text-[#15120E]/30">
                          Upload a knowledge document
                        </p>
                        <p className="mt-1 text-[10px] text-[#15120E]/18">
                          Labor law · Tenant rights · Fairness frameworks
                        </p>
                      </button>

                      <div className="space-y-2 pt-1">
                        {knowledgeDocs.map((doc, i) => (
                          <motion.div key={i}
                            className="flex items-center gap-3 py-1"
                            initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.38, delay: i * 0.07 }}
                          >
                            <div className="h-[3px] w-[3px] shrink-0 rounded-full bg-[#15120E]/20" />
                            <p className="text-[11px] text-[#15120E]/36">{doc}</p>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button onClick={() => setShowKb(false)}
                  className="text-[11px] text-[#15120E]/22 transition-colors hover:text-[#15120E]/45">
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
