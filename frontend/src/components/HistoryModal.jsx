import { C, card } from "../theme";
import { P, Ico } from "../icons";
import { useMobile } from "../contexts";
import { priceNum, money, formatPrice } from "../helpers";
import { Badge } from "./ui";

export const HistoryModal = ({ phone, name, requests, onClose }) => {
  const m = useMobile();
  const digits = (phone||"").replace(/\D/g,"");
  const jobs = requests.filter(r=>r.phone.replace(/\D/g,"")===digits).sort((a,b)=>new Date(b.submittedAt)-new Date(a.submittedAt));
  const spent = jobs.filter(r=>r.status==="done").reduce((s,r)=>s+priceNum(r.price)+priceNum(r.tip),0);
  const doneCount = jobs.filter(r=>r.status==="done").length;
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(8,20,38,0.55)", backdropFilter:"blur(3px)", display:"flex", alignItems:m?"flex-end":"center", justifyContent:"center", padding:m?0:20 }}>
      <div onClick={e=>e.stopPropagation()} style={{ ...card(), borderRadius:m?"16px 16px 0 0":16, width:"100%", maxWidth:520, maxHeight:m?"85vh":"82vh", display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <div style={{ padding:"16px 18px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10 }}>
          <div style={{ minWidth:0 }}>
            <div style={{ color:C.text, fontWeight:800, fontSize:"1.05rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{name}</div>
            <div style={{ color:C.text2, fontSize:"0.78rem", marginTop:2 }}>{jobs.length} request{jobs.length===1?"":"s"} · {doneCount} completed · {money(spent)} total</div>
          </div>
          <button onClick={onClose} style={{ background:C.surface2, border:`1px solid ${C.border}`, borderRadius:8, padding:6, cursor:"pointer", flexShrink:0, display:"flex" }}><Ico d={P.close} size={16} color={C.text2}/></button>
        </div>
        <div className="ams-scroll" style={{ padding:"12px 18px 18px", overflowY:"auto" }}>
          {jobs.map(r=>(
            <div key={r.id} style={{ borderBottom:`1px solid ${C.surface3}`, padding:"11px 0", display:"flex", justifyContent:"space-between", gap:10, alignItems:"flex-start" }}>
              <div style={{ minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:3, flexWrap:"wrap" }}>
                  <Ico d={P[r.svc==="Towing"?"tow":"wrench"]} size={13} color={r.svc==="Towing"?C.blue:C.sky}/>
                  <span style={{ color:C.text, fontWeight:700, fontSize:"0.85rem" }}>{r.svc}</span>
                  <span style={{ color:C.text3, fontSize:"0.78rem" }}>· {r.year} {r.make} {r.model}</span>
                </div>
                <div style={{ color:C.text3, fontSize:"0.74rem" }}>{new Date(r.submittedAt).toLocaleDateString([], {year:"numeric",month:"short",day:"numeric"})}</div>
                {r.issue && <div style={{ color:C.text2, fontSize:"0.78rem", fontStyle:"italic", marginTop:3, wordBreak:"break-word" }}>"{r.issue}"</div>}
              </div>
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <Badge status={r.status}/>
                {formatPrice(r.price) && <div style={{ color:C.green, fontWeight:800, fontSize:"0.85rem", marginTop:6 }}>{formatPrice(r.price)}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};