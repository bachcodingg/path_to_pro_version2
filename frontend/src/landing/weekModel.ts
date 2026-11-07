// The overview page's working example: a small, in-browser version of what the night shift does
// to one player's week. It applies the real rules (backend/planner/model.py H1-H9 and
// backend/agents/rules.py default_constraints) to one fixed week; it is not the solver.

export type SessionName = "Technical" | "Speed" | "Strength" | "Tactical" | "Recovery" | "Match" | "Rest";

export interface PlanDay {
  day: string;
  label: SessionName;
  rpe: number;
  minutes: number;
}

export interface WeekFlags {
  sleep: boolean; // under 6 h three nights
  load: boolean; // load jumped (ACWR over 1.5)
  growth: boolean; // in the growth zone (PHV window)
  pain: boolean; // reported pain at check-in
}

export type Decision = "none" | "applied" | "coach" | "staff";

export interface RebuiltWeek {
  days: PlanDay[];
  changed: boolean[];
  reasons: string[];
  decision: Decision;
  loadChange: number; // whole percent against the usual week; 0 when nothing changed
}

// A normal week before a Saturday match: the day before stays easy (H3), Sunday is rest (H2)
export const USUAL_WEEK: readonly PlanDay[] = [
  { day: "Mon", label: "Technical", rpe: 6, minutes: 75 },
  { day: "Tue", label: "Speed", rpe: 8, minutes: 60 },
  { day: "Wed", label: "Strength", rpe: 7, minutes: 60 },
  { day: "Thu", label: "Tactical", rpe: 6, minutes: 75 },
  { day: "Fri", label: "Recovery", rpe: 3, minutes: 30 },
  { day: "Sat", label: "Match", rpe: 9, minutes: 80 },
  { day: "Sun", label: "Rest", rpe: 0, minutes: 0 },
];

const EASY_DAYS = 2; // poor recovery: easy first two days
const EASY_RPE = 4;
const GROWTH_SPEED_MAX = 6; // H4
const SPIKE_LOAD_FACTOR = 0.8;

export const weekLoad = (days: readonly PlanDay[]) => days.reduce((sum, d) => sum + d.rpe * d.minutes, 0);

export function rebuildWeek(flags: WeekFlags): RebuiltWeek {
  const days = USUAL_WEEK.map((d) => ({ ...d }));
  // A pain report goes to a person. The agents change nothing, whatever else is true.
  if (flags.pain) {
    return {
      days,
      changed: days.map(() => false),
      reasons: ["Pain goes straight to the physio. The agents take no action until staff have decided."],
      decision: "staff",
      loadChange: 0,
    };
  }

  const reasons: string[] = [];
  if (flags.sleep) {
    days.slice(0, EASY_DAYS).forEach((d) => {
      d.rpe = Math.min(d.rpe, EASY_RPE);
      if (d.label === "Speed") d.label = "Recovery";
    });
    reasons.push("Short sleep: the first two days stay easy, and the work moves later in the week.");
  }
  if (flags.growth) {
    days.forEach((d) => {
      if (d.label === "Speed") d.rpe = Math.min(d.rpe, GROWTH_SPEED_MAX);
      if (d.label === "Strength") d.rpe = Math.min(d.rpe, GROWTH_SPEED_MAX - 1);
    });
    reasons.push("Growth zone: no speed work above effort 6, and fewer jumps and sprints.");
  }
  if (flags.load) {
    days.forEach((d) => {
      if (d.label !== "Match" && d.label !== "Rest") d.minutes = Math.round((d.minutes * SPIKE_LOAD_FACTOR) / 5) * 5;
    });
    reasons.push("Load jumped: training time drops by a fifth, so the spike settles before Saturday.");
  }

  const changed = days.map((d, i) => d.rpe !== USUAL_WEEK[i].rpe || d.minutes !== USUAL_WEEK[i].minutes || d.label !== USUAL_WEEK[i].label);
  const anyChange = changed.some(Boolean);
  // The approval policy: effort up or down by one point applies at once, anything bigger waits
  const small = days.every((d, i) => d.label === USUAL_WEEK[i].label && d.minutes === USUAL_WEEK[i].minutes && Math.abs(d.rpe - USUAL_WEEK[i].rpe) <= 1);
  const usual = weekLoad(USUAL_WEEK);
  return {
    days,
    changed,
    reasons: reasons.length ? reasons : ["Nothing stands out this week, so the usual plan stays."],
    decision: !anyChange ? "none" : small ? "applied" : "coach",
    loadChange: Math.round(((weekLoad(days) - usual) / usual) * 100),
  };
}
