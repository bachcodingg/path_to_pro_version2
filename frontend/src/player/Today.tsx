// "Match day sheet": readiness battery, today's session, recovery tasks, "Why?" cards.
import { CheckCircle2, ChevronDown, ChevronRight, Circle, Dumbbell, Flame, Footprints, Hand, HeartHandshake, Hourglass, Lightbulb, ShieldAlert, TrendingUp } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "../shared/api";
import { AnnouncementsCard } from "../shared/Team";
import { useAuth } from "../shared/auth";
import { t } from "../shared/i18n";
import type { SessionKind, Today, WhyCard } from "../shared/types";
import { useApi } from "../shared/useApi";
import { BAND_BG, BAND_MIN, BAND_TEXT, BandIcon, Button, Card, Chip, ErrorNote, HOLD_UP, SectionTitle, Spinner, cn, heldBack, intensityClass } from "../shared/ui";
import { MatchDiary } from "./MatchDiary";
import { TipBody, type TipsData } from "./Tips";

const BATTERY_CELLS = 20;

export function TodayScreen() {
  const { data, setData, error, loading, reload } = useApi<Today>("/api/me/today");
  const { user } = useAuth();
  const checkin = useLocation().state as { escalated?: boolean; notified?: "staff" | "guardian" | null; flagged?: boolean } | null;

  if (loading && !data) return <Spinner />;
  if (error || !data) return <ErrorNote message={error ?? "No data"} onRetry={reload} />;

  async function toggle(id: string) {
    setData((d) => d && { ...d, tasks: d.tasks.map((x) => (x.id === id ? { ...x, done: !x.done } : x)) });
    await api(`/api/me/tasks/${id}/toggle`, { method: "POST" }).catch(reload);
  }

  const r = data.readiness;
  return (
    <div className="space-y-5 pt-2">
      <section className="hero turf-sheet dark today-hero" aria-label="Today">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[15px] font-semibold">
              {new Date(data.date + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <h1>Hi {data.name.split(" ")[0]}</h1>
          </div>
          {data.streak > 0 && (
            <span className="bg-pitch-950/70 flex items-center gap-1 rounded-md px-2.5 py-1 font-bold" title="Check-in streak">
              <Flame className="text-caution h-5 w-5" aria-hidden /> <span className="sr-only">Check-in streak</span> {data.streak}
            </span>
          )}
        </div>
        <div className="mt-4">
          <Battery
            score={r?.score ?? null}
            band={r?.band ?? null}
            stale={!data.readiness_is_today}
            hrv={r?.components ? "hrv" in r.components : true}
          />
        </div>
        <DaySummary flags={data.flags} band={r?.band ?? null} />
      </section>

      <AnnouncementsCard />

      {checkin?.flagged && (
        <Card className="border-pitch-400 flex gap-3">
          <HeartHandshake className="text-pitch-300 h-6 w-6 shrink-0" aria-hidden />
          <p>
            {checkin.escalated && checkin.notified === "guardian"
              ? "Thanks for your honest check-in. We've let your parent know, and your next two days are now rest or easy recovery. You don't need to do anything else."
              : checkin.escalated || checkin.notified === "staff"
                ? "Thanks for your honest check-in. Someone from the staff will talk to you today, before you train."
                : "Thanks for your honest check-in. Your next two days are now rest or easy recovery. Please tell an adult you trust how you feel."}
          </p>
        </Card>
      )}

      {data.safety?.map((msg) => (
        <Card key={msg} className="border-recover/50 flex gap-3" role="alert">
          <ShieldAlert className="text-recover h-6 w-6 shrink-0" aria-hidden />
          <p>{msg}</p>
        </Card>
      ))}

      {/* Wide screens: today's plan on the left, progress and to-dos on the right */}
      <div className="space-y-5 lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start lg:gap-6 lg:space-y-0">
        <div className="space-y-5">
          {data.consent && !data.consent.wellness ? (
            <Link to="/player/levels" className="block">
              <Card className="border-caution/50">
                <p className="font-bold">Check-ins are waiting for a parent</p>
                <p className="text-ink-2 text-sm">You're under 16: a parent links with your invite code first. Tap to see the code.</p>
              </Card>
            </Link>
          ) : !data.checked_in && (
            <Link to="/player/checkin" className="block">
              <Card className="bg-pitch-300 border-pitch-300 text-pitch-950 hover:bg-pitch-200">
                <p className="font-display text-xl leading-tight font-extrabold">{t("checkin.title")}</p>
                <p className="text-[15px] font-semibold">{t("checkin.subtitle")} Tap to start.</p>
              </Card>
            </Link>
          )}

          <section aria-label={t("today.session")}>
            <SectionTitle>{t("today.session")}</SectionTitle>
            <Card className={cn("space-y-3", (data.on_hold || data.pending_change) && data.session.kind !== "rest" && "border-caution/60")}>
              <div className="flex items-center gap-4">
                <div
                  className={cn("flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-md leading-none", intensityClass(data.session.kind, data.session.rpe))}
                  aria-hidden
                >
                  <span className="text-lg font-extrabold">{data.session.kind === "rest" ? "–" : data.session.rpe}</span>
                  {data.session.kind !== "rest" && <span className="mt-0.5 text-[11px] font-semibold opacity-80">effort</span>}
                </div>
                <div>
                  <p className="text-lg font-bold">{data.session.label}</p>
                  <p className="text-ink-2 text-sm">
                    {data.session.kind === "rest"
                      ? "Recover and enjoy your day off"
                      : `${data.session.minutes} min · effort ${data.session.rpe}/10`}
                  </p>
                </div>
              </div>
              <SessionNote today={data} />
            </Card>
            {data.content && (
              <Card className="mt-2">
                <p className="font-bold">{data.content.title}</p>
                <ul className="mt-1 space-y-2">
                  {data.content.items.map((it) => (
                    <li key={it.name} className="text-sm">
                      <span className="font-semibold">{it.name}</span>
                      {it.minutes != null && <span className="text-ink-2"> · {it.minutes} min</span>}
                      <span className="text-ink-2 block">{it.how}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            {data.gym && (
              <Link to="/player/gym" className="mt-2 block">
                <Card className="flex items-center gap-3">
                  <Dumbbell className="text-pitch-300 h-6 w-6 shrink-0" aria-hidden />
                  <div className="flex-1">
                    <p className="font-bold">{data.gym.title}</p>
                    <p className="text-ink-2 text-sm">
                      {data.gym.minutes} min · {data.gym.blocks.reduce((n, b) => n + b.items.length, 0)} exercises · {data.gym.stage_label}
                    </p>
                  </div>
                  <ChevronRight className="text-ink-2 h-5 w-5" aria-hidden />
                </Card>
              </Link>
            )}
            <Link to="/player/skills" className="mt-2 block">
              <Card className="flex items-center gap-3">
                <Footprints className="text-pitch-300 h-6 w-6 shrink-0" aria-hidden />
                <div className="flex-1">
                  <p className="font-bold">Ball skills for your position</p>
                  <p className="text-ink-2 text-sm">A session to do on your own or with a friend, next to the gym</p>
                </div>
                <ChevronRight className="text-ink-2 h-5 w-5" aria-hidden />
              </Card>
            </Link>
          </section>
          {data.consent?.wellness !== false && (
            <MatchDiary due={data.diary_due ?? []} position={user?.position} onSaved={() => void reload()} />
          )}
          <TipOfTheDay />
        </div>

        <div className="space-y-5">
          {data.pathway && (
            <Link to="/player/levels" className="block">
              <Card className="flex items-center gap-3">
                <TrendingUp className="text-pitch-300 h-6 w-6 shrink-0" aria-hidden />
                <div className="flex-1">
                  <p className="font-bold">
                    Level {data.pathway.level}: {data.pathway.name}
                  </p>
                  <p className="text-ink-2 text-sm">
                    {data.pathway.next
                      ? `${data.pathway.next.tests_met} of ${data.pathway.next.tests_needed} benchmarks for ${data.pathway.next.name}`
                      : "Top level reached"}
                    {data.pathway.focus.length > 0 && ` · focus: ${data.pathway.focus.join(", ")}`}
                  </p>
                </div>
                <ChevronRight className="text-ink-2 h-5 w-5" aria-hidden />
              </Card>
            </Link>
          )}

          {data.pathway && data.consent?.wellness && <LogSession today={data} onLogged={(t) => setData(t)} />}

          <section>
            <SectionTitle>{t("today.tasks")}</SectionTitle>
            <Card className="divide-[color:var(--line)] divide-y p-0">
              {data.tasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => toggle(task.id)}
                  className="tap flex w-full items-center gap-3 px-4 py-3 text-left"
                  aria-pressed={task.done}
                >
                  {task.done ? (
                    <CheckCircle2 className="text-pitch-300 h-6 w-6" aria-hidden />
                  ) : (
                    <Circle className="text-ink-2 h-6 w-6" aria-hidden />
                  )}
                  <span className={cn(task.done && "text-ink-2 line-through")}>{task.label}</span>
                </button>
              ))}
            </Card>
          </section>

          {data.why.length > 0 && (
            <section>
              <SectionTitle>{t("today.why")}</SectionTitle>
              <div className="space-y-2">
                {data.why.map((w) => (
                  <WhyCardView key={w.id} card={w} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

// What the flags mean for today, in one sentence a 13-year-old can act on. The separate
// reasons are one tap away, so the screen does not open with a row of warnings.
const FLAG_WORDS: Record<string, string> = {
  load_spike: "you've trained a lot lately",
  short_sleep: "you haven't slept enough",
  low_hrv: "your body is still recovering",
  phv_window: "you're growing fast right now",
  high_monotony: "your days have all been about as hard",
};

export function DaySummary({ flags, band }: { flags: Today["flags"]; band: "green" | "amber" | "red" | null }) {
  if (flags.length === 0) return null;
  // The two that matter most (in the order above); the rest are under "What this is based on"
  const words = Object.keys(FLAG_WORDS)
    .filter((k) => flags.some((f) => f.kind === k))
    .map((k) => FLAG_WORDS[k])
    .slice(0, 2);
  const list = words.length > 1 ? `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}` : (words[0] ?? "");
  const tail = band === "red" ? "so today is about recovering" : band === "amber" ? "so take care today" : "and you're still good to go";
  const text = list ? `${list[0].toUpperCase()}${list.slice(1)}, ${tail}.` : band === "red" ? "Your battery is low, so today is about recovering." : null;
  return (
    <div className="mt-3">
      {text && <p className="text-[15px] font-semibold">{text}</p>}
      <details className="mt-1">
        <summary className="tap inline-flex cursor-pointer items-center text-[15px] font-semibold underline underline-offset-4">What this is based on</summary>
        <ul className="mt-1 flex flex-wrap gap-2">
          {flags.map((f) => (
            <li key={f.kind} className="bg-pitch-950/70 rounded-md px-2.5 py-1 text-[13px] font-semibold">
              {f.text}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

// Under today's session: the plan on the card is not always the last word. A report to the
// named adult puts the day on hold; a plan change that waits for the coach is announced
// with who decides, so a hard session never stands next to a low battery without comment.
export function SessionNote({ today }: { today: Today }) {
  const hold = today.on_hold;
  const pending = today.pending_change;
  if (hold) {
    const who = hold.contact ?? "your coach";
    return (
      <p className="border-line flex gap-2 border-t pt-3 text-[15px]" role="status">
        <Hand className="text-caution mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <span>
          <strong>On hold.</strong> Speak to {who} before you train today.
          {hold.kind === "pain_report" && " Don't train through pain."}
        </span>
      </p>
    );
  }
  if (pending && today.session.kind !== "rest") {
    const who = pending.approver ?? "your coach";
    return (
      <p className="border-line flex gap-2 border-t pt-3 text-[15px]" role="status">
        <Hourglass className="text-caution mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <span>
          <strong>{pending.lighter ? "A lighter plan" : "A changed plan"} is waiting for {who}.</strong>{" "}
          {pending.today &&
            (pending.today.kind === "rest"
              ? "Today would become a rest day. "
              : `Today would become ${pending.today.label.toLowerCase()} at effort ${pending.today.rpe}/10. `)}
          If you feel tired before then, tell {who} and take it easier.
        </span>
      </p>
    );
  }
  return null;
}

export function Battery({
  score,
  band,
  stale,
  hrv = true,
}: {
  score: number | null;
  band: "green" | "amber" | "red" | null;
  stale?: boolean;
  hrv?: boolean;
}) {
  const lit = score == null ? 0 : Math.max(1, Math.round((Math.min(100, score) / 100) * BATTERY_CELLS));
  return (
    <div>
      <div className="flex items-center gap-4 md:gap-6">
        <div
          className="led-battery flex-1"
          role="img"
          aria-label={`Readiness ${score == null ? "unknown" : Math.round(score)} of 100, ${band ? BAND_TEXT[band] : "no data"}`}
        >
          {Array.from({ length: BATTERY_CELLS }, (_, i) => (
            <span key={i} className={cn(i < lit && (band ? BAND_BG[band] : "bg-white/40"))} />
          ))}
        </div>
        <div className="shrink-0 text-right">
          <p className="font-display num text-[3.1rem] leading-none font-black md:text-[3.6rem]">{score == null ? "–" : Math.round(score)}</p>
          <p className="flex items-center justify-end gap-1 text-[15px] font-bold">
            <BandIcon band={band} className="h-4 w-4" />
            {band ? BAND_TEXT[band] : "No data"}
          </p>
        </div>
      </div>
      <p className="text-ink-2 mt-2 text-[15px]">
        {t("today.battery")} from sleep{hrv ? ", heart-rate variability" : ""} and your check-in.
        {stale && " Showing your last reading: check in to update it."}
      </p>
      {heldBack(band, score) && (
        <p className="text-ink-2 mt-1 text-[15px]">
          Still {band ? BAND_TEXT[band] : ""}: after a tougher day your colour comes back at{" "}
          {(band === "red" ? BAND_MIN.amber : BAND_MIN.green) + HOLD_UP}, so one good night doesn't flip it.
        </p>
      )}
    </div>
  );
}

function WhyCardView({ card }: { card: WhyCard }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="p-0">
      <button className="tap flex w-full items-center justify-between px-4 py-3 text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="font-semibold">{card.title}</span>
        <ChevronDown className={cn("h-5 w-5 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <div className="space-y-3 px-4 pb-4">
          {card.explanation && <p>{card.explanation}</p>}
          {card.chips.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {card.chips.map((c) => (
                <Chip key={c}>{c}</Chip>
              ))}
            </div>
          )}
          <p className="text-ink-2 text-sm">Approved by {card.approved_by}</p>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Got it
          </Button>
        </div>
      )}
    </Card>
  );
}

const LOG_KINDS: [SessionKind, string][] = [
  ["technical", "Club training or ball work"],
  ["tactical", "Small-sided games or fitness"],
  ["strength", "Gym"],
  ["speed", "Speed"],
  ["recovery", "Recovery"],
  ["match", "Match"],
];

// Self-guided players log what they actually did; the planner uses it to keep load safe.
function LogSession({ today, onLogged }: { today: Today; onLogged: (t: Today) => void }) {
  const planned = today.session.kind === "rest" ? "technical" : today.session.kind;
  const [kind, setKind] = useState<SessionKind>(planned);
  const [minutes, setMinutes] = useState(today.session.minutes || 60);
  const [rpe, setRpe] = useState(Math.max(1, today.session.rpe || 5));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const out = await api<{ today: Today; levelled_up: boolean }>("/api/me/log", { method: "POST", json: { kind, minutes, rpe } });
      onLogged(out.today);
      setMsg(out.levelled_up ? "Logged, and you levelled up!" : "Logged. Your plan uses this to keep your load safe.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Could not log");
    } finally {
      setBusy(false);
    }
  }

  const logged = today.logged ?? [];
  return (
    <section>
      <SectionTitle>Log what you did</SectionTitle>
      <Card>
        {logged.length > 0 && (
          <p className="text-ink-2 mb-2 text-sm">Today: {logged.map((l) => `${l.minutes} min at effort ${l.rpe}`).join(", ")}</p>
        )}
        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="text-sm font-semibold">Session</span>
            <select
              className="bg-surface-2 border-line mt-1 h-11 w-full rounded-md border px-3"
              value={kind}
              onChange={(e) => setKind(e.target.value as SessionKind)}
            >
              {LOG_KINDS.map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Minutes: {minutes}</span>
            <input type="range" min={5} max={150} step={5} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="accent-pitch-400 h-11 w-full" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">How hard was it? {rpe}/10</span>
            <input type="range" min={1} max={10} value={rpe} onChange={(e) => setRpe(Number(e.target.value))} className="accent-pitch-400 h-11 w-full" />
          </label>
          <Button type="submit" className="w-full" loading={busy}>
            Log session
          </Button>
          {msg && (
            <p role="status" className="text-sm font-semibold">
              {msg}
            </p>
          )}
        </form>
      </Card>
    </section>
  );
}

// The match tip picked for today (match day, the day after, or position and mindset in turn)
function TipOfTheDay() {
  const { data } = useApi<TipsData>("/api/me/tips");
  if (!data) return null;
  return (
    <section>
      <SectionTitle action={<Link to="/player/tips" className="text-pitch-300 text-sm font-semibold">All tips →</Link>}>Tip for today</SectionTitle>
      <Card>
        <p className="text-pitch-300 flex items-center gap-1.5 text-xs font-bold">
          <Lightbulb className="h-4 w-4" aria-hidden /> {data.today.reason}
        </p>
        <TipBody t={data.today} />
      </Card>
    </section>
  );
}
