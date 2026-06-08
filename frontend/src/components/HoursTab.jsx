import { C, ON, card } from "../theme";
import { P, Ico } from "../icons";
import { useMobile } from "../contexts";
import { DAYS, DEFAULT_AVAIL } from "../helpers";
import { SectionHead } from "./ui";
import { BlockDaysOff } from "./BlockDaysOff";

export const HoursTab = ({ availability, onAvailability, blockedDates, onBlockedDates }) => {
  const m = useMobile();
  const av = availability || DEFAULT_AVAIL;
  const toggleDay = (day) => onAvailability({ ...availability, [day]: { ...availability[day], on: !availability[day].on } });
  const setTime = (day, field, val) => onAvailability({ ...availability, [day]: { ...availability[day], [field]: val } });

  return (
    <>
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
      <BlockDaysOff blockedDates={blockedDates} onBlockedDates={onBlockedDates}/>
    </>
  );
};