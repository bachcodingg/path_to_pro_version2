// Physio: escalation queue (oldest first) plus the squad's PHV list.
import { useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../shared/api";
import type { Status } from "../shared/types";
import { PageHeader } from "../shared/PageHeader";
import { useApi } from "../shared/useApi";
import { BandBadge, Button, Card, ErrorNote, SectionTitle, Spinner } from "../shared/ui";

interface Escalation {
  id: string;
  player: { id: string; name: string };
  kind: string;
  text: string;
  created_at: string;
  age_minutes: number;
  notified_after_s: number | null;
  emailed_after_s?: number | null;
  readiness: Status | null;
}
interface PhvRow {
  id: string;
  name: string;
  age: number;
  maturity_offset: number;
  in_window: boolean;
}

function age(min: number): string {
  if (min < 60) return `${min} min ago`;
  if (min < 60 * 24) return `${Math.round(min / 60)} h ago`;
  return `${Math.round(min / 1440)} d ago`;
}

export function PhysioHome() {
  const queue = useApi<Escalation[]>("/api/physio/queue");
  const phv = useApi<PhvRow[]>("/api/physio/phv");
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  async function ack(id: string) {
    setBusy(id);
    setFailed(null);
    try {
      await api(`/api/physio/escalations/${id}/ack`, { method: "POST" });
      queue.setData((q) => q && q.filter((e) => e.id !== id));
    } catch (e) {
      // The report stays in the queue: nothing is marked as answered that was not saved
      setFailed(e instanceof ApiError ? e.message : "Could not save that. The report is still in your queue: try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Medical"
        title="Physio queue"
        subtitle="Escalations: pain reports and red check-ins, oldest first. The agents take no action on these: they are yours."
        actions={
          queue.data && (
            <span className="text-right">
              <span className="font-display block text-4xl leading-none font-bold">{queue.data.length}</span>
              <span className="text-xs font-semibold text-white/95">waiting</span>
            </span>
          )
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section>
          {queue.loading && !queue.data && <Spinner />}
          {queue.error && <ErrorNote message={queue.error} onRetry={queue.reload} />}
          {failed && (
            <p role="alert" className="text-recover mb-2 text-sm font-semibold">
              {failed}
            </p>
          )}
          {queue.data?.length === 0 && <Card className="text-ink-2">Nobody is waiting for you. Pain reports and red check-ins appear here the moment they are sent.</Card>}
          <ul className="space-y-2">
            {queue.data?.map((e) => (
              <li key={e.id}>
                <Card className="border-recover/50 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-recover text-xs font-bold">{e.text}</p>
                    <Link to={`/coach/players/${e.player.id}`} className="tap flex items-center text-lg font-bold hover:underline">
                      {e.player.name}
                    </Link>
                    <p className="text-ink-2 text-sm">
                      {age(e.age_minutes)}
                      {e.notified_after_s != null &&
                        ` · in this queue ${e.notified_after_s < 1 ? "within a second" : `${Math.round(e.notified_after_s)} s`} after the check-in`}
                      {e.emailed_after_s != null && ` · emailed after ${e.emailed_after_s < 1 ? "under a second" : `${Math.round(e.emailed_after_s)} s`}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <BandBadge band={e.readiness?.band ?? null} score={e.readiness?.score} />
                    <Button onClick={() => ack(e.id)} loading={busy === e.id}>
                      I've spoken to them
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <SectionTitle>Growth spurt list</SectionTitle>
          <p className="text-ink-2 mb-2 text-sm">
            Years before (−) or after (+) each player's fastest growth, estimated from height and sitting height (within about half a year).
            Highlighted: in the growth zone now.
          </p>
          {phv.loading && !phv.data && <Spinner />}
          <Card className="divide-[color:var(--line)] divide-y p-0">
            {phv.data?.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-3 py-1">
                <Link to={`/coach/players/${p.id}`} className="tap flex items-center font-semibold hover:underline">
                  {p.name}
                </Link>
                <span className={p.in_window ? "text-caution font-bold" : "text-ink-2"}>
                  {p.maturity_offset > 0 ? "+" : ""}
                  {p.maturity_offset.toFixed(1)} years{p.in_window && <span className="sr-only">, in the growth zone</span>}
                </span>
              </div>
            ))}
            {phv.data?.length === 0 && <p className="text-ink-2 p-3 text-sm">No players near their growth spurt.</p>}
          </Card>
        </section>
      </div>
    </div>
  );
}
