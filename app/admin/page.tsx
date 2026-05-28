"use client";

import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface KnowledgeDoc {
  id: string;
  name: string;
  uploadedAt: number;
  sizeKb?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SEED_DOCS = [
  "EU Directive 2019/1023 — Restructuring",
  "UK Employment Rights Act 1996",
  "California AB5 — Worker Classification",
];

// Prototype access code — replace with environment-based auth before production
const ADMIN_CODE = "ATLAS";

const E = [0.22, 0.1, 0.28, 1.0] as [number, number, number, number];

const fade = {
  initial:    { opacity: 0, y: 24, filter: "blur(6px)" },
  animate:    { opacity: 1, y: 0,  filter: "blur(0px)" },
  exit:       { opacity: 0, y: -16, filter: "blur(4px)" },
  transition: { duration: 0.9, ease: E },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function loadDocs(): KnowledgeDoc[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("atlas_knowledge_docs");
    return raw ? (JSON.parse(raw) as KnowledgeDoc[]) : [];
  } catch { return []; }
}

function saveDocs(docs: KnowledgeDoc[]) {
  try { localStorage.setItem("atlas_knowledge_docs", JSON.stringify(docs)); } catch {}
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [authed, setAuthed]         = useState(false);
  const [code, setCode]             = useState("");
  const [codeError, setCodeError]   = useState(false);
  const [docs, setDocs]             = useState<KnowledgeDoc[]>([]);
  const [absorbing, setAbsorbing]   = useState(false);
  const [pending, setPending]       = useState<File[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Restore session auth on mount
  useEffect(() => {
    if (sessionStorage.getItem("atlas_admin") === "1") {
      setAuthed(true);
    }
  }, []);

  // Load docs when authenticated
  useEffect(() => {
    if (authed) setDocs(loadDocs());
  }, [authed]);

  const handleCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().toUpperCase() === ADMIN_CODE) {
      sessionStorage.setItem("atlas_admin", "1");
      setAuthed(true);
      setCodeError(false);
    } else {
      setCodeError(true);
      setCode("");
    }
  };

  const confirmDelete = (id: string) => setDeleteTarget(id);

  const executeDelete = () => {
    if (!deleteTarget) return;
    setDocs(prev => {
      const next = prev.filter(d => d.id !== deleteTarget);
      saveDocs(next);
      return next;
    });
    setDeleteTarget(null);
  };

  const absorb = (files: FileList) => {
    const arr = Array.from(files);
    setPending(arr);
    setAbsorbing(true);
    setTimeout(() => {
      const incoming: KnowledgeDoc[] = arr.map(f => ({
        id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        name: f.name,
        uploadedAt: Date.now(),
        sizeKb: f.size > 0 ? Math.round(f.size / 1024) : undefined,
      }));
      setDocs(prev => {
        const merged = [
          ...prev,
          ...incoming.filter(d => !prev.some(p => p.name === d.name)),
        ];
        saveDocs(merged);
        return merged;
      });
      setPending([]);
      setAbsorbing(false);
    }, 3000);
  };

  const signOut = () => {
    sessionStorage.removeItem("atlas_admin");
    setAuthed(false);
    setCode("");
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen bg-[#F6F4F0] text-[#15120E]">

      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="orb-breathe absolute -top-72 -left-32 h-[700px] w-[700px]
                        rounded-full bg-amber-100/35 blur-[180px]" />
        <div className="absolute -top-20 right-[4%] h-[500px] w-[500px]
                        rounded-full bg-stone-200/25 blur-[150px]" />
      </div>

      {/* Wordmark */}
      <div className="fixed left-7 top-7 z-50 flex items-center gap-2.5">
        <Link href="/"
          className="text-[12px] font-medium uppercase tracking-[0.16em] text-[#15120E]/38
                     transition-colors duration-500 hover:text-[#15120E]">
          Atlas
        </Link>
        <span className="select-none text-[#15120E]/15">·</span>
        <span className="text-[11px] uppercase tracking-[0.14em] text-[#15120E]/28">Admin</span>
      </div>

      {authed && (
        <button onClick={signOut}
          className="fixed right-7 top-7 z-50 text-[10px] uppercase tracking-[0.24em]
                     text-[#15120E]/22 transition-colors hover:text-[#15120E]/52">
          Sign out
        </button>
      )}

      <main className="relative z-10 mx-auto max-w-3xl px-6 py-28 sm:px-10">
        <AnimatePresence mode="wait">

          {/* ── ACCESS GATE ───────────────────────────────────────── */}
          {!authed && (
            <motion.div key="gate" {...fade}
              className="flex min-h-[80vh] flex-col justify-center"
            >
              <div className="max-w-sm space-y-12">
                <div className="space-y-4">
                  <p className="text-[10px] uppercase tracking-[0.32em] text-[#15120E]/25">
                    Admin access
                  </p>
                  <h1 className="text-5xl font-extralight tracking-[-0.04em] text-[#15120E]">
                    Knowledge hub.
                  </h1>
                </div>

                <form onSubmit={handleCode} className="space-y-5">
                  <div className="space-y-2">
                    <input
                      type="password"
                      value={code}
                      onChange={e => { setCode(e.target.value); setCodeError(false); }}
                      placeholder="Access code"
                      autoFocus
                      className={`w-full rounded-2xl border bg-white/55 px-5 py-4 text-[14px]
                                  font-light text-[#15120E] placeholder-[#15120E]/22
                                  outline-none backdrop-blur-sm transition-colors duration-300
                                  focus:bg-white/80 ${
                                    codeError
                                      ? "border-amber-700/30"
                                      : "border-[#15120E]/8 focus:border-[#15120E]/20"
                                  }`}
                    />
                    <AnimatePresence>
                      {codeError && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
                          className="text-[11px] text-amber-700/60"
                        >
                          Incorrect access code.
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                  <button type="submit"
                    className="group inline-flex items-center gap-3 rounded-full bg-[#15120E]
                               px-8 py-[14px] text-[13px] font-medium text-[#F6F4F0]
                               transition-all duration-500 hover:bg-[#15120E]/78 active:scale-[0.98]">
                    Continue
                    <span className="text-[#F6F4F0]/28 transition-transform duration-500
                                     group-hover:translate-x-0.5">→</span>
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {/* ── DASHBOARD ─────────────────────────────────────────── */}
          {authed && (
            <motion.div key="dashboard" {...fade} className="space-y-16">

              {/* Header */}
              <div className="space-y-4">
                <p className="text-[10px] uppercase tracking-[0.32em] text-[#15120E]/25">
                  Knowledge hub
                </p>
                <h1 className="text-5xl font-extralight tracking-[-0.04em]
                               text-[#15120E] sm:text-6xl">
                  Document corpus.
                </h1>
                <p className="text-[1.05rem] font-light text-[#15120E]/38">
                  {SEED_DOCS.length} system frameworks · {docs.length} uploaded document{docs.length !== 1 ? "s" : ""}
                </p>
                <p className="text-[12px] font-light text-[#15120E]/28">
                  Source names are attributed in user analysis. Document content is not exposed to users.
                </p>
              </div>

              {/* Upload */}
              <div className="space-y-4">
                <p className="text-[10px] uppercase tracking-[0.28em] text-[#15120E]/22">
                  Add documents
                </p>
                <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt"
                  multiple className="hidden"
                  onChange={e => { if (e.target.files?.length) absorb(e.target.files); }}
                />
                <AnimatePresence mode="wait">
                  {absorbing ? (
                    <motion.div key="abs"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="glass-surface-subtle rounded-[20px] border border-[#15120E]/6
                                 px-7 py-6 space-y-4"
                    >
                      <p className="text-[13px] font-light text-[#15120E]/50">
                        Absorbing {pending.length} document{pending.length !== 1 ? "s" : ""}
                      </p>
                      <div className="space-y-1">
                        {pending.map(f => (
                          <p key={f.name} className="text-[10px] text-[#15120E]/28 truncate">
                            {f.name}
                          </p>
                        ))}
                      </div>
                      <div className="relative h-px w-full overflow-hidden rounded-full bg-[#15120E]/7">
                        <motion.div
                          className="absolute inset-y-0 left-0 h-full rounded-full bg-[#15120E]/22"
                          initial={{ width: "0%" }} animate={{ width: "100%" }}
                          transition={{ duration: 2.8, ease: [0.2, 0, 0.4, 1] }}
                        />
                      </div>
                    </motion.div>
                  ) : (
                    <motion.button key="upload"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      onClick={() => fileRef.current?.click()}
                      className="glass-surface-subtle w-full cursor-pointer rounded-[20px]
                                 border border-[#15120E]/6 px-7 py-7 text-left
                                 transition-colors hover:bg-white/65"
                    >
                      <p className="text-[13px] font-light text-[#15120E]/38">
                        Upload documents
                      </p>
                      <p className="mt-0.5 text-[10px] text-[#15120E]/20">
                        Select one or multiple · PDF · DOCX · TXT
                      </p>
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>

              {/* System frameworks — read-only */}
              <div className="space-y-4">
                <p className="text-[10px] uppercase tracking-[0.28em] text-[#15120E]/22">
                  System frameworks
                </p>
                <div className="glass-surface overflow-hidden rounded-[20px]">
                  {SEED_DOCS.map((name, i) => (
                    <div key={i}
                      className="flex items-center justify-between px-7 py-5
                                 border-b border-[#15120E]/5 last:border-b-0"
                    >
                      <p className="text-[13px] font-light text-[#15120E]/50">{name}</p>
                      <span className="shrink-0 text-[9px] uppercase tracking-[0.22em] text-[#15120E]/20">
                        System
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Uploaded documents */}
              <div className="space-y-4">
                <p className="text-[10px] uppercase tracking-[0.28em] text-[#15120E]/22">
                  Uploaded documents
                </p>
                {docs.length === 0 ? (
                  <motion.p
                    className="text-[13px] font-light text-[#15120E]/28"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    No documents uploaded yet.
                  </motion.p>
                ) : (
                  <div className="glass-surface overflow-hidden rounded-[20px]">
                    <AnimatePresence initial={false}>
                      {docs.map(doc => (
                        <motion.div key={doc.id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0 }}
                          transition={{ duration: 0.35 }}
                          className="flex items-center gap-6 px-7 py-5
                                     border-b border-[#15120E]/5 last:border-b-0"
                        >
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <p className="truncate text-[13px] font-medium text-[#15120E]">
                              {doc.name}
                            </p>
                            <p className="text-[10px] text-[#15120E]/28">
                              {formatDate(doc.uploadedAt)}
                              {doc.sizeKb != null && ` · ${doc.sizeKb} KB`}
                            </p>
                          </div>
                          <button
                            onClick={() => confirmDelete(doc.id)}
                            className="shrink-0 text-[11px] text-[#15120E]/22
                                       transition-colors hover:text-amber-700/65"
                          >
                            Remove
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* ── DELETE CONFIRMATION ───────────────────────────────────── */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center px-6"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="absolute inset-0 bg-[#F6F4F0]/75 backdrop-blur-2xl"
              onClick={() => setDeleteTarget(null)}
            />
            <motion.div
              className="glass-surface relative z-10 w-full max-w-sm rounded-[24px] p-8 space-y-7"
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 10 }}
              transition={{ duration: 0.4, ease: E }}
            >
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-[0.28em] text-[#15120E]/28">
                  Confirm removal
                </p>
                <p className="text-[15px] font-light text-[#15120E]/65">
                  This document will be removed from the knowledge corpus. Analysis that previously referenced it will no longer include it as a source.
                </p>
              </div>
              <div className="flex items-center gap-5">
                <button
                  onClick={executeDelete}
                  className="text-[13px] font-medium text-amber-700/75
                             transition-colors hover:text-amber-700"
                >
                  Remove document
                </button>
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="text-[13px] text-[#15120E]/30 transition-colors hover:text-[#15120E]/55"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
