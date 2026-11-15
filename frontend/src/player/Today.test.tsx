import { render, screen } from "@testing-library/react";
import type { PlanDay, Today } from "../shared/types";
import { fmtValue, Switch } from "../shared/ui";
import { DaySummary, SessionNote } from "./Today";

const gym: PlanDay = { date: "2026-11-26", kind: "strength", label: "Strength", rpe: 8, minutes: 60, load: 480 };
const today = (extra: Partial<Today>): Today => ({
  date: "2026-11-26",
  name: "Leon U.",
  checked_in: false,
  readiness: null,
  readiness_is_today: false,
  flags: [],
  session: gym,
  tasks: [],
  why: [],
  streak: 1,
  ...extra,
});

describe("what a player is told about today", () => {
  it("turns the risk flags into one sentence, with the detail a tap away", () => {
    render(
      <DaySummary
        band="red"
        flags={[
          { kind: "load_spike", text: "Training load jumped" },
          { kind: "readiness_red", text: "Low battery" },
          { kind: "short_sleep", text: "Short sleep" },
        ]}
      />,
    );
    expect(screen.getByText("You've trained a lot lately and you haven't slept enough, so today is about recovering.")).toBeInTheDocument();
    expect(screen.getByText("What this is based on")).toBeInTheDocument();
  });

  it("says nothing when there is nothing to say", () => {
    const { container } = render(<DaySummary band="green" flags={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("names who decides while a lighter plan waits, and what today would become", () => {
    render(
      <SessionNote
        today={today({
          pending_change: { approver: "Alex Weber", lighter: true, load_change_pct: -29, today: { ...gym, kind: "tactical", label: "Tactical", rpe: 4, minutes: 75 } },
        })}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("A lighter plan is waiting for Alex Weber. Today would become tactical at effort 4/10.");
  });

  it("puts the day on hold after a report to the named adult, before any pending plan", () => {
    render(
      <SessionNote
        today={today({
          on_hold: { kind: "pain_report", contact: "Sam Okafor" },
          pending_change: { approver: "Alex Weber", lighter: true, load_change_pct: -29, today: null },
        })}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("On hold. Speak to Sam Okafor before you train today. Don't train through pain.");
  });

  it("adds no note to a normal day", () => {
    const { container } = render(<SessionNote today={today({})} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("shared pieces", () => {
  it("shows test results at the precision they are measured with", () => {
    expect(fmtValue(1521.67, "m")).toBe("1522");
    expect(fmtValue(31.94, "cm")).toBe("31.9");
    expect(fmtValue(1.853, "s")).toBe("1.85");
  });

  it("a switch that is not the viewer's to change is disabled", () => {
    render(<Switch label="Sleep duration" checked disabled onChange={() => {}} />);
    expect(screen.getByRole("checkbox", { name: "Sleep duration" })).toBeDisabled();
  });
});
