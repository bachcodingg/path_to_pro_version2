import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "./api";
import { homeFor, useAuth } from "./auth";
import { Bib } from "./Bib";
import { LegalLinks } from "../legal/Legal";
import { Button, cn } from "./ui";

// The demo story's accounts, grouped by who uses the app, each with what it shows. Everyone takes
// a bib in their group's colour.
const DEMO = [
  {
    group: "Players",
    bib: "player",
    accounts: [
      { label: "Leon, U15", note: "Tired, in the growth zone", email: "p15@demo.pathtopro", number: 15 },
      { label: "Academy player", note: "A normal week", email: "p03@demo.pathtopro", number: 3 },
      { label: "Dual-squad player", note: "U19 and men's team", email: "dual@demo.pathtopro", number: 19 },
      { label: "Self-guided player", note: "No club, own plan", email: "amateur@demo.pathtopro", number: 9 },
    ],
  },
  {
    group: "Staff",
    bib: "coach",
    accounts: [
      { label: "Coach", note: "Squad, matches, analysis", email: "coach@demo.pathtopro", number: 1 },
      { label: "Men's team coach", note: "Senior squad", email: "mencoach@demo.pathtopro", number: 2 },
      { label: "Physio", note: "Escalation queue", email: "physio@demo.pathtopro", number: 7 },
    ],
  },
  {
    group: "Family",
    bib: "family",
    accounts: [{ label: "Guardian", note: "A parent's view", email: "guardian02@demo.pathtopro", number: 12 }],
  },
];

const PITCH = [
  ["Readiness every morning", "Sleep, heart-rate variability and a 30-second check-in become one battery score."],
  ["Safe through growth spurts", "Hard limits for the growth zone and load spikes, checked on every plan change."],
  ["Coaches stay in charge", "Every plan change comes with its reason. Small ones apply and the coach is told; bigger ones wait for approval."],
];

export function Login() {
  const { user, login, finishMfa } = useAuth();
  const nav = useNavigate();
  // After a password reset on an account with two-step sign-in, the code step comes here
  const location = useLocation();
  const [mfaToken, setMfaToken] = useState<string | null>((location.state as { mfaToken?: string } | null)?.mfaToken ?? null);
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  async function submit(e: FormEvent, override?: string) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const u = await login(override ?? email, override ? "demo1234" : password);
      if ("mfaToken" in u) setMfaToken(u.mfaToken);
      else nav(homeFor(u.role));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Cannot reach the server");
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const u = await finishMfa(mfaToken!, code);
      nav(homeFor(u.role));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Cannot reach the server");
      if (err instanceof ApiError && err.message.startsWith("Sign in again")) setMfaToken(null);
    } finally {
      setBusy(false);
    }
  }

  // Laptop: what the app does on the left, sign-in and the demo accounts on the right. Phone: stacked.
  return (
    <main className="dark login-bg min-h-full lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <section className="login-band flex flex-col gap-8 px-4 pt-5 lg:sticky lg:top-0 lg:h-[calc(100vh-var(--banner-h,0px))] lg:self-start lg:px-10 lg:pt-7">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-3">
            <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" className="h-10 w-10" />
            <span className="brandmark text-xl">PathToPro</span>
          </Link>
          <Link to="/" className="tap flex items-center text-[15px] font-semibold underline underline-offset-4">
            Back to the overview
          </Link>
        </div>
        <div className="login-box mt-auto">
          <h1 className="login-title">
            Train smart.
            <br />
            Grow safe.
            <br />
            Get better.
          </h1>
          <ul className="mt-7 hidden max-w-lg space-y-3 lg:block">
            {PITCH.map(([title, text]) => (
              <li key={title}>
                <b className="block">{title}</b>
                {text}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-8 lg:px-10">
        <div className="w-full max-w-md">
          <div className="paper login-sheet">
            <h2 className="font-display mb-3 text-[1.7rem] leading-none font-black">Sign in</h2>
            {mfaToken ? (
              <form onSubmit={submitCode} className="space-y-3">
                <p className="text-ink-2 text-[15px]">Enter the 6-digit code from your authenticator app, or one of your recovery codes.</p>
                <label className="block">
                  <span className="text-[15px] font-semibold">Code</span>
                  <input
                    className="login-field text-center text-xl"
                    inputMode="text"
                    autoComplete="one-time-code"
                    autoFocus
                    required
                    minLength={6}
                    maxLength={20}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </label>
                {error && (
                  <p role="alert" className="text-danger text-[15px] font-semibold">
                    {error}
                  </p>
                )}
                <Button type="submit" size="lg" className="bg-[#0a2a1e] w-full text-[#f7f8f1] hover:bg-[#124030]" loading={busy}>
                  Verify
                </Button>
                <button type="button" className="tap text-ink-2 w-full text-center text-[15px] underline" onClick={() => setMfaToken(null)}>
                  Back
                </button>
              </form>
            ) : (
              <form onSubmit={submit} className="space-y-3">
                <label className="block">
                  <span className="text-[15px] font-semibold">Email</span>
                  <input className="login-field text-base" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </label>
                <label className="block">
                  <span className="text-[15px] font-semibold">Password</span>
                  <input className="login-field text-base" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </label>
                {error && (
                  <p role="alert" className="text-danger text-[15px] font-semibold">
                    {error}
                  </p>
                )}
                <Button type="submit" size="lg" className="bg-[#0a2a1e] w-full text-[#f7f8f1] hover:bg-[#124030]" loading={busy}>
                  Sign in
                </Button>
                <p className="text-center text-[15px]">
                  <Link to="/forgot-password" className="text-ink-2 hover:text-ink underline">
                    Forgot your password?
                  </Link>
                </p>
              </form>
            )}
          </div>

          <div className="mt-8">
            <h2 className="font-display text-[1.35rem] leading-tight font-extrabold text-white">Or take a bib and try the demo</h2>
            <p className="mt-0.5 text-[15px] text-white/90">Synthetic players, no account needed.</p>
            <div className="mt-3 space-y-4">
              {DEMO.map(({ group, bib, accounts }) => (
                <div key={group}>
                  <p className="mb-1.5 text-[15px] font-bold text-white">{group}</p>
                  <div className="grid gap-x-3 gap-y-1 sm:grid-cols-2">
                    {accounts.map(({ label, note, email: demoEmail, number }) => (
                      <button
                        key={demoEmail}
                        data-bib={bib}
                        disabled={busy}
                        onClick={(e) => submit(e, demoEmail)}
                        className={cn("tap group flex items-center gap-3 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-white/8 disabled:opacity-50")}
                      >
                        <span className="w-9 shrink-0 transition-transform group-hover:-rotate-3">
                          <Bib number={number} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[15px] leading-tight font-bold text-white">{label}</span>
                          <span className="block truncate text-[13.5px] text-white/90">{note}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-7 text-center text-[15px] text-white/95">
            Not in an academy?{" "}
            <Link to="/register" className="decoration-pitch-300 font-bold text-white underline decoration-2 underline-offset-4">
              Create a free plan
            </Link>
          </p>
          <LegalLinks className="mt-5 justify-center text-white/90" />
        </div>
      </section>
    </main>
  );
}
