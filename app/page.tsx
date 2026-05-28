"use client";

import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase =
  | "landing"
  | "workspace"
  | "upload"
  | "ingesting"
  | "map"
  | "insight"
  | "intelligence";

type ContractType = "employment" | "rental" | "freelance" | "service" | "other";

interface AnalyzedContract {
  id: string;
  name: string;
  type: ContractType;
  uploadedAt: number;
  obligationCount: number;
  vulnerabilityCount: number;
}

interface UserSession {
  id: string;
  shortId: string;
  createdAt: number;
  contracts: AnalyzedContract[];
}

// ─── Content ──────────────────────────────────────────────────────────────────

const obligations = [
  { id: "noncompete",  label: "Non-compete",          detail: "18 months · 50-mile radius", risk: "high",   x: 50, y: 10 },
  { id: "ip",          label: "IP assignment",         detail: "All work product",            risk: "high",   x: 80, y: 22 },
  { id: "autorenewal", label: "Auto-renewal",          detail: "12-month cycles",             risk: "medium", x: 82, y: 58 },
  { id: "termination", label: "Termination",           detail: "14 days notice",              risk: "medium", x: 62, y: 86 },
  { id: "arbitration", label: "Arbitration",           detail: "No class action",             risk: "medium", x: 25, y: 82 },
  { id: "amendment",   label: "Unilateral amendments", detail: "No consent required",         risk: "high",   x: 16, y: 44 },
] as const;

// Primary clauses (appear first, prominent) and secondary (fill in after)
const primaryClauses  = ["Non-compete clause", "IP assignment", "Unilateral amendments"];
const secondaryClauses = [
  "Termination without cause", "Auto-renewal", "Arbitration required",
  "Confidentiality", "Governing law", "Force majeure",
  "Indemnification", "Data processing rights", "Notice: 14 days",
];

const globalPatterns = [
  {
    id: "term",
    category: "Employment",
    count: 847,
    headline: "Termination asymmetry is the most common hidden exposure",
    detail: "7 of 10 employment agreements give employers a 14-day exit window while requiring 30+ days from employees.",
    rising: true,
  },
  {
    id: "noncompete",
    category: "Employment",
    count: 312,
    headline: "Non-compete durations have grown 34% since 2022",
    detail: "The average clause has extended from 9 to 14 months across uploaded agreements. 18-month clauses are now common.",
    rising: true,
  },
  {
    id: "unilateral",
    category: "Service",
    count: 205,
    headline: "Unilateral amendment rights appear in 12% of agreements",
    detail: "Disproportionately common in SaaS and service contracts — and rarely disclosed clearly to signatories.",
    rising: false,
  },
  {
    id: "ip",
    category: "Employment",
    count: 634,
    headline: "IP clauses routinely exceed employment scope",
    detail: "94% of uploaded employment agreements assign all work product — including personal projects — to the employer.",
    rising: true,
  },
] as const;

const knowledgeDocs = [
  "EU Directive 2019/1023 — Restructuring",
  "UK Employment Rights Act 1996",
  "California AB5 — Worker Classification",
];

// ─── Session ──────────────────────────────────────────────────────────────────

function generateShortId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function loadSession(): UserSession {
  if (typeof window === "undefined") {
    return { id: "ssr", shortId: "000000", createdAt: 0, contracts: [] };
  }
  try {
    const raw = localStorage.getItem("atlas_session");
    if (raw) return JSON.parse(raw) as UserSession;
  } catch {}
  const s: UserSession = {
    id: `atlas_${Date.now()}`,
    shortId: generateShortId(),
    createdAt: Date.now(),
    contracts: [],
  };
  localStorage.setItem("atlas_session", JSON.stringify(s));
  return s;
}

function persistSession(s: UserSession) {
  if (typeof window !== "undefined") {
    localStorage.setItem("atlas_session", JSON.stringify(s));
  }
}

// ─── Motion ───────────────────────────────────────────────────────────────────

const EASE = [0.22, 0.1, 0.28, 1.0] as [number, number, number, number];

const page = {
  initial:    { opacity: 0, y: 32, filter: "blur(6px)" },
  animate:    { opacity: 1, y: 0,  filter: "blur(0px)" },
  exit:       { opacity: 0, y: -20, filter: "blur(4px)" },
  transition: { duration: 0.92, ease: EASE },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function Home() {
  const [phase, setPhase]             = useState<Phase>("landing");
  const [session, setSession]         = useState<UserSession | null>(null);
  const [file, setFile]               = useState<File | null>(null);
  const [dragging, setDragging]       = useState(false);
  const [progress, setProgress]       = useState(0);
  const [primaryVisible, setPrimary]  = useState<number[]>([]);
  const [secondaryVisible, setSecondary] = useState<number[]>([]);
  const [showKnowledge, setShowKnowledge]     = useState(false);
  const [knowledgeFile, setKnowledgeFile]     = useState<File | null>(null);
  const [knowledgeAbsorbing, setKnowledgeAbsorbing] = useState(false);

  const inputRef    = useRef<HTMLInputElement>(null);
  const kbInputRef  = useRef<HTMLInputElement>(null);
  // snapshot refs so the ingestion effect can read latest values without dep issues
  const sessionSnap = useRef<UserSession | null>(null);
  const fileSnap    = useRef<File | null>(null);

  useEffect(() => { sessionSnap.current = session; }, [session]);
  useEffect(() => { fileSnap.current = file; }, [file]);

  // Bootstrap session from localStorage once on mount
  useEffect(() => { setSession(loadSession()); }, []);

  // Ingestion choreography
  useEffect(() => {
    if (phase !== "ingesting") return;

    setProgress(0);
    setPrimary([]);
    setSecondary([]);

    // Primary clauses: stagger at 320 ms each
    const pTimers = primaryClauses.map((_, i) =>
      setTimeout(() => setPrimary(prev => [...prev, i]), 280 + i * 340)
    );

    // Secondary clauses: start after primaries, tighter stagger
    const sOffset = 280 + primaryClauses.length * 340 + 200;
    const sTimers = secondaryClauses.map((_, i) =>
      setTimeout(() => setSecondary(prev => [...prev, i]), sOffset + i * 160)
    );

    // Progress bar
    const progTimer = setInterval(
      () => setProgress(p => Math.min(p + 1, 100)),
      36
    );

    // Advance to map
    const advance = setTimeout(() => {
      const snap = sessionSnap.current;
      const f    = fileSnap.current;
      if (snap) {
        const contract: AnalyzedContract = {
          id: `c_${Date.now()}`,
          name: f?.name?.replace(/\.[^/.]+$/, "") ?? "Employment Agreement",
          type: "employment",
          uploadedAt: Date.now(),
          obligationCount: 6,
          vulnerabilityCount: 3,
        };
        const updated = { ...snap, contracts: [...snap.contracts, contract] };
        setSession(updated);
        persistSession(updated);
      }
      setPhase("map");
    }, 4200);

    return () => {
      pTimers.forEach(clearTimeout);
      sTimers.forEach(clearTimeout);
      clearInterval(progTimer);
      clearTimeout(advance);
    };
  }, [phase]);

  const handleFile = (f: File) => setFile(f);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const startNewSession = () => {
    const s: UserSession = {
      id: `atlas_${Date.now()}`,
      shortId: generateShortId(),
      createdAt: Date.now(),
      contracts: [],
    };
    persistSession(s);
    setSession(s);
    setFile(null);
    setPhase("landing");
  };

  const absorb = (f: File) => {
    setKnowledgeFile(f);
    setKnowledgeAbsorbing(true);
    setTimeout(() => setKnowledgeAbsorbing(false), 3200);
  };

  const contractName =
    file?.name?.replace(/\.[^/.]+$/, "") ??
    session?.contracts.at(-1)?.name ??
    "Employment Agreement";

  const totalAnalyzed = 2847 + (session?.contracts.length ?? 0);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="relative min-h-screen bg-[#F8F6F2] text-[#171310]">

      {/* ── Ambient atmosphere ────────────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <motion.div
          className="absolute -top-64 -left-24 h-[720px] w-[720px] rounded-full bg-amber-100/42 blur-[160px]"
          animate={{ scale: [1, 1.07, 1], opacity: [0.42, 0.62, 0.42] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -top-16 right-[4%] h-[520px] w-[520px] rounded-full bg-stone-200/30 blur-[140px]"
          animate={{ scale: [1, 1.05, 1], opacity: [0.25, 0.42, 0.25] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 5 }}
        />
        <motion.div
          className="absolute bottom-0 left-[28%] h-[400px] w-[400px] rounded-full bg-amber-50/50 blur-[110px]"
          animate={{ y: [0, -22, 0], opacity: [0.32, 0.52, 0.32] }}
          transition={{ duration: 24, repeat: Infinity, ease: "easeInOut", delay: 9 }}
        />
      </div>

      {/* ── Session wordmark ──────────────────────────────────────────── */}
      {session && (
        <motion.div
          className="fixed left-7 top-7 z-50 flex items-center gap-2.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.4 }}
        >
          <button
            onClick={() => setPhase("landing")}
            className="text-sm font-medium uppercase tracking-[0.15em] text-[#171310]/42 transition-colors duration-500 hover:text-[#171310]"
          >
            Atlas
          </button>
          <AnimatePresence>
            {phase !== "landing" && (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -4 }}
                transition={{ duration: 0.4 }}
                className="font-mono text-[11px] tracking-widest text-[#171310]/22"
              >
                {session.shortId}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ── Top-right nav ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {phase !== "landing" && session && (
          <motion.div
            className="fixed right-7 top-7 z-50 flex items-center gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <button
              onClick={() => setShowKnowledge(true)}
              className="text-[11px] uppercase tracking-[0.22em] text-[#171310]/25 transition-colors hover:text-[#171310]/55"
            >
              Knowledge
            </button>
            {session.contracts.length > 0 && (
              <button
                onClick={() => setPhase("workspace")}
                className="text-[11px] uppercase tracking-[0.22em] text-[#171310]/25 transition-colors hover:text-[#171310]/55"
              >
                {session.contracts.length}{" "}
                {session.contracts.length === 1 ? "agreement" : "agreements"}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main ──────────────────────────────────────────────────────── */}
      <main className="relative z-10 mx-auto max-w-5xl px-6 sm:px-10 lg:px-14">
        <AnimatePresence mode="wait">

          {/* LANDING ─────────────────────────────────────────────────── */}
          {phase === "landing" && (
            <motion.div key="landing" {...page}
              className="flex min-h-screen flex-col justify-center pb-24"
            >
              <div className="max-w-3xl space-y-12">
                <div className="space-y-4">
                  <motion.p
                    className="text-[11px] uppercase tracking-[0.35em] text-[#171310]/30"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 0.3 }}
                  >
                    Contractual intelligence
                  </motion.p>
                  <motion.h1
                    className="text-[clamp(3rem,7.5vw,5.75rem)] font-extralight leading-[1.04] tracking-[-0.048em] text-[#171310]"
                    initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1.15, delay: 0.42, ease: EASE }}
                  >
                    What is your contract
                    <br />
                    <span className="text-[#171310]/28">actually doing to you.</span>
                  </motion.h1>
                </div>

                <motion.p
                  className="max-w-[460px] text-xl font-light leading-[1.8] text-[#171310]/42"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ duration: 1, delay: 0.72 }}
                >
                  Atlas reads obligations, asymmetries, and hidden dependencies inside your agreements — and tells you what they mean.
                </motion.p>

                <motion.div
                  className="flex flex-wrap items-center gap-6"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 1.05 }}
                >
                  <button
                    onClick={() => setPhase("upload")}
                    className="group inline-flex items-center gap-3 rounded-full bg-[#171310] px-8 py-[14px] text-sm font-medium text-[#F8F6F2] transition-all duration-500 hover:bg-[#171310]/80 active:scale-[0.98]"
                  >
                    Upload an agreement
                    <span className="text-[#F8F6F2]/30 transition-transform duration-500 group-hover:translate-x-0.5">→</span>
                  </button>
                  {(session?.contracts.length ?? 0) > 0 && (
                    <button
                      onClick={() => setPhase("workspace")}
                      className="text-sm text-[#171310]/35 transition-colors hover:text-[#171310]/62"
                    >
                      Your workspace
                    </button>
                  )}
                </motion.div>

                {/* Collective intelligence teaser */}
                <motion.div
                  className="max-w-[520px] space-y-3 border-t border-[#171310]/6 pt-10"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ duration: 1, delay: 1.38 }}
                >
                  <p className="text-[10px] uppercase tracking-[0.32em] text-[#171310]/22">
                    Collective intelligence · {totalAnalyzed.toLocaleString()} agreements
                  </p>
                  <p className="text-[13px] font-light leading-7 text-[#171310]/35">
                    7 of 10 employment agreements contain asymmetrical termination protections. Non-compete durations have grown 34% since 2022.
                  </p>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* WORKSPACE ───────────────────────────────────────────────── */}
          {phase === "workspace" && (
            <motion.div key="workspace" {...page}
              className="min-h-screen space-y-16 py-28"
            >
              <motion.div className="max-w-xl space-y-4"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, ease: EASE }}
              >
                <p className="text-[11px] uppercase tracking-[0.32em] text-[#171310]/28">Your workspace</p>
                <h2 className="text-5xl font-extralight tracking-[-0.04em] text-[#171310] sm:text-6xl">
                  Session {session?.shortId}
                </h2>
                <p className="text-lg font-light text-[#171310]/42">
                  {session?.contracts.length
                    ? `${session.contracts.length} agreement${session.contracts.length > 1 ? "s" : ""} analyzed. Your data is private to this session.`
                    : "No agreements yet. Upload your first to begin."}
                </p>
              </motion.div>

              {/* Contract list */}
              {(session?.contracts.length ?? 0) > 0 && (
                <div className="max-w-xl">
                  {session!.contracts.map((c, i) => (
                    <motion.div key={c.id}
                      className="flex items-center justify-between border-b border-[#171310]/5 py-7 first:border-t first:border-t-[#171310]/5"
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: i * 0.08 }}
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-[#171310]">{c.name}</p>
                        <p className="text-xs text-[#171310]/32">
                          {c.obligationCount} obligations · {c.vulnerabilityCount} vulnerabilities
                        </p>
                      </div>
                      <button
                        onClick={() => setPhase("map")}
                        className="text-xs text-[#171310]/28 transition-colors hover:text-[#171310]/60"
                      >
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
                <button
                  onClick={() => setPhase("upload")}
                  className="group inline-flex items-center gap-3 rounded-full bg-[#171310] px-8 py-[14px] text-sm font-medium text-[#F8F6F2] transition-all duration-500 hover:bg-[#171310]/80 active:scale-[0.98]"
                >
                  Upload agreement
                  <span className="text-[#F8F6F2]/30 transition-transform duration-500 group-hover:translate-x-0.5">→</span>
                </button>
                <button
                  onClick={() => setPhase("intelligence")}
                  className="text-sm text-[#171310]/35 transition-colors hover:text-[#171310]/62"
                >
                  Collective intelligence →
                </button>
                <button
                  onClick={startNewSession}
                  className="text-sm text-[#171310]/22 transition-colors hover:text-[#171310]/45"
                >
                  New session
                </button>
              </motion.div>
            </motion.div>
          )}

          {/* UPLOAD ──────────────────────────────────────────────────── */}
          {phase === "upload" && (
            <motion.div key="upload" {...page}
              className="flex min-h-screen flex-col justify-center pb-24"
            >
              <div className="w-full max-w-xl space-y-12">
                <div className="space-y-5">
                  <p className="text-[11px] uppercase tracking-[0.32em] text-[#171310]/28">Upload</p>
                  <h2 className="text-5xl font-extralight tracking-[-0.04em] text-[#171310] sm:text-6xl">
                    Your agreement.
                  </h2>
                  <p className="text-lg font-light leading-[1.8] text-[#171310]/42">
                    Employment, rental, freelance, service — Atlas reads any agreement and surfaces what it asks of you.
                  </p>
                </div>

                <input ref={inputRef} type="file" accept=".pdf,.doc,.docx,.txt" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />

                {/* Drop zone — very minimal */}
                <motion.div
                  onDrop={onDrop}
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onClick={() => inputRef.current?.click()}
                  animate={{
                    backgroundColor: dragging
                      ? "rgba(184,145,110,0.05)"
                      : file ? "rgba(255,255,255,0.82)" : "rgba(255,255,255,0.48)",
                    borderColor: dragging
                      ? "rgba(184,145,110,0.38)"
                      : file ? "rgba(23,19,16,0.12)" : "rgba(23,19,16,0.065)",
                  }}
                  transition={{ duration: 0.32 }}
                  className="relative cursor-pointer overflow-hidden rounded-[26px] border px-10 py-[52px] backdrop-blur-sm"
                >
                  <AnimatePresence mode="wait">
                    {file ? (
                      <motion.div key="sel"
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.38 }}
                        className="flex items-center gap-5"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#171310]/5">
                          <svg width="13" height="16" viewBox="0 0 13 16" fill="none">
                            <path d="M7.5 1H2.5C2 1 1.5 1.4 1.5 2v12c0 .6.4 1 1 1h9c.6 0 1-.4 1-1V5.5L7.5 1z"
                              stroke="#171310" strokeWidth="0.9" strokeLinejoin="round" opacity=".42"/>
                            <path d="M7.5 1v4.5H12" stroke="#171310" strokeWidth="0.9" strokeLinejoin="round" opacity=".42"/>
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-[#171310]">{file.name}</p>
                          <p className="mt-0.5 text-xs text-[#171310]/32">{(file.size / 1024).toFixed(0)} KB</p>
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); setFile(null); }}
                          className="text-lg leading-none text-[#171310]/20 transition-colors hover:text-[#171310]/48"
                        >×</button>
                      </motion.div>
                    ) : (
                      <motion.div key="empty"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.28 }}
                        className="text-center"
                      >
                        <p className="text-xl font-extralight text-[#171310]/22">Drop your contract here</p>
                        <p className="mt-2 text-xs text-[#171310]/18">PDF · DOCX · TXT · or click to browse</p>
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
                        className="group inline-flex items-center gap-3 rounded-full bg-[#171310] px-8 py-[14px] text-sm font-medium text-[#F8F6F2] transition-all duration-500 hover:bg-[#171310]/80 active:scale-[0.98]"
                      >
                        Analyze
                        <span className="text-[#F8F6F2]/30 transition-transform duration-500 group-hover:translate-x-0.5">→</span>
                      </motion.button>
                    )}
                  </AnimatePresence>
                  <button
                    onClick={() => setPhase("ingesting")}
                    className="text-sm text-[#171310]/25 transition-colors hover:text-[#171310]/50"
                  >
                    Use demo agreement
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* INGESTING ───────────────────────────────────────────────── */}
          {phase === "ingesting" && (
            <motion.div key="ingesting" {...page}
              className="flex min-h-screen flex-col justify-center pb-24"
            >
              <div className="w-full max-w-2xl space-y-16">
                <div className="space-y-4">
                  <p className="text-[11px] uppercase tracking-[0.32em] text-[#171310]/28">Analysis</p>
                  <h2 className="text-5xl font-extralight tracking-[-0.04em] text-[#171310] sm:text-6xl">
                    Atlas is reading.
                  </h2>
                </div>

                {/* Clause extraction — cinematic typographic emergence */}
                <div className="space-y-6">
                  {/* Primary clauses — large, appear first */}
                  <div className="space-y-3">
                    {primaryClauses.map((clause, i) => (
                      <AnimatePresence key={clause}>
                        {primaryVisible.includes(i) && (
                          <motion.p
                            initial={{ opacity: 0, x: -12, filter: "blur(4px)" }}
                            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                            transition={{ duration: 0.65, ease: EASE }}
                            className="text-xl font-extralight text-[#171310]/85"
                          >
                            {clause}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    ))}
                  </div>

                  {/* Secondary clauses — smaller, drift in after */}
                  <div className="flex flex-wrap gap-x-6 gap-y-2">
                    {secondaryClauses.map((clause, i) => (
                      <AnimatePresence key={clause}>
                        {secondaryVisible.includes(i) && (
                          <motion.span
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 0.3, y: 0 }}
                            transition={{ duration: 0.5, ease: EASE }}
                            className="text-sm font-light text-[#171310]"
                          >
                            {clause}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    ))}
                  </div>
                </div>

                {/* Progress */}
                <div className="space-y-3">
                  <div className="relative h-px w-full overflow-hidden rounded-full bg-[#171310]/6">
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full bg-[#171310]/20"
                      style={{ width: `${progress}%` }}
                      transition={{ duration: 0.04, ease: "linear" }}
                    />
                  </div>
                  <p className="text-[11px] text-[#171310]/28">
                    {progress < 28 ? "Extracting clauses" :
                     progress < 58 ? "Mapping obligations" :
                     progress < 82 ? "Identifying asymmetries" :
                     "Surfacing vulnerabilities"}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* MAP ─────────────────────────────────────────────────────── */}
          {phase === "map" && (
            <motion.div key="map" {...page} className="min-h-screen space-y-16 py-28">
              <motion.div className="max-w-2xl space-y-5"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, ease: EASE }}
              >
                <p className="text-[11px] uppercase tracking-[0.32em] text-[#171310]/28">Obligation map</p>
                <h2 className="text-5xl font-extralight tracking-[-0.04em] text-[#171310] sm:text-6xl">
                  {contractName}
                  <br />
                  <span className="text-[#171310]/28">6 obligations found.</span>
                </h2>
                <p className="text-lg font-light leading-[1.8] text-[#171310]/42">
                  Three carry significant asymmetry. Atlas has traced the full dependency chain.
                </p>
              </motion.div>

              {/* Spatial constellation — desktop */}
              <div className="relative hidden h-[520px] w-full md:block">
                {/* Connection lines */}
                <svg className="absolute inset-0 h-full w-full"
                  viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden
                >
                  {obligations.map((o, i) => (
                    <motion.line key={o.id}
                      x1="50" y1="50" x2={o.x} y2={o.y}
                      stroke="rgba(23,19,16,0.05)"
                      strokeWidth="0.22"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.9, delay: 0.25 + i * 0.12 }}
                    />
                  ))}
                </svg>

                {/* Center anchor */}
                <div className="absolute" style={{ left: "50%", top: "50%", transform: "translate(-50%,-50%)" }}>
                  <motion.div className="flex flex-col items-center gap-2"
                    initial={{ opacity: 0, scale: 0.75 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, ease: EASE }}
                  >
                    <motion.div
                      className="h-3 w-3 rounded-full bg-[#171310]/12"
                      animate={{ scale: [1, 1.3, 1], opacity: [0.12, 0.28, 0.12] }}
                      transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <p className="whitespace-nowrap text-[9px] uppercase tracking-[0.25em] text-[#171310]/25">
                      {contractName}
                    </p>
                  </motion.div>
                </div>

                {/* Obligation nodes */}
                {obligations.map((o, i) => (
                  <motion.div key={o.id} className="absolute"
                    style={{ left: `${o.x}%`, top: `${o.y}%`, transform: "translate(-50%,-50%)" }}
                    initial={{ opacity: 0, scale: 0.7, filter: "blur(4px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    transition={{ duration: 0.85, delay: 0.2 + i * 0.11, ease: EASE }}
                    whileHover={{ scale: 1.1 }}
                  >
                    <div className="flex flex-col items-center gap-1.5 text-center">
                      <motion.div
                        className={`h-[5px] w-[5px] rounded-full ${o.risk === "high" ? "bg-amber-700/48" : "bg-[#171310]/15"}`}
                        animate={o.risk === "high"
                          ? { scale: [1, 1.5, 1], opacity: [0.48, 0.75, 0.48] }
                          : {}}
                        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }}
                      />
                      <p className={`whitespace-nowrap text-xs font-medium ${o.risk === "high" ? "text-[#171310]" : "text-[#171310]/45"}`}>
                        {o.label}
                      </p>
                      <p className="whitespace-nowrap text-[9px] text-[#171310]/28">{o.detail}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Mobile list */}
              <div className="space-y-6 md:hidden">
                {obligations.map((o, i) => (
                  <motion.div key={o.id} className="flex items-start gap-4"
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: i * 0.08 }}
                  >
                    <div className={`mt-[7px] h-[5px] w-[5px] shrink-0 rounded-full ${o.risk === "high" ? "bg-amber-700/48" : "bg-[#171310]/15"}`} />
                    <div>
                      <p className={`text-sm font-medium ${o.risk === "high" ? "text-[#171310]" : "text-[#171310]/45"}`}>{o.label}</p>
                      <p className="mt-0.5 text-xs text-[#171310]/30">{o.detail}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <motion.button onClick={() => setPhase("insight")}
                className="group inline-flex items-center gap-3 rounded-full bg-[#171310] px-8 py-[14px] text-sm font-medium text-[#F8F6F2] transition-all duration-500 hover:bg-[#171310]/80 active:scale-[0.98]"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 1.0 }}
                whileHover={{ scale: 0.99 }}
              >
                Reveal vulnerability
                <span className="text-[#F8F6F2]/30 transition-transform duration-500 group-hover:translate-x-0.5">→</span>
              </motion.button>
            </motion.div>
          )}

          {/* INSIGHT ─────────────────────────────────────────────────── */}
          {phase === "insight" && (
            <motion.div key="insight" {...page} className="min-h-screen space-y-20 py-28">
              <motion.div className="max-w-3xl space-y-5"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, ease: EASE }}
              >
                <p className="text-[11px] uppercase tracking-[0.32em] text-[#171310]/28">Critical finding</p>
                <h2 className="text-[clamp(2.8rem,6vw,4.6rem)] font-extralight leading-[1.04] tracking-[-0.048em] text-[#171310]">
                  A pattern in
                  <br />
                  this agreement.
                </h2>
              </motion.div>

              <div className="max-w-3xl space-y-14">
                <motion.div className="space-y-6"
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.85, delay: 0.35, ease: EASE }}
                >
                  <p className="text-[1.35rem] font-extralight leading-[1.65] text-[#171310]">
                    Your non-compete extends 18 months beyond industry standard and contains no geographic carve-out for remote work.
                  </p>
                  <p className="text-lg font-light leading-[1.8] text-[#171310]/45">
                    Combined with unilateral amendment rights — a clause allowing the other party to modify this agreement after signing without your consent — this creates a compound vulnerability Atlas sees in approximately 8% of agreements.
                  </p>
                </motion.div>

                <motion.div className="border-t border-[#171310]/5 pt-10"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.6 }}
                >
                  {[
                    { label: "Non-compete duration",  yours: "18 months",                             benchmark: "6–12 months typical" },
                    { label: "Geographic scope",       yours: "50-mile radius · no remote carve-out",  benchmark: "89% include remote exceptions" },
                    { label: "Amendment rights",       yours: "Unilateral · no notice required",       benchmark: "Only 12% of agreements allow this" },
                  ].map((row, i) => (
                    <motion.div key={row.label}
                      className="grid gap-1.5 border-b border-[#171310]/5 py-6 last:border-b-0 sm:grid-cols-3 sm:items-baseline sm:gap-8"
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.72 + i * 0.09 }}
                    >
                      <p className="text-[10px] uppercase tracking-[0.22em] text-[#171310]/26">{row.label}</p>
                      <p className="text-sm font-medium text-[#171310]">{row.yours}</p>
                      <p className="text-sm text-[#171310]/35">{row.benchmark}</p>
                    </motion.div>
                  ))}
                </motion.div>
              </div>

              <motion.div className="flex flex-wrap items-center gap-6"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 1.1 }}
              >
                <button
                  onClick={() => setPhase("intelligence")}
                  className="group inline-flex items-center gap-3 rounded-full bg-[#171310] px-8 py-[14px] text-sm font-medium text-[#F8F6F2] transition-all duration-500 hover:bg-[#171310]/80 active:scale-[0.98]"
                >
                  Collective intelligence
                  <span className="text-[#F8F6F2]/30 transition-transform duration-500 group-hover:translate-x-0.5">→</span>
                </button>
                <button onClick={() => setPhase("workspace")}
                  className="text-sm text-[#171310]/32 transition-colors hover:text-[#171310]/58">
                  Your workspace
                </button>
              </motion.div>
            </motion.div>
          )}

          {/* INTELLIGENCE ────────────────────────────────────────────── */}
          {phase === "intelligence" && (
            <motion.div key="intelligence" {...page} className="min-h-screen space-y-20 py-28">
              <motion.div className="max-w-3xl space-y-5"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, ease: EASE }}
              >
                <p className="text-[11px] uppercase tracking-[0.32em] text-[#171310]/28">
                  Collective intelligence · {totalAnalyzed.toLocaleString()} agreements
                </p>
                <h2 className="text-[clamp(2.8rem,6vw,4.6rem)] font-extralight leading-[1.04] tracking-[-0.048em] text-[#171310]">
                  Patterns emerging
                  <br />
                  <span className="text-[#171310]/28">across all agreements.</span>
                </h2>
                <p className="text-lg font-light text-[#171310]/42">
                  Drawn from anonymized analysis across every agreement Atlas has seen. No personal data is ever shared.
                </p>
              </motion.div>

              {/* Intelligence stream — editorial, not charts */}
              <div className="max-w-3xl">
                {globalPatterns.map((p, i) => (
                  <motion.div key={p.id}
                    className="border-b border-[#171310]/5 py-12 last:border-b-0"
                    initial={{ opacity: 0, y: 18, filter: "blur(4px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 0.75, delay: 0.2 + i * 0.14, ease: EASE }}
                  >
                    <div className="flex items-start gap-8">
                      <div className="w-20 shrink-0 space-y-1 pt-[3px]">
                        <p className="text-[9px] uppercase tracking-[0.22em] text-[#171310]/22">{p.category}</p>
                        <p className="font-mono text-xs text-[#171310]/18 tabular-nums">{p.count.toLocaleString()}</p>
                      </div>
                      <div className="flex-1 space-y-3">
                        <p className="text-[1.15rem] font-extralight leading-[1.5] text-[#171310]">
                          {p.headline}
                        </p>
                        <p className="text-[15px] font-light leading-7 text-[#171310]/42">
                          {p.detail}
                        </p>
                        {p.rising && (
                          <motion.p
                            className="text-[9px] uppercase tracking-[0.25em] text-amber-700/48"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            transition={{ duration: 0.6, delay: 0.5 + i * 0.14 }}
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
                transition={{ duration: 0.8, delay: 1.0 }}
              >
                <button
                  onClick={() => { setFile(null); setPhase("upload"); }}
                  className="group inline-flex items-center gap-3 rounded-full bg-[#171310] px-8 py-[14px] text-sm font-medium text-[#F8F6F2] transition-all duration-500 hover:bg-[#171310]/80 active:scale-[0.98]"
                >
                  Analyze another agreement
                  <span className="text-[#F8F6F2]/30 transition-transform duration-500 group-hover:translate-x-0.5">→</span>
                </button>
                <button onClick={() => setPhase("workspace")}
                  className="text-sm text-[#171310]/32 transition-colors hover:text-[#171310]/58">
                  Your workspace
                </button>
              </motion.div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* ── Knowledge overlay ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showKnowledge && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            {/* Scrim */}
            <motion.div
              className="absolute inset-0 bg-[#F8F6F2]/72 backdrop-blur-2xl"
              onClick={() => setShowKnowledge(false)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            />

            {/* Sheet */}
            <motion.div
              className="relative z-10 w-full max-w-[560px] overflow-hidden rounded-t-[30px] bg-white/78 px-10 py-12 shadow-[0_-32px_100px_rgba(23,19,16,0.07)] ring-1 ring-[#171310]/6 backdrop-blur-3xl sm:rounded-[30px]"
              initial={{ opacity: 0, y: 48, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 28, scale: 0.97 }}
              transition={{ duration: 0.52, ease: EASE }}
            >
              <div className="space-y-8">
                <div className="space-y-3">
                  <p className="text-[10px] uppercase tracking-[0.32em] text-[#171310]/28">Knowledge layer</p>
                  <h3 className="text-3xl font-extralight tracking-[-0.035em] text-[#171310]">
                    Atlas absorbs context.
                  </h3>
                  <p className="text-[15px] font-light leading-7 text-[#171310]/42">
                    Upload labor protections, tenant rights, fairness frameworks, or regulatory guidance. Atlas integrates this context into every analysis.
                  </p>
                </div>

                <input ref={kbInputRef} type="file" accept=".pdf,.doc,.docx,.txt" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) absorb(f); }}
                />

                <AnimatePresence mode="wait">
                  {knowledgeAbsorbing ? (
                    <motion.div key="absorbing"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.35 }}
                      className="space-y-5 rounded-[20px] bg-[#171310]/3 px-6 py-8"
                    >
                      <p className="text-sm font-light text-[#171310]/55">
                        Absorbing{knowledgeFile ? ` ${knowledgeFile.name}` : ""}
                      </p>
                      <div className="relative h-px w-full overflow-hidden rounded-full bg-[#171310]/7">
                        <motion.div
                          className="absolute inset-y-0 left-0 h-full rounded-full bg-[#171310]/22"
                          initial={{ width: "0%" }} animate={{ width: "100%" }}
                          transition={{ duration: 2.9, ease: [0.2, 0, 0.4, 1] }}
                        />
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div key="idle"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      <button
                        onClick={() => kbInputRef.current?.click()}
                        className="w-full cursor-pointer rounded-[18px] border border-[#171310]/6 bg-[#171310]/2 px-6 py-7 text-center transition-colors duration-300 hover:bg-[#171310]/4"
                      >
                        <p className="text-sm font-light text-[#171310]/32">Upload a knowledge document</p>
                        <p className="mt-1 text-[11px] text-[#171310]/18">Labor law · Tenant rights · Fairness frameworks</p>
                      </button>

                      {/* Existing context documents */}
                      <div className="space-y-2 pt-1">
                        {knowledgeDocs.map((doc, i) => (
                          <motion.div key={i}
                            className="flex items-center gap-3 py-1.5"
                            initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: i * 0.06 }}
                          >
                            <div className="h-[3px] w-[3px] rounded-full bg-[#171310]/22 shrink-0" />
                            <p className="text-xs text-[#171310]/38">{doc}</p>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  onClick={() => setShowKnowledge(false)}
                  className="text-xs text-[#171310]/25 transition-colors hover:text-[#171310]/48"
                >
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
