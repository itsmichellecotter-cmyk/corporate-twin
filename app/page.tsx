"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";

type SimulationId =
  | "gdpr"
  | "cyber"
  | "supplier"
  | "audit"
  | "aiGovernance"
  | "insider";

type SimulationStep = {
  title: string;
  description: string;
};

type SimulationFlow = {
  id: SimulationId;
  title: string;
  subtitle: string;
  trigger: string;
  reasoning: string;
  dependencies: string;
  exposure: string;
  propagation: string;
  consequences: string;
  interventions: string;
  metrics: Array<{ label: string; value: string }>;
  relationships: string[];
};

const sourceList = [
  "Contracts",
  "Vendor agreements",
  "Policies",
  "Compliance docs",
  "Governance frameworks",
  "Cyber requirements",
];

const integrationList = [
  "OneDrive",
  "Google Drive",
  "SharePoint",
  "Notion",
];

const graphNodes = [
  "Vendors",
  "Obligations",
  "Policies",
  "Business units",
  "Regulatory framework",
  "Dependencies",
];

const vulnerabilityStream = [
  {
    title: "Vendor certification expired",
    description:
      "A supplier’s lapse weakens compliance posture and makes their cluster the first escalation node.",
    relation:
      "This exposure is tied directly to contract renewal obligations and operational dependency.",
  },
  {
    title: "Data processing conflict detected",
    description:
      "A new processing path conflicts with existing policy commitments, creating a cascading regulatory signal.",
    relation:
      "The issue connects policy, business unit ownership, and downstream vendor controls.",
  },
  {
    title: "AI governance policy violated",
    description:
      "An automated system has deviated from internal governance rules, elevating model risk into the enterprise twin.",
    relation:
      "The signal bridges AI systems, audit frameworks, and response obligations.",
  },
];

const simulationFlows: SimulationFlow[] = [
  {
    id: "gdpr",
    title: "GDPR Investigation",
    subtitle: "A regulatory inquiry surfaces cross-border vendor and retention risk.",
    trigger: "A European data access request activates a compliance investigation through customer data processors.",
    reasoning:
      "The twin maps expired DPAs, uncontrolled transfer paths, and retention policy conflicts into one operational escalation path.",
    dependencies:
      "Vendor processors, customer service systems, a European marketing stack, and business unit data owners are all connected through the same unresolved obligation.",
    exposure:
      "This issue exposes the enterprise to regulator engagement, contract penalties, and reputational impact across two EU business units.",
    propagation:
      "Unauthorized data movement ripples through vendor controls, incident response, and legal coordination layers.",
    consequences:
      "Potential investigation, customer notification requirements, and a tightened audit scope across connected systems.",
    interventions:
      "Renew or isolate the expiring DPAs, block the cross-border transfer path, and align the retention policy with the operational data flow.",
    metrics: [
      { label: "Vendor processors in scope", value: "5" },
      { label: "Policy conflict points", value: "3" },
      { label: "Estimated exposure window", value: "48h" },
    ],
    relationships: [
      "Expired DPA → EU marketing systems",
      "Retention policy gap → customer data archive",
      "Vendor processor access → two business units",
    ],
  },
  {
    id: "cyber",
    title: "Cybersecurity Breach",
    subtitle: "A supplier compromise drives an operational breach through vendor access.",
    trigger: "A third-party support vendor is breached while maintaining access to a customer-facing operations platform.",
    reasoning:
      "The twin links vendor access rights, identity federation, and SOC monitoring to reveal how a breach can extend into core operations.",
    dependencies:
      "Support credentials, shared logging systems, and vendor-maintained integration points define the attack surface.",
    exposure:
      "Credential exposure threatens customer systems, incident response obligations, and partner SLAs.",
    propagation:
      "The breach signal travels from security controls into service delivery, operations teams, and contract obligations.",
    consequences:
      "Operational slowdown, forced vendor revocation, and a widened recovery scope across infrastructure and business workflows.",
    interventions:
      "Quarantine the compromised vendor access, isolate the affected systems, and prioritize remediation for the exposed dependency path.",
    metrics: [
      { label: "Access paths exposed", value: "4" },
      { label: "Critical systems at risk", value: "2" },
      { label: "Control gaps found", value: "3" },
    ],
    relationships: [
      "Vendor breach → shared identity provider",
      "Support credentials → customer operations platform",
      "Security control gap → delayed detection",
    ],
  },
  {
    id: "supplier",
    title: "Supplier Failure",
    subtitle: "A disrupted supplier delivery cascades through product and compliance dependencies.",
    trigger: "A critical supplier misses a delivery milestone for a vendor-managed component tied to customer contracts.",
    reasoning:
      "The twin traces the supplier's contractual milestone, logistics handoffs, and downstream delivery obligations into a high-risk path.",
    dependencies:
      "Logistics providers, manufacturing schedules, customer commitments, and vendor SLAs are all linked through the same failed path.",
    exposure:
      "Delivery delay creates breach risk across commercial obligations and forces operational shift into contingency mode.",
    propagation:
      "The failure signal flows from procurement to engineering, sales, and customer success teams.",
    consequences:
      "Revenue impact, reputational pressure, and emergency sourcing costs become the operational focus.",
    interventions:
      "Activate alternate supply, negotiate recovery terms, and align internal handoffs around the impacted delivery corridor.",
    metrics: [
      { label: "SLA milestones missed", value: "2" },
      { label: "Business units affected", value: "3" },
      { label: "Contingency tasks opened", value: "5" },
    ],
    relationships: [
      "Supplier failure → product delivery chain",
      "Contract milestone → customer commitment",
      "Logistics delay → engineering handoff",
    ],
  },
  {
    id: "audit",
    title: "Regulatory Audit",
    subtitle: "A surprise audit tests governance evidence and operating controls.",
    trigger: "An unplanned audit request targets the firm's European compliance posture and evidence trails.",
    reasoning:
      "The twin assembles controls, ownership, and evidence sources to reveal where governance readiness is weakest.",
    dependencies:
      "Control owners, archived evidence, policy enforcement logs, and cross-border data sources define audit exposure.",
    exposure:
      "Missing evidence and weak controls concentrate audit risk into a narrow operational escalation path.",
    propagation:
      "Audit findings move from compliance into legal, operations, and executive governance channels.",
    consequences:
      "Corrective action, remediation workload, and governance reputation erosion are the likely outcomes.",
    interventions:
      "Assign evidence owners, shore up missing controls, and coordinate the audit response across the affected teams.",
    metrics: [
      { label: "Evidence gaps", value: "4" },
      { label: "Control owners engaged", value: "6" },
      { label: "Audit hotspots", value: "2" },
    ],
    relationships: [
      "Policy enforcement → evidence archive",
      "Control owner → compliance operations",
      "Audit request → cross-border data sources",
    ],
  },
  {
    id: "aiGovernance",
    title: "AI Governance Violation",
    subtitle: "A deployed model is operating outside its approved governance corridor.",
    trigger: "A marketing AI model begins using customer data in a way that violates internal policy guardrails.",
    reasoning:
      "The twin links model usage, data provenance, and governance approval workflows to expose the violation path.",
    dependencies:
      "Data labeling, deployment environment, vendor-managed tooling, and approval workflows all contribute to the failure.",
    exposure:
      "Policy non-compliance now threatens brand risk, customer trust, and governance escalation.",
    propagation:
      "The violation travels through model operations, legal oversight, and vendor-managed data flows.",
    consequences:
      "Model rollback, control remediation, and a governance review become the operational response.",
    interventions:
      "Contain the model, enforce approval checkpoints, and update the governance workflow with the new operational dependency map.",
    metrics: [
      { label: "Policy breaches detected", value: "1" },
      { label: "Operational systems affected", value: "2" },
      { label: "Governance reviews required", value: "1" },
    ],
    relationships: [
      "Model usage → customer data path",
      "Approval gap → deployment environment",
      "Vendor tooling → governance workflow",
    ],
  },
  {
    id: "insider",
    title: "Insider Risk Scenario",
    subtitle: "An internal actor moves sensitive vendor data outside approved controls.",
    trigger: "A business unit user downloads and shares vendor-sensitive material in a location outside the approved access policy.",
    reasoning:
      "The twin shows how team permissions, vendor agreements, and operational handoffs create a weak control path.",
    dependencies:
      "Access control, audit logging, vendor data scope, and business unit workflows form the exposure chain.",
    exposure:
      "Unauthorized vendor data disclosure creates a silent governance drift and operational fragility.",
    propagation:
      "The risk signal propagates from security into functional operations and contract oversight.",
    consequences:
      "Investigation, policy revision, and control hardening become the coordinated response.",
    interventions:
      "Revoke access, verify vendor scope, and tighten onboarding controls for the relevant teams.",
    metrics: [
      { label: "Unauthorized actions detected", value: "1" },
      { label: "Vendor exposure points", value: "2" },
      { label: "Control reviews triggered", value: "1" },
    ],
    relationships: [
      "User access → vendor-sensitive material",
      "Audit logging → control gap",
      "Operational handoff → policy drift",
    ],
  },
];

const pageMotion = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { type: "spring", stiffness: 88, damping: 18, mass: 0.85 },
};

const buttonStyles =
  "inline-flex items-center justify-center rounded-full bg-slate-50/5 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-50/10";

export default function Home() {
  const [phase, setPhase] = useState<"landing" | "ingest" | "twin" | "simulate" | "vulnerability" | "result">("landing");
  const [selectedSimulation, setSelectedSimulation] = useState<SimulationId>("gdpr");

  const activeSimulation = simulationFlows.find((flow) => flow.id === selectedSimulation) ?? simulationFlows[0];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020306] text-slate-100">
      <motion.div
        className="ambient-light"
        animate={{ opacity: [0.55, 0.7, 0.55] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-x-0 top-24 flex justify-center pointer-events-none"
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="relative h-[420px] w-[420px] rounded-full bg-cyan-500/10 blur-3xl" />
      </motion.div>
      <motion.div
        className="absolute left-20 top-32 h-36 w-36 rounded-full bg-amber-400/12 blur-3xl"
        animate={{ x: [0, 10, 0], y: [0, -8, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-20 top-60 h-48 w-48 rounded-full bg-cyan-300/8 blur-3xl"
        animate={{ x: [0, -12, 0], y: [0, 8, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />

      <main className="relative z-10 mx-auto flex min-h-screen max-w-[1320px] flex-col justify-center px-6 py-10 sm:px-8 lg:px-12">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, ease: "easeOut" }}
            className="space-y-6 px-6 sm:px-0"
          >
            <div className="inline-flex items-center gap-3 rounded-full bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.36em] text-slate-400 shadow-[0_20px_60px_rgba(0,0,0,0.16)]">
              <Sparkles className="h-4 w-4 text-cyan-300" />
              Operational Twin
            </div>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.02] tracking-[-0.05em] text-slate-50 sm:text-6xl">
              Understand the organization beneath the surface.
            </h1>
            <p className="mx-auto max-w-2xl text-lg leading-8 text-slate-400 sm:text-xl">
              A single ambient interaction begins the journey. Materials ingest, relationships form, an operational twin awakens, and the system reasons through exposure in real time.
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            {phase === "landing" ? (
              <motion.div
                key="landing"
                {...pageMotion}
                layout
                className="w-full max-w-3xl rounded-[36px] bg-white/5 p-10 shadow-[0_40px_120px_rgba(0,0,0,0.24)] backdrop-blur-3xl"
              >
                <div className="space-y-6 text-left">
                  <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Entry prompt</p>
                  <motion.div
                    initial={{ opacity: 0.85, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="rounded-[28px] border border-white/10 bg-[#01050c]/80 px-5 py-4"
                  >
                    <label className="text-sm font-medium text-slate-300">What would you like to understand about this organization?</label>
                    <div className="mt-4 flex gap-3">
                      <motion.input
                        type="text"
                        placeholder="Simulate a GDPR investigation"
                        whileFocus={{ scale: 1.005 }}
                        className="flex-1 rounded-3xl border border-white/10 bg-[#08121c]/90 px-5 py-4 text-lg text-slate-100 outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
                      />
                      <motion.button
                        type="button"
                        className={buttonStyles}
                        whileHover={{ y: -1.5 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setPhase("ingest")}
                      >
                        Begin
                      </motion.button>
                    </div>
                  </motion.div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {integrationList.map((item) => (
                      <motion.div
                        key={item}
                        whileHover={{ y: -2, scale: 1.01 }}
                        className="rounded-full bg-white/5 px-4 py-3 text-xs uppercase tracking-[0.28em] text-slate-400"
                      >
                        {item}
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : phase === "ingest" ? (
              <motion.div
                key="ingest"
                {...pageMotion}
                layout
                className="w-full max-w-3xl rounded-[36px] bg-white/5 p-10 shadow-[0_40px_120px_rgba(0,0,0,0.24)] backdrop-blur-3xl"
              >
                <div className="space-y-8">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="max-w-2xl"
                  >
                    <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Ingestion</p>
                    <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-slate-50">The organization begins to reveal itself.</h2>
                    <p className="mt-4 text-base leading-7 text-slate-400">
                      Files and integrations are understood as entities, obligations, and risk signals. The system builds a living enterprise model without exposing raw files.
                    </p>
                  </motion.div>

                  <div className="grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
                    <motion.div
                      layout
                      initial={{ opacity: 0.9, scale: 0.99 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="relative overflow-hidden rounded-[32px] bg-[#07121c]/90 p-8 text-slate-100 shadow-[0_30px_90px_rgba(0,0,0,0.16)]"
                    >
                      <motion.div
                        className="absolute left-0 top-8 h-24 w-24 rounded-full bg-cyan-500/10 blur-3xl"
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
                      />
                      <motion.div
                        className="absolute right-4 top-10 h-20 w-20 rounded-full bg-amber-400/10 blur-3xl"
                        animate={{ y: [0, 8, 0] }}
                        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
                      />
                      <div className="relative space-y-6">
                        <div className="space-y-3">
                          {sourceList.slice(0, 3).map((source, index) => (
                            <motion.div
                              key={source}
                              initial={{ opacity: 0, y: 18 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.08 * index, duration: 0.55, ease: "easeOut" }}
                              className="rounded-3xl bg-white/5 px-4 py-3 text-sm text-slate-200"
                            >
                              {source}
                            </motion.div>
                          ))}
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {sourceList.slice(3).map((source, index) => (
                            <motion.div
                              key={source}
                              initial={{ opacity: 0, y: 18 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.16 + 0.08 * index, duration: 0.55, ease: "easeOut" }}
                              className="rounded-3xl bg-white/5 px-4 py-3 text-sm text-slate-200"
                            >
                              {source}
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                    <motion.div
                      layout
                      whileHover={{ y: -2 }}
                      className="flex flex-col justify-between rounded-[32px] bg-[#08131c]/90 p-8 text-slate-100 shadow-[0_30px_90px_rgba(0,0,0,0.16)]"
                    >
                      <div className="space-y-4">
                        <motion.div
                          initial={{ opacity: 0, y: 18 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.55, ease: "easeOut" }}
                          className="flex items-center justify-between rounded-3xl bg-slate-950/50 px-4 py-3 text-sm text-slate-200"
                        >
                          <span>Entities discovered</span>
                          <span>41</span>
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0, y: 18 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1, duration: 0.55, ease: "easeOut" }}
                          className="flex items-center justify-between rounded-3xl bg-slate-950/50 px-4 py-3 text-sm text-slate-200"
                        >
                          <span>Connections formed</span>
                          <span>28</span>
                        </motion.div>
                      </div>
                      <motion.button
                        type="button"
                        className={buttonStyles}
                        whileHover={{ y: -1.5 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setSelectedSimulation("gdpr");
                          setPhase("simulate");
                        }}
                      >
                        Continue
                      </motion.button>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            ) : phase === "twin" ? (
              <motion.div
                key="twin"
                {...pageMotion}
                layout
                className="w-full max-w-3xl rounded-[36px] bg-white/5 p-10 shadow-[0_40px_120px_rgba(0,0,0,0.24)] backdrop-blur-3xl"
              >
                <div className="space-y-8">
                  <div className="max-w-2xl">
                    <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Operational Twin</p>
                    <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-slate-50">A living institutional graph emerges.</h2>
                    <p className="mt-4 text-base leading-7 text-slate-400">
                      The enterprise is represented as flowing relationships, floating layers, and glowing operational connections instead of technical nodes.
                    </p>
                  </div>

                  <motion.div
                    className="relative overflow-hidden rounded-[32px] bg-[#07131c]/90 p-10 text-slate-100 shadow-[0_30px_90px_rgba(0,0,0,0.16)]"
                    initial={{ opacity: 0.9, scale: 0.99 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.75, ease: "easeOut" }}
                  >
                    <motion.div
                      className="absolute left-6 top-6 h-24 w-24 rounded-full bg-cyan-500/10 blur-3xl"
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <motion.div
                      className="absolute right-6 bottom-10 h-28 w-28 rounded-full bg-amber-400/10 blur-3xl"
                      animate={{ y: [0, 10, 0] }}
                      transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <div className="relative mx-auto grid max-w-2xl gap-6">
                      <div className="grid gap-4 sm:grid-cols-2">
                        {graphNodes.slice(0, 3).map((node, index) => (
                          <motion.div
                            key={node}
                            whileHover={{ y: -2, scale: 1.003 }}
                            animate={{ opacity: [0.8, 1, 0.8], scale: [0.98, 1, 0.98] }}
                            transition={{ duration: 8, repeat: Infinity, delay: index * 0.6, ease: "easeInOut" }}
                            className="rounded-[28px] bg-white/5 px-5 py-4 text-sm text-slate-200 backdrop-blur-sm"
                          >
                            {node}
                          </motion.div>
                        ))}
                      </div>
                      <motion.div
                        className="mx-auto flex max-w-[320px] flex-col items-center gap-4 rounded-[36px] bg-slate-950/50 px-6 py-7 text-center shadow-[0_20px_80px_rgba(0,0,0,0.28)]"
                        animate={{ y: [0, -6, 0] }}
                        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <p className="text-xs uppercase tracking-[0.32em] text-slate-400">Core</p>
                        <p className="text-2xl font-semibold text-slate-50">Exposure zone</p>
                        <p className="text-sm leading-6 text-slate-400">A strategic center traces risk between vendors, obligations, policies and operations.</p>
                      </motion.div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {graphNodes.slice(3).map((node, index) => (
                          <motion.div
                            key={node}
                            whileHover={{ y: -2, scale: 1.003 }}
                            animate={{ opacity: [0.8, 1, 0.8], scale: [0.98, 1, 0.98] }}
                            transition={{ duration: 8, repeat: Infinity, delay: 0.4 + index * 0.6, ease: "easeInOut" }}
                            className="rounded-[28px] bg-white/5 px-5 py-4 text-sm text-slate-200 backdrop-blur-sm"
                          >
                            {node}
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </motion.div>

                  <motion.button
                    type="button"
                    className={buttonStyles}
                    whileHover={{ y: -1.5 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setSelectedSimulation("gdpr");
                      setPhase("simulate");
                    }}
                  >
                    Run simulation
                  </motion.button>
                </div>
              </motion.div>
            ) : phase === "simulate" ? (
              <motion.div
                key="simulate"
                {...pageMotion}
                layout
                className="w-full max-w-3xl rounded-[36px] bg-white/5 p-10 shadow-[0_40px_120px_rgba(0,0,0,0.24)] backdrop-blur-3xl"
              >
                <div className="space-y-8">
                  <div className="max-w-2xl">
                    <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Simulation Engine</p>
                    <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-slate-50">Institutional reasoning, not a generic answer.</h2>
                    <p className="mt-4 text-base leading-7 text-slate-400">
                      The operational twin runs scenario simulations through contracts, policies, vendors, and team dependencies. Each flow surfaces why something matters and how risk propagates.
                    </p>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-[0.95fr_0.7fr]">
                    <div className="space-y-6">
                      <div className="grid gap-3 sm:grid-cols-3">
                        {simulationFlows.map((flow) => (
                          <motion.button
                            key={flow.id}
                            type="button"
                            onClick={() => setSelectedSimulation(flow.id)}
                            whileHover={{ y: -2 }}
                            className={`rounded-[28px] border px-5 py-4 text-left transition ${
                              flow.id === selectedSimulation
                                ? "border-cyan-400/40 bg-cyan-500/10 text-slate-50"
                                : "border-white/10 bg-white/5 text-slate-300 hover:border-slate-200/20 hover:bg-white/10"
                            }`}
                          >
                            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{flow.title}</p>
                            <p className="mt-3 text-sm leading-6 text-slate-200">{flow.subtitle}</p>
                          </motion.button>
                        ))}
                      </div>

                      <motion.div
                        initial={{ opacity: 0.95, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.65, ease: "easeOut" }}
                        className="rounded-[32px] bg-[#07121c]/90 p-8 shadow-[0_30px_90px_rgba(0,0,0,0.16)]"
                      >
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Trigger event</p>
                            <h3 className="text-2xl font-semibold text-slate-50">{activeSimulation.title}</h3>
                            <p className="text-sm leading-6 text-slate-400">{activeSimulation.trigger}</p>
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            {[
                              { label: "Institutional reasoning", value: activeSimulation.reasoning },
                              { label: "Dependency tracing", value: activeSimulation.dependencies },
                            ].map((item) => (
                              <div key={item.label} className="rounded-[24px] bg-white/5 p-4 text-sm text-slate-200 backdrop-blur-sm">
                                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">{item.label}</p>
                                <p className="mt-3 leading-6">{item.value}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        {[
                          { title: "Exposure identified", content: activeSimulation.exposure },
                          { title: "Risk propagation", content: activeSimulation.propagation },
                        ].map((item) => (
                          <motion.div
                            key={item.title}
                            initial={{ opacity: 0, y: 18 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.55, ease: "easeOut" }}
                            className="rounded-[28px] bg-white/5 p-6 text-sm text-slate-200 backdrop-blur-sm"
                          >
                            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">{item.title}</p>
                            <p className="mt-3 leading-6 text-slate-100">{item.content}</p>
                          </motion.div>
                        ))}
                      </div>

                      <motion.div
                        className="rounded-[32px] bg-[#0a1926]/90 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.18)]"
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.55, ease: "easeOut" }}
                      >
                        <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Operational consequences</p>
                        <p className="mt-3 text-base leading-7 text-slate-200">{activeSimulation.consequences}</p>
                      </motion.div>

                      <motion.div
                        className="rounded-[32px] bg-white/5 p-6 text-slate-200 backdrop-blur-sm"
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.55, ease: "easeOut" }}
                      >
                        <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Recommended interventions</p>
                        <p className="mt-3 leading-7 text-slate-100">{activeSimulation.interventions}</p>
                      </motion.div>
                    </div>

                    <div className="space-y-6">
                      <motion.div
                        className="rounded-[32px] bg-[#08131c]/90 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.16)]"
                        initial={{ opacity: 0.95, x: 24 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.7, ease: "easeOut" }}
                      >
                        <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Institutional graph</p>
                        <p className="mt-3 text-sm leading-6 text-slate-400">The AI continuously binds teams, vendors, obligations, jurisdictions, and systems into the same reasoning surface.</p>
                        <div className="mt-5 space-y-3">
                          {activeSimulation.relationships.map((relation) => (
                            <div key={relation} className="rounded-3xl bg-white/5 px-4 py-3 text-sm text-slate-200">
                              {relation}
                            </div>
                          ))}
                        </div>
                      </motion.div>

                      <motion.div
                        className="rounded-[32px] bg-[#0c1724]/90 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.16)]"
                        initial={{ opacity: 0.95, x: 24 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.7, ease: "easeOut", delay: 0.05 }}
                      >
                        <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Simulation scorecard</p>
                        <div className="mt-5 grid gap-3">
                          {activeSimulation.metrics.map((metric) => (
                            <div key={metric.label} className="flex items-center justify-between rounded-3xl bg-white/5 px-4 py-3 text-sm text-slate-200">
                              <span>{metric.label}</span>
                              <span className="font-semibold text-slate-50">{metric.value}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    </div>
                  </div>

                  <motion.button
                    type="button"
                    className={buttonStyles}
                    whileHover={{ y: -1.5 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setPhase("vulnerability")}
                  >
                    Reveal vulnerability intelligence
                  </motion.button>
                </div>
              </motion.div>
            ) : phase === "vulnerability" ? (
              <motion.div
                key="vulnerability"
                {...pageMotion}
                layout
                className="w-full max-w-3xl rounded-[36px] bg-white/5 p-10 shadow-[0_40px_120px_rgba(0,0,0,0.24)] backdrop-blur-3xl"
              >
                <div className="space-y-8">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                    className="max-w-2xl"
                  >
                    <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Vulnerability intelligence</p>
                    <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-slate-50">A living operational stream emerges.</h2>
                    <p className="mt-4 text-base leading-7 text-slate-400">
                      Consequential risk signals surface as an ambient intelligence flow, not a notification center. Each item explains causal relationships and connects back to the corporate twin.
                    </p>
                  </motion.div>

                  <div className="relative overflow-hidden rounded-[32px] bg-[#07121c]/90 p-10 text-slate-100 shadow-[0_30px_90px_rgba(0,0,0,0.16)]">
                    <motion.div
                      className="absolute left-12 top-24 bottom-10 w-px bg-gradient-to-b from-cyan-400/30 via-transparent to-amber-400/30"
                      animate={{ opacity: [0.6, 1, 0.6] }}
                      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <div className="relative mx-auto max-w-2xl space-y-6">
                      {vulnerabilityStream.map((item, index) => (
                        <motion.div
                          key={item.title}
                          initial={{ opacity: 0, y: 18 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.08 * index, duration: 0.55, ease: "easeOut" }}
                          whileHover={{ y: -2, scale: 1.005 }}
                          className="relative flex gap-6 rounded-[28px] bg-white/5 px-6 py-5 backdrop-blur-sm"
                        >
                          <div className="mt-1 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-400/20 text-cyan-300 shadow-[0_0_20px_rgba(79,198,255,0.25)]">
                            <div className="h-2 w-2 rounded-full bg-cyan-300" />
                          </div>
                          <div className="space-y-2 text-left">
                            <p className="text-sm uppercase tracking-[0.28em] text-slate-400">{item.title}</p>
                            <p className="text-base text-slate-100">{item.description}</p>
                            <p className="text-sm text-slate-400">{item.relation}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <motion.button
                    type="button"
                    className={buttonStyles}
                    whileHover={{ y: -1.5 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setPhase("result")}
                  >
                    Reveal exposure
                  </motion.button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="result"
                {...pageMotion}
                layout
                className="w-full max-w-3xl rounded-[36px] bg-white/5 p-10 shadow-[0_40px_120px_rgba(0,0,0,0.24)] backdrop-blur-3xl"
              >
                <div className="space-y-10">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                    className="max-w-2xl"
                  >
                    <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Outcome</p>
                    <h2 className="mt-3 text-5xl font-semibold tracking-[-0.05em] text-slate-50">One urgent signal has surfaced.</h2>
                    <p className="mt-5 text-lg leading-8 text-slate-400">
                      The enterprise speaks through a single emergent path. Hidden vendor risk, regulatory exposure, and operational dependency converge into a quiet, unmistakable conclusion.
                    </p>
                  </motion.div>

                  <motion.div
                    className="relative overflow-hidden rounded-[36px] bg-[#07121c]/90 p-10 text-slate-100 shadow-[0_35px_100px_rgba(0,0,0,0.18)]"
                    initial={{ opacity: 0.95, scale: 0.99 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.75, ease: "easeOut" }}
                  >
                    <motion.div
                      className="absolute left-8 top-10 h-24 w-24 rounded-full bg-cyan-500/10 blur-3xl"
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <motion.div
                      className="absolute right-8 top-16 h-24 w-24 rounded-full bg-amber-400/10 blur-3xl"
                      animate={{ y: [0, 10, 0] }}
                      transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <motion.div
                      className="absolute inset-x-12 top-20 h-[1px] bg-gradient-to-r from-cyan-400/30 via-transparent to-amber-400/30"
                      animate={{ opacity: [0.6, 1, 0.6] }}
                      transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                    />

                    <div className="space-y-6">
                      <div className="rounded-[32px] bg-white/5 p-8 text-slate-100 backdrop-blur-sm">
                        <p className="text-sm uppercase tracking-[0.32em] text-slate-500">Signal</p>
                        <p className="mt-4 text-3xl font-semibold leading-tight text-slate-50">{resultSignal.title}</p>
                        <p className="mt-4 text-base leading-7 text-slate-400">{resultSignal.summary}</p>
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        {resultSignal.details.map((item, index) => (
                          <motion.div
                            key={item}
                            whileHover={{ y: -2, scale: 1.003 }}
                            initial={{ opacity: 0, y: 18 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.08 * index, duration: 0.55, ease: "easeOut" }}
                            className="rounded-[28px] bg-white/5 px-5 py-5 text-sm text-slate-200 backdrop-blur-sm"
                          >
                            <p className="text-base text-slate-100">{item}</p>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </motion.div>

                  <motion.button
                    type="button"
                    className={buttonStyles}
                    whileHover={{ y: -1.5 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setPhase("landing")}
                  >
                    Restart experience
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
