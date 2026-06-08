import { useState, useEffect, useCallback, useRef } from "react";
import { api, getAlerts, setAlertsLS } from "./api";

// Owns the request list: initial load, 8s polling, optimistic patch,
// and the audible/desktop alert when a new pending job arrives.
export function useRequests({ bizName, onLogout }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [alertsOn, setAlertsOn] = useState(getAlerts);

  const audioRef = useRef(null);
  const alertsRef = useRef(alertsOn);
  const firstLoad = useRef(true);
  const lastMaxId = useRef(0);
  const bizRef = useRef(bizName);
  useEffect(() => { alertsRef.current = alertsOn; }, [alertsOn]);
  useEffect(() => { bizRef.current = bizName; }, [bizName]);

  const beep = () => { const ctx = audioRef.current; if (!ctx) return; try {
    const mk = (freq, start, dur) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.type = "sine"; o.frequency.value = freq; const t0 = ctx.currentTime + start; g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.3, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); o.start(t0); o.stop(t0 + dur + 0.02); };
    mk(880, 0, 0.25); mk(1175, 0.18, 0.3);
  } catch {} };

  const enableAlerts = () => {
    try { const AC = window.AudioContext || window.webkitAudioContext; if (AC) { if (!audioRef.current) audioRef.current = new AC(); if (audioRef.current.state === "suspended") audioRef.current.resume(); } } catch {}
    if (typeof Notification !== "undefined" && Notification.permission === "default") { try { Notification.requestPermission(); } catch {} }
    setAlertsOn(true); setAlertsLS(true); beep();
  };
  const disableAlerts = () => { setAlertsOn(false); setAlertsLS(false); };
  const notifyNew = (r) => { beep(); try { if (typeof Notification !== "undefined" && Notification.permission === "granted") { new Notification("New service request — " + (bizRef.current || "AMS"), { body: `${r.name} · ${r.svc} · ${r.loc}`, tag: "ams-" + r.id }); } } catch {} };

  const authApi = useCallback(async (path, opts = {}) => {
    try { return await api(path, { ...opts, auth: true }); }
    catch (e) { if (e.status === 401) onLogout(); throw e; }
  }, [onLogout]);

  const loadRequests = useCallback(async () => {
    try { const list = await authApi("/api/requests"); setRequests(list); setErr(""); }
    catch (e) { if (e.status !== 401) setErr(e.message); }
    finally { setLoading(false); }
  }, [authApi]);

  useEffect(() => { loadRequests(); const iv = setInterval(loadRequests, 8000); return () => clearInterval(iv); }, [loadRequests]);

  useEffect(() => {
    if (loading) return;
    const ids = requests.map(r => r.id);
    const maxId = ids.length ? Math.max(...ids) : 0;
    if (firstLoad.current) { firstLoad.current = false; lastMaxId.current = maxId; return; }
    if (alertsRef.current) {
      const fresh = requests.filter(r => r.id > lastMaxId.current && r.status === "pending");
      if (fresh.length) notifyNew(fresh[0]);
    }
    if (maxId > lastMaxId.current) lastMaxId.current = maxId;
  }, [requests, loading]); // eslint-disable-line

  const patchRequest = async (id, body) => {
    setBusyId(id);
    try { const updated = await authApi("/api/requests/" + id, { method: "PATCH", body });
      setRequests(rs => rs.map(r => r.id === id ? updated : r)); setErr(""); return updated; }
    catch (e) { if (e.status !== 401) setErr(e.message); throw e; }
    finally { setBusyId(null); }
  };

  return { requests, loading, err, setErr, busyId, patchRequest, loadRequests, alertsOn, enableAlerts, disableAlerts };
}