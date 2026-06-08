import { useState } from "react";
import { C } from "../theme";
import { P, Ico } from "../icons";
import { useMobile } from "../contexts";
import { ErrorBar } from "./ui";
import { useRequests } from "../useRequests";
import { QueueTab } from "./QueueTab";
import { ScheduleTab } from "./ScheduleTab";
import { HoursTab } from "./HoursTab";
import { SettingsTab } from "./SettingsTab";

const TABS = [
  { id:"queue",    label:"Queue",    icon:"list" },
  { id:"schedule", label:"Schedule", icon:"cal" },
  { id:"avail",    label:"Hours",    icon:"clock" },
  { id:"settings", label:"Settings", icon:"cog" },
];

export const Dashboard = ({ availability, onAvailability, bizName, onBizName, onChangePassword, onLogout, busy, onBusy, blockedDates, onBlockedDates, dark, onToggleDark }) => {
  const m = useMobile();
  const [tab, setTab] = useState("queue");
  const { requests, loading, err, setErr, busyId, patchRequest, loadRequests, alertsOn, enableAlerts, disableAlerts } = useRequests({ bizName, onLogout });

  return (
    <div style={{ maxWidth:700, margin:"0 auto" }}>
      <div style={{ display:"flex", gap:m?4:6, padding:m?"12px 10px":"14px", borderBottom:"1px solid rgba(255,255,255,0.18)" }}>
        {TABS.map(tb=>(
          <button key={tb.id} onClick={()=>setTab(tb.id)} style={{ flex:1, minWidth:0, padding:m?"9px 2px":"9px 4px", borderRadius:10, border:`1px solid ${tab===tb.id?C.blue:"var(--ams-chip-border)"}`, cursor:"pointer", background:tab===tb.id?C.blue:"var(--ams-chip-bg)", color:tab===tb.id?"#fff":C.text2, fontWeight:700, fontSize:m?"0.58rem":"0.7rem", letterSpacing:"0.03em", textTransform:"uppercase", display:"flex", alignItems:"center", justifyContent:"center", gap:m?3:6, transition:"all .15s", boxShadow:tab===tb.id?`0 4px 12px ${C.blue}40`:"0 2px 10px rgba(8,28,52,0.12)" }}>
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

        {tab==="queue"    && <QueueTab requests={requests} loading={loading} patchRequest={patchRequest} busyId={busyId} loadRequests={loadRequests} alertsOn={alertsOn} enableAlerts={enableAlerts} disableAlerts={disableAlerts}/>}
        {tab==="schedule" && <ScheduleTab requests={requests}/>}
        {tab==="avail"    && <HoursTab availability={availability} onAvailability={onAvailability} blockedDates={blockedDates} onBlockedDates={onBlockedDates}/>}
        {tab==="settings" && <SettingsTab bizName={bizName} onBizName={onBizName} busy={busy} onBusy={onBusy} dark={dark} onToggleDark={onToggleDark} onChangePassword={onChangePassword} onLogout={onLogout} requests={requests}/>}
      </div>
    </div>
  );
};