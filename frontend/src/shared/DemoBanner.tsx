import { useEffect, useRef } from "react";
import { DEMO } from "./api";

// Shown on the static demo website: everything runs in the browser on synthetic data.
export function DemoBanner() {
  const ref = useRef<HTMLDivElement>(null);
  // Its height, so the full-height side columns end at the bottom of the window instead of below it
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = document.documentElement.style;
    const ro = new ResizeObserver(() => root.setProperty("--banner-h", `${el.offsetHeight}px`));
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.removeProperty("--banner-h");
    };
  }, []);
  if (!DEMO) return null;
  async function reset() {
    const { resetDemo } = await import("./demo");
    resetDemo();
  }
  return (
    <div ref={ref} role="note" className="bg-pitch-950 px-3 py-1 text-center text-[13px] font-semibold text-[#f7f8f1]">
      Demo with synthetic data. It runs in your browser and nothing is sent anywhere.{" "}
      <button className="underline" onClick={reset}>
        Reset demo
      </button>{" "}
      <a className="ml-1 underline" href="https://github.com/bachcodingg/path_to_pro">
        Source
      </a>
    </div>
  );
}
