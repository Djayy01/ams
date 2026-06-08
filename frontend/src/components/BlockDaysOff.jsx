import { useState } from "react";
import { C } from "../theme";
import { P, Ico } from "../icons";
import { useMobile } from "../contexts";
import { ymd } from "../helpers";
import { Card, Lbl } from "./ui";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DOW = ["S","M","T","W","T","F","S"];

export const BlockDaysOff = ({ blockedDates, onBlockedDates }) => {
  const m = useMobile();
  const today = new Date(); today.setHours(0,0,0,0);
  const [view, setView] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [pendingStart, setPendingStart] = useState(null);

  const blocked = blockedDates || [];
  const blockedSet = new Set(blocked);
  const vy = view.getFullYear(), vm = view.getMonth();
  const startWeekday = new Date(vy, vm, 1).getDay();
  const daysInMonth = new Date(vy, vm + 1, 0).getDate();
  const atCurrentMonth = vy === today.getFullYear() && vm === today.getMonth();
  const todayStr = ymd(today);

  const apply = (next) => onBlockedDates([...new Set(next)].sort());

  const tapDay = (dateStr, isPast) => {
    if (isPast) return;
    if (!pendingStart) {
      if (blockedSet.has(dateStr)) apply(blocked.filter(x => x !== dateStr));
      else setPendingStart(dateStr);
      return;
    }
    const lo = pendingStart < dateStr ? pendingStart : dateStr;
    const hi = pendingStart < dateStr ? dateStr : pendingStart;
    const add = [];
    let cur = new Date(lo + "T00:00"); const stop = new Date(hi + "T00:00");
    while (cur <= stop) { add.push(ymd(cur)); cur.setDate(cur.getDate() + 1); }
    apply([...blocked, ...add]);
    setPendingStart(null);
  };

  const groups = (() => {
    const g = [];
    for (const d of [...blocked].sort()) {
      const last = g[g.length - 1];
      if (last && (new Date(d + "T00:00") - new Date(last.end + "T00:00")) / 86400000 === 1) { last.end = d; last.dates.push(d); }
      else g.push({ start: d, end: d, dates: [d] });
    }
    return g;
  })();
  const removeRange = (dates) => apply(blocked.filter(x => !dates.includes(x)));
  const fmt = (d) => new Date(d + "T00:00").toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const cellBtn = (d) => {
    if (d === null) return <div />;
    const dateStr = ymd(new Date(vy, vm, d));
    const isPast = new Date(vy, vm, d) < today;
    const isBlocked = blockedSet.has(dateStr);
    const isPending = pendingStart === dateStr;
    const isToday = dateStr === todayStr;
    let bg = "transparent", color = C.text, border = "1px solid transparent";
    if (isPast) color = C.text3;
    if (isBlocked) { bg = C.blue; color = "#fff"; }
    if (isPending) { bg = `${C.amber}22`; border = `1.5px solid ${C.amber}`; color = C.amberD; }
    return (
      <button onClick={() => tapDay(dateStr, isPast)} disabled={isPast}
        style={{ aspectRatio:"1 / 1", width:"100%", borderRadius:9, border, background:bg, color, cursor:isPast?"default":"pointer", opacity:isPast?0.4:1, fontWeight:(isBlocked||isToday)?800:600, fontSize:m?"0.8rem":"0.85rem", display:"flex", alignItems:"center", justifyContent:"center", position:"relative", transition:"background .12s" }}>
        {d}
        {isToday && !isBlocked && <span style={{ position:"absolute", bottom:4, width:4, height:4, borderRadius:"50%", background:C.blue }} />}
      </button>
    );
  };

  return (
    <Card>
      <Lbl icon="cal">Block days off</Lbl>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:8, marginBottom:10 }}>
        <button onClick={()=>!atCurrentMonth && setView(new Date(vy, vm-1, 1))} disabled={atCurrentMonth} aria-label="Previous month"
          style={{ background:"transparent", border:"none", cursor:atCurrentMonth?"default":"pointer", opacity:atCurrentMonth?0.3:1, padding:"4px 10px", display:"flex" }}>
          <span style={{ fontSize:"1.3rem", lineHeight:1, color:C.text2, fontWeight:800 }}>‹</span>
        </button>
        <div style={{ color:C.text, fontWeight:800, fontSize:"0.92rem" }}>{MONTHS[vm]} {vy}</div>
        <button onClick={()=>setView(new Date(vy, vm+1, 1))} aria-label="Next month"
          style={{ background:"transparent", border:"none", cursor:"pointer", padding:"4px 10px", display:"flex" }}>
          <span style={{ fontSize:"1.3rem", lineHeight:1, color:C.text2, fontWeight:800 }}>›</span>
        </button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:m?3:5, marginBottom:5 }}>
        {DOW.map((d,i)=><div key={i} style={{ textAlign:"center", color:C.text3, fontSize:"0.62rem", fontWeight:700, textTransform:"uppercase" }}>{d}</div>)}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:m?3:5 }}>
        {cells.map((d,i)=><div key={i}>{cellBtn(d)}</div>)}
      </div>

      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, marginTop:10, flexWrap:"wrap" }}>
        <div style={{ color:C.text3, fontSize:"0.72rem", flex:1, minWidth:0 }}>
          {pendingStart ? `Start: ${fmt(pendingStart)} — now tap an end day (or the same day again for one day).` : "Tap a day to block it, or tap a start day then an end day to block a range."}
        </div>
        {pendingStart && <button onClick={()=>setPendingStart(null)} style={{ background:"transparent", border:"none", color:C.blue, fontWeight:700, fontSize:"0.72rem", cursor:"pointer", textTransform:"uppercase", flexShrink:0 }}>Cancel</button>}
      </div>

      <div style={{ marginTop: groups.length?12:0 }}>
        {groups.length===0
          ? <div style={{ color:C.text3, fontSize:"0.78rem", marginTop:10, fontStyle:"italic" }}>No days off scheduled.</div>
          : groups.map(g=>{
              const single = g.start===g.end;
              return (
                <div key={g.start} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0", borderTop:`1px solid ${C.surface3}`, gap:10 }}>
                  <div style={{ minWidth:0 }}>
                    <div style={{ color:C.text, fontSize:"0.85rem", fontWeight:600 }}>{single ? fmt(g.start) : `${fmt(g.start)} – ${fmt(g.end)}`}</div>
                    {!single && <div style={{ color:C.text3, fontSize:"0.72rem", marginTop:1 }}>{g.dates.length} days</div>}
                  </div>
                  <button onClick={()=>removeRange(g.dates)} title={single?"Remove":"Remove range"} style={{ background:"transparent", border:"none", cursor:"pointer", color:C.red, padding:4, display:"flex", flexShrink:0 }}><Ico d={P.close} size={15} color={C.red}/></button>
                </div>
              );
            })
        }
      </div>

      <div style={{ color:C.text3, fontSize:"0.72rem", marginTop:12, display:"flex", gap:5, alignItems:"flex-start" }}><Ico d={P.alert} size={11} color={C.text3} style={{marginTop:2}}/>On these days customers see an "away" notice and can't schedule appointments.</div>
    </Card>
  );
};