import { useState, useEffect } from "react";
import { C, ON } from "../theme";
import { P, Ico } from "../icons";
import { useMobile, useLang } from "../contexts";
import { api } from "../api";
import { Btn } from "./ui";
import { TrackingBody } from "./tracking";

export const Confirmation = ({ initialReq, onNew, callback }) => {
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