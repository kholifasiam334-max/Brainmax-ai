import React, { useEffect, useRef } from "react";
import {
  LayoutGrid,
  CandlestickChart,
  Search,
  Radio,
  History,
  Newspaper,
  ShieldCheck,
  MoreVertical,
  ChevronRight,
  User,
  X,
} from "lucide-react";
import { NavView, UserProfile } from "../types";

interface NavItem {
  id: NavView;
  label: string;
  icon: React.FC<{ className?: string }>;
}

export const NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "otc-analyzer", label: "OTC Analyzer", icon: CandlestickChart },
  { id: "real-analyzer", label: "Real Analyzer", icon: Search },
  { id: "live-signals", label: "Live Signals", icon: Radio },
  { id: "future-signals", label: "Future Signals", icon: History },
  { id: "news-signals", label: "News Signals", icon: Newspaper },
  { id: "management", label: "Management", icon: ShieldCheck },
];

export const BrainMaxLogo: React.FC<{ size?: number }> = ({ size = 34 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 40 40"
    className="rounded-xl shrink-0 shadow-[0_0_16px_rgba(37,99,235,0.45)]"
    aria-hidden="true"
  >
    <defs>
      <radialGradient id="brainGlobe" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#60A5FA" />
        <stop offset="45%" stopColor="#1D4ED8" />
        <stop offset="100%" stopColor="#050B1E" />
      </radialGradient>
    </defs>
    <rect width="40" height="40" rx="11" fill="#07122D" stroke="#2563EB" strokeOpacity="0.45" />
    <circle cx="20" cy="20" r="13" fill="url(#brainGlobe)" />
    <path
      d="M11 20C14 14 26 14 29 20C26 26 14 26 11 20Z"
      fill="none"
      stroke="#93C5FD"
      strokeWidth="1.2"
      strokeOpacity="0.6"
    />
    <path
      d="M20 8C24 13 24 27 20 32M20 8C16 13 16 27 20 32"
      fill="none"
      stroke="#BFDBFE"
      strokeWidth="1.1"
      strokeOpacity="0.5"
    />
    <circle cx="15" cy="17" r="1.4" fill="#E0F2FE" />
    <circle cx="25" cy="17" r="1.4" fill="#E0F2FE" />
    <circle cx="20" cy="24" r="1.5" fill="#60A5FA" />
  </svg>
);

interface TopBarAndMenuProps {
  activeView: NavView;
  onSelectView: (view: NavView) => void;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  profile: UserProfile;
}

export const TopBarAndMenu: React.FC<TopBarAndMenuProps> = ({
  activeView,
  onSelectView,
  menuOpen,
  setMenuOpen,
  profile,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menuOpen, setMenuOpen]);

  return (
    <>
      {/* Mobile & Tablet Top App Bar */}
      <header className="lg:hidden sticky top-0 z-40 h-14 px-4 flex items-center justify-between bg-[#050D22]/85 backdrop-blur-xl border-b border-blue-900/35">
        <button
          type="button"
          onClick={() => onSelectView("overview")}
          className="flex items-center justify-center min-w-[44px] min-h-[44px] -ml-1.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Go to Overview"
        >
          <BrainMaxLogo size={34} />
        </button>

        <button
          type="button"
          onClick={() => onSelectView("overview")}
          className="flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <span className="text-[19px] font-bold tracking-tight text-white">Brain Max</span>
          <span className="text-[19px] font-extrabold italic tracking-tight bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent">
            AI
          </span>
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Open navigation menu"
            aria-expanded={menuOpen}
            className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-full bg-[#0C193B] border border-blue-500/30 flex items-center justify-center text-slate-200 hover:bg-[#132554] active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <MoreVertical className="w-5 h-5" />}
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2.5 w-64 rounded-3xl bg-[#091534]/95 backdrop-blur-2xl border border-blue-400/20 shadow-[0_24px_60px_rgba(0,0,0,0.65)] p-2 z-50">
              <nav className="flex flex-col gap-0.5" aria-label="Main navigation">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = activeView === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onSelectView(item.id);
                        setMenuOpen(false);
                      }}
                      className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-2xl flex items-center justify-between text-left transition-colors ${
                        active
                          ? "bg-blue-600/25 text-white border border-blue-400/30"
                          : "text-slate-300 hover:bg-white/5 hover:text-white border border-transparent"
                      }`}
                    >
                      <span className="flex items-center gap-3 text-sm font-medium whitespace-nowrap">
                        <Icon className={`w-4 h-4 ${active ? "text-sky-400" : "text-slate-400"}`} />
                        {item.label}
                      </span>
                      {active && (
                        <span className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_8px_#38BDF8]" />
                      )}
                    </button>
                  );
                })}
              </nav>

              <div className="my-2 border-t border-blue-900/50" />

              <button
                type="button"
                onClick={() => {
                  onSelectView("profile");
                  setMenuOpen(false);
                }}
                className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-2xl flex items-center justify-between text-left transition-colors ${
                  activeView === "profile"
                    ? "bg-blue-600/25 text-white border border-blue-400/30"
                    : "text-slate-200 hover:bg-white/5 border border-transparent"
                }`}
              >
                <span className="flex items-center gap-3 text-sm font-medium whitespace-nowrap">
                  <span className="w-6 h-6 rounded-full bg-blue-600/30 border border-blue-400/30 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-sky-300" />
                  </span>
                  Profile
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Desktop Sidebar Navigation Rail (lg+) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 bg-[#050D22]/90 border-r border-blue-900/35 px-4 py-6 justify-between sticky top-0 h-screen">
        <div>
          <button
            type="button"
            onClick={() => onSelectView("overview")}
            className="flex items-center gap-3 px-2 mb-8 text-left group"
          >
            <BrainMaxLogo size={38} />
            <div className="flex items-baseline gap-1 whitespace-nowrap">
              <span className="text-xl font-bold tracking-tight text-white">Brain Max</span>
              <span className="text-xl font-extrabold italic bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent">
                AI
              </span>
            </div>
          </button>

          <nav className="flex flex-col gap-1" aria-label="Desktop navigation">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectView(item.id)}
                  className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl flex items-center justify-between text-left transition-all ${
                    active
                      ? "bg-blue-600/20 text-white border border-blue-400/30 shadow-[0_4px_16px_rgba(37,99,235,0.18)]"
                      : "text-slate-300 hover:bg-white/5 hover:text-white border border-transparent"
                  }`}
                >
                  <span className="flex items-center gap-3 text-sm font-medium whitespace-nowrap">
                    <Icon className={`w-4 h-4 ${active ? "text-sky-400" : "text-slate-400"}`} />
                    {item.label}
                  </span>
                  {active && (
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_8px_#38BDF8]" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-blue-900/40">
          <button
            type="button"
            onClick={() => onSelectView("profile")}
            className={`w-full p-3 rounded-2xl flex items-center justify-between transition-all border ${
              activeView === "profile"
                ? "bg-blue-600/20 border-blue-400/35 text-white"
                : "bg-[#0B1736]/70 border-blue-900/40 text-slate-200 hover:border-blue-500/40"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-blue-600/25 border border-blue-400/30 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-sky-300" />
              </div>
              <div className="text-left min-w-0">
                <div className="text-xs font-semibold text-white truncate">{profile.name}</div>
                <div className="text-[11px] text-slate-400 truncate">{profile.tier} Account</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>
        </div>
      </aside>
    </>
  );
};
