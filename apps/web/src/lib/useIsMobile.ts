import { useEffect, useState } from "react";

// Tailwind's `md` breakpoint (768px) — matches the CSS `md:hidden` cutoff
// used throughout the layout (BottomNav, MobileHeader) for anything that
// also needs the answer in JS (e.g. a default collapsed/expanded state).
const QUERY = "(max-width: 767px)";

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => (typeof window === "undefined" ? false : window.matchMedia(QUERY).matches));

  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
