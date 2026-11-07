// Overview page before sign-in. The page is one long pitch seen from above: your own box at the
// top, the far goal at the bottom, and everything on it is something you would find pitch-side.
// A run line and a ball follow the scroll; the pitch goes under floodlights for the night shift.
import { CalendarCog, Check, ChevronDown, CodeXml, Cpu, Database, Eye, ShieldAlert, Smartphone, Sparkles, Target, Watch, X, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { Link, useNavigate } from "react-router-dom";
import { homeFor, useAuth } from "../shared/auth";
import { COMP_COLOR } from "../pro/context";
import { Bib } from "../shared/Bib";
import { Button, cn } from "../shared/ui";
import { RunLine, useFittedLines } from "./Pitch";
import { WeekBoard } from "./WeekBoard";
import "./landing.css";

const SOURCE = "https://github.com/bachcodingg/path_to_pro";

// Signs in with a demo account and opens its home; if demo accounts are off, the sign-in page
function useTryAs() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  async function tryAs(email: string) {
    setBusy(email);
    try {
      const u = await login(email, "demo1234");
      nav("mfaToken" in u ? "/login" : homeFor(u.role));
    } catch {
      nav("/login");
    } finally {
      setBusy(null);
    }
  }
  return { tryAs, busy };
}

export function Landing() {
  useEffect(() => {
    document.title = "PathToPro: train smart, grow safe";
  }, []);
  const pitch = useRef<HTMLElement>(null);
  const night = useRef<HTMLDivElement>(null);
  const clock = useRef<HTMLSpanElement>(null);
  return (
    <div id="landing" className="lp">
      <ChalkFilter />
      <div ref={night} className="lp-night" aria-hidden />
      <Header clock={clock} />
      <main ref={pitch} className="lp-pitch">
        <RunLine pitch={pitch} night={night} clock={clock} />
        <Hero />
        <PerimeterBoard />
        <NightShift />
        <Roles />
        <Halfway />
        <Safety />
        <Pathway />
        <ProLeagues />
        <Faq />
        <FarGoal />
      </main>
      <Footer />
    </div>
  );
}

// Roughens the edges of painted type and lines, the way chalk sits on grass
function ChalkFilter() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden>
      <filter id="chalk">
        <feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves="2" seed="4" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.8" />
      </filter>
    </svg>
  );
}

// --------------------------------------------------------------------------- header

const ANCHORS = [
  ["#how", "How it works"],
  ["#roles", "Who it's for"],
  ["#safety", "Safety"],
  ["#pro", "Pro leagues"],
  ["#faq", "Questions"],
] as const;

function Wordmark({ small }: { small?: boolean }) {
  return (
    <span className={cn("lp-wordmark", small && "is-small")}>
      <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" />
      PathToPro
    </span>
  );
}

function Header({ clock }: { clock: RefObject<HTMLSpanElement | null> }) {
  return (
    <header className="lp-header">
      <a href="#top" aria-label="PathToPro, back to the top">
        <Wordmark />
      </a>
      <nav aria-label="Sections" className="hidden items-center gap-1 lg:flex">
        {ANCHORS.map(([href, label]) => (
          <a key={href} href={href} className="lp-navlink">
            {label}
          </a>
        ))}
      </nav>
      <div className="flex items-center gap-2">
        <span ref={clock} className="lp-clock led hidden sm:block" title="Match clock: how far down the pitch you are" aria-hidden>
          0'
        </span>
        <Link to="/login" className="lp-navlink hidden sm:inline-flex">
          Sign in
        </Link>
        <Link to="/login" className="lp-btn is-small">
          Try the demo
        </Link>
      </div>
    </header>
  );
}

// --------------------------------------------------------------------------- hero

function Hero() {
  const title = useRef<HTMLHeadingElement>(null);
  useFittedLines(title);
  return (
    <section id="top" className="lp-hero">
      <div className="lp-stand-shadow" aria-hidden />
      <CornerFlag />
      <div className="lp-box">
        <span className="lp-six" aria-hidden />
        <div className="lp-hero-grid">
          <div className="lp-hero-copy">
            <h1 ref={title} className="lp-h1">
              <span data-fit>Your week,</span>
              <span data-fit>rebuilt</span>
              <span data-fit>overnight.</span>
            </h1>
            <p className="lp-lead">
              PathToPro watches each young footballer's load, growth and recovery, and rebuilds next week's plan before problems happen. Coaches approve the
              risky changes. Players always see why.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link to="/login" className="lp-btn">
                Try the live demo
              </Link>
              <a href="#how" className="lp-btn is-line">
                See how it works
              </a>
            </div>
            <p className="lp-small mt-5">For academy players aged 13 to 18, their coaches and families. Free outside an academy.</p>
          </div>
          <WeekBoard />
        </div>
        <span className="lp-spot" data-kickoff aria-hidden />
      </div>
      <svg className="lp-arc" viewBox="0 0 400 90" fill="none" aria-hidden>
        <path d="M6 0C60 112 340 112 394 0" />
      </svg>
    </section>
  );
}

function CornerFlag() {
  return (
    <svg className="lp-flag" viewBox="0 0 60 92" aria-hidden>
      <path d="M12 90 56 74" stroke="rgb(4 44 26 / .45)" strokeWidth="5" strokeLinecap="round" />
      <path d="M12 90V6" stroke="#f7f8f1" strokeWidth="4" strokeLinecap="round" />
      <path d="M14 7 46 18 14 31z" fill="#dcf24a" />
    </svg>
  );
}

// --------------------------------------------------------------------------- perimeter board

const TICKER: [LucideIcon, string, string][] = [
  [CalendarCog, "Planner", "Leon U.'s week rebuilt: load 825 AU, ACWR 1.61"],
  [ShieldAlert, "Coordinator", "Noah H. reported pain: escalated to staff, agents took no action"],
  [Target, "Development Coach", "Nico Y.: goals endurance and jump power, 4 drills picked"],
  [Eye, "Monitor", "Jan M. in the growth zone (+0.7 y from PHV): no change needed"],
  [Check, "Coach", "Approved: lighter week for Luca J., HRV -2.5 SD"],
  [CalendarCog, "Planner", "Ben Q.: match minutes capped at 45' after a load spike"],
];

// The LED board round a pitch, showing what the agents did overnight in the demo season
function PerimeterBoard() {
  const items = [...TICKER, ...TICKER];
  return (
    <div className="lp-board" aria-label="Overnight agent actions from the demo season">
      <p className="lp-board-tag">Last night</p>
      <div className="lp-board-window">
        <ul className="lp-board-crawl">
          {items.map(([Icon, who, text], i) => (
            <li key={i} aria-hidden={i >= TICKER.length}>
              <Icon className="h-4 w-4" aria-hidden />
              <b>{who}</b> {text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------- the night shift

const SHIFT: [string, string, string][] = [
  ["07:30", "Check in", "Sleep, soreness, mood and fatigue in under 30 seconds. A watch adds heart-rate variability if there is one."],
  ["02:00", "Monitor spots it", "Load spikes, short sleep, low HRV and the growth zone each become a flag, with the number behind it."],
  ["02:01", "Planner rebuilds the week", "A solver re-plans the next seven days around matches and school, inside nine hard safety rules."],
  ["07:45", "The coach decides", "A fixed policy says who approves. Small changes apply and the coach is told; bigger ones wait for a click."],
];

const POLICY: [string, string, string][] = [
  ["±1", "Effort up or down by a point", "Applied, coach told"],
  ["SWP", "A session swap or a load cut", "Coach approves"],
  ["SOS", "A safety flag, such as pain", "Staff only, agents take no action"],
];

const WORKS_WITH: [LucideIcon, string][] = [
  [Watch, "Apple Watch and Apple Health"],
  [Cpu, "OR-Tools CP-SAT solver"],
  [Database, "StatsBomb Open Data"],
  [Sparkles, "Claude, optional"],
  [Smartphone, "Installs as an app"],
];

function NightShift() {
  return (
    <section id="how" data-zone className="lp-section lp-shift">
      <span className="lp-tower is-left" aria-hidden />
      <span className="lp-tower is-right" aria-hidden />
      <div className="lp-wrap">
        <h2 className="lp-h2">One loop, every night</h2>
        <p className="lp-lead">Four agents work the night shift while the players sleep. By breakfast, tomorrow is ready and every change has its reason.</p>

        <ol className="lp-shift-list">
          {SHIFT.map(([time, title, text]) => (
            <li key={title}>
              <time className="led lp-shift-time">{time}</time>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>

        <div className="lp-shift-close">
          <blockquote className="lp-painted-quote">
            <p>Code computes. The LLM plans and explains. A fixed policy decides who approves.</p>
          </blockquote>
          <figure className="lp-subboard">
            <figcaption>Who decides when the plan changes</figcaption>
            <table>
              <tbody>
                {POLICY.map(([code, change, who]) => (
                  <tr key={code}>
                    <td className="led" aria-hidden>
                      {code}
                    </td>
                    <th scope="row">{change}</th>
                    <td>{who}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <span className="lp-subboard-grip" aria-hidden />
          </figure>
        </div>

        <ul className="lp-works">
          {WORKS_WITH.map(([Icon, label]) => (
            <li key={label}>
              <Icon className="h-4 w-4" aria-hidden /> {label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// --------------------------------------------------------------------------- roles

type RoleKey = "player" | "coach" | "family" | "physio";
const ROLES: Record<RoleKey, { tab: string; number: number; title: string; points: string[]; demo: string; demoLabel: string }> = {
  player: {
    tab: "Players",
    number: 15,
    title: "A plan that listens to your body",
    points: [
      "A readiness battery every morning from sleep, HRV and a 30-second check-in",
      "Today's session with a reason whenever the plan changed",
      "Gym and 38 ball-skill drills for your position, adjusted for your growth stage",
      "Match diary, ratings with reasons, and a player card with percentiles",
    ],
    demo: "p15@demo.pathtopro",
    demoLabel: "Try as Leon, U15",
  },
  coach: {
    tab: "Coaches",
    number: 1,
    title: "The whole squad on one screen",
    points: [
      "Dressing room: 14 days of readiness, the risky days stand out",
      "Substitution board: approve, edit or reject a plan with one key",
      "Training pitch checks a team session against every player's limits",
      "Plain-words notes: \"Keep Anton light until Thursday\" becomes a plan change",
    ],
    demo: "coach@demo.pathtopro",
    demoLabel: "Try as the coach",
  },
  family: {
    tab: "Families",
    number: 12,
    title: "Peace of mind, not surveillance",
    points: [
      "The week at a glance: sessions done, average sleep, check-in streak",
      "Consent per data type: check-in, sleep, heart rate, growth, tests",
      "Under 16, check-ins wait until a parent has linked with an invite code",
      "Academy fees and what is due, in the same place",
    ],
    demo: "guardian02@demo.pathtopro",
    demoLabel: "Try as a parent",
  },
  physio: {
    tab: "Physios",
    number: 7,
    title: "Pain goes to a person, straight away",
    points: [
      "Escalation queue: pain reports and red check-ins, oldest first",
      "The agents take no action on these: they are yours",
      "A growth-zone list of who is closest to their growth spurt",
      "Acknowledge with one click once you have spoken to the player",
    ],
    demo: "physio@demo.pathtopro",
    demoLabel: "Try as the physio",
  },
};

function Roles() {
  const [role, setRole] = useState<RoleKey>("player");
  const { tryAs, busy } = useTryAs();
  const r = ROLES[role];
  const keys = Object.keys(ROLES) as RoleKey[];
  return (
    <section id="roles" data-zone className="lp-section" data-bib={role}>
      <div className="lp-wrap">
        <h2 className="lp-h2">One app, four views</h2>
        <p className="lp-lead">Everyone around a young player sees what they need, and nothing they should not. Take a bib.</p>
        <div className="lp-rail" role="tablist" aria-label="Who it's for">
          {keys.map((k) => (
            <button key={k} role="tab" id={`tab-${k}`} data-bib={k} aria-selected={role === k} aria-controls="role-panel" onClick={() => setRole(k)} className="lp-bib">
              <Bib number={ROLES[k].number} />
              <span>{ROLES[k].tab}</span>
            </button>
          ))}
        </div>
        <div key={role} id="role-panel" role="tabpanel" aria-labelledby={`tab-${role}`} className="lp-rolepanel">
          <div>
            <h3>{r.title}</h3>
            <ul>
              {r.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <Button className="mt-6 bg-[#0a2a1e] text-[#f7f8f1] hover:bg-[#124030]" loading={busy === r.demo} disabled={!!busy} onClick={() => tryAs(r.demo)}>
              {r.demoLabel}
            </Button>
          </div>
          <div className="lp-mock">
            {role === "player" && <MiniPlayer />}
            {role === "coach" && <MiniHeatmap />}
            {role === "family" && <MiniFamily />}
            {role === "physio" && <MiniPhysio />}
          </div>
        </div>
      </div>
    </section>
  );
}

function MiniPlayer() {
  return (
    <>
      <p className="lp-mock-title">My card</p>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="lp-mock-big">68</p>
          <p className="text-sm">average percentile</p>
        </div>
        <p className="text-right text-sm">
          <b className="block text-lg">Leon U.</b>
          compared with players in their growth spurt
        </p>
      </div>
      <dl className="lp-attrs">
        {[
          ["Speed", 82],
          ["Power", 45],
          ["Endurance", 64],
        ].map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>
              <span style={{ width: `${value}%` }} />
              <b>{value}</b>
            </dd>
          </div>
        ))}
      </dl>
    </>
  );
}

// A corner of the Dressing room: tints for ready and take-care days, solid orange to recover
function MiniHeatmap() {
  const rows: [string, number[]][] = [
    ["Anton S.", [54, 82, 56, 67, 50, 35, 71]],
    ["Ben Q.", [89, 64, 49, 39, 66, 89, 85]],
    ["David W.", [40, 79, 72, 39, 70, 44, 79]],
    ["Elias O.", [57, 68, 29, 42, 38, 57, 70]],
    ["Emil L.", [67, 57, 43, 83, 49, 64, 88]],
  ];
  const cell = (v: number) => (v >= 70 ? "is-ready" : v >= 50 ? "is-care" : "is-recover");
  return (
    <>
      <p className="lp-mock-title">Dressing room</p>
      <table className="lp-heat">
        <tbody>
          {rows.map(([name, vals]) => (
            <tr key={name}>
              <th scope="row">{name}</th>
              {vals.map((v, i) => (
                <td key={i} className={cell(v)}>
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function MiniFamily() {
  return (
    <>
      <p className="lp-mock-title">Family: Noah H.</p>
      <dl className="grid grid-cols-3 gap-2">
        {[
          ["3", "sessions done"],
          ["6.7", "avg sleep (h)"],
          ["9", "check-in streak"],
        ].map(([v, l]) => (
          <div key={l}>
            <dd className="lp-mock-big">{v}</dd>
            <dt className="text-sm">{l}</dt>
          </div>
        ))}
      </dl>
      <ul className="lp-consent">
        {["Morning check-in", "Sleep duration", "Heart-rate variability"].map((l) => (
          <li key={l}>
            {l}
            <span aria-hidden />
          </li>
        ))}
      </ul>
    </>
  );
}

function MiniPhysio() {
  return (
    <>
      <p className="lp-mock-title">Physio queue</p>
      <div className="lp-alert">
        <b>Pain reported: Noah H.</b>
        <p className="text-sm">In this queue within a second of the check-in</p>
      </div>
      <p className="mt-4 font-bold">Closest to the growth spurt</p>
      <ul className="lp-phv">
        {[
          ["Leon U.", "+0.1 y"],
          ["Max N.", "-0.2 y"],
          ["Ben Q.", "+0.3 y"],
        ].map(([n, v]) => (
          <li key={n}>
            {n} <b>{v}</b>
          </li>
        ))}
      </ul>
    </>
  );
}

// The middle of the pitch, between the people and the safety rules
function Halfway() {
  return (
    <div className="lp-halfway" aria-hidden>
      <span />
    </div>
  );
}

// --------------------------------------------------------------------------- safety

// The planner's hard rules (backend/planner/model.py, H1-H9), in the players' words
const RULES = [
  "Fixtures stay where the fixture list puts them",
  "Every full week keeps a rest day",
  "The day before a match stays at effort 4 or below",
  "In the growth zone, no speed session above effort 6",
  "When load spikes, the week's total is capped",
  "No session on an exam evening",
  "Each kind of session stays inside its effort range",
  "Under 18: at most 90 match minutes over two days in a row",
  "After a pain report with no staff to decide, match minutes stay under a protective cap",
];

const COMPARE: [string, boolean, string][] = [
  ["Adapts to sleep and recovery", false, "Every night, from the morning check-in"],
  ["Knows about the growth spurt", false, "Limits jumps, sprints and heavy gym work"],
  ["Explains each change", false, "A reason with the numbers behind it"],
  ["Coach stays in charge", true, "A fixed approval policy, never the model"],
  ["Works without AI", true, "Rule-based agents when there is no API key"],
];

function Safety() {
  return (
    <section id="safety" data-zone className="lp-section">
      <div className="lp-wrap">
        <div className="lp-safety-head">
          <div>
            <h2 className="lp-h2">Growth spurt? The plan knows.</h2>
            <p className="lp-lead">
              Around the growth spurt, young players are more vulnerable to overload. PathToPro estimates each player's growth stage and adapts the week, so the
              hardest sessions never land on the worst days.
            </p>
          </div>
          <GrowthCurve />
        </div>

        <h3 className="lp-h3">Nine rules on the pitch, checked on every plan, every night</h3>
        <ol className="lp-formation">
          {RULES.map((rule, i) => (
            <li key={rule}>
              <span className="lp-magnet" aria-hidden>
                {i + 1}
              </span>
              {rule}
            </li>
          ))}
        </ol>

        <div className="lp-teamsheet">
          <table>
            <caption>A fixed plan against PathToPro</caption>
            <thead>
              <tr>
                <td />
                <th scope="col">A fixed plan</th>
                <th scope="col">PathToPro</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map(([what, fixed, ours]) => (
                <tr key={what}>
                  <th scope="row">{what}</th>
                  <td>{fixed ? <Check className="h-5 w-5" aria-label="Yes" /> : <X className="h-5 w-5 opacity-45" aria-label="No" />}</td>
                  <td>{ours}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

// Height against age with the growth zone shaded, chalked on the grass
function GrowthCurve() {
  return (
    <figure className="lp-growth">
      <svg viewBox="0 0 520 270" role="img" aria-label="Height rises fastest in the growth zone; the player is inside it">
        <rect x={190} y={0} width={150} height={232} className="lp-growth-zone" />
        <text x={265} y={26} textAnchor="middle" className="lp-growth-label">
          Growth zone
        </text>
        <path d="M6 230h508" className="lp-growth-axis" />
        <path d="M10 222C110 212 180 196 225 156S320 58 370 44 480 28 510 26" className="lp-growth-line" />
        <circle cx={240} cy={141} r={11} className="lp-growth-you" />
        <text x={240} y={118} textAnchor="middle" className="lp-growth-label">
          You
        </text>
        <text x={8} y={258} className="lp-growth-tick">
          Age 12
        </text>
        <text x={512} y={258} textAnchor="end" className="lp-growth-tick">
          Age 17
        </text>
      </svg>
      <figcaption>Height speeds up, then levels off. The shaded weeks get extra care.</figcaption>
    </figure>
  );
}

// --------------------------------------------------------------------------- pathway

const LEVELS = ["Starter", "Grassroots", "Competitive amateur", "Elite amateur", "Trial-ready"];

function Pathway() {
  return (
    <section data-zone className="lp-section">
      <div className="lp-wrap">
        <h2 className="lp-h2">Not in an academy? Climb five levels on your own.</h2>
        <p className="lp-lead">
          A self-guided pathway with benchmark tests, your own weekly plan around your club's training nights, and the same safety engine the academies use.
        </p>
        <ol className="lp-ladder" aria-label="The five levels">
          {LEVELS.map((name, i) => (
            <li key={name} className={cn(i === LEVELS.length - 1 && "is-top")}>
              <b>{i + 1}</b>
              {name}
            </li>
          ))}
        </ol>
        <Link to="/register" className="lp-btn is-line mt-8">
          Create a free plan
        </Link>
      </div>
    </section>
  );
}

// --------------------------------------------------------------------------- pro leagues

const COMPS = [
  ["la-liga", "La Liga", "2015/16", "All 380 matches"],
  ["premier-league", "Premier League", "2015/16", "Leicester City's title season"],
  ["ligue-1", "Ligue 1", "2015/16", "377 of 380 matches"],
  ["bundesliga", "Bundesliga", "2023/24", "Leverkusen, unbeaten champions"],
  ["champions-league", "Champions League", "Finals 2004-2019", "14 finals"],
] as const;

function ProLeagues() {
  return (
    <section id="pro" data-zone className="lp-section">
      <div className="lp-wrap">
        <h2 className="lp-h2">Learn from the pros</h2>
        <p className="lp-lead">
          1,185 matches to study: how a team passes, shoots, defends and takes set pieces, player by player. Tables with form, and a match centre for every result.
        </p>
        <ul className="lp-table">
          {COMPS.map(([id, name, season, note]) => (
            <li key={id} style={{ "--comp": COMP_COLOR[id] } as CSSProperties}>
              <span className="lp-table-swatch" aria-hidden />
              <b>{name}</b>
              <span>{season}</span>
              <span>{note}</span>
            </li>
          ))}
        </ul>
        <p className="lp-small mt-4">
          <Link to="/login" className="underline underline-offset-4">
            Open Pro leagues
          </Link>
          . Match events from StatsBomb Open Data.
        </p>
      </div>
    </section>
  );
}

// --------------------------------------------------------------------------- questions + far goal

const FAQ: [string, string][] = [
  [
    "Is this medical advice?",
    "No. PathToPro plans training load. Pain reports and red check-ins go straight to the staff, and the agents take no action on them.",
  ],
  ["Do I need a smartwatch?", "No. The morning check-in and your sleep are enough. An Apple Watch adds heart-rate variability to the readiness score."],
  [
    "Does it need AI to work?",
    "No. Without an API key every agent falls back to rules, which is how the live demo runs. With a key, Claude proposes constraints, explanations and drill picks; the solver and the safety rules keep the last word.",
  ],
  [
    "Who sees my data?",
    "Your academy staff, and your family if you link them. Consent is set per data type, and players under 16 need a parent to link before check-ins start.",
  ],
  [
    "What is in the demo?",
    "A synthetic season of 25 players recorded from the real system. It runs in your browser: what you change stays there until you press Reset demo.",
  ],
  ["I'm not in an academy. Can I use it?", "Yes. Create a free plan: five levels, benchmark tests and the same safety engine, planned around your club's training nights."],
];

function Faq() {
  return (
    <section id="faq" data-zone className="lp-section">
      <div className="lp-wrap lp-faq">
        <h2 className="lp-h2">Questions from the touchline</h2>
        <div>
          {FAQ.map(([q, a]) => (
            <details key={q}>
              <summary>
                {q}
                <ChevronDown className="h-5 w-5 shrink-0" aria-hidden />
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FarGoal() {
  const { tryAs, busy } = useTryAs();
  const picks: [RoleKey, string, string][] = [
    ["player", "Player", "p15@demo.pathtopro"],
    ["coach", "Coach", "coach@demo.pathtopro"],
    ["family", "Parent", "guardian02@demo.pathtopro"],
    ["physio", "Physio", "physio@demo.pathtopro"],
  ];
  const title = useRef<HTMLHeadingElement>(null);
  useFittedLines(title);
  return (
    <section className="lp-fargoal">
      <svg className="lp-arc is-far" viewBox="0 0 400 90" fill="none" aria-hidden>
        <path d="M6 90C60 -22 340 -22 394 90" />
      </svg>
      <div className="lp-box is-far" data-far-box>
        <span className="lp-goalline" aria-hidden />
        <h2 ref={title} className="lp-h1 is-close">
          <span data-fit>Step onto</span>
          <span data-fit>the pitch</span>
        </h2>
        <p className="lp-lead is-center">Pick a role and you are in. No account, no install, synthetic players only.</p>
        <div className="lp-picks">
          {picks.map(([bib, label, email]) => (
            <button key={email} data-bib={bib} onClick={() => tryAs(email)} disabled={!!busy}>
              <Bib number={ROLES[bib].number} />
              {busy === email ? "Opening…" : label}
            </button>
          ))}
        </div>
        <p className="lp-small mt-5 text-center">
          Have an account?{" "}
          <Link to="/login" className="font-bold underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </div>
      <Goal />
    </section>
  );
}

function Goal() {
  return (
    <div className="lp-goal" aria-hidden>
      <span className="lp-goal-mouth" data-goal />
      <svg viewBox="0 0 460 84" fill="none">
        <defs>
          <pattern id="net" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <path d="M0 0h12M0 0v12" stroke="#f7f8f1" strokeOpacity=".55" strokeWidth="1" />
          </pattern>
        </defs>
        <path className="lp-net" d="M6 6h448l-26 74H32z" fill="url(#net)" />
        <path d="M6 80V6h448v74" stroke="#f7f8f1" strokeWidth="8" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function Footer() {
  const links: [string, string][] = [
    ["/login", "Sign in"],
    ["/register", "Create a free plan"],
    ["/privacy", "Privacy"],
    ["/terms", "Terms"],
    ["/imprint", "Imprint"],
  ];
  return (
    <footer className="lp-footer">
      <div className="lp-wrap">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <Wordmark small />
          <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
            {links.map(([to, label]) => (
              <Link key={to} to={to}>
                {label}
              </Link>
            ))}
            <a href={SOURCE} className="inline-flex items-center gap-1">
              <CodeXml className="h-4 w-4" aria-hidden /> Source
            </a>
          </nav>
        </div>
        <p className="lp-small mt-5">Train smart. Grow safe. Get better. Demo with synthetic players. Team analysis uses StatsBomb Open Data.</p>
      </div>
    </footer>
  );
}

