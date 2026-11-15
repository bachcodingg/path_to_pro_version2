// Approvals ("Substitution board"): one card per proposal, the player who needs the coach
// most first. Each card says why in plain words, how much the week's load changes and which
// days change; the full week, the policy rule and the solver status are one tap away.
// Approve (A), edit (E), reject (R) on the focused card: target under 3 clicks and 20 s per decision.
import { Check, Pencil, X } from "lucide-react";
import { useCallback, useState, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../shared/api";
import { t } from "../shared/i18n";
import type { PlanDay, Proposal, SessionKind } from "../shared/types";
import { PageHeader } from "../shared/PageHeader";
import { useApi } from "../shared/useApi";
import { BandBadge, Button, Card, Chip, ErrorNote, Spinner, capitalize, cn, fmtDay, intensityClass, ordinal } from "../shared/ui";

const KIND_TITLE: Record<string, string> = {
  session_swap: "Session swap",
  load_cut: "Load cut",
  load_increase: "Load increase",
  intensity_change: "Intensity change",
  match_minutes: "Match minutes limit",
  new_goal: "New development goal",
};
const EDITABLE: SessionKind[] = ["rest", "recovery", "technical", "tactical", "strength", "speed"];
// Seven days side by side on a phone: names that fit a 40 px column
const SHORT: Record<SessionKind, string> = {
  rest: "Rest",
  recovery: "Recov",
  technical: "Tech",
  tactical: "Tact",
  strength: "Gym",
  speed: "Speed",
  match: "Match",
};

function Kbd({ children }: { children: string }) {
  return <kbd className="rounded border border-white/30 bg-white/10 px-1.5 py-0.5 font-mono text-xs text-white">{children}</kbd>;
}

const same = (a: PlanDay | undefined, b: PlanDay) => !!a && a.kind === b.kind && a.rpe === b.rpe && a.minutes === b.minutes;

function dayText(d: PlanDay): string {
  if (d.kind === "rest") return "Rest day";
  if (d.kind === "match") return `Match, ${d.minutes}′`;
  return `${d.label}, effort ${d.rpe}`;
}

function loadText(pct: number): string {
  if (pct < 0) return `${-pct}% less load over these days`;
  if (pct > 0) return `${pct}% more load over these days`;
  return "Same load, different sessions";
}

export function Inbox() {
  const { data, setData, error, loading, reload } = useApi<Proposal[]>("/api/coach/inbox");
  const [editing, setEditing] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, { kind: SessionKind; rpe: number }>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const decide = useCallback(
    async (p: Proposal, action: "approve" | "reject" | "edit", fromKeyboard = false) => {
      setBusy(true);
      setMsg(null);
      try {
        await api(`/api/coach/proposals/${p.id}/decision`, {
          method: "POST",
          json: { action, edits: Object.entries(edits).map(([day, v]) => ({ day, ...v })) },
        });
        setData((d) => d && d.filter((x) => x.id !== p.id));
        setEditing(null);
        setEdits({});
        setMsg(`${action === "reject" ? "Rejected" : "Applied"}: ${p.player.name}`);
        // Keyboard users carry on with the next card
        if (fromKeyboard) requestAnimationFrame(() => document.querySelector<HTMLElement>("[data-proposal]")?.focus());
      } catch (e) {
        setMsg(e instanceof ApiError ? e.message : "Could not save the decision. Try again.");
      } finally {
        setBusy(false);
      }
    },
    [edits, setData],
  );

  // Single-key shortcuts act only on the card that has the focus (never from anywhere on
  // the page), so a stray key press cannot approve a plan
  function onCardKey(e: KeyboardEvent<HTMLElement>, p: Proposal) {
    if (e.target !== e.currentTarget || busy || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    const card = e.currentTarget;
    const cards = [...document.querySelectorAll<HTMLElement>("[data-proposal]")];
    const i = cards.indexOf(card);
    if (k === "a") void decide(p, editing === p.id ? "edit" : "approve", true);
    else if (k === "r") void decide(p, "reject", true);
    else if (k === "e" && p.proposed.length) setEditing(p.id);
    else if (k === "j" || e.key === "ArrowDown") cards[Math.min(i + 1, cards.length - 1)]?.focus();
    else if (k === "k" || e.key === "ArrowUp") cards[Math.max(i - 1, 0)]?.focus();
    else return;
    e.preventDefault();
  }

  if (loading && !data) return <Spinner />;
  if (error || !data) return <ErrorNote message={error ?? "No data"} onRetry={reload} />;

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Substitution board"
        title="Approvals"
        subtitle={
          <>
            <span className="font-display mr-1 text-xl font-bold text-white">{data.length}</span> waiting for you, most at risk first
            <span className="kbd-hint">
              {" "}
              · on a selected card: <Kbd>A</Kbd> approve, <Kbd>E</Kbd> edit, <Kbd>R</Kbd> reject, <Kbd>J/K</Kbd> next/previous
            </span>
          </>
        }
        actions={
          msg && (
            <p role="status" className="text-sm font-semibold">
              {msg}
            </p>
          )
        }
      />
      {data.length === 0 && <Card className="text-ink-2">Nothing to decide. The agents will post here when a plan needs your approval.</Card>}
      {data.map((p) => {
        const isEditing = editing === p.id;
        const proposed = p.proposed.map((d) => (edits[d.date] && isEditing ? { ...d, ...edits[d.date] } : d));
        const changes = p.proposed.map((d, i) => [p.current[i], d] as const).filter(([c, d]) => !same(c, d));
        return (
          <Card
            key={p.id}
            role="article"
            data-proposal
            tabIndex={0}
            aria-label={`${KIND_TITLE[p.kind] ?? p.kind}: ${p.player.name}`}
            onKeyDown={(e) => onCardKey(e, p)}
            className="focus:ring-pitch-400 space-y-3 outline-none focus:ring-2"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-ink-2 text-xs font-semibold">{KIND_TITLE[p.kind] ?? p.kind}</p>
                <p className="text-lg font-bold">{p.player.name}</p>
              </div>
              {p.readiness?.band && (
                <span className="text-ink-2 flex shrink-0 items-center gap-1.5 text-xs font-semibold">
                  Latest <BandBadge band={p.readiness.band} score={p.readiness.score} />
                </span>
              )}
            </div>
            <p className="text-[15px]">{p.reason}</p>
            {(p.load || (p.teams?.length ?? 0) > 1) && (
              <div className="flex flex-wrap gap-2">
                {p.load && <Chip tone={p.load.change_pct > 0 ? "amber" : "neutral"}>{loadText(p.load.change_pct)}</Chip>}
                {(p.teams?.length ?? 0) > 1 && <Chip tone="amber">Dual registration: {p.teams!.join(" + ")}</Chip>}
              </div>
            )}

            {p.proposed.length > 0 ? (
              isEditing ? (
                <EditDays days={proposed} onEdit={(date, v) => setEdits({ ...edits, [date]: v })} />
              ) : (
                <ul className="divide-[color:var(--line)] border-line divide-y rounded-md border" aria-label="What changes">
                  {changes.map(([c, d]) => (
                    <li key={d.date} className="flex flex-wrap items-baseline gap-x-2 px-3 py-2 text-[15px]">
                      <span className="w-10 shrink-0 font-bold">{fmtDay(d.date)}</span>
                      <span className="text-ink-2 line-through decoration-1">{c ? dayText(c) : "–"}</span>
                      <span aria-hidden>→</span>
                      <span className="sr-only">becomes</span>
                      <span className="font-semibold">{dayText(d)}</span>
                    </li>
                  ))}
                  {changes.length === 0 && <li className="text-ink-2 px-3 py-2 text-sm">No session changes on these days.</li>}
                </ul>
              )
            ) : (
              <GoalPayload payload={p.payload} />
            )}

            <div className="grid grid-cols-3 gap-2 sm:flex">
              <Button size="sm" disabled={busy} onClick={() => decide(p, isEditing ? "edit" : "approve")}>
                <Check className="h-4 w-4 shrink-0" aria-hidden /> {isEditing ? "Save edit" : t("inbox.approve")}
              </Button>
              {p.proposed.length > 0 &&
                (isEditing ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={busy}
                    onClick={() => {
                      setEditing(null);
                      setEdits({});
                    }}
                  >
                    Cancel
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={busy}
                    onClick={() => {
                      setEdits({});
                      setEditing(p.id);
                    }}
                  >
                    <Pencil className="h-4 w-4 shrink-0" aria-hidden /> {t("inbox.edit")}
                  </Button>
                ))}
              <Button variant="secondary" size="sm" disabled={busy} onClick={() => decide(p, "reject")}>
                <X className="h-4 w-4 shrink-0" aria-hidden /> {t("inbox.reject")}
              </Button>
            </div>

            <details>
              <summary className="tap text-ink-2 inline-flex cursor-pointer items-center text-sm font-semibold underline underline-offset-4">
                {p.proposed.length > 0 ? "Full week and how this was decided" : "How this was decided"}
              </summary>
              <div className="mt-2 space-y-2">
                {p.chips.length > 0 && (
                  <div className="flex flex-wrap gap-2" aria-label="The numbers behind it">
                    {p.chips.map((c) => (
                      <Chip key={c}>{c}</Chip>
                    ))}
                  </div>
                )}
                {p.proposed.length > 0 && (
                  <>
                    <Strip label="Now" days={p.current} />
                    <Strip label="Proposed" days={proposed} compare={p.current} />
                    <p className="text-ink-2 text-xs">Numbers are planned effort, 1 (easy) to 10 (flat out).</p>
                  </>
                )}
                {p.explanation_player && (
                  <p className="text-sm">
                    <span className="text-ink-2 font-semibold">What the player will read: </span>
                    {p.explanation_player}
                  </p>
                )}
                <p className="text-ink-2 text-xs">
                  Why it needs you: {p.policy_rule}
                  {p.solver_status && ` · Planner result: ${p.solver_status}`}
                  {p.readiness?.date && ` · Readiness from ${fmtDay(p.readiness.date, { weekday: "short", day: "numeric", month: "short" })}`}
                </p>
                <Link to={`/coach/players/${p.player.id}`} className="tap text-pitch-300 inline-flex items-center text-sm font-semibold hover:underline">
                  Open {p.player.name}'s profile →
                </Link>
              </div>
            </details>
          </Card>
        );
      })}
    </div>
  );
}

// One row per day: a phone has room for a session picker and an effort field side by side
function EditDays({ days, onEdit }: { days: PlanDay[]; onEdit: (date: string, v: { kind: SessionKind; rpe: number }) => void }) {
  return (
    <ul className="space-y-2" aria-label="Edit the proposed days">
      {days.map((d) => (
        <li key={d.date} className="grid grid-cols-[2.75rem_minmax(0,1fr)_5.5rem] items-center gap-2">
          <span className="font-bold">{fmtDay(d.date)}</span>
          {d.kind === "match" ? (
            <span className="text-ink-2 col-span-2 text-sm">Match, {d.minutes}′ (fixtures are fixed)</span>
          ) : (
            <>
              <select
                aria-label={`Session ${d.date}`}
                value={d.kind}
                onChange={(e) => onEdit(d.date, { kind: e.target.value as SessionKind, rpe: e.target.value === "rest" ? 0 : Math.max(d.rpe, 2) })}
                className="bg-surface-2 border-line h-11 w-full rounded-md border px-2"
              >
                {EDITABLE.map((k) => (
                  <option key={k} value={k}>
                    {capitalize(k)}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1.5 text-sm">
                <span className="text-ink-2">Effort</span>
                <input
                  aria-label={`Effort ${d.date}`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={10}
                  value={d.rpe}
                  disabled={d.kind === "rest"}
                  onChange={(e) => onEdit(d.date, { kind: d.kind, rpe: Number(e.target.value) })}
                  className="bg-surface-2 border-line h-11 w-full min-w-0 rounded-md border px-2 disabled:opacity-50"
                />
              </label>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

function Strip({ label, days, compare }: { label: string; days: PlanDay[]; compare?: PlanDay[] }) {
  return (
    <div className="flex items-stretch gap-2">
      <span className="text-ink-2 w-16 shrink-0 pt-2 text-xs font-semibold">{label}</span>
      <div className="grid flex-1 gap-1" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
        {days.map((d, i) => (
          <div
            key={d.date}
            title={dayText(d)}
            className={cn("rounded-md px-0.5 py-1.5 text-center text-xs", intensityClass(d.kind, d.rpe), compare && !same(compare[i], d) && "ring-caution ring-2")}
          >
            <div className="font-bold">{fmtDay(d.date)}</div>
            <div>{SHORT[d.kind]}</div>
            <div className="font-bold">{d.kind === "rest" ? "–" : d.kind === "match" ? `${d.minutes}′` : d.rpe}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const KPI_NAME: Record<string, string> = { sprint_10m: "10 m sprint", sprint_30m: "30 m sprint", cmj: "Jump power", yoyo_ir1: "Endurance", technique: "Ball skills" };

function GoalPayload({ payload }: { payload: Record<string, unknown> }) {
  const goals = (payload.goals as { kpi: string; baseline: number; target: number; bio_percentile: number; sessions_per_week: number }[]) ?? [];
  return (
    <div className="space-y-1 text-[15px]">
      {goals.map((g) => (
        <p key={g.kpi}>
          <strong>{KPI_NAME[g.kpi] ?? g.kpi.replaceAll("_", " ")}</strong>: {g.baseline} → {g.target}, {g.sessions_per_week}× a week
          <span className="text-ink-2"> · now at the {ordinal(Math.round(g.bio_percentile))} percentile for players at the same stage of growth</span>
        </p>
      ))}
      {typeof payload.feedback === "string" && <p className="text-ink-2 italic">“{payload.feedback}”</p>}
    </div>
  );
}
