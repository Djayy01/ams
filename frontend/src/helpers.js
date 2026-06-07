// Constants, formatting helpers, receipt printing, and one-time DOM resources.

export const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
export const DEFAULT_AVAIL = Object.fromEntries(DAYS.map(d => [d, { on: d !== "Sunday", open: "08:00", close: "18:00" }]));
export const STEPS = ["pending","accepted","onway","done"];
export const INSTAGRAM_URL = "https://www.instagram.com/1low_nelson/";

export const formatPrice = (p) => { const n = String(p||"").replace(/[^0-9.]/g,""); return n ? "$"+n : ""; };
export const priceNum   = (p) => parseFloat(String(p||"").replace(/[^0-9.]/g,"")) || 0;
export const money      = (n) => "$"+Number(n||0).toFixed(2).replace(/\.00$/,"");
export const mapsDir    = (loc) => "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(loc || "");
export const fmtTime    = (iso) => { try { return new Date(iso).toLocaleTimeString([], {hour:"numeric", minute:"2-digit"}); } catch { return ""; } };
export const doneDate   = (r) => (r.statusTimes && r.statusTimes.done) ? new Date(r.statusTimes.done) : new Date(r.submittedAt);
export const ymd        = (d) => { const x=new Date(d); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}-${String(x.getDate()).padStart(2,"0")}`; };
export const net        = (r) => priceNum(r.price) + priceNum(r.tip) - priceNum(r.cost);

const escapeHtml = (s) => String(s==null?"":s).replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));

// Open a clean, printable receipt in a new window (browser print dialog → save as PDF).
export const printReceipt = (req, bizName) => {
  const dateStr = new Date((req.statusTimes && req.statusTimes.done) || req.submittedAt).toLocaleString();
  const svc = priceNum(req.price), tip = priceNum(req.tip), total = svc + tip;
  const line = (label, val) => `<tr><td>${escapeHtml(label)}</td><td style="text-align:right">${money(val)}</td></tr>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Receipt #${req.id} — ${escapeHtml(bizName)}</title>
    <style>
      *{box-sizing:border-box} body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#152840;max-width:520px;margin:24px auto;padding:0 20px}
      .h{text-align:center;border-bottom:2px solid #2563eb;padding-bottom:14px;margin-bottom:18px}
      .h .b{font-size:1.6rem;font-weight:800;letter-spacing:.04em;color:#2563eb}
      .h .s{font-size:.8rem;color:#5f7691;text-transform:uppercase;letter-spacing:.1em;margin-top:2px}
      .tag{display:inline-block;margin-top:10px;font-size:.85rem;font-weight:700;letter-spacing:.18em;color:#5f7691}
      .row{display:flex;justify-content:space-between;font-size:.86rem;margin:4px 0;color:#5f7691}
      .row b{color:#152840;font-weight:600}
      table{width:100%;border-collapse:collapse;margin-top:16px;font-size:.92rem}
      td{padding:8px 0;border-bottom:1px solid #e7eef8}
      .total td{border-top:2px solid #152840;border-bottom:none;font-weight:800;font-size:1.05rem;padding-top:10px}
      .f{text-align:center;color:#5f7691;font-size:.82rem;margin-top:24px}
      @media print{body{margin:0}}
    </style></head><body>
    <div class="h"><div class="b">${escapeHtml(bizName||"AMS")}</div><div class="s">Mobile Mechanic &amp; Towing</div><div class="tag">RECEIPT</div></div>
    <div class="row"><span>Receipt #</span><b>${req.id}</b></div>
    <div class="row"><span>Date</span><b>${escapeHtml(dateStr)}</b></div>
    <div class="row"><span>Customer</span><b>${escapeHtml(req.name)}</b></div>
    <div class="row"><span>Phone</span><b>${escapeHtml(req.phone)}</b></div>
    <div class="row"><span>Vehicle</span><b>${escapeHtml(`${req.year} ${req.make} ${req.model}`)}</b></div>
    <div class="row"><span>Service</span><b>${escapeHtml(req.svc)}</b></div>
    ${req.issue ? `<div class="row"><span>Notes</span><b>${escapeHtml(req.issue)}</b></div>` : ""}
    <table>
      ${line(req.svc + " service", svc)}
      ${tip>0 ? line("Tip", tip) : ""}
      <tr class="total"><td>Total</td><td style="text-align:right">${money(total)}</td></tr>
    </table>
    <div class="f">Thank you for your business!</div>
    <script>window.onload=function(){setTimeout(function(){window.print();},300);};<\/script>
    </body></html>`;
  let w = null;
  try { w = window.open("", "_blank"); } catch { w = null; }
  if (w) { w.document.open(); w.document.write(html); w.document.close(); }
  else {
    const blob = new Blob([html], { type:"text/html" });
    window.open(URL.createObjectURL(blob), "_blank");
  }
};

/*
  Favicon / tab icon — original inline SVG, no external request (nothing to break on Render).
  Drawn in the spirit of the free Flaticon "car service" / auto icon.
  Credit (per Flaticon free license — kept in code, NOT shown to customers):
    Car service icons created by wanicon — Flaticon
    https://www.flaticon.com/free-icons/car-service
*/
const FAVICON_SVG =
`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs><linearGradient id="amsfav" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#2563eb"/><stop offset="1" stop-color="#0ea5e9"/>
  </linearGradient></defs>
  <rect width="64" height="64" rx="15" fill="url(#amsfav)"/>
  <path d="M11 39c0-1 .6-2 1.6-2.4l3-1.2 3.1-6.6C19.3 27.3 20.5 26 22 26h20c1.5 0 2.7 1.3 3.3 2.8l3.1 6.6 3 1.2c1 .4 1.6 1.4 1.6 2.4v3.5c0 .8-.7 1.5-1.5 1.5H12.5c-.8 0-1.5-.7-1.5-1.5z" fill="#fff"/>
  <path d="M23 28.5h18l2 5H21z" fill="url(#amsfav)"/>
  <circle cx="22" cy="44" r="4.5" fill="url(#amsfav)" stroke="#fff" stroke-width="2.5"/>
  <circle cx="42" cy="44" r="4.5" fill="url(#amsfav)" stroke="#fff" stroke-width="2.5"/>
</svg>`;

// Inject font, viewport, favicon, and global CSS once on startup.
export const injectResources = () => {
  if (!document.getElementById("ws-font")) {
    const l = document.createElement("link");
    l.id = "ws-font"; l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;600;700;800;900&display=swap";
    document.head.appendChild(l);
  }
  if (!document.querySelector('meta[name="viewport"]')) {
    const v = document.createElement("meta");
    v.name = "viewport"; v.content = "width=device-width, initial-scale=1, viewport-fit=cover";
    document.head.appendChild(v);
  }
  if (!document.getElementById("ams-favicon")) {
    document.querySelectorAll("link[rel~='icon']").forEach(el => el.parentNode && el.parentNode.removeChild(el));
    const fav = document.createElement("link");
    fav.id = "ams-favicon"; fav.rel = "icon"; fav.type = "image/svg+xml";
    fav.href = "data:image/svg+xml," + encodeURIComponent(FAVICON_SVG);
    document.head.appendChild(fav);
  }
  if (!document.getElementById("ams-global")) {
    const s = document.createElement("style");
    s.id = "ams-global";
    s.textContent = `
      * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
      html, body, #root { margin: 0; padding: 0; overflow-x: hidden; background: #0e3f63; }
      body { display: block; min-width: 0; }
      #root { width: 100%; max-width: none; }
      input, textarea, button { font-family: 'Work Sans', system-ui, sans-serif; }
      input[type="time"], input[type="datetime-local"], input[type="date"] { color-scheme: light; }
      input:focus, textarea:focus { border-color: #2563eb !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.18) !important; }
      html { scrollbar-width: none; -ms-overflow-style: none; }
      ::-webkit-scrollbar { width: 0; height: 0; display: none; }
      .ams-scroll { overflow-y: auto; }

      .ams-aurora {
        background:
          radial-gradient(45% 45% at 18% 22%, rgba(56,189,248,0.55), transparent 62%),
          radial-gradient(45% 45% at 82% 18%, rgba(16,185,129,0.50), transparent 62%),
          radial-gradient(50% 50% at 72% 82%, rgba(125,211,252,0.42), transparent 65%),
          radial-gradient(55% 55% at 26% 80%, rgba(37,99,235,0.55), transparent 65%),
          linear-gradient(155deg, #123a6b 0%, #0e5a7a 45%, #0c6b5d 75%, #103f72 100%);
        background-size: 180% 180%, 180% 180%, 180% 180%, 180% 180%, 100% 100%;
        background-position: 0% 50%, 100% 50%, 50% 100%, 50% 0%, 0 0;
        animation: amsAurora 22s ease-in-out infinite;
      }
      @keyframes amsAurora {
        0%, 100% { background-position: 0% 50%, 100% 50%, 50% 100%, 50% 0%, 0 0; }
        50%      { background-position: 100% 50%, 0% 50%, 50% 0%, 50% 100%, 0 0; }
      }
      @media (prefers-reduced-motion: reduce) { .ams-aurora { animation: none; } }
    `;
    document.head.appendChild(s);
  }
};