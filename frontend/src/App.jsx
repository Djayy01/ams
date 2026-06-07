/*
  AMS — Mobile Mechanic & Towing  ::  Root component
  Deploy: git add . && git commit -m "dark mode" && git push
*/

import { useState, useEffect, useCallback } from "react";
import { api, setToken, getLang, setLangLS, getTheme, setThemeLS } from "./api";
import { C } from "./theme";
import { STR } from "./translations";
import { DEFAULT_AVAIL, injectResources } from "./helpers";
import { LangCtx, MobileCtx, useIsMobile } from "./contexts";
import { AuroraBackground, Nav, ErrorBar } from "./components/ui";
import { CustomerForm } from "./components/CustomerForm";
import { Lookup } from "./components/Lookup";
import { Confirmation } from "./components/Confirmation";
import { Login } from "./components/Login";
import { Dashboard } from "./components/Dashboard";

export default function App() {
  const isMobile = useIsMobile(640);
  const [lang, setLangState] = useState(getLang);
  const setLang = (l) => { setLangState(l); setLangLS(l); };
  const t = useCallback((k) => (STR[lang] && STR[lang][k]) || STR.en[k] || k, [lang]);

  const [view, setView] = useState("customer");
  const [bizName, setBizName] = useState("AMS");
  const [availability, setAvailability] = useState(DEFAULT_AVAIL);
  const [busy, setBusy] = useState(false);
  const [blockedDates, setBlockedDates] = useState([]);
  const [activeReq, setActiveReq] = useState(null);
  const [globalErr, setGlobalErr] = useState("");
  const [dark, setDark] = useState(() => getTheme() === "dark");

  const toggleDark = () => setDark(d => { const n = !d; setThemeLS(n ? "dark" : "light"); return n; });

  useEffect(() => {
    injectResources();
    (async () => {
      try {
        const [settings, avail] = await Promise.all([api("/api/settings"), api("/api/availability")]);
        if (settings?.bizName) setBizName(settings.bizName);
        if (typeof settings?.busy === "boolean") setBusy(settings.busy);
        if (Array.isArray(settings?.blockedDates)) setBlockedDates(settings.blockedDates);
        if (avail) setAvailability(avail);
      } catch {
        setGlobalErr("Couldn't reach the server. Make sure the backend is running.");
      }
    })();
  }, []);

  useEffect(() => { document.title = `${bizName} — ${t("tagline")}`; }, [bizName, t]);

  const handleSubmit = async (formData) => {
    const created = await api("/api/requests", { method: "POST", body: formData });
    setActiveReq(created);
    setView("confirm");
  };
  const handleLogin = async (password) => {
    const { token } = await api("/api/login", { method: "POST", body: { password } });
    setToken(token);
    setView("dashboard");
  };
  const handleLogout = () => { setToken(""); setView("customer"); };
  const handleAvailability = async (next) => {
    setAvailability(next);
    try { await api("/api/availability", { method: "PUT", body: next, auth: true }); }
    catch (e) { if (e.status === 401) handleLogout(); }
  };
  const handleBizName = async (name) => {
    const res = await api("/api/settings/business-name", { method: "PUT", body: { bizName: name }, auth: true });
    setBizName(res.bizName);
  };
  const handleBusy = async (next) => {
    setBusy(next);
    try { await api("/api/settings/busy", { method: "PUT", body: { busy: next }, auth: true }); }
    catch (e) { if (e.status === 401) handleLogout(); }
  };
  const handleBlockedDates = async (dates) => {
    setBlockedDates(dates);
    try { const res = await api("/api/settings/blocked-dates", { method: "PUT", body: { dates }, auth: true }); if (Array.isArray(res?.blockedDates)) setBlockedDates(res.blockedDates); }
    catch (e) { if (e.status === 401) handleLogout(); }
  };
  const handleChangePassword = async (current, nw) => {
    await api("/api/change-password", { method: "POST", body: { current, new: nw }, auth: true });
  };

  return (
    <LangCtx.Provider value={{ lang, setLang, t }}>
      <MobileCtx.Provider value={isMobile}>
        <div data-theme={view === "dashboard" && dark ? "dark" : "light"} style={{ minHeight: "100vh", fontFamily: "'Work Sans',system-ui,sans-serif", color: C.text, position: "relative", background: "#0e3f63" }}>
          <AuroraBackground />
          <div style={{ position: "relative", zIndex: 1, paddingBottom: isMobile ? "calc(56px + env(safe-area-inset-bottom))" : 80 }}>
            <Nav bizName={bizName} isMech={view === "dashboard"} onMechClick={() => setView("login")} />
            {globalErr && view === "customer" && (
              <div style={{ maxWidth: 600, margin: "14px auto 0", padding: "0 16px" }}><ErrorBar msg={globalErr} onClose={() => setGlobalErr("")} /></div>
            )}
            {view === "customer" && <CustomerForm availability={availability} busy={busy} blockedDates={blockedDates} onSubmit={handleSubmit} onTrack={() => setView("lookup")} />}
            {view === "lookup" && <Lookup onBack={() => setView("customer")} />}
            {view === "confirm" && activeReq && <Confirmation initialReq={activeReq} callback={busy} onNew={() => { setActiveReq(null); setView("customer"); }} />}
            {view === "login" && <Login onLogin={handleLogin} onBack={() => setView("customer")} />}
            {view === "dashboard" && <Dashboard availability={availability} onAvailability={handleAvailability} bizName={bizName} onBizName={handleBizName} onChangePassword={handleChangePassword} onLogout={handleLogout} busy={busy} onBusy={handleBusy} blockedDates={blockedDates} onBlockedDates={handleBlockedDates} dark={dark} onToggleDark={toggleDark} />}
          </div>
        </div>
      </MobileCtx.Provider>
    </LangCtx.Provider>
  );
}