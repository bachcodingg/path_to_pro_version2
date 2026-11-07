// "Your attribute card": percentiles vs players at the same stage of growth (bio-banded).
import { Map } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Attribute, Card as CardData } from "../shared/types";
import { useApi } from "../shared/useApi";
import { Card, Chip, ErrorNote, SectionTitle, Spinner, capitalize, cn, fmtValue, ordinal } from "../shared/ui";

const STATUS_TEXT: Record<string, string> = {
  pre_phv: "before growth spurt",
  circa_phv: "in growth spurt",
  post_phv: "after growth spurt",
};

export function PlayerCard() {
  const { data, error, loading, reload } = useApi<CardData>("/api/me/card");
  const [open, setOpen] = useState<string | null>(null);
  if (loading && !data) return <Spinner />;
  if (error || !data) return <ErrorNote message={error ?? "No data"} onRetry={reload} />;

  const byAttr = (a: string) => data.attributes.filter((x) => x.attribute === a);
  const overall = Math.round(data.attributes.reduce((s, a) => s + a.bio_percentile, 0) / Math.max(1, data.attributes.length));
  const selected = data.attributes.find((a) => a.kpi === open);

  return (
    <div className="space-y-4 pt-2">
      <Link to="/player/road" className="text-pitch-300 flex items-center justify-end gap-1 text-sm font-semibold">
        <Map className="h-4 w-4" aria-hidden /> Road to Pro
      </Link>
      {/* Wide screens: the card on the left, the tests beside it */}
      <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start lg:gap-6 lg:space-y-0">
        <div className="space-y-5">
          <div className="hero turf-sheet px-4 pt-5 pb-4">
            {/* The back of a shirt: name across the shoulders, the average percentile as the number */}
            <svg viewBox="0 0 320 300" className="mx-auto w-full max-w-[19rem]" role="img" aria-label={`${data.name}, average percentile ${overall}`}>
              <path d="M104 12c14 14 98 14 112 0l74 34 26 78-58 18-8-30v176c-54 10-132 10-180 0V112l-8 30-58-18 26-78z" fill="var(--brand-300)" stroke="#0a2a1e" strokeWidth="3" strokeLinejoin="round" />
              <path d="M104 12c14 14 98 14 112 0" fill="none" stroke="#0a2a1e" strokeWidth="9" />
              <text x="160" y="84" textAnchor="middle" className="font-display" fontSize="30" fontWeight="800" fill="#0a2a1e">
                {data.name}
              </text>
              <text x="160" y="222" textAnchor="middle" className="font-display" fontSize="128" fontWeight="900" fill="#0a2a1e">
                {overall}
              </text>
            </svg>
            <p className="mt-2 text-center text-[15px]">Average percentile, compared with players {STATUS_TEXT[data.maturity_status] ?? ""}</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {(["speed", "power", "endurance"] as const).map((attr) => {
                const items = byAttr(attr);
                const v = items.length ? Math.round(items.reduce((s, a) => s + a.bio_percentile, 0) / items.length) : null;
                return (
                  <button
                    key={attr}
                    onClick={() => setOpen(items[0]?.kpi ?? null)}
                    className="tap bg-pitch-950/70 hover:bg-pitch-950 rounded-md py-2 text-center"
                    aria-label={`${attr}: ${v ?? "no data"} percentile`}
                  >
                    <p className="font-display text-3xl leading-none font-black">{v ?? "–"}</p>
                    <p className="mt-1 text-[13px] font-semibold capitalize">{attr}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <section>
            <SectionTitle>Tests</SectionTitle>
            <div className="space-y-2">
              {data.attributes.map((a) => (
                <AttrRow key={a.kpi} a={a} active={open === a.kpi} onClick={() => setOpen(open === a.kpi ? null : a.kpi)} />
              ))}
            </div>
            <p className="text-ink-2 mt-2 text-xs">
              Percentiles use placeholder reference values for this demo, not validated academy norms. Treat them as a rough guide.
            </p>
          </section>

          {selected && (
            <Card>
              <p className="font-bold">{capitalize(selected.label)}: history</p>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={selected.history} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} fontSize={11} stroke="var(--ink-2)" />
                    <YAxis domain={["auto", "auto"]} reversed={selected.unit === "s"} fontSize={11} stroke="var(--ink-2)" />
                    <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)" }} />
                    <Line dataKey="value" stroke="var(--brand-300)" strokeWidth={3} dot />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {selected.drills.length > 0 ? (
                <>
                  <p className="mt-3 font-bold">Your drills</p>
                  <ul className="mt-1 space-y-2">
                    {selected.drills.map((d) => (
                      <li key={d.id} className="bg-surface-2 rounded-md p-3">
                        <p className="font-semibold">{d.name}</p>
                        <p className="text-ink-2 text-sm">{d.description}</p>
                        <div className="mt-1 flex gap-2">
                          <Chip>{d.minutes} min</Chip>
                          <Chip>effort {d.rpe}</Chip>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-ink-2 mt-2 text-sm">No drills linked to this test right now.</p>
              )}
            </Card>
          )}
        </div>
      </div>

    </div>
  );
}

function AttrRow({ a, active, onClick }: { a: Attribute; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn("bg-surface border-line tap w-full rounded-[10px] border p-3 text-left", active && "border-pitch-300")} aria-expanded={active}>
      <div className="flex items-center justify-between">
        <span className="font-semibold">{capitalize(a.label)}</span>
        <span className="text-ink-2 text-sm">
          {fmtValue(a.value, a.unit)} {a.unit}
        </span>
      </div>
      <div className="bg-surface-2 mt-2 h-2.5 overflow-hidden rounded-full" aria-hidden>
        <div className="bg-pitch-400 h-full rounded-full" style={{ width: `${a.bio_percentile}%` }} />
      </div>
      <p className="text-ink-2 mt-1 text-xs">
        {ordinal(a.bio_percentile)} percentile at your stage of growth · {ordinal(a.age_percentile)} for your age group
      </p>
    </button>
  );
}
