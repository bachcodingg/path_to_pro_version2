import { type LucideIcon, CalendarDays, CalendarRange, CalendarCheck, ClipboardList, Euro, Gauge, Grid3x3, LogOut, Menu, MessageSquareText, Play, Settings, Star, Stethoscope, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { api } from "../shared/api";
import { AppLink } from "../shared/AppLink";
import { useAuth } from "../shared/auth";
import { t } from "../shared/i18n";
import { SkipLink } from "../shared/SkipLink";
import { Button, cn } from "../shared/ui";
import { useDocumentTitle } from "../shared/useDocumentTitle";

// Grouped the way staff think about the week; built per call so labels follow the language
type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean; coachOnly?: boolean };

// A phone shows the three pages a role opens every day as tabs; everything else is under More
const PHONE_TABS: Record<string, [string, string][]> = {
  coach: [
    ["/coach", "Squad"],
    ["/coach/inbox", "Approvals"],
    ["/coach/pitch", "Training"],
  ],
  physio: [
    ["/physio", "Queue"],
    ["/coach", "Squad"],
    ["/coach/pitch", "Training"],
  ],
};
const nav = (): { group: string; items: NavItem[] }[] => [
  {
    group: "Squad",
    items: [
      { to: "/coach", label: t("nav.heatmap"), icon: Grid3x3, end: true },
      { to: "/coach/inbox", label: t("nav.inbox"), icon: ClipboardList },
      { to: "/coach/pitch", label: t("nav.pitch"), icon: CalendarRange },
      { to: "/coach/schedule", label: t("nav.schedule"), icon: CalendarDays },
      { to: "/coach/team", label: t("nav.team"), icon: CalendarCheck },
      { to: "/coach/tactics", label: t("nav.tactics"), icon: Users },
    ],
  },
  {
    group: "Matchday",
    items: [
      { to: "/coach/matches", label: t("nav.matches"), icon: Star },
      { to: "/coach/log", label: t("nav.log"), icon: MessageSquareText },
    ],
  },
  {
    group: "Club",
    items: [
      { to: "/physio", label: t("nav.physio"), icon: Stethoscope },
      { to: "/coach/finance", label: t("nav.finance"), icon: Euro, coachOnly: true },
      { to: "/coach/calibration", label: t("nav.calibration"), icon: Gauge },
    ],
  },
];

// Desktop-first staff shell; light by default.
export function CoachLayout() {
  const { user, logout } = useAuth();
  // club money and opponent analysis are for coaches
  const GROUPS = nav().map((g) => ({ ...g, items: g.items.filter((n) => !n.coachOnly || user?.role !== "physio") }));
  const NAV = GROUPS.flatMap((g) => g.items);
  useDocumentTitle(NAV, "Staff");
  const initials = (user?.name ?? "?").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const { pathname } = useLocation();
  const [more, setMore] = useState(false);
  const [waiting, setWaiting] = useState(0); // approvals waiting, shown on the phone tab
  const tabs = (PHONE_TABS[user?.role ?? "coach"] ?? PHONE_TABS.coach).map(([to, short]) => ({ ...NAV.find((n) => n.to === to)!, short }));
  const rest = GROUPS.map((g) => ({ ...g, items: g.items.filter((n) => !tabs.some((x) => x.to === n.to)) })).filter((g) => g.items.length);
  const inMore = rest.some((g) => g.items.some((n) => pathname === n.to || pathname.startsWith(`${n.to}/`)));
  useEffect(() => {
    setMore(false);
    if (user?.role !== "coach") return;
    let live = true;
    api<{ approvals: number }>("/api/coach/attention")
      .then((a) => live && setWaiting(a.approvals))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [pathname, user?.role]);

  async function runNightly() {
    setRunning(true);
    try {
      const out = await api<Record<string, number>>("/api/coach/run-nightly", { method: "POST" });
      setMsg(`Agents ran for ${out.players} players`);
      setTimeout(() => window.location.reload(), 800);
    } catch {
      setMsg("Could not run agents");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="app-bg text-ink flex min-h-full">
      <SkipLink />
      {/* The column runs the page's full height; its contents stay in view while scrolling */}
      <aside className="app-rail hidden w-64 shrink-0 text-white md:block">
        <div className="sticky top-0 flex h-[calc(100vh-var(--banner-h,0px))] flex-col px-3 py-4">
          <div className="mb-5 flex items-center gap-2.5 px-2">
            <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" className="h-9 w-9" />
            <div className="leading-none">
              <span className="brandmark block text-xl">PathToPro</span>
              <span className="text-pitch-300 mt-1 block text-[13px] font-semibold">Staff, U13 to U18</span>
            </div>
          </div>
          <nav aria-label="Staff navigation" className="no-scrollbar flex-1 space-y-4 overflow-y-auto">
            {GROUPS.filter((g) => g.items.length).map((g) => (
              <div key={g.group}>
                <p className="mb-1 px-3 text-[13px] font-bold text-white/70">{g.group}</p>
                <div className="space-y-0.5">
                  {g.items.map(({ to, label, icon: Icon, end }) => (
                    <NavLink
                      key={to}
                      to={to}
                      end={end}
                      className={({ isActive }) =>
                        cn(
                          "tap relative flex items-center gap-3 rounded-md px-3 py-2 text-[15px] font-semibold transition-colors",
                          isActive
                            ? "bg-pitch-300 text-pitch-950 font-bold"
                            : "text-pitch-100 hover:bg-white/6 hover:text-white",
                        )
                      }
                    >
                      <Icon className="h-[18px] w-[18px]" aria-hidden /> {label}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>
          {/* Scouting the pros happens in the Pro League app, which this opens; always in view */}
          <AppLink app="leagues" className="text-pitch-100 mt-3 rounded-md border border-white/15 px-3 py-2 text-[15px] font-semibold hover:bg-white/6 hover:text-white" />
          {user?.role === "coach" && (
            <Button variant="secondary" size="sm" onClick={runNightly} loading={running} className="mt-3 mb-2 border-0 bg-white/10 text-white hover:bg-white/15">
              <Play className="h-4 w-4" aria-hidden /> Run agents now
            </Button>
          )}
          {msg && <p className="text-pitch-200 mb-2 px-2 text-xs">{msg}</p>}
          <div className="flex items-center gap-3 border-t border-white/10 px-2 pt-3 text-sm">
            <Link to="/account" className="group flex min-w-0 flex-1 items-center gap-3" title={t("nav.account")}>
              <span className="bg-pitch-300 text-pitch-950 font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base font-bold" aria-hidden>
                {initials}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold group-hover:underline">{user?.name}</span>
                <span className="text-pitch-200 flex items-center gap-1 text-xs capitalize">
                  {user?.role} · <Settings className="h-3 w-3" aria-hidden /> {t("nav.account")}
                </span>
              </span>
            </Link>
            <button onClick={logout} className="tap text-pitch-200 flex items-center justify-center hover:text-white" aria-label={t("common.signout")} title={t("common.signout")}>
              <LogOut className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="app-rail sticky top-0 z-20 md:hidden">
          <div className="flex items-center justify-between px-4 py-2">
            <span className="flex items-center gap-2 text-white">
              <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" className="h-7 w-7" />
              <span className="brandmark text-lg">PathToPro</span>
            </span>
            <span className="flex items-center gap-1">
              <AppLink app="leagues" iconOnly className="h-11 w-11 justify-center" />
              <Link to="/account" className="tap text-pitch-200 flex h-11 w-11 items-center justify-center" aria-label={t("nav.account")}>
                <Settings className="h-4 w-4" aria-hidden />
              </Link>
              <button onClick={logout} className="tap text-pitch-200 flex items-center gap-1 text-sm" aria-label={t("common.signout")}>
                {user?.name} <LogOut className="h-4 w-4" aria-hidden />
              </button>
            </span>
          </div>
        </div>
        <main id="main" tabIndex={-1} className="min-w-0 flex-1 p-4 pb-28 outline-none md:p-6">
          <Outlet />
        </main>
        {/* Phone: three tabs and More, in thumb reach, instead of a strip of eleven to scroll */}
        {more && (
          <div className="fixed inset-0 z-30 md:hidden">
            <button className="absolute inset-0 bg-black/50" aria-label="Close the menu" onClick={() => setMore(false)} />
            <div
              id="staff-more"
              role="dialog"
              aria-label="More pages"
              className="app-rail absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-2xl px-3 pt-3 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] text-white"
              onKeyDown={(e) => e.key === "Escape" && setMore(false)}
            >
              <div className="mb-1 flex items-center justify-between px-2">
                <p className="font-display text-lg font-extrabold">More</p>
                <button className="tap flex items-center justify-center" aria-label="Close the menu" onClick={() => setMore(false)}>
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>
              {rest.map((g) => (
                <div key={g.group} className="mb-2">
                  <p className="px-3 text-[13px] font-bold text-white/70">{g.group}</p>
                  {g.items.map(({ to, label, icon: Icon, end }) => (
                    <NavLink
                      key={to}
                      to={to}
                      end={end}
                      onClick={() => setMore(false)}
                      className={({ isActive }) =>
                        cn("tap flex items-center gap-3 rounded-md px-3 py-2 text-[15px] font-semibold", isActive ? "bg-pitch-300 text-pitch-950" : "text-pitch-100")
                      }
                    >
                      <Icon className="h-[18px] w-[18px]" aria-hidden /> {label}
                    </NavLink>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
        <nav className="app-rail border-line fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Staff navigation">
          <ul className="mx-auto grid max-w-md grid-cols-4">
            {tabs.map(({ to, short, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  aria-label={label}
                  className={({ isActive }) =>
                    cn(
                      "tap relative flex flex-col items-center justify-center gap-0.5 py-2 text-xs leading-tight font-semibold",
                      isActive && !more ? "text-pitch-300 before:bg-pitch-300 before:absolute before:inset-x-2 before:top-0 before:h-1" : "text-pitch-100",
                    )
                  }
                >
                  <span className="relative">
                    <Icon className="h-5 w-5" aria-hidden />
                    {to === "/coach/inbox" && waiting > 0 && (
                      <span className="bg-caution absolute -top-1.5 -right-3 min-w-[1.15rem] rounded-full px-1 text-center text-xs leading-[1.15rem] font-extrabold text-amber-950">
                        {waiting}
                        <span className="sr-only"> waiting</span>
                      </span>
                    )}
                  </span>
                  {short}
                </NavLink>
              </li>
            ))}
            <li>
              <button
                onClick={() => setMore(!more)}
                aria-expanded={more}
                aria-controls="staff-more"
                className={cn(
                  "tap relative flex w-full flex-col items-center justify-center gap-0.5 py-2 text-xs leading-tight font-semibold",
                  more || inMore ? "text-pitch-300 before:bg-pitch-300 before:absolute before:inset-x-2 before:top-0 before:h-1" : "text-pitch-100",
                )}
              >
                <Menu className="h-5 w-5" aria-hidden />
                More
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}
