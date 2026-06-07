import { useState } from "react";
import { C, fieldStyle } from "../theme";
import { P, Ico } from "../icons";
import { formatPrice, priceNum, money, mapsDir, printReceipt } from "../helpers";
import { Card, Btn, Lbl, MapEmbed, Badge } from "./ui";

export const ReqCard = ({ req, onPatch, busyId, repeat, onHistory }) => {
  const [showMap,setShowMap]=useState(false);
  const [showAdmin,setShowAdmin]=useState(false);
  const [noteDraft,setNoteDraft]=useState(req.notes||"");
  const [priceDraft,setPriceDraft]=useState(req.price||"");
  const [tipDraft,setTipDraft]=useState(req.tip||"");
  const [costDraft,setCostDraft]=useState(req.cost||"");
  const [savingAdmin,setSavingAdmin]=useState(false);
  const [etaOpen,setEtaOpen]=useState(false);
  const [etaDraft,setEtaDraft]=useState(req.eta||"");
  const [etaBusy,setEtaBusy]=useState(false);
  const active=["pending","accepted","onway"].includes(req.status);
  const closed=["done","dismissed","cancelled"].includes(req.status);
  const svcCol = req.svc==="Towing" ? C.blue : C.sky;
  const busy = busyId === req.id;
  const priceText = formatPrice(req.price);
  const showReceipt = priceNum(req.price)>0 || req.status==="done";
  const profitPreview = priceNum(priceDraft)+priceNum(tipDraft)-priceNum(costDraft);

  const saveAdmin = async () => {
    setSavingAdmin(true);
    try { await onPatch(req.id, { notes:noteDraft, price:priceDraft.replace(/[^0-9.]/g,""), tip:tipDraft.replace(/[^0-9.]/g,""), cost:costDraft.replace(/[^0-9.]/g,"") }); setShowAdmin(false); }
    catch {} finally { setSavingAdmin(false); }
  };
  const startOnway = async () => { setEtaBusy(true); try { await onPatch(req.id, { status:"onway", eta:etaDraft }); setEtaOpen(false); } catch {} finally { setEtaBusy(false); } };
  const saveEta    = async () => { setEtaBusy(true); try { await onPatch(req.id, { eta:etaDraft }); setEtaOpen(false); } catch {} finally { setEtaBusy(false); } };

  const moneyInput = (label, val, setVal) => (
    <div style={{ flex:1, minWidth:90 }}>
      <Lbl style={{ marginBottom:5 }}>{label}</Lbl>
      <div style={{ display:"flex", alignItems:"center", gap:5 }}>
        <span style={{ color:C.text2, fontWeight:800, fontSize:"0.95rem" }}>$</span>
        <input value={val} onChange={e=>setVal(e.target.value)} placeholder="0" inputMode="decimal" style={{ ...fieldStyle, padding:"9px 10px" }}/>
      </div>
    </div>
  );

  return (
    <Card accent={active}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10, gap:8 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:0 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:`${svcCol}14`, border:`1px solid ${svcCol}33`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Ico d={P[req.svc==="Towing"?"tow":"wrench"]} size={17} color={svcCol}/></div>
          <div style={{ minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, minWidth:0 }}>
              <div style={{ color:C.text, fontWeight:800, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{req.name}</div>
              {repeat>1 && <button onClick={()=>onHistory(req.phone, req.name)} style={{ background:`${C.amber}1f`, color:C.amberD, border:`1px solid ${C.amber}55`, borderRadius:5, padding:"1px 6px", fontSize:"0.6rem", fontWeight:800, whiteSpace:"nowrap", flexShrink:0, cursor:"pointer" }}>★ x{repeat}</button>}
            </div>
            <div style={{ color:svcCol, fontSize:"0.68rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em" }}>{req.svc}</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
          {priceText && <span style={{ background:`${C.green}1a`, color:C.green, border:`1px solid ${C.green}40`, borderRadius:6, padding:"2px 8px", fontSize:"0.78rem", fontWeight:800 }}>{priceText}</span>}
          <Badge status={req.status}/>
        </div>
      </div>
      <div style={{ background:`${C.blue}0d`, border:`1px solid ${C.blue}20`, borderRadius:9, padding:"7px 11px", marginBottom:10, display:"inline-flex", alignItems:"center", gap:7 }}><Ico d={P.car} size={13} color={C.blue}/><span style={{ color:C.blue, fontWeight:700, fontSize:"0.85rem" }}>{req.year} {req.make} {req.model}</span></div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
        <div style={{ minWidth:0 }}><Lbl icon="phone">Phone</Lbl><a href={"tel:"+req.phone} style={{ color:C.blue, fontSize:"0.85rem", fontWeight:600, textDecoration:"none", wordBreak:"break-word" }}>{req.phone}</a></div>
        <div style={{ minWidth:0 }}>
          <Lbl icon="loc">Location</Lbl>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ color:C.text, fontSize:"0.85rem", flex:1, minWidth:0, wordBreak:"break-word" }}>{req.loc}</div>
            <button onClick={()=>setShowMap(v=>!v)} style={{ background:showMap?`${C.blue}14`:"transparent", border:"none", cursor:"pointer", padding:5, borderRadius:6, flexShrink:0 }}><Ico d={P.map} size={15} color={showMap?C.blue:C.text3}/></button>
          </div>
          {showMap&&<MapEmbed location={req.loc}/>}
        </div>
        {req.urg==="Scheduled"&&req.schedTime&&<div style={{ gridColumn:"1/-1" }}><Lbl icon="cal">Scheduled</Lbl><div style={{ color:C.amberD, fontSize:"0.85rem", fontWeight:700 }}>{new Date(req.schedTime).toLocaleString()}</div></div>}
      </div>
      {req.issue&&<div style={{ color:C.text2, fontSize:"0.83rem", marginBottom:10, fontStyle:"italic", padding:"9px 11px", background:C.surface2, borderRadius:8 }}>"{req.issue}"</div>}
      {req.notes&&!showAdmin&&<div style={{ color:C.text2, fontSize:"0.8rem", marginBottom:10, padding:"9px 11px", background:`${C.amber}10`, border:`1px solid ${C.amber}33`, borderRadius:8, display:"flex", gap:7, alignItems:"flex-start" }}><Ico d={P.edit} size={12} color={C.amberD} style={{marginTop:2,flexShrink:0}}/><span style={{ wordBreak:"break-word" }}>{req.notes}</span></div>}
      <div style={{ color:C.text3, fontSize:"0.7rem", marginBottom:12, display:"flex", alignItems:"center", gap:5 }}><Ico d={P.clock} size={11} color={C.text3}/>Submitted {new Date(req.submittedAt).toLocaleString()}</div>

      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom: showAdmin?12:8 }}>
        <Btn small outline href={mapsDir(req.loc)} target="_blank" icon="nav">Directions</Btn>
        <Btn small outline color={C.text2} onClick={()=>setShowAdmin(v=>!v)} icon="edit">Notes / Money</Btn>
        {showReceipt && <Btn small outline color={C.blue} onClick={()=>printReceipt(req, "AMS")} icon="receipt">Receipt</Btn>}
        {req.status!=="dismissed" && <Btn small outline color={C.text2} onClick={()=>onPatch(req.id,{status:"dismissed"})} icon="close" disabled={busy}>Dismiss</Btn>}
      </div>

      {showAdmin && (
        <div style={{ background:C.surface2, border:`1px solid ${C.border}`, borderRadius:10, padding:"12px", marginBottom:12 }}>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:10 }}>
            {moneyInput("Price", priceDraft, setPriceDraft)}
            {moneyInput("Tip", tipDraft, setTipDraft)}
            {moneyInput("Cost", costDraft, setCostDraft)}
          </div>
          <div style={{ fontSize:"0.78rem", color:C.text2, marginBottom:10, fontWeight:600 }}>Profit: <span style={{ color: profitPreview<0?C.red:C.green, fontWeight:800 }}>{profitPreview<0?"-":""}{money(Math.abs(profitPreview))}</span> <span style={{ color:C.text3, fontWeight:500 }}>(price + tip − cost)</span></div>
          <Lbl>Private Notes</Lbl>
          <textarea value={noteDraft} onChange={e=>setNoteDraft(e.target.value)} placeholder="Parts needed, gate code, follow-up…" style={{ ...fieldStyle, resize:"vertical", minHeight:60, marginBottom:8 }}/>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, flexWrap:"wrap" }}>
            <span style={{ color:C.text3, fontSize:"0.7rem", display:"flex", alignItems:"center", gap:5 }}><Ico d={P.lock} size={11} color={C.text3}/>Mechanic only — customers never see this</span>
            <Btn small onClick={saveAdmin} icon="check" disabled={savingAdmin}>{savingAdmin?"Saving…":"Save"}</Btn>
          </div>
        </div>
      )}

      {req.status==="pending"&&<div style={{ display:"flex", gap:8, flexWrap:"wrap" }}><Btn small onClick={()=>onPatch(req.id,{status:"accepted"})} icon="check" disabled={busy}>Accept</Btn></div>}

      {req.status==="accepted"&&(
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
            <Btn small color={C.sky} onClick={()=>onPatch(req.id,{status:"onway"})} icon="tow" disabled={busy}>On the Way</Btn>
            {!etaOpen && <button onClick={()=>{setEtaDraft(req.eta||"");setEtaOpen(true);}} style={{ background:"transparent", border:"none", color:C.blue, fontWeight:700, fontSize:"0.72rem", cursor:"pointer", textTransform:"uppercase" }}>+ Set ETA</button>}
          </div>
          {etaOpen && (
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
              <input value={etaDraft} onChange={e=>setEtaDraft(e.target.value)} placeholder="ETA e.g. ~15 min" style={{ ...fieldStyle, flex:1, minWidth:130, padding:"9px 11px" }}/>
              <Btn small color={C.sky} onClick={startOnway} icon="tow" disabled={etaBusy}>{etaBusy?"…":"Go"}</Btn>
              <Btn small outline color={C.text2} onClick={()=>setEtaOpen(false)} disabled={etaBusy}>Cancel</Btn>
            </div>
          )}
        </div>
      )}

      {req.status==="onway"&&(
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <span style={{ fontSize:"0.8rem", color:C.text2 }}><b style={{ color:C.text }}>ETA:</b> {req.eta || "not set"}</span>
            {!etaOpen && <button onClick={()=>{setEtaDraft(req.eta||"");setEtaOpen(true);}} style={{ background:"transparent", border:"none", color:C.blue, fontWeight:700, fontSize:"0.72rem", cursor:"pointer", textTransform:"uppercase" }}>Edit ETA</button>}
          </div>
          {etaOpen && (
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <input value={etaDraft} onChange={e=>setEtaDraft(e.target.value)} placeholder="e.g. ~15 min" style={{ ...fieldStyle, flex:1, minWidth:130, padding:"9px 11px" }}/>
              <Btn small onClick={saveEta} icon="check" disabled={etaBusy}>{etaBusy?"…":"Save"}</Btn>
              <Btn small outline color={C.text2} onClick={()=>setEtaOpen(false)} disabled={etaBusy}>Cancel</Btn>
            </div>
          )}
          <div><Btn small color={C.green} onClick={()=>onPatch(req.id,{status:"done"})} icon="check" disabled={busy}>Mark Done</Btn></div>
        </div>
      )}

      {closed&&<Btn small outline color={C.blue} onClick={()=>onPatch(req.id,{status:"accepted"})} icon="refresh" disabled={busy}>Reopen Job</Btn>}
    </Card>
  );
};