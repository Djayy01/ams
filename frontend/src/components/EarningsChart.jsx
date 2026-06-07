import { C, card } from "../theme";
import { useMobile } from "../contexts";
import { net, doneDate, ymd, money } from "../helpers";

export const EarningsChart = ({ requests }) => {
  const m = useMobile();
  const today = new Date(); today.setHours(0,0,0,0);
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(today); d.setDate(d.getDate() - (6 - i)); return d; });
  const done = requests.filter(r => r.status === "done");
  const data = days.map(d => {
    const key = ymd(d);
    const total = done.filter(r => ymd(doneDate(r)) === key).reduce((s, r) => s + net(r), 0);
    return { d, key, total };
  });
  const max = Math.max(1, ...data.map(x => x.total));
  const weekTotal = data.reduce((s, x) => s + x.total, 0);
  const todayKey = ymd(today);
  const barArea = m ? 92 : 112;
  const dow = ["S","M","T","W","T","F","S"];

  return (
    <div style={{ ...card(), borderRadius:14, padding:m?"14px 14px 12px":"16px 18px 14px", marginBottom:10, borderTop:`4px solid ${C.sky}` }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:14 }}>
        <div style={{ color:C.text2, fontSize:"0.68rem", textTransform:"uppercase", letterSpacing:"0.07em", fontWeight:700 }}>Last 7 Days · take-home</div>
        <div style={{ color:C.sky, fontWeight:900, fontSize:"1.2rem" }}>{money(weekTotal)}</div>
      </div>
      <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", gap:m?5:8, height:barArea }}>
        {data.map((x,i) => {
          const isToday = x.key === todayKey;
          const h = x.total <= 0 ? 3 : Math.max(8, Math.round((x.total / max) * (barArea - 22)));
          return (
            <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"flex-end", height:"100%" }}>
              {x.total > 0 && <div style={{ color:isToday?C.sky:C.text3, fontSize:m?"0.52rem":"0.58rem", fontWeight:800, marginBottom:3, whiteSpace:"nowrap" }}>{money(x.total)}</div>}
              <div title={money(x.total)} style={{ width:"100%", maxWidth:34, height:h, borderRadius:"6px 6px 3px 3px", background:x.total<=0?C.surface3:`linear-gradient(180deg, ${C.blue}, ${C.sky})`, boxShadow:x.total>0?`0 4px 10px ${C.blue}33`:"none", border:isToday?`1.5px solid ${C.sky}`:"none", transition:"height .4s" }}/>
            </div>
          );
        })}
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", gap:m?5:8, marginTop:7 }}>
        {data.map((x,i) => {
          const isToday = x.key === todayKey;
          return <div key={i} style={{ flex:1, textAlign:"center", color:isToday?C.sky:C.text3, fontSize:m?"0.58rem":"0.64rem", fontWeight:isToday?800:600 }}>{dow[x.d.getDay()]}</div>;
        })}
      </div>
    </div>
  );
};