// API base + network helper + localStorage utilities.

export const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL) ||
  "http://localhost:5000";

export const getToken = () => { try { return localStorage.getItem("ams-token") || ""; } catch { return ""; } };
export const setToken = (t) => { try { t ? localStorage.setItem("ams-token", t) : localStorage.removeItem("ams-token"); } catch {} };
export const getLang  = () => { try { return localStorage.getItem("ams-lang") || "en"; } catch { return "en"; } };
export const setLangLS = (l) => { try { localStorage.setItem("ams-lang", l); } catch {} };
export const getSavedCustomer = () => { try { return JSON.parse(localStorage.getItem("ams-customer") || "{}") || {}; } catch { return {}; } };
export const saveCustomer = (c) => { try { localStorage.setItem("ams-customer", JSON.stringify(c)); } catch {} };
export const clearSavedCustomer = () => { try { localStorage.removeItem("ams-customer"); } catch {} };
export const getAlerts = () => { try { return localStorage.getItem("ams-alerts") === "1"; } catch { return false; } };
export const setAlertsLS = (on) => { try { on ? localStorage.setItem("ams-alerts","1") : localStorage.removeItem("ams-alerts"); } catch {} };

export async function api(path, { method = "GET", body, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) headers.Authorization = `Bearer ${getToken()}`;
  const res = await fetch(API_BASE + path, { method, headers, ...(body && { body: JSON.stringify(body) }) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}