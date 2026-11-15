import { expect, test } from "@playwright/test";
import { login, SHOTS } from "./helpers";

test("morning check-in takes under 30 s and updates Today", async ({ page }) => {
  await login(page, "p03@demo.pathtopro");
  await expect(page.getByRole("heading", { name: /Hi / })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/player-today-before.png` });

  const started = Date.now();
  await page.getByRole("link", { name: /Tap to start/ }).click();
  for (let i = 0; i < 4; i++) await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: /Good/ }).click();
  await page.getByRole("button", { name: "Kick-off!" }).click();
  await page.waitForURL("**/player");
  expect(Date.now() - started).toBeLessThan(30_000);

  await expect(page.getByLabel(/Readiness \d+ of 100/)).toBeVisible();
  await expect(page.getByText("Recovery tasks")).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/player-today.png`, fullPage: true });
});

test("player screens render", async ({ page }) => {
  await login(page, "p15@demo.pathtopro");
  await page.getByRole("link", { name: "My week" }).click();
  await expect(page.getByRole("img", { name: "Week plan on a pitch" })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/player-week.png` });

  await page.getByRole("link", { name: "Growth" }).click();
  await expect(page.getByRole("heading", { name: "Growth zone" })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/player-growth.png`, fullPage: true });

  await page.getByRole("link", { name: "My card" }).click();
  await expect(page.getByText("Average percentile")).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/player-card.png` });

  await page.getByRole("link", { name: "Road to Pro" }).click();
  await expect(page.getByRole("img", { name: "Season map" })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/player-road.png`, fullPage: true });
});

test("red check-in tells the player a person will follow up", async ({ page }) => {
  await login(page, "p07@demo.pathtopro");
  await page.getByRole("link", { name: /Tap to start/ }).click();
  for (let i = 0; i < 4; i++) await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: /Not good/ }).click();
  await page.getByRole("button", { name: "Kick-off!" }).click();
  await expect(page.getByText(/Someone from the staff will talk to you today/)).toBeVisible();
  // The planned session is not the last word: it is on hold until the named adult has answered
  await expect(page.getByRole("region", { name: "Today's session" }).getByText(/On hold\./)).toBeVisible();
});

test("tired player is told that a lighter plan is waiting for the coach", async ({ page }) => {
  await login(page, "p15@demo.pathtopro");
  // One sentence instead of a row of warnings; the reasons are a tap away
  await expect(page.getByText(/so today is about recovering\.|so take care today\./)).toBeVisible();
  await page.getByText("What this is based on").click();
  await expect(page.getByText("Growth zone", { exact: true })).toBeVisible();
  const session = page.getByRole("region", { name: "Today's session" });
  // Until the coach decides (the staff tests approve it later), the hard session carries a note
  const note = session.getByText(/A lighter plan is waiting for Alex Weber\./);
  if (await note.count()) await expect(note).toBeVisible();
  else await expect(page.getByText("Approved by Alex Weber").first()).toBeAttached();
});
