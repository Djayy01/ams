// React contexts + hooks for responsive layout and language.

import { createContext, useContext, useState, useEffect } from "react";

export const MobileCtx = createContext(false);
export const useMobile = () => useContext(MobileCtx);

export function useIsMobile(bp = 640) {
  const get = () => (typeof window !== "undefined" ? window.innerWidth < bp : false);
  const [m, setM] = useState(get);
  useEffect(() => {
    let raf;
    const fn = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => setM(get())); };
    window.addEventListener("resize", fn);
    return () => { window.removeEventListener("resize", fn); cancelAnimationFrame(raf); };
  }, [bp]);
  return m;
}

export const LangCtx = createContext({ lang: "en", setLang: () => {}, t: (k) => k });
export const useLang = () => useContext(LangCtx);