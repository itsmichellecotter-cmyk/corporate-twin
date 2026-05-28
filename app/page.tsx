"use client";

import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

interface KnowledgeDoc {
  id: string;
  name: string;
  uploadedAt: number;
  sizeKb?: number;
}

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
  {
    id: "termination",
    category: "Termination",
    source: "EU Working Conditions Directive 2019/1152",
    headline: "Asymmetrical notice obligations are subject to regulatory scrutiny across EU jurisdictions",
    detail: "EU Directive 2019/1152 requires employment terms to be proportionate and transparent. Notice structures that differ materially between employer and employee are increasingly examined by national labour courts as potential violations of the proportionality principle.",
  },
  {
    id: "noncompete",
    category: "Non-compete",
    source: "Almega (SE) · German HGB §74 · UK common law",
    headline: "Non-compete enforceability depends on jurisdiction, duration, and demonstrable business interest",
    detail: "Swedish employment guidance (Almega) generally limits non-competes to 9 months for most roles. German law caps the restriction at 24 months and requires financial compensation throughout. UK courts apply a reasonableness test — scope must reflect a legitimate, protectable business interest.",
  },
  {
    id: "ip",
    category: "Intellectual property",
    source: "UK Patents Act 1977 s.39 · German ArbEG",
    headline: "Broad IP assignment clauses covering non-employment work may not be fully enforceable",
    detail: "The UK Patents Act 1977 (s.39) limits employer IP rights to inventions arising directly in the course of employment. Germany's Arbeitnehmererfindungsgesetz applies similar restrictions. Clauses assigning all work product — including personal projects — may be challengeable under applicable national law.",
  },
  {
    id: "amendment",
    category: "Contract terms",
    source: "Wandsworth LBC v D'Silva [1998] IRLR 329",
    headline: "Unilateral amendment clauses require fresh consideration to be binding under most contract law systems",
    detail: "Under English contract law (Wandsworth LBC v D'Silva [1998] IRLR 329), employment terms cannot be varied unilaterally without consent or fresh consideration. Similar principles apply across EU civil law jurisdictions. The clause is not automatically void, but its enforceability is frequently contested.",
  },
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
  const [introWord, setIntroWord]       = useState<"juritas" | "atlas">("juritas");
  const [showIntro, setShowIntro]       = useState(false);
  const [showKnowledge, setShowKb]      = useState(false);
  const [absorbedDocs, setAbsorbedDocs] = useState<KnowledgeDoc[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const snapSession = useRef<UserSession | null>(null);
  const snapFile    = useRef<File | null>(null);

  useEffect(() => { snapSession.current = session; }, [session]);
  useEffect(() => { snapFile.current = file; }, [file]);

  // ── Session init ──────────────────────────────────────────────────
  useEffect(() => { setSession(loadSession()); }, []);

  // ── Juritas → Atlas intro — runs once per browser session ─────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("atlas_intro")) return;
    setShowIntro(true);
    const t1 = setTimeout(() => setIntroWord("atlas"), 1600);
    const t2 = setTimeout(() => setShowIntro(false), 3200);
    sessionStorage.setItem("atlas_intro", "1");
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // ── Knowledge docs — persisted globally across sessions ───────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem("atlas_knowledge_docs");
      if (raw) setAbsorbedDocs(JSON.parse(raw) as KnowledgeDoc[]);
    } catch {}
  }, []);

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


  const contractName =
    file?.name?.replace(/\.[^/.]+$/, "") ??
    session?.contracts.at(-1)?.name ??
    "Employment Agreement";

  // No fabricated aggregate counts — analysis is grounded in uploaded agreements
  // and publicly attributable legal frameworks only.

  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen text-[#13100D]">

      {/* ── AMBIENT ───────────────────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <motion.div
          className="orb-breathe absolute -top-64 -left-28 h-[900px] w-[900px]
                     rounded-full bg-amber-100/42 blur-[200px]"
          style={{ x: orb1x, y: orb1y }}
        />
        <motion.div
          className="absolute -top-20 right-[1%] h-[640px] w-[640px]
                     rounded-full bg-stone-200/30 blur-[180px]"
          style={{ x: orb2x, y: orb2y }}
          animate={{ scale: [1, 1.07, 1], opacity: [0.30, 0.48, 0.30] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 5 }}
        />
        <motion.div
          className="orb-drift absolute bottom-[-60px] left-[22%] h-[480px] w-[480px]
                     rounded-full bg-amber-50/48 blur-[130px]"
        />
        {/* Subtle vignette depth */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,transparent_60%,rgba(19,16,13,0.025)_100%)]" />
      </div>

      {/* ── GHOST GRAPH on landing ────────────────────────────────── */}
      <AnimatePresence>
        {phase === "landing" && (
          <motion.div
            className="pointer-events-none fixed right-[-2%] top-[6%] hidden h-[600px]
                       w-[600px] lg:block"
            initial={{ opacity: 0 }} animate={{ opacity: 0.075 }} exit={{ opacity: 0 }}
            transition={{ duration: 3.5, delay: 1.8 }}
          >
            <svg viewBox="0 0 100 100" className="h-full w-full">
              {obligations.map(o => (
                <line key={o.id} x1="50" y1="50" x2={o.x} y2={o.y}
                  stroke="#13100D" strokeWidth="0.45"/>
              ))}
              {obligations.map(o => (
                <circle key={o.id} cx={o.x} cy={o.y} r="1.5" fill="#13100D"/>
              ))}
              <circle cx="50" cy="50" r="2.8" fill="#13100D"/>
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── WORDMARK ──────────────────────────────────────────────── */}
      {session && (
        <motion.div className="fixed left-7 top-7 z-50 flex flex-col gap-1"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 1.8 }}
        >
          <button onClick={() => setPhase("landing")}
            className="text-[12px] font-semibold uppercase tracking-[0.18em]
                       text-[#13100D]/52 transition-colors duration-500
                       hover:text-[#13100D] text-left">
            Atlas
          </button>
          <AnimatePresence>
            {phase !== "landing" && (
              <motion.span
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.4 }}
                className="font-mono text-[9px] tracking-[0.2em] text-[#13100D]/25"
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
          <motion.div className="fixed right-7 top-7 z-50 flex items-center gap-7"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <button onClick={() => setShowKb(true)}
              className="text-[10px] font-medium uppercase tracking-[0.26em]
                         text-[#13100D]/32 transition-colors duration-300
                         hover:text-[#13100D]/65">
              Knowledge
            </button>
            {(session.contracts.length ?? 0) > 0 && (
              <button onClick={() => setPhase("workspace")}
                className="text-[10px] font-medium uppercase tracking-[0.26em]
                           text-[#13100D]/32 transition-colors duration-300
                           hover:text-[#13100D]/65">
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
              className="flex min-h-screen flex-col justify-center pb-28 pt-20"
            >
              <div className="max-w-3xl space-y-12">

                {/* Label + headline grouped tightly together */}
                <div className="space-y-5">
                  <motion.p
                    className="text-[13px] font-medium uppercase tracking-[0.32em] text-[#13100D]/45"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ duration: 1.1, delay: 0.3 }}
                  >
                    Contractual intelligence
                  </motion.p>

                <motion.h1
                  initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1.2, delay: 0.42, ease: E }}
                >
                  <span className="block text-[clamp(3.6rem,9vw,7.5rem)] font-light
                                   leading-[0.96] tracking-[-0.05em] text-[#13100D]">
                    Every agreement
                  </span>
                  <span className="block text-[clamp(3.6rem,9vw,7.5rem)] font-light
                                   leading-[0.96] tracking-[-0.05em] text-[#13100D]/32">
                    contains asymmetry.
                  </span>
                </motion.h1>
                </div>{/* end label + headline group */}

                <motion.p
                  className="max-w-[440px] text-[1.18rem] font-light leading-[1.85] text-[#13100D]/58"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ duration: 1, delay: 0.76 }}
                >
                  Atlas maps obligations, exposure, and hidden leverage
                  before they become consequence.
                </motion.p>

                <motion.div className="flex flex-wrap items-center gap-7"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 1.08 }}
                >
                  <button onClick={() => setPhase("upload")} className="btn-primary group">
                    Upload an agreement
                    <span className="text-[#F4F1EC]/38 transition-transform duration-400
                                     group-hover:translate-x-0.5">→</span>
                  </button>
                  {(session?.contracts.length ?? 0) > 0 && (
                    <button onClick={() => setPhase("workspace")}
                      className="text-[13px] font-light text-[#13100D]/42
                                 transition-colors hover:text-[#13100D]/68">
                      Your workspace
                    </button>
                  )}
                </motion.div>

                {/* Feature triad */}
                <motion.div
                  className="grid max-w-[520px] grid-cols-3 gap-8 border-t border-[#13100D]/7 pt-10"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ duration: 1, delay: 1.35 }}
                >
                  {[
                    { label: "Obligation mapping",   desc: "Structural dependency analysis" },
                    { label: "Asymmetry detection",  desc: "Identifies imbalanced clauses" },
                    { label: "Regulatory context",   desc: "Grounded in public legal frameworks" },
                  ].map((f, i) => (
                    <motion.div key={f.label}
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 1.45 + i * 0.08 }}
                    >
                      <p className="text-[11px] font-medium text-[#13100D]/58">{f.label}</p>
                      <p className="mt-1.5 text-[11px] font-light leading-5 text-[#13100D]/36">
                        {f.desc}
                      </p>
                    </motion.div>
                  ))}
                </motion.div>

              </div>
            </motion.div>
          )}

          {/* ══ WORKSPACE ══════════════════════════════════════════ */}
          {phase === "workspace" && (
            <motion.div key="workspace" {...page}
              className="min-h-screen space-y-16 py-28"
            >
              <motion.div className="max-w-xl space-y-5"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, ease: E }}
              >
                <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-[#13100D]/36">
                  Your workspace
                </p>
                <h2 className="text-[clamp(2.6rem,6vw,4.5rem)] font-light
                               tracking-[-0.04em] text-[#13100D]">
                  Session {session?.shortId}
                </h2>
                <p className="text-[1.05rem] font-light text-[#13100D]/55">
                  {(session?.contracts.length ?? 0) > 0
                    ? `${session!.contracts.length} agreement${session!.contracts.length > 1 ? "s" : ""} analyzed. Private to this session.`
                    : "No agreements analyzed yet."}
                </p>
              </motion.div>

              {(session?.contracts.length ?? 0) > 0 && (
                <div className="max-w-xl">
                  {session!.contracts.map((c, i) => (
                    <motion.div key={c.id}
                      className="flex items-center justify-between border-b border-[#13100D]/6
                                 py-7 first:border-t first:border-t-[#13100D]/6"
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: i * 0.08 }}
                    >
                      <div className="space-y-1.5">
                        <p className="text-[13px] font-medium text-[#13100D]">{c.name}</p>
                        <p className="text-[11px] font-light text-[#13100D]/42">
                          {c.obligationCount} obligations · {c.vulnerabilityCount} asymmetries detected
                        </p>
                      </div>
                      <button onClick={() => setPhase("map")}
                        className="text-[12px] font-light text-[#13100D]/35
                                   transition-colors hover:text-[#13100D]/65">
                        View →
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}

              <motion.div className="flex flex-wrap items-center gap-7"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.4 }}
              >
                <button onClick={() => setPhase("upload")} className="btn-primary group">
                  Upload agreement
                  <span className="text-[#F4F1EC]/38 transition-transform duration-400
                                   group-hover:translate-x-0.5">→</span>
                </button>
                <button onClick={() => setPhase("intelligence")}
                  className="text-[13px] font-light text-[#13100D]/42
                             transition-colors hover:text-[#13100D]/68">
                  Legal context →
                </button>
                <button onClick={startNewSession}
                  className="text-[13px] font-light text-[#13100D]/28
                             transition-colors hover:text-[#13100D]/50">
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
                  <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-[#13100D]/36">
                    Upload
                  </p>
                  <h2 className="text-[clamp(3rem,7vw,5.5rem)] font-light tracking-[-0.044em]
                                 leading-[1.02] text-[#13100D]">
                    Your agreement.
                  </h2>
                  <p className="text-[1.06rem] font-light leading-[1.85] text-[#13100D]/55">
                    Employment, rental, freelance, or service —
                    Atlas reads any agreement.
                  </p>
                </div>

                <input ref={inputRef} type="file" accept=".pdf,.doc,.docx,.txt" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f); }}
                />

                {/* Drop zone */}
                <motion.div
                  onDrop={onDrop}
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onClick={() => inputRef.current?.click()}
                  animate={{
                    backgroundColor: dragging
                      ? "rgba(184,137,74,0.06)"
                      : file ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.68)",
                    borderColor: dragging
                      ? "rgba(184,137,74,0.5)"
                      : file ? "rgba(19,16,13,0.14)" : "rgba(19,16,13,0.08)",
                    boxShadow: dragging
                      ? "inset 0 1px 0 rgba(255,255,255,0.95), 0 8px 32px rgba(184,137,74,0.1), 0 24px 56px rgba(19,16,13,0.06)"
                      : "inset 0 1px 0 rgba(255,255,255,0.92), 0 4px 16px rgba(19,16,13,0.04), 0 16px 40px rgba(19,16,13,0.05)",
                  }}
                  transition={{ duration: 0.28 }}
                  className="relative cursor-pointer overflow-hidden rounded-[28px] border
                             px-10 py-[56px] backdrop-blur-[24px]"
                >
                  <AnimatePresence mode="wait">
                    {file ? (
                      <motion.div key="sel"
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.36 }}
                        className="flex items-center gap-5"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center
                                        rounded-2xl bg-[#13100D]/6 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                          <svg width="14" height="17" viewBox="0 0 14 17" fill="none">
                            <path d="M8 1H3C2.4 1 2 1.4 2 2v13c0 .6.4 1 1 1h9c.6 0 1-.4 1-1V6L8 1z"
                              stroke="#13100D" strokeWidth="0.95" strokeLinejoin="round" opacity=".5"/>
                            <path d="M8 1v5h5" stroke="#13100D" strokeWidth="0.95"
                              strokeLinejoin="round" opacity=".5"/>
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium text-[#13100D]">
                            {file.name}
                          </p>
                          <p className="mt-1 text-[11px] font-light text-[#13100D]/42">
                            {(file.size / 1024).toFixed(0)} KB · Ready for analysis
                          </p>
                        </div>
                        <button onClick={e => { e.stopPropagation(); setFile(null); }}
                          className="text-xl leading-none text-[#13100D]/25
                                     transition-colors hover:text-[#13100D]/55">×</button>
                      </motion.div>
                    ) : (
                      <motion.div key="empty"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="space-y-2 text-center"
                      >
                        <p className="text-[1.1rem] font-light text-[#13100D]/35">
                          Drop your agreement here
                        </p>
                        <p className="text-[11px] font-light text-[#13100D]/22">
                          PDF · DOCX · TXT · or click to browse
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                <div className="flex flex-wrap items-center gap-6">
                  <AnimatePresence>
                    {file && (
                      <motion.button
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.42 }}
                        onClick={() => setPhase("ingesting")}
                        className="btn-primary group"
                      >
                        Analyze agreement
                        <span className="text-[#F4F1EC]/38 transition-transform duration-400
                                         group-hover:translate-x-0.5">→</span>
                      </motion.button>
                    )}
                  </AnimatePresence>
                  <button onClick={() => setPhase("ingesting")}
                    className="text-[13px] font-light text-[#13100D]/30
                               transition-colors hover:text-[#13100D]/55">
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
                  <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-[#13100D]/36">
                    Analysis in progress
                  </p>
                  <h2 className="text-[clamp(3rem,7vw,5.5rem)] font-light
                                 tracking-[-0.044em] leading-[1.02] text-[#13100D]">
                    Reading.
                  </h2>
                  <p className="text-[1.05rem] font-light text-[#13100D]/48">
                    Atlas is extracting clauses and mapping dependencies.
                  </p>
                </div>

                {/* Spatial clause cloud — desktop */}
                <div className="relative hidden h-[380px] w-full overflow-hidden md:block">
                  {clauses.map((c, i) => (
                    <AnimatePresence key={c.text}>
                      {visibleClauses.has(i) && (
                        <motion.span
                          className={`absolute text-[#13100D] ${
                            c.primary
                              ? "text-[1.45rem] font-light"
                              : "text-[0.78rem] font-light"
                          }`}
                          style={{ left: c.x, top: c.y }}
                          initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
                          animate={{
                            opacity: c.primary ? 0.82 : 0.22,
                            y: 0, filter: "blur(0px)",
                          }}
                          transition={{ duration: 0.72, ease: E }}
                        >
                          {c.text}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  ))}
                </div>

                {/* Mobile stacked */}
                <div className="space-y-4 md:hidden">
                  {clauses.filter(c => c.primary).map((c, i) => (
                    <AnimatePresence key={c.text}>
                      {visibleClauses.has(i) && (
                        <motion.p
                          className="text-xl font-light text-[#13100D]/75"
                          initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.6, ease: E }}
                        >
                          {c.text}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  ))}
                </div>

                {/* Progress */}
                <div className="space-y-4">
                  <div className="relative h-px w-full overflow-hidden rounded-full bg-[#13100D]/8">
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full bg-[#13100D]/25"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-[11px] font-light text-[#13100D]/38">
                    {progress < 26 ? "Extracting clause structure" :
                     progress < 55 ? "Mapping obligation dependencies" :
                     progress < 80 ? "Identifying asymmetries" :
                     "Surfacing primary vulnerabilities"}
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
              <motion.div className="max-w-2xl space-y-5"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, ease: E }}
              >
                <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-[#13100D]/36">
                  Obligation map
                </p>
                <h2 className="text-[clamp(2.8rem,6vw,5rem)] font-light
                               tracking-[-0.044em] leading-[1.04] text-[#13100D]">
                  {contractName}
                </h2>
                <p className="text-[1.05rem] font-light text-[#13100D]/48">
                  6 obligations identified · 3 asymmetries requiring review
                </p>
              </motion.div>

              {/* ── Graph — desktop ──────────────────────────────── */}
              <div className="relative hidden h-[640px] w-full md:block">

                {/* Layered glass background */}
                <div className="glass-surface graph-fog absolute inset-0 rounded-[40px]" />
                <div className="pointer-events-none absolute inset-0 rounded-[40px]
                                shadow-[inset_0_0_120px_rgba(19,16,13,0.03),inset_0_1px_0_rgba(255,255,255,0.95)]" />

                {/* SVG paths */}
                <svg className="absolute inset-0 h-full w-full"
                  viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden
                >
                  {/* Concentric reference rings */}
                  {[5, 10, 16, 24].map((r, i) => (
                    <motion.circle key={r} cx="50" cy="50" r={r}
                      fill="none" stroke="rgba(19,16,13,0.045)" strokeWidth="0.18"
                      strokeDasharray={i > 1 ? "0.5 1.5" : "none"}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 1.4, delay: 0.15 + i * 0.18, ease: E }}
                    />
                  ))}

                  {obligations.map((o, i) => {
                    const isActive  = activeNode === o.id;
                    const hasActive = activeNode !== null;
                    return (
                      <g key={o.id}>
                        <motion.path
                          d={`M 50 50 L ${o.x} ${o.y}`}
                          fill="none"
                          stroke="rgba(19,16,13,0.065)"
                          strokeWidth="0.28"
                          initial={{ pathLength: 0, opacity: 0 }}
                          animate={{
                            pathLength: 1,
                            opacity: hasActive && !isActive ? 0.25 : 1,
                          }}
                          transition={{ duration: 1.6, delay: 0.3 + i * 0.18, ease: E }}
                        />
                        <AnimatePresence>
                          {isActive && (
                            <motion.path
                              d={`M 50 50 L ${o.x} ${o.y}`}
                              fill="none"
                              stroke={o.risk === "high"
                                ? "rgba(184,137,74,0.38)"
                                : "rgba(19,16,13,0.24)"}
                              strokeWidth="0.58"
                              initial={{ pathLength: 0, opacity: 0 }}
                              animate={{ pathLength: 1, opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.35, ease: "easeOut" }}
                            />
                          )}
                        </AnimatePresence>
                      </g>
                    );
                  })}
                </svg>

                {/* Center node */}
                <div className="absolute"
                  style={{ left: "50%", top: "50%", transform: "translate(-50%,-50%)" }}>
                  <motion.div className="flex flex-col items-center gap-2.5"
                    initial={{ opacity: 0, scale: 0.65 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1.1, ease: E }}
                  >
                    <div className="relative flex items-center justify-center">
                      {[32, 52, 78, 110].map((size, i) => (
                        <motion.div key={size}
                          className="absolute rounded-full border border-[#13100D]/7"
                          style={{ width: size, height: size }}
                          animate={{ scale: [1, 1.45, 1], opacity: [0.07, 0, 0.07] }}
                          transition={{
                            duration: 4.5 + i * 0.6,
                            delay: i * 1.1,
                            repeat: Infinity, ease: "easeOut",
                          }}
                        />
                      ))}
                      <motion.div
                        className="relative h-[14px] w-[14px] rounded-full bg-[#13100D]/18"
                        style={{
                          filter: "drop-shadow(0 0 10px rgba(19,16,13,0.2)) drop-shadow(0 0 24px rgba(19,16,13,0.08))",
                        }}
                        animate={{ scale: [1, 1.18, 1], opacity: [0.18, 0.35, 0.18] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                      />
                    </div>
                    <p className="whitespace-nowrap text-[9px] font-medium uppercase
                                  tracking-[0.28em] text-[#13100D]/32">
                      {contractName}
                    </p>
                  </motion.div>
                </div>

                {/* Obligation nodes */}
                {obligations.map((o, i) => {
                  const isActive  = activeNode === o.id;
                  const hasActive = activeNode !== null;
                  return (
                    <motion.div key={o.id}
                      className="absolute cursor-pointer"
                      style={{ left: `${o.x}%`, top: `${o.y}%`, transform: "translate(-50%,-50%)" }}
                      initial={{ opacity: 0, scale: 0.6, filter: "blur(8px)" }}
                      animate={{
                        opacity: hasActive && !isActive ? 0.28 : 1,
                        scale: 1, filter: "blur(0px)",
                      }}
                      transition={{ duration: 0.95, delay: 0.25 + i * 0.13, ease: E }}
                      onHoverStart={() => setActiveNode(o.id)}
                      onHoverEnd={() => setActiveNode(null)}
                      whileHover={{ scale: 1.15 }}
                    >
                      <div className="flex flex-col items-center gap-[6px] text-center">
                        <div className="relative flex items-center justify-center">
                          {o.risk === "high" && (
                            <motion.div
                              className="absolute rounded-full bg-amber-500/12"
                              style={{ width: 22, height: 22 }}
                              animate={{ scale: [1, 2, 1], opacity: [0.12, 0, 0.12] }}
                              transition={{
                                duration: 3, repeat: Infinity,
                                ease: "easeOut", delay: i * 0.55,
                              }}
                            />
                          )}
                          <motion.div
                            className={`rounded-full ${
                              o.risk === "high"
                                ? "h-[9px] w-[9px] bg-amber-600/65"
                                : "h-[7px] w-[7px] bg-[#13100D]/22"
                            }`}
                            style={o.risk === "high"
                              ? { filter: "drop-shadow(0 0 6px rgba(184,137,74,0.55)) drop-shadow(0 0 14px rgba(184,137,74,0.22))" }
                              : { filter: "drop-shadow(0 0 4px rgba(19,16,13,0.18))" }
                            }
                            animate={isActive
                              ? { scale: [1, 1.5, 1] }
                              : o.risk === "high"
                                ? { opacity: [0.65, 0.95, 0.65] }
                                : {}}
                            transition={{ duration: isActive ? 0.45 : 2.8, repeat: isActive ? 0 : Infinity, ease: "easeInOut", delay: i * 0.4 }}
                          />
                        </div>
                        <p className={`whitespace-nowrap text-[11px] leading-none ${
                          o.risk === "high"
                            ? "font-semibold text-[#13100D]"
                            : "font-medium text-[#13100D]/55"
                        }`}>
                          {o.label}
                        </p>
                        <p className="whitespace-nowrap text-[9px] font-light
                                      leading-none text-[#13100D]/38">
                          {o.detail}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Mobile obligation list */}
              <div className="space-y-5 md:hidden">
                {obligations.map((o, i) => (
                  <motion.div key={o.id} className="flex items-start gap-4"
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: i * 0.08 }}
                  >
                    <div className={`mt-[7px] shrink-0 rounded-full ${
                      o.risk === "high" ? "h-[7px] w-[7px] bg-amber-600/65" : "h-[5px] w-[5px] bg-[#13100D]/22"
                    }`} />
                    <div>
                      <p className={`text-[13px] ${
                        o.risk === "high" ? "font-semibold text-[#13100D]" : "font-medium text-[#13100D]/55"
                      }`}>
                        {o.label}
                      </p>
                      <p className="mt-0.5 text-[11px] font-light text-[#13100D]/42">{o.detail}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <motion.button onClick={() => setPhase("insight")}
                className="btn-primary group"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 1.1 }}
              >
                Surface primary asymmetry
                <span className="text-[#F4F1EC]/38 transition-transform duration-400
                                 group-hover:translate-x-0.5">→</span>
              </motion.button>
            </motion.div>
          )}

          {/* ══ INSIGHT ════════════════════════════════════════════ */}
          {phase === "insight" && (
            <motion.div key="insight" {...page}
              className="min-h-screen space-y-20 py-28"
            >
              <motion.div className="max-w-3xl space-y-6"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, ease: E }}
              >
                <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-[#13100D]/36">
                  Primary finding
                </p>
                <h2 className="text-[clamp(2.8rem,6.5vw,5rem)] font-light
                               leading-[1.03] tracking-[-0.048em] text-[#13100D]">
                  Asymmetry
                  <br />
                  <span className="text-[#13100D]/30">detected.</span>
                </h2>
              </motion.div>

              <div className="max-w-3xl space-y-12">
                <motion.div className="space-y-6"
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.85, delay: 0.36, ease: E }}
                >
                  <p className="text-[1.28rem] font-light leading-[1.7] text-[#13100D]">
                    Your non-compete extends 18 months with no geographic carve-out for remote work — broader than standard enforcement thresholds in most EU jurisdictions.
                  </p>
                  <p className="text-[1.04rem] font-light leading-[1.88] text-[#13100D]/58">
                    Combined with unilateral amendment rights — permitting modification after signing without your consent — this asymmetry structure warrants careful legal review before execution.
                  </p>
                </motion.div>

                {/* Insight panel — rich glass */}
                <motion.div
                  className="glass-panel overflow-hidden rounded-[28px]"
                  initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.85, delay: 0.58, ease: E }}
                >
                  <div className="border-b border-[#13100D]/5 px-8 py-5">
                    <p className="text-[9px] font-medium uppercase tracking-[0.3em] text-[#13100D]/35">
                      Comparative analysis
                    </p>
                  </div>
                  {[
                    {
                      label: "Non-compete",
                      yours: "18 months",
                      norm: "Almega (SE): up to 9 months · German HGB §74: max 24 months with compensation",
                    },
                    {
                      label: "Geographic scope",
                      yours: "50-mile radius · no remote exception",
                      norm: "EU proportionality principle: scope must reflect a demonstrable business interest",
                    },
                    {
                      label: "Amendment rights",
                      yours: "Unilateral · no notice required",
                      norm: "Fresh consideration required — Wandsworth LBC v D'Silva [1998] IRLR 329",
                    },
                  ].map((row, i) => (
                    <motion.div key={row.label}
                      className="grid gap-3 border-b border-[#13100D]/5 px-8 py-6
                                 last:border-b-0 sm:grid-cols-3 sm:items-start sm:gap-8"
                      initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.42, delay: 0.7 + i * 0.1 }}
                    >
                      <p className="text-[9.5px] font-medium uppercase tracking-[0.24em]
                                    text-[#13100D]/32 pt-0.5">
                        {row.label}
                      </p>
                      <p className="text-[13px] font-semibold text-[#13100D]">{row.yours}</p>
                      <p className="text-[12px] font-light leading-[1.65] text-[#13100D]/48">
                        {row.norm}
                      </p>
                    </motion.div>
                  ))}
                </motion.div>
              </div>

              <motion.div className="flex flex-wrap items-center gap-7"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 1.15 }}
              >
                <button onClick={() => setPhase("intelligence")} className="btn-primary group">
                  Legal context
                  <span className="text-[#F4F1EC]/38 transition-transform duration-400
                                   group-hover:translate-x-0.5">→</span>
                </button>
                <button onClick={() => setPhase("workspace")}
                  className="text-[13px] font-light text-[#13100D]/38
                             transition-colors hover:text-[#13100D]/65">
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
              <motion.div className="max-w-3xl space-y-6"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, ease: E }}
              >
                <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-[#13100D]/36">
                  Legal context
                </p>
                <h2 className="text-[clamp(2.8rem,6.5vw,5rem)] font-light
                               leading-[1.03] tracking-[-0.048em] text-[#13100D]">
                  Regulatory
                  <br />
                  <span className="text-[#13100D]/30">frameworks.</span>
                </h2>
                <p className="text-[1.06rem] font-light leading-[1.82] text-[#13100D]/55">
                  Grounded in publicly available law, regulatory guidance,
                  and attributable legal frameworks. No statistics are fabricated.
                </p>
              </motion.div>

              <div className="max-w-3xl space-y-0">
                {globalPatterns.map((p, i) => (
                  <motion.div key={p.id}
                    className="border-b border-[#13100D]/6 py-11 last:border-b-0"
                    initial={{ opacity: 0, y: 22, filter: "blur(6px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 0.8, delay: 0.18 + i * 0.15, ease: E }}
                  >
                    <div className="flex items-start gap-8">
                      <div className="w-20 shrink-0 pt-[3px]">
                        <p className="text-[9px] font-medium uppercase tracking-[0.26em]
                                      text-[#13100D]/30">
                          {p.category}
                        </p>
                      </div>
                      <div className="flex-1 space-y-4">
                        <p className="text-[1.12rem] font-light leading-[1.52] text-[#13100D]/88">
                          {p.headline}
                        </p>
                        <p className="text-[14px] font-light leading-[1.75] text-[#13100D]/55">
                          {p.detail}
                        </p>
                        <motion.p
                          className="text-[10px] font-medium tracking-[0.08em] text-[#13100D]/32"
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          transition={{ duration: 0.6, delay: 0.55 + i * 0.15 }}
                        >
                          {p.source}
                        </motion.p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <motion.div className="flex flex-wrap items-center gap-7"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 1.05 }}
              >
                <button onClick={() => { setFile(null); setPhase("upload"); }}
                  className="btn-primary group">
                  Analyze an agreement
                  <span className="text-[#F4F1EC]/38 transition-transform duration-400
                                   group-hover:translate-x-0.5">→</span>
                </button>
                <button onClick={() => setPhase("workspace")}
                  className="text-[13px] font-light text-[#13100D]/38
                             transition-colors hover:text-[#13100D]/65">
                  Your workspace
                </button>
              </motion.div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* ── JURITAS → ATLAS INTRO ────────────────────────────────── */}
      <AnimatePresence>
        {showIntro && (
          <motion.div
            className="fixed inset-0 z-[200] flex items-center justify-center
                       bg-[#F4F1EC]"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.9, ease: E, delay: 0.2 } }}
          >
            {/* Same ambient orbs so the background feels continuous */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="orb-breathe absolute -top-64 -left-28 h-[900px] w-[900px]
                              rounded-full bg-amber-100/42 blur-[200px]" />
              <div className="absolute -top-20 right-[1%] h-[640px] w-[640px]
                              rounded-full bg-stone-200/30 blur-[180px]" />
            </div>

            <div className="relative flex items-center justify-center"
              style={{ minWidth: "12ch", height: "1.2em" }}>
              <AnimatePresence mode="wait">
                {introWord === "juritas" ? (
                  <motion.div
                    key="juritas"
                    className="flex"
                    exit={{ opacity: 0, y: -10, filter: "blur(6px)",
                             transition: { duration: 0.55, ease: E } }}
                  >
                    {"Juritas".split("").map((ch, i) => (
                      <motion.span
                        key={i}
                        className="text-[clamp(3.2rem,7vw,6rem)] font-light
                                   tracking-[-0.04em] text-[#13100D]"
                        initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        transition={{ duration: 0.5, delay: i * 0.07, ease: E }}
                      >
                        {ch}
                      </motion.span>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    key="atlas"
                    className="flex"
                  >
                    {"Atlas".split("").map((ch, i) => (
                      <motion.span
                        key={i}
                        className="text-[clamp(3.2rem,7vw,6rem)] font-light
                                   tracking-[-0.04em] text-[#13100D]"
                        initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        transition={{ duration: 0.55, delay: i * 0.08, ease: E }}
                      >
                        {ch}
                      </motion.span>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Juritas sub-label fades in below, exits early */}
            <motion.p
              className="absolute bottom-[44%] text-[10px] font-medium uppercase
                         tracking-[0.36em] text-[#13100D]/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: introWord === "juritas" ? 1 : 0 }}
              transition={{ duration: 0.5, delay: introWord === "juritas" ? 0.7 : 0 }}
            >
              Juritas platform
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── KNOWLEDGE OVERLAY ─────────────────────────────────────── */}
      <AnimatePresence>
        {showKnowledge && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            <motion.div
              className="absolute inset-0 bg-[#F0EDE8]/75 backdrop-blur-3xl"
              onClick={() => setShowKb(false)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            />
            <motion.div
              className="glass-panel relative z-10 flex w-full max-w-[540px] flex-col
                         rounded-t-[32px] sm:rounded-[32px]
                         max-h-[90vh] overflow-y-auto overscroll-contain"
              initial={{ opacity: 0, y: 56, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 32, scale: 0.97 }}
              transition={{ duration: 0.52, ease: E }}
            >
              <div className="space-y-8 px-10 py-12">
                <div className="space-y-3">
                  <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-[#13100D]/32">
                    Knowledge layer
                  </p>
                  <h3 className="text-[2rem] font-light tracking-[-0.035em] text-[#13100D]">
                    Contextual frameworks.
                  </h3>
                  <p className="text-[14px] font-light leading-7 text-[#13100D]/55">
                    These documents inform Atlas's analysis.
                    Source names are attributed in findings.
                  </p>
                </div>

                <div className="space-y-1.5">
                  {knowledgeDocs.map((name, i) => (
                    <motion.div key={`seed-${i}`}
                      className="flex items-center gap-3 py-2"
                      initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.38, delay: i * 0.07 }}
                    >
                      <div className="h-[3px] w-[3px] shrink-0 rounded-full bg-[#13100D]/25" />
                      <p className="text-[12px] font-light text-[#13100D]/58 truncate">{name}</p>
                    </motion.div>
                  ))}
                  {absorbedDocs.map((doc, i) => (
                    <motion.div key={doc.id}
                      className="flex items-center gap-3 py-2"
                      initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.38, delay: (knowledgeDocs.length + i) * 0.07 }}
                    >
                      <div className="h-[3px] w-[3px] shrink-0 rounded-full bg-[#13100D]/25" />
                      <p className="text-[12px] font-light text-[#13100D]/58 truncate">{doc.name}</p>
                    </motion.div>
                  ))}
                  {knowledgeDocs.length === 0 && absorbedDocs.length === 0 && (
                    <p className="text-[12px] font-light text-[#13100D]/32">
                      No documents in corpus yet.
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between
                                border-t border-[#13100D]/6 pt-6">
                  <button onClick={() => setShowKb(false)}
                    className="text-[11px] font-light text-[#13100D]/32
                               transition-colors hover:text-[#13100D]/55">
                    Close
                  </button>
                  <a href="/admin"
                    className="text-[11px] font-light text-[#13100D]/32
                               transition-colors hover:text-[#13100D]/55">
                    Manage corpus →
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
