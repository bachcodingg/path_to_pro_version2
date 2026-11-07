// The hero's clipboard: flip what happened this week and watch Leon's plan rebuild.
import { motion } from "framer-motion";
import { Check, Moon, Ruler, ShieldAlert, TrendingUp, UserCheck, type LucideIcon } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { cn } from "../shared/ui";
import { USUAL_WEEK, rebuildWeek, type Decision, type WeekFlags } from "./weekModel";

const SIGNALS: { key: keyof WeekFlags; icon: LucideIcon; label: string }[] = [
  { key: "sleep", icon: Moon, label: "Under 6 h sleep, three nights" },
  { key: "load", icon: TrendingUp, label: "Training load jumped" },
  { key: "growth", icon: Ruler, label: "In the growth zone" },
  { key: "pain", icon: ShieldAlert, label: "Reported pain" },
];

const DECISION: Record<Decision, { icon: LucideIcon; text: string }> = {
  none: { icon: Check, text: "No change needed" },
  applied: { icon: Check, text: "Applied, coach told" },
  coach: { icon: UserCheck, text: "Waiting for the coach" },
  staff: { icon: ShieldAlert, text: "With the physio" },
};

// Seven columns on a phone leave room for about five letters
const SHORT: Record<string, string> = { Technical: "Tech", Strength: "Gym", Tactical: "Tact", Recovery: "Recov" };

const MAX_RPE = 10;
const pct = (rpe: number) => `${(rpe / MAX_RPE) * 100}%`;

export function WeekBoard() {
  const [flags, setFlags] = useState<WeekFlags>({ sleep: true, load: true, growth: true, pain: false });
  const week = useMemo(() => rebuildWeek(flags), [flags]);
  const id = useId();
  const Verdict = DECISION[week.decision];

  return (
    <section className="lp-clipboard" aria-labelledby={`${id}-title`}>
      <span className="lp-clip" aria-hidden />
      <div className="lp-sheet">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <h2 id={`${id}-title`} className="lp-sheet-title">
            Leon's next week
          </h2>
          <p className="lp-sheet-meta">U15, match on Saturday</p>
        </div>

        <fieldset className="mt-3">
          <legend className="lp-sheet-label">What happened this week?</legend>
          <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
            {SIGNALS.map(({ key, icon: Icon, label }) => (
              <label key={key} className="lp-signal">
                <input type="checkbox" checked={flags[key]} onChange={(e) => setFlags({ ...flags, [key]: e.target.checked })} />
                <span>
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  {label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <ol className="lp-week" aria-label="The plan, day by day">
          {week.days.map((d, i) => {
            const usual = USUAL_WEEK[i];
            return (
              <li key={d.day} className={cn("lp-day", week.changed[i] && "is-changed", d.label === "Match" && "is-match")}>
                <div className="lp-day-track" aria-hidden>
                  {usual.rpe > 0 && <span className="lp-day-ghost" style={{ height: pct(usual.rpe) }} />}
                  {d.rpe > 0 ? (
                    <motion.span className="lp-day-bar" initial={false} animate={{ height: pct(d.rpe) }} transition={{ type: "spring", stiffness: 260, damping: 24 }}>
                      {d.rpe}
                    </motion.span>
                  ) : (
                    <span className="lp-day-rest">Rest</span>
                  )}
                </div>
                <p className="lp-day-name">{d.day}</p>
                <p className="lp-day-kind" aria-hidden>
                  <span className="hidden sm:inline">{d.label === "Rest" ? "Off" : d.label}</span>
                  <span className="sm:hidden">{d.label === "Rest" ? "Off" : (SHORT[d.label] ?? d.label)}</span>
                </p>
                <p className="sr-only">
                  {d.label === "Rest" ? "Rest" : `${d.label}, ${d.minutes} minutes at effort ${d.rpe} of 10`}
                  {week.changed[i] && `, changed from ${usual.label} at effort ${usual.rpe}`}
                </p>
              </li>
            );
          })}
        </ol>
        <p className="lp-week-key">
          <span>
            <i className="lp-key-solid" aria-hidden /> Rebuilt plan, effort out of 10
          </span>
          <span>
            <i className="lp-key-ghost" aria-hidden /> His usual week
          </span>
        </p>

        <div className="lp-why" role="status" aria-live="polite">
          <div className="lp-why-head">
            <p className="lp-verdict">
              <Verdict.icon className="h-4 w-4" aria-hidden /> {Verdict.text}
            </p>
            {week.loadChange !== 0 && <p className="lp-load">{week.loadChange}% load</p>}
          </div>
          <ul>
            {week.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
        <p className="lp-sheet-note">A simplified example. The real planner is a solver working inside the same safety rules.</p>
      </div>
    </section>
  );
}
