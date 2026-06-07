// Live status tracker + job-detail pieces shared by Confirmation and Lookup.

import { useState } from "react";
import { C, card } from "../theme";
import { P, Ico } from "../icons";
import { useMobile, useLang } from "../contexts";
import { fmtTime, STEPS } from "../helpers";
import { api } from "../api";
import { Card, Lbl, Btn, ErrorBar, MapEmbed } from "./ui";

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

export const TrackingBody = ({ req, phone, onUpdate }) => (
  <>
    {req.status==="cancelled" ? <CancelledNotice/> : <><EtaBanner req={req}/><StatusTracker req={req}/></>}
    <JobDetails req={req}/>
    {["pending","accepted","onway"].includes(req.status) && <CancelControls req={req} phone={phone} onCancelled={onUpdate}/>}
  </>
);