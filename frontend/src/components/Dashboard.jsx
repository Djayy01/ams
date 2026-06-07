import { useState, useEffect, useCallback, useRef } from "react";
import { C, ON, card, fieldStyle } from "../theme";
import { P, Ico } from "../icons";
import { useMobile } from "../contexts";
import { api, getAlerts, setAlertsLS } from "../api";
import { money, priceNum, net, doneDate, ymd, mapsDir, DAYS, DEFAULT_AVAIL } from "../helpers";
import { Card, Btn, ErrorBar, SectionHead, Lbl, Inp, Badge, SkeletonCard } from "./ui";
import { ReqCard } from "./ReqCard";
import { HistoryModal } from "./HistoryModal";
import { EarningsChart } from "./EarningsChart";

export const Dashboard = ({ availability, onAvailability, bizName, onBizName, onChangePassword, onLogout, busy, onBusy, blockedDates, onBlockedDates }) => {
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
  const [showDismissed,setShowDismissed]=useState(false);
  const [sortBy,setSortBy]=useState("newest");
  const [statusFilter,setStatusFilter]=useState("all");

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
  const dismissedCount=requests.filter(r=>r.status==="dismissed").length;

  const matchStatus=(r)=>{
    if(statusFilter==="pending")   return r.status==="pending";
    if(statusFilter==="active")    return ["accepted","onway"].includes(r.status);
    if(statusFilter==="scheduled") return r.urg==="Scheduled" && ["pending","accepted","onway"].includes(r.status);
    if(statusFilter==="done")      return r.status==="done";
    return true; // "all"
  };
  const sortRequests=(list)=>{
    const arr=[...list];
    if(sortBy==="oldest") return arr.sort((a,b)=>a.id-b.id);
    if(sortBy==="urgency"){
      const openRank=(r)=>["pending","accepted","onway"].includes(r.status)?0:1;  // open jobs first
      const urgRank=(r)=>r.urg==="Scheduled"?1:0;                                  // ASAP before Scheduled
      return arr.sort((a,b)=>{
        if(openRank(a)!==openRank(b)) return openRank(a)-openRank(b);
        if(urgRank(a)!==urgRank(b)) return urgRank(a)-urgRank(b);
        if(a.urg==="Scheduled" && b.urg==="Scheduled") return new Date(a.schedTime||0)-new Date(b.schedTime||0);
        return b.id-a.id;
      });
    }
    return arr.sort((a,b)=>b.id-a.id); // newest
  };

  let visible=requests.filter(r=>{
    if(!query.trim()) return true;
    const q=query.toLowerCase();
    return r.name.toLowerCase().includes(q)
      || (qd.length>=3 && r.phone.replace(/\D/g,"").includes(qd))
      || `${r.year} ${r.make} ${r.model}`.toLowerCase().includes(q);
  }).filter(r => showDismissed ? r.status==="dismissed" : r.status!=="dismissed");
  if(!showDismissed) visible=visible.filter(matchStatus);
  visible=sortRequests(visible);

  useEffect(()=>{ if(showDismissed && dismissedCount===0) setShowDismissed(false); },[showDismissed, dismissedCount]);

  const todayJobs=requests.filter(r=>["accepted","onway","done"].includes(r.status)&&new Date(r.submittedAt).toDateString()===todayStr)
    .sort((a,b)=>(a.urg==="Scheduled"?new Date(a.schedTime):new Date(a.submittedAt))-(b.urg==="Scheduled"?new Date(b.schedTime):new Date(b.submittedAt)));

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
        {TABS.map(tb=>(
          <button key={tb.id} onClick={()=>setTab(tb.id)} style={{ flex:1, minWidth:0, padding:m?"9px 2px":"9px 4px", borderRadius:10, border:`1px solid ${tab===tb.id?C.blue:"rgba(255,255,255,0.4)"}`, cursor:"pointer", background:tab===tb.id?C.blue:"rgba(255,255,255,0.92)", color:tab===tb.id?"#fff":C.text2, fontWeight:700, fontSize:m?"0.58rem":"0.7rem", letterSpacing:"0.03em", textTransform:"uppercase", display:"flex", alignItems:"center", justifyContent:"center", gap:m?3:6, transition:"all .15s", boxShadow:tab===tb.id?`0 4px 12px ${C.blue}40`:"0 2px 10px rgba(8,28,52,0.12)" }}>
            <Ico d={P[tb.icon]} size={13} color={tab===tb.id?"#fff":C.text2}/>{tb.label}
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
          <EarningsChart requests={requests}/>
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
          {!showDismissed && (
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:8 }}>
              {[["all","All"],["pending","Pending"],["active","Active"],["scheduled","Scheduled"],["done","Done"]].map(([id,l])=>{
                const on=statusFilter===id;
                return <button key={id} onClick={()=>setStatusFilter(id)} style={{ padding:"6px 12px", borderRadius:20, border:`1px solid ${on?C.blue:"rgba(255,255,255,0.5)"}`, background:on?C.blue:"rgba(255,255,255,0.92)", color:on?"#fff":C.text2, fontSize:"0.7rem", fontWeight:700, cursor:"pointer", textTransform:"uppercase", letterSpacing:"0.03em" }}>{l}</button>;
              })}
            </div>
          )}
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8, flexWrap:"wrap" }}>
            <span style={{ color:ON.t3, fontSize:"0.7rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>Sort</span>
            {[["newest","Newest"],["oldest","Oldest"],["urgency","Urgency"]].map(([id,l])=>{
              const on=sortBy===id;
              return <button key={id} onClick={()=>setSortBy(id)} style={{ padding:"6px 12px", borderRadius:8, border:`1px solid ${on?C.blue:"rgba(255,255,255,0.5)"}`, background:on?C.blue:"rgba(255,255,255,0.92)", color:on?"#fff":C.text2, fontSize:"0.7rem", fontWeight:700, cursor:"pointer", textTransform:"uppercase", letterSpacing:"0.03em" }}>{l}</button>;
            })}
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8, gap:8 }}>
            <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
              <button onClick={alertsOn?disableAlerts:enableAlerts} style={{ background:alertsOn?`${C.green}1f`:"rgba(255,255,255,0.92)", border:`1px solid ${alertsOn?C.green:"rgba(255,255,255,0.5)"}`, color:alertsOn?C.green:C.text2, borderRadius:9, padding:"7px 11px", fontSize:"0.72rem", fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
                <Ico d={P.bell} size={13} color={alertsOn?C.green:C.text2}/>{alertsOn?"Alerts on":"Enable alerts"}
              </button>
              {(dismissedCount>0 || showDismissed) && (
                <button onClick={()=>setShowDismissed(v=>!v)} style={{ background:showDismissed?`${C.blue}1f`:"rgba(255,255,255,0.92)", border:`1px solid ${showDismissed?C.blue:"rgba(255,255,255,0.5)"}`, color:showDismissed?C.blue:C.text2, borderRadius:9, padding:"7px 11px", fontSize:"0.72rem", fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
                  <Ico d={P[showDismissed?"refresh":"close"]} size={13} color={showDismissed?C.blue:C.text2}/>{showDismissed?"Back to queue":`Dismissed (${dismissedCount})`}
                </button>
              )}
            </div>
            <button onClick={loadRequests} style={{ background:"transparent", border:"none", color:ON.t2, fontSize:"0.74rem", fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}><Ico d={P.refresh} size={13} color={ON.t2}/>Refresh</button>
          </div>
          {loading
            ? <>{Array.from({length:3}).map((_,i)=><SkeletonCard key={i}/>)}</>
            : requests.length===0
              ? <div style={{ color:ON.t3, textAlign:"center", padding:"56px 0", fontSize:"0.9rem" }}><Ico d={P.list} size={34} color="rgba(255,255,255,0.35)" style={{ display:"block", margin:"0 auto 12px" }}/>No requests yet.</div>
              : visible.length===0
                ? <div style={{ color:ON.t3, textAlign:"center", padding:"48px 0", fontSize:"0.9rem" }}>{showDismissed ? "No dismissed requests." : (query.trim() ? `No jobs match "${query}".` : (statusFilter!=="all" ? "No jobs in this filter." : "Nothing in the queue."))}</div>
                : <>
                    {showDismissed && <div style={{ color:ON.t3, fontSize:"0.78rem", marginBottom:10, display:"flex", gap:6, alignItems:"center" }}><Ico d={P.alert} size={12} color="rgba(255,255,255,0.55)"/>Dismissed requests — tap "Reopen Job" to bring one back.</div>}
                    {visible.map(r=><ReqCard key={r.id} req={r} onPatch={patchRequest} busyId={busyId} repeat={phoneCounts[r.phone.replace(/\D/g,"")]||1} onHistory={(p,n)=>setHistory({phone:p,name:n})}/>)}
                  </>
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