"""Who decides about consent, what a player and a parent are told while a plan change waits,
and the order and wording of the coach's inbox."""

from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from agents.rules import coach_reason
from analytics.flags import Flag, FlagKind
from api import clock
from api.db import SessionLocal, init_db
from api.deps import age_on, record_self_consent
from api.main import app
from api.services.seed import seed
from domain.enums import ConsentDataType, SessionType
from domain.models import ConsentRecord, Guardian, Player
from planner.schema import PlanDay, PlanResult

CHECKIN = {"sleep_quality": 2, "fatigue": 2, "stress": 2, "soreness": 2, "mood": "green", "sleep_hours": 8.5}


@pytest.fixture(scope="module")
def demo():
    init_db()
    with SessionLocal() as db:
        info = seed(db, n_players=8)
    with TestClient(app) as client:
        yield client, info


def login(client, email):
    r = client.post("/api/auth/login", json={"email": email, "password": "demo1234"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


def _family(minor: bool) -> tuple[str, str, str]:
    """(player id, player email, guardian email) of a demo academy player under / over 16."""
    today = clock.today()
    with SessionLocal() as db:
        for p in db.scalars(select(Player).where(Player.email.like("p%@demo.pathtopro")).order_by(Player.email)):
            if (age_on(p.birth_date, today) < 16) == minor and p.guardians:
                return p.id, p.email, p.guardians[0].email
    raise AssertionError("no such demo player")


# --------------------------------------------------------------------------- coach reason


def _result(status="optimal", cap=None) -> PlanResult:
    days = [PlanDay(day=0, date=date(2026, 11, 23), kind=SessionType.TECHNICAL, rpe=4, minutes=75)]
    return PlanResult(player_id="p", days=days, status=status, weekly_load_cap=cap)


def test_coach_reason_is_plain_words_with_the_numbers_in_brackets():
    flags = [
        Flag(FlagKind.LOAD_SPIKE, "ACWR 1.61", 1.61),
        Flag(FlagKind.SHORT_SLEEP, "Sleep < 6 h x 3", 5.4),
        Flag(FlagKind.LOW_HRV, "HRV -2.1 SD", -2.1),
        Flag(FlagKind.PHV_WINDOW, "Growth zone (+0.1 y from PHV)", 0.1),
        Flag(FlagKind.PAIN_REPORT, "Pain reported"),  # safety flags never reach a plan reason
    ]
    text = coach_reason(flags, _result(cap=2100))
    assert text.startswith("Load 61% above the 4-week average (ACWR 1.61), under 6 h sleep 3 nights running")
    assert "heart-rate variability well below their normal (-2.1 SD) and in the growth spurt." in text
    assert "Week capped at 2100 AU" in text
    assert "optimal" not in text and "Pain" not in text
    assert coach_reason([], _result()) == "No risk flags."
    assert "safe template" in coach_reason([], _result(status="template"))


# --------------------------------------------------------------------------- inbox


def test_inbox_puts_the_player_most_at_risk_first_and_shows_the_load_change(demo):
    client, _ = demo
    inbox = client.get("/api/coach/inbox", headers=login(client, "coach@demo.pathtopro")).json()
    plans = [p for p in inbox if p["proposed"]]
    assert plans and inbox[: len(plans)] == plans  # plan changes before new goals
    rank = {"red": 0, "amber": 1, "green": 2, None: 3}
    bands = [rank[(p["readiness"] or {}).get("band")] for p in plans]
    assert bands == sorted(bands)
    for p in plans:
        assert set(p["load"]) == {"current", "proposed", "change_pct"}
        assert not p["reason"].startswith(("optimal", "relaxed", "feasible", "template"))
    assert all(p["load"] is None for p in inbox if not p["proposed"])


def test_attention_counts_what_is_waiting_for_a_person(demo):
    client, info = demo
    coach = login(client, "coach@demo.pathtopro")
    waiting = client.get("/api/coach/attention", headers=coach).json()
    inbox = client.get("/api/coach/inbox", headers=coach).json()
    assert waiting["approvals"] == len(inbox) > 0
    assert waiting["plan_changes"] == sum(1 for p in inbox if p["proposed"])
    assert waiting["escalations"] == len(client.get("/api/physio/queue", headers=coach).json())
    assert client.get("/api/coach/attention", headers=login(client, info["story"]["tired_email"])).status_code == 403


# --------------------------------------------------------------------------- the player's Today


def test_player_is_told_a_lighter_plan_waits_for_the_coach(demo):
    client, info = demo
    coach = login(client, "coach@demo.pathtopro")
    player = login(client, info["story"]["tired_email"])
    pending = client.get("/api/me/today", headers=player).json()["pending_change"]
    assert pending["approver"] == client.get("/api/auth/me", headers=coach).json()["name"]
    assert pending["lighter"] and pending["load_change_pct"] < 0

    me = client.get("/api/auth/me", headers=player).json()
    prop = next(p for p in client.get("/api/coach/inbox", headers=coach).json() if p["player"]["id"] == me["player_id"] and p["proposed"])
    assert prop["load"]["change_pct"] == pending["load_change_pct"]
    # His parent reads the same thing in plain words (he is under 16, so the parent consents)
    with SessionLocal() as db:
        p = db.get(Player, me["player_id"])
        minor, guardian = age_on(p.birth_date, clock.today()) < 16, login(client, p.guardians[0].email)
    summary = f"/api/guardian/children/{me['player_id']}/summary"
    if minor:
        note = client.get(summary, headers=guardian).json()["week_note"]
        assert note["state"] == "pending" and pending["approver"] in note["text"] and "lighter week" in note["text"]

    r = client.post(f"/api/coach/proposals/{prop['id']}/decision", headers=coach, json={"action": "approve"})
    assert r.status_code == 200
    assert client.get("/api/me/today", headers=player).json()["pending_change"] is None
    if minor:
        note = client.get(summary, headers=guardian).json()["week_note"]
        assert note["state"] == "changed" and f"{pending['approver']} approved it." in note["text"]


def test_today_is_on_hold_from_a_pain_report_until_the_named_adult_answers(demo):
    client, _ = demo
    _, email, _ = _family(minor=False)
    h = login(client, email)
    assert client.get("/api/me/today", headers=h).json()["on_hold"] is None
    r = client.post("/api/me/checkin", headers=h, json={**CHECKIN, "pain": True})
    assert r.json()["escalated"]
    physio = login(client, "physio@demo.pathtopro")
    hold = r.json()["today"]["on_hold"]
    assert hold == {"kind": "pain_report", "contact": client.get("/api/auth/me", headers=physio).json()["name"]}
    queue = client.get("/api/physio/queue", headers=physio).json()
    mine = next(e for e in queue if e["kind"] == "pain_report" and e["player"]["id"] == client.get("/api/auth/me", headers=h).json()["player_id"])
    assert client.post(f"/api/physio/escalations/{mine['id']}/ack", headers=physio).status_code == 200
    assert client.get("/api/me/today", headers=h).json()["on_hold"] is None


# --------------------------------------------------------------------------- consent


def test_from_16_the_player_decides_and_the_parent_cannot(demo):
    client, _ = demo
    pid, email, guardian = _family(minor=False)
    with SessionLocal() as db:  # written down at sign-up, in the player's own name
        recs = db.scalars(select(ConsentRecord).where(ConsentRecord.player_id == pid)).all()
        assert {r.data_type for r in recs} == set(ConsentDataType) and all(r.guardian_id is None and r.granted for r in recs)

    g = login(client, guardian)
    seen = client.get(f"/api/guardian/children/{pid}/consent", headers=g).json()
    assert seen["self_managed"] and all(i["granted"] for i in seen["items"])
    r = client.put(f"/api/guardian/children/{pid}/consent", headers=g, json={"data_type": "wellness", "granted": False})
    assert r.status_code == 403 and "old enough" in r.json()["detail"]
    assert client.get(f"/api/guardian/children/{pid}/summary", headers=g).json()["week_note"] is None

    h = login(client, email)
    mine = client.get("/api/me/consent", headers=h).json()
    assert mine["self_managed"] and len(mine["items"]) == len(ConsentDataType)
    off = client.put("/api/me/consent", headers=h, json={"data_type": "wellness", "granted": False}).json()
    assert {i["data_type"]: i["granted"] for i in off["items"]}["wellness"] is False
    assert client.post("/api/me/checkin", headers=h, json=CHECKIN).status_code == 403  # withdrawn: nothing stored
    client.put("/api/me/consent", headers=h, json={"data_type": "wellness", "granted": True})
    assert client.post("/api/me/checkin", headers=h, json=CHECKIN).status_code == 200


def test_under_16_the_parent_decides_and_gets_the_week_in_plain_words(demo):
    client, _ = demo
    pid, email, guardian = _family(minor=True)
    h, g = login(client, email), login(client, guardian)
    assert client.get("/api/me/consent", headers=h).json()["self_managed"] is False
    assert client.put("/api/me/consent", headers=h, json={"data_type": "sleep", "granted": False}).status_code == 403
    r = client.put(f"/api/guardian/children/{pid}/consent", headers=g, json={"data_type": "sleep", "granted": False})
    assert r.status_code == 200 and r.json()["self_managed"] is False
    client.put(f"/api/guardian/children/{pid}/consent", headers=g, json={"data_type": "sleep", "granted": True})

    note = client.get(f"/api/guardian/children/{pid}/summary", headers=g).json()["week_note"]
    assert note["state"] in {"normal", "watch", "pending", "changed"} and note["text"].endswith(".")
    # A report to the named adult stays with that adult: the parent's note never repeats it
    client.post("/api/me/checkin", headers=h, json={**CHECKIN, "mood": "red", "pain": True})
    text = client.get(f"/api/guardian/children/{pid}/summary", headers=g).json()["week_note"]["text"].lower()
    assert "pain" not in text and "mood" not in text


def test_self_consent_is_recorded_once_and_only_from_16():
    init_db()
    today = clock.today()
    with SessionLocal() as db:
        seed(db, n_players=4, story=False)
        players = db.scalars(select(Player)).all()
        old = next(p for p in players if age_on(p.birth_date, today) >= 16)
        young = next((p for p in players if age_on(p.birth_date, today) < 16), None)
        assert record_self_consent(db, old, today) == 0  # the seed already wrote them
        db.query(ConsentRecord).filter(ConsentRecord.player_id == old.id, ConsentRecord.data_type == ConsentDataType.HRV).delete()
        assert record_self_consent(db, old, today) == 1
        assert record_self_consent(db, old, today) == 0
        if young is not None:
            assert record_self_consent(db, young, today) == 0
        assert db.scalars(select(Guardian)).first() is not None
        db.rollback()
