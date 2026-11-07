// What makes the overview page one long pitch: the headline fitted to the column, the run line and
// ball that follow the scroll into the far goal, and the floodlit stretch of the night shift.
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";

const SAMPLES = 420;
const BALL_AT = 0.62; // where the ball rides in the window while scrolling
const GUTTER = 42;
const MIN_WIDTH = 1180; // narrower screens have no margin for the line to run in
const FAR_BOX_RUN_IN = 118;

const smooth = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

// Sets each line's width axis so all of them fill the same measure. Once the face has loaded the
// lines ease out from narrow (landing.css): the headline itself gets rebuilt.
export function useFittedLines(ref: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const box = ref.current;
    if (!box) return;
    const lines = [...box.querySelectorAll<HTMLElement>("[data-fit]")];
    const set = (el: HTMLElement, wdth: number) => {
      el.style.fontVariationSettings = `"wdth" ${wdth}`;
    };
    const fit = () => {
      const target = box.clientWidth;
      for (const line of lines) {
        let lo = 50;
        let hi = 150;
        for (let i = 0; i < 9; i++) {
          const mid = (lo + hi) / 2;
          set(line, mid);
          if (line.getBoundingClientRect().width > target) hi = mid;
          else lo = mid;
        }
        set(line, lo);
      }
    };
    fit();
    void document.fonts?.ready.then(() => {
      fit();
      box.dataset.fitted = "";
    });
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    return () => ro.disconnect();
  }, [ref]);
}

interface Track {
  width: number;
  height: number;
  d: string;
  length: number;
  table: { len: number; x: number; y: number }[];
}

// Stays in the side margins beside each section and crosses the pitch only in the gaps between
// sections, like a long pass, so it never runs through text
function layOut(pitch: HTMLElement, path: SVGPathElement): Track | null {
  const width = pitch.clientWidth;
  const height = pitch.scrollHeight;
  const start = pitch.querySelector<HTMLElement>("[data-kickoff]");
  const end = pitch.querySelector<HTMLElement>("[data-goal]");
  const box = pitch.querySelector<HTMLElement>("[data-far-box]");
  if (!start || !end || !box) return null;
  const origin = pitch.getBoundingClientRect();
  const centre = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    return { x: r.left - origin.left + r.width / 2, y: r.top - origin.top + r.height / 2 };
  };
  const zones = [...pitch.querySelectorAll<HTMLElement>("[data-zone]")];
  const left = Math.max(GUTTER, (width - 1280) / 2 - 8);
  const first = centre(start);
  const goal = centre(end);
  let d = `M${first.x} ${first.y}`;
  let at = first;
  const sweep = (x: number, y: number) => {
    const mid = (y - at.y) * 0.5;
    d += `C${at.x} ${at.y + mid} ${x} ${y - mid} ${x} ${y}`;
    at = { x, y };
  };
  zones.forEach((z, i) => {
    const r = z.getBoundingClientRect();
    const pad = parseFloat(getComputedStyle(z).paddingTop);
    const x = i % 2 ? left : width - left;
    sweep(x, r.top - origin.top + pad * 0.55);
    const leave = r.bottom - origin.top - pad * 0.55;
    d += `L${x} ${leave}`;
    at = { x, y: leave };
  });
  // Down the empty side of the far box, then across under the bibs and into the net
  const side = at.x;
  const turn = box.getBoundingClientRect().bottom - origin.top - FAR_BOX_RUN_IN;
  d += `L${side} ${turn}`;
  d += `C${side} ${goal.y} ${goal.x + (side - goal.x) * 0.3} ${turn + 10} ${goal.x} ${goal.y}`;
  path.setAttribute("d", d);
  const length = path.getTotalLength();
  const table = Array.from({ length: SAMPLES + 1 }, (_, i) => {
    const len = (length * i) / SAMPLES;
    const point = path.getPointAtLength(len);
    return { len, x: point.x, y: point.y };
  });
  return { width, height, d, length, table };
}

export function RunLine({ pitch, night, clock }: { pitch: RefObject<HTMLElement | null>; night: RefObject<HTMLElement | null>; clock: RefObject<HTMLElement | null> }) {
  const svg = useRef<SVGSVGElement>(null);
  const path = useRef<SVGPathElement>(null);
  const ball = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(() => window.innerWidth >= MIN_WIDTH);

  useEffect(() => {
    const onResize = () => setWide(window.innerWidth >= MIN_WIDTH);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const el = pitch.current;
    if (!el) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const how = el.querySelector<HTMLElement>("#how");
    let track: Track | null = null;
    let frame = 0;
    let scored = false;

    const paint = () => {
      frame = 0;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const y = window.scrollY;
      const done = Math.min(1, y / max);

      // Dusk falls as the night shift comes up the page, and dawn after it
      if (night.current && how) {
        const r = how.getBoundingClientRect();
        const top = r.top + y;
        const vh = window.innerHeight;
        // On a tall screen the section is already in view at the top: the hero still starts in daylight
        const from = Math.max(40, top - vh * 0.9);
        const dusk = smooth(from, Math.max(from + 240, top - vh * 0.1), y);
        const dawn = 1 - smooth(top + r.height - vh * 0.75, top + r.height - vh * 0.05, y);
        night.current.style.opacity = String(Math.min(dusk, dawn));
      }
      // A ninety-minute match, with the page as the clock
      if (clock.current) clock.current.textContent = `${Math.round(done * 90)}'`;

      if (!track || !svg.current || !path.current || !ball.current) return;
      const origin = el.getBoundingClientRect().top + y;
      const endY = track.table[SAMPLES].y;
      const endAt = (endY + origin - max) / window.innerHeight + 0.02;
      const at = BALL_AT + (endAt - BALL_AT) * smooth(0.86, 1, done);
      const want = still ? endY : y - origin + window.innerHeight * at;
      let lo = 0;
      let hi = SAMPLES;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (track.table[mid].y < want) lo = mid + 1;
        else hi = mid;
      }
      const p = track.table[lo];
      path.current.style.strokeDashoffset = String(track.length - p.len);
      ball.current.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${p.len * 0.9}deg)`;
      const hit = p.len >= track.length * 0.998;
      if (hit !== scored) {
        scored = hit;
        el.toggleAttribute("data-scored", hit);
      }
    };
    const queue = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const measure = () => {
      if (wide && path.current && svg.current) {
        track = layOut(el, path.current);
        if (track) {
          svg.current.setAttribute("viewBox", `0 0 ${track.width} ${track.height}`);
          svg.current.style.height = `${track.height}px`;
          path.current.style.strokeDasharray = String(track.length);
        }
      } else {
        track = null;
      }
      queue();
    };

    measure();
    window.addEventListener("scroll", queue, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      window.removeEventListener("scroll", queue);
      ro.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [pitch, night, clock, wide]);

  if (!wide) return null;
  return (
    <div className="lp-run" aria-hidden>
      <svg ref={svg} width="100%" fill="none">
        <path ref={path} className="lp-run-line" />
      </svg>
      <div ref={ball} className="lp-ball">
        <svg viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="18" fill="#fbfbf4" stroke="#0a2a1e" strokeWidth="2" />
          <path d="M20 12l7.6 5.5-2.9 8.9h-9.4l-2.9-8.9z" fill="#0a2a1e" />
          <path d="M20 12V3M27.6 17.5l8.6-2.8M24.7 26.4l5.3 7.3M15.3 26.4l-5.3 7.3M12.4 17.5l-8.6-2.8" stroke="#0a2a1e" strokeWidth="2" />
        </svg>
      </div>
    </div>
  );
}
