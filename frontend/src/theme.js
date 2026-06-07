// Color palette, status metadata, and shared inline-style objects.
// Structural colors are CSS variables (they flip under [data-theme="dark"]).
// Accent colors stay hex so `${C.blue}40` opacity concatenation keeps working.

export const C = {
  surface:"var(--ams-surface)", surface2:"var(--ams-surface2)", surface3:"var(--ams-surface3)", border:"var(--ams-border)",
  text:"var(--ams-text)", text2:"var(--ams-text2)", text3:"var(--ams-text3)",
  blue:"#2563eb", blueL:"#3b82f6", sky:"#0ea5e9", amber:"#f59e0b", amberD:"#d97706",
  green:"#16a34a", red:"#ef4444",
};

export const ON = { t:"#ffffff", t2:"rgba(255,255,255,0.86)", t3:"rgba(255,255,255,0.62)", icon:"#7dd3fc" };

export const SM = {
  pending:{label:"Pending",c:C.amber}, accepted:{label:"Accepted",c:C.blue},
  onway:{label:"On the Way",c:C.sky}, done:{label:"Complete",c:C.green},
  dismissed:{label:"Dismissed",c:"#94a3b8"}, cancelled:{label:"Cancelled",c:"#94a3b8"},
};

export const card = () => ({
  background:"var(--ams-card-bg)", backdropFilter:"blur(14px)", WebkitBackdropFilter:"blur(14px)",
  border:"1px solid var(--ams-card-border)", boxShadow:"var(--ams-card-shadow)"
});

export const heroPill = {
  display:"inline-flex", alignItems:"center", gap:7, padding:"5px 14px", borderRadius:30,
  background:"rgba(255,255,255,0.16)", border:"1px solid rgba(255,255,255,0.35)",
  backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)"
};

export const fieldStyle = {
  background:C.surface2, border:`1px solid ${C.border}`, color:C.text, borderRadius:9, padding:"11px 12px",
  width:"100%", fontSize:"0.92rem", outline:"none", boxSizing:"border-box",
  boxShadow:"0 2px 5px rgba(8,28,52,0.12)", transition:"border-color .15s, box-shadow .15s"
};