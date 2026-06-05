/*
  AMS — Mobile Mechanic & Towing  ::  Frontend (App.jsx)
  Talks to the Flask + PostgreSQL backend. Data syncs across all devices.

  Features: aurora background, tap-to-call, tap-to-navigate, request lookup
  by phone, EN/ES bilingual toggle (customer side), job notes, earnings
  tracking, job search, and a "we'll call you back" busy mode.
*/

import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";

// ─── API base (set VITE_API_URL on Render; falls back to localhost for local dev) ───
const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL) ||
  "http://localhost:5000";

// ─── Instagram link ──────────────────────────────────────────
const INSTAGRAM_URL = "https://www.instagram.com/1low_nelson/";

// ─── Token + lang persistence ─────────────────────────────────
const getToken = () => { try { return localStorage.getItem("ams-token") || ""; } catch { return ""; } };
const setToken = (t) => { try { t ? localStorage.setItem("ams-token", t) : localStorage.removeItem("ams-token"); } catch {} };
const getLang  = () => { try { return localStorage.getItem("ams-lang") || "en"; } catch { return "en"; } };
const setLangLS = (l) => { try { localStorage.setItem("ams-lang", l); } catch {} };

async function api(path, { method = "GET", body, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) headers.Authorization = `Bearer ${getToken()}`;
  const res = await fetch(API_BASE + path, { method, headers, ...(body && { body: JSON.stringify(body) }) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// ─── Translations (customer-facing) ───────────────────────────
const T = {
  en: {
    nav_tagline:"Mobile Mechanic & Towing", nav_login:"Login",
    hero_badge:"Trusted Local Service", hero_title:"Help is on the way",
    hero_desc:"Fast, friendly towing and mobile mechanic with over 10 years of hands-on car experience. Request service in under a minute and track your help in real time.",
    feat_fast:"Fast Response", feat_bilingual:"Bilingual", feat_friendly:"Friendly Service",
    track_cta:"Already requested help? Track it",
    busy_banner:"We're slammed right now. Leave your info and we'll call you back as soon as we can.",
    afterhours:"We may be outside normal business hours right now — you can still submit and we'll reach out as soon as we can.",
    form_title:"Request Service", form_subtitle:"Tell us where you are and what you need",
    f_name:"Your Name", f_name_ph:"Full name", f_phone:"Phone Number", f_phone_ph:"(555) 000-0000",
    f_loc:"Your Location", f_loc_ph:"Address or intersection", f_svc:"Service Type",
    svc_towing:"Towing", svc_mechanical:"Mechanical", f_vehicle:"Vehicle Info",
    f_year:"Year", f_make:"Make", f_model:"Model", f_issue:"Describe the Issue",
    f_issue_ph:"What's going on with your vehicle?", f_appt:"Appointment",
    appt_notice:"Mobile mechanic visits are by appointment, based on availability — pick a date and time and we'll confirm.",
    f_pref_time:"Preferred Date & Time", f_urgency:"Urgency", urg_asap:"ASAP", urg_scheduled:"Scheduled",
    f_sched_time:"Scheduled Date & Time", err_required:"Please fill in all required fields.",
    err_sched:"Please select a scheduled time.", err_submit:"Couldn't submit — please check your connection and try again.",
    submit:"Submit Request", submit_busy:"Request a Callback", submitting:"Submitting…",
    privacy:"Your info is only used to dispatch help", map_label:"Location Map",
    conf_title:"Request Submitted!", conf_subtitle:"Thanks — we've got it. Track your help below (updates live).",
    step_submitted:"Submitted", step_accepted:"Accepted", step_onway:"On the Way", step_done:"Complete",
    job_details:"Job Details", d_name:"Name", d_phone:"Phone", d_service:"Service",
    d_urgency:"Urgency", d_vehicle:"Vehicle", d_location:"Location", d_issue:"Issue",
    submit_another:"Submit Another Request",
    lookup_title:"Track Your Request", lookup_subtitle:"Enter the phone number you used to request service.",
    lookup_phone:"Phone Number", lookup_btn:"Find My Request", lookup_searching:"Searching…",
    lookup_none:"No requests found for that number. Double-check it, or submit a new request.",
    lookup_back:"← Back", lookup_multiple:"Showing your most recent request.",
    lookup_track_title:"Your Request", lookup_track_subtitle:"Here's the latest on your request (updates live).",
  },
  es: {
    nav_tagline:"Mecánico Móvil y Grúa", nav_login:"Acceder",
    hero_badge:"Servicio Local de Confianza", hero_title:"La ayuda está en camino",
    hero_desc:"Mecánico móvil y servicio de grúa rápido y amable, con más de 10 años de experiencia con autos. Solicita servicio en menos de un minuto y sigue tu ayuda en tiempo real.",
    feat_fast:"Respuesta Rápida", feat_bilingual:"Bilingüe", feat_friendly:"Servicio Amable",
    track_cta:"¿Ya pediste ayuda? Síguela aquí",
    busy_banner:"Estamos muy ocupados en este momento. Deja tus datos y te llamaremos lo antes posible.",
    afterhours:"Puede que estemos fuera del horario normal en este momento — aún puedes enviar tu solicitud y te contactaremos lo antes posible.",
    form_title:"Solicitar Servicio", form_subtitle:"Dinos dónde estás y qué necesitas",
    f_name:"Tu Nombre", f_name_ph:"Nombre completo", f_phone:"Número de Teléfono", f_phone_ph:"(555) 000-0000",
    f_loc:"Tu Ubicación", f_loc_ph:"Dirección o intersección", f_svc:"Tipo de Servicio",
    svc_towing:"Grúa", svc_mechanical:"Mecánico", f_vehicle:"Información del Vehículo",
    f_year:"Año", f_make:"Marca", f_model:"Modelo", f_issue:"Describe el Problema",
    f_issue_ph:"¿Qué le pasa a tu vehículo?", f_appt:"Cita",
    appt_notice:"Las visitas del mecánico móvil son con cita, según disponibilidad — elige fecha y hora y te confirmaremos.",
    f_pref_time:"Fecha y Hora Preferida", f_urgency:"Urgencia", urg_asap:"Lo Antes Posible", urg_scheduled:"Programado",
    f_sched_time:"Fecha y Hora Programada", err_required:"Por favor completa todos los campos requeridos.",
    err_sched:"Por favor selecciona una fecha y hora.", err_submit:"No se pudo enviar — revisa tu conexión e inténtalo de nuevo.",
    submit:"Enviar Solicitud", submit_busy:"Solicitar una Llamada", submitting:"Enviando…",
    privacy:"Tu información solo se usa para enviar ayuda", map_label:"Mapa de Ubicación",
    conf_title:"¡Solicitud Enviada!", conf_subtitle:"Gracias — la recibimos. Sigue tu ayuda abajo (se actualiza en vivo).",
    step_submitted:"Enviada", step_accepted:"Aceptada", step_onway:"En Camino", step_done:"Completada",
    job_details:"Detalles del Trabajo", d_name:"Nombre", d_phone:"Teléfono", d_service:"Servicio",
    d_urgency:"Urgencia", d_vehicle:"Vehículo", d_location:"Ubicación", d_issue:"Problema",
    submit_another:"Enviar Otra Solicitud",
    lookup_title:"Sigue Tu Solicitud", lookup_subtitle:"Ingresa el número de teléfono que usaste para pedir servicio.",
    lookup_phone:"Número de Teléfono", lookup_btn:"Buscar Mi Solicitud", lookup_searching:"Buscando…",
    lookup_none:"No se encontraron solicitudes con ese número. Verifícalo o envía una nueva solicitud.",
    lookup_back:"← Volver", lookup_multiple:"Mostrando tu solicitud más reciente.",
    lookup_track_title:"Tu Solicitud", lookup_track_subtitle:"Aquí está lo último de tu solicitud (se actualiza en vivo).",
  },
};

const LangCtx = createContext({ lang:"en", setLang:()=>{}, t:(k)=>k });
const useLang = () => useContext(LangCtx);

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

// ─── Resource Injection (font, viewport, global CSS + aurora) ──
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
      html, body, #root { margin: 0; padding: 0; overflow-x: hidden; background: #0e3f63; }
      /* Neutralize Vite's default index.css / App.css so the app fills the full viewport width */
      body { display: block; min-width: 0; }
      #root { width: 100%; max-width: none; }
      input, textarea, button { font-family: 'Work Sans', system-ui, sans-serif; }
      input[type="time"], input[type="datetime-local"] { color-scheme: light; }
      input:focus, textarea:focus { border-color: #2563eb !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.18) !important; }
      /* Hidden scrollbar so the header + content reach the right edge with no gap (page still scrolls) */
      html { scrollbar-width: none; -ms-overflow-style: none; }
      ::-webkit-scrollbar { width: 0; height: 0; display: none; }

      /* Animated aurora background (pure CSS) */
      .ams-aurora {
        background:
          radial-gradient(45% 45% at 18% 22%, rgba(56,189,248,0.55), transparent 62%),
          radial-gradient(45% 45% at 82% 18%, rgba(16,185,129,0.50), transparent 62%),
          radial-gradient(50% 50% at 72% 82%, rgba(125,211,252,0.42), transparent 65%),
          radial-gradient(55% 55% at 26% 80%, rgba(37,99,235,0.55), transparent 65%),
          linear-gradient(155deg, #123a6b 0%, #0e5a7a 45%, #0c6b5d 75%, #103f72 100%);
        background-size: 180% 180%, 180% 180%, 180% 180%, 180% 180%, 100% 100%;
        background-position: 0% 50%, 100% 50%, 50% 100%, 50% 0%, 0 0;
        animation: amsAurora 22s ease-in-out infinite;
      }
      @keyframes amsAurora {
        0%, 100% { background-position: 0% 50%, 100% 50%, 50% 100%, 50% 0%, 0 0; }
        50%      { background-position: 100% 50%, 0% 50%, 50% 0%, 50% 100%, 0 0; }
      }
      @media (prefers-reduced-motion: reduce) { .ams-aurora { animation: none; } }
    `;
    document.head.appendChild(s);
  }
};

// ─── Constants ───────────────────────────────────────────────
const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const DEFAULT_AVAIL = Object.fromEntries(DAYS.map(d=>[d,{on:d!=="Sunday",open:"08:00",close:"18:00"}]));

const C = {
  surface:"#ffffff", surface2:"#f4f8fd", surface3:"#e7eef8", border:"#dbe6f4",
  text:"#152840", text2:"#5f7691", text3:"#7a8ea9",
  blue:"#2563eb", blueL:"#3b82f6", sky:"#0ea5e9", amber:"#f59e0b", amberD:"#d97706",
  green:"#16a34a", red:"#ef4444",
};
const ON = { t:"#ffffff", t2:"rgba(255,255,255,0.86)", t3:"rgba(255,255,255,0.62)", icon:"#7dd3fc" };
const SM = { pending:{label:"Pending",c:C.amber}, accepted:{label:"Accepted",c:C.blue}, onway:{label:"On the Way",c:C.sky}, done:{label:"Complete",c:C.green}, dismissed:{label:"Dismissed",c:"#94a3b8"} };

const card = () => ({
  background:"rgba(255,255,255,0.95)", backdropFilter:"blur(14px)", WebkitBackdropFilter:"blur(14px)",
  border:"1px solid rgba(255,255,255,0.55)", boxShadow:"0 22px 55px rgba(8,28,52,0.42), 0 8px 22px rgba(8,28,52,0.24)"
});

const heroPill = {
  display:"inline-flex", alignItems:"center", gap:7, padding:"5px 14px", borderRadius:30,
  background:"rgba(255,255,255,0.16)", border:"1px solid rgba(255,255,255,0.35)",
  backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)"
};

const parsePrice = (p) => { const n = parseFloat(String(p||"").replace(/[^0-9.]/g,"")); return isNaN(n)?0:n; };
const fmtMoney = (n) => "$" + n.toLocaleString(undefined, { maximumFractionDigits:2 });
const telHref = (phone) => "tel:" + String(phone||"").replace(/[^0-9+]/g,"");
const dirHref = (loc) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(loc||"")}`;

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
  refresh:"M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0 1 14.85-3.36L23 10 M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
  instagram:"M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5z M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z M17.5 6.5h.01",
  search:"M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M21 21l-4.35-4.35",
  nav:"M3 11l19-9-9 19-2-8-8-2z",
  dollar:"M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  note:"M12 20h9 M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z",
};
const Ico = ({d,size=16,color="currentColor",style={}}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,...style}}>
    {d.split(" M").map((seg,i)=><path key={i} d={i===0?seg:"M"+seg}/>)}
  </svg>
);

// ─── Animated Aurora Background ───────────────────────────────
const AuroraBackground = () => (
  <div className="ams-aurora" aria-hidden="true" style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none" }} />
);

// ─── Shared UI ────────────────────────────────────────────────
const Badge = ({ status }) => {
  const m = SM[status] || SM.pending;
  return <span style={{ background:m.c+"1f", color:m.c, border:`1px solid ${m.c}40`, borderRadius:5, padding:"2px 8px", fontSize:"0.65rem", fontWeight:800, letterSpacing:"0.07em", textTransform:"uppercase" }}>{m.label}</span>;
};

const Btn = ({ children, onClick, color=C.blue, outline, small, full, disabled, style={}, icon }) => (
  <button onClick={onClick} disabled={disabled} style={{ background:outline?"#fff":color, color:outline?color:"#fff", border:`1.5px solid ${outline?C.border:color}`, borderRadius:9, fontWeight:700, cursor:disabled?"not-allowed":"pointer", opacity:disabled?0.6:1, padding:small?"8px 14px":"12px 20px", fontSize:small?"0.75rem":"0.85rem", width:full?"100%":undefined, letterSpacing:"0.04em", textTransform:"uppercase", display:"inline-flex", alignItems:"center", gap:7, justifyContent:"center", transition:"all .15s", boxShadow:outline?"none":`0 4px 14px ${color}40`, ...style }}
    onMouseOver={e=>{ if(!disabled){e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.opacity="0.94";} }} onMouseOut={e=>{ e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.opacity=disabled?"0.6":"1"; }}>
    {icon&&<Ico d={P[icon]} size={14}/>}{children}
  </button>
);

const fieldStyle = { background:C.surface2, border:`1px solid ${C.border}`, color:C.text, borderRadius:9, padding:"11px 12px", width:"100%", fontSize:"0.92rem", outline:"none", boxSizing:"border-box", boxShadow:"0 2px 5px rgba(8,28,52,0.12)", transition:"border-color .15s, box-shadow .15s" };

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

const Toggle = ({ options, value, onChange, accent, labelFor }) => (
  <div style={{ display:"flex", gap:8, marginBottom:14 }}>
    {options.map(o=>(
      <button key={o} onClick={()=>onChange(o)} style={{ flex:1, padding:"11px", borderRadius:9, fontWeight:700, fontSize:"0.85rem", cursor:"pointer", textTransform:"uppercase", letterSpacing:"0.04em", transition:"all .15s", background:value===o?(accent||C.blue):C.surface2, color:value===o?"#fff":C.text2, border:`1.5px solid ${value===o?(accent||C.blue):C.border}`, boxShadow:value===o?`0 4px 12px ${(accent||C.blue)}33`:"none" }}>{labelFor?labelFor(o):o}</button>
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

const ErrorBar = ({ msg, onClose }) => msg ? (
  <div style={{ background:"rgba(254,242,242,0.97)", border:`1px solid ${C.red}55`, color:"#b91c1c", borderRadius:10, padding:"10px 14px", marginBottom:14, fontSize:"0.82rem", display:"flex", gap:8, alignItems:"center", justifyContent:"space-between", boxShadow:"0 6px 18px rgba(8,28,52,0.12)" }}>
    <span style={{ display:"flex", gap:8, alignItems:"center" }}><Ico d={P.alert} size={14} color="#b91c1c"/>{msg}</span>
    {onClose && <span onClick={onClose} style={{ cursor:"pointer", fontWeight:800, opacity:0.7 }}>✕</span>}
  </div>
) : null;

const SectionHead = ({ icon, children }) => (
  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
    <Ico d={P[icon]} size={18} color={ON.icon}/>
    <div style={{ color:ON.t, fontWeight:800, fontSize:"1.15rem" }}>{children}</div>
  </div>
);

// ─── Language toggle (compact pill in the nav) ────────────────
const LangToggle = () => {
  const { lang, setLang } = useLang();
  const m = useMobile();
  const next = lang === "en" ? "es" : "en";
  return (
    <button onClick={()=>setLang(next)} aria-label="Switch language"
      style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", gap:5, height:m?34:36, padding:"0 12px", borderRadius:9, border:`1.5px solid ${C.border}`, background:"#fff", color:C.text2, cursor:"pointer", fontWeight:800, fontSize:"0.72rem", letterSpacing:"0.04em", transition:"transform .15s", flexShrink:0 }}
      onMouseOver={e=>{e.currentTarget.style.transform="translateY(-1px)";}} onMouseOut={e=>{e.currentTarget.style.transform="translateY(0)";}}>
      <Ico d={P.globe} size={14} color={C.blue}/>{lang === "en" ? "ES" : "EN"}
    </button>
  );
};

// ─── Google Maps embed ────────────────────────────────────────
const MapEmbed = ({ location }) => {
  const m = useMobile();
  const { t } = useLang();
  if (!location || location.trim().length < 3) return null;
  return (
    <div style={{ borderRadius:10, overflow:"hidden", border:`1px solid ${C.border}`, marginTop:10 }}>
      <div style={{ background:C.surface2, padding:"7px 12px", display:"flex", alignItems:"center", gap:7 }}>
        <Ico d={P.map} size={13} color={C.blue}/><span style={{ fontSize:"0.72rem", color:C.text2, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.07em" }}>{t("map_label")}</span>
      </div>
      <iframe src={`https://www.google.com/maps?q=${encodeURIComponent(location)}&output=embed`} width="100%" height={m?170:210} style={{ border:"none", display:"block" }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="map"/>
    </div>
  );
};

// ─── Nav ──────────────────────────────────────────────────────
const Nav = ({ bizName, isMech, onMechClick }) => {
  const m = useMobile();
  const { t } = useLang();
  return (
    <div style={{ position:"sticky", top:0, zIndex:100, background:"rgba(255,255,255,0.86)", backdropFilter:"blur(14px)", WebkitBackdropFilter:"blur(14px)", borderBottom:"1px solid rgba(255,255,255,0.4)", padding:m?"13px 14px":"16px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 4px 20px rgba(8,28,52,0.10)" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:0 }}>
        <div style={{ background:`linear-gradient(135deg, ${C.blue}, ${C.sky})`, borderRadius:10, width:m?30:34, height:m?30:34, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 4px 12px ${C.blue}40`, flexShrink:0 }}>
          <Ico d={P.wrench} size={m?16:18} color="#fff"/>
        </div>
        <div style={{ minWidth:0 }}>
          <span style={{ color:C.text, fontWeight:900, fontSize:m?"1.05rem":"1.18rem", letterSpacing:"0.06em" }}>{bizName}</span>
          {!m && <span style={{ color:C.text3, fontSize:"0.64rem", marginLeft:8, textTransform:"uppercase", letterSpacing:"0.1em", fontWeight:600 }}>{t("nav_tagline")}</span>}
        </div>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:m?7:9, flexShrink:0 }}>
        <LangToggle/>
        <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Instagram"
           style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:m?34:36, height:m?34:36, borderRadius:9, border:`1.5px solid ${C.border}`, background:"#fff", cursor:"pointer", transition:"transform .15s", flexShrink:0 }}
           onMouseOver={e=>{e.currentTarget.style.transform="translateY(-1px)";}}
           onMouseOut={e=>{e.currentTarget.style.transform="translateY(0)";}}>
          <Ico d={P.instagram} size={m?18:19} color="#E4405F"/>
        </a>
        {!isMech&&<Btn small outline onClick={onMechClick} icon="lock">{t("nav_login")}</Btn>}
      </div>
    </div>
  );
};

// ─── Hero Banner ──────────────────────────────────────────────
const Hero = () => {
  const m = useMobile();
  const { t } = useLang();
  return (
    <div style={{ padding:m?"30px 16px 18px":"54px 20px 30px", textAlign:"center", position:"relative" }}>
      <div style={{ ...heroPill, marginBottom:16 }}>
        <Ico d={P.shield} size={14} color="#ffffff"/>
        <span style={{ color:"#ffffff", fontSize:"0.72rem", fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase" }}>{t("hero_badge")}</span>
      </div>
      <div style={{ color:"#ffffff", fontWeight:900, fontSize:m?"1.95rem":"2.7rem", letterSpacing:"-0.01em", lineHeight:1.1, marginBottom:10, textShadow:"0 2px 22px rgba(0,0,0,0.28)" }}>{t("hero_title")}</div>
      <div style={{ color:"rgba(255,255,255,0.9)", fontSize:m?"0.92rem":"1.05rem", fontWeight:500, maxWidth:440, margin:"0 auto", lineHeight:1.5, textShadow:"0 1px 12px rgba(0,0,0,0.22)" }}>
        {t("hero_desc")}
      </div>
      <div style={{ display:"flex", justifyContent:"center", flexWrap:"wrap", gap:m?"8px 10px":14, alignItems:"center", marginTop:18 }}>
        {[["zap","feat_fast","#fbbf24"],["globe","feat_bilingual","#67e8f9"],["heart","feat_friendly","#fda4af"]].map(([ic,key,col])=>(
          <div key={key} style={{ ...heroPill, color:"rgba(255,255,255,0.92)", fontSize:m?"0.74rem":"0.82rem", fontWeight:600 }}>
            <Ico d={P[ic]} size={14} color={col}/>{t(key)}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Customer Form ────────────────────────────────────────────
const CustomerForm = ({ onSubmit, availability, busy, onTrack }) => {
  const m = useMobile();
  const { t } = useLang();
  const [f,setF] = useState({ name:"",phone:"",loc:"",svc:"Towing",year:"",make:"",model:"",issue:"",urg:"ASAP",schedTime:"" });
  const [warn,setWarn] = useState(false);
  const [err,setErr] = useState("");
  const [mapLoc,setMapLoc] = useState("");
  const [submitting,setSubmitting] = useState(false);
  const set = (k,v) => setF(p=>({...p,[k]:v}));

  useEffect(()=>{
    const now=new Date();
    const day=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][now.getDay()];
    const av=(availability||DEFAULT_AVAIL)[day];
    if(!av||!av.on){setWarn(true);return;}
    const cur=now.getHours()*60+now.getMinutes();
    const [oh,om]=av.open.split(":").map(Number);
    const [ch,cm]=av.close.split(":").map(Number);
    setWarn(cur<oh*60+om||cur>ch*60+cm);
  },[availability]);

  const submit = async () => {
    for(const k of ["name","phone","loc","year","make","model","issue"]) if(!f[k].trim()){setErr(t("err_required"));return;}
    if(f.urg==="Scheduled"&&!f.schedTime){setErr(t("err_sched"));return;}
    setErr(""); setSubmitting(true);
    try { await onSubmit({...f}); }
    catch (e) { setErr(e.message || t("err_submit")); }
    finally { setSubmitting(false); }
  };

  return (
    <div>
      <Hero/>
      <div style={{ padding:m?"0 12px 24px":"0 16px 24px", maxWidth:600, margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom:16 }}>
          <button onClick={onTrack} style={{ background:"rgba(255,255,255,0.16)", border:"1px solid rgba(255,255,255,0.35)", backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)", color:"#fff", borderRadius:30, padding:"8px 18px", fontSize:"0.8rem", fontWeight:700, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:7, transition:"transform .15s" }}
            onMouseOver={e=>{e.currentTarget.style.transform="translateY(-1px)";}} onMouseOut={e=>{e.currentTarget.style.transform="translateY(0)";}}>
            <Ico d={P.search} size={14} color="#7dd3fc"/>{t("track_cta")}
          </button>
        </div>

        {busy ? (
          <div style={{ background:"rgba(254,242,242,0.97)", borderRadius:12, padding:"12px 15px", marginBottom:16, color:"#b91c1c", fontSize:"0.85rem", display:"flex", gap:9, alignItems:"flex-start", border:`1px solid ${C.red}55`, boxShadow:"0 8px 24px rgba(8,28,52,0.18)", fontWeight:600 }}>
            <Ico d={P.alert} size={16} color={C.red} style={{marginTop:1,flexShrink:0}}/>{t("busy_banner")}
          </div>
        ) : warn ? (
          <div style={{ background:"rgba(255,251,235,0.96)", borderRadius:12, padding:"11px 14px", marginBottom:16, color:C.amberD, fontSize:"0.82rem", display:"flex", gap:8, alignItems:"flex-start", border:`1px solid ${C.amber}55`, boxShadow:"0 8px 24px rgba(8,28,52,0.18)" }}>
            <Ico d={P.clock} size={15} color={C.amber} style={{marginTop:1,flexShrink:0}}/>{t("afterhours")}
          </div>
        ) : null}

        <Card style={{ marginBottom:20 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:11, marginBottom:18 }}>
            <div style={{ background:`linear-gradient(135deg, ${C.blue}, ${C.sky})`, borderRadius:11, width:40, height:40, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:`0 4px 12px ${C.blue}33` }}><Ico d={P.zap} size={20} color="#fff"/></div>
            <div style={{ textAlign:"left" }}>
              <div style={{ color:C.text, fontWeight:800, fontSize:"1.15rem" }}>{t("form_title")}</div>
              <div style={{ color:C.text2, fontSize:"0.82rem" }}>{t("form_subtitle")}</div>
            </div>
          </div>
          <Inp label={t("f_name")} icon="user" placeholder={t("f_name_ph")} value={f.name} onChange={e=>set("name",e.target.value)}/>
          <Inp label={t("f_phone")} icon="phone" type="tel" placeholder={t("f_phone_ph")} value={f.phone} onChange={e=>set("phone",e.target.value)}/>
          <div style={{ marginBottom:14 }}>
            <Lbl icon="loc">{t("f_loc")}</Lbl>
            <input placeholder={t("f_loc_ph")} value={f.loc} onChange={e=>set("loc",e.target.value)} onBlur={e=>setMapLoc(e.target.value)} style={fieldStyle}/>
            <MapEmbed location={mapLoc}/>
          </div>
          <Lbl icon={f.svc==="Towing"?"tow":"wrench"}>{t("f_svc")}</Lbl>
          <Toggle options={["Towing","Mechanical"]} value={f.svc} onChange={v=>{ set("svc",v); if(v==="Mechanical") set("urg","Scheduled"); }} labelFor={o=>o==="Towing"?t("svc_towing"):t("svc_mechanical")}/>
          <Lbl icon="car">{t("f_vehicle")}</Lbl>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1.4fr 1.4fr", gap:m?6:8, marginBottom:14 }}>
            {[["year",t("f_year")],["make",t("f_make")],["model",t("f_model")]].map(([k,l])=>(
              <input key={k} placeholder={l} value={f[k]} onChange={e=>set(k,e.target.value)} style={{ ...fieldStyle, padding:m?"11px 8px":"11px 12px", fontSize:"0.85rem" }}/>
            ))}
          </div>
          <Tarea label={t("f_issue")} icon="alert" placeholder={t("f_issue_ph")} value={f.issue} onChange={e=>set("issue",e.target.value)}/>
          {f.svc==="Mechanical" ? (
            <>
              <Lbl icon="cal">{t("f_appt")}</Lbl>
              <div style={{ background:`${C.blue}0d`, border:`1px solid ${C.blue}20`, color:C.text2, borderRadius:9, padding:"10px 12px", marginBottom:12, fontSize:"0.8rem", display:"flex", gap:8, alignItems:"flex-start" }}>
                <Ico d={P.clock} size={14} color={C.blue} style={{marginTop:1,flexShrink:0}}/>{t("appt_notice")}
              </div>
              <Inp label={t("f_pref_time")} icon="cal" type="datetime-local" value={f.schedTime} onChange={e=>set("schedTime",e.target.value)}/>
            </>
          ) : (
            <>
              <Lbl icon="clock">{t("f_urgency")}</Lbl>
              <Toggle options={["ASAP","Scheduled"]} value={f.urg} onChange={v=>set("urg",v)} accent={C.amber} labelFor={o=>o==="ASAP"?t("urg_asap"):t("urg_scheduled")}/>
              {f.urg==="Scheduled"&&<Inp label={t("f_sched_time")} icon="cal" type="datetime-local" value={f.schedTime} onChange={e=>set("schedTime",e.target.value)}/>}
            </>
          )}
          <ErrorBar msg={err} onClose={()=>setErr("")}/>
          <Btn full onClick={submit} icon="zap" disabled={submitting}>{submitting?t("submitting"):(busy?t("submit_busy"):t("submit"))}</Btn>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, marginTop:12, color:C.text3, fontSize:"0.74rem" }}>
            <Ico d={P.shield} size={12} color={C.text3}/>{t("privacy")}
          </div>
        </Card>
      </div>
    </div>
  );
};

// ─── Confirmation / Tracking (polls backend for live status) ──
const STEPS = ["pending","accepted","onway","done"];

const Confirmation = ({ initialReq, onNew, title, subtitle, note }) => {
  const m = useMobile();
  const { t } = useLang();
  const [req,setReq] = useState(initialReq);

  useEffect(()=>{
    let alive = true;
    const tick = async () => {
      try { const fresh = await api("/api/requests/"+initialReq.id); if(alive) setReq(fresh); } catch {}
    };
    const iv = setInterval(tick, 4000);
    return () => { alive = false; clearInterval(iv); };
  },[initialReq.id]);

  const idx = req.status==="dismissed"?0:STEPS.indexOf(req.status);
  const SLBLS = [t("step_submitted"),t("step_accepted"),t("step_onway"),t("step_done")];
  const svcLabel = req.svc==="Towing"?t("svc_towing"):t("svc_mechanical");
  const urgLabel = req.urg==="ASAP"?t("urg_asap"):t("urg_scheduled");
  return (
    <div style={{ padding:m?"22px 12px":"28px 16px", maxWidth:600, margin:"0 auto" }}>
      <div style={{ textAlign:"center", marginBottom:24 }}>
        <div style={{ width:66, height:66, background:`linear-gradient(135deg, ${C.blue}, ${C.sky})`, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px", boxShadow:"0 10px 30px rgba(0,0,0,0.3)" }}><Ico d={P.check} size={32} color="#fff"/></div>
        <div style={{ color:ON.t, fontWeight:900, fontSize:"1.4rem", textShadow:"0 2px 16px rgba(0,0,0,0.28)" }}>{title||t("conf_title")}</div>
        <div style={{ color:ON.t2, fontSize:"0.88rem", marginTop:6 }}>{subtitle||t("conf_subtitle")}</div>
        {note && <div style={{ color:ON.t3, fontSize:"0.78rem", marginTop:6 }}>{note}</div>}
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
        <Lbl icon="car">{t("job_details")}</Lbl>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:10 }}>
          {[[t("d_name"),req.name,"user"],[t("d_phone"),req.phone,"phone"],[t("d_service"),svcLabel,req.svc==="Towing"?"tow":"wrench"],[t("d_urgency"),urgLabel,"clock"],[t("d_vehicle"),`${req.year} ${req.make} ${req.model}`,"car"],[t("d_location"),req.loc,"loc"]].map(([k,v,ic])=>(
            <div key={k}><div style={{ color:C.text3, fontSize:"0.65rem", textTransform:"uppercase", display:"flex", alignItems:"center", gap:4, marginBottom:2, fontWeight:600 }}><Ico d={P[ic]} size={10} color={C.text3}/>{k}</div><div style={{ color:k===t("d_vehicle")?C.blue:C.text, fontSize:"0.88rem", fontWeight:k===t("d_vehicle")?700:500, wordBreak:"break-word" }}>{v}</div></div>
          ))}
        </div>
        {req.issue&&<div style={{ marginTop:12, padding:"11px 13px", background:C.surface2, borderRadius:10 }}><div style={{ color:C.text3, fontSize:"0.65rem", textTransform:"uppercase", marginBottom:4, fontWeight:600 }}>{t("d_issue")}</div><div style={{ color:C.text2, fontSize:"0.86rem", fontStyle:"italic" }}>"{req.issue}"</div></div>}
        <MapEmbed location={req.loc}/>
      </Card>
      <Btn full outline onClick={onNew} icon="zap" style={{ marginTop:8 }}>{t("submit_another")}</Btn>
    </div>
  );
};

// ─── Lookup (track by phone) ──────────────────────────────────
const Lookup = ({ onBack, onNew }) => {
  const m = useMobile();
  const { t } = useLang();
  const [phone,setPhone] = useState("");
  const [found,setFound] = useState(null);
  const [count,setCount] = useState(0);
  const [err,setErr] = useState("");
  const [busy,setBusy] = useState(false);
  const [searched,setSearched] = useState(false);

  const go = async () => {
    if(!phone.trim()) return;
    setBusy(true); setErr("");
    try {
      const list = await api("/api/requests/lookup?phone="+encodeURIComponent(phone.trim()));
      setCount(list.length); setFound(list[0]||null); setSearched(true);
    } catch (e) { setErr(e.message || t("err_submit")); setSearched(true); }
    finally { setBusy(false); }
  };

  if (found) return <Confirmation initialReq={found} onNew={onNew} title={t("lookup_track_title")} subtitle={t("lookup_track_subtitle")} note={count>1?t("lookup_multiple"):""}/>;

  return (
    <div style={{ padding:m?"24px 16px":32, maxWidth:420, margin:m?"24px auto":"48px auto" }}>
      <Card>
        <div style={{ textAlign:"center", marginBottom:20 }}>
          <div style={{ width:58, height:58, background:`linear-gradient(135deg, ${C.blue}, ${C.sky})`, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px", boxShadow:`0 6px 18px ${C.blue}40` }}><Ico d={P.search} size={24} color="#fff"/></div>
          <div style={{ color:C.text, fontWeight:800, fontSize:"1.15rem" }}>{t("lookup_title")}</div>
          <div style={{ color:C.text2, fontSize:"0.8rem", marginTop:4 }}>{t("lookup_subtitle")}</div>
        </div>
        <Inp label={t("lookup_phone")} icon="phone" type="tel" placeholder={t("f_phone_ph")} value={phone} onChange={e=>{setPhone(e.target.value);setErr("");setSearched(false);}} onKeyDown={e=>e.key==="Enter"&&go()}/>
        {searched && !found && !err && (
          <div style={{ background:`${C.amber}14`, border:`1px solid ${C.amber}40`, color:C.amberD, borderRadius:9, padding:"10px 12px", marginBottom:12, fontSize:"0.82rem", display:"flex", gap:8, alignItems:"flex-start" }}>
            <Ico d={P.alert} size={14} color={C.amber} style={{marginTop:1,flexShrink:0}}/>{t("lookup_none")}
          </div>
        )}
        <ErrorBar msg={err} onClose={()=>setErr("")}/>
        <Btn full onClick={go} icon="search" disabled={busy} style={{ marginBottom:10 }}>{busy?t("lookup_searching"):t("lookup_btn")}</Btn>
        <Btn full outline onClick={onBack}>{t("lookup_back")}</Btn>
      </Card>
    </div>
  );
};

// ─── Login ────────────────────────────────────────────────────
const Login = ({ onLogin, onBack }) => {
  const m = useMobile();
  const [pw,setPw]=useState(""); const [err,setErr]=useState(""); const [busy,setBusy]=useState(false);
  const go = async () => {
    if(!pw) return;
    setBusy(true); setErr("");
    try { await onLogin(pw); }
    catch (e) { setErr(e.message || "Login failed — check your connection."); }
    finally { setBusy(false); }
  };
  return (
    <div style={{ padding:m?"24px 16px":32, maxWidth:380, margin:m?"24px auto":"48px auto" }}>
      <Card>
        <div style={{ textAlign:"center", marginBottom:22 }}>
          <div style={{ width:58, height:58, background:`linear-gradient(135deg, ${C.blue}, ${C.sky})`, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px", boxShadow:`0 6px 18px ${C.blue}40` }}><Ico d={P.lock} size={24} color="#fff"/></div>
          <div style={{ color:C.text, fontWeight:800, fontSize:"1.15rem" }}>Mechanic Login</div>
          <div style={{ color:C.text2, fontSize:"0.8rem", marginTop:4 }}>Dashboard access only</div>
        </div>
        <Inp label="Password" icon="lock" type="password" placeholder="Enter password" value={pw} onChange={e=>{setPw(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&go()}/>
        <ErrorBar msg={err} onClose={()=>setErr("")}/>
        <Btn full onClick={go} icon="lock" disabled={busy} style={{ marginBottom:10 }}>{busy?"Signing in…":"Enter Dashboard"}</Btn>
        <Btn full outline onClick={onBack}>← Back</Btn>
      </Card>
    </div>
  );
};

// ─── Request Card (mechanic — English) ────────────────────────
const ReqCard = ({ req, onPatch, busyId }) => {
  const [showMap,setShowMap]=useState(false);
  const [showEdit,setShowEdit]=useState(false);
  const [notes,setNotes]=useState(req.notes||"");
  const [price,setPrice]=useState(req.price||"");
  const active=["pending","accepted","onway"].includes(req.status);
  const svcCol = req.svc==="Towing" ? C.blue : C.sky;
  const busy = busyId === req.id;
  return (
    <Card accent={active}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10, gap:8 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:0 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:`${svcCol}14`, border:`1px solid ${svcCol}33`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Ico d={P[req.svc==="Towing"?"tow":"wrench"]} size={17} color={svcCol}/></div>
          <div style={{ minWidth:0 }}><div style={{ color:C.text, fontWeight:800, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{req.name}</div><div style={{ color:svcCol, fontSize:"0.68rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em" }}>{req.svc}</div></div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
          {req.price&&<span style={{ background:`${C.green}1a`, color:C.green, border:`1px solid ${C.green}40`, borderRadius:6, padding:"2px 8px", fontSize:"0.72rem", fontWeight:800 }}>{fmtMoney(parsePrice(req.price))}</span>}
          <Badge status={req.status}/>
        </div>
      </div>
      <div style={{ background:`${C.blue}0d`, border:`1px solid ${C.blue}20`, borderRadius:9, padding:"7px 11px", marginBottom:10, display:"inline-flex", alignItems:"center", gap:7 }}><Ico d={P.car} size={13} color={C.blue}/><span style={{ color:C.blue, fontWeight:700, fontSize:"0.85rem" }}>{req.year} {req.make} {req.model}</span></div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
        <div style={{ minWidth:0 }}>
          <Lbl icon="phone">Phone</Lbl>
          <a href={telHref(req.phone)} style={{ color:C.blue, fontSize:"0.85rem", fontWeight:600, textDecoration:"none" }}>{req.phone}</a>
        </div>
        <div style={{ minWidth:0 }}>
          <Lbl icon="loc">Location</Lbl>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ color:C.text, fontSize:"0.85rem", flex:1, minWidth:0, wordBreak:"break-word" }}>{req.loc}</div>
            <button onClick={()=>setShowMap(v=>!v)} title="Preview map" style={{ background:showMap?`${C.blue}14`:"transparent", border:"none", cursor:"pointer", padding:5, borderRadius:6, flexShrink:0 }}><Ico d={P.map} size={15} color={showMap?C.blue:C.text3}/></button>
          </div>
          {showMap&&<MapEmbed location={req.loc}/>}
        </div>
        {req.urg==="Scheduled"&&req.schedTime&&<div style={{ gridColumn:"1/-1" }}><Lbl icon="cal">Scheduled</Lbl><div style={{ color:C.amberD, fontSize:"0.85rem", fontWeight:700 }}>{new Date(req.schedTime).toLocaleString()}</div></div>}
      </div>
      {req.issue&&<div style={{ color:C.text2, fontSize:"0.83rem", marginBottom:10, fontStyle:"italic", padding:"9px 11px", background:C.surface2, borderRadius:8 }}>"{req.issue}"</div>}
      {req.notes&&!showEdit&&<div style={{ color:C.text2, fontSize:"0.82rem", marginBottom:10, padding:"9px 11px", background:`${C.amber}10`, border:`1px solid ${C.amber}33`, borderRadius:8, display:"flex", gap:7, alignItems:"flex-start" }}><Ico d={P.note} size={13} color={C.amberD} style={{marginTop:1,flexShrink:0}}/><span><b style={{color:C.amberD}}>Note:</b> {req.notes}</span></div>}
      <div style={{ color:C.text3, fontSize:"0.7rem", marginBottom:12, display:"flex", alignItems:"center", gap:5 }}><Ico d={P.clock} size={11} color={C.text3}/>Submitted {new Date(req.submittedAt).toLocaleString()}</div>

      <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
        {req.status==="pending"&&<><Btn small onClick={()=>onPatch(req.id,{status:"accepted"})} icon="check" disabled={busy}>Accept</Btn><Btn small outline color={C.text2} onClick={()=>onPatch(req.id,{status:"dismissed"})} disabled={busy}>Dismiss</Btn></>}
        {req.status==="accepted"&&<Btn small color={C.sky} onClick={()=>onPatch(req.id,{status:"onway"})} icon="tow" disabled={busy}>On the Way</Btn>}
        {req.status==="onway"&&<Btn small color={C.green} onClick={()=>onPatch(req.id,{status:"done"})} icon="check" disabled={busy}>Mark Done</Btn>}
        <a href={dirHref(req.loc)} target="_blank" rel="noopener noreferrer" style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:9, border:`1.5px solid ${C.border}`, background:"#fff", color:C.text2, fontSize:"0.75rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.04em", textDecoration:"none" }}><Ico d={P.nav} size={14} color={C.blue}/>Directions</a>
        <a href={telHref(req.phone)} style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:9, border:`1.5px solid ${C.border}`, background:"#fff", color:C.text2, fontSize:"0.75rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.04em", textDecoration:"none" }}><Ico d={P.phone} size={14} color={C.green}/>Call</a>
        <button onClick={()=>setShowEdit(v=>!v)} style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:9, border:`1.5px solid ${showEdit?C.blue:C.border}`, background:showEdit?`${C.blue}0d`:"#fff", color:showEdit?C.blue:C.text2, fontSize:"0.75rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.04em", cursor:"pointer" }}><Ico d={P.note} size={14} color={showEdit?C.blue:C.text2}/>Note / Price</button>
      </div>

      {showEdit&&(
        <div style={{ marginTop:12, padding:"12px 13px", background:C.surface2, borderRadius:10, border:`1px solid ${C.border}` }}>
          <Lbl icon="note">Private Note</Lbl>
          <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Parts needed, gate code, follow-up…" style={{ ...fieldStyle, minHeight:64, resize:"vertical", marginBottom:10 }}/>
          <Lbl icon="dollar">Price Charged</Lbl>
          <div style={{ display:"flex", gap:8, marginTop:4 }}>
            <input value={price} onChange={e=>setPrice(e.target.value)} placeholder="e.g. 150" inputMode="decimal" style={{ ...fieldStyle, flex:1 }}/>
            <Btn small onClick={()=>onPatch(req.id,{notes,price})} icon="check" disabled={busy}>{busy?"Saving…":"Save"}</Btn>
          </div>
        </div>
      )}
    </Card>
  );
};

// ─── Dashboard (mechanic — English) ───────────────────────────
const Dashboard = ({ availability, onAvailability, bizName, onBizName, onChangePassword, onLogout, busy, onBusyToggle }) => {
  const m = useMobile();
  const [tab,setTab]=useState("queue");
  const [requests,setRequests]=useState([]);
  const [loading,setLoading]=useState(true);
  const [err,setErr]=useState("");
  const [busyId,setBusyId]=useState(null);
  const [search,setSearch]=useState("");

  const [newBiz,setNewBiz]=useState(bizName);
  const [curPw,setCurPw]=useState(""); const [newPw,setNewPw]=useState(""); const [confPw,setConfPw]=useState("");
  const [pwMsg,setPwMsg]=useState(""); const [bizMsg,setBizMsg]=useState("");

  const authApi = useCallback(async (path, opts={}) => {
    try { return await api(path, { ...opts, auth:true }); }
    catch (e) { if (e.status === 401) onLogout(); throw e; }
  }, [onLogout]);

  const loadRequests = useCallback(async () => {
    try { const list = await authApi("/api/requests"); setRequests(list); setErr(""); }
    catch (e) { if (e.status !== 401) setErr(e.message); }
    finally { setLoading(false); }
  }, [authApi]);

  useEffect(()=>{
    loadRequests();
    const iv = setInterval(loadRequests, 8000);
    return () => clearInterval(iv);
  },[loadRequests]);

  const patchRequest = async (id, body) => {
    setBusyId(id);
    try { const updated = await authApi("/api/requests/"+id, { method:"PATCH", body });
      setRequests(rs => rs.map(r => r.id===id ? updated : r)); setErr(""); }
    catch (e) { if (e.status !== 401) setErr(e.message); }
    finally { setBusyId(null); }
  };

  const pending=requests.filter(r=>r.status==="pending").length;
  const active=requests.filter(r=>["accepted","onway"].includes(r.status)).length;
  const todayStr=new Date().toDateString();
  const weekAgo=Date.now()-7*24*60*60*1000;
  const doneToday=requests.filter(r=>r.status==="done"&&new Date(r.submittedAt).toDateString()===todayStr).length;
  const allDone=requests.filter(r=>r.status==="done").length;
  const earnToday=requests.filter(r=>r.status==="done"&&new Date(r.submittedAt).toDateString()===todayStr).reduce((s,r)=>s+parsePrice(r.price),0);
  const earnWeek=requests.filter(r=>r.status==="done"&&new Date(r.submittedAt).getTime()>=weekAgo).reduce((s,r)=>s+parsePrice(r.price),0);

  const q=search.trim().toLowerCase();
  const shownRequests = q
    ? requests.filter(r => (r.name||"").toLowerCase().includes(q) || (r.phone||"").toLowerCase().includes(q) || `${r.year} ${r.make} ${r.model}`.toLowerCase().includes(q) || (r.loc||"").toLowerCase().includes(q))
    : requests;

  const todayJobs=requests.filter(r=>["accepted","onway","done"].includes(r.status)&&new Date(r.submittedAt).toDateString()===todayStr)
    .sort((a,b)=>(a.urg==="Scheduled"?new Date(a.schedTime):new Date(a.submittedAt))-(b.urg==="Scheduled"?new Date(b.schedTime):new Date(b.submittedAt)));

  const saveBiz = async () => {
    try { await onBizName(newBiz); setBizMsg("✓ Saved!"); setTimeout(()=>setBizMsg(""),2500); }
    catch (e) { setBizMsg(e.message); }
  };
  const savePw = async () => {
    if(newPw.length<6){setPwMsg("New password must be at least 6 characters.");return;}
    if(newPw!==confPw){setPwMsg("Passwords don't match.");return;}
    try { await onChangePassword(curPw, newPw); setPwMsg("✓ Password updated!"); setCurPw(""); setNewPw(""); setConfPw(""); }
    catch (e) { setPwMsg(e.message); }
  };

  const toggleDay = (day) => { const next={...availability,[day]:{...availability[day],on:!availability[day].on}}; onAvailability(next); };
  const setTime = (day,field,val) => { const next={...availability,[day]:{...availability[day],[field]:val}}; onAvailability(next); };

  const TABS=[{id:"queue",label:"Queue",icon:"list"},{id:"schedule",label:"Schedule",icon:"cal"},{id:"avail",label:"Hours",icon:"clock"},{id:"settings",label:"Settings",icon:"cog"}];
  const STATS=[[pending,"Pending",C.amber,"alert"],[active,"Active",C.blue,"zap"],[doneToday,"Done Today",C.green,"check"],[allDone,"All-Time",C.sky,"list"]];
  const av = availability || DEFAULT_AVAIL;

  return (
    <div style={{ maxWidth:700, margin:"0 auto" }}>
      <div style={{ display:"flex", gap:m?4:6, padding:m?"12px 10px":"14px", borderBottom:"1px solid rgba(255,255,255,0.18)" }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:1, minWidth:0, padding:m?"9px 2px":"9px 4px", borderRadius:10, border:`1px solid ${tab===t.id?C.blue:"rgba(255,255,255,0.4)"}`, cursor:"pointer", background:tab===t.id?C.blue:"rgba(255,255,255,0.92)", color:tab===t.id?"#fff":C.text2, fontWeight:700, fontSize:m?"0.58rem":"0.7rem", letterSpacing:"0.03em", textTransform:"uppercase", display:"flex", alignItems:"center", justifyContent:"center", gap:m?3:6, transition:"all .15s", boxShadow:tab===t.id?`0 4px 12px ${C.blue}40`:"0 2px 10px rgba(8,28,52,0.12)" }}>
            <Ico d={P[t.icon]} size={13} color={tab===t.id?"#fff":C.text2}/>{t.label}
          </button>
        ))}
      </div>

      <div style={{ padding:m?"16px 12px":18 }}>
        {busy&&(
          <div style={{ ...card(), borderRadius:12, padding:"11px 14px", marginBottom:14, borderLeft:`4px solid ${C.red}`, display:"flex", gap:9, alignItems:"center", color:"#b91c1c", fontSize:"0.82rem", fontWeight:600 }}>
            <Ico d={P.alert} size={15} color={C.red}/>Busy mode is ON — customers see a "we'll call you back" message.
          </div>
        )}
        <ErrorBar msg={err} onClose={()=>setErr("")}/>

        {tab==="queue"&&<>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
            {[["Today",earnToday,C.green],["This Week",earnWeek,C.sky]].map(([l,v,c])=>(
              <div key={l} style={{ ...card(), borderRadius:14, padding:"15px 16px", borderTop:`4px solid ${c}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ color:c, fontWeight:900, fontSize:"1.7rem" }}>{fmtMoney(v)}</div>
                  <div style={{ background:`${c}18`, borderRadius:10, width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center" }}><Ico d={P.dollar} size={17} color={c}/></div>
                </div>
                <div style={{ color:C.text2, fontSize:"0.68rem", textTransform:"uppercase", letterSpacing:"0.07em", marginTop:4, fontWeight:600 }}>{l}'s Earnings</div>
              </div>
            ))}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
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

          <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:10 }}>
            <div style={{ position:"relative", flex:1 }}>
              <span style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}><Ico d={P.search} size={15} color={C.text3}/></span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name, phone, vehicle…" style={{ ...fieldStyle, paddingLeft:34 }}/>
              {search&&<button onClick={()=>setSearch("")} style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", background:"transparent", border:"none", cursor:"pointer", color:C.text3, fontWeight:800, fontSize:"0.9rem" }}>✕</button>}
            </div>
            <button onClick={loadRequests} style={{ background:"rgba(255,255,255,0.92)", border:`1px solid ${C.border}`, borderRadius:9, color:C.text2, fontSize:"0.74rem", fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:5, padding:"11px 13px", flexShrink:0 }}><Ico d={P.refresh} size={13} color={C.text2}/>{!m&&"Refresh"}</button>
          </div>

          {loading
            ? <div style={{ color:ON.t2, textAlign:"center", padding:"48px 0", fontSize:"0.9rem" }}>Loading requests…</div>
            : requests.length===0
              ? <div style={{ color:ON.t3, textAlign:"center", padding:"56px 0", fontSize:"0.9rem" }}><Ico d={P.list} size={34} color="rgba(255,255,255,0.35)" style={{ display:"block", margin:"0 auto 12px" }}/>No requests yet.</div>
              : shownRequests.length===0
                ? <div style={{ color:ON.t3, textAlign:"center", padding:"48px 0", fontSize:"0.9rem" }}><Ico d={P.search} size={30} color="rgba(255,255,255,0.35)" style={{ display:"block", margin:"0 auto 12px" }}/>No matches for "{search}".</div>
                : shownRequests.map(r=><ReqCard key={r.id} req={r} onPatch={patchRequest} busyId={busyId}/>)
          }
        </>}

        {tab==="schedule"&&<>
          <SectionHead icon="cal">Today's Jobs</SectionHead>
          {todayJobs.length===0
            ?<div style={{ color:ON.t3, textAlign:"center", padding:"56px 0" }}><Ico d={P.cal} size={34} color="rgba(255,255,255,0.35)" style={{ display:"block", margin:"0 auto 12px" }}/>No jobs scheduled for today.</div>
            :todayJobs.map(r=>(
              <Card key={r.id} accent>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}><Ico d={P.clock} size={13} color={C.amber}/><span style={{ color:C.amberD, fontWeight:700, fontSize:"0.85rem" }}>{r.urg==="Scheduled"&&r.schedTime?new Date(r.schedTime).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):"ASAP"}</span></div>
                  <Badge status={r.status}/>
                </div>
                <div style={{ fontWeight:800, color:C.text, marginBottom:4 }}>{r.name} <span style={{ color:r.svc==="Towing"?C.blue:C.sky, fontWeight:600, fontSize:"0.85rem" }}>— {r.svc}</span></div>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}><Ico d={P.car} size={12} color={C.blue}/><span style={{ color:C.blue, fontSize:"0.82rem", fontWeight:700 }}>{r.year} {r.make} {r.model}</span></div>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}><Ico d={P.loc} size={12} color={C.text3}/><span style={{ color:C.text2, fontSize:"0.82rem" }}>{r.loc}</span></div>
                {r.issue&&<div style={{ color:C.text3, fontSize:"0.78rem", fontStyle:"italic", marginBottom:8 }}>"{r.issue}"</div>}
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  <a href={dirHref(r.loc)} target="_blank" rel="noopener noreferrer" style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"7px 12px", borderRadius:8, border:`1.5px solid ${C.border}`, background:"#fff", color:C.text2, fontSize:"0.72rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.04em", textDecoration:"none" }}><Ico d={P.nav} size={13} color={C.blue}/>Directions</a>
                  <a href={telHref(r.phone)} style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"7px 12px", borderRadius:8, border:`1.5px solid ${C.border}`, background:"#fff", color:C.text2, fontSize:"0.72rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.04em", textDecoration:"none" }}><Ico d={P.phone} size={13} color={C.green}/>Call</a>
                </div>
              </Card>
            ))
          }
        </>}

        {tab==="avail"&&<>
          <SectionHead icon="clock">Business Hours</SectionHead>
          {DAYS.map(day=>{
            const d=av[day];
            return (
              <div key={day} style={{ ...card(), borderLeft:`4px solid ${d.on?C.green:C.surface3}`, borderRadius:12, padding:"12px 14px", marginBottom:10, transition:"border-color .2s" }}>
                <div style={{ display:"flex", alignItems:"center", gap:m?8:12, flexWrap:"wrap" }}>
                  <div style={{ minWidth:m?64:94, color:d.on?C.text:C.text3, fontWeight:700, fontSize:"0.85rem" }}>{day}</div>
                  <div onClick={()=>toggleDay(day)} style={{ width:40, height:22, borderRadius:11, cursor:"pointer", position:"relative", background:d.on?C.green:C.surface3, transition:"background .2s", flexShrink:0 }}>
                    <div style={{ position:"absolute", top:3, left:d.on?21:3, width:16, height:16, borderRadius:"50%", background:"#fff", transition:"left .2s", boxShadow:"0 1px 3px rgba(0,0,0,0.2)" }}/>
                  </div>
                  {d.on?<div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <input type="time" value={d.open} onChange={e=>setTime(day,"open",e.target.value)} style={{ background:C.surface2, border:`1px solid ${C.border}`, color:C.text, borderRadius:8, padding:"6px 8px", fontSize:"0.82rem", outline:"none" }}/>
                    <span style={{ color:C.text3, fontSize:"0.78rem" }}>to</span>
                    <input type="time" value={d.close} onChange={e=>setTime(day,"close",e.target.value)} style={{ background:C.surface2, border:`1px solid ${C.border}`, color:C.text, borderRadius:8, padding:"6px 8px", fontSize:"0.82rem", outline:"none" }}/>
                  </div>:<span style={{ color:C.text3, fontSize:"0.78rem", fontStyle:"italic" }}>Closed</span>}
                </div>
              </div>
            );
          })}
          <div style={{ color:ON.t3, fontSize:"0.75rem", marginTop:8, display:"flex", gap:5, alignItems:"center" }}><Ico d={P.check} size={11} color="#86efac"/>Changes save automatically.</div>
        </>}

        {tab==="settings"&&<>
          <SectionHead icon="cog">Settings</SectionHead>
          <Card>
            <Lbl icon="alert">Busy Mode</Lbl>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, marginTop:8 }}>
              <div style={{ color:C.text2, fontSize:"0.82rem", flex:1 }}>When on, the request form shows a "we'll call you back" message. Customers can still submit.</div>
              <div onClick={()=>onBusyToggle(!busy)} style={{ width:46, height:26, borderRadius:13, cursor:"pointer", position:"relative", background:busy?C.red:C.surface3, transition:"background .2s", flexShrink:0 }}>
                <div style={{ position:"absolute", top:3, left:busy?23:3, width:20, height:20, borderRadius:"50%", background:"#fff", transition:"left .2s", boxShadow:"0 1px 3px rgba(0,0,0,0.2)" }}/>
              </div>
            </div>
          </Card>
          <Card>
            <Lbl icon="user">Business Name</Lbl>
            <div style={{ display:"flex", gap:8, marginTop:8 }}>
              <input value={newBiz} onChange={e=>setNewBiz(e.target.value)} style={{ ...fieldStyle, flex:1 }}/>
              <Btn small onClick={saveBiz} icon="check">Save</Btn>
            </div>
            {bizMsg&&<div style={{ color:bizMsg.startsWith("✓")?C.green:C.red, fontSize:"0.78rem", marginTop:6, fontWeight:600 }}>{bizMsg}</div>}
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

// ─── Root ─────────────────────────────────────────────────────
export default function App() {
  const isMobile = useIsMobile(640);
  const [lang,setLangState]=useState(getLang);
  const setLang = useCallback((l)=>{ setLangState(l); setLangLS(l); },[]);
  const t = useCallback((k)=>{ const d=T[lang]||T.en; return (k in d ? d[k] : (k in T.en ? T.en[k] : k)); },[lang]);

  const [view,setView]=useState("customer");
  const [bizName,setBizName]=useState("AMS");
  const [availability,setAvailability]=useState(DEFAULT_AVAIL);
  const [busy,setBusy]=useState(false);
  const [activeReq,setActiveReq]=useState(null);
  const [globalErr,setGlobalErr]=useState("");

  useEffect(()=>{
    injectResources();
    (async () => {
      try {
        const [settings, avail] = await Promise.all([ api("/api/settings"), api("/api/availability") ]);
        if (settings?.bizName) setBizName(settings.bizName);
        if (settings && typeof settings.busy === "boolean") setBusy(settings.busy);
        if (avail) setAvailability(avail);
      } catch {
        setGlobalErr("Couldn't reach the server. Make sure the backend is running.");
      }
    })();
  },[]);

  const handleSubmit = async (formData) => {
    const created = await api("/api/requests", { method:"POST", body:formData });
    setActiveReq(created);
    setView("confirm");
  };
  const handleLogin = async (password) => {
    const { token } = await api("/api/login", { method:"POST", body:{ password } });
    setToken(token);
    setView("dashboard");
  };
  const handleLogout = () => { setToken(""); setView("customer"); };
  const handleAvailability = async (next) => {
    setAvailability(next);
    try { await api("/api/availability", { method:"PUT", body:next, auth:true }); }
    catch (e) { if (e.status === 401) handleLogout(); }
  };
  const handleBizName = async (name) => {
    const res = await api("/api/settings/business-name", { method:"PUT", body:{ bizName:name }, auth:true });
    setBizName(res.bizName);
  };
  const handleBusyToggle = async (val) => {
    setBusy(val);
    try { const res = await api("/api/settings/busy", { method:"PUT", body:{ busy: val }, auth:true }); setBusy(res.busy); }
    catch (e) { if (e.status === 401) handleLogout(); else setBusy(!val); }
  };
  const handleChangePassword = async (current, nw) => {
    await api("/api/change-password", { method:"POST", body:{ current, new:nw }, auth:true });
  };

  return (
    <LangCtx.Provider value={{ lang, setLang, t }}>
      <MobileCtx.Provider value={isMobile}>
        <div style={{ minHeight:"100vh", fontFamily:"'Work Sans',system-ui,sans-serif", color:C.text, position:"relative", background:"#0e3f63" }}>
          <AuroraBackground/>
          <div style={{ position:"relative", zIndex:1, paddingBottom: isMobile ? "calc(56px + env(safe-area-inset-bottom))" : 80 }}>
            <Nav bizName={bizName} isMech={view==="dashboard"} onMechClick={()=>setView("login")}/>
            {globalErr && view==="customer" && (
              <div style={{ maxWidth:600, margin:"14px auto 0", padding:"0 16px" }}><ErrorBar msg={globalErr} onClose={()=>setGlobalErr("")}/></div>
            )}
            {view==="customer"&&<CustomerForm availability={availability} busy={busy} onSubmit={handleSubmit} onTrack={()=>setView("lookup")}/>}
            {view==="lookup"&&<Lookup onBack={()=>setView("customer")} onNew={()=>{setActiveReq(null);setView("customer");}}/>}
            {view==="confirm"&&activeReq&&<Confirmation initialReq={activeReq} onNew={()=>{setActiveReq(null);setView("customer");}}/>}
            {view==="login"&&<Login onLogin={handleLogin} onBack={()=>setView("customer")}/>}
            {view==="dashboard"&&<Dashboard availability={availability} onAvailability={handleAvailability} bizName={bizName} onBizName={handleBizName} onChangePassword={handleChangePassword} onLogout={handleLogout} busy={busy} onBusyToggle={handleBusyToggle}/>}
          </div>
        </div>
      </MobileCtx.Provider>
    </LangCtx.Provider>
  );
}