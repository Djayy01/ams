import { useState, useEffect, useRef } from "react";
import { C, heroPill, fieldStyle } from "../theme";
import { P, Ico } from "../icons";
import { useMobile, useLang } from "../contexts";
import { ymd, DEFAULT_AVAIL } from "../helpers";
import { getSavedCustomer, saveCustomer, clearSavedCustomer } from "../api";
import { Hero, Card, Lbl, Inp, Tarea, Toggle, Btn, ErrorBar, MapEmbed } from "./ui";

export const CustomerForm = ({ onSubmit, availability, busy, onTrack, blockedDates }) => {
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