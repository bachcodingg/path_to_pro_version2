import { USUAL_WEEK, rebuildWeek, weekLoad } from "./weekModel";

const NONE = { sleep: false, load: false, growth: false, pain: false };

describe("rebuildWeek", () => {
  it("leaves a normal week alone", () => {
    const out = rebuildWeek(NONE);
    expect(out.days).toEqual(USUAL_WEEK);
    expect(out.decision).toBe("none");
    expect(out.loadChange).toBe(0);
  });

  it("keeps the first two days easy after short sleep", () => {
    const out = rebuildWeek({ ...NONE, sleep: true });
    expect(out.days[0].rpe).toBeLessThanOrEqual(4);
    expect(out.days[1].rpe).toBeLessThanOrEqual(4);
    expect(out.decision).toBe("coach");
  });

  it("caps speed work at effort 6 in the growth zone (H4)", () => {
    const out = rebuildWeek({ ...NONE, growth: true });
    const speed = out.days.filter((d) => d.label === "Speed");
    expect(speed.length).toBeGreaterThan(0);
    speed.forEach((d) => expect(d.rpe).toBeLessThanOrEqual(6));
  });

  it("cuts training time by about a fifth after a spike, never the match", () => {
    const out = rebuildWeek({ ...NONE, load: true });
    expect(out.days[5]).toEqual(USUAL_WEEK[5]);
    expect(weekLoad(out.days)).toBeLessThan(weekLoad(USUAL_WEEK));
  });

  it("holds the safety rules however the flags combine", () => {
    for (const sleep of [false, true])
      for (const load of [false, true])
        for (const growth of [false, true]) {
          const { days } = rebuildWeek({ sleep, load, growth, pain: false });
          expect(days[4].rpe).toBeLessThanOrEqual(4); // H3: the day before the match
          expect(days[6].label).toBe("Rest"); // H2: one rest day
          expect(days[5].label).toBe("Match"); // H1: fixtures stay
        }
  });

  it("changes nothing after a pain report and hands it to staff", () => {
    const out = rebuildWeek({ sleep: true, load: true, growth: true, pain: true });
    expect(out.days).toEqual(USUAL_WEEK);
    expect(out.changed.some(Boolean)).toBe(false);
    expect(out.decision).toBe("staff");
  });
});
