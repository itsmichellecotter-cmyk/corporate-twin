"use client";

import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

interface KnowledgeDoc { id: string; name: string; uploadedAt: number; sizeKb?: number; }
interface AccessCode { code: string; createdAt: number; used: boolean; usedAt?: number; }
type Phase = "landing"|"workspace"|"upload"|"ingesting"|"extract"|"dashboard"|"map"|"insight"|"intelligence";
type ContractType = "employment"|"rental"|"freelance"|"service"|"other";
interface AnalyzedContract { id:string; name:string; type:ContractType; uploadedAt:number; obligationCount:number; vulnerabilityCount:number; }
interface UserSession { id:string; shortId:string; createdAt:number; contracts:AnalyzedContract[]; }

// ─── Content ──────────────────────────────────────────────────────────────────

const obligations = [
  { id:"noncompete",  label:"Non-compete",          detail:"18 months · 50-mile radius", risk:"high",   x:50, y:10 },
  { id:"ip",          label:"IP assignment",         detail:"All work product",            risk:"high",   x:80, y:23 },
  { id:"autorenewal", label:"Auto-renewal",          detail:"12-month cycles",             risk:"medium", x:83, y:57 },
  { id:"termination", label:"Termination",           detail:"14 days notice",              risk:"medium", x:62, y:85 },
  { id:"arbitration", label:"Arbitration",           detail:"No class action",             risk:"medium", x:25, y:82 },
  { id:"amendment",   label:"Unilateral amendments", detail:"No consent required",         risk:"high",   x:15, y:44 },
] as const;

const clauses = [
  { text:"Non-compete clause",    primary:true,  x:"5%",  y:"8%",  delay:260  },
  { text:"IP assignment",         primary:true,  x:"56%", y:"5%",  delay:580  },
  { text:"Unilateral amendments", primary:true,  x:"7%",  y:"50%", delay:900  },
  { text:"Termination",           primary:false, x:"72%", y:"36%", delay:1350 },
  { text:"Auto-renewal",          primary:false, x:"30%", y:"76%", delay:1520 },
  { text:"Arbitration required",  primary:false, x:"54%", y:"62%", delay:1690 },
  { text:"Confidentiality",       primary:false, x:"12%", y:"86%", delay:1810 },
  { text:"Governing law",         primary:false, x:"80%", y:"78%", delay:1890 },
  { text:"Force majeure",         primary:false, x:"43%", y:"90%", delay:1960 },
] as const;

const globalPatterns = [
  { id:"termination", category:"Termination", source:"EU Working Conditions Directive 2019/1152", headline:"Asymmetrical notice obligations are subject to regulatory scrutiny across EU jurisdictions", detail:"EU Directive 2019/1152 requires employment terms to be proportionate and transparent. Notice structures that differ materially between employer and employee are increasingly examined by national labour courts as potential violations of the proportionality principle." },
  { id:"noncompete",  category:"Non-compete",  source:"Almega (SE) · German HGB §74 · UK common law", headline:"Non-compete enforceability depends on jurisdiction, duration, and demonstrable business interest", detail:"Swedish employment guidance (Almega) generally limits non-competes to 9 months for most roles. German law caps the restriction at 24 months and requires financial compensation throughout. UK courts apply a reasonableness test — scope must reflect a legitimate, protectable business interest." },
  { id:"ip",          category:"Intellectual property", source:"UK Patents Act 1977 s.39 · German ArbEG", headline:"Broad IP assignment clauses covering non-employment work may not be fully enforceable", detail:"The UK Patents Act 1977 (s.39) limits employer IP rights to inventions arising directly in the course of employment. Germany's Arbeitnehmererfindungsgesetz applies similar restrictions. Clauses assigning all work product — including personal projects — may be challengeable under applicable national law." },
  { id:"amendment",   category:"Contract terms", source:"Wandsworth LBC v D'Silva [1998] IRLR 329", headline:"Unilateral amendment clauses require fresh consideration to be binding under most contract law systems", detail:"Under English contract law (Wandsworth LBC v D'Silva [1998] IRLR 329), employment terms cannot be varied unilaterally without consent or fresh consideration. Similar principles apply across EU civil law jurisdictions. The clause is not automatically void, but its enforceability is frequently contested." },
] as const;

// ─── Session ──────────────────────────────────────────────────────────────────

function shortId() { return Math.random().toString(36).slice(2,8).toUpperCase(); }

function loadSession(): UserSession {
  if (typeof window==="undefined") return { id:"ssr", shortId:"000000", createdAt:0, contracts:[] };
  try { const raw=localStorage.getItem("atlas_session"); if(raw) return JSON.parse(raw) as UserSession; } catch {}
  const s: UserSession = { id:`a_${Date.now()}`, shortId:shortId(), createdAt:Date.now(), contracts:[] };
  localStorage.setItem("atlas_session", JSON.stringify(s));
  return s;
}

function saveSession(s: UserSession) {
  if (typeof window!=="undefined") localStorage.setItem("atlas_session", JSON.stringify(s));
}

async function validateUserCode(input: string): Promise<boolean> {
  try {
    const res = await fetch("/api/codes/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: input }),
    });
    const data = await res.json();
    return data.valid === true;
  } catch { return false; }
}

// ─── Motion ───────────────────────────────────────────────────────────────────

const E = [0.22,0.1,0.28,1.0] as [number,number,number,number];
const page = { initial:{opacity:0,y:36,filter:"blur(8px)"}, animate:{opacity:1,y:0,filter:"blur(0px)"}, exit:{opacity:0,y:-22,filter:"blur(5px)"}, transition:{duration:0.95,ease:E} };

// ─── Icons ────────────────────────────────────────────────────────────────────

const Ico = {
  arrow: (p?:object) => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" {...p}><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  check: (p?:object) => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" {...p}><path d="M3 7.5l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  upload:(p?:object) => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" {...p}><path d="M8 11V3M5 6l3-3 3 3M3 12v1a1 1 0 001 1h8a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  doc:   (p?:object) => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" {...p}><path d="M3 2h6l3 3v7a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.2"/><path d="M9 2v3h3" stroke="currentColor" strokeWidth="1.2"/></svg>,
};

// ─── AtlasMark ────────────────────────────────────────────────────────────────

function AtlasMark({ color="currentColor", size=15 }: { color?:string; size?:number }) {
  return (
    <span className="atlas-mark" style={{ color, fontSize:size }}>
      <span className="glyph" style={{ width:size*1.2, height:size*1.2 }}><i/></span>
      <span className="word" style={{ fontSize:size }}>atlas</span>
    </span>
  );
}

// ─── GlassDoc (landing art + ingestion tiles) ─────────────────────────────────

function GlassDoc({ title, lines=5, variant="dark" }: { title?:string; lines?:number; variant?:"dark"|"light" }) {
  const widths = [92,78,88,60,84,70,90,55];
  return (
    <div className={variant==="dark"?"glass-tile":"glass-tile-light"} style={{ padding:16 }}>
      {title && (
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12, color:variant==="dark"?"rgba(255,255,255,0.75)":"var(--ink-700)" }}>
          <span style={{ width:8,height:8,borderRadius:2,background:"var(--ice-400)",flexShrink:0 }}/>
          <span className="mono" style={{ fontSize:10,letterSpacing:"0.08em",textTransform:"uppercase" }}>{title}</span>
        </div>
      )}
      {Array.from({length:lines}).map((_,i)=>(
        <div key={i} style={{ height:6,borderRadius:3,marginBottom:7, width:widths[i%widths.length]+"%", background:variant==="dark"?"rgba(255,255,255,0.12)":"rgba(15,23,42,0.08)" }}/>
      ))}
    </div>
  );
}

// ─── StepperBar ───────────────────────────────────────────────────────────────

function StepperBar({ current }: { current:number }) {
  const steps = ["Upload","Extract","Analyze"];
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
      {steps.map((s,i) => {
        const done = i<current, active = i===current;
        return (
          <div key={s} style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, opacity:active||done?1:0.45 }}>
              <span style={{ width:18,height:18,borderRadius:"50%", border:"1px solid "+(active||done?"var(--ink-900)":"var(--hairline-strong)"), background:done?"var(--ink-900)":"transparent", color:done?"white":"var(--ink-700)", display:"inline-flex",alignItems:"center",justifyContent:"center", fontSize:10,fontWeight:600 }}>
                {done?<Ico.check/>:i+1}
              </span>
              <span style={{ fontSize:12, fontWeight:active?600:500 }}>{s}</span>
            </div>
            {i<steps.length-1&&<div style={{ width:24,height:1,background:"var(--hairline-strong)" }}/>}
          </div>
        );
      })}
    </div>
  );
}

// ─── AppChrome ────────────────────────────────────────────────────────────────

function AppChrome({ children, code, step, onSignOut, onKnowledge }: { children:React.ReactNode; code:string; step:number; onSignOut:()=>void; onKnowledge:()=>void; }) {
  return (
    <div style={{ minHeight:"100vh", background:"var(--paper)", display:"flex", flexDirection:"column" }}>
      <header className="app-chrome">
        <div style={{ display:"flex", alignItems:"center", gap:24 }}>
          <button onClick={onSignOut} style={{ display:"contents" }}><AtlasMark color="var(--ink-900)" size={15}/></button>
          <div style={{ height:18,width:1,background:"var(--hairline-strong)" }}/>
          <div className="mono" style={{ fontSize:12,color:"var(--ink-500)",letterSpacing:"0.08em" }}>ENGAGEMENT · {code}</div>
        </div>
        <StepperBar current={step}/>
        <div style={{ display:"flex", alignItems:"center", gap:20 }}>
          <button onClick={onKnowledge} style={{ fontSize:13,color:"var(--ink-500)" }}>Knowledge</button>
          <button onClick={onSignOut} style={{ fontSize:13,color:"var(--ink-500)" }}>End session</button>
        </div>
      </header>
      <main style={{ flex:1, display:"flex", flexDirection:"column" }}>{children}</main>
    </div>
  );
}

// ─── DeviationChart ───────────────────────────────────────────────────────────

function DeviationChart({ motionEnabled }: { motionEnabled:boolean }) {
  const nodes = [
    { x:0.05, dev:-0.18, label:"Base Comp",      sev:"ok",   w:14 },
    { x:0.16, dev:-0.10, label:"Variable",        sev:"ok",   w:11 },
    { x:0.27, dev: 0.04, label:"Bonus Clawback",  sev:"ok",   w:9  },
    { x:0.38, dev: 0.22, label:"Notice Period",   sev:"med",  w:13 },
    { x:0.49, dev: 0.55, label:"Non-compete",     sev:"high", w:17 },
    { x:0.60, dev: 0.32, label:"IP Assignment",   sev:"med",  w:12 },
    { x:0.71, dev:-0.05, label:"Confidentiality", sev:"ok",   w:10 },
    { x:0.82, dev:-0.28, label:"Severance",       sev:"med",  w:14 },
    { x:0.93, dev:-0.08, label:"Governing Law",   sev:"ok",   w:9  },
  ];
  const W=880,H=380, PAD={l:60,r:40,t:40,b:60};
  const iW=W-PAD.l-PAD.r, iH=H-PAD.t-PAD.b, midY=PAD.t+iH/2;
  const yS=(d:number)=>midY+(d/0.65)*(iH/2);
  const xS=(x:number)=>PAD.l+x*iW;
  const sevC=(s:string)=>s==="high"?"oklch(62% 0.18 25)":s==="med"?"oklch(78% 0.13 78)":"oklch(68% 0.08 232)";
  const points=nodes.map(n=>[xS(n.x),yS(n.dev)]);
  const path=points.reduce((a,[x,y],i)=>{
    if(i===0) return `M ${x} ${y}`;
    const [px,py]=points[i-1]; const mx=px+(x-px)/2;
    return a+` C ${mx} ${py}, ${mx} ${y}, ${x} ${y}`;
  },"");
  const [tick,setTick]=useState(0);
  useEffect(()=>{ if(!motionEnabled) return; const id=setInterval(()=>setTick(t=>t+1),60); return()=>clearInterval(id); },[motionEnabled]);
  return (
    <div className="card" style={{ padding:28 }}>
      <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:8 }}>
        <div>
          <div className="eyebrow">Hero · Clause deviation from market</div>
          <div style={{ fontSize:22,fontWeight:500,marginTop:8,letterSpacing:"-0.015em" }}>How this contract compares to market benchmarks</div>
          <div style={{ fontSize:13,color:"var(--ink-500)",marginTop:4 }}>Vertical position = deviation from market median. Above the line favors the counterparty.</div>
        </div>
        <div style={{ display:"flex",gap:6 }}>
          <button style={{ fontSize:12,padding:"6px 12px",border:"1px solid var(--hairline-strong)",borderRadius:999,background:"var(--ink-900)",color:"white" }}>Deviation</button>
          <button style={{ fontSize:12,padding:"6px 12px",border:"1px solid var(--hairline-strong)",borderRadius:999,color:"var(--ink-700)" }}>Similarity</button>
          <button style={{ fontSize:12,padding:"6px 12px",border:"1px solid var(--hairline-strong)",borderRadius:999,color:"var(--ink-700)" }}>Ribbons</button>
        </div>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display:"block",marginTop:12 }}>
        <defs>
          <linearGradient id="aboveGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="oklch(62% 0.18 25 / 0.08)"/><stop offset="1" stopColor="oklch(62% 0.18 25 / 0)"/></linearGradient>
          <linearGradient id="belowGrad" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="oklch(68% 0.08 232 / 0.10)"/><stop offset="1" stopColor="oklch(68% 0.08 232 / 0)"/></linearGradient>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="oklch(20% 0.02 252)"/><stop offset="0.5" stopColor="oklch(50% 0.06 232)"/><stop offset="1" stopColor="oklch(20% 0.02 252)"/></linearGradient>
          <clipPath id="aboveClip"><rect x={PAD.l} y={PAD.t} width={iW} height={midY-PAD.t}/></clipPath>
          <clipPath id="belowClip"><rect x={PAD.l} y={midY} width={iW} height={H-PAD.b-midY}/></clipPath>
        </defs>
        {[-0.5,-0.25,0.25,0.5].map(d=><line key={d} x1={PAD.l} x2={W-PAD.r} y1={yS(d)} y2={yS(d)} stroke="var(--hairline)" strokeDasharray="2 4"/>)}
        <line x1={PAD.l} x2={W-PAD.r} y1={midY} y2={midY} stroke="var(--ink-900)" strokeWidth="1" opacity="0.85"/>
        <text x={PAD.l-8} y={midY+4} textAnchor="end" fontSize="10" fill="var(--ink-700)" fontFamily="var(--font-mono)" letterSpacing="0.05em">MEDIAN</text>
        <text x={PAD.l-8} y={yS(0.5)+4} textAnchor="end" fontSize="10" fill="var(--ink-400)" fontFamily="var(--font-mono)">+50%</text>
        <text x={PAD.l-8} y={yS(-0.5)+4} textAnchor="end" fontSize="10" fill="var(--ink-400)" fontFamily="var(--font-mono)">−50%</text>
        <text x={W-PAD.r+8} y={PAD.t+12} fontSize="9" fill="var(--ink-400)" fontFamily="var(--font-mono)" letterSpacing="0.08em">UNFAVORABLE</text>
        <text x={W-PAD.r+8} y={H-PAD.b-4} fontSize="9" fill="var(--ink-400)" fontFamily="var(--font-mono)" letterSpacing="0.08em">FAVORABLE</text>
        <path d={path+` L ${xS(0.93)} ${midY} L ${xS(0.05)} ${midY} Z`} fill="url(#aboveGrad)" clipPath="url(#aboveClip)"/>
        <path d={path+` L ${xS(0.93)} ${midY} L ${xS(0.05)} ${midY} Z`} fill="url(#belowGrad)" clipPath="url(#belowClip)"/>
        {nodes.map((n,i)=>{
          const cx=xS(n.x),cy=yS(n.dev),seed=i*7;
          return Array.from({length:8}).map((_,j)=>{
            const ang=((seed+j*47)%360)*Math.PI/180, r=12+((seed+j*13)%18);
            const bob=motionEnabled?Math.sin((tick+i*8+j*3)*0.05)*1.2:0;
            return <circle key={`p-${i}-${j}`} cx={cx+Math.cos(ang)*r} cy={cy+Math.sin(ang)*r+bob} r="1.2" fill={sevC(n.sev)} opacity="0.25"/>;
          });
        })}
        <path d={path} fill="none" stroke="url(#lineGrad)" strokeWidth="1.5"/>
        {nodes.map((n,i)=>{
          const cx=xS(n.x),cy=yS(n.dev);
          const breath=motionEnabled?Math.sin((tick+i*20)*0.03)*1.5:0;
          return (
            <g key={n.label} style={{ transform:`translateY(${breath}px)`, transformBox:"fill-box", transformOrigin:"center" }}>
              <circle cx={cx} cy={cy} r={n.w+8} fill={sevC(n.sev)} opacity="0.08"/>
              <circle cx={cx} cy={cy} r={n.w+3} fill="white" stroke={sevC(n.sev)} strokeWidth="1" opacity="0.35"/>
              <circle cx={cx} cy={cy} r={n.w*0.45} fill={sevC(n.sev)}/>
              <circle cx={cx} cy={cy} r={n.w*0.45} fill="white" opacity="0.35"/>
              <line x1={cx} y1={cy} x2={cx} y2={midY} stroke={sevC(n.sev)} strokeWidth="1" strokeDasharray="2 2" opacity="0.3"/>
              <text x={cx} y={n.dev>0?cy-n.w-12:cy+n.w+18} textAnchor="middle" fontSize="11" fontWeight="500" fill="var(--ink-900)">{n.label}</text>
              <text x={cx} y={n.dev>0?cy-n.w-24:cy+n.w+32} textAnchor="middle" fontSize="10" fill={sevC(n.sev)} fontFamily="var(--font-mono)" fontWeight="500">{n.dev>0?"+":""}{Math.round(n.dev*100)}%</text>
            </g>
          );
        })}
      </svg>
      <div style={{ display:"flex",gap:20,marginTop:8,fontSize:12,color:"var(--ink-500)" }}>
        {[["oklch(68% 0.08 232)","Within market"],["oklch(78% 0.13 78)","Review needed"],["oklch(62% 0.18 25)","High deviation"]].map(([c,l])=>(
          <span key={l} style={{ display:"inline-flex",alignItems:"center",gap:6 }}><span style={{ width:8,height:8,borderRadius:"50%",background:c }}/>{l}</span>
        ))}
        <span style={{ marginLeft:"auto",display:"flex",alignItems:"center",gap:6 }} className="mono">
          <span style={{ width:6,height:6,borderRadius:"50%",background:"var(--ice-400)",animation:motionEnabled?"pulse-ring 2s ease-out infinite":"none" }}/>
          LIVE · benchmarks updated regularly
        </span>
      </div>
    </div>
  );
}

// ─── KPI ──────────────────────────────────────────────────────────────────────

function KPI({ label, value, delta, trend, sublabel }: { label:string; value:string; delta:string; trend:string; sublabel?:string }) {
  const color=trend==="high"?"var(--red)":trend==="med"?"var(--amber)":"var(--ink-900)";
  return (
    <div className="card-sm" style={{ padding:18 }}>
      <div style={{ fontSize:11,color:"var(--ink-500)",letterSpacing:"0.02em" }}>{label}</div>
      <div style={{ display:"flex",alignItems:"baseline",gap:8,marginTop:8 }}>
        <span className="mono" style={{ fontSize:32,fontWeight:300,letterSpacing:"-0.04em",color }}>{value}</span>
        {sublabel&&<span className="mono" style={{ fontSize:9,color,letterSpacing:"0.1em",opacity:0.7 }}>{sublabel}</span>}
      </div>
      <div style={{ fontSize:11,color:"var(--ink-500)",marginTop:4 }}>{delta}</div>
    </div>
  );
}

// ─── RiskRadial ───────────────────────────────────────────────────────────────

function RiskRadial() {
  const segs = [
    { label:"Compensation", val:0.22, color:"var(--ice-500)" },
    { label:"Restraints",   val:0.84, color:"oklch(62% 0.18 25)" },
    { label:"Termination",  val:0.46, color:"oklch(78% 0.13 78)" },
    { label:"IP & Conf.",   val:0.58, color:"oklch(78% 0.13 78)" },
    { label:"Boilerplate",  val:0.18, color:"var(--ice-500)" },
  ];
  const CX=130,CY=130,total=segs.length,gap=0.04;
  return (
    <div className="card" style={{ padding:24 }}>
      <div className="eyebrow">Risk score · radial</div>
      <div style={{ fontSize:16,fontWeight:500,marginTop:6 }}>Aggregate risk by category</div>
      <div style={{ display:"grid",gridTemplateColumns:"260px 1fr",gap:16,marginTop:16,alignItems:"center" }}>
        <svg width="260" height="260" viewBox="0 0 260 260">
          {segs.map((s,i)=>{
            const a0=(i/total)*Math.PI*2-Math.PI/2+gap, a1=((i+1)/total)*Math.PI*2-Math.PI/2-gap;
            const r=38+s.val*60, large=(a1-a0)>Math.PI?1:0;
            const [x0,y0]=[CX+Math.cos(a0)*r,CY+Math.sin(a0)*r];
            const [x1,y1]=[CX+Math.cos(a1)*r,CY+Math.sin(a1)*r];
            const [bx0,by0]=[CX+Math.cos(a0)*100,CY+Math.sin(a0)*100];
            const [bx1,by1]=[CX+Math.cos(a1)*100,CY+Math.sin(a1)*100];
            const [ix0,iy0]=[CX+Math.cos(a0)*38,CY+Math.sin(a0)*38];
            const [ix1,iy1]=[CX+Math.cos(a1)*38,CY+Math.sin(a1)*38];
            return (
              <g key={s.label}>
                <path d={`M ${ix0} ${iy0} L ${bx0} ${by0} A 100 100 0 ${large} 1 ${bx1} ${by1} L ${ix1} ${iy1} A 38 38 0 ${large} 0 ${ix0} ${iy0} Z`} fill="oklch(96% 0.005 252)" stroke="var(--hairline)"/>
                <path d={`M ${ix0} ${iy0} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} L ${ix1} ${iy1} A 38 38 0 ${large} 0 ${ix0} ${iy0} Z`} fill={s.color} opacity="0.85"/>
              </g>
            );
          })}
          <circle cx={CX} cy={CY} r="36" fill="white"/>
          <text x={CX} y={CY-2} textAnchor="middle" fontSize="28" fontWeight="300" fill="var(--ink-900)" fontFamily="var(--font-mono)" letterSpacing="-0.05em">62</text>
          <text x={CX} y={CY+14} textAnchor="middle" fontSize="9" fill="var(--ink-500)" fontFamily="var(--font-mono)" letterSpacing="0.1em">SCORE</text>
        </svg>
        <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
          {segs.map(s=>(
            <div key={s.label}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"baseline",fontSize:12 }}>
                <span style={{ color:"var(--ink-700)" }}>{s.label}</span>
                <span className="mono" style={{ color:s.color,fontWeight:500 }}>{Math.round(s.val*100)}</span>
              </div>
              <div style={{ height:3,background:"oklch(95% 0.005 252)",borderRadius:2,marginTop:4,overflow:"hidden" }}>
                <div style={{ width:s.val*100+"%",height:"100%",background:s.color,transition:"width .8s ease-out" }}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── ObligationTimeline ───────────────────────────────────────────────────────

function ObligationTimeline({ motionEnabled }: { motionEnabled:boolean }) {
  const months=["Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May"];
  const events=[{m:0,label:"Effective date",sev:"ok"},{m:1,label:"Probation end",sev:"ok"},{m:4,label:"Rent review",sev:"med"},{m:5,label:"Bonus vesting",sev:"ok"},{m:8,label:"Notice window",sev:"high"},{m:11,label:"Lease break",sev:"med"}];
  const sevC=(s:string)=>s==="high"?"var(--red)":s==="med"?"var(--amber)":"var(--ice-500)";
  return (
    <div className="card" style={{ padding:24 }}>
      <div className="eyebrow">Obligations · next 12 months</div>
      <div style={{ fontSize:16,fontWeight:500,marginTop:6 }}>What you must track</div>
      <div style={{ marginTop:24,position:"relative",paddingTop:24,paddingBottom:32 }}>
        <div style={{ position:"absolute",left:0,right:0,top:"50%",height:1,background:"var(--hairline-strong)" }}/>
        {months.map((m,i)=>(
          <div key={m} style={{ position:"absolute",left:`${(i/11)*100}%`,top:"50%",transform:"translate(-50%,-50%)" }}>
            <div style={{ width:1,height:6,background:"var(--hairline-strong)",margin:"0 auto" }}/>
            <div className="mono" style={{ fontSize:9,color:"var(--ink-400)",letterSpacing:"0.1em",marginTop:6 }}>{m}</div>
          </div>
        ))}
        {events.map((e,i)=>(
          <div key={i} style={{ position:"absolute",left:`${(e.m/11)*100}%`,top:"50%",transform:"translate(-50%,-50%)" }}>
            <div style={{ width:14,height:14,borderRadius:"50%",background:sevC(e.sev), boxShadow:`0 0 0 3px white, 0 0 0 4px ${sevC(e.sev)}`, animation:motionEnabled?`breathe-y 3s ease-in-out infinite ${i*0.3}s`:"none" }}/>
            <div style={{ position:"absolute",left:"50%",bottom:e.m%2===0?22:"auto",top:e.m%2===0?"auto":22, transform:"translateX(-50%)",whiteSpace:"nowrap",fontSize:11,fontWeight:500,color:"var(--ink-900)" }}>{e.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── TermRibbons ──────────────────────────────────────────────────────────────

function TermRibbons({ motionEnabled }: { motionEnabled:boolean }) {
  const terms=[
    { label:"Base compensation", you:0.62, market:0.5 },
    { label:"Variable / bonus",  you:0.45, market:0.5 },
    { label:"Notice period",     you:0.72, market:0.5 },
    { label:"Non-compete scope", you:0.88, market:0.5 },
    { label:"IP assignment",     you:0.78, market:0.5 },
    { label:"Severance",         you:0.30, market:0.5 },
    { label:"Confidentiality",   you:0.52, market:0.5 },
  ];
  return (
    <div className="card" style={{ padding:24 }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-end" }}>
        <div><div className="eyebrow">Term comparison ribbons</div><div style={{ fontSize:16,fontWeight:500,marginTop:6 }}>Favorable ↔ unfavorable</div></div>
        <div className="mono" style={{ fontSize:10,color:"var(--ink-500)",letterSpacing:"0.1em" }}>◄ FAVORS YOU · COUNTERPARTY ►</div>
      </div>
      <div style={{ marginTop:20,display:"grid",gridTemplateColumns:"160px 1fr 60px",gap:12,alignItems:"center" }}>
        {terms.map((t,i)=>(
          <div key={t.label} style={{ display:"contents" }}>
            <div style={{ fontSize:12.5,color:"var(--ink-700)" }}>{t.label}</div>
            <div style={{ position:"relative",height:24 }}>
              <div style={{ position:"absolute",left:0,right:0,top:"50%",height:4,background:"oklch(96% 0.005 252)",borderRadius:2,transform:"translateY(-50%)" }}/>
              <div style={{ position:"absolute",left:"50%",top:2,bottom:2,width:1,background:"var(--ink-900)" }}/>
              <div className="mono" style={{ position:"absolute",left:"50%",top:-10,transform:"translateX(-50%)",fontSize:8,color:"var(--ink-500)",letterSpacing:"0.1em" }}>MKT</div>
              <div style={{ position:"absolute",top:"50%",height:6,transform:"translateY(-50%)", left:Math.min(t.you,t.market)*100+"%", width:Math.abs(t.you-t.market)*100+"%", background:t.you>t.market?"oklch(62% 0.18 25 / 0.4)":"oklch(68% 0.08 232 / 0.4)", borderRadius:3, animation:motionEnabled?`breathe-y 4s ease-in-out infinite ${i*0.2}s`:"none" }}/>
              <div style={{ position:"absolute",top:"50%",transform:"translate(-50%,-50%)", left:t.you*100+"%", width:12,height:12,borderRadius:"50%", background:t.you>t.market?"var(--red)":"var(--ice-500)", boxShadow:`0 0 0 2px white, 0 0 0 3px ${t.you>t.market?"var(--red)":"var(--ice-500)"}` }}/>
            </div>
            <div className="mono" style={{ fontSize:11,textAlign:"right",color:t.you>t.market?"var(--red)":"var(--ice-500)",fontWeight:500 }}>
              {t.you>t.market?"+":"−"}{Math.abs(Math.round((t.you-t.market)*100))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PeerSimilarity ───────────────────────────────────────────────────────────

function PeerSimilarity({ motionEnabled }: { motionEnabled:boolean }) {
  const peers=["Peer A","Peer B","Peer C","Peer D","Peer E","Peer F","Peer G","Peer H"];
  const cats=["Comp","Notice","Non-comp","IP","Sev","Gov"];
  const data=peers.map((_,i)=>cats.map((__,j)=>0.3+((i*31+j*17)%100)/100*0.7));
  return (
    <div className="card" style={{ padding:24 }}>
      <div className="eyebrow">Peer similarity matrix</div>
      <div style={{ fontSize:16,fontWeight:500,marginTop:6 }}>Clause overlap with peers</div>
      <div style={{ marginTop:20,display:"grid",gridTemplateColumns:`repeat(${cats.length}, 1fr)`,gap:4 }}>
        {cats.map(c=><div key={c} className="mono" style={{ fontSize:9,color:"var(--ink-400)",letterSpacing:"0.1em",textAlign:"center",paddingBottom:4 }}>{c.toUpperCase()}</div>)}
        {data.map((row,i)=>row.map((v,j)=>(
          <div key={`${i}-${j}`} style={{ aspectRatio:"1", background:`oklch(${100-v*50}% ${v*0.08} 232)`, border:"1px solid white", borderRadius:2, position:"relative", animation:motionEnabled?`fade-in-up .4s ease-out ${(i*6+j)*0.02}s both`:"none" }}>
            {v>0.85&&<div style={{ position:"absolute",inset:3,border:"1px solid var(--ice-500)",borderRadius:1 }}/>}
          </div>
        )))}
      </div>
      <div style={{ display:"flex",justifyContent:"space-between",marginTop:14,fontSize:11,color:"var(--ink-500)" }}>
        <span className="mono">LOW</span>
        <div style={{ flex:1,height:4,margin:"0 12px",borderRadius:2,background:"linear-gradient(90deg, oklch(98% 0 232), oklch(50% 0.08 232))" }}/>
        <span className="mono">HIGH</span>
      </div>
    </div>
  );
}

// ─── RedactedDoc (extraction screen) ─────────────────────────────────────────

function RedactedDoc({ step, motionEnabled }: { step:number; motionEnabled:boolean }) {
  const lines=[{w:92},{w:80},{w:86,e:0},{w:60},{w:88},{w:75,e:1},{w:82},{w:90,e:2},{w:64},{w:84},{w:70,e:3},{w:88},{w:78},{w:60,e:5},{w:86},{w:92,e:8}];
  return (
    <div className="glass-tile" style={{ marginTop:28,padding:28,position:"relative",overflow:"hidden" }}>
      {motionEnabled&&step<16&&(
        <div style={{ position:"absolute",left:0,right:0,height:80,background:"linear-gradient(to bottom, transparent, oklch(80% 0.06 232 / 0.18), transparent)", animation:"scan 3s ease-in-out infinite",pointerEvents:"none" }}/>
      )}
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
        <div className="mono" style={{ fontSize:10,color:"var(--ice-300)",letterSpacing:"0.12em" }}>SOURCE DOCUMENT · REDACTED VIEW</div>
        <div style={{ display:"flex",gap:4 }}>
          <span style={{ width:8,height:8,borderRadius:"50%",background:"var(--ice-400)" }}/>
          <span style={{ width:8,height:8,borderRadius:"50%",background:"oklch(60% 0.08 232 / 0.4)" }}/>
        </div>
      </div>
      <div style={{ position:"relative" }}>
        {lines.map((l,i)=>(
          <div key={i} style={{ marginBottom:10,display:"flex",alignItems:"center",gap:12 }}>
            <span className="mono" style={{ fontSize:9,color:"rgba(168,184,216,0.4)",width:18 }}>{(i+1).toString().padStart(2,"0")}</span>
            <div style={{ flex:1,position:"relative" }}>
              <div style={{ height:8,borderRadius:2,width:l.w+"%",background:"oklch(8% 0.02 252 / 0.85)",boxShadow:"inset 0 0 0 1px rgba(255,255,255,0.04)" }}/>
              {(l as {w:number;e?:number}).e!==undefined&&step>(l as {w:number;e?:number}).e!&&(
                <div style={{ position:"absolute",left:0,top:-2,height:12,width:l.w+"%",background:"oklch(80% 0.06 232 / 0.12)",borderLeft:"2px solid var(--ice-400)",animation:"fade-in-up .3s ease-out both" }}/>
              )}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:20,paddingTop:16,borderTop:"1px solid rgba(255,255,255,0.08)",fontSize:10,color:"rgba(168,184,216,0.5)" }} className="mono">
        <span>P. 03 / 24</span>
        <span>UI PREVIEW · CONTENT NEVER LEAVES THE VAULT</span>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [phase, setPhase]               = useState<Phase>("landing");
  const [session, setSession]           = useState<UserSession|null>(null);
  const [file, setFile]                 = useState<File|null>(null);
  const [dragging, setDragging]         = useState(false);
  const [progress, setProgress]         = useState(0);
  const [visibleClauses, setVisible]    = useState<Set<number>>(new Set());
  const [activeNode, setActiveNode]     = useState<string|null>(null);
  const [introWord, setIntroWord]       = useState<"juritas"|"atlas">("juritas");
  const [showIntro, setShowIntro]       = useState(false);
  const [showKnowledge, setShowKb]      = useState(false);
  const [absorbedDocs, setAbsorbedDocs] = useState<KnowledgeDoc[]>([]);
  const [gated, setGated]               = useState(false);
  const [userCode, setUserCode]         = useState("");
  const [userCodeError, setUserCodeError] = useState(false);
  const [codeFocused, setCodeFocused]   = useState(false);
  const [codeLoading, setCodeLoading]   = useState(false);
  const [extractStep, setExtractStep]   = useState(0);
  const [selectedDoc, setSelectedDoc]   = useState(0);
  const [demoMode, setDemoMode]         = useState(true);

  const inputRef     = useRef<HTMLInputElement>(null);
  const snapSession  = useRef<UserSession|null>(null);
  const snapFile     = useRef<File|null>(null);

  useEffect(()=>{ snapSession.current=session; },[session]);
  useEffect(()=>{ snapFile.current=file; },[file]);
  useEffect(()=>{ setSession(loadSession()); },[]);

  // Gate check
  useEffect(()=>{
    if(typeof window==="undefined") return;
    if(localStorage.getItem("atlas_user_access")==="granted") setGated(true);
  },[]);

  // Redirect to landing if not gated and not already there
  useEffect(()=>{
    if(!gated&&phase!=="landing") setPhase("landing");
  },[gated]);

  // Intro animation
  useEffect(()=>{
    if(!gated) return;
    if(typeof window==="undefined") return;
    if(sessionStorage.getItem("atlas_intro")) return;
    setShowIntro(true);
    const t1=setTimeout(()=>setIntroWord("atlas"),1600);
    const t2=setTimeout(()=>setShowIntro(false),3200);
    sessionStorage.setItem("atlas_intro","1");
    return()=>{ clearTimeout(t1); clearTimeout(t2); };
  },[gated]);

  // Knowledge docs
  useEffect(()=>{
    try { const raw=localStorage.getItem("atlas_knowledge_docs"); if(raw) setAbsorbedDocs(JSON.parse(raw) as KnowledgeDoc[]); } catch {}
  },[]);

  // Cursor spring (legacy screens)
  const rawX=useMotionValue(0.5), rawY=useMotionValue(0.5);
  const cx=useSpring(rawX,{stiffness:28,damping:28,mass:0.6});
  const cy=useSpring(rawY,{stiffness:28,damping:28,mass:0.6});
  const orb1x=useTransform(cx,[0,1],["-6%","10%"]), orb1y=useTransform(cy,[0,1],["-4%","6%"]);
  const orb2x=useTransform(cx,[0,1],["5%","-8%"]),  orb2y=useTransform(cy,[0,1],["3%","-5%"]);
  useEffect(()=>{
    const move=(e:MouseEvent)=>{ rawX.set(e.clientX/window.innerWidth); rawY.set(e.clientY/window.innerHeight); };
    window.addEventListener("mousemove",move);
    return()=>window.removeEventListener("mousemove",move);
  },[rawX,rawY]);

  // Ingestion
  useEffect(()=>{
    if(phase!=="ingesting") return;
    setProgress(0); setVisible(new Set());
    const timers: ReturnType<typeof setTimeout>[]=[];
    clauses.forEach((c,i)=>{ timers.push(setTimeout(()=>setVisible(prev=>new Set([...prev,i])),c.delay)); });
    const prog=setInterval(()=>setProgress(p=>Math.min(p+1,100)),40);
    timers.push(setTimeout(()=>{
      const s=snapSession.current, f=snapFile.current;
      if(s){
        const contract: AnalyzedContract={ id:`c_${Date.now()}`, name:f?.name?.replace(/\.[^/.]+$/,"")??"Employment Agreement", type:"employment", uploadedAt:Date.now(), obligationCount:6, vulnerabilityCount:3 };
        const updated={...s,contracts:[...s.contracts,contract]};
        setSession(updated); saveSession(updated);
      }
      setPhase("extract");
    },4400));
    return()=>{ timers.forEach(clearTimeout); clearInterval(prog); };
  },[phase]);

  // Extract
  useEffect(()=>{
    if(phase!=="extract") return;
    setExtractStep(0);
    const timers: ReturnType<typeof setTimeout>[]=[];
    for(let i=0;i<9;i++) timers.push(setTimeout(()=>setExtractStep(i+1),(i+1)*380));
    timers.push(setTimeout(()=>setPhase("dashboard"),9*380+1400));
    return()=>timers.forEach(clearTimeout);
  },[phase]);

  // Handlers
  const handleUserCode=async(e:React.FormEvent)=>{
    e.preventDefault();
    setCodeLoading(true);
    const valid=await validateUserCode(userCode);
    setCodeLoading(false);
    if(valid){
      localStorage.setItem("atlas_user_access","granted");
      setGated(true);
      setPhase("upload");
    } else {
      setUserCodeError(true);
      setUserCode("");
    }
  };

  const onDrop=(e:React.DragEvent)=>{ e.preventDefault(); setDragging(false); const f=e.dataTransfer.files[0]; if(f) setFile(f); };
  const startNewSession=()=>{ const s:UserSession={id:`a_${Date.now()}`,shortId:shortId(),createdAt:Date.now(),contracts:[]}; saveSession(s); setSession(s); setFile(null); setPhase("landing"); };
  const contractName=file?.name?.replace(/\.[^/.]+$/,"")??session?.contracts.at(-1)?.name??"Employment Agreement";
  const codeValid=userCode.length>=5;

  const EXTRACT_CLAUSES=[
    { id:"parties",  label:"Parties",           value:"Mercer Holdings Ltd. ↔ K. Bellamy",  cat:"Identity",    flag:undefined },
    { id:"role",     label:"Role / Title",      value:"VP, Commercial Operations",           cat:"Employment",  flag:undefined },
    { id:"comp",     label:"Base Compensation", value:"£185,000 per annum",                  cat:"Employment",  flag:undefined },
    { id:"bonus",    label:"Variable",          value:"40% target, subject to OKR review",   cat:"Employment",  flag:undefined },
    { id:"term",     label:"Notice Period",     value:"6 months (mutual)",                   cat:"Termination", flag:undefined },
    { id:"noncomp",  label:"Non-compete",       value:"12 months · global scope",            cat:"Restraints",  flag:"high" as const },
    { id:"ip",       label:"IP Assignment",     value:"Full present + future assignment",    cat:"Restraints",  flag:undefined },
    { id:"gov",      label:"Governing Law",     value:"England & Wales",                     cat:"Boilerplate", flag:undefined },
    { id:"severance",label:"Severance",         value:"3 months base + accrued bonus",       cat:"Termination", flag:"medium" as const },
  ];

  const DEMO_DOCS=[
    { short:"Mercer · Employment", type:"Employment", risk:62 },
    { short:"Foley St · Tenancy",  type:"Tenancy",    risk:38 },
    { short:"Severance · Exec",    type:"Employment", risk:71 },
    { short:"Sublease · Q1",       type:"Tenancy",    risk:24 },
  ];

  const isChrome=phase==="upload"||phase==="ingesting"||phase==="extract"||phase==="dashboard";
  const isLegacy=phase==="workspace"||phase==="map"||phase==="insight"||phase==="intelligence";
  const chromeStep=phase==="upload"||phase==="ingesting"?0:phase==="extract"?1:2;

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div>

      {/* ══ LANDING (navy stage) ══════════════════════════════════════════════ */}
      {phase==="landing"&&(
        <div className="navy-stage">
          <div className="grain"/>
          <div className="grid-lines"/>

          {/* Orbit rings */}
          <div className="orbit" style={{ width:1200,height:1200,right:-400,top:-400,animation:"orbit-rot 120s linear infinite" }}/>
          <div className="orbit" style={{ width:820,height:820,right:-200,top:-200,opacity:0.6,animation:"orbit-rot 80s linear infinite reverse" }}/>
          <div className="orbit" style={{ width:480,height:480,right:40,top:40,opacity:0.5 }}/>
          {/* Ice dot on orbit */}
          <div style={{ position:"absolute",right:40+240,top:40+240,width:0,height:0 }}>
            <div style={{ position:"absolute",width:6,height:6,borderRadius:"50%",background:"var(--ice-300)",boxShadow:"0 0 18px var(--ice-glow)",animation:"dot-orbit 24s linear infinite","--r":"240px" } as React.CSSProperties}/>
          </div>

          {/* Header */}
          <header style={{ position:"relative",zIndex:5,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"24px 48px" }}>
            <AtlasMark color="white" size={15}/>
          </header>

          {/* Hero */}
          <main style={{ position:"relative",zIndex:5,padding:"16px 48px 0",display:"grid",gridTemplateColumns:"1.05fr 0.95fr",gap:64,maxWidth:1440,margin:"0 auto" }}>
            {/* Left */}
            <div style={{ paddingTop:20 }}>
              <div className="eyebrow" style={{ color:"var(--ice-300)",opacity:1 }}>CONTRACT INTELLIGENCE — INVITE ONLY</div>
              <h1 style={{ fontSize:78,lineHeight:0.96,fontWeight:300,margin:"24px 0 0",letterSpacing:"-0.035em",color:"white" }}>
                Every clause,<br/><span style={{ fontWeight:700 }}>charted.</span>
              </h1>
              <p style={{ fontSize:17,lineHeight:1.55,color:"rgba(232,236,242,0.65)",maxWidth:460,marginTop:28,fontWeight:400 }}>
                Atlas reads your employment and rental agreements with the rigor of a specialist counsel — surfacing every deviation from market standard, cross-referenced against thousands of peer contracts.
              </p>

              {/* Code entry */}
              <div style={{ marginTop:48,maxWidth:480 }}>
                <div className="eyebrow" style={{ color:"rgba(168,184,216,0.7)",opacity:1 }}>ENTER YOUR ACCESS CODE</div>
                {gated?(
                  <div style={{ marginTop:16 }}>
                    <button className="btn btn-ice" onClick={()=>setPhase("upload")}>Continue to workspace →</button>
                    <p style={{ fontSize:12,color:"rgba(168,184,216,0.45)",marginTop:12 }}>You have an active session.</p>
                  </div>
                ):(
                  <form onSubmit={handleUserCode} style={{ marginTop:12 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:0,padding:"4px 4px 4px 18px", background:"rgba(255,255,255,0.04)", border:`1px solid ${codeFocused||codeValid?"var(--ice-400)":"var(--navy-line)"}`, borderRadius:999,transition:"border-color .25s", boxShadow:codeFocused?"0 0 0 6px oklch(70% 0.06 232 / 0.08)":"none" }}>
                      <input
                        value={userCode}
                        onChange={e=>{ setUserCode(e.target.value.toUpperCase()); setUserCodeError(false); }}
                        onFocus={()=>setCodeFocused(true)}
                        onBlur={()=>setCodeFocused(false)}
                        placeholder="ATL-XXXXX"
                        maxLength={12}
                        className="mono"
                        style={{ flex:1,background:"transparent",border:0,outline:"none",color:"white",fontSize:16,letterSpacing:"0.18em",padding:"12px 0" }}
                        autoComplete="off"
                      />
                      <button type="submit" disabled={!codeValid||codeLoading} className="btn btn-ice" style={{ fontSize:13 }}>
                        {codeLoading?"Checking…":"Continue →"}
                      </button>
                    </div>
                    {userCodeError&&<p style={{ fontSize:12,color:"var(--red)",marginTop:8 }}>Invalid or already-used code. Try again.</p>}
                    <p style={{ fontSize:12,color:"rgba(168,184,216,0.55)",marginTop:12,lineHeight:1.5 }}>
                      Access codes are issued per engagement. Don't have one?{" "}
                      <a style={{ color:"var(--ice-300)",marginLeft:4,textDecoration:"none",cursor:"pointer" }}>Request access →</a>
                    </p>
                    <p style={{ fontSize:11,color:"rgba(168,184,216,0.35)",marginTop:12 }}>
                      Owner access:{" "}
                      <span className="mono" onClick={()=>{ setUserCode("ATLAS"); setUserCodeError(false); }} style={{ cursor:"pointer",color:"var(--ice-300)" }}>ATLAS</span>
                    </p>
                  </form>
                )}
              </div>
            </div>

            {/* Right — constellation */}
            <div style={{ position:"relative",height:620 }}>
              <div style={{ position:"absolute",inset:"10% 5%",borderRadius:"50%",background:"radial-gradient(circle at 50% 40%, oklch(35% 0.08 240 / 0.5), transparent 60%)",filter:"blur(40px)" }}/>
              <div style={{ position:"absolute",inset:0 }}>
                <div style={{ position:"absolute",left:"8%",top:"18%",width:220,transform:"rotate(-6deg)",animation:"drift-tile 9s ease-in-out infinite","--rot":"-6deg" } as React.CSSProperties}>
                  <GlassDoc variant="dark" title="Tenancy Agreement" lines={6}/>
                </div>
                <div style={{ position:"absolute",right:"10%",top:"6%",width:250,transform:"rotate(4deg)",animation:"drift-tile 11s ease-in-out infinite 1.2s","--rot":"4deg" } as React.CSSProperties}>
                  <GlassDoc variant="dark" title="Employment Contract" lines={7}/>
                </div>
                <div style={{ position:"absolute",left:"22%",bottom:"6%",width:240,transform:"rotate(-2deg)",animation:"drift-tile 13s ease-in-out infinite .5s","--rot":"-2deg" } as React.CSSProperties}>
                  <GlassDoc variant="dark" title="Severance Schedule" lines={5}/>
                </div>
                <svg style={{ position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none" }} viewBox="0 0 500 620" preserveAspectRatio="none">
                  <defs><linearGradient id="hairlineGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="oklch(80% 0.06 232 / 0.7)"/><stop offset="1" stopColor="oklch(80% 0.06 232 / 0)"/></linearGradient></defs>
                  <path d="M 130 200 Q 250 100 380 130" stroke="url(#hairlineGrad)" strokeWidth="1" fill="none" strokeDasharray="2 4"/>
                  <path d="M 200 450 Q 260 350 380 240" stroke="url(#hairlineGrad)" strokeWidth="1" fill="none" strokeDasharray="2 4"/>
                  <circle cx="130" cy="200" r="3" fill="var(--ice-300)"/>
                  <circle cx="380" cy="130" r="3" fill="var(--ice-300)"/>
                  <circle cx="200" cy="450" r="3" fill="var(--ice-300)"/>
                </svg>
                <div className="glass-tile" style={{ position:"absolute",right:"6%",bottom:"14%",padding:"14px 16px",minWidth:180 }}>
                  <div className="mono" style={{ fontSize:10,color:"var(--ice-300)",letterSpacing:"0.1em" }}>BENCHMARK CORPUS</div>
                  <div style={{ marginTop:8,fontSize:13,color:"rgba(168,184,216,0.7)",lineHeight:1.5 }}>
                    Thousands of employment &amp; tenancy clauses, anonymised
                  </div>
                </div>
              </div>
            </div>
          </main>

          {/* Bottom strip */}
          <section style={{ position:"relative",zIndex:5,padding:"120px 48px 64px",maxWidth:1440,margin:"0 auto" }}>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(4, 1fr)",gap:1,background:"var(--navy-line)",border:"1px solid var(--navy-line)" }}>
              {[["01","Ingestion","Drop a contract. Encrypted at the edge, parsed in seconds."],["02","Extraction","Parties, terms, dates, obligations — every meaningful clause."],["03","Comparison","Benchmarked against peer agreements and statutory baselines."],["04","Insight","Deviation, risk, and negotiation leverage — at a glance."]].map(([n,t,d])=>(
                <div key={n} style={{ background:"oklch(13% 0.025 252)",padding:"28px 24px" }}>
                  <div className="mono" style={{ fontSize:11,color:"var(--ice-400)",letterSpacing:"0.1em" }}>{n}</div>
                  <div style={{ fontSize:18,fontWeight:500,color:"white",marginTop:12 }}>{t}</div>
                  <div style={{ fontSize:13,color:"rgba(168,184,216,0.55)",marginTop:6,lineHeight:1.55 }}>{d}</div>
                </div>
              ))}
            </div>
            <div style={{ display:"flex",justifyContent:"space-between",marginTop:48,fontSize:12,color:"rgba(168,184,216,0.45)" }}>
              <span>© Atlas Intelligence 2026</span>
              <span className="mono">SOC 2 TYPE II · ISO 27001 · ATTORNEY-CLIENT PRIVILEGED</span>
            </div>
          </section>
        </div>
      )}

      {/* ══ APP-CHROMED SCREENS ════════════════════════════════════════════════ */}
      {isChrome&&(
        <AppChrome code={session?.shortId??"------"} step={chromeStep} onSignOut={()=>setPhase("landing")} onKnowledge={()=>setShowKb(true)}>
          <AnimatePresence mode="wait">

            {/* ── UPLOAD ──────────────────────────────────────────────────── */}
            {phase==="upload"&&(
              <motion.div key="upload" {...page} style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:48 }}>
                <div style={{ maxWidth:720,width:"100%" }}>
                  <div className="eyebrow">Step 01 · Ingestion</div>
                  <h1 style={{ fontSize:44,fontWeight:300,letterSpacing:"-0.03em",margin:"16px 0 12px",color:"var(--ink-900)" }}>
                    Upload the agreements for this engagement.
                  </h1>
                  <p style={{ fontSize:15,color:"var(--ink-500)",lineHeight:1.6,maxWidth:560 }}>
                    Atlas accepts employment and rental contracts in PDF or DOCX. Files are encrypted end-to-end and never used to train models.
                  </p>
                  <input ref={inputRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{ display:"none" }}
                    onChange={e=>{ const f=e.target.files?.[0]; if(f) setFile(f); }}/>
                  {/* Drop zone */}
                  <motion.div
                    onDrop={onDrop}
                    onDragOver={e=>{ e.preventDefault(); setDragging(true); }}
                    onDragLeave={()=>setDragging(false)}
                    onClick={()=>inputRef.current?.click()}
                    animate={{ borderColor:dragging?"var(--ink-900)":file?"var(--hairline-strong)":"var(--hairline-strong)", background:dragging?"oklch(96% 0.01 232)":"var(--card)" }}
                    transition={{ duration:0.2 }}
                    style={{ marginTop:36,border:"1px dashed var(--hairline-strong)",borderRadius:16,padding:"56px 32px",cursor:"pointer",textAlign:"center",boxShadow:"var(--shadow-card)" }}
                  >
                    <div style={{ width:48,height:48,borderRadius:"50%",background:"oklch(96% 0.01 232)",display:"inline-flex",alignItems:"center",justifyContent:"center",color:"var(--ink-900)",marginBottom:16 }}>
                      <Ico.upload/>
                    </div>
                    {file?(
                      <div>
                        <div style={{ fontSize:17,fontWeight:500,color:"var(--ink-900)" }}>{file.name}</div>
                        <div style={{ fontSize:13,color:"var(--ink-500)",marginTop:4 }}>{(file.size/1024).toFixed(0)} KB · Ready</div>
                      </div>
                    ):(
                      <div>
                        <div style={{ fontSize:17,fontWeight:500 }}>Drop your files here</div>
                        <div style={{ fontSize:13,color:"var(--ink-500)",marginTop:6 }}>or click to browse — PDF, DOCX up to 25 MB</div>
                      </div>
                    )}
                    <div style={{ marginTop:24,display:"flex",justifyContent:"center",gap:8,fontSize:11 }}>
                      <span className="chip chip-neutral">EMPLOYMENT</span>
                      <span className="chip chip-neutral">TENANCY</span>
                      <span className="chip chip-neutral">RENTAL</span>
                    </div>
                  </motion.div>
                  <div style={{ marginTop:24,display:"flex",gap:16,flexWrap:"wrap",alignItems:"center" }}>
                    <button className="btn btn-dark" onClick={()=>setPhase("ingesting")}>
                      {file?"Analyze agreement":"Use demo agreement"} →
                    </button>
                    {file&&<button onClick={()=>setFile(null)} style={{ fontSize:13,color:"var(--ink-500)" }}>Clear</button>}
                  </div>
                  <div style={{ marginTop:24,display:"flex",justifyContent:"space-between",fontSize:12,color:"var(--ink-400)" }}>
                    <span>Engagement <span className="mono" style={{ color:"var(--ink-700)" }}>{session?.shortId}</span> · {session?.contracts.length??0} of 25 contracts used</span>
                    <span className="mono">256-BIT · SOC 2</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── INGESTING ───────────────────────────────────────────────── */}
            {phase==="ingesting"&&(
              <motion.div key="ingesting" {...page} style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:48,position:"relative",overflow:"hidden" }}>
                {/* Tile stage */}
                <div style={{ position:"relative",width:720,height:420 }}>
                  {/* Receiver */}
                  <div style={{ position:"absolute",left:"50%",bottom:0,transform:"translateX(-50%)",width:280,height:80 }}>
                    <div style={{ position:"absolute",inset:0,borderRadius:"50%",background:"radial-gradient(ellipse at center, oklch(78% 0.08 232 / 0.35), transparent 70%)",filter:"blur(20px)" }}/>
                    <div style={{ position:"absolute",left:"50%",top:"50%",transform:"translate(-50%,-50%)",width:180,height:8,borderRadius:999,background:"linear-gradient(90deg, transparent, var(--ice-400), transparent)",opacity:0.7 }}/>
                    {[0,1,2].map(i=>(
                      <div key={i} style={{ position:"absolute",left:"50%",top:"50%",width:200,height:24,marginLeft:-100,marginTop:-12,borderRadius:"50%",border:"1px solid var(--ice-400)",animation:`pulse-ring 2.4s ease-out infinite ${i*0.8}s`,opacity:0 }}/>
                    ))}
                  </div>
                  {/* Falling tiles */}
                  {[
                    { name:"Employment Contract",type:"Employment",kb:412 },
                    { name:"Tenancy Agreement", type:"Tenancy",   kb:289 },
                    { name:"Severance Schedule",type:"Employment",kb:156 },
                    { name:"Sublease Addendum", type:"Tenancy",   kb:94  },
                  ].map((f,i)=>{
                    const xs=[-220,80,-90,200]; const delay=i*0.35;
                    return (
                      <div key={f.name} style={{ position:"absolute",left:"50%",top:0,width:200,animation:`flow-in 2.4s cubic-bezier(0.4,0,0.2,1) ${delay}s both`,"--fx":`calc(-50% + ${xs[i]}px)`,"--fx2":`calc(-50% + ${xs[i]*0.1}px)` } as React.CSSProperties}>
                        <GlassDoc variant="dark" title={f.type} lines={4}/>
                        <div className="mono" style={{ fontSize:11,color:"rgba(255,255,255,0.6)",marginTop:6,textAlign:"center" }}>{f.name} · {f.kb}KB</div>
                      </div>
                    );
                  })}
                </div>
                {/* Status */}
                <div style={{ marginTop:48,textAlign:"center",maxWidth:480 }}>
                  <div className="eyebrow" style={{ color:"var(--ice-500)",opacity:1 }}>INGESTING · {Math.round(progress)}%</div>
                  <h2 style={{ fontSize:28,fontWeight:300,letterSpacing:"-0.02em",margin:"12px 0 6px",color:"var(--ink-900)" }}>Securing your contracts.</h2>
                  <p style={{ fontSize:13,color:"var(--ink-500)" }}>
                    {progress<30&&"Encrypting at the edge…"}
                    {progress>=30&&progress<65&&"Verifying document signatures…"}
                    {progress>=65&&progress<95&&"Routing to the analysis layer…"}
                    {progress>=95&&"Ready for extraction."}
                  </p>
                  <div style={{ marginTop:24,height:2,background:"var(--hairline)",borderRadius:999,overflow:"hidden" }}>
                    <div style={{ height:"100%",background:"linear-gradient(90deg, var(--ink-900), var(--ice-500))",width:progress+"%",transition:"width .2s" }}/>
                  </div>
                  <div style={{ marginTop:16,display:"flex",justifyContent:"center",gap:20,fontSize:11,color:"var(--ink-400)" }} className="mono">
                    <span>4 FILES</span><span>·</span><span>951 KB</span><span>·</span><span>AES-256</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── EXTRACT ─────────────────────────────────────────────────── */}
            {phase==="extract"&&(
              <motion.div key="extract" {...page} style={{ flex:1,display:"grid",gridTemplateColumns:"1fr 1fr",minHeight:0 }}>
                {/* Left — navy, redacted doc */}
                <div style={{ position:"relative",padding:48,background:"linear-gradient(135deg, var(--navy-900), oklch(15% 0.03 252))",overflow:"hidden" }}>
                  <div className="grid-lines-light"/>
                  <div style={{ position:"relative",maxWidth:520,margin:"0 auto" }}>
                    <div className="eyebrow" style={{ color:"var(--ice-300)",opacity:1 }}>CURRENTLY PARSING · 1 OF 4</div>
                    <div style={{ color:"rgba(232,236,242,0.85)",fontSize:18,fontWeight:500,marginTop:8 }}>Employment_Contract_Mercer_2026.pdf</div>
                    <RedactedDoc step={extractStep} motionEnabled={true}/>
                  </div>
                </div>
                {/* Right — light, clause cards */}
                <div style={{ padding:48,background:"var(--paper)",display:"flex",flexDirection:"column" }}>
                  <div className="eyebrow">Step 02 · Extraction</div>
                  <h1 style={{ fontSize:34,fontWeight:300,letterSpacing:"-0.025em",margin:"12px 0 8px",color:"var(--ink-900)" }}>Reading every clause.</h1>
                  <p style={{ fontSize:14,color:"var(--ink-500)",marginBottom:28,maxWidth:460 }}>
                    Atlas extracts parties, obligations, dates, and restrictive covenants — preserving paragraph-level provenance.
                  </p>
                  <div style={{ display:"flex",flexDirection:"column",gap:8,overflow:"hidden" }}>
                    {EXTRACT_CLAUSES.slice(0,extractStep).map(c=>(
                      <div key={c.id} style={{ background:"white",border:"1px solid var(--hairline)",borderLeft:`2px solid ${c.flag==="high"?"var(--red)":c.flag==="medium"?"var(--amber)":"var(--ink-900)"}`,borderRadius:8,padding:"12px 14px",display:"grid",gridTemplateColumns:"120px 1fr auto",gap:16,alignItems:"center",animation:"fade-in-up .35s ease-out both" }}>
                        <div>
                          <div className="mono" style={{ fontSize:10,color:"var(--ink-400)",letterSpacing:"0.08em" }}>{c.cat.toUpperCase()}</div>
                          <div style={{ fontSize:13,fontWeight:500,marginTop:2,color:"var(--ink-900)" }}>{c.label}</div>
                        </div>
                        <div style={{ fontSize:13,color:"var(--ink-700)" }}>{c.value}</div>
                        {c.flag==="high"&&<span className="chip chip-red">HIGH</span>}
                        {c.flag==="medium"&&<span className="chip chip-amber">REVIEW</span>}
                        {!c.flag&&<span className="chip chip-neutral" style={{ color:"var(--green)" }}><Ico.check/> OK</span>}
                      </div>
                    ))}
                    {extractStep<EXTRACT_CLAUSES.length&&(
                      <div style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 14px",color:"var(--ink-400)",fontSize:12 }}>
                        <span style={{ width:8,height:8,borderRadius:"50%",background:"var(--ice-400)",animation:"pulse-ring 1.2s ease-out infinite" }}/>
                        <span className="mono">EXTRACTING…</span>
                      </div>
                    )}
                  </div>
                  <div style={{ flex:1 }}/>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:24,paddingTop:16,borderTop:"1px solid var(--hairline)" }}>
                    <div className="mono" style={{ fontSize:11,color:"var(--ink-400)",letterSpacing:"0.08em" }}>{Math.min(extractStep,EXTRACT_CLAUSES.length)}/{EXTRACT_CLAUSES.length} CLAUSES · {EXTRACT_CLAUSES.slice(0,extractStep).filter(c=>c.flag).length} FLAGGED</div>
                    {extractStep>=EXTRACT_CLAUSES.length&&(
                      <div style={{ fontSize:12,color:"var(--green)",display:"flex",alignItems:"center",gap:6 }}><Ico.check/> Extraction complete</div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── DASHBOARD ───────────────────────────────────────────────── */}
            {phase==="dashboard"&&(
              <motion.div key="dashboard" {...page} style={{ padding:"28px 32px 64px",maxWidth:1440,margin:"0 auto",width:"100%" }}>
                {/* Demo mode banner */}
                <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:20,padding:"10px 16px",background:"var(--amber-soft)",borderRadius:8,border:"1px solid oklch(85% 0.08 78)" }}>
                  <span style={{ fontSize:11,fontWeight:600,color:"oklch(40% 0.10 70)",letterSpacing:"0.04em",flexShrink:0 }}>ILLUSTRATIVE DATA</span>
                  <span style={{ fontSize:12,color:"oklch(45% 0.10 70)" }}>This dashboard previews what Atlas will surface once your contracts are processed by the analysis pipeline.</span>
                </div>

                <>
                    {/* Title row */}
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:24 }}>
                      <div>
                        <div className="eyebrow">Engagement insights</div>
                        <h1 style={{ fontSize:36,fontWeight:300,letterSpacing:"-0.03em",margin:"8px 0 4px",color:"var(--ink-900)" }}>
                          <span style={{ fontWeight:600 }}>4 contracts</span> analyzed against market benchmarks.
                        </h1>
                        <p style={{ fontSize:13,color:"var(--ink-500)" }}>26 flags surfaced · 9 require attention · Last refresh 2 minutes ago</p>
                      </div>
                      <div style={{ display:"flex",gap:8 }}>
                        <button className="btn btn-light"><Ico.doc/> Export memo</button>
                        <button className="btn btn-dark" onClick={()=>setPhase("upload")}>Run another →</button>
                      </div>
                    </div>

                    {/* Doc selector */}
                    <div style={{ display:"flex",marginBottom:28,border:"1px solid var(--hairline)",borderRadius:12,overflow:"hidden",background:"white" }}>
                      {DEMO_DOCS.map((d,i)=>{
                        const active=i===selectedDoc;
                        const sev=d.risk>=60?"var(--red)":d.risk>=40?"var(--amber)":"var(--green)";
                        return (
                          <button key={i} onClick={()=>setSelectedDoc(i)} style={{ flex:1,padding:"16px 20px",borderRight:i<DEMO_DOCS.length-1?"1px solid var(--hairline)":"none",background:active?"oklch(98% 0.005 250)":"white",textAlign:"left",position:"relative",cursor:"pointer" }}>
                            {active&&<div style={{ position:"absolute",top:0,left:0,right:0,height:2,background:"var(--ink-900)" }}/>}
                            <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                              <span className="mono" style={{ fontSize:9,color:"var(--ink-400)",letterSpacing:"0.1em" }}>{(i+1).toString().padStart(2,"0")}</span>
                              <span className="chip chip-neutral" style={{ fontSize:10 }}>{d.type.toUpperCase()}</span>
                            </div>
                            <div style={{ fontSize:13,fontWeight:500,marginTop:6,color:active?"var(--ink-900)":"var(--ink-700)" }}>{d.short}</div>
                            <div style={{ display:"flex",alignItems:"baseline",gap:6,marginTop:8 }}>
                              <span className="mono" style={{ fontSize:22,fontWeight:400,color:sev,letterSpacing:"-0.04em" }}>{d.risk}</span>
                              <span style={{ fontSize:11,color:"var(--ink-400)" }}>risk score</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <DeviationChart motionEnabled={true}/>

                    <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginTop:16 }}>
                      <KPI label="Clauses extracted" value="148" delta="+12 vs. prior" trend="ok"/>
                      <KPI label="Above market" value="3" delta="non-compete, IP, notice" trend="high" sublabel="UNFAVORABLE"/>
                      <KPI label="Favorable to client" value="2" delta="severance, base comp" trend="ok" sublabel="FAVORABLE"/>
                      <KPI label="Peer matches" value="2,143" delta="84% similarity ceiling" trend="ok"/>
                    </div>

                    <div style={{ display:"grid",gridTemplateColumns:"1.1fr 0.9fr",gap:16,marginTop:16 }}>
                      <RiskRadial/>
                      <ObligationTimeline motionEnabled={true}/>
                    </div>

                    <div style={{ display:"grid",gridTemplateColumns:"1.4fr 0.6fr",gap:16,marginTop:16 }}>
                      <TermRibbons motionEnabled={true}/>
                      <PeerSimilarity motionEnabled={true}/>
                    </div>

                    {/* Flagged clauses */}
                    <div className="card" style={{ marginTop:16,padding:24 }}>
                      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:16 }}>
                        <div><div className="eyebrow">Attention required · 3 clauses</div><div style={{ fontSize:16,fontWeight:500,marginTop:6 }}>Top deviations to negotiate</div></div>
                        <button style={{ fontSize:12,color:"var(--ink-500)" }}>View all 26 →</button>
                      </div>
                      {[
                        { title:"Non-compete · §14.2", body:"Global, 12-month restriction. Peer median is 6 months / regional. Atlas suggests narrowing to UK + EU and reducing to 9 months.", sev:"high", match:"3% of peers" },
                        { title:"IP Assignment · §11",  body:"Full present + future assignment with no carve-outs for pre-existing work. Peers typically exclude background IP.", sev:"med", match:"22% of peers" },
                        { title:"Notice period · §18",  body:"6 months mutual is symmetric but above the 3-month market median for this seniority band.", sev:"med", match:"31% of peers" },
                      ].map((c,i)=>(
                        <div key={i} style={{ display:"grid",gridTemplateColumns:"20px 1fr 140px 100px",gap:16,alignItems:"center",padding:"14px 0",borderTop:i>0?"1px solid var(--hairline)":"none" }}>
                          <span className="mono" style={{ fontSize:10,color:"var(--ink-400)" }}>{(i+1).toString().padStart(2,"0")}</span>
                          <div>
                            <div style={{ fontSize:13,fontWeight:600,color:"var(--ink-900)" }}>{c.title}</div>
                            <div style={{ fontSize:12.5,color:"var(--ink-500)",marginTop:4,lineHeight:1.5 }}>{c.body}</div>
                          </div>
                          <div className="mono" style={{ fontSize:11,color:"var(--ink-500)" }}>{c.match}</div>
                          <div style={{ textAlign:"right" }}><span className={c.sev==="high"?"chip chip-red":"chip chip-amber"}>{c.sev==="high"?"HIGH":"REVIEW"}</span></div>
                        </div>
                      ))}
                    </div>

                </>
              </motion.div>
            )}

          </AnimatePresence>
        </AppChrome>
      )}

      {/* ══ LEGACY SCREENS (warm amber ambient) ══════════════════════════════ */}
      {isLegacy&&(
        <div className="relative min-h-screen text-[#13100D]">
          {/* Ambient */}
          <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
            <motion.div className="orb-breathe absolute -top-64 -left-28 h-[1020px] w-[1020px] rounded-full bg-amber-100/50 blur-[220px]" style={{ x:orb1x,y:orb1y }}/>
            <motion.div className="absolute -top-20 right-[1%] h-[680px] w-[680px] rounded-full bg-stone-200/32 blur-[200px]" style={{ x:orb2x,y:orb2y }} animate={{ scale:[1,1.08,1],opacity:[0.30,0.50,0.30] }} transition={{ duration:22,repeat:Infinity,ease:"easeInOut",delay:5 }}/>
            <motion.div className="orb-drift absolute bottom-[-60px] left-[22%] h-[540px] w-[540px] rounded-full bg-amber-50/55 blur-[145px]"/>
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/65 to-transparent"/>
          </div>

          {/* Wordmark */}
          {session&&(
            <motion.div className="fixed left-7 top-7 z-50 flex flex-col gap-1" initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:1.8 }}>
              <button onClick={()=>setPhase("landing")} className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#13100D]/52 transition-colors duration-500 hover:text-[#13100D] text-left">Atlas</button>
              <span className="font-mono text-[9px] tracking-[0.2em] text-[#13100D]/25">{session.shortId}</span>
            </motion.div>
          )}

          {/* Top-right nav */}
          <motion.div className="fixed right-7 top-7 z-50 flex items-center gap-7" initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.5 }}>
            <button onClick={()=>setShowKb(true)} className="text-[10px] font-medium uppercase tracking-[0.26em] text-[#13100D]/32 transition-colors duration-300 hover:text-[#13100D]/65">Knowledge</button>
            <button onClick={()=>setPhase("dashboard")} className="text-[10px] font-medium uppercase tracking-[0.26em] text-[#13100D]/32 transition-colors duration-300 hover:text-[#13100D]/65">Dashboard</button>
          </motion.div>

          <main className="relative z-10 mx-auto max-w-5xl px-6 sm:px-10 lg:px-14">
            <AnimatePresence mode="wait">

              {/* WORKSPACE */}
              {phase==="workspace"&&(
                <motion.div key="workspace" {...page} className="min-h-screen space-y-16 py-28">
                  <div className="max-w-xl space-y-5">
                    <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-[#13100D]/36">Your workspace</p>
                    <h2 className="text-[clamp(2.6rem,6vw,4.5rem)] font-light tracking-[-0.04em] text-[#13100D]">Session {session?.shortId}</h2>
                    <p className="text-[1.05rem] font-normal text-[#13100D]/75">
                      {(session?.contracts.length??0)>0?`${session!.contracts.length} agreement${session!.contracts.length>1?"s":""} analyzed.`:"No agreements analyzed yet."}
                    </p>
                  </div>
                  {(session?.contracts.length??0)>0&&(
                    <div className="max-w-xl">
                      {session!.contracts.map((c,i)=>(
                        <motion.div key={c.id} className="flex items-center justify-between border-b border-[#13100D]/6 py-7 first:border-t" initial={{ opacity:0,y:10 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.5,delay:i*0.08 }}>
                          <div className="space-y-1.5">
                            <p className="text-[13px] font-medium text-[#13100D]">{c.name}</p>
                            <p className="text-[11px] font-light text-[#13100D]/42">{c.obligationCount} obligations · {c.vulnerabilityCount} asymmetries detected</p>
                          </div>
                          <button onClick={()=>setPhase("map")} className="text-[12px] font-light text-[#13100D]/35 transition-colors hover:text-[#13100D]/65">View →</button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-7">
                    <button onClick={()=>setPhase("upload")} className="btn-primary group">Upload agreement <span className="text-[#F4F1EC]/38 group-hover:translate-x-0.5">→</span></button>
                    <button onClick={()=>setPhase("dashboard")} className="text-[13px] font-light text-[#13100D]/42 transition-colors hover:text-[#13100D]/68">Dashboard</button>
                    <button onClick={startNewSession} className="text-[13px] font-light text-[#13100D]/28 transition-colors hover:text-[#13100D]/50">New session</button>
                  </div>
                </motion.div>
              )}

              {/* MAP */}
              {phase==="map"&&(
                <motion.div key="map" {...page} className="min-h-screen space-y-14 py-28">
                  <motion.div className="max-w-2xl space-y-5" initial={{ opacity:0,y:16 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.9,ease:E }}>
                    <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-[#13100D]/36">Obligation map</p>
                    <h2 className="text-[clamp(2.8rem,6vw,5rem)] font-light tracking-[-0.044em] leading-[1.04] text-[#13100D]">{contractName}</h2>
                    <p className="text-[1.05rem] font-light text-[#13100D]/48">6 obligations identified · 3 asymmetries requiring review</p>
                  </motion.div>
                  <div className="relative hidden h-[640px] w-full md:block">
                    <div className="glass-surface graph-fog absolute inset-0 rounded-[40px]"/>
                    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[40px]">
                      <div className="absolute left-1/2 top-1/2 h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,249,236,0.62)_0%,transparent_68%)]"/>
                    </div>
                    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
                      {[5,10,16,24].map((r,i)=>(
                        <motion.circle key={r} cx="50" cy="50" r={r} fill="none" stroke="rgba(19,16,13,0.045)" strokeWidth="0.18" strokeDasharray={i>1?"0.5 1.5":"none"} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:1.4,delay:0.15+i*0.18,ease:E }}/>
                      ))}
                      {obligations.map((o,i)=>(
                        <g key={o.id}>
                          <motion.path d={`M 50 50 L ${o.x} ${o.y}`} fill="none" stroke="rgba(19,16,13,0.065)" strokeWidth="0.28" initial={{ pathLength:0,opacity:0 }} animate={{ pathLength:1,opacity:activeNode&&activeNode!==o.id?0.25:1 }} transition={{ duration:1.6,delay:0.3+i*0.18,ease:E }}/>
                          {activeNode===o.id&&(
                            <motion.path d={`M 50 50 L ${o.x} ${o.y}`} fill="none" stroke={o.risk==="high"?"rgba(184,137,74,0.38)":"rgba(19,16,13,0.24)"} strokeWidth="0.58" initial={{ pathLength:0,opacity:0 }} animate={{ pathLength:1,opacity:1 }} transition={{ duration:0.35,ease:"easeOut" }}/>
                          )}
                        </g>
                      ))}
                    </svg>
                    <div className="absolute" style={{ left:"50%",top:"50%",transform:"translate(-50%,-50%)" }}>
                      <motion.div className="flex flex-col items-center gap-2.5" initial={{ opacity:0,scale:0.65 }} animate={{ opacity:1,scale:1 }} transition={{ duration:1.1,ease:E }}>
                        <div className="relative flex items-center justify-center">
                          {[32,52,78,110].map((size,i)=>(
                            <motion.div key={size} className="absolute rounded-full border border-[#13100D]/7" style={{ width:size,height:size }} animate={{ scale:[1,1.45,1],opacity:[0.07,0,0.07] }} transition={{ duration:4.5+i*0.6,delay:i*1.1,repeat:Infinity,ease:"easeOut" }}/>
                          ))}
                          <motion.div className="relative h-[14px] w-[14px] rounded-full bg-[#13100D]/18" animate={{ scale:[1,1.18,1],opacity:[0.18,0.35,0.18] }} transition={{ duration:4,repeat:Infinity,ease:"easeInOut" }}/>
                        </div>
                        <p className="whitespace-nowrap text-[9px] font-medium uppercase tracking-[0.28em] text-[#13100D]/32">{contractName}</p>
                      </motion.div>
                    </div>
                    {obligations.map((o,i)=>(
                      <motion.div key={o.id} className="absolute cursor-pointer" style={{ left:`${o.x}%`,top:`${o.y}%`,transform:"translate(-50%,-50%)" }} initial={{ opacity:0,scale:0.6,filter:"blur(8px)" }} animate={{ opacity:activeNode&&activeNode!==o.id?0.28:1,scale:1,filter:"blur(0px)" }} transition={{ duration:0.95,delay:0.25+i*0.13,ease:E }} onHoverStart={()=>setActiveNode(o.id)} onHoverEnd={()=>setActiveNode(null)} whileHover={{ scale:1.15 }}>
                        <div className="flex flex-col items-center gap-[6px] text-center">
                          <div className="relative flex items-center justify-center">
                            {o.risk==="high"&&<motion.div className="absolute rounded-full bg-amber-500/12" style={{ width:22,height:22 }} animate={{ scale:[1,2,1],opacity:[0.12,0,0.12] }} transition={{ duration:3,repeat:Infinity,ease:"easeOut",delay:i*0.55 }}/>}
                            <motion.div className={`rounded-full ${o.risk==="high"?"h-[9px] w-[9px] bg-amber-600/65":"h-[7px] w-[7px] bg-[#13100D]/22"}`} animate={o.risk==="high"?{ opacity:[0.65,0.95,0.65] }:{}} transition={{ duration:2.8,repeat:Infinity,ease:"easeInOut",delay:i*0.4 }}/>
                          </div>
                          <p className={`whitespace-nowrap text-[11px] leading-none ${o.risk==="high"?"font-semibold text-[#13100D]":"font-medium text-[#13100D]/55"}`}>{o.label}</p>
                          <p className="whitespace-nowrap text-[9px] font-light leading-none text-[#13100D]/38">{o.detail}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <motion.button onClick={()=>setPhase("insight")} className="btn-primary group" initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.8,delay:1.1 }}>
                    Surface primary asymmetry <span className="text-[#F4F1EC]/38 group-hover:translate-x-0.5">→</span>
                  </motion.button>
                </motion.div>
              )}

              {/* INSIGHT */}
              {phase==="insight"&&(
                <motion.div key="insight" {...page} className="min-h-screen space-y-20 py-28">
                  <motion.div className="max-w-3xl space-y-6" initial={{ opacity:0,y:16 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.9,ease:E }}>
                    <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-[#13100D]/36">Primary finding</p>
                    <h2 className="text-[clamp(2.8rem,6.5vw,5rem)] font-light leading-[1.03] tracking-[-0.048em] text-[#13100D]">Asymmetry<br/><span className="text-[#13100D]/30">detected.</span></h2>
                  </motion.div>
                  <div className="max-w-3xl space-y-12">
                    <motion.div className="space-y-6" initial={{ opacity:0,y:16 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.85,delay:0.36,ease:E }}>
                      <p className="text-[1.28rem] font-light leading-[1.7] text-[#13100D]">Your non-compete extends 18 months with no geographic carve-out for remote work — broader than standard enforcement thresholds in most EU jurisdictions.</p>
                      <p className="text-[1.04rem] font-light leading-[1.88] text-[#13100D]/58">Combined with unilateral amendment rights — permitting modification after signing without your consent — this asymmetry structure warrants careful legal review before execution.</p>
                    </motion.div>
                    <motion.div className="glass-panel overflow-hidden rounded-[28px]" initial={{ opacity:0,y:14 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.85,delay:0.58,ease:E }}>
                      <div className="border-b border-[#13100D]/5 px-8 py-5"><p className="text-[9px] font-medium uppercase tracking-[0.3em] text-[#13100D]/35">Comparative analysis</p></div>
                      {[
                        { label:"Non-compete", yours:"18 months", norm:"Almega (SE): up to 9 months · German HGB §74: max 24 months with compensation" },
                        { label:"Geographic scope", yours:"50-mile radius · no remote exception", norm:"EU proportionality principle: scope must reflect a demonstrable business interest" },
                        { label:"Amendment rights", yours:"Unilateral · no notice required", norm:"Fresh consideration required — Wandsworth LBC v D'Silva [1998] IRLR 329" },
                      ].map((row,i)=>(
                        <motion.div key={row.label} className="group grid gap-3 border-b border-[#13100D]/5 px-8 py-6 last:border-b-0 sm:grid-cols-3 sm:items-start sm:gap-8 cursor-default transition-colors duration-300 hover:bg-[#13100D]/[0.018]" initial={{ opacity:0,y:5 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.42,delay:0.7+i*0.1 }}>
                          <p className="text-[9.5px] font-medium uppercase tracking-[0.24em] text-[#13100D]/32 pt-0.5">{row.label}</p>
                          <p className="text-[13px] font-semibold text-[#13100D]">{row.yours}</p>
                          <p className="text-[12px] font-light leading-[1.68] text-[#13100D]/52">{row.norm}</p>
                        </motion.div>
                      ))}
                    </motion.div>
                  </div>
                  <motion.div className="flex flex-wrap items-center gap-7" initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.8,delay:1.15 }}>
                    <button onClick={()=>setPhase("intelligence")} className="btn-primary group">Legal context <span className="text-[#F4F1EC]/38 group-hover:translate-x-0.5">→</span></button>
                    <button onClick={()=>setPhase("dashboard")} className="text-[13px] font-light text-[#13100D]/38 transition-colors hover:text-[#13100D]/65">Dashboard</button>
                  </motion.div>
                </motion.div>
              )}

              {/* INTELLIGENCE */}
              {phase==="intelligence"&&(
                <motion.div key="intelligence" {...page} className="min-h-screen space-y-20 py-28">
                  <motion.div className="max-w-3xl space-y-6" initial={{ opacity:0,y:16 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.9,ease:E }}>
                    <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-[#13100D]/36">Legal context</p>
                    <h2 className="text-[clamp(2.8rem,6.5vw,5rem)] font-light leading-[1.03] tracking-[-0.048em] text-[#13100D]">Regulatory<br/><span className="text-[#13100D]/30">frameworks.</span></h2>
                    <p className="text-[1.06rem] font-light leading-[1.82] text-[#13100D]/55">Grounded in publicly available law, regulatory guidance, and attributable legal frameworks. No statistics are fabricated.</p>
                  </motion.div>
                  <div className="max-w-3xl space-y-0">
                    {globalPatterns.map((p,i)=>(
                      <motion.div key={p.id} className="group border-b border-[#13100D]/6 py-10 last:border-b-0" initial={{ opacity:0,y:22,filter:"blur(6px)" }} animate={{ opacity:1,y:0,filter:"blur(0px)" }} transition={{ duration:0.8,delay:0.18+i*0.15,ease:E }}>
                        <div className="flex items-start gap-8">
                          <div className="w-20 shrink-0 pt-[3px]"><p className="text-[9px] font-medium uppercase tracking-[0.26em] text-[#13100D]/30 group-hover:text-[#13100D]/52 transition-colors duration-300">{p.category}</p></div>
                          <div className="flex-1 space-y-4">
                            <p className="text-[1.12rem] font-light leading-[1.56] text-[#13100D]/88 group-hover:text-[#13100D] transition-colors duration-300">{p.headline}</p>
                            <p className="text-[14px] font-light leading-[1.78] text-[#13100D]/56">{p.detail}</p>
                            <p className="text-[10px] font-medium tracking-[0.08em] text-[#13100D]/32">{p.source}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <motion.div className="flex flex-wrap items-center gap-7" initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.8,delay:1.05 }}>
                    <button onClick={()=>{ setFile(null); setPhase("upload"); }} className="btn-primary group">Analyze an agreement <span className="text-[#F4F1EC]/38 group-hover:translate-x-0.5">→</span></button>
                    <button onClick={()=>setPhase("dashboard")} className="text-[13px] font-light text-[#13100D]/38 transition-colors hover:text-[#13100D]/65">Dashboard</button>
                  </motion.div>
                </motion.div>
              )}

            </AnimatePresence>
          </main>
        </div>
      )}

      {/* ══ INTRO ANIMATION ════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showIntro&&(
          <motion.div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#F4F1EC]" initial={{ opacity:1 }} exit={{ opacity:0,transition:{ duration:0.9,ease:E,delay:0.2 } }}>
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="orb-breathe absolute -top-64 -left-28 h-[900px] w-[900px] rounded-full bg-amber-100/42 blur-[200px]"/>
              <div className="absolute -top-20 right-[1%] h-[640px] w-[640px] rounded-full bg-stone-200/30 blur-[180px]"/>
            </div>
            <div className="relative flex items-center justify-center" style={{ minWidth:"12ch",height:"1.2em" }}>
              <AnimatePresence mode="wait">
                {introWord==="juritas"?(
                  <motion.div key="juritas" className="flex" exit={{ opacity:0,y:-10,filter:"blur(6px)",transition:{ duration:0.55,ease:E } }}>
                    {"Juritas".split("").map((ch,i)=>(
                      <motion.span key={i} className="text-[clamp(3.2rem,7vw,6rem)] font-light tracking-[-0.04em] text-[#13100D]" initial={{ opacity:0,y:14,filter:"blur(4px)" }} animate={{ opacity:1,y:0,filter:"blur(0px)" }} transition={{ duration:0.5,delay:i*0.07,ease:E }}>{ch}</motion.span>
                    ))}
                  </motion.div>
                ):(
                  <motion.div key="atlas" className="flex">
                    {"Atlas".split("").map((ch,i)=>(
                      <motion.span key={i} className="text-[clamp(3.2rem,7vw,6rem)] font-light tracking-[-0.04em] text-[#13100D]" initial={{ opacity:0,y:12,filter:"blur(4px)" }} animate={{ opacity:1,y:0,filter:"blur(0px)" }} transition={{ duration:0.55,delay:i*0.08,ease:E }}>{ch}</motion.span>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <motion.p className="absolute bottom-[44%] text-[10px] font-medium uppercase tracking-[0.36em] text-[#13100D]/30" initial={{ opacity:0 }} animate={{ opacity:introWord==="juritas"?1:0 }} transition={{ duration:0.5,delay:introWord==="juritas"?0.7:0 }}>Juritas platform</motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ KNOWLEDGE OVERLAY ══════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showKnowledge&&(
          <motion.div className="fixed inset-0 z-[100] flex items-start justify-end" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.3 }}>
            <div className="absolute inset-0 bg-[#13100D]/18 backdrop-blur-[2px]" onClick={()=>setShowKb(false)}/>
            <motion.div className="glass-panel relative m-6 flex max-h-[calc(100vh-48px)] w-full max-w-md flex-col overflow-hidden rounded-[28px]" initial={{ x:40,opacity:0 }} animate={{ x:0,opacity:1 }} exit={{ x:40,opacity:0 }} transition={{ duration:0.45,ease:E }}>
              <div className="flex items-center justify-between border-b border-[#13100D]/5 px-7 py-5">
                <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-[#13100D]/35">Knowledge</p>
                <button onClick={()=>setShowKb(false)} className="flex h-7 w-7 items-center justify-center rounded-full text-[18px] leading-none text-[#13100D]/30 transition-colors hover:bg-[#13100D]/5 hover:text-[#13100D]/60">×</button>
              </div>
              <div className="flex-1 overflow-y-auto px-7 py-6 space-y-6">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.26em] text-[#13100D]/30 mb-4">Absorbed documents</p>
                  {absorbedDocs.length===0?(
                    <p className="text-[13px] font-light text-[#13100D]/42">No documents absorbed yet. Upload PDFs from the admin panel to ground Atlas in specific legal context.</p>
                  ):(
                    absorbedDocs.map(d=>(
                      <div key={d.id} className="flex items-start gap-4 py-4 border-b border-[#13100D]/5 last:border-b-0">
                        <div className="flex-1">
                          <p className="text-[13px] font-medium text-[#13100D]">{d.name}</p>
                          {d.sizeKb&&<p className="text-[11px] font-light text-[#13100D]/38 mt-1">{d.sizeKb} KB</p>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.26em] text-[#13100D]/30 mb-4">Default corpus</p>
                  {["EU Directive 2019/1023 — Restructuring","UK Employment Rights Act 1996","California AB5 — Worker Classification"].map(doc=>(
                    <div key={doc} className="flex items-center gap-3 py-3 border-b border-[#13100D]/5 last:border-b-0">
                      <div className="h-1.5 w-1.5 rounded-full bg-[#13100D]/22 shrink-0"/>
                      <p className="text-[12px] font-light text-[#13100D]/55">{doc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
