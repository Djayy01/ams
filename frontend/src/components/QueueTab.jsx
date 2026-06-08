import { useState, useEffect } from "react";
import { C, ON, card, fieldStyle } from "../theme";
import { P, Ico } from "../icons";
import { money, priceNum, net, doneDate } from "../helpers";
import { SkeletonCard } from "./ui";
import { ReqCard } from "./ReqCard";
import { HistoryModal } from "./HistoryModal";
import { EarningsChart } from "./EarningsChart";

export const QueueTab = ({ requests, loading, patchRequest, busyId, loadRequests, alertsOn, enableAlerts, disableAlerts }) => {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showDismissed, setShowDismissed] = useState(false);
  const [history, setHistory] = useState(null);

  const todayStr = new Date().toDateString();
  const pending = requests.filter(r => r.status === "pending").length;
  const active = requests.filter(r => ["accepted","onway"].includes(r.status)).length;
  const doneToday = requests.filter(r => r.status === "done" && doneDate(r).toDateString() === todayStr).length;
  const allDone = requests.filter(r => r.status === "done").length;

  const weekStart = new Date(); weekStart.setHours(0,0,0,0); weekStart.setDate(weekStart.getDate()-6);
  const monthStart = new Date(); monthStart.setHours(0,0,0,0); monthStart.setDate(1);
  const done = requests.filter(r => r.status === "done");
  const earnToday = done.filter(r => doneDate(r).toDateString() === todayStr).reduce((s,r)=>s+net(r),0);
  const earnWeek = done.filter(r => doneDate(r) >= weekStart).reduce((s,r)=>s+net(r),0);
  const monthJobs = done.filter(r => doneDate(r) >= monthStart);
  const grossMonth = monthJobs.reduce((s,r)=>s+priceNum(r.price),0);
  const tipsMonth = monthJobs.reduce((s,r)=>s+priceNum(r.tip),0);
  const costsMonth = monthJobs.reduce((s,r)=>s+priceNum(r.cost),0);
  const netMonth = grossMonth + tipsMonth - costsMonth;
  const towMonth = monthJobs.filter(r=>r.svc==="Towing").reduce((s,r)=>s+priceNum(r.price),0);
  const mechMonth = monthJobs.filter(r=>r.svc==="Mechanical").reduce((s,r)=>s+priceNum(r.price),0);

  const phoneCounts = {};
  requests.forEach(r => { const k = r.phone.replace(/\D/g,""); if (k) phoneCounts[k] = (phoneCounts[k]||0)+1; });

  const qd = query.replace(/\D/g,"");
  const dismissedCount = requests.filter(r => r.status === "dismissed").length;

  const matchStatus = (r) => {
    if (statusFilter === "pending")   return r.status === "pending";
    if (statusFilter === "active")    return ["accepted","onway"].includes(r.status);
    if (statusFilter === "scheduled") return r.urg === "Scheduled" && ["pending","accepted","onway"].includes(r.status);
    if (statusFilter === "done")      return r.status === "done";
    return true;
  };
  const sortRequests = (list) => {
    const arr = [...list];
    if (sortBy === "oldest") return arr.sort((a,b)=>a.id-b.id);
    if (sortBy === "urgency") {
      const openRank = (r) => ["pending","accepted","onway"].includes(r.status) ? 0 : 1;
      const urgRank = (r) => r.urg === "Scheduled" ? 1 : 0;
      return arr.sort((a,b) => {
        if (openRank(a) !== openRank(b)) return openRank(a) - openRank(b);
        if (urgRank(a) !== urgRank(b)) return urgRank(a) - urgRank(b);
        if (a.urg === "Scheduled" && b.urg === "Scheduled") return new Date(a.schedTime||0) - new Date(b.schedTime||0);
        return b.id - a.id;
      });
    }
    return arr.sort((a,b)=>b.id-a.id);
  };

  let visible = requests.filter(r => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return r.name.toLowerCase().includes(q)
      || (qd.length >= 3 && r.phone.replace(/\D/g,"").includes(qd))
      || `${r.year} ${r.make} ${r.model}`.toLowerCase().includes(q);
  }).filter(r => showDismissed ? r.status === "dismissed" : r.status !== "dismissed");
  if (!showDismissed) visible = visible.filter(matchStatus);
  visible = sortRequests(visible);

  useEffect(() => { if (showDismissed && dismissedCount === 0) setShowDismissed(false); }, [showDismissed, dismissedCount]);

  const STATS = [[pending,"Pending",C.amber,"alert"],[active,"Active",C.blue,"zap"],[doneToday,"Done Today",C.green,"check"],[allDone,"All-Time",C.sky,"list"]];

  return (
    <>
      {history && <HistoryModal phone={history.phone} name={history.name} requests={requests} onClose={()=>setHistory(null)}/>}
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
            return <button key={id} onClick={()=>setStatusFilter(id)} style={{ padding:"6px 12px", borderRadius:20, border:`1px solid ${on?C.blue:"var(--ams-chip-border)"}`, background:on?C.blue:"var(--ams-chip-bg)", color:on?"#fff":C.text2, fontSize:"0.7rem", fontWeight:700, cursor:"pointer", textTransform:"uppercase", letterSpacing:"0.03em" }}>{l}</button>;
          })}
        </div>
      )}
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8, flexWrap:"wrap" }}>
        <span style={{ color:ON.t3, fontSize:"0.7rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>Sort</span>
        {[["newest","Newest"],["oldest","Oldest"],["urgency","Urgency"]].map(([id,l])=>{
          const on=sortBy===id;
          return <button key={id} onClick={()=>setSortBy(id)} style={{ padding:"6px 12px", borderRadius:8, border:`1px solid ${on?C.blue:"var(--ams-chip-border)"}`, background:on?C.blue:"var(--ams-chip-bg)", color:on?"#fff":C.text2, fontSize:"0.7rem", fontWeight:700, cursor:"pointer", textTransform:"uppercase", letterSpacing:"0.03em" }}>{l}</button>;
        })}
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8, gap:8 }}>
        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          <button onClick={alertsOn?disableAlerts:enableAlerts} style={{ background:alertsOn?`${C.green}1f`:"var(--ams-chip-bg)", border:`1px solid ${alertsOn?C.green:"var(--ams-chip-border)"}`, color:alertsOn?C.green:C.text2, borderRadius:9, padding:"7px 11px", fontSize:"0.72rem", fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
            <Ico d={P.bell} size={13} color={alertsOn?C.green:C.text2}/>{alertsOn?"Alerts on":"Enable alerts"}
          </button>
          {(dismissedCount>0 || showDismissed) && (
            <button onClick={()=>setShowDismissed(v=>!v)} style={{ background:showDismissed?`${C.blue}1f`:"var(--ams-chip-bg)", border:`1px solid ${showDismissed?C.blue:"var(--ams-chip-border)"}`, color:showDismissed?C.blue:C.text2, borderRadius:9, padding:"7px 11px", fontSize:"0.72rem", fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
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
    </>
  );
};