// Guardian: the week in plain words, the child's training and match schedule, the week's
// numbers, consent switches per data type (while the child is under 16), data export and delete.
import { CalendarDays, CheckCircle2, Download, Hourglass, Info, LogOut, Settings, ShieldAlert, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError, download } from "../shared/api";
import { useAuth } from "../shared/auth";
import { eur } from "../shared/money";
import { useApi } from "../shared/useApi";
import type { ConsentView, SessionKind } from "../shared/types";
import { Button, Card, ErrorNote, SectionTitle, Spinner, Switch, cn, fmtDay } from "../shared/ui";

interface Child {
  id: string;
  name: string;
  age: number;
}
interface WeekNote {
  state: "normal" | "watch" | "pending" | "changed";
  text: string;
}
interface Summary {
  name: string;
  week_start: string;
  sessions_done: number;
  avg_sleep_h: number | null;
  goals: { label: string; progress: number }[];
  streak: number;
  week_note?: WeekNote | null;
  alerts?: { id: string; kind: string; text: string; created_at: string }[];
}
interface ScheduleDay {
  date: string;
  kind: SessionKind;
  label: string;
  minutes: number;
  match?: { opponent: string; team: string; primary: boolean; time: string };
}
interface Schedule {
  today: string;
  weeks: { start: string; days: ScheduleDay[] }[];
}

export function GuardianHome() {
  const { user, logout } = useAuth();
  const kids = useApi<Child[]>("/api/guardian/children");
  useEffect(() => {
    document.title = "Family · PathToPro";
  }, []);
  return (
    <div className="display-headings app-bg min-h-full">
      <header className="hero flex items-center justify-between gap-2 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" className="h-8 w-8 shrink-0" />
          {/* A phone has room for one word next to the sign-out: the one that says where you are */}
          <span className="brandmark truncate text-xl">
            <span className="hidden sm:inline">PathToPro · </span>
            <span className="text-pitch-300">Family</span>
          </span>
        </div>
        <span className="flex shrink-0 items-center gap-1">
          <span className="mr-1 hidden text-sm sm:inline">{user?.name}</span>
          <Link to="/account" className="tap flex h-11 w-11 items-center justify-center" aria-label="Account">
            <Settings className="h-5 w-5" aria-hidden />
          </Link>
          <button onClick={logout} className="tap flex items-center gap-1.5 text-sm font-semibold">
            <LogOut className="h-4 w-4" aria-hidden /> Sign out
          </button>
        </span>
      </header>
      <main className="mx-auto max-w-2xl space-y-6 p-4 lg:max-w-5xl lg:p-6">
        {kids.loading && <Spinner />}
        {kids.error && <ErrorNote message={kids.error} onRetry={kids.reload} />}
        {kids.data?.length === 0 && <Card className="text-ink-2">No child is linked to this account yet. Use the invite code your child got at sign-up.</Card>}
        {kids.data?.map((k) => <ChildPanel key={k.id} child={k} />)}
      </main>
    </div>
  );
}

const NOTE_ICON = { normal: CheckCircle2, watch: Info, pending: Hourglass, changed: CheckCircle2 } as const;

function ChildPanel({ child }: { child: Child }) {
  const summary = useApi<Summary>(`/api/guardian/children/${child.id}/summary`);
  const consent = useApi<ConsentView>(`/api/guardian/children/${child.id}/consent`);
  const money = useApi<{ contracts: { id: string; title: string; amount_cents: number; direction: string; ends_on: string | null }[]; fees_paid_cents: number; fees_due_cents: number }>(
    `/api/guardian/children/${child.id}/finance`,
  );
  const [confirm, setConfirm] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [consentError, setConsentError] = useState<string | null>(null);
  const first = child.name.split(" ")[0];

  async function toggle(dataType: string, granted: boolean) {
    setConsentError(null);
    try {
      consent.setData(await api<ConsentView>(`/api/guardian/children/${child.id}/consent`, { method: "PUT", json: { data_type: dataType, granted } }));
    } catch (e) {
      setConsentError(e instanceof ApiError ? e.message : "Could not save. Check your connection and try again.");
    }
  }
  async function seen(id: string) {
    try {
      await api(`/api/guardian/children/${child.id}/alerts/${id}/seen`, { method: "POST" });
      void summary.reload();
    } catch {
      setMsg("Could not mark this as seen. Try again.");
    }
  }
  async function del() {
    try {
      await api(`/api/guardian/children/${child.id}/data`, { method: "DELETE" });
      setMsg("All health data was deleted.");
      void summary.reload();
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : "Could not delete. Check your connection and try again.");
    }
    setConfirm(false);
  }

  const s = summary.data;
  const note = s?.week_note;
  const NoteIcon = note ? NOTE_ICON[note.state] : Info;
  const fees = money.data?.contracts.filter((c) => c.direction === "income" && !c.ends_on) ?? [];
  return (
    <section className="space-y-3">
      <h1 className="text-2xl font-extrabold">
        {child.name} <span className="text-ink-2 text-base font-medium">{Math.floor(child.age)} years</span>
      </h1>
      {summary.error && <ErrorNote message={summary.error} onRetry={summary.reload} />}
      {s?.alerts?.map((a) => (
        <Card key={a.id} className="border-recover/50 flex gap-3" role="alert">
          <ShieldAlert className="text-recover h-6 w-6 shrink-0" aria-hidden />
          <div className="flex-1">
            <p>
              <span className="font-bold">{first}</span> {a.text}
            </p>
            <p className="text-ink-2 mt-1 text-xs">{new Date(a.created_at).toLocaleString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit" })}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => seen(a.id)}>
            Seen
          </Button>
        </Card>
      ))}
      {/* The answer to "is this a normal week?", before any numbers */}
      {note && (
        <Card className={cn("flex gap-3", (note.state === "pending" || note.state === "watch") && "border-caution/60")} role="region" aria-label="This week in short">
          <NoteIcon className={cn("mt-0.5 h-6 w-6 shrink-0", note.state === "pending" || note.state === "watch" ? "text-caution" : "text-pitch-300")} aria-hidden />
          <div>
            <h2 className="font-display text-lg leading-tight font-extrabold">This week in short</h2>
            <p className="mt-1">{note.text}</p>
          </div>
        </Card>
      )}
      <ScheduleCard childId={child.id} />
      {/* Wide screens: the week on the left, consent and data on the right */}
      <div className="space-y-5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6 lg:space-y-0">
        <div className="space-y-5">
          {s && (
            <Card>
              <SectionTitle>This week</SectionTitle>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-3xl font-extrabold">{s.sessions_done}</p>
                  <p className="text-ink-2 text-sm">sessions done</p>
                </div>
                <div>
                  <p className="text-3xl font-extrabold">{s.avg_sleep_h ?? "–"}</p>
                  <p className="text-ink-2 text-sm">hours of sleep a night</p>
                </div>
                <div>
                  <p className="text-3xl font-extrabold">{s.streak}</p>
                  <p className="text-ink-2 text-sm">check-ins in a row</p>
                </div>
              </div>
              {s.goals.map((g) => (
                <div key={g.label} className="mt-3">
                  <p className="flex justify-between text-sm font-semibold">
                    <span>Goal: {g.label}</span>
                    <span className="text-ink-2 font-normal">{g.progress <= 0 ? "just started" : `${Math.min(100, Math.round(g.progress * 100))}% of the way`}</span>
                  </p>
                  <div className="bg-surface-2 mt-1 h-2.5 rounded-full" aria-hidden>
                    <div className="bg-pitch-500 h-full rounded-full" style={{ width: `${Math.max(4, Math.min(100, g.progress * 100))}%` }} />
                  </div>
                </div>
              ))}
            </Card>
          )}
        </div>

        <div className="space-y-5">
          {consent.data && (
            <Card>
              <SectionTitle>Consent</SectionTitle>
              <p className="text-ink-2 mb-2 text-sm">
                {consent.data.self_managed
                  ? `${first} is 16 or older and decides this in their own account. This is what is switched on now.`
                  : `${first} is under 16, so these switches are yours. Switch a kind of data off and nothing new of it is stored. You can change them any time.`}
              </p>
              <ul className="divide-[color:var(--line)] divide-y">
                {consent.data.items.map((i) => (
                  <li key={i.data_type} className="flex items-center justify-between gap-3 py-1">
                    <span className="text-sm">{i.text}</span>
                    <Switch label={i.text} checked={i.granted} disabled={consent.data!.self_managed} onChange={(on) => toggle(i.data_type, on)} />
                  </li>
                ))}
              </ul>
              {consentError && (
                <p role="alert" className="text-recover mt-2 text-sm font-semibold">
                  {consentError}
                </p>
              )}
              <p className="text-ink-2 mt-2 text-xs">We store no location and no free-text diary. Demo data is synthetic.</p>
            </Card>
          )}
          <Card className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => download(`/api/guardian/children/${child.id}/export`, `pathtopro-${child.name}.json`)}>
              <Download className="h-4 w-4" aria-hidden /> Export data
            </Button>
            {!confirm ? (
              <Button variant="danger" onClick={() => setConfirm(true)}>
                <Trash2 className="h-4 w-4" aria-hidden /> Delete health data
              </Button>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">This cannot be undone.</span>
                <Button variant="danger" size="sm" onClick={del}>
                  Yes, delete
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirm(false)}>
                  Cancel
                </Button>
              </div>
            )}
            {msg && (
              <p role="status" className="w-full text-sm">
                {msg}
              </p>
            )}
          </Card>
          {/* Club admin, kept apart from the child's week and well-being */}
          {fees.length > 0 && money.data && (
            <Card>
              <p className="font-bold">Fees</p>
              {fees.map((c) => (
                <p key={c.id} className="text-sm">
                  {c.title}: {eur(c.amount_cents)} / month
                </p>
              ))}
              <p className="text-ink-2 mt-1 text-sm">
                Paid this season {eur(money.data.fees_paid_cents)} · open {eur(money.data.fees_due_cents)}
              </p>
            </Card>
          )}
        </div>
      </div>
    </section>
  );
}

// A parent's words, short enough for seven columns on a phone
const SHORT: Record<SessionKind, string> = {
  rest: "Rest",
  recovery: "Easy",
  technical: "Skills",
  tactical: "Tactics",
  strength: "Gym",
  speed: "Speed",
  match: "Match",
};

// This week or next as a strip of seven days, so the family can plan lifts and evenings around training and matches
function ScheduleCard({ childId }: { childId: string }) {
  const { data } = useApi<Schedule>(`/api/guardian/children/${childId}/schedule`);
  const [week, setWeek] = useState(0);
  if (!data) return null;
  const days = data.weeks[week]?.days ?? [];
  const matches = days.filter((d) => d.match);
  return (
    <Card>
      <SectionTitle
        action={
          <div className="bg-surface-2 flex rounded-md p-1 text-sm font-semibold" role="group" aria-label="Week">
            {["This week", "Next week"].map((label, i) => (
              <button
                key={label}
                onClick={() => setWeek(i)}
                aria-pressed={week === i}
                className={cn("min-h-11 rounded-lg px-3 transition", week === i ? "bg-pitch-300 text-pitch-950" : "text-ink-2 hover:text-ink")}
              >
                {label}
              </button>
            ))}
          </div>
        }
      >
        Schedule
      </SectionTitle>
      <ol className="grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const today = d.date === data.today;
          const past = d.date < data.today;
          return (
            <li
              key={d.date}
              title={d.match ? `Match vs ${d.match.opponent}, ${d.match.time}` : d.kind === "rest" ? "Rest day" : `${d.label}, ${d.minutes} min`}
              className={cn(
                "flex min-h-24 flex-col items-center rounded-md border px-0.5 py-2 text-center",
                d.match
                  ? "border-pitch-400/60 bg-pitch-500/20"
                  : d.kind === "rest"
                    ? "border-line border-dashed"
                    : "border-line bg-surface-2",
                today && "ring-pitch-300 ring-2",
                past && "opacity-55",
              )}
            >
              <span className="text-ink-2 text-xs font-bold">{fmtDay(d.date)}</span>
              <span className="text-lg leading-tight font-extrabold">{fmtDay(d.date, { day: "numeric" })}</span>
              <span className={cn("mt-auto max-w-full truncate text-xs leading-tight font-semibold", d.kind === "rest" ? "text-ink-2" : "text-ink")}>
                {SHORT[d.kind] ?? d.label}
              </span>
              {d.match ? (
                <span className="text-pitch-300 text-xs font-bold">{d.match.time}</span>
              ) : (
                d.kind !== "rest" && <span className="text-ink-2 text-xs">{d.minutes}′</span>
              )}
            </li>
          );
        })}
      </ol>
      {matches.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {matches.map((d) => (
            <li key={d.date} className="flex items-center gap-2 text-sm">
              <CalendarDays className="text-pitch-300 h-4 w-4 shrink-0" aria-hidden />
              <span>
                <span className="font-semibold">
                  {fmtDay(d.date, { weekday: "long", day: "numeric", month: "short" })}, {d.match!.time}
                </span>{" "}
                · Match vs {d.match!.opponent}
                {!d.match!.primary && <span className="text-ink-2"> ({d.match!.team})</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
