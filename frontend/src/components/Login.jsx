import { useState } from "react";
import { C } from "../theme";
import { P, Ico } from "../icons";
import { useMobile, useLang } from "../contexts";
import { Card, Inp, Btn, ErrorBar } from "./ui";

export const Login = ({ onLogin, onBack }) => {
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