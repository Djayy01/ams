import { useState } from "react";
import { C, ON } from "../theme";
import { P, Ico } from "../icons";
import { ymd, mapsDir } from "../helpers";
import { Card, Badge, Btn } from "./ui";

export const ScheduleTab = ({ requests }) => {
  const [schedView, setSchedView] = useState("today");
  const todayStr = new Date().toDateString();

  const todayJobs = requests.filter(r => ["accepted","onway","done"].includes(r.status) && new Date(r.submittedAt).toDateString() === todayStr)
    .sort((a,b) => (a.urg==="Scheduled"?new Date(a.schedTime):new Date(a.submittedAt)) - (b.urg==="Scheduled"?new Date(b.schedTime):new Date(b.submittedAt)));

  const today0 = new Date(); today0.setHours(0,0,0,0);
  const weekDays = Array.from({length:7},(_,i)=>{ const d=new Date(today0); d.setDate(d.getDate()+i); return d; });
  const effDate = (r) => r.urg==="Scheduled" && r.schedTime ? new Date(r.schedTime) : new Date(r.submittedAt);
  const sameYmd = (a,b) => ymd(a)===ymd(b);
  const jobsForDay = (day) => requests.filter(r => !["dismissed","cancelled"].includes(r.status) && sameYmd(effDate(r),day)).sort((a,b)=>effDate(a)-effDate(b));

  return (
    <>
      <div style={{ display:"flex", gap:8, marginBottom:14, maxWidth:280 }}>
        {[["today","Today"],["week","This Week"]].map(([id,l])=>(
          <button key={id} onClick={()=>setSchedView(id)} style={{ flex:1, padding:"9px", borderRadius:9, fontWeight:700, fontSize:"0.72rem", cursor:"pointer", textTransform:"uppercase", letterSpacing:"0.04em", background:schedView===id?C.blue:"var(--ams-chip-bg)", color:schedView===id?"#fff":C.text2, border:`1px solid ${schedView===id?C.blue:"var(--ams-chip-border)"}` }}>{l}</button>
        ))}
      </div>

      {schedView==="today" ? (
        todayJobs.length===0
          ? <div style={{ color:ON.t3, textAlign:"center", padding:"56px 0" }}><Ico d={P.cal} size={34} color="rgba(255,255,255,0.35)" style={{ display:"block", margin:"0 auto 12px" }}/>No jobs scheduled for today.</div>
          : todayJobs.map(r=>(
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
    </>
  );
};