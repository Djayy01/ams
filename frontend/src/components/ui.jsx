// Shared presentational primitives used across customer + mechanic screens.

import { C, ON, SM, card, heroPill, fieldStyle } from "../theme";
import { P, Ico } from "../icons";
import { useMobile, useLang } from "../contexts";
import { INSTAGRAM_URL } from "../helpers";

export const AuroraBackground = () => (
  <div className="ams-aurora" aria-hidden="true" style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none" }} />
);

export const Skeleton = ({ h = 14, w = "100%", r = 8, style = {} }) => (
  <div className="ams-shimmer" style={{ height: h, width: w, borderRadius: r, ...style }} />
);

export const SkeletonCard = () => (
  <Card>
    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
      <Skeleton h={36} w={36} r={10} />
      <div style={{ flex:1 }}>
        <Skeleton h={13} w="55%" style={{ marginBottom:7 }} />
        <Skeleton h={10} w="32%" />
      </div>
      <Skeleton h={20} w={70} r={6} />
    </div>
    <Skeleton h={30} w="60%" r={9} style={{ marginBottom:12 }} />
    <div style={{ display:"flex", gap:8, marginBottom:12 }}>
      <Skeleton h={34} w="50%" />
      <Skeleton h={34} w="50%" />
    </div>
    <div style={{ display:"flex", gap:8 }}>
      <Skeleton h={32} w={92} r={9} />
      <Skeleton h={32} w={110} r={9} />
    </div>
  </Card>
);

export const Badge = ({ status }) => {
  const m = SM[status] || SM.pending;
  return <span style={{ background:m.c+"1f", color:m.c, border:`1px solid ${m.c}40`, borderRadius:5, padding:"2px 8px", fontSize:"0.65rem", fontWeight:800, letterSpacing:"0.07em", textTransform:"uppercase" }}>{m.label}</span>;
};

export const Btn = ({ children, onClick, color=C.blue, outline, small, full, disabled, style={}, icon, href, target }) => {
  const s = { background:outline?"var(--ams-surface)":color, color:outline?color:"#fff", border:`1.5px solid ${outline?C.border:color}`, borderRadius:9, fontWeight:700, cursor:disabled?"not-allowed":"pointer", opacity:disabled?0.6:1, padding:small?"8px 14px":"12px 20px", fontSize:small?"0.75rem":"0.85rem", width:full?"100%":undefined, letterSpacing:"0.04em", textTransform:"uppercase", display:"inline-flex", alignItems:"center", gap:7, justifyContent:"center", transition:"all .15s", boxShadow:outline?"none":`0 4px 14px ${color}40`, textDecoration:"none", boxSizing:"border-box", ...style };
  const over = e=>{ if(!disabled){e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.opacity="0.94";} };
  const out  = e=>{ e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.opacity=disabled?"0.6":"1"; };
  if (href) return <a href={href} target={target} rel={target==="_blank"?"noopener noreferrer":undefined} style={s} onMouseOver={over} onMouseOut={out}>{icon&&<Ico d={P[icon]} size={14}/>}{children}</a>;
  return <button onClick={onClick} disabled={disabled} style={s} onMouseOver={over} onMouseOut={out}>{icon&&<Ico d={P[icon]} size={14}/>}{children}</button>;
};

export const Inp = ({ label, icon, ...p }) => (
  <div style={{ marginBottom:14 }}>
    {label&&<div style={{ color:C.text2, fontSize:"0.7rem", fontWeight:700, letterSpacing:"0.09em", textTransform:"uppercase", marginBottom:5, display:"flex", alignItems:"center", gap:5 }}>{icon&&<Ico d={P[icon]} size={11} color={C.blue}/>}{label}</div>}
    <input {...p} style={{ ...fieldStyle, ...p.style }}/>
  </div>
);

export const Tarea = ({ label, icon, ...p }) => (
  <div style={{ marginBottom:14 }}>
    {label&&<div style={{ color:C.text2, fontSize:"0.7rem", fontWeight:700, letterSpacing:"0.09em", textTransform:"uppercase", marginBottom:5, display:"flex", alignItems:"center", gap:5 }}>{icon&&<Ico d={P[icon]} size={11} color={C.blue}/>}{label}</div>}
    <textarea {...p} style={{ ...fieldStyle, resize:"vertical", minHeight:80, ...p.style }}/>
  </div>
);

export const Toggle = ({ options, value, onChange, accent, labels }) => (
  <div style={{ display:"flex", gap:8, marginBottom:14 }}>
    {options.map(o=>(
      <button key={o} onClick={()=>onChange(o)} style={{ flex:1, padding:"11px", borderRadius:9, fontWeight:700, fontSize:"0.85rem", cursor:"pointer", textTransform:"uppercase", letterSpacing:"0.04em", transition:"all .15s", background:value===o?(accent||C.blue):C.surface2, color:value===o?"#fff":C.text2, border:`1.5px solid ${value===o?(accent||C.blue):C.border}`, boxShadow:value===o?`0 4px 12px ${(accent||C.blue)}33`:"none" }}>{labels?(labels[o]||o):o}</button>
    ))}
  </div>
);

export const Card = ({ children, accent, style={} }) => {
  const m = useMobile();
  return <div style={{ ...card(), borderRadius:14, padding:m?14:18, marginBottom:12, borderLeft:accent?`4px solid ${C.blue}`:undefined, ...style }}>{children}</div>;
};

export const Lbl = ({ children, icon, style={} }) => (
  <div style={{ color:C.text2, fontSize:"0.7rem", fontWeight:700, letterSpacing:"0.09em", textTransform:"uppercase", marginBottom:4, display:"flex", alignItems:"center", gap:5, ...style }}>
    {icon&&<Ico d={P[icon]} size={11} color={C.blue}/>}{children}
  </div>
);

export const ErrorBar = ({ msg, onClose }) => msg ? (
  <div style={{ background:"rgba(254,242,242,0.97)", border:`1px solid ${C.red}55`, color:"#b91c1c", borderRadius:10, padding:"10px 14px", marginBottom:14, fontSize:"0.82rem", display:"flex", gap:8, alignItems:"center", justifyContent:"space-between", boxShadow:"0 6px 18px rgba(8,28,52,0.12)" }}>
    <span style={{ display:"flex", gap:8, alignItems:"center" }}><Ico d={P.alert} size={14} color="#b91c1c"/>{msg}</span>
    {onClose && <span onClick={onClose} style={{ cursor:"pointer", fontWeight:800, opacity:0.7 }}>✕</span>}
  </div>
) : null;

export const SectionHead = ({ icon, children }) => (
  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
    <Ico d={P[icon]} size={18} color={ON.icon}/>
    <div style={{ color:ON.t, fontWeight:800, fontSize:"1.15rem" }}>{children}</div>
  </div>
);

export const MapEmbed = ({ location }) => {
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

// Single globe button that toggles EN ↔ ES.
export const LangToggle = ({ m }) => {
  const { lang, setLang } = useLang();
  const next = lang === "en" ? "es" : "en";
  return (
    <button
      onClick={()=>setLang(next)}
      aria-label={lang==="en" ? "Switch to Español" : "Cambiar a English"}
      title={lang==="en" ? "Español" : "English"}
      style={{ display:"inline-flex", alignItems:"center", gap:6, padding:m?"6px 10px":"7px 12px", border:`1.5px solid ${C.border}`, borderRadius:9, background:"#fff", color:C.text2, cursor:"pointer", fontWeight:800, fontSize:"0.7rem", letterSpacing:"0.04em", textTransform:"uppercase", flexShrink:0, transition:"transform .15s" }}
      onMouseOver={e=>{e.currentTarget.style.transform="translateY(-1px)";}}
      onMouseOut={e=>{e.currentTarget.style.transform="translateY(0)";}}
    >
      <Ico d={P.globe} size={m?16:17} color={C.blue}/>
      <span>{lang}</span>
    </button>
  );
};

export const Nav = ({ bizName, isMech, onMechClick }) => {
  const m = useMobile();
  const { t } = useLang();
  return (
    <div style={{ position:"sticky", top:0, zIndex:100, background:"var(--ams-nav-bg)", backdropFilter:"blur(14px)", WebkitBackdropFilter:"blur(14px)", borderBottom:"1px solid rgba(255,255,255,0.4)", padding:m?"13px 14px":"16px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 4px 20px rgba(8,28,52,0.10)" }}>
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

export const Hero = () => {
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