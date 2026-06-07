import { useState, useEffect } from "react";
import { C, ON } from "../theme";
import { P, Ico } from "../icons";
import { useMobile, useLang } from "../contexts";
import { api } from "../api";
import { Card, Inp, Btn, ErrorBar } from "./ui";
import { TrackingBody } from "./tracking";

export const Lookup = ({ onBack }) => {
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