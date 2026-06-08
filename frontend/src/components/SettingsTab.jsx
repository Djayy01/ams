import { useState } from "react";
import { C, fieldStyle } from "../theme";
import { Card, Lbl, Inp, Btn, SectionHead } from "./ui";

export const SettingsTab = ({ bizName, onBizName, busy, onBusy, dark, onToggleDark, onChangePassword, onLogout, requests }) => {
  const [newBiz,setNewBiz]=useState(bizName);
  const [curPw,setCurPw]=useState(""); const [newPw,setNewPw]=useState(""); const [confPw,setConfPw]=useState("");
  const [pwMsg,setPwMsg]=useState(""); const [bizMsg,setBizMsg]=useState("");

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

  return (
    <>
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
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
          <div style={{ minWidth:0 }}>
            <Lbl icon="moon">Dark Mode</Lbl>
            <div style={{ color:C.text2, fontSize:"0.8rem", lineHeight:1.4 }}>Easier on the eyes for night work. Applies to your dashboard only — the customer site always stays light.</div>
          </div>
          <div onClick={onToggleDark} style={{ width:46, height:26, borderRadius:13, cursor:"pointer", position:"relative", background:dark?C.blue:C.surface3, transition:"background .2s", flexShrink:0, marginTop:2 }}>
            <div style={{ position:"absolute", top:3, left:dark?23:3, width:20, height:20, borderRadius:"50%", background:"#fff", transition:"left .2s", boxShadow:"0 1px 3px rgba(0,0,0,0.2)" }}/>
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
    </>
  );
};