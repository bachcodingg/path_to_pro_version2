# Demo script

## The 60-second version (one phone, or one narrow window)

One loop, three sign-ins, no slides. Press "Reset demo" first.

1. **Leon** (`p15@demo.pathtopro`). Today says in one sentence that he has trained a lot and
   slept little. His session is still Strength at effort 8, and under it: "A lighter plan is
   waiting for Alex Weber." Say: *the system noticed overnight, but it does not decide alone.*
2. **Coach** (`coach@demo.pathtopro`). The first thing on the page is **Needs you**: plan
   changes to approve. Tap it. Leon is the first card: why in plain words, "42% less load",
   the two days that change. Tap **Approve**.
3. **Leon** again. Today's session is now Recovery at effort 3, and "Why did my plan change?"
   names the coach who approved it. Say: *code computes, a fixed policy decides who approves,
   the player always sees why.*

If there are 20 seconds left: sign in as **Leon's parent** (`guardian15@demo.pathtopro`) and
read the first card, "This week in short".

## The full version (7 minutes)

Setup: `docker compose up --build`, open http://localhost:8080. The seeder resets the
synthetic season and sets "today" to Thursday of week 12. All passwords: `demo1234`.

1. **Problem (30 s)** - one slide: load spikes, growth spurts, poor sleep, no
   development plan, mental pressure.

2. **Prevention flow (2 min)**
   - Phone (or narrow window): sign in as **Leon U.** (`p15@demo.pathtopro`). Do the
     morning check-in: 4 cards + mood, under 30 seconds.
   - Desktop: sign in as **Coach** (`coach@demo.pathtopro`). Squad readiness opens with
     "Needs you"; the heatmap shows Leon's red cells, a growth-zone ring and a load-spike triangle.
   - Approvals: Leon's card is first. It gives the reason in plain words, the load change and
     the days that change; "Full week and how this was decided" opens the current and proposed
     week, the chips ("Sleep 5.5 h x 3", "Load +61%", "HRV -2.1 SD", "Growth zone") and the
     policy rule. Select the card and press **A**.
   - Back on the phone: Today shows the updated session; the "Why?" card explains the
     change and says "Approved by Alex Weber".

3. **Development flow (1 min)** - Leon's card: attributes as bio-banded percentiles; tap
   jump power for the test history and the linked drills. Road to Pro shows the test-day
   checkpoints and the 4-week goal. The **Gym** tab shows his position's session: the
   shared injury-prevention work plus his position block, with growth-zone limits on top.
   Coach view: on a player's scouting report, type "keep him light until tomorrow, no gym
   this week", press Preview, then Apply.

4. **Beyond the academy (1 min)** - sign in as **Self-guided player** (`amateur@demo.pathtopro`):
   Maya, 17, plays for her local club. Today shows level 2 "Grassroots" and her week
   built around club training (Tue, Thu) and Saturday matches. Open **Levels**, pick "Wall
   passes in 30 s", log 19: she meets 4 of 6 benchmarks and moves up to level 3. Anyone
   can sign up at `/register`; under-16s get a parent invite code.

5. **Two teams, one plan (1 min)** - sign in as **Dual-squad player**: My week shows
   the U19 match on Saturday at 90 minutes and the men's Kakkonen match on Sunday at 0' (rule
   H8: under-18s play at most 90 minutes over back-to-back days). **Career** shows both
   teams, ratings and the pathway chart; fill in the match diary. As **Coach**: Training
   pitch, drag "Speed" onto Friday: every player gets an easier version (day before a match),
   apply. Match ratings: open the last match, expand a rating to see its breakdown.

6. **Evidence (1 min)** - `docs/evaluation/seeds.md` (10 seeds, 95% CIs): 0 hard-rule
   violations, 68-70% fewer ACWR spike weeks than the plan's baseline and still 67-71% fewer
   than a heuristic coach that follows the same rules as if-statements, 54/54 safety
   scenarios. Say the limits out loud: no detectable injury difference vs the heuristic, the
   agents add ~1 high-monotony player-week per squad season (the baseline has none), the LLM
   and SUS are not measured yet.

7. **Safety (30 s)** - sign in as any player, check in with mood "Not good". Sign in as
   **Physio** (`physio@demo.pathtopro`): the red check-in is in the queue within a second,
   with no agent reply to the player beyond "a staff member will talk to you".

Offline: the demo needs no API key; with `PATHTOPRO_LLM=off` everything is rule-based.
