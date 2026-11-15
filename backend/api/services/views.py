"""Read models shared by the role views."""

from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from agents.rules import KPI_LABEL
from api.services import agent_runner
from domain.enums import ProposalStatus, Role, SessionType
from domain.models import (
    Approval,
    DailyStatus,
    Escalation,
    Player,
    Proposal,
    SessionLoad,
    StaffMember,
    WeeklyPlan,
    WellnessCheckin,
)
from planner.schema import PlanDay

SESSION_LABEL = {
    SessionType.REST: "Rest day",
    SessionType.RECOVERY: "Recovery",
    SessionType.TECHNICAL: "Technical",
    SessionType.TACTICAL: "Tactical",
    SessionType.STRENGTH: "Strength",
    SessionType.SPEED: "Speed",
    SessionType.MATCH: "Match",
}

FLAG_PLAYER_TEXT = {
    "load_spike": "Training load jumped",
    "high_monotony": "Every day felt the same",
    "short_sleep": "Short sleep",
    "low_hrv": "Body still recovering",
    "phv_window": "Growth zone",
    "readiness_red": "Low battery",
}

UNITS = {"sprint_10m": "s", "sprint_30m": "s", "cmj": "cm", "yoyo_ir1": "m"}


def day_json(d: PlanDay) -> dict:
    return {
        "date": d.date.isoformat(),
        "kind": d.kind.value,
        "label": SESSION_LABEL[d.kind],
        "rpe": d.rpe,
        "minutes": d.minutes,
        "load": d.rpe * d.minutes,
    }


def week_start(day: date) -> date:
    return day - timedelta(days=day.weekday())


def week_days(db: Session, player: Player, start: date) -> list[dict]:
    from domain.models import Squad

    matches = agent_runner.match_days(db, player, start, 7)
    out = []
    for d in agent_runner.plan_days(db, player, start, 7):
        j = day_json(d)
        m = matches.get(d.date)
        if m is not None:
            squad = db.get(Squad, m.squad_id)
            j["match"] = {
                "opponent": m.opponent,
                "team": squad.name if squad else "",
                "primary": m.squad_id == player.squad_id,
                "time": m.kickoff.strftime("%H:%M"),
            }
        out.append(j)
    return out


def status(db: Session, player_id: str, day: date) -> DailyStatus | None:
    return db.scalars(select(DailyStatus).where(DailyStatus.player_id == player_id, DailyStatus.day == day)).first()


def latest_status(db: Session, player_id: str, day: date) -> DailyStatus | None:
    return db.scalars(
        select(DailyStatus)
        .where(DailyStatus.player_id == player_id, DailyStatus.day <= day)
        .order_by(DailyStatus.day.desc())
        .limit(1)
    ).first()


def status_json(st: DailyStatus | None) -> dict | None:
    if st is None:
        return None
    return {
        "date": st.day.isoformat(),
        "score": st.readiness,
        "band": st.band,
        "acwr": st.acwr,
        "in_phv_window": st.in_phv_window,
        "maturity_offset": st.maturity_offset,
        "flags": st.flags,
        "chips": st.chips,
        "components": st.components or {},
    }


def why_cards(db: Session, player: Player, limit: int = 5) -> list[dict]:
    """The most recent applied agent changes, with their data and who approved them."""
    out = []
    for p in db.scalars(
        select(Proposal)
        .where(
            Proposal.player_id == player.id,
            Proposal.status.in_([ProposalStatus.APPROVED, ProposalStatus.EDITED, ProposalStatus.AUTO_APPLIED]),
        )
        .order_by(Proposal.created_at.desc())
        .limit(limit)
    ):
        appr = db.scalars(select(Approval).where(Approval.proposal_id == p.id)).first()
        approver = db.get(StaffMember, appr.approver_id).name if appr else "Auto-applied (policy)"
        plan = db.get(WeeklyPlan, p.proposed_plan_id) if p.proposed_plan_id else None
        out.append(
            {
                "id": p.id,
                "kind": p.kind,
                "title": _card_title(p),
                "explanation": plan.explanation_player if plan else p.reason,
                "chips": p.data_chips,
                "approved_by": approver,
                "status": p.status.value,
                "changed_days": p.payload.get("changed_days", []),
                "created_at": p.created_at.isoformat(),
            }
        )
    return out


def _pending_plan(db: Session, player: Player, today: date) -> tuple[Proposal, WeeklyPlan] | None:
    """The newest plan change still waiting for the coach, if it covers today or later."""
    for prop in db.scalars(
        select(Proposal)
        .where(
            Proposal.player_id == player.id,
            Proposal.status == ProposalStatus.PENDING,
            Proposal.proposed_plan_id.is_not(None),
        )
        .order_by(Proposal.created_at.desc())
    ):
        plan = db.get(WeeklyPlan, prop.proposed_plan_id)
        if plan is not None and plan.items and max(i.day for i in plan.items) >= today:
            return prop, plan
    return None


def plan_change(db: Session, player: Player, plan: WeeklyPlan) -> dict:
    """How a proposed plan differs in load from the player's current one over the same days."""
    items = sorted(plan.items, key=lambda i: i.day)
    current = agent_runner.plan_days(db, player, items[0].day, len(items))
    old = sum(d.rpe * d.minutes for d in current)
    new = sum(i.target_rpe * i.minutes for i in items)
    return {"current": old, "proposed": new, "change_pct": round(100 * (new - old) / old) if old else 0}


def primary_coach(db: Session, player: Player) -> StaffMember | None:
    return db.scalars(
        select(StaffMember).where(StaffMember.squad_id == player.squad_id, StaffMember.role == Role.COACH)
    ).first()


def pending_change(db: Session, player: Player, today: date) -> dict | None:
    """A plan change that waits for the coach. The player is told it exists and who decides,
    so a hard session next to a low battery is not the last word on the screen."""
    found = _pending_plan(db, player, today)
    if found is None:
        return None
    _, plan = found
    coach = primary_coach(db, player)
    load = plan_change(db, player, plan)
    item = next((i for i in plan.items if i.day == today), None)
    now = agent_runner.plan_days(db, player, today, 1)[0]
    differs = item is not None and (item.kind != now.kind or item.target_rpe != now.rpe or item.minutes != now.minutes)
    return {
        "approver": coach.name if coach else None,
        "lighter": load["proposed"] < load["current"],
        "load_change_pct": load["change_pct"],
        # What today would become, only if today itself is part of the change
        "today": day_json(PlanDay(day=0, date=today, kind=item.kind, rpe=item.target_rpe, minutes=item.minutes))
        if differs
        else None,
    }


def on_hold(db: Session, player: Player) -> dict | None:
    """An open pain report, red mood or silence that the named adult has not answered yet.
    The agents take no action on these, so the plan itself is unchanged: the player is
    told to speak to that person before training instead."""
    esc = db.scalars(
        select(Escalation)
        .where(Escalation.player_id == player.id, Escalation.acknowledged_at.is_(None))
        .order_by(Escalation.created_at.desc())
        .limit(1)
    ).first()
    if esc is None:
        return None
    contact = db.get(StaffMember, esc.staff_id)
    return {"kind": esc.kind, "contact": contact.name if contact else None}


WEEK_NOTE_REASON = {
    "load_spike": "has trained a lot more than usual lately",
    "short_sleep": "has slept under 6 hours several nights in a row",
    "low_hrv": "is still recovering from recent sessions",
    "phv_window": "is in a growth spurt, when jumps and sprints are kept short",
    "high_monotony": "has had too many similar days in a row",
}


def week_note(db: Session, player: Player, today: date) -> dict:
    """The week in a parent's words: is it a normal week, and if not, why and who decided.
    Planning reasons only: pain and mood reports go to the named adult, never into this note."""
    first = player.display_name.split()[0]
    st = latest_status(db, player.id, today)
    kinds = {f["kind"] for f in (st.flags if st else [])}
    reasons = [text for kind, text in WEEK_NOTE_REASON.items() if kind in kinds]
    why = ""
    if reasons:
        why = f"{first} " + (", ".join(reasons[:-1]) + " and " + reasons[-1] if len(reasons) > 1 else reasons[0]) + "."
    pending = _pending_plan(db, player, today)
    if pending is not None:
        coach = primary_coach(db, player)
        load = plan_change(db, player, pending[1])
        if load["change_pct"] < 0:
            what = f"A lighter week ({-load['change_pct']}% less training load)"
        else:
            what = "A changed week"
        text = f"{what} is waiting for {coach.name if coach else 'the coach'} to approve. {why}"
        return {"state": "pending", "text": text.strip()}
    start = week_start(today)
    applied = db.scalars(
        select(Proposal)
        .where(
            Proposal.player_id == player.id,
            Proposal.proposed_plan_id.is_not(None),
            Proposal.status.in_([ProposalStatus.APPROVED, ProposalStatus.EDITED, ProposalStatus.AUTO_APPLIED]),
        )
        .order_by(Proposal.created_at.desc())
        .limit(1)
    ).first()
    plan = db.get(WeeklyPlan, applied.proposed_plan_id) if applied else None
    if plan is not None and plan.items and max(i.day for i in plan.items) >= start:
        appr = db.scalars(select(Approval).where(Approval.proposal_id == applied.id)).first()
        who = f"{db.get(StaffMember, appr.approver_id).name} approved it." if appr else "It was a small change, applied automatically."
        return {"state": "changed", "text": " ".join(x for x in ("This week's plan was adjusted.", why, who) if x)}
    if reasons:
        return {"state": "watch", "text": f"The plan is unchanged this week. {why} The coach can see this too."}
    return {"state": "normal", "text": f"A normal training week for {first}."}


def _card_title(p: Proposal) -> str:
    return {
        "session_swap": "Your sessions were changed",
        "load_cut": "Your week was made lighter",
        "load_increase": "Your week got a bit harder",
        "intensity_change": "Session intensity adjusted",
        "match_minutes": "Your match minutes are limited",
        "new_goal": "New development goal",
        "drill_suggestion": "New drills for you",
        "coach_instruction": "Your coach adjusted your week",
        "team_session": "Your coach planned a team session",
    }.get(p.kind, "Plan updated")


def daily_loads(db: Session, player_id: str, start: date, end: date) -> dict[date, float]:
    out = defaultdict(float)
    for sl in db.scalars(
        select(SessionLoad).where(SessionLoad.player_id == player_id, SessionLoad.day >= start, SessionLoad.day <= end)
    ):
        out[sl.day] += sl.load_au
    return out


def checkin_days(db: Session, player_id: str) -> list[date]:
    return sorted(c.day for c in db.scalars(select(WellnessCheckin).where(WellnessCheckin.player_id == player_id)))


def streak(days: list[date], today: date) -> int:
    s, d, have = 0, today, set(days)
    if d not in have:
        d -= timedelta(days=1)
    while d in have:
        s += 1
        d -= timedelta(days=1)
    return s


def badges(total_checkins: int, goals_met: int) -> list[dict]:
    """Badges are earned once and never taken away (missing a day never removes points)."""
    out = []
    for n, name in ((7, "First week"), (21, "Habit builder"), (50, "Iron routine"), (100, "Season pro")):
        out.append({"id": f"checkins_{n}", "name": name, "earned": total_checkins >= n, "rule": f"{n} check-ins"})
    out.append({"id": "goal_1", "name": "Goal getter", "earned": goals_met >= 1, "rule": "Meet a 4-week goal"})
    return out


def kpi_label(kpi: str) -> str:
    return KPI_LABEL.get(kpi, kpi)
