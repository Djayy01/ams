/*
  AMS — Mobile Mechanic & Towing  ::  Frontend (App.jsx)
  Talks to the Flask + PostgreSQL backend. Data syncs across all devices.

  This version adds: customer history, printable receipts, a 7-day week view,
  expense + tip tracking with profit analytics, and time-off / vacation mode —
  on top of everything before it.

  SETUP REMINDER
    • This is src/App.jsx in your Vite React project.
    • Point it at your backend via VITE_API_URL on Render.
    • Deploy: git add . && git commit -m "features" && git push
*/

import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";

// ─── API base (set VITE_API_URL on Render; falls back to localhost for local dev) ───
const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL) ||
  "http://localhost:5000";

const INSTAGRAM_URL = "https://www.instagram.com/1low_nelson/";

// ─── Local storage helpers ────────────────────────────────────
const getToken = () => { try { return localStorage.getItem("ams-token") || ""; } catch { return ""; } };
const setToken = (t) => { try { t ? localStorage.setItem("ams-token", t) : localStorage.removeItem("ams-token"); } catch {} };
const getLang  = () => { try { return localStorage.getItem("ams-lang") || "en"; } catch { return "en"; } };
const setLangLS = (l) => { try { localStorage.setItem("ams-lang", l); } catch {} };
const getSavedCustomer = () => { try { return JSON.parse(localStorage.getItem("ams-customer") || "{}") || {}; } catch { return {}; } };
const saveCustomer = (c) => { try { localStorage.setItem("ams-customer", JSON.stringify(c)); } catch {} };
const clearSavedCustomer = () => { try { localStorage.removeItem("ams-customer"); } catch {} };
const getAlerts = () => { try { return localStorage.getItem("ams-alerts") === "1"; } catch { return false; } };
const setAlertsLS = (on) => { try { on ? localStorage.setItem("ams-alerts","1") : localStorage.removeItem("ams-alerts"); } catch {} };

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

// ─── Language / translations ──────────────────────────────────
const STR = {
  en: {
    tagline:"Mobile Mechanic & Towing", login:"Login",
    trustedLocal:"Trusted Local Service", helpOnWay:"Help is on the way",
    heroDesc:"Fast, friendly towing and mobile mechanic with over 10 years of hands-on car experience. Request service in under a minute and track your help in real time.",
    fastResponse:"Fast Response", bilingual:"Bilingual", friendlyService:"Friendly Service",
    busyBanner:"We're extra busy right now — leave your details and we'll call you back as soon as we can.",
    awayBanner:"We're currently away and will respond as soon as we're back. You're welcome to leave your details.",
    afterHours:"We may be outside normal business hours right now — you can still submit and we'll reach out as soon as we can.",
    requestService:"Request Service", requestCallback:"Request a Callback",
    formSubtitle:"Tell us where you are and what you need",
    yourName:"Your Name", fullName:"Full name", phoneNumber:"Phone Number",
    yourLocation:"Your Location", addressPlaceholder:"Address or intersection",
    serviceType:"Service Type", towing:"Towing", mechanical:"Mechanical",
    vehicleInfo:"Vehicle Info", year:"Year", make:"Make", model:"Model",
    describeIssue:"Describe the Issue", issuePlaceholder:"What's going on with your vehicle?",
    appointment:"Appointment", apptNote:"Mobile mechanic visits are by appointment, based on availability — pick a date and time and we'll confirm.",
    preferredTime:"Preferred Date & Time", urgency:"Urgency", asap:"ASAP", scheduled:"Scheduled",
    scheduledTime:"Scheduled Date & Time", submitRequest:"Submit Request", submitting:"Submitting…",
    infoNote:"Your info is only used to dispatch help",
    fillRequired:"Please fill in all required fields.", pickTime:"Please select a scheduled time.",
    dateUnavailable:"We're off on that date — please choose another day.",
    submitError:"Couldn't submit — please check your connection and try again.",
    trackExisting:"Already requested help? Track it here",
    prefillNote:"We filled in your details from last time — update anything that changed.", clear:"Clear",
    requestSubmitted:"Request Submitted!", callbackReceived:"Request Received!",
    confirmThanks:"Thanks — we've got it. Track your help below (updates live).",
    stepSubmitted:"Submitted", stepAccepted:"Accepted", stepOnway:"On the Way", stepComplete:"Complete",
    jobDetails:"Job Details", name:"Name", phone:"Phone", service:"Service", vehicle:"Vehicle",
    location:"Location", issue:"Issue", submitAnother:"Submit Another Request",
    etaArrival:"Estimated arrival",
    cancelRequest:"Cancel this request", cancelConfirm:"Are you sure you want to cancel? This can't be undone.",
    cancelYes:"Yes, cancel it", cancelKeep:"Keep my request", cancelling:"Cancelling…",
    cancelError:"Couldn't cancel — please try again.",
    requestCancelledTitle:"Request Cancelled", requestCancelledBody:"This request has been cancelled. Need help again? You can submit a new request anytime.",
    trackTitle:"Track Your Request", trackSubtitle:"Enter the phone number you used when you requested help.",
    findRequest:"Find My Request", searching:"Searching…",
    noRequests:"No requests found for that number. Double-check it, or submit a new request.",
    enterValidPhone:"Please enter a valid phone number.",
    back:"← Back to home", searchAgain:"Search a different number",
    showingRecent:"Showing your most recent request.",
    mechLogin:"Mechanic Login", dashOnly:"Dashboard access only",
    password:"Password", enterPassword:"Enter password", enterDashboard:"Enter Dashboard", signingIn:"Signing in…",
  },
  es: {
    tagline:"Mecánico Móvil y Grúa", login:"Acceder",
    trustedLocal:"Servicio Local de Confianza", helpOnWay:"La ayuda está en camino",
    heroDesc:"Grúa y mecánico móvil rápido y amable con más de 10 años de experiencia práctica con autos. Solicita servicio en menos de un minuto y sigue tu ayuda en tiempo real.",
    fastResponse:"Respuesta Rápida", bilingual:"Bilingüe", friendlyService:"Servicio Amable",
    busyBanner:"Estamos muy ocupados ahora mismo — déjanos tus datos y te llamamos lo antes posible.",
    awayBanner:"Estamos ausentes en este momento y responderemos en cuanto regresemos. Puedes dejarnos tus datos.",
    afterHours:"Puede que estemos fuera del horario habitual ahora mismo — aún puedes enviar tu solicitud y te contactaremos lo antes posible.",
    requestService:"Solicitar Servicio", requestCallback:"Solicitar una Llamada",
    formSubtitle:"Dinos dónde estás y qué necesitas",
    yourName:"Tu Nombre", fullName:"Nombre completo", phoneNumber:"Número de Teléfono",
    yourLocation:"Tu Ubicación", addressPlaceholder:"Dirección o cruce de calles",
    serviceType:"Tipo de Servicio", towing:"Grúa", mechanical:"Mecánico",
    vehicleInfo:"Información del Vehículo", year:"Año", make:"Marca", model:"Modelo",
    describeIssue:"Describe el Problema", issuePlaceholder:"¿Qué le pasa a tu vehículo?",
    appointment:"Cita", apptNote:"Las visitas del mecánico móvil son con cita, según disponibilidad — elige fecha y hora y lo confirmamos.",
    preferredTime:"Fecha y Hora Preferida", urgency:"Urgencia", asap:"Lo Antes Posible", scheduled:"Programado",
    scheduledTime:"Fecha y Hora Programada", submitRequest:"Enviar Solicitud", submitting:"Enviando…",
    infoNote:"Tu información solo se usa para enviarte ayuda",
    fillRequired:"Por favor completa todos los campos requeridos.", pickTime:"Por favor selecciona una fecha y hora.",
    dateUnavailable:"No estamos disponibles esa fecha — por favor elige otro día.",
    submitError:"No se pudo enviar — revisa tu conexión e inténtalo de nuevo.",
    trackExisting:"¿Ya pediste ayuda? Sigue tu solicitud aquí",
    prefillNote:"Completamos tus datos de la última vez — actualiza lo que haya cambiado.", clear:"Borrar",
    requestSubmitted:"¡Solicitud Enviada!", callbackReceived:"¡Solicitud Recibida!",
    confirmThanks:"Gracias — la recibimos. Sigue tu ayuda abajo (se actualiza en vivo).",
    stepSubmitted:"Enviada", stepAccepted:"Aceptada", stepOnway:"En Camino", stepComplete:"Completa",
    jobDetails:"Detalles del Trabajo", name:"Nombre", phone:"Teléfono", service:"Servicio", vehicle:"Vehículo",
    location:"Ubicación", issue:"Problema", submitAnother:"Enviar Otra Solicitud",
    etaArrival:"Llegada estimada",
    cancelRequest:"Cancelar esta solicitud", cancelConfirm:"¿Seguro que quieres cancelar? Esto no se puede deshacer.",
    cancelYes:"Sí, cancelar", cancelKeep:"Mantener mi solicitud", cancelling:"Cancelando…",
    cancelError:"No se pudo cancelar — inténtalo de nuevo.",
    requestCancelledTitle:"Solicitud Cancelada", requestCancelledBody:"Esta solicitud ha sido cancelada. ¿Necesitas ayuda otra vez? Puedes enviar una nueva solicitud cuando quieras.",
    trackTitle:"Sigue Tu Solicitud", trackSubtitle:"Ingresa el número de teléfono que usaste al pedir ayuda.",
    findRequest:"Buscar Mi Solicitud", searching:"Buscando…",
    noRequests:"No se encontraron solicitudes con ese número. Verifícalo o envía una nueva solicitud.",
    enterValidPhone:"Por favor ingresa un número de teléfono válido.",
    back:"← Volver al inicio", searchAgain:"Buscar otro número",
    showingRecent:"Mostrando tu solicitud más reciente.",
    mechLogin:"Acceso del Mecánico", dashOnly:"Solo acceso al panel",
    password:"Contraseña", enterPassword:"Ingresa la contraseña", enterDashboard:"Entrar al Panel", signingIn:"Accediendo…",
  },
};
const LangCtx = createContext({ lang:"en", setLang:()=>{}, t:(k)=>k });
const useLang = () => useContext(LangCtx);

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
      body { display: block; min-width: 0; }
      #root { width: 100%; max-width: none; }
      input, textarea, button { font-family: 'Work Sans', system-ui, sans-serif; }
      input[type="time"], input[type="datetime-local"], input[type="date"] { color-scheme: light; }
      input:focus, textarea:focus { border-color: #2563eb !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.18) !important; }
      html { scrollbar-width: none; -ms-overflow-style: none; }
      ::-webkit-scrollbar { width: 0; height: 0; display: none; }
      .ams-scroll { overflow-y: auto; }

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
const STEPS = ["pending","accepted","onway","done"];

const C = {
  surface:"#ffffff", surface2:"#f4f8fd", surface3:"#e7eef8", border:"#dbe6f4",
  text:"#152840", text2:"#5f7691", text3:"#7a8ea9",
  blue:"#2563eb", blueL:"#3b82f6", sky:"#0ea5e9", amber:"#f59e0b", amberD:"#d97706",
  green:"#16a34a", red:"#ef4444",
};
const ON = { t:"#ffffff", t2:"rgba(255,255,255,0.86)", t3:"rgba(255,255,255,0.62)", icon:"#7dd3fc" };
const SM = { pending:{label:"Pending",c:C.amber}, accepted:{label:"Accepted",c:C.blue}, onway:{label:"On the Way",c:C.sky}, done:{label:"Complete",c:C.green}, dismissed:{label:"Dismissed",c:"#94a3b8"}, cancelled:{label:"Cancelled",c:"#94a3b8"} };

const card = () => ({
  background:"rgba(255,255,255,0.95)", backdropFilter:"blur(14px)", WebkitBackdropFilter:"blur(14px)",
  border:"1px solid rgba(255,255,255,0.55)", boxShadow:"0 22px 55px rgba(8,28,52,0.42), 0 8px 22px rgba(8,28,52,0.24)"
});
const heroPill = {
  display:"inline-flex", alignItems:"center", gap:7, padding:"5px 14px", borderRadius:30,
  background:"rgba(255,255,255,0.16)", border:"1px solid rgba(255,255,255,0.35)",
  backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)"
};

// ─── Helpers ──────────────────────────────────────────────────
const formatPrice = (p) => { const n = String(p||"").replace(/[^0-9.]/g,""); return n ? "$"+n : ""; };
const priceNum   = (p) => parseFloat(String(p||"").replace(/[^0-9.]/g,"")) || 0;
const money      = (n) => "$"+Number(n||0).toFixed(2).replace(/\.00$/,"");
const mapsDir    = (loc) => "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(loc || "");
const fmtTime    = (iso) => { try { return new Date(iso).toLocaleTimeString([], {hour:"numeric", minute:"2-digit"}); } catch { return ""; } };
const doneDate   = (r) => (r.statusTimes && r.statusTimes.done) ? new Date(r.statusTimes.done) : new Date(r.submittedAt);
const ymd        = (d) => { const x=new Date(d); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}-${String(x.getDate()).padStart(2,"0")}`; };
const net        = (r) => priceNum(r.price) + priceNum(r.tip) - priceNum(r.cost);
const escapeHtml = (s) => String(s==null?"":s).replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));

// Open a clean, printable receipt in a new window (browser print dialog → save as PDF).
const printReceipt = (req, bizName) => {
  const dateStr = new Date((req.statusTimes && req.statusTimes.done) || req.submittedAt).toLocaleString();
  const svc = priceNum(req.price), tip = priceNum(req.tip), total = svc + tip;
  const line = (label, val) => `<tr><td>${escapeHtml(label)}</td><td style="text-align:right">${money(val)}</td></tr>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Receipt #${req.id} — ${escapeHtml(bizName)}</title>
    <style>
      *{box-sizing:border-box} body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#152840;max-width:520px;margin:24px auto;padding:0 20px}
      .h{text-align:center;border-bottom:2px solid #2563eb;padding-bottom:14px;margin-bottom:18px}
      .h .b{font-size:1.6rem;font-weight:800;letter-spacing:.04em;color:#2563eb}
      .h .s{font-size:.8rem;color:#5f7691;text-transform:uppercase;letter-spacing:.1em;margin-top:2px}
      .tag{display:inline-block;margin-top:10px;font-size:.85rem;font-weight:700;letter-spacing:.18em;color:#5f7691}
      .row{display:flex;justify-content:space-between;font-size:.86rem;margin:4px 0;color:#5f7691}
      .row b{color:#152840;font-weight:600}
      table{width:100%;border-collapse:collapse;margin-top:16px;font-size:.92rem}
      td{padding:8px 0;border-bottom:1px solid #e7eef8}
      .total td{border-top:2px solid #152840;border-bottom:none;font-weight:800;font-size:1.05rem;padding-top:10px}
      .f{text-align:center;color:#5f7691;font-size:.82rem;margin-top:24px}
      @media print{body{margin:0}}
    </style></head><body>
    <div class="h"><div class="b">${escapeHtml(bizName||"AMS")}</div><div class="s">Mobile Mechanic &amp; Towing</div><div class="tag">RECEIPT</div></div>
    <div class="row"><span>Receipt #</span><b>${req.id}</b></div>
    <div class="row"><span>Date</span><b>${escapeHtml(dateStr)}</b></div>
    <div class="row"><span>Customer</span><b>${escapeHtml(req.name)}</b></div>
    <div class="row"><span>Phone</span><b>${escapeHtml(req.phone)}</b></div>
    <div class="row"><span>Vehicle</span><b>${escapeHtml(`${req.year} ${req.make} ${req.model}`)}</b></div>
    <div class="row"><span>Service</span><b>${escapeHtml(req.svc)}</b></div>
    ${req.issue ? `<div class="row"><span>Notes</span><b>${escapeHtml(req.issue)}</b></div>` : ""}
    <table>
      ${line(req.svc + " service", svc)}
      ${tip>0 ? line("Tip", tip) : ""}
      <tr class="total"><td>Total</td><td style="text-align:right">${money(total)}</td></tr>
    </table>
    <div class="f">Thank you for your business!</div>
    <script>window.onload=function(){setTimeout(function(){window.print();},300);};<\/script>
    </body></html>`;
  let w = null;
  try { w = window.open("", "_blank"); } catch { w = null; }
  if (w) { w.document.open(); w.document.write(html); w.document.close(); }
  else {
    const blob = new Blob([html], { type:"text/html" });
    window.open(URL.createObjectURL(blob), "_blank");
  }
};

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
  edit:"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  bell:"M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9 M13.73 21a2 2 0 0 1-3.46 0",
  download:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3",
  receipt:"M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z M8 7h8 M8 11h8 M8 15h5",
  close:"M18 6L6 18 M6 6l12 12",
};
const Ico = ({d,size=16,color="currentColor",style={}}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,...style}}>
    {d.split(" M").map((seg,i)=><path key={i} d={i===0?seg:"M"+seg}/>)}
  </svg>
);

const AuroraBackground = () => (
  <div className="ams-aurora" aria-hidden="true" style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none" }} />
);

// ─── Shared UI ────────────────────────────────────────────────
const Badge = ({ status }) => {
  const m = SM[status] || SM.pending;
  return <span style={{ background:m.c+"1f", color:m.c, border:`1px solid ${m.c}40`, borderRadius:5, padding:"2px 8px", fontSize:"0.65rem", fontWeight:800, letterSpacing:"0.07em", textTransform:"uppercase" }}>{m.label}</span>;
};

const Btn = ({ children, onClick, color=C.blue, outline, small, full, disabled, style={}, icon, href, target }) => {
  const s = { background:outline?"#fff":color, color:outline?color:"#fff", border:`1.5px solid ${outline?C.border:color}`, borderRadius:9, fontWeight:700, cursor:disabled?"not-allowed":"pointer", opacity:disabled?0.6:1, padding:small?"8px 14px":"12px 20px", fontSize:small?"0.75rem":"0.85rem", width:full?"100%":undefined, letterSpacing:"0.04em", textTransform:"uppercase", display:"inline-flex", alignItems:"center", gap:7, justifyContent:"center", transition:"all .15s", boxShadow:outline?"none":`0 4px 14px ${color}40`, textDecoration:"none", boxSizing:"border-box", ...style };
  const over = e=>{ if(!disabled){e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.opacity="0.94";} };
  const out  = e=>{ e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.opacity=disabled?"0.6":"1"; };
  if (href) return <a href={href} target={target} rel={target==="_blank"?"noopener noreferrer":undefined} style={s} onMouseOver={over} onMouseOut={out}>{icon&&<Ico d={P[icon]} size={14}/>}{children}</a>;
  return <button onClick={onClick} disabled={disabled} style={s} onMouseOver={over} onMouseOut={out}>{icon&&<Ico d={P[icon]} size={14}/>}{children}</button>;
};

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

const Toggle = ({ options, value, onChange, accent, labels }) => (
  <div style={{ display:"flex", gap:8, marginBottom:14 }}>
    {options.map(o=>(
      <button key={o} onClick={()=>onChange(o)} style={{ flex:1, padding:"11px", borderRadius:9, fontWeight:700, fontSize:"0.85rem", cursor:"pointer", textTransform:"uppercase", letterSpacing:"0.04em", transition:"all .15s", background:value===o?(accent||C.blue):C.surface2, color:value===o?"#fff":C.text2, border:`1.5px solid ${value===o?(accent||C.blue):C.border}`, boxShadow:value===o?`0 4px 12px ${(accent||C.blue)}33`:"none" }}>{labels?(labels[o]||o):o}</button>
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

const LangToggle = ({ m }) => {
  const { lang, setLang } = useLang();
  return (
    <div style={{ display:"flex", border:`1.5px solid ${C.border}`, borderRadius:9, overflow:"hidden", background:"#fff", flexShrink:0 }}>
      {["en","es"].map(l=>(
        <button key={l} onClick={()=>setLang(l)} aria-label={l==="en"?"English":"Español"} style={{ padding:m?"6px 9px":"7px 11px", border:"none", cursor:"pointer", background:lang===l?C.blue:"transparent", color:lang===l?"#fff":C.text2, fontWeight:800, fontSize:"0.7rem", letterSpacing:"0.04em", textTransform:"uppercase" }}>{l}</button>
      ))}
    </div>
  );
};

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
          {!m && <span style={{ color:C.text3, fontSize:"0.64rem", marginLeft:8, textTransform:"uppercase", letterSpacing:"0.1em", fontWeight:600 }}>{t("tagline")}</span>}
        </div>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:m?8:10 }}>
        {!isMech && <LangToggle m={m}/>}
        <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Instagram"
           style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:m?34:36, height:m?34:36, borderRadius:9, border:`1.5px solid ${C.border}`, background:"#fff", cursor:"pointer", transition:"transform .15s", flexShrink:0 }}
           onMouseOver={e=>{e.currentTarget.style.transform="translateY(-1px)";}}
           onMouseOut={e=>{e.currentTarget.style.transform="translateY(0)";}}>
          <Ico d={P.instagram} size={m?18:19} color="#E4405F"/>
        </a>
        {!isMech&&<Btn small outline onClick={onMechClick} icon="lock">{t("login")}</Btn>}
      </div>
    </div>
  );
};

const Hero = () => {
  const m = useMobile();
  const { t } = useLang();
  const chips = [["zap",t("fastResponse"),"#fbbf24"],["globe",t("bilingual"),"#67e8f9"],["heart",t("friendlyService"),"#fda4af"]];
  return (
    <div style={{ padding:m?"30px 16px 18px":"54px 20px 30px", textAlign:"center", position:"relative" }}>
      <div style={{ ...heroPill, marginBottom:16 }}>
        <Ico d={P.shield} size={14} color="#ffffff"/>
        <span style={{ color:"#ffffff", fontSize:"0.72rem", fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase" }}>{t("trustedLocal")}</span>
      </div>
      <div style={{ color:"#ffffff", fontWeight:900, fontSize:m?"1.95rem":"2.7rem", letterSpacing:"-0.01em", lineHeight:1.1, marginBottom:10, textShadow:"0 2px 22px rgba(0,0,0,0.28)" }}>{t("helpOnWay")}</div>
      <div style={{ color:"rgba(255,255,255,0.9)", fontSize:m?"0.92rem":"1.05rem", fontWeight:500, maxWidth:440, margin:"0 auto", lineHeight:1.5, textShadow:"0 1px 12px rgba(0,0,0,0.22)" }}>
        {t("heroDesc")}
      </div>
      <div style={{ display:"flex", justifyContent:"center", flexWrap:"wrap", gap:m?"8px 10px":14, alignItems:"center", marginTop:18 }}>
        {chips.map(([ic,lbl,col])=>(
          <div key={lbl} style={{ ...heroPill, color:"rgba(255,255,255,0.92)", fontSize:m?"0.74rem":"0.82rem", fontWeight:600 }}>
            <Ico d={P[ic]} size={14} color={col}/>{lbl}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Customer Form ────────────────────────────────────────────
const CustomerForm = ({ onSubmit, availability, busy, onTrack, blockedDates }) => {
  const m = useMobile();
  const { t } = useLang();
  const saved = useRef(getSavedCustomer()).current;
  const [f,setF] = useState({ name:saved.name||"", phone:saved.phone||"", loc:"", svc:"Towing", year:saved.year||"", make:saved.make||"", model:saved.model||"", issue:"", urg:"ASAP", schedTime:"", company:"" });
  const [prefilled,setPrefilled] = useState(!!(saved.name || saved.phone));
  const [warn,setWarn] = useState(false);
  const [err,setErr] = useState("");
  const [mapLoc,setMapLoc] = useState("");
  const [submitting,setSubmitting] = useState(false);
  const set = (k,v) => setF(p=>({...p,[k]:v}));
  const blocked = blockedDates || [];
  const todayBlocked = blocked.includes(ymd(new Date()));
  const schedBlocked = f.schedTime && blocked.includes(f.schedTime.slice(0,10));

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

  const clearPrefill = () => { setF(p=>({...p,name:"",phone:"",year:"",make:"",model:""})); clearSavedCustomer(); setPrefilled(false); };

  const submit = async () => {
    for(const k of ["name","phone","loc","year","make","model","issue"]) if(!f[k].trim()){setErr(t("fillRequired"));return;}
    if(f.urg==="Scheduled"&&!f.schedTime){setErr(t("pickTime"));return;}
    if(schedBlocked){ setErr(t("dateUnavailable")); return; }
    setErr(""); setSubmitting(true);
    try { await onSubmit({...f}); saveCustomer({ name:f.name, phone:f.phone, year:f.year, make:f.make, model:f.model }); }
    catch (e) { setErr(e.message || t("submitError")); }
    finally { setSubmitting(false); }
  };

  const headTitle = busy ? t("requestCallback") : t("requestService");
  const btnLabel  = submitting ? t("submitting") : (busy ? t("requestCallback") : t("submitRequest"));

  return (
    <div>
      <Hero/>
      <div style={{ padding:m?"0 12px 24px":"0 16px 24px", maxWidth:600, margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom:16 }}>
          <button onClick={onTrack} style={{ ...heroPill, color:"#fff", fontSize:"0.8rem", fontWeight:600, cursor:"pointer", padding:"8px 16px" }}>
            <Ico d={P.list} size={14} color="#fff"/>{t("trackExisting")}
          </button>
        </div>

        {todayBlocked ? (
          <div style={{ background:"rgba(255,251,235,0.96)", borderRadius:12, padding:"12px 14px", marginBottom:16, color:C.amberD, fontSize:"0.85rem", display:"flex", gap:8, alignItems:"flex-start", border:`1px solid ${C.amber}66`, boxShadow:"0 8px 24px rgba(8,28,52,0.18)", fontWeight:600 }}>
            <Ico d={P.cal} size={16} color={C.amber} style={{marginTop:1,flexShrink:0}}/>{t("awayBanner")}
          </div>
        ) : busy ? (
          <div style={{ background:"rgba(255,251,235,0.96)", borderRadius:12, padding:"12px 14px", marginBottom:16, color:C.amberD, fontSize:"0.85rem", display:"flex", gap:8, alignItems:"flex-start", border:`1px solid ${C.amber}66`, boxShadow:"0 8px 24px rgba(8,28,52,0.18)", fontWeight:600 }}>
            <Ico d={P.clock} size={16} color={C.amber} style={{marginTop:1,flexShrink:0}}/>{t("busyBanner")}
          </div>
        ) : warn && (
          <div style={{ background:"rgba(255,251,235,0.96)", borderRadius:12, padding:"11px 14px", marginBottom:16, color:C.amberD, fontSize:"0.82rem", display:"flex", gap:8, alignItems:"flex-start", border:`1px solid ${C.amber}55`, boxShadow:"0 8px 24px rgba(8,28,52,0.18)" }}>
            <Ico d={P.clock} size={15} color={C.amber} style={{marginTop:1,flexShrink:0}}/>{t("afterHours")}
          </div>
        )}

        <Card style={{ marginBottom:20 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:11, marginBottom:18 }}>
            <div style={{ background:`linear-gradient(135deg, ${C.blue}, ${C.sky})`, borderRadius:11, width:40, height:40, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:`0 4px 12px ${C.blue}33` }}><Ico d={P.zap} size={20} color="#fff"/></div>
            <div style={{ textAlign:"left" }}>
              <div style={{ color:C.text, fontWeight:800, fontSize:"1.15rem" }}>{headTitle}</div>
              <div style={{ color:C.text2, fontSize:"0.82rem" }}>{t("formSubtitle")}</div>
            </div>
          </div>

          {prefilled && (
            <div style={{ background:`${C.blue}0d`, border:`1px solid ${C.blue}20`, color:C.text2, borderRadius:9, padding:"9px 12px", marginBottom:14, fontSize:"0.78rem", display:"flex", gap:8, alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ display:"flex", gap:7, alignItems:"center" }}><Ico d={P.user} size={13} color={C.blue}/>{t("prefillNote")}</span>
              <span onClick={clearPrefill} style={{ color:C.blue, fontWeight:700, cursor:"pointer", textTransform:"uppercase", fontSize:"0.7rem", flexShrink:0 }}>{t("clear")}</span>
            </div>
          )}

          <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" value={f.company} onChange={e=>set("company",e.target.value)} style={{ position:"absolute", left:"-9999px", width:1, height:1, opacity:0 }}/>

          <Inp label={t("yourName")} icon="user" placeholder={t("fullName")} value={f.name} onChange={e=>set("name",e.target.value)}/>
          <Inp label={t("phoneNumber")} icon="phone" type="tel" placeholder="(555) 000-0000" value={f.phone} onChange={e=>set("phone",e.target.value)}/>
          <div style={{ marginBottom:14 }}>
            <Lbl icon="loc">{t("yourLocation")}</Lbl>
            <input placeholder={t("addressPlaceholder")} value={f.loc} onChange={e=>set("loc",e.target.value)} onBlur={e=>setMapLoc(e.target.value)} style={fieldStyle}/>
            <MapEmbed location={mapLoc}/>
          </div>
          <Lbl icon={f.svc==="Towing"?"tow":"wrench"}>{t("serviceType")}</Lbl>
          <Toggle options={["Towing","Mechanical"]} labels={{Towing:t("towing"),Mechanical:t("mechanical")}} value={f.svc} onChange={v=>{ set("svc",v); if(v==="Mechanical") set("urg","Scheduled"); }}/>
          <Lbl icon="car">{t("vehicleInfo")}</Lbl>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1.4fr 1.4fr", gap:m?6:8, marginBottom:14 }}>
            {[["year",t("year")],["make",t("make")],["model",t("model")]].map(([k,l])=>(
              <input key={k} placeholder={l} value={f[k]} onChange={e=>set(k,e.target.value)} style={{ ...fieldStyle, padding:m?"11px 8px":"11px 12px", fontSize:"0.85rem" }}/>
            ))}
          </div>
          <Tarea label={t("describeIssue")} icon="alert" placeholder={t("issuePlaceholder")} value={f.issue} onChange={e=>set("issue",e.target.value)}/>
          {f.svc==="Mechanical" ? (
            <>
              <Lbl icon="cal">{t("appointment")}</Lbl>
              <div style={{ background:`${C.blue}0d`, border:`1px solid ${C.blue}20`, color:C.text2, borderRadius:9, padding:"10px 12px", marginBottom:12, fontSize:"0.8rem", display:"flex", gap:8, alignItems:"flex-start" }}>
                <Ico d={P.clock} size={14} color={C.blue} style={{marginTop:1,flexShrink:0}}/>{t("apptNote")}
              </div>
              <Inp label={t("preferredTime")} icon="cal" type="datetime-local" value={f.schedTime} onChange={e=>set("schedTime",e.target.value)}/>
            </>
          ) : (
            <>
              <Lbl icon="clock">{t("urgency")}</Lbl>
              <Toggle options={["ASAP","Scheduled"]} labels={{ASAP:t("asap"),Scheduled:t("scheduled")}} value={f.urg} onChange={v=>set("urg",v)} accent={C.amber}/>
              {f.urg==="Scheduled"&&<Inp label={t("scheduledTime")} icon="cal" type="datetime-local" value={f.schedTime} onChange={e=>set("schedTime",e.target.value)}/>}
            </>
          )}
          {schedBlocked && <div style={{ color:C.red, fontSize:"0.78rem", marginBottom:12, marginTop:-4, display:"flex", gap:6, alignItems:"center", fontWeight:600 }}><Ico d={P.alert} size={12} color={C.red}/>{t("dateUnavailable")}</div>}
          <ErrorBar msg={err} onClose={()=>setErr("")}/>
          <Btn full onClick={submit} icon="zap" disabled={submitting}>{btnLabel}</Btn>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, marginTop:12, color:C.text3, fontSize:"0.74rem" }}>
            <Ico d={P.shield} size={12} color={C.text3}/>{t("infoNote")}
          </div>
        </Card>
      </div>
    </div>
  );
};

// ─── Shared tracking pieces ───────────────────────────────────
const StatusTracker = ({ req }) => {
  const m = useMobile();
  const { t } = useLang();
  const SLBLS = [t("stepSubmitted"),t("stepAccepted"),t("stepOnway"),t("stepComplete")];
  const st = req.statusTimes || {};
  const idx = (req.status==="dismissed"||req.status==="cancelled") ? 0 : STEPS.indexOf(req.status);
  return (
    <Card style={{ marginBottom:20 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", position:"relative", padding:"10px 0" }}>
        <div style={{ position:"absolute", top:28, left:"12%", right:"12%", height:3, background:C.surface3, borderRadius:3 }}/>
        <div style={{ position:"absolute", top:28, left:"12%", width:`${Math.max(0,idx/3*76)}%`, height:3, background:`linear-gradient(to right, ${C.blue}, ${C.sky})`, transition:"width .6s", borderRadius:3 }}/>
        {SLBLS.map((l,i)=>{
          const ts = st[STEPS[i]];
          return (
            <div key={l} style={{ display:"flex", flexDirection:"column", alignItems:"center", zIndex:2, flex:1 }}>
              <div style={{ width:34, height:34, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", background:i<=idx?C.blue:C.surface, border:`2px solid ${i<=idx?C.blue:C.surface3}`, color:i<=idx?"#fff":C.text3, marginBottom:8, boxShadow:i<=idx?`0 4px 12px ${C.blue}40`:"none", transition:"all .3s" }}>{i<idx?<Ico d={P.check} size={15} color="#fff"/>:<span style={{ fontWeight:800, fontSize:"0.78rem" }}>{i+1}</span>}</div>
              <div style={{ color:i<=idx?C.text:C.text3, fontSize:m?"0.58rem":"0.63rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.04em", textAlign:"center", lineHeight:1.2 }}>{l}</div>
              {ts && i<=idx && <div style={{ color:C.text3, fontSize:"0.55rem", marginTop:3, fontWeight:600 }}>{fmtTime(ts)}</div>}
            </div>
          );
        })}
      </div>
    </Card>
  );
};

const EtaBanner = ({ req }) => {
  const { t } = useLang();
  if (req.status!=="onway" || !req.eta) return null;
  return (
    <div style={{ ...card(), borderRadius:14, padding:"14px 16px", marginBottom:12, borderLeft:`4px solid ${C.sky}`, display:"flex", alignItems:"center", gap:11 }}>
      <div style={{ background:`${C.sky}18`, borderRadius:10, width:38, height:38, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Ico d={P.tow} size={18} color={C.sky}/></div>
      <div><div style={{ color:C.text3, fontSize:"0.65rem", textTransform:"uppercase", letterSpacing:"0.07em", fontWeight:700 }}>{t("etaArrival")}</div><div style={{ color:C.text, fontWeight:800, fontSize:"1.05rem" }}>{req.eta}</div></div>
    </div>
  );
};

const JobDetails = ({ req }) => {
  const { t } = useLang();
  const svcLabel = req.svc==="Towing" ? t("towing") : t("mechanical");
  const urgLabel = req.urg==="Scheduled" ? t("scheduled") : t("asap");
  return (
    <Card>
      <Lbl icon="car">{t("jobDetails")}</Lbl>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:10 }}>
        {[[t("name"),req.name,"user"],[t("phone"),req.phone,"phone"],[t("service"),svcLabel,req.svc==="Towing"?"tow":"wrench"],[t("urgency"),urgLabel,"clock"],[t("vehicle"),`${req.year} ${req.make} ${req.model}`,"car"],[t("location"),req.loc,"loc"]].map(([k,v,ic])=>(
          <div key={k}><div style={{ color:C.text3, fontSize:"0.65rem", textTransform:"uppercase", display:"flex", alignItems:"center", gap:4, marginBottom:2, fontWeight:600 }}><Ico d={P[ic]} size={10} color={C.text3}/>{k}</div><div style={{ color:k===t("vehicle")?C.blue:C.text, fontSize:"0.88rem", fontWeight:k===t("vehicle")?700:500, wordBreak:"break-word" }}>{v}</div></div>
        ))}
      </div>
      {req.issue&&<div style={{ marginTop:12, padding:"11px 13px", background:C.surface2, borderRadius:10 }}><div style={{ color:C.text3, fontSize:"0.65rem", textTransform:"uppercase", marginBottom:4, fontWeight:600 }}>{t("issue")}</div><div style={{ color:C.text2, fontSize:"0.86rem", fontStyle:"italic" }}>"{req.issue}"</div></div>}
      <MapEmbed location={req.loc}/>
    </Card>
  );
};

const CancelledNotice = () => {
  const { t } = useLang();
  return (
    <Card style={{ marginBottom:20, borderLeft:"4px solid #94a3b8" }}>
      <div style={{ textAlign:"center", padding:"6px 0" }}>
        <div style={{ color:C.text, fontWeight:800, fontSize:"1.05rem", marginBottom:6 }}>{t("requestCancelledTitle")}</div>
        <div style={{ color:C.text2, fontSize:"0.85rem", lineHeight:1.5 }}>{t("requestCancelledBody")}</div>
      </div>
    </Card>
  );
};

const CancelControls = ({ req, phone, onCancelled }) => {
  const { t } = useLang();
  const [confirming,setConfirming]=useState(false);
  const [busy,setBusy]=useState(false);
  const [err,setErr]=useState("");
  const doCancel = async () => {
    setBusy(true); setErr("");
    try { const updated = await api("/api/requests/"+req.id+"/cancel", { method:"POST", body:{ phone } }); onCancelled(updated); }
    catch (e) { setErr(e.message || t("cancelError")); }
    finally { setBusy(false); }
  };
  return (
    <div style={{ marginTop:8 }}>
      <ErrorBar msg={err} onClose={()=>setErr("")}/>
      {!confirming ? (
        <button onClick={()=>setConfirming(true)} style={{ width:"100%", background:"rgba(255,255,255,0.9)", border:`1.5px solid ${C.red}55`, color:C.red, borderRadius:9, padding:"11px", fontWeight:700, fontSize:"0.78rem", cursor:"pointer", textTransform:"uppercase", letterSpacing:"0.04em" }}>{t("cancelRequest")}</button>
      ) : (
        <div style={{ ...card(), borderRadius:12, padding:"14px", border:`1px solid ${C.red}40` }}>
          <div style={{ color:C.text, fontSize:"0.85rem", marginBottom:12, fontWeight:600 }}>{t("cancelConfirm")}</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <Btn small color={C.red} onClick={doCancel} disabled={busy}>{busy?t("cancelling"):t("cancelYes")}</Btn>
            <Btn small outline color={C.text2} onClick={()=>setConfirming(false)} disabled={busy}>{t("cancelKeep")}</Btn>
          </div>
        </div>
      )}
    </div>
  );
};

const TrackingBody = ({ req, phone, onUpdate }) => (
  <>
    {req.status==="cancelled" ? <CancelledNotice/> : <><EtaBanner req={req}/><StatusTracker req={req}/></>}
    <JobDetails req={req}/>
    {["pending","accepted","onway"].includes(req.status) && <CancelControls req={req} phone={phone} onCancelled={onUpdate}/>}
  </>
);

const Confirmation = ({ initialReq, onNew, callback }) => {
  const m = useMobile();
  const { t } = useLang();
  const [req,setReq] = useState(initialReq);
  useEffect(()=>{
    let alive = true;
    const tick = async () => { try { const fresh = await api("/api/requests/"+initialReq.id); if(alive) setReq(fresh); } catch {} };
    const iv = setInterval(tick, 4000);
    return () => { alive = false; clearInterval(iv); };
  },[initialReq.id]);
  return (
    <div style={{ padding:m?"22px 12px":"28px 16px", maxWidth:600, margin:"0 auto" }}>
      <div style={{ textAlign:"center", marginBottom:24 }}>
        <div style={{ width:66, height:66, background:`linear-gradient(135deg, ${C.blue}, ${C.sky})`, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px", boxShadow:"0 10px 30px rgba(0,0,0,0.3)" }}><Ico d={P.check} size={32} color="#fff"/></div>
        <div style={{ color:ON.t, fontWeight:900, fontSize:"1.4rem", textShadow:"0 2px 16px rgba(0,0,0,0.28)" }}>{callback?t("callbackReceived"):t("requestSubmitted")}</div>
        <div style={{ color:ON.t2, fontSize:"0.88rem", marginTop:6 }}>{t("confirmThanks")}</div>
      </div>
      <TrackingBody req={req} phone={req.phone} onUpdate={setReq}/>
      <Btn full outline onClick={onNew} icon="zap" style={{ marginTop:8 }}>{t("submitAnother")}</Btn>
    </div>
  );
};

const Lookup = ({ onBack }) => {
  const m = useMobile();
  const { t } = useLang();
  const [phone,setPhone] = useState("");
  const [results,setResults] = useState(null);
  const [err,setErr] = useState("");
  const [busy,setBusy] = useState(false);
  const [live,setLive] = useState(null);
  const latest = results && results.length ? results[0] : null;

  useEffect(()=>{
    if(!latest){ setLive(null); return; }
    setLive(latest);
    let alive = true;
    const tick = async () => { try { const fresh = await api("/api/requests/"+latest.id); if(alive) setLive(fresh); } catch {} };
    const iv = setInterval(tick, 5000);
    return () => { alive = false; clearInterval(iv); };
  },[latest && latest.id]);

  const search = async () => {
    if(phone.replace(/\D/g,"").length < 7){ setErr(t("enterValidPhone")); return; }
    setBusy(true); setErr("");
    try { const list = await api("/api/requests/lookup?phone="+encodeURIComponent(phone)); setResults(list); }
    catch (e) { setErr(e.message || t("cancelError")); }
    finally { setBusy(false); }
  };
  const shown = live || latest;

  if (shown) {
    return (
      <div style={{ padding:m?"22px 12px":"28px 16px", maxWidth:600, margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom:20 }}>
          <div style={{ color:ON.t, fontWeight:900, fontSize:"1.3rem", textShadow:"0 2px 16px rgba(0,0,0,0.28)" }}>{shown.name}</div>
          {results.length>1 && <div style={{ color:ON.t2, fontSize:"0.82rem", marginTop:6 }}>{t("showingRecent")}</div>}
        </div>
        <TrackingBody req={shown} phone={shown.phone} onUpdate={setLive}/>
        <Btn full outline onClick={()=>{ setResults(null); setLive(null); setPhone(""); }} icon="search" style={{ marginTop:8 }}>{t("searchAgain")}</Btn>
        <Btn full outline onClick={onBack} style={{ marginTop:8 }}>{t("back")}</Btn>
      </div>
    );
  }

  return (
    <div style={{ padding:m?"24px 12px":"32px 16px", maxWidth:460, margin:m?"10px auto":"28px auto" }}>
      <Card>
        <div style={{ textAlign:"center", marginBottom:20 }}>
          <div style={{ width:58, height:58, background:`linear-gradient(135deg, ${C.blue}, ${C.sky})`, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px", boxShadow:`0 6px 18px ${C.blue}40` }}><Ico d={P.search} size={24} color="#fff"/></div>
          <div style={{ color:C.text, fontWeight:800, fontSize:"1.15rem" }}>{t("trackTitle")}</div>
          <div style={{ color:C.text2, fontSize:"0.82rem", marginTop:6, lineHeight:1.4 }}>{t("trackSubtitle")}</div>
        </div>
        <Inp label={t("phoneNumber")} icon="phone" type="tel" placeholder="(555) 000-0000" value={phone} onChange={e=>{setPhone(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&search()}/>
        {results && results.length===0 && <div style={{ background:`${C.amber}14`, border:`1px solid ${C.amber}40`, color:C.amberD, borderRadius:10, padding:"10px 12px", marginBottom:14, fontSize:"0.82rem" }}>{t("noRequests")}</div>}
        <ErrorBar msg={err} onClose={()=>setErr("")}/>
        <Btn full onClick={search} icon="search" disabled={busy} style={{ marginBottom:10 }}>{busy?t("searching"):t("findRequest")}</Btn>
        <Btn full outline onClick={onBack}>{t("back")}</Btn>
      </Card>
    </div>
  );
};

const Login = ({ onLogin, onBack }) => {
  const m = useMobile();
  const { t } = useLang();
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
          <div style={{ color:C.text, fontWeight:800, fontSize:"1.15rem" }}>{t("mechLogin")}</div>
          <div style={{ color:C.text2, fontSize:"0.8rem", marginTop:4 }}>{t("dashOnly")}</div>
        </div>
        <Inp label={t("password")} icon="lock" type="password" placeholder={t("enterPassword")} value={pw} onChange={e=>{setPw(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&go()}/>
        <ErrorBar msg={err} onClose={()=>setErr("")}/>
        <Btn full onClick={go} icon="lock" disabled={busy} style={{ marginBottom:10 }}>{busy?t("signingIn"):t("enterDashboard")}</Btn>
        <Btn full outline onClick={onBack}>{t("back")}</Btn>
      </Card>
    </div>
  );
};

// ─── Customer history modal (mechanic) ────────────────────────
const HistoryModal = ({ phone, name, requests, onClose }) => {
  const m = useMobile();
  const digits = (phone||"").replace(/\D/g,"");
  const jobs = requests.filter(r=>r.phone.replace(/\D/g,"")===digits).sort((a,b)=>new Date(b.submittedAt)-new Date(a.submittedAt));
  const spent = jobs.filter(r=>r.status==="done").reduce((s,r)=>s+priceNum(r.price)+priceNum(r.tip),0);
  const doneCount = jobs.filter(r=>r.status==="done").length;
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(8,20,38,0.55)", backdropFilter:"blur(3px)", display:"flex", alignItems:m?"flex-end":"center", justifyContent:"center", padding:m?0:20 }}>
      <div onClick={e=>e.stopPropagation()} style={{ ...card(), borderRadius:m?"16px 16px 0 0":16, width:"100%", maxWidth:520, maxHeight:m?"85vh":"82vh", display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <div style={{ padding:"16px 18px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10 }}>
          <div style={{ minWidth:0 }}>
            <div style={{ color:C.text, fontWeight:800, fontSize:"1.05rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{name}</div>
            <div style={{ color:C.text2, fontSize:"0.78rem", marginTop:2 }}>{jobs.length} request{jobs.length===1?"":"s"} · {doneCount} completed · {money(spent)} total</div>
          </div>
          <button onClick={onClose} style={{ background:C.surface2, border:`1px solid ${C.border}`, borderRadius:8, padding:6, cursor:"pointer", flexShrink:0, display:"flex" }}><Ico d={P.close} size={16} color={C.text2}/></button>
        </div>
        <div className="ams-scroll" style={{ padding:"12px 18px 18px", overflowY:"auto" }}>
          {jobs.map(r=>{
            const meta = SM[r.status] || SM.pending;
            return (
              <div key={r.id} style={{ borderBottom:`1px solid ${C.surface3}`, padding:"11px 0", display:"flex", justifyContent:"space-between", gap:10, alignItems:"flex-start" }}>
                <div style={{ minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:3, flexWrap:"wrap" }}>
                    <Ico d={P[r.svc==="Towing"?"tow":"wrench"]} size={13} color={r.svc==="Towing"?C.blue:C.sky}/>
                    <span style={{ color:C.text, fontWeight:700, fontSize:"0.85rem" }}>{r.svc}</span>
                    <span style={{ color:C.text3, fontSize:"0.78rem" }}>· {r.year} {r.make} {r.model}</span>
                  </div>
                  <div style={{ color:C.text3, fontSize:"0.74rem" }}>{new Date(r.submittedAt).toLocaleDateString([], {year:"numeric",month:"short",day:"numeric"})}</div>
                  {r.issue && <div style={{ color:C.text2, fontSize:"0.78rem", fontStyle:"italic", marginTop:3, wordBreak:"break-word" }}>"{r.issue}"</div>}
                </div>
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <Badge status={r.status}/>
                  {formatPrice(r.price) && <div style={{ color:C.green, fontWeight:800, fontSize:"0.85rem", marginTop:6 }}>{formatPrice(r.price)}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─── Request Card (mechanic dashboard) ────────────────────────
const ReqCard = ({ req, onPatch, busyId, repeat, onHistory }) => {
  const [showMap,setShowMap]=useState(false);
  const [showAdmin,setShowAdmin]=useState(false);
  const [noteDraft,setNoteDraft]=useState(req.notes||"");
  const [priceDraft,setPriceDraft]=useState(req.price||"");
  const [tipDraft,setTipDraft]=useState(req.tip||"");
  const [costDraft,setCostDraft]=useState(req.cost||"");
  const [savingAdmin,setSavingAdmin]=useState(false);
  const [etaOpen,setEtaOpen]=useState(false);
  const [etaDraft,setEtaDraft]=useState(req.eta||"");
  const [etaBusy,setEtaBusy]=useState(false);
  const active=["pending","accepted","onway"].includes(req.status);
  const closed=["done","dismissed","cancelled"].includes(req.status);
  const svcCol = req.svc==="Towing" ? C.blue : C.sky;
  const busy = busyId === req.id;
  const priceText = formatPrice(req.price);
  const showReceipt = priceNum(req.price)>0 || req.status==="done";
  const profitPreview = priceNum(priceDraft)+priceNum(tipDraft)-priceNum(costDraft);

  const saveAdmin = async () => {
    setSavingAdmin(true);
    try { await onPatch(req.id, { notes:noteDraft, price:priceDraft.replace(/[^0-9.]/g,""), tip:tipDraft.replace(/[^0-9.]/g,""), cost:costDraft.replace(/[^0-9.]/g,"") }); setShowAdmin(false); }
    catch {} finally { setSavingAdmin(false); }
  };
  const startOnway = async () => { setEtaBusy(true); try { await onPatch(req.id, { status:"onway", eta:etaDraft }); setEtaOpen(false); } catch {} finally { setEtaBusy(false); } };
  const saveEta    = async () => { setEtaBusy(true); try { await onPatch(req.id, { eta:etaDraft }); setEtaOpen(false); } catch {} finally { setEtaBusy(false); } };

  const moneyInput = (label, val, setVal, hint) => (
    <div style={{ flex:1, minWidth:90 }}>
      <Lbl style={{ marginBottom:5 }}>{label}</Lbl>
      <div style={{ display:"flex", alignItems:"center", gap:5 }}>
        <span style={{ color:C.text2, fontWeight:800, fontSize:"0.95rem" }}>$</span>
        <input value={val} onChange={e=>setVal(e.target.value)} placeholder="0" inputMode="decimal" style={{ ...fieldStyle, padding:"9px 10px" }}/>
      </div>
    </div>
  );

  return (
    <Card accent={active}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10, gap:8 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:0 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:`${svcCol}14`, border:`1px solid ${svcCol}33`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Ico d={P[req.svc==="Towing"?"tow":"wrench"]} size={17} color={svcCol}/></div>
          <div style={{ minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, minWidth:0 }}>
              <div style={{ color:C.text, fontWeight:800, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{req.name}</div>
              {repeat>1 && <button onClick={()=>onHistory(req.phone, req.name)} style={{ background:`${C.amber}1f`, color:C.amberD, border:`1px solid ${C.amber}55`, borderRadius:5, padding:"1px 6px", fontSize:"0.6rem", fontWeight:800, whiteSpace:"nowrap", flexShrink:0, cursor:"pointer" }}>★ x{repeat}</button>}
            </div>
            <div style={{ color:svcCol, fontSize:"0.68rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em" }}>{req.svc}</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
          {priceText && <span style={{ background:`${C.green}1a`, color:C.green, border:`1px solid ${C.green}40`, borderRadius:6, padding:"2px 8px", fontSize:"0.78rem", fontWeight:800 }}>{priceText}</span>}
          <Badge status={req.status}/>
        </div>
      </div>
      <div style={{ background:`${C.blue}0d`, border:`1px solid ${C.blue}20`, borderRadius:9, padding:"7px 11px", marginBottom:10, display:"inline-flex", alignItems:"center", gap:7 }}><Ico d={P.car} size={13} color={C.blue}/><span style={{ color:C.blue, fontWeight:700, fontSize:"0.85rem" }}>{req.year} {req.make} {req.model}</span></div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
        <div style={{ minWidth:0 }}><Lbl icon="phone">Phone</Lbl><a href={"tel:"+req.phone} style={{ color:C.blue, fontSize:"0.85rem", fontWeight:600, textDecoration:"none", wordBreak:"break-word" }}>{req.phone}</a></div>
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
      {req.notes&&!showAdmin&&<div style={{ color:C.text2, fontSize:"0.8rem", marginBottom:10, padding:"9px 11px", background:`${C.amber}10`, border:`1px solid ${C.amber}33`, borderRadius:8, display:"flex", gap:7, alignItems:"flex-start" }}><Ico d={P.edit} size={12} color={C.amberD} style={{marginTop:2,flexShrink:0}}/><span style={{ wordBreak:"break-word" }}>{req.notes}</span></div>}
      <div style={{ color:C.text3, fontSize:"0.7rem", marginBottom:12, display:"flex", alignItems:"center", gap:5 }}><Ico d={P.clock} size={11} color={C.text3}/>Submitted {new Date(req.submittedAt).toLocaleString()}</div>

      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom: showAdmin?12:8 }}>
        <Btn small outline href={mapsDir(req.loc)} target="_blank" icon="nav">Directions</Btn>
        <Btn small outline color={C.text2} onClick={()=>setShowAdmin(v=>!v)} icon="edit">Notes / Money</Btn>
        {showReceipt && <Btn small outline color={C.blue} onClick={()=>printReceipt(req, "AMS")} icon="receipt">Receipt</Btn>}
      </div>

      {showAdmin && (
        <div style={{ background:C.surface2, border:`1px solid ${C.border}`, borderRadius:10, padding:"12px", marginBottom:12 }}>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:10 }}>
            {moneyInput("Price", priceDraft, setPriceDraft)}
            {moneyInput("Tip", tipDraft, setTipDraft)}
            {moneyInput("Cost", costDraft, setCostDraft)}
          </div>
          <div style={{ fontSize:"0.78rem", color:C.text2, marginBottom:10, fontWeight:600 }}>Profit: <span style={{ color: profitPreview<0?C.red:C.green, fontWeight:800 }}>{profitPreview<0?"-":""}{money(Math.abs(profitPreview))}</span> <span style={{ color:C.text3, fontWeight:500 }}>(price + tip − cost)</span></div>
          <Lbl>Private Notes</Lbl>
          <textarea value={noteDraft} onChange={e=>setNoteDraft(e.target.value)} placeholder="Parts needed, gate code, follow-up…" style={{ ...fieldStyle, resize:"vertical", minHeight:60, marginBottom:8 }}/>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, flexWrap:"wrap" }}>
            <span style={{ color:C.text3, fontSize:"0.7rem", display:"flex", alignItems:"center", gap:5 }}><Ico d={P.lock} size={11} color={C.text3}/>Mechanic only — customers never see this</span>
            <Btn small onClick={saveAdmin} icon="check" disabled={savingAdmin}>{savingAdmin?"Saving…":"Save"}</Btn>
          </div>
        </div>
      )}

      {req.status==="pending"&&<div style={{ display:"flex", gap:8, flexWrap:"wrap" }}><Btn small onClick={()=>onPatch(req.id,{status:"accepted"})} icon="check" disabled={busy}>Accept</Btn><Btn small outline color={C.text2} onClick={()=>onPatch(req.id,{status:"dismissed"})} disabled={busy}>Dismiss</Btn></div>}

      {req.status==="accepted"&&(
        etaOpen ? (
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
            <input value={etaDraft} onChange={e=>setEtaDraft(e.target.value)} placeholder="ETA e.g. ~15 min" style={{ ...fieldStyle, flex:1, minWidth:130, padding:"9px 11px" }}/>
            <Btn small color={C.sky} onClick={startOnway} icon="tow" disabled={etaBusy}>{etaBusy?"…":"On the Way"}</Btn>
            <Btn small outline color={C.text2} onClick={()=>setEtaOpen(false)} disabled={etaBusy}>Cancel</Btn>
          </div>
        ) : (
          <Btn small color={C.sky} onClick={()=>{setEtaDraft(req.eta||"");setEtaOpen(true);}} icon="tow" disabled={busy}>On the Way</Btn>
        )
      )}

      {req.status==="onway"&&(
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <span style={{ fontSize:"0.8rem", color:C.text2 }}><b style={{ color:C.text }}>ETA:</b> {req.eta || "not set"}</span>
            {!etaOpen && <button onClick={()=>{setEtaDraft(req.eta||"");setEtaOpen(true);}} style={{ background:"transparent", border:"none", color:C.blue, fontWeight:700, fontSize:"0.72rem", cursor:"pointer", textTransform:"uppercase" }}>Edit ETA</button>}
          </div>
          {etaOpen && (
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <input value={etaDraft} onChange={e=>setEtaDraft(e.target.value)} placeholder="e.g. ~15 min" style={{ ...fieldStyle, flex:1, minWidth:130, padding:"9px 11px" }}/>
              <Btn small onClick={saveEta} icon="check" disabled={etaBusy}>{etaBusy?"…":"Save"}</Btn>
              <Btn small outline color={C.text2} onClick={()=>setEtaOpen(false)} disabled={etaBusy}>Cancel</Btn>
            </div>
          )}
          <div><Btn small color={C.green} onClick={()=>onPatch(req.id,{status:"done"})} icon="check" disabled={busy}>Mark Done</Btn></div>
        </div>
      )}

      {closed&&<Btn small outline color={C.blue} onClick={()=>onPatch(req.id,{status:"accepted"})} icon="refresh" disabled={busy}>Reopen Job</Btn>}
    </Card>
  );
};

// ─── Dashboard ────────────────────────────────────────────────
const Dashboard = ({ availability, onAvailability, bizName, onBizName, onChangePassword, onLogout, busy, onBusy, blockedDates, onBlockedDates }) => {
  const m = useMobile();
  const [tab,setTab]=useState("queue");
  const [requests,setRequests]=useState([]);
  const [loading,setLoading]=useState(true);
  const [err,setErr]=useState("");
  const [busyId,setBusyId]=useState(null);
  const [query,setQuery]=useState("");
  const [alertsOn,setAlertsOn]=useState(getAlerts);
  const [schedView,setSchedView]=useState("today");
  const [history,setHistory]=useState(null);
  const [dateDraft,setDateDraft]=useState("");

  const [newBiz,setNewBiz]=useState(bizName);
  const [curPw,setCurPw]=useState(""); const [newPw,setNewPw]=useState(""); const [confPw,setConfPw]=useState("");
  const [pwMsg,setPwMsg]=useState(""); const [bizMsg,setBizMsg]=useState("");

  const audioRef=useRef(null);
  const alertsRef=useRef(alertsOn);
  const firstLoad=useRef(true);
  const lastMaxId=useRef(0);
  useEffect(()=>{ alertsRef.current=alertsOn; },[alertsOn]);

  const beep=()=>{ const ctx=audioRef.current; if(!ctx) return; try {
    const mk=(freq,start,dur)=>{ const o=ctx.createOscillator(), g=ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.type="sine"; o.frequency.value=freq; const t0=ctx.currentTime+start; g.gain.setValueAtTime(0.0001,t0); g.gain.exponentialRampToValueAtTime(0.3,t0+0.02); g.gain.exponentialRampToValueAtTime(0.0001,t0+dur); o.start(t0); o.stop(t0+dur+0.02); };
    mk(880,0,0.25); mk(1175,0.18,0.3);
  } catch {} };
  const enableAlerts=()=>{
    try { const AC=window.AudioContext||window.webkitAudioContext; if(AC){ if(!audioRef.current) audioRef.current=new AC(); if(audioRef.current.state==="suspended") audioRef.current.resume(); } } catch {}
    if(typeof Notification!=="undefined" && Notification.permission==="default"){ try { Notification.requestPermission(); } catch {} }
    setAlertsOn(true); setAlertsLS(true); beep();
  };
  const disableAlerts=()=>{ setAlertsOn(false); setAlertsLS(false); };
  const notifyNew=(r)=>{ beep(); try { if(typeof Notification!=="undefined" && Notification.permission==="granted"){ new Notification("New service request — "+(bizName||"AMS"), { body:`${r.name} · ${r.svc} · ${r.loc}`, tag:"ams-"+r.id }); } } catch {} };

  const authApi = useCallback(async (path, opts={}) => {
    try { return await api(path, { ...opts, auth:true }); }
    catch (e) { if (e.status === 401) onLogout(); throw e; }
  }, [onLogout]);

  const loadRequests = useCallback(async () => {
    try { const list = await authApi("/api/requests"); setRequests(list); setErr(""); }
    catch (e) { if (e.status !== 401) setErr(e.message); }
    finally { setLoading(false); }
  }, [authApi]);

  useEffect(()=>{ loadRequests(); const iv = setInterval(loadRequests, 8000); return () => clearInterval(iv); },[loadRequests]);

  useEffect(()=>{
    if(loading) return;
    const ids=requests.map(r=>r.id);
    const maxId=ids.length?Math.max(...ids):0;
    if(firstLoad.current){ firstLoad.current=false; lastMaxId.current=maxId; return; }
    if(alertsRef.current){
      const fresh=requests.filter(r=>r.id>lastMaxId.current && r.status==="pending");
      if(fresh.length) notifyNew(fresh[0]);
    }
    if(maxId>lastMaxId.current) lastMaxId.current=maxId;
  },[requests, loading]); // eslint-disable-line

  const patchRequest = async (id, body) => {
    setBusyId(id);
    try { const updated = await authApi("/api/requests/"+id, { method:"PATCH", body });
      setRequests(rs => rs.map(r => r.id===id ? updated : r)); setErr(""); return updated; }
    catch (e) { if (e.status !== 401) setErr(e.message); throw e; }
    finally { setBusyId(null); }
  };

  const todayStr=new Date().toDateString();
  const pending=requests.filter(r=>r.status==="pending").length;
  const active=requests.filter(r=>["accepted","onway"].includes(r.status)).length;
  const doneToday=requests.filter(r=>r.status==="done"&&doneDate(r).toDateString()===todayStr).length;
  const allDone=requests.filter(r=>r.status==="done").length;

  const weekStart=new Date(); weekStart.setHours(0,0,0,0); weekStart.setDate(weekStart.getDate()-6);
  const monthStart=new Date(); monthStart.setHours(0,0,0,0); monthStart.setDate(1);
  const done=requests.filter(r=>r.status==="done");
  const earnToday=done.filter(r=>doneDate(r).toDateString()===todayStr).reduce((s,r)=>s+net(r),0);
  const earnWeek=done.filter(r=>doneDate(r)>=weekStart).reduce((s,r)=>s+net(r),0);
  const monthJobs=done.filter(r=>doneDate(r)>=monthStart);
  const grossMonth=monthJobs.reduce((s,r)=>s+priceNum(r.price),0);
  const tipsMonth=monthJobs.reduce((s,r)=>s+priceNum(r.tip),0);
  const costsMonth=monthJobs.reduce((s,r)=>s+priceNum(r.cost),0);
  const netMonth=grossMonth+tipsMonth-costsMonth;
  const towMonth=monthJobs.filter(r=>r.svc==="Towing").reduce((s,r)=>s+priceNum(r.price),0);
  const mechMonth=monthJobs.filter(r=>r.svc==="Mechanical").reduce((s,r)=>s+priceNum(r.price),0);

  const phoneCounts={};
  requests.forEach(r=>{ const k=r.phone.replace(/\D/g,""); if(k) phoneCounts[k]=(phoneCounts[k]||0)+1; });

  const qd=query.replace(/\D/g,"");
  const visible=requests.filter(r=>{
    if(!query.trim()) return true;
    const q=query.toLowerCase();
    return r.name.toLowerCase().includes(q)
      || (qd.length>=3 && r.phone.replace(/\D/g,"").includes(qd))
      || `${r.year} ${r.make} ${r.model}`.toLowerCase().includes(q);
  });

  const todayJobs=requests.filter(r=>["accepted","onway","done"].includes(r.status)&&new Date(r.submittedAt).toDateString()===todayStr)
    .sort((a,b)=>(a.urg==="Scheduled"?new Date(a.schedTime):new Date(a.submittedAt))-(b.urg==="Scheduled"?new Date(b.schedTime):new Date(b.submittedAt)));

  // Week view
  const today0=new Date(); today0.setHours(0,0,0,0);
  const weekDays=Array.from({length:7},(_,i)=>{ const d=new Date(today0); d.setDate(d.getDate()+i); return d; });
  const effDate=(r)=> r.urg==="Scheduled"&&r.schedTime ? new Date(r.schedTime) : new Date(r.submittedAt);
  const sameYmd=(a,b)=>ymd(a)===ymd(b);
  const jobsForDay=(day)=>requests.filter(r=>!["dismissed","cancelled"].includes(r.status) && sameYmd(effDate(r),day))
    .sort((a,b)=>effDate(a)-effDate(b));

  const exportCSV = () => {
    const cols=["id","submitted","status","name","phone","service","urgency","vehicle","location","issue","price","tip","cost","eta","accepted_at","onway_at","done_at","notes"];
    const esc=(v)=>{ const s=String(v==null?"":v); return /[",\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s; };
    const rows=requests.map(r=>{ const st=r.statusTimes||{}; return [r.id,r.submittedAt,r.status,r.name,r.phone,r.svc,r.urg,`${r.year} ${r.make} ${r.model}`,r.loc,r.issue,r.price,r.tip,r.cost,r.eta,st.accepted||"",st.onway||"",st.done||"",r.notes].map(esc).join(","); });
    const csv=[cols.join(","),...rows].join("\n");
    const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download=`ams-jobs-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

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
  const addBlocked = () => { if(dateDraft && !(blockedDates||[]).includes(dateDraft)){ onBlockedDates([...(blockedDates||[]), dateDraft]); } setDateDraft(""); };
  const removeBlocked = (d) => onBlockedDates((blockedDates||[]).filter(x=>x!==d));

  const TABS=[{id:"queue",label:"Queue",icon:"list"},{id:"schedule",label:"Schedule",icon:"cal"},{id:"avail",label:"Hours",icon:"clock"},{id:"settings",label:"Settings",icon:"cog"}];
  const STATS=[[pending,"Pending",C.amber,"alert"],[active,"Active",C.blue,"zap"],[doneToday,"Done Today",C.green,"check"],[allDone,"All-Time",C.sky,"list"]];
  const av = availability || DEFAULT_AVAIL;
  const sortedBlocked=[...(blockedDates||[])].sort();

  return (
    <div style={{ maxWidth:700, margin:"0 auto" }}>
      {history && <HistoryModal phone={history.phone} name={history.name} requests={requests} onClose={()=>setHistory(null)}/>}
      <div style={{ display:"flex", gap:m?4:6, padding:m?"12px 10px":"14px", borderBottom:"1px solid rgba(255,255,255,0.18)" }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:1, minWidth:0, padding:m?"9px 2px":"9px 4px", borderRadius:10, border:`1px solid ${tab===t.id?C.blue:"rgba(255,255,255,0.4)"}`, cursor:"pointer", background:tab===t.id?C.blue:"rgba(255,255,255,0.92)", color:tab===t.id?"#fff":C.text2, fontWeight:700, fontSize:m?"0.58rem":"0.7rem", letterSpacing:"0.03em", textTransform:"uppercase", display:"flex", alignItems:"center", justifyContent:"center", gap:m?3:6, transition:"all .15s", boxShadow:tab===t.id?`0 4px 12px ${C.blue}40`:"0 2px 10px rgba(8,28,52,0.12)" }}>
            <Ico d={P[t.icon]} size={13} color={tab===t.id?"#fff":C.text2}/>{t.label}
          </button>
        ))}
      </div>

      <div style={{ padding:m?"16px 12px":18 }}>
        <ErrorBar msg={err} onClose={()=>setErr("")}/>

        {busy && (
          <div style={{ background:`${C.amber}1f`, border:`1px solid ${C.amber}66`, color:"#fff", borderRadius:10, padding:"9px 13px", marginBottom:12, fontSize:"0.8rem", fontWeight:600, display:"flex", gap:7, alignItems:"center" }}>
            <Ico d={P.alert} size={14} color="#fbbf24"/>Busy mode is ON — customers see the "we'll call you back" notice.
          </div>
        )}

        {tab==="queue"&&<>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
            {[["Earned Today",earnToday,C.green],["This Week",earnWeek,C.sky]].map(([l,v,c])=>(
              <div key={l} style={{ ...card(), borderRadius:14, padding:"15px 16px", borderTop:`4px solid ${c}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ color:c, fontWeight:900, fontSize:"1.6rem" }}>{money(v)}</div>
                  <div style={{ background:`${c}18`, borderRadius:10, width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", color:c, fontWeight:900, fontSize:"1.1rem" }}>$</div>
                </div>
                <div style={{ color:C.text2, fontSize:"0.68rem", textTransform:"uppercase", letterSpacing:"0.07em", marginTop:4, fontWeight:600 }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{ ...card(), borderRadius:14, padding:"15px 16px", marginBottom:10, borderTop:`4px solid ${C.blue}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
              <div style={{ color:C.text2, fontSize:"0.68rem", textTransform:"uppercase", letterSpacing:"0.07em", fontWeight:700 }}>This Month · take-home</div>
              <div style={{ color:C.blue, fontWeight:900, fontSize:"1.5rem" }}>{money(netMonth)}</div>
            </div>
            <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginTop:8, color:C.text2, fontSize:"0.75rem", fontWeight:600 }}>
              <span>Service {money(grossMonth)}</span>
              <span style={{ color:C.green }}>Tips {money(tipsMonth)}</span>
              <span style={{ color:C.red }}>Costs −{money(costsMonth)}</span>
            </div>
            <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginTop:6, color:C.text3, fontSize:"0.72rem", fontWeight:600, borderTop:`1px solid ${C.surface3}`, paddingTop:8 }}>
              <span><Ico d={P.tow} size={11} color={C.blue} style={{verticalAlign:"-1px",marginRight:4}}/>Towing {money(towMonth)}</span>
              <span><Ico d={P.wrench} size={11} color={C.sky} style={{verticalAlign:"-1px",marginRight:4}}/>Mechanical {money(mechMonth)}</span>
              <span>{monthJobs.length} job{monthJobs.length===1?"":"s"}</span>
            </div>
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
          <div style={{ marginBottom:10, position:"relative" }}>
            <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", display:"flex" }}><Ico d={P.search} size={15} color={C.text3}/></span>
            <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search by name, phone, or vehicle" style={{ ...fieldStyle, paddingLeft:34 }}/>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8, gap:8 }}>
            <button onClick={alertsOn?disableAlerts:enableAlerts} style={{ background:alertsOn?`${C.green}1f`:"rgba(255,255,255,0.92)", border:`1px solid ${alertsOn?C.green:"rgba(255,255,255,0.5)"}`, color:alertsOn?C.green:C.text2, borderRadius:9, padding:"7px 11px", fontSize:"0.72rem", fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
              <Ico d={P.bell} size={13} color={alertsOn?C.green:C.text2}/>{alertsOn?"Alerts on":"Enable alerts"}
            </button>
            <button onClick={loadRequests} style={{ background:"transparent", border:"none", color:ON.t2, fontSize:"0.74rem", fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}><Ico d={P.refresh} size={13} color={ON.t2}/>Refresh</button>
          </div>
          {loading
            ? <div style={{ color:ON.t2, textAlign:"center", padding:"48px 0", fontSize:"0.9rem" }}>Loading requests…</div>
            : requests.length===0
              ? <div style={{ color:ON.t3, textAlign:"center", padding:"56px 0", fontSize:"0.9rem" }}><Ico d={P.list} size={34} color="rgba(255,255,255,0.35)" style={{ display:"block", margin:"0 auto 12px" }}/>No requests yet.</div>
              : visible.length===0
                ? <div style={{ color:ON.t3, textAlign:"center", padding:"48px 0", fontSize:"0.9rem" }}>No jobs match "{query}".</div>
                : visible.map(r=><ReqCard key={r.id} req={r} onPatch={patchRequest} busyId={busyId} repeat={phoneCounts[r.phone.replace(/\D/g,"")]||1} onHistory={(p,n)=>setHistory({phone:p,name:n})}/>)
          }
        </>}

        {tab==="schedule"&&<>
          <div style={{ display:"flex", gap:8, marginBottom:14, maxWidth:280 }}>
            {[["today","Today"],["week","This Week"]].map(([id,l])=>(
              <button key={id} onClick={()=>setSchedView(id)} style={{ flex:1, padding:"9px", borderRadius:9, fontWeight:700, fontSize:"0.72rem", cursor:"pointer", textTransform:"uppercase", letterSpacing:"0.04em", background:schedView===id?C.blue:"rgba(255,255,255,0.92)", color:schedView===id?"#fff":C.text2, border:`1px solid ${schedView===id?C.blue:"rgba(255,255,255,0.5)"}` }}>{l}</button>
            ))}
          </div>

          {schedView==="today" ? (
            todayJobs.length===0
              ?<div style={{ color:ON.t3, textAlign:"center", padding:"56px 0" }}><Ico d={P.cal} size={34} color="rgba(255,255,255,0.35)" style={{ display:"block", margin:"0 auto 12px" }}/>No jobs scheduled for today.</div>
              :todayJobs.map(r=>(
                <Card key={r.id} accent>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}><Ico d={P.clock} size={13} color={C.amber}/><span style={{ color:C.amberD, fontWeight:700, fontSize:"0.85rem" }}>{r.urg==="Scheduled"&&r.schedTime?new Date(r.schedTime).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):"ASAP"}</span></div>
                    <Badge status={r.status}/>
                  </div>
                  <div style={{ fontWeight:800, color:C.text, marginBottom:4 }}>{r.name} <span style={{ color:r.svc==="Towing"?C.blue:C.sky, fontWeight:600, fontSize:"0.85rem" }}>— {r.svc}</span></div>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}><Ico d={P.car} size={12} color={C.blue}/><span style={{ color:C.blue, fontSize:"0.82rem", fontWeight:700 }}>{r.year} {r.make} {r.model}</span></div>
                  <div style={{ display:"flex", alignItems:"center", gap:6, justifyContent:"space-between", flexWrap:"wrap" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6, minWidth:0 }}><Ico d={P.loc} size={12} color={C.text3}/><span style={{ color:C.text2, fontSize:"0.82rem", wordBreak:"break-word" }}>{r.loc}</span></div>
                    <Btn small outline href={mapsDir(r.loc)} target="_blank" icon="nav">Directions</Btn>
                  </div>
                  {r.issue&&<div style={{ color:C.text3, fontSize:"0.78rem", fontStyle:"italic", marginTop:6 }}>"{r.issue}"</div>}
                </Card>
              ))
          ) : (
            weekDays.map((day,i)=>{
              const dj=jobsForDay(day);
              const label=i===0?"Today":i===1?"Tomorrow":day.toLocaleDateString([], {weekday:"long"});
              return (
                <Card key={i} style={{ borderLeft:`4px solid ${dj.length?C.blue:C.surface3}` }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom: dj.length?8:0 }}>
                    <div style={{ color:C.text, fontWeight:800, fontSize:"0.9rem" }}>{label}</div>
                    <div style={{ color:C.text3, fontSize:"0.74rem", fontWeight:600 }}>{day.toLocaleDateString([], {month:"short",day:"numeric"})}</div>
                  </div>
                  {dj.length===0
                    ? <div style={{ color:C.text3, fontSize:"0.78rem", fontStyle:"italic" }}>No jobs</div>
                    : dj.map((r,idx)=>(
                        <div key={r.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 0", borderTop: idx? `1px solid ${C.surface3}`:undefined }}>
                          <span style={{ color:C.amberD, fontWeight:700, fontSize:"0.78rem", minWidth:62, flexShrink:0 }}>{r.urg==="Scheduled"&&r.schedTime?new Date(r.schedTime).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"}):"ASAP"}</span>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ color:C.text, fontWeight:700, fontSize:"0.82rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.name} <span style={{ color:r.svc==="Towing"?C.blue:C.sky, fontWeight:600 }}>· {r.svc}</span></div>
                            <div style={{ color:C.text3, fontSize:"0.74rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.year} {r.make} {r.model}</div>
                          </div>
                          <Badge status={r.status}/>
                        </div>
                      ))
                  }
                </Card>
              );
            })
          )}
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
          <div style={{ color:ON.t3, fontSize:"0.75rem", margin:"8px 0 18px", display:"flex", gap:5, alignItems:"center" }}><Ico d={P.check} size={11} color="#86efac"/>Changes save automatically.</div>

          <SectionHead icon="cal">Time Off</SectionHead>
          <Card>
            <Lbl icon="cal">Block a day off</Lbl>
            <div style={{ display:"flex", gap:8, marginTop:8, marginBottom: sortedBlocked.length?14:0 }}>
              <input type="date" min={ymd(new Date())} value={dateDraft} onChange={e=>setDateDraft(e.target.value)} style={{ ...fieldStyle, flex:1 }}/>
              <Btn small onClick={addBlocked} icon="check" disabled={!dateDraft}>Add</Btn>
            </div>
            {sortedBlocked.length===0
              ? <div style={{ color:C.text3, fontSize:"0.78rem", marginTop:10, fontStyle:"italic" }}>No days off scheduled.</div>
              : sortedBlocked.map(d=>(
                  <div key={d} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0", borderTop:`1px solid ${C.surface3}` }}>
                    <span style={{ color:C.text, fontSize:"0.85rem", fontWeight:600 }}>{new Date(d+"T00:00").toLocaleDateString([], {weekday:"short", year:"numeric", month:"short", day:"numeric"})}</span>
                    <button onClick={()=>removeBlocked(d)} style={{ background:"transparent", border:"none", cursor:"pointer", color:C.red, padding:4, display:"flex" }}><Ico d={P.close} size={15} color={C.red}/></button>
                  </div>
                ))
            }
            <div style={{ color:C.text3, fontSize:"0.72rem", marginTop:12, display:"flex", gap:5, alignItems:"flex-start" }}><Ico d={P.alert} size={11} color={C.text3} style={{marginTop:2}}/>On these days customers see an "away" notice and can't schedule appointments.</div>
          </Card>
        </>}

        {tab==="settings"&&<>
          <SectionHead icon="cog">Settings</SectionHead>
          <Card>
            <Lbl icon="user">Business Name</Lbl>
            <div style={{ display:"flex", gap:8, marginTop:8 }}>
              <input value={newBiz} onChange={e=>setNewBiz(e.target.value)} style={{ ...fieldStyle, flex:1 }}/>
              <Btn small onClick={saveBiz} icon="check">Save</Btn>
            </div>
            {bizMsg&&<div style={{ color:bizMsg.startsWith("✓")?C.green:C.red, fontSize:"0.78rem", marginTop:6, fontWeight:600 }}>{bizMsg}</div>}
          </Card>
          <Card>
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
              <div style={{ minWidth:0 }}>
                <Lbl icon="alert">Busy Mode</Lbl>
                <div style={{ color:C.text2, fontSize:"0.8rem", lineHeight:1.4 }}>Turn on when you're slammed. Customers see a "we'll call you back" notice and the button becomes "Request a Callback." Requests still come through.</div>
              </div>
              <div onClick={()=>onBusy(!busy)} style={{ width:46, height:26, borderRadius:13, cursor:"pointer", position:"relative", background:busy?C.amber:C.surface3, transition:"background .2s", flexShrink:0, marginTop:2 }}>
                <div style={{ position:"absolute", top:3, left:busy?23:3, width:20, height:20, borderRadius:"50%", background:"#fff", transition:"left .2s", boxShadow:"0 1px 3px rgba(0,0,0,0.2)" }}/>
              </div>
            </div>
          </Card>
          <Card>
            <Lbl icon="download">Data Export</Lbl>
            <div style={{ color:C.text2, fontSize:"0.8rem", lineHeight:1.4, marginBottom:10 }}>Download all jobs — prices, tips, costs, and timestamps — as a CSV for bookkeeping or taxes.</div>
            <Btn small onClick={exportCSV} icon="download">Download CSV</Btn>
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
  const setLang=(l)=>{ setLangState(l); setLangLS(l); };
  const t=useCallback((k)=> (STR[lang] && STR[lang][k]) || STR.en[k] || k, [lang]);

  const [view,setView]=useState("customer");
  const [bizName,setBizName]=useState("AMS");
  const [availability,setAvailability]=useState(DEFAULT_AVAIL);
  const [busy,setBusy]=useState(false);
  const [blockedDates,setBlockedDates]=useState([]);
  const [activeReq,setActiveReq]=useState(null);
  const [globalErr,setGlobalErr]=useState("");

  useEffect(()=>{
    injectResources();
    (async () => {
      try {
        const [settings, avail] = await Promise.all([ api("/api/settings"), api("/api/availability") ]);
        if (settings?.bizName) setBizName(settings.bizName);
        if (typeof settings?.busy === "boolean") setBusy(settings.busy);
        if (Array.isArray(settings?.blockedDates)) setBlockedDates(settings.blockedDates);
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
  const handleBusy = async (next) => {
    setBusy(next);
    try { await api("/api/settings/busy", { method:"PUT", body:{ busy:next }, auth:true }); }
    catch (e) { if (e.status === 401) handleLogout(); }
  };
  const handleBlockedDates = async (dates) => {
    setBlockedDates(dates);
    try { const res = await api("/api/settings/blocked-dates", { method:"PUT", body:{ dates }, auth:true }); if(Array.isArray(res?.blockedDates)) setBlockedDates(res.blockedDates); }
    catch (e) { if (e.status === 401) handleLogout(); }
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
            {view==="customer"&&<CustomerForm availability={availability} busy={busy} blockedDates={blockedDates} onSubmit={handleSubmit} onTrack={()=>setView("lookup")}/>}
            {view==="lookup"&&<Lookup onBack={()=>setView("customer")}/>}
            {view==="confirm"&&activeReq&&<Confirmation initialReq={activeReq} callback={busy} onNew={()=>{setActiveReq(null);setView("customer");}}/>}
            {view==="login"&&<Login onLogin={handleLogin} onBack={()=>setView("customer")}/>}
            {view==="dashboard"&&<Dashboard availability={availability} onAvailability={handleAvailability} bizName={bizName} onBizName={handleBizName} onChangePassword={handleChangePassword} onLogout={handleLogout} busy={busy} onBusy={handleBusy} blockedDates={blockedDates} onBlockedDates={handleBlockedDates}/>}
          </div>
        </div>
      </MobileCtx.Provider>
    </LangCtx.Provider>
  );
}