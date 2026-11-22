import React, { useEffect, useState } from "react";
import {
  Copy,
  Check,
  Infinity as InfinityIcon,
  Target,
  RefreshCw,
  CalendarClock,
  ShieldAlert,
  TrendingUp,
  Percent,
  Layers,
  BookOpen,
  ArrowUpRight,
} from "lucide-react";
import { NavView, TradeHistoryRecord, UserProfile } from "../types";
import { BrainMaxLogo } from "./TopBarAndMenu";

interface OverviewViewProps {
  profile: UserProfile;
  history: TradeHistoryRecord[];
  onNavigate: (view: NavView) => void;
  onNotify: (msg: string) => void;
}

const TRADING_RULES = [
  {
    id: "r1",
    title: "Trade only 75%+ signals",
    desc: "Skip anything below the confidence line.",
    icon: Target,
  },
  {
    id: "r2",
    title: "One MTG step, then stop",
    desc: "Never chase a second recovery.",
    icon: RefreshCw,
  },
  {
    id: "r3",
    title: "Avoid news minutes",
    desc: "Stay out ±2 min around big news.",
    icon: CalendarClock,
  },
  {
    id: "r4",
    title: "Stop after 3 losses",
    desc: "Protect your capital and reset for the next session.",
    icon: ShieldAlert,
  },
];

const RISK_TIPS = [
  {
    id: "t1",
    title: "Keep risk at 1%–3% per entry",
    desc: "Use the Management calculator before placing your first trade.",
    icon: Percent,
  },
  {
    id: "t2",
    title: "Lock profits at +15% to +25%",
    desc: "End the session once your daily profit target is achieved.",
    icon: TrendingUp,
  },
  {
    id: "t3",
    title: "Check chart structure first",
    desc: "Confirm OTC or Real screenshots in the Chart Analyzer.",
    icon: Layers,
  },
  {
    id: "t4",
    title: "Log every completed signal",
    desc: "Mark Wins and Losses to track your live session accuracy.",
    icon: BookOpen,
  },
];

function getGreeting(): string {
  const hour = new Date(Date.now() + 6 * 3600000).getUTCHours();
  if (hour < 12) return "Good morning, welcome back";
  if (hour < 17) return "Good afternoon, welcome back";
  return "Good evening, welcome back";
}

function getTimeUntilMidnightRefill(): string {
  const utc6Now = new Date(Date.now() + 6 * 3600000);
  const utc6MidnightMs = Date.UTC(
    utc6Now.getUTCFullYear(),
    utc6Now.getUTCMonth(),
    utc6Now.getUTCDate() + 1,
    0,
    0,
    0,
    0
  );
  const diffMs = Math.max(0, utc6MidnightMs - utc6Now.getTime());
  const hrs = Math.floor(diffMs / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000);
  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  profile,
  history,
  onNavigate,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<"rules" | "tips">("rules");
  const [copiedId, setCopiedId] = useState(false);
  const [refillTime, setRefillTime] = useState(getTimeUntilMidnightRefill);
  const [checkedRules, setCheckedRules] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const timer = setInterval(() => {
      setRefillTime(getTimeUntilMidnightRefill());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const sessionWins = history.filter((h) => h.outcome === "WIN").length;
  const sessionLosses = history.filter((h) => h.outcome === "LOSS").length;
  const totalWins = profile.baseWins + sessionWins;
  const totalLosses = profile.baseLosses + sessionLosses;
  const totalTrades = totalWins + totalLosses;
  const accuracy = totalTrades > 0 ? Math.round((totalWins / totalTrades) * 100) : 79;

  // SVG Ring Math (radius = 40, circumference = 2 * pi * 40 = 251.33)
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const accuracyOffset = circumference - (accuracy / 100) * circumference;

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(profile.userId);
      setCopiedId(true);
      onNotify("User ID copied to clipboard");
      setTimeout(() => setCopiedId(false), 1800);
    } catch {
      onNotify("Unable to copy ID");
    }
  };

  const toggleRuleCheck = (id: string) => {
    setCheckedRules((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const listItems = activeTab === "rules" ? TRADING_RULES : RISK_TIPS;

  return (
    <div className="space-y-4">
      {/* Top Profile & KPI Grid (Expands to 12-col grid on Desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Profile Hero Card */}
        <section className="lg:col-span-6 rounded-3xl bg-[#0B1736]/85 border border-blue-400/15 p-5 shadow-[0_16px_40px_rgba(2,6,23,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] flex flex-col justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#07112B] border border-blue-400/30 flex items-center justify-center shrink-0 shadow-[0_0_24px_rgba(37,99,235,0.3)]">
              <BrainMaxLogo size={48} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-400 font-medium">{getGreeting()}</p>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white uppercase truncate mt-0.5">
                {profile.name}
              </h1>
            </div>
          </div>

          <div className="rounded-2xl bg-[#061028]/90 border border-blue-400/15 px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] text-slate-400 font-medium">Your ID</div>
              <div className="text-sm font-mono text-slate-100 truncate mt-0.5">
                {profile.userId}
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <span className="px-2.5 py-1 rounded-lg bg-blue-500/15 border border-blue-400/25 text-xs font-semibold text-sky-300">
                {profile.tier}
              </span>
              <button
                type="button"
                onClick={handleCopyId}
                aria-label="Copy User ID"
                className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-xl bg-[#0D1E45] border border-blue-400/20 flex items-center justify-center text-slate-300 hover:text-white hover:border-blue-400/40 active:scale-95 transition-all"
              >
                {copiedId ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </section>

        {/* 2-Column KPI Cards */}
        <div className="lg:col-span-6 grid grid-cols-2 gap-4">
          {/* Credits Card */}
          <div className="rounded-3xl bg-[#0B1736]/85 border border-blue-400/15 p-5 shadow-[0_16px_40px_rgba(2,6,23,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] flex flex-col items-center justify-center text-center">
            <div className="relative w-24 h-24 flex items-center justify-center mb-3">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  fill="none"
                  stroke="#132552"
                  strokeWidth="6.5"
                />
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  fill="none"
                  stroke="url(#creditsGrad)"
                  strokeWidth="6.5"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={0}
                />
                <defs>
                  <linearGradient id="creditsGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#38BDF8" />
                    <stop offset="100%" stopColor="#2563EB" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <InfinityIcon className="w-8 h-8 text-white" strokeWidth={2.2} />
              </div>
            </div>
            <div className="text-sm font-semibold text-white">Credits</div>
            <div className="text-xs text-slate-400 mt-1 font-mono">
              Today · refill {refillTime}
            </div>
          </div>

          {/* Accuracy Card */}
          <div className="rounded-3xl bg-[#0B1736]/85 border border-blue-400/15 p-5 shadow-[0_16px_40px_rgba(2,6,23,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] flex flex-col items-center justify-center text-center">
            <div className="relative w-24 h-24 flex items-center justify-center mb-3">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  fill="none"
                  stroke="#132552"
                  strokeWidth="6.5"
                />
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  fill="none"
                  stroke="#22C55E"
                  strokeWidth="6.5"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={accuracyOffset}
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold font-mono text-white">{accuracy}%</span>
              </div>
            </div>
            <div className="text-sm font-semibold text-white">Accuracy</div>
            <div className="text-xs text-slate-400 mt-1 font-mono">
              {history.length > 0 ? "Session" : "Yesterday"} ·{" "}
              <span className="text-emerald-400">{totalWins}W</span>{" "}
              <span className="text-rose-400">{totalLosses}L</span>
            </div>
          </div>
        </div>
      </div>

      {/* Trading Rules / Risk Tips Panel */}
      <section className="rounded-3xl bg-[#0B1736]/85 border border-blue-400/15 p-4 sm:p-5 shadow-[0_16px_40px_rgba(2,6,23,0.5),inset_0_1px_0_rgba(255,255,255,0.06)]">
        {/* Segmented Control */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-[#061028] border border-blue-900/40 mb-4">
          <button
            type="button"
            onClick={() => setActiveTab("rules")}
            className={`min-h-[44px] rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === "rules"
                ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-[0_4px_16px_rgba(37,99,235,0.4)]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Trading rules
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("tips")}
            className={`min-h-[44px] rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === "tips"
                ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-[0_4px_16px_rgba(37,99,235,0.4)]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Risk tips
          </button>
        </div>

        {/* Rules / Tips List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {listItems.map((item) => {
            const Icon = item.icon;
            const checked = !!checkedRules[item.id];
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleRuleCheck(item.id)}
                className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-4 min-h-[68px] ${
                  checked
                    ? "bg-emerald-500/10 border-emerald-400/30"
                    : "bg-[#07112B]/70 border-blue-900/40 hover:border-blue-500/35"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${
                    checked
                      ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-400"
                      : "bg-[#0D1E45] border-blue-400/25 text-sky-400"
                  }`}
                >
                  {checked ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white leading-snug">
                    {item.title}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                    {item.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Quick Launch Workspace Shortcuts */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { view: "live-signals" as NavView, title: "Live Signals", sub: "69 pairs ready" },
          { view: "otc-analyzer" as NavView, title: "OTC Analyzer", sub: "AI chart scan" },
          { view: "news-signals" as NavView, title: "News Signals", sub: "Macro bias" },
          { view: "management" as NavView, title: "Management", sub: "Plan & sheet" },
        ].map((card) => (
          <button
            key={card.view}
            type="button"
            onClick={() => onNavigate(card.view)}
            className="p-4 rounded-2xl bg-[#0B1736]/75 border border-blue-400/15 hover:border-blue-400/40 text-left transition-all group flex items-center justify-between gap-2 min-h-[64px]"
          >
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white truncate">{card.title}</div>
              <div className="text-xs text-slate-400 truncate mt-0.5">{card.sub}</div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-sky-400 shrink-0 transition-colors" />
          </button>
        ))}
      </section>
    </div>
  );
};
