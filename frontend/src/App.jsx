import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";

// ─── Responsive helpers ───────────────────────────────────────
const MobileCtx = createContext(false);
const useMobile = () => useContext(MobileCtx);

function useIsMobile(bp = 640) {
  const get = () => (typeof window !== "undefined" ? window.innerWidth < bp : false);
  const [m, setM] = useState(get);
  useEffect(() => {
    let raf;
    const fn = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => setM(get())); };
    window.addEventListener("resize", fn);
    return () => { window.removeEventListener("resize", fn); cancelAnimationFrame(raf); };
  }, [bp]);
  return m;
}

// ─── Resource Injection (font, viewport, global CSS) ──────────
const injectResources = () => {
  if (!document.getElementById("ws-font")) {
    const l = document.createElement("link");
    l.id = "ws-font"; l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;600;700;800;900&display=swap";
    document.head.appendChild(l);
  }
  if (!document.querySelector('meta[name="viewport"]')) {
    const v = document.createElement("meta");
    v.name = "viewport"; v.content = "width=device-width, initial-scale=1, viewport-fit=cover";
    document.head.appendChild(v);
  }
  if (!document.getElementById("ams-global")) {
    const s = document.createElement("style");
    s.id = "ams-global";
    s.textContent = `
      * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
      html, body { margin: 0; padding: 0; overflow-x: hidden; background: #eef4fc; }
      input, textarea, button { font-family: 'Work Sans', system-ui, sans-serif; }
      input[type="time"], input[type="datetime-local"] { color-scheme: light; }
      input:focus, textarea:focus { border-color: #2563eb !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.12); }
      ::-webkit-scrollbar { width: 8px; height: 8px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: #cdddf0; border-radius: 4px; }
    `;
    document.head.appendChild(s);
  }
};

// ─── Constants ───────────────────────────────────────────────
const STORAGE_KEY = "ams-app-v3";
const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const DEFAULT_AVAIL = Object.fromEntries(DAYS.map(d=>[d,{on:d!=="Sunday",open:"08:00",close:"18:00"}]));
const DEFAULT_STATE = { requests:[], availability:DEFAULT_AVAIL, bizName:"AMS", password:"mechanic123", nextId:1 };

const C = {
  bg:"#eef4fc", surface:"#ffffff", surface2:"#f4f8fd", surface3:"#e7eef8", border:"#dbe6f4",
  text:"#152840", text2:"#5f7691", text3:"#9fb3cb",
  blue:"#2563eb", blueL:"#3b82f6", sky:"#0ea5e9", amber:"#f59e0b", amberD:"#d97706",
  green:"#16a34a", red:"#ef4444",
};
const SM = { pending:{label:"Pending",c:C.amber}, accepted:{label:"Accepted",c:C.blue}, onway:{label:"On the Way",c:C.sky}, done:{label:"Complete",c:C.green}, dismissed:{label:"Dismissed",c:"#94a3b8"} };

const card = () => ({
  background:"rgba(255,255,255,0.86)", backdropFilter:"blur(10px)", WebkitBackdropFilter:"blur(10px)",
  border:"1px solid rgba(255,255,255,0.9)", boxShadow:"0 6px 22px rgba(37,99,235,0.08)"
});

// ─── SVG Icons ────────────────────────────────────────────────
const P = {
  wrench:"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",
  phone:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.29 6.29l1.12-1.33a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z",
  loc:"M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 10m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0",
  car:"M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-1 M14 17H9 M6.5 21a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z M16.5 21a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",
  tow:"M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 21a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM18.5 21a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",
  clock:"M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 6v6l4 2",
  check:"M20 6L9 17l-5-5",
  shield:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M9 12l2 2 4-4",
  lock:"M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z M7 11V7a5 5 0 0 1 10 0v4",
  user:"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  cog:"M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  cal:"M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z M16 2v4 M8 2v4 M3 10h18",
  logout:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
  map:"M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  alert:"M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01",
  list:"M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01",
  zap:"M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  heart:"M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21l8.84-8.84a5.5 5.5 0 0 0 0-7.78z",
  globe:"M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M2 12h20 M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z",
};
const Ico = ({d,size=16,color="currentColor",style={}}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,...style}}>
    {d.split(" M").map((seg,i)=><path key={i} d={i===0?seg:"M"+seg}/>)}
  </svg>
);

// ─── Storage ─────────────────────────────────────────────────
async function loadState(){try{const r=await window.storage.get(STORAGE_KEY);return r?{...DEFAULT_STATE,...JSON.parse(r.value)}:DEFAULT_STATE;}catch{return DEFAULT_STATE;}}
async function saveState(s){try{await window.storage.set(STORAGE_KEY,JSON.stringify(s));}catch{}}

// ─── Lightweight Animated Canvas Background (no heavy libs) ───
// Draws a perspective grid of dots + faint links that gently wave,
// giving a 3D modular-network feel with near-zero load cost.
const CanvasBackground = () => {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.innerWidth < 768;
    const COLS = isMobile ? 12 : 22;
    const ROWS = isMobile ? 13 : 18;
    let W = 0, H = 0, raf, running = true, t = 0;
    const mouse = { x: 0 };

    const resize = () => {
      W = window.innerWidth; H = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);
      canvas.width = Math.floor(W * dpr); canvas.height = Math.floor(H * dpr);
      canvas.style.width = W + "px"; canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const horizon = H * 0.16;
      const centerX = W / 2 + mouse.x * 28;
      const pts = [];
      for (let i = 0; i <= ROWS; i++) {
        const td = i / ROWS;                       // 0 far → 1 near
        const persp = 0.18 + td * 0.82;
        const baseY = horizon + Math.pow(td, 1.5) * (H - horizon);
        const spread = (0.22 + td * 1.08) * W;
        const row = [];
        for (let j = 0; j <= COLS; j++) {
          const fx = j / COLS - 0.5;
          const x = centerX + fx * spread;
          const wave = Math.sin(i * 0.5 + t * 1.0 + Math.cos(j * 0.4)) * 9 * persp
                     + Math.sin(j * 0.6 - t * 0.75) * 5 * persp;
          row.push({ x, y: baseY + wave, persp, depth: td });
        }
        pts.push(row);
      }
      // links
      ctx.lineWidth = 1;
      for (let i = 0; i <= ROWS; i++) for (let j = 0; j <= COLS; j++) {
        const p = pts[i][j];
        const a = 0.04 + p.depth * 0.20;
        ctx.strokeStyle = `rgba(120,170,235,${a})`;
        if (j < COLS) { const r = pts[i][j + 1]; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(r.x, r.y); ctx.stroke(); }
        if (i < ROWS) { const d = pts[i + 1][j]; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(d.x, d.y); ctx.stroke(); }
      }
      // dots
      for (let i = 0; i <= ROWS; i++) for (let j = 0; j <= COLS; j++) {
        const p = pts[i][j];
        const rad = 1 + p.persp * 1.7;
        const a = 0.16 + p.depth * 0.38;
        const accent = ((i * 7 + j * 13) % 11 === 0);
        ctx.fillStyle = accent ? `rgba(14,165,233,${a})` : `rgba(59,130,246,${a * 0.9})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, Math.PI * 2); ctx.fill();
      }
    };

    const loop = () => { raf = requestAnimationFrame(loop); t += 0.011; draw(); };

    resize();
    draw();
    if (!reduce) loop();

    const onR = () => { resize(); draw(); };
    window.addEventListener("resize", onR);
    const onMM = e => { mouse.x = (e.clientX / W - 0.5) * 2; };
    if (!isMobile) window.addEventListener("mousemove", onMM);
    const onVis = () => { if (document.hidden) { running = false; cancelAnimationFrame(raf); } else if (!running && !reduce) { running = true; loop(); } };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onR);
      window.removeEventListener("mousemove", onMM);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);
  return <canvas ref={ref} style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none" }} />;
};

// ─── Shared UI ────────────────────────────────────────────────
const Badge = ({ status }) => {
  const m = SM[status] || SM.pending;
  return <span style={{ background:m.c+"1f", color:m.c, border:`1px solid ${m.c}40`, borderRadius:5, padding:"2px 8px", fontSize:"0.65rem", fontWeight:800, letterSpacing:"0.07em", textTransform:"uppercase" }}>{m.label}</span>;
};

const Btn = ({ children, onClick, color=C.blue, outline, small, full, style={}, icon }) => (
  <button onClick={onClick} style={{ background:outline?"#fff":color, color:outline?color:"#fff", border:`1.5px solid ${outline?C.border:color}`, borderRadius:9, fontWeight:700, cursor:"pointer", padding:small?"8px 14px":"12px 20px", fontSize:small?"0.75rem":"0.85rem", width:full?"100%":undefined, letterSpacing:"0.04em", textTransform:"uppercase", display:"inline-flex", alignItems:"center", gap:7, justifyContent:"center", transition:"all .15s", boxShadow:outline?"none":`0 4px 14px ${color}33` }}
    onMouseOver={e=>{e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.opacity="0.94";}} onMouseOut={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.opacity="1";}}>
    {icon&&<Ico d={P[icon]} size={14}/>}{children}
  </button>
);

const fieldStyle = { background:C.surface2, border:`1px solid ${C.border}`, color:C.text, borderRadius:9, padding:"11px 12px", width:"100%", fontSize:"0.92rem", outline:"none", boxSizing:"border-box", transition:"border-color .15s, box-shadow .15s" };

const Inp = ({ label, icon, ...p }) => (
  <div style={{ marginBottom:14 }}>
    {label&&<div style={{ color:C.text2, fontSize:"0.7rem", fontWeight:700, letterSpacing:"0.09em", textTransform:"uppercase", marginBottom:5, display:"flex", alignItems:"center", gap:5 }}>{icon&&<Ico d={P[icon]} size={11} color={C.blue}/>}{label}</div>}
    <input {...p} style={{ ...fieldStyle, ...p.style }}/>
  </div>
);

const Tarea = ({ label, icon, ...p }) => (
  <div style={{ marginBottom:14 }}>
    {label&&<div style={{ color:C.text2, fontSize:"0.7rem", fontWeight:700, letterSpacing:"0.09em", textTransform:"uppercase", marginBottom:5, display:"flex", alignItems:"center", gap:5 }}>{icon&&<Ico d={P[icon]} size={11} color={C.blue}/>}{label}</div>}
    <textarea {...p} style={{ ...fieldStyle, resize:"vertical", minHeight:80, ...p.style }}/>
  </div>
);

const Toggle = ({ options, value, onChange, accent }) => (
  <div style={{ display:"flex", gap:8, marginBottom:14 }}>
    {options.map(o=>(
      <button key={o} onClick={()=>onChange(o)} style={{ flex:1, padding:"11px", borderRadius:9, fontWeight:700, fontSize:"0.85rem", cursor:"pointer", textTransform:"uppercase", letterSpacing:"0.04em", transition:"all .15s", background:value===o?(accent||C.blue):C.surface2, color:value===o?"#fff":C.text2, border:`1.5px solid ${value===o?(accent||C.blue):C.border}`, boxShadow:value===o?`0 4px 12px ${(accent||C.blue)}33`:"none" }}>{o}</button>
    ))}
  </div>
);

const Card = ({ children, accent, style={} }) => {
  const m = useMobile();
  return <div style={{ ...card(), borderRadius:14, padding:m?14:18, marginBottom:12, borderLeft:accent?`4px solid ${C.blue}`:undefined, ...style }}>{children}</div>;
};

const Lbl = ({ children, icon, style={} }) => (
  <div style={{ color:C.text2, fontSize:"0.7rem", fontWeight:700, letterSpacing:"0.09em", textTransform:"uppercase", marginBottom:4, display:"flex", alignItems:"center", gap:5, ...style }}>
    {icon&&<Ico d={P[icon]} size={11} color={C.blue}/>}{children}
  </div>
);

// ─── Google Maps ──────────────────────────────────────────────
const MapEmbed = ({ location }) => {
  const m = useMobile();
  if (!location || location.trim().length < 3) return null;
  return (
    <div style={{ borderRadius:10, overflow:"hidden", border:`1px solid ${C.border}`, marginTop:10 }}>
      <div style={{ background:C.surface2, padding:"7px 12px", display:"flex", alignItems:"center", gap:7 }}>
        <Ico d={P.map} size={13} color={C.blue}/><span style={{ fontSize:"0.72rem", color:C.text2, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.07em" }}>Location Map</span>
      </div>
      <iframe src={`https://www.google.com/maps?q=${encodeURIComponent(location)}&output=embed`} width="100%" height={m?170:210} style={{ border:"none", display:"block" }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="map"/>
    </div>
  );
};

// ─── Nav ─────────────────────────────────────────────────────
const Nav = ({ bizName, isMech, onMechClick }) => {
  const m = useMobile();
  return (
    <div style={{ position:"sticky", top:0, zIndex:100, background:"rgba(255,255,255,0.82)", backdropFilter:"blur(14px)", WebkitBackdropFilter:"blur(14px)", borderBottom:`1px solid ${C.border}`, padding:m?"10px 14px":"12px 18px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ background:`linear-gradient(135deg, ${C.blue}, ${C.sky})`, borderRadius:10, width:m?30:34, height:m?30:34, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 4px 12px ${C.blue}40` }}>
          <Ico d={P.wrench} size={m?16:18} color="#fff"/>
        </div>
        <div>
          <span style={{ color:C.text, fontWeight:900, fontSize:m?"1.05rem":"1.18rem", letterSpacing:"0.06em" }}>{bizName}</span>
          {!m && <span style={{ color:C.text3, fontSize:"0.64rem", marginLeft:8, textTransform:"uppercase", letterSpacing:"0.1em", fontWeight:600 }}>Mobile Mechanic & Towing</span>}
        </div>
      </div>
      {!isMech&&<Btn small outline onClick={onMechClick} icon="lock">Login</Btn>}
    </div>
  );
};

// ─── Hero Banner ──────────────────────────────────────────────
const Hero = ({ bizName }) => {
  const m = useMobile();
  return (
    <div style={{ padding:m?"30px 16px 18px":"50px 20px 28px", textAlign:"center", position:"relative" }}>
      <div style={{ display:"inline-flex", alignItems:"center", gap:7, padding:"5px 14px", borderRadius:30, background:`${C.blue}12`, border:`1px solid ${C.blue}25`, marginBottom:16 }}>
        <Ico d={P.shield} size={14} color={C.blue}/>
        <span style={{ color:C.blue, fontSize:"0.72rem", fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase" }}>Trusted Local Service</span>
      </div>
      <div style={{ color:C.text, fontWeight:900, fontSize:m?"1.9rem":"2.6rem", letterSpacing:"-0.01em", lineHeight:1.1, marginBottom:10 }}>
        Help is on the way
      </div>
      <div style={{ color:C.text2, fontSize:m?"0.92rem":"1.05rem", fontWeight:500, maxWidth:440, margin:"0 auto", lineHeight:1.5 }}>
        Fast, friendly towing and mobile mechanic — request service in under a minute and track your help in real time.
      </div>
      <div style={{ display:"flex", justifyContent:"center", flexWrap:"wrap", gap:m?"8px 12px":16, alignItems:"center", marginTop:18 }}>
        {[["zap","Fast Response",C.amber],["globe","Bilingual",C.blue],["heart","Friendly Service",C.sky]].map(([ic,lbl,col])=>(
          <div key={lbl} style={{ display:"flex", alignItems:"center", gap:6, color:C.text2, fontSize:m?"0.72rem":"0.8rem", fontWeight:600 }}>
            <Ico d={P[ic]} size={14} color={col}/>{lbl}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Customer Form ────────────────────────────────────────────
const CustomerForm = ({ onSubmit, availability, bizName }) => {
  const m = useMobile();
  const [f,setF] = useState({ name:"",phone:"",loc:"",svc:"Towing",year:"",make:"",model:"",issue:"",urg:"ASAP",schedTime:"" });
  const [warn,setWarn] = useState(false);
  const [err,setErr] = useState("");
  const [mapLoc,setMapLoc] = useState("");
  const set = (k,v) => setF(p=>({...p,[k]:v}));

  useEffect(()=>{
    const now=new Date();
    const day=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][now.getDay()];
    const av=availability[day];
    if(!av||!av.on){setWarn(true);return;}
    const cur=now.getHours()*60+now.getMinutes();
    const [oh,om]=av.open.split(":").map(Number);
    const [ch,cm]=av.close.split(":").map(Number);
    if(cur<oh*60+om||cur>ch*60+cm) setWarn(true);
  },[availability]);

  const submit = () => {
    for(const k of ["name","phone","loc","year","make","model","issue"]) if(!f[k].trim()){setErr("Please fill in all required fields.");return;}
    if(f.urg==="Scheduled"&&!f.schedTime){setErr("Please select a scheduled time.");return;}
    setErr(""); onSubmit({...f});
  };

  return (
    <div>
      <Hero bizName={bizName}/>
      <div style={{ padding:m?"0 12px 24px":"0 16px 24px", maxWidth:600, margin:"0 auto" }}>
        {warn&&(
          <div style={{ background:`${C.amber}14`, borderRadius:12, padding:"11px 14px", marginBottom:16, color:C.amberD, fontSize:"0.82rem", display:"flex", gap:8, alignItems:"flex-start", border:`1px solid ${C.amber}33` }}>
            <Ico d={P.clock} size={15} color={C.amber} style={{marginTop:1,flexShrink:0}}/>We may be outside normal business hours right now — you can still submit and we'll reach out as soon as we can.
          </div>
        )}
        <Card style={{ marginBottom:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:11, marginBottom:18 }}>
            <div style={{ background:`linear-gradient(135deg, ${C.blue}, ${C.sky})`, borderRadius:11, width:40, height:40, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:`0 4px 12px ${C.blue}33` }}><Ico d={P.zap} size={20} color="#fff"/></div>
            <div>
              <div style={{ color:C.text, fontWeight:800, fontSize:"1.15rem" }}>Request Service</div>
              <div style={{ color:C.text2, fontSize:"0.82rem" }}>Tell us where you are and what you need</div>
            </div>
          </div>
          <Inp label="Your Name" icon="user" placeholder="Full name" value={f.name} onChange={e=>set("name",e.target.value)}/>
          <Inp label="Phone Number" icon="phone" type="tel" placeholder="(555) 000-0000" value={f.phone} onChange={e=>set("phone",e.target.value)}/>
          <div style={{ marginBottom:14 }}>
            <Lbl icon="loc">Your Location</Lbl>
            <input placeholder="Address or intersection" value={f.loc} onChange={e=>set("loc",e.target.value)} onBlur={e=>setMapLoc(e.target.value)} style={fieldStyle}/>
            <MapEmbed location={mapLoc}/>
          </div>
          <Lbl icon={f.svc==="Towing"?"tow":"wrench"}>Service Type</Lbl>
          <Toggle options={["Towing","Mechanical"]} value={f.svc} onChange={v=>{ set("svc",v); if(v==="Mechanical") set("urg","Scheduled"); }}/>
          <Lbl icon="car">Vehicle Info</Lbl>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1.4fr 1.4fr", gap:m?6:8, marginBottom:14 }}>
            {[["year","Year"],["make","Make"],["model","Model"]].map(([k,l])=>(
              <input key={k} placeholder={l} value={f[k]} onChange={e=>set(k,e.target.value)} style={{ ...fieldStyle, padding:m?"11px 8px":"11px 12px", fontSize:"0.85rem" }}/>
            ))}
          </div>
          <Tarea label="Describe the Issue" icon="alert" placeholder="What's going on with your vehicle?" value={f.issue} onChange={e=>set("issue",e.target.value)}/>
          {f.svc==="Mechanical" ? (
            <>
              <Lbl icon="cal">Appointment</Lbl>
              <div style={{ background:`${C.blue}0d`, border:`1px solid ${C.blue}20`, color:C.text2, borderRadius:9, padding:"10px 12px", marginBottom:12, fontSize:"0.8rem", display:"flex", gap:8, alignItems:"flex-start" }}>
                <Ico d={P.clock} size={14} color={C.blue} style={{marginTop:1,flexShrink:0}}/>Mobile mechanic visits are by appointment, based on availability — pick a date and time and we'll confirm.
              </div>
              <Inp label="Preferred Date & Time" icon="cal" type="datetime-local" value={f.schedTime} onChange={e=>set("schedTime",e.target.value)}/>
            </>
          ) : (
            <>
              <Lbl icon="clock">Urgency</Lbl>
              <Toggle options={["ASAP","Scheduled"]} value={f.urg} onChange={v=>set("urg",v)} accent={C.amber}/>
              {f.urg==="Scheduled"&&<Inp label="Scheduled Date & Time" icon="cal" type="datetime-local" value={f.schedTime} onChange={e=>set("schedTime",e.target.value)}/>}
            </>
          )}
          {err&&<div style={{ color:C.red, fontSize:"0.82rem", marginBottom:12, display:"flex", gap:6, alignItems:"center" }}><Ico d={P.alert} size={13} color={C.red}/>{err}</div>}
          <Btn full onClick={submit} icon="zap">Submit Request</Btn>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, marginTop:12, color:C.text3, fontSize:"0.74rem" }}>
            <Ico d={P.shield} size={12} color={C.text3}/>Your info is only used to dispatch help
          </div>
        </Card>
      </div>
    </div>
  );
};

// ─── Confirmation ─────────────────────────────────────────────
const STEPS = ["pending","accepted","onway","done"];
const SLBLS = ["Submitted","Accepted","On the Way","Complete"];

const Confirmation = ({ req, onNew }) => {
  const m = useMobile();
  const idx = req.status==="dismissed"?0:STEPS.indexOf(req.status);
  return (
    <div style={{ padding:m?"22px 12px":"28px 16px", maxWidth:600, margin:"0 auto" }}>
      <div style={{ textAlign:"center", marginBottom:24 }}>
        <div style={{ width:66, height:66, background:`linear-gradient(135deg, ${C.blue}, ${C.sky})`, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px", boxShadow:`0 8px 24px ${C.blue}40` }}><Ico d={P.check} size={32} color="#fff"/></div>
        <div style={{ color:C.text, fontWeight:900, fontSize:"1.4rem" }}>Request Submitted!</div>
        <div style={{ color:C.text2, fontSize:"0.88rem", marginTop:6 }}>Thanks — we've got it. Track your help below.</div>
      </div>
      <Card style={{ marginBottom:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", position:"relative", padding:"10px 0" }}>
          <div style={{ position:"absolute", top:28, left:"12%", right:"12%", height:3, background:C.surface3, borderRadius:3 }}/>
          <div style={{ position:"absolute", top:28, left:"12%", width:`${Math.max(0,idx/3*76)}%`, height:3, background:`linear-gradient(to right, ${C.blue}, ${C.sky})`, transition:"width .6s", borderRadius:3 }}/>
          {SLBLS.map((l,i)=>(
            <div key={l} style={{ display:"flex", flexDirection:"column", alignItems:"center", zIndex:2, flex:1 }}>
              <div style={{ width:34, height:34, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", background:i<=idx?C.blue:C.surface, border:`2px solid ${i<=idx?C.blue:C.surface3}`, color:i<=idx?"#fff":C.text3, marginBottom:8, boxShadow:i<=idx?`0 4px 12px ${C.blue}40`:"none", transition:"all .3s" }}>{i<idx?<Ico d={P.check} size={15} color="#fff"/>:<span style={{ fontWeight:800, fontSize:"0.78rem" }}>{i+1}</span>}</div>
              <div style={{ color:i<=idx?C.text:C.text3, fontSize:m?"0.58rem":"0.63rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.04em", textAlign:"center", lineHeight:1.2 }}>{l}</div>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <Lbl icon="car">Job Details</Lbl>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:10 }}>
          {[["Name",req.name,"user"],["Phone",req.phone,"phone"],["Service",req.svc,req.svc==="Towing"?"tow":"wrench"],["Urgency",req.urg,"clock"],["Vehicle",`${req.year} ${req.make} ${req.model}`,"car"],["Location",req.loc,"loc"]].map(([k,v,ic])=>(
            <div key={k}><div style={{ color:C.text3, fontSize:"0.65rem", textTransform:"uppercase", display:"flex", alignItems:"center", gap:4, marginBottom:2, fontWeight:600 }}><Ico d={P[ic]} size={10} color={C.text3}/>{k}</div><div style={{ color:k==="Vehicle"?C.blue:C.text, fontSize:"0.88rem", fontWeight:k==="Vehicle"?700:500, wordBreak:"break-word" }}>{v}</div></div>
          ))}
        </div>
        {req.issue&&<div style={{ marginTop:12, padding:"11px 13px", background:C.surface2, borderRadius:10 }}><div style={{ color:C.text3, fontSize:"0.65rem", textTransform:"uppercase", marginBottom:4, fontWeight:600 }}>Issue</div><div style={{ color:C.text2, fontSize:"0.86rem", fontStyle:"italic" }}>"{req.issue}"</div></div>}
        <MapEmbed location={req.loc}/>
      </Card>
      <Btn full outline onClick={onNew} icon="zap" style={{ marginTop:8 }}>Submit Another Request</Btn>
    </div>
  );
};

// ─── Login ────────────────────────────────────────────────────
const Login = ({ password:correct, onSuccess, onBack }) => {
  const m = useMobile();
  const [pw,setPw]=useState(""); const [err,setErr]=useState("");
  const go=()=>{ if(pw===correct) onSuccess(); else setErr("Incorrect password."); };
  return (
    <div style={{ padding:m?"24px 16px":32, maxWidth:380, margin:m?"24px auto":"48px auto" }}>
      <Card>
        <div style={{ textAlign:"center", marginBottom:22 }}>
          <div style={{ width:58, height:58, background:`linear-gradient(135deg, ${C.blue}, ${C.sky})`, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px", boxShadow:`0 6px 18px ${C.blue}40` }}><Ico d={P.lock} size={24} color="#fff"/></div>
          <div style={{ color:C.text, fontWeight:800, fontSize:"1.15rem" }}>Mechanic Login</div>
          <div style={{ color:C.text2, fontSize:"0.8rem", marginTop:4 }}>Dashboard access only</div>
        </div>
        <Inp label="Password" icon="lock" type="password" placeholder="Enter password" value={pw} onChange={e=>{setPw(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&go()}/>
        {err&&<div style={{ color:C.red, fontSize:"0.82rem", marginBottom:12, display:"flex", gap:6 }}><Ico d={P.alert} size={13} color={C.red}/>{err}</div>}
        <Btn full onClick={go} icon="lock" style={{ marginBottom:10 }}>Enter Dashboard</Btn>
        <Btn full outline onClick={onBack}>← Back</Btn>
      </Card>
    </div>
  );
};

// ─── Request Card ─────────────────────────────────────────────
const ReqCard = ({ req, onAction }) => {
  const [showMap,setShowMap]=useState(false);
  const active=["pending","accepted","onway"].includes(req.status);
  const svcCol = req.svc==="Towing" ? C.blue : C.sky;
  return (
    <Card accent={active}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10, gap:8 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:0 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:`${svcCol}14`, border:`1px solid ${svcCol}33`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Ico d={P[req.svc==="Towing"?"tow":"wrench"]} size={17} color={svcCol}/></div>
          <div style={{ minWidth:0 }}><div style={{ color:C.text, fontWeight:800, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{req.name}</div><div style={{ color:svcCol, fontSize:"0.68rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em" }}>{req.svc}</div></div>
        </div>
        <div style={{ flexShrink:0 }}><Badge status={req.status}/></div>
      </div>
      <div style={{ background:`${C.blue}0d`, border:`1px solid ${C.blue}20`, borderRadius:9, padding:"7px 11px", marginBottom:10, display:"inline-flex", alignItems:"center", gap:7 }}><Ico d={P.car} size={13} color={C.blue}/><span style={{ color:C.blue, fontWeight:700, fontSize:"0.85rem" }}>{req.year} {req.make} {req.model}</span></div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
        <div style={{ minWidth:0 }}><Lbl icon="phone">Phone</Lbl><div style={{ color:C.text, fontSize:"0.85rem" }}>{req.phone}</div></div>
        <div style={{ minWidth:0 }}>
          <Lbl icon="loc">Location</Lbl>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ color:C.text, fontSize:"0.85rem", flex:1, minWidth:0, wordBreak:"break-word" }}>{req.loc}</div>
            <button onClick={()=>setShowMap(v=>!v)} style={{ background:showMap?`${C.blue}14`:"transparent", border:"none", cursor:"pointer", padding:5, borderRadius:6, flexShrink:0 }}><Ico d={P.map} size={15} color={showMap?C.blue:C.text3}/></button>
          </div>
          {showMap&&<MapEmbed location={req.loc}/>}
        </div>
        {req.urg==="Scheduled"&&req.schedTime&&<div style={{ gridColumn:"1/-1" }}><Lbl icon="cal">Scheduled</Lbl><div style={{ color:C.amberD, fontSize:"0.85rem", fontWeight:700 }}>{new Date(req.schedTime).toLocaleString()}</div></div>}
      </div>
      {req.issue&&<div style={{ color:C.text2, fontSize:"0.83rem", marginBottom:10, fontStyle:"italic", padding:"9px 11px", background:C.surface2, borderRadius:8 }}>"{req.issue}"</div>}
      <div style={{ color:C.text3, fontSize:"0.7rem", marginBottom:12, display:"flex", alignItems:"center", gap:5 }}><Ico d={P.clock} size={11} color={C.text3}/>Submitted {new Date(req.submittedAt).toLocaleString()}</div>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        {req.status==="pending"&&<><Btn small onClick={()=>onAction(req.id,"accepted")} icon="check">Accept</Btn><Btn small outline color={C.text2} onClick={()=>onAction(req.id,"dismissed")}>Dismiss</Btn></>}
        {req.status==="accepted"&&<Btn small color={C.sky} onClick={()=>onAction(req.id,"onway")} icon="tow">On the Way</Btn>}
        {req.status==="onway"&&<Btn small color={C.green} onClick={()=>onAction(req.id,"done")} icon="check">Mark Done</Btn>}
      </div>
    </Card>
  );
};

// ─── Dashboard ────────────────────────────────────────────────
const Dashboard = ({ state, dispatch, onLogout }) => {
  const m = useMobile();
  const [tab,setTab]=useState("queue");
  const { requests, availability, bizName, password } = state;
  const [newBiz,setNewBiz]=useState(bizName);
  const [curPw,setCurPw]=useState(""); const [newPw,setNewPw]=useState(""); const [confPw,setConfPw]=useState("");
  const [pwMsg,setPwMsg]=useState(""); const [bizMsg,setBizMsg]=useState("");

  const pending=requests.filter(r=>r.status==="pending").length;
  const active=requests.filter(r=>["accepted","onway"].includes(r.status)).length;
  const todayStr=new Date().toDateString();
  const doneToday=requests.filter(r=>r.status==="done"&&new Date(r.submittedAt).toDateString()===todayStr).length;
  const allDone=requests.filter(r=>r.status==="done").length;

  const todayJobs=requests.filter(r=>["accepted","onway","done"].includes(r.status)&&new Date(r.submittedAt).toDateString()===todayStr)
    .sort((a,b)=>(a.urg==="Scheduled"?new Date(a.schedTime):new Date(a.submittedAt))-(b.urg==="Scheduled"?new Date(b.schedTime):new Date(b.submittedAt)));

  const savePw=()=>{
    if(curPw!==password){setPwMsg("Current password incorrect.");return;}
    if(newPw.length<6){setPwMsg("Min 6 characters.");return;}
    if(newPw!==confPw){setPwMsg("Passwords don't match.");return;}
    dispatch({type:"SET_PW",password:newPw}); setPwMsg("✓ Password updated!"); setCurPw(""); setNewPw(""); setConfPw("");
  };

  const TABS=[{id:"queue",label:"Queue",icon:"list"},{id:"schedule",label:"Schedule",icon:"cal"},{id:"avail",label:"Hours",icon:"clock"},{id:"settings",label:"Settings",icon:"cog"}];
  const STATS=[[pending,"Pending",C.amber,"alert"],[active,"Active",C.blue,"zap"],[doneToday,"Done Today",C.green,"check"],[allDone,"All-Time",C.sky,"list"]];

  return (
    <div style={{ maxWidth:700, margin:"0 auto" }}>
      <div style={{ display:"flex", gap:m?4:6, padding:m?"12px 10px":"14px", borderBottom:`1px solid ${C.border}` }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:1, minWidth:0, padding:m?"9px 2px":"9px 4px", borderRadius:10, border:`1px solid ${tab===t.id?C.blue:C.border}`, cursor:"pointer", background:tab===t.id?C.blue:C.surface, color:tab===t.id?"#fff":C.text2, fontWeight:700, fontSize:m?"0.58rem":"0.7rem", letterSpacing:"0.03em", textTransform:"uppercase", display:"flex", alignItems:"center", justifyContent:"center", gap:m?3:6, transition:"all .15s", boxShadow:tab===t.id?`0 4px 12px ${C.blue}30`:"none" }}>
            <Ico d={P[t.icon]} size={13} color={tab===t.id?"#fff":C.text2}/>{t.label}
          </button>
        ))}
      </div>

      <div style={{ padding:m?"16px 12px":18 }}>
        {/* QUEUE */}
        {tab==="queue"&&<>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20 }}>
            {STATS.map(([n,l,c,ic])=>(
              <div key={l} style={{ ...card(), borderRadius:14, padding:"15px 16px", borderTop:`4px solid ${c}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ color:c, fontWeight:900, fontSize:"1.9rem" }}>{n}</div>
                  <div style={{ background:`${c}18`, borderRadius:10, width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center" }}><Ico d={P[ic]} size={17} color={c}/></div>
                </div>
                <div style={{ color:C.text2, fontSize:"0.68rem", textTransform:"uppercase", letterSpacing:"0.07em", marginTop:4, fontWeight:600 }}>{l}</div>
              </div>
            ))}
          </div>
          {requests.length===0
            ?<div style={{ color:C.text3, textAlign:"center", padding:"56px 0", fontSize:"0.9rem" }}><Ico d={P.list} size={34} color={C.surface3} style={{ display:"block", margin:"0 auto 12px" }}/>No requests yet.</div>
            :[...requests].reverse().map(r=><ReqCard key={r.id} req={r} onAction={(id,s)=>dispatch({type:"STATUS",id,status:s})}/>)
          }
        </>}

        {/* SCHEDULE */}
        {tab==="schedule"&&<>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}><Ico d={P.cal} size={18} color={C.blue}/><div style={{ color:C.text, fontWeight:800, fontSize:"1.15rem" }}>Today's Jobs</div></div>
          {todayJobs.length===0
            ?<div style={{ color:C.text3, textAlign:"center", padding:"56px 0" }}><Ico d={P.cal} size={34} color={C.surface3} style={{ display:"block", margin:"0 auto 12px" }}/>No jobs scheduled for today.</div>
            :todayJobs.map(r=>(
              <Card key={r.id} accent>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}><Ico d={P.clock} size={13} color={C.amber}/><span style={{ color:C.amberD, fontWeight:700, fontSize:"0.85rem" }}>{r.urg==="Scheduled"&&r.schedTime?new Date(r.schedTime).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):"ASAP"}</span></div>
                  <Badge status={r.status}/>
                </div>
                <div style={{ fontWeight:800, color:C.text, marginBottom:4 }}>{r.name} <span style={{ color:r.svc==="Towing"?C.blue:C.sky, fontWeight:600, fontSize:"0.85rem" }}>— {r.svc}</span></div>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}><Ico d={P.car} size={12} color={C.blue}/><span style={{ color:C.blue, fontSize:"0.82rem", fontWeight:700 }}>{r.year} {r.make} {r.model}</span></div>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}><Ico d={P.loc} size={12} color={C.text3}/><span style={{ color:C.text2, fontSize:"0.82rem" }}>{r.loc}</span></div>
                {r.issue&&<div style={{ color:C.text3, fontSize:"0.78rem", fontStyle:"italic", marginTop:6 }}>"{r.issue}"</div>}
              </Card>
            ))
          }
        </>}

        {/* AVAILABILITY */}
        {tab==="avail"&&<>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}><Ico d={P.clock} size={18} color={C.blue}/><div style={{ color:C.text, fontWeight:800, fontSize:"1.15rem" }}>Business Hours</div></div>
          {DAYS.map(day=>{
            const av=availability[day];
            return (
              <div key={day} style={{ ...card(), borderLeft:`4px solid ${av.on?C.green:C.surface3}`, borderRadius:12, padding:"12px 14px", marginBottom:10, transition:"border-color .2s" }}>
                <div style={{ display:"flex", alignItems:"center", gap:m?8:12, flexWrap:"wrap" }}>
                  <div style={{ minWidth:m?64:94, color:av.on?C.text:C.text3, fontWeight:700, fontSize:"0.85rem" }}>{day}</div>
                  <div onClick={()=>dispatch({type:"AVAIL_TOGGLE",day})} style={{ width:40, height:22, borderRadius:11, cursor:"pointer", position:"relative", background:av.on?C.green:C.surface3, transition:"background .2s", flexShrink:0 }}>
                    <div style={{ position:"absolute", top:3, left:av.on?21:3, width:16, height:16, borderRadius:"50%", background:"#fff", transition:"left .2s", boxShadow:"0 1px 3px rgba(0,0,0,0.2)" }}/>
                  </div>
                  {av.on?<div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <input type="time" value={av.open} onChange={e=>dispatch({type:"AVAIL_TIME",day,field:"open",val:e.target.value})} style={{ background:C.surface2, border:`1px solid ${C.border}`, color:C.text, borderRadius:8, padding:"6px 8px", fontSize:"0.82rem", outline:"none" }}/>
                    <span style={{ color:C.text3, fontSize:"0.78rem" }}>to</span>
                    <input type="time" value={av.close} onChange={e=>dispatch({type:"AVAIL_TIME",day,field:"close",val:e.target.value})} style={{ background:C.surface2, border:`1px solid ${C.border}`, color:C.text, borderRadius:8, padding:"6px 8px", fontSize:"0.82rem", outline:"none" }}/>
                  </div>:<span style={{ color:C.text3, fontSize:"0.78rem", fontStyle:"italic" }}>Closed</span>}
                </div>
              </div>
            );
          })}
          <div style={{ color:C.text3, fontSize:"0.75rem", marginTop:8, display:"flex", gap:5, alignItems:"center" }}><Ico d={P.check} size={11} color={C.green}/>Changes save automatically.</div>
        </>}

        {/* SETTINGS */}
        {tab==="settings"&&<>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}><Ico d={P.cog} size={18} color={C.blue}/><div style={{ color:C.text, fontWeight:800, fontSize:"1.15rem" }}>Settings</div></div>
          <Card>
            <Lbl icon="user">Business Name</Lbl>
            <div style={{ display:"flex", gap:8, marginTop:8 }}>
              <input value={newBiz} onChange={e=>setNewBiz(e.target.value)} style={{ ...fieldStyle, flex:1 }}/>
              <Btn small onClick={()=>{dispatch({type:"SET_BIZ",bizName:newBiz});setBizMsg("✓ Saved!");setTimeout(()=>setBizMsg(""),2500);}} icon="check">Save</Btn>
            </div>
            {bizMsg&&<div style={{ color:C.green, fontSize:"0.78rem", marginTop:6, fontWeight:600 }}>{bizMsg}</div>}
          </Card>
          <Card>
            <Lbl icon="lock">Change Password</Lbl>
            <div style={{ marginTop:8 }}>
              <Inp label="Current Password" icon="lock" type="password" value={curPw} onChange={e=>{setCurPw(e.target.value);setPwMsg("");}}/>
              <Inp label="New Password" icon="lock" type="password" value={newPw} onChange={e=>{setNewPw(e.target.value);setPwMsg("");}}/>
              <Inp label="Confirm New Password" icon="lock" type="password" value={confPw} onChange={e=>{setConfPw(e.target.value);setPwMsg("");}}/>
            </div>
            {pwMsg&&<div style={{ color:pwMsg.startsWith("✓")?C.green:C.red, fontSize:"0.78rem", marginBottom:10, fontWeight:600 }}>{pwMsg}</div>}
            <Btn small onClick={savePw} icon="lock">Update Password</Btn>
          </Card>
          <Btn full outline color={C.text2} onClick={onLogout} icon="logout" style={{ marginTop:8 }}>Logout</Btn>
        </>}
      </div>
    </div>
  );
};

// ─── Reducer ─────────────────────────────────────────────────
function reducer(s, a) {
  switch(a.type) {
    case "SUBMIT": return {...s,requests:[...s.requests,{...a.req,id:s.nextId,status:"pending",submittedAt:new Date().toISOString()}],nextId:s.nextId+1};
    case "STATUS": return {...s,requests:s.requests.map(r=>r.id===a.id?{...r,status:a.status}:r)};
    case "SET_BIZ": return {...s,bizName:a.bizName};
    case "SET_PW": return {...s,password:a.password};
    case "AVAIL_TOGGLE": return {...s,availability:{...s.availability,[a.day]:{...s.availability[a.day],on:!s.availability[a.day].on}}};
    case "AVAIL_TIME": return {...s,availability:{...s.availability,[a.day]:{...s.availability[a.day],[a.field]:a.val}}};
    default: return s;
  }
}

// ─── Root ─────────────────────────────────────────────────────
export default function App() {
  const isMobile = useIsMobile(640);
  const [appState,setAppState]=useState(DEFAULT_STATE);
  const [view,setView]=useState("customer");
  const [activeReqId,setActiveReqId]=useState(null);
  const [bgReady,setBgReady]=useState(false);

  useEffect(()=>{
    injectResources();
    loadState().then(setAppState);
    const id = setTimeout(()=>setBgReady(true), 40);
    return ()=>clearTimeout(id);
  },[]);

  const dispatch=useCallback(action=>{
    setAppState(prev=>{const next=reducer(prev,action);saveState(next);return next;});
  },[]);

  const liveReq = activeReqId!=null ? appState.requests.find(r=>r.id===activeReqId) : null;

  return (
    <MobileCtx.Provider value={isMobile}>
      <div style={{ minHeight:"100vh", fontFamily:"'Work Sans',system-ui,sans-serif", color:C.text, position:"relative", background:"linear-gradient(180deg, #f3f8ff 0%, #e9f1fc 100%)" }}>
        {bgReady && <CanvasBackground/>}
        <div style={{ position:"relative", zIndex:1 }}>
          <Nav bizName={appState.bizName} isMech={view==="dashboard"} onMechClick={()=>setView("login")}/>
          {view==="customer"&&<CustomerForm availability={appState.availability} bizName={appState.bizName} onSubmit={req=>{dispatch({type:"SUBMIT",req});setActiveReqId(appState.nextId);setView("confirm");}}/>}
          {view==="confirm"&&liveReq&&<Confirmation req={appState.requests.find(r=>r.id===activeReqId)||liveReq} onNew={()=>{setActiveReqId(null);setView("customer");}}/>}
          {view==="login"&&<Login password={appState.password} onSuccess={()=>setView("dashboard")} onBack={()=>setView("customer")}/>}
          {view==="dashboard"&&<Dashboard state={appState} dispatch={dispatch} onLogout={()=>setView("customer")}/>}
        </div>
      </div>
    </MobileCtx.Provider>
  );
}