import { useEffect, useState } from "react";
import {
  ManagementPlan,
  NavView,
  TradeHistoryRecord,
  TradeSheetRow,
  UserProfile,
} from "./types";
import { NAV_ITEMS, TopBarAndMenu } from "./components/TopBarAndMenu";
import { OverviewView } from "./components/OverviewView";
import { LiveSignalsView } from "./components/LiveSignalsView";
import { ChartAnalyzerView } from "./components/ChartAnalyzerView";
import { FutureSignalsView } from "./components/FutureSignalsView";
import { NewsSignalsView } from "./components/NewsSignalsView";
import { ManagementView } from "./components/ManagementView";
import { ProfileView } from "./components/ProfileView";

const STORAGE_KEYS = {
  profile: "brainmax_profile_v1",
  history: "brainmax_history_v1",
  plan: "brainmax_plan_v1",
  sheet: "brainmax_sheet_v1",
};

const DEFAULT_PROFILE: UserProfile = {
  name: "MAHIM HOSSEN",
  userId: "op_hacker@gmail.com",
  tier: "Free",
  broker: "Quotex",
  baseWins: 27,
  baseLosses: 7,
};

const DEFAULT_PLAN: ManagementPlan = {
  initialCapital: 100,
  averagePayout: 85,
  profitTargetPct: 20,
  riskPerTradePct: 2,
  martingaleOneStep: true,
};

const DEFAULT_SHEET: TradeSheetRow[] = [
  {
    id: "row-init-1",
    tradeNo: 1,
    pair: "NZD/CHF OTC",
    stake: 2,
    isMtg: false,
    status: "PENDING",
    pnl: 0,
    balanceAfter: 100,
  },
  {
    id: "row-init-2",
    tradeNo: 2,
    pair: "EUR/USD OTC",
    stake: 2,
    isMtg: false,
    status: "PENDING",
    pnl: 0,
    balanceAfter: 100,
  },
  {
    id: "row-init-3",
    tradeNo: 3,
    pair: "GBP/CAD OTC",
    stake: 2,
    isMtg: false,
    status: "PENDING",
    pnl: 0,
    balanceAfter: 100,
  },
  {
    id: "row-init-4",
    tradeNo: 4,
    pair: "USD/JPY LIVE",
    stake: 2,
    isMtg: false,
    status: "PENDING",
    pnl: 0,
    balanceAfter: 100,
  },
  {
    id: "row-init-5",
    tradeNo: 5,
    pair: "AUD/CAD OTC",
    stake: 2,
    isMtg: false,
    status: "PENDING",
    pnl: 0,
    balanceAfter: 100,
  },
];

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [activeView, setActiveView] = useState<NavView>("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [preselectedPair, setPreselectedPair] = useState<string | null>(null);

  const [profile, setProfile] = useState<UserProfile>(() =>
    readStorage(STORAGE_KEYS.profile, DEFAULT_PROFILE)
  );
  const [history, setHistory] = useState<TradeHistoryRecord[]>(() =>
    readStorage(STORAGE_KEYS.history, [])
  );
  const [plan, setPlan] = useState<ManagementPlan>(() =>
    readStorage(STORAGE_KEYS.plan, DEFAULT_PLAN)
  );
  const [sheetRows, setSheetRows] = useState<TradeSheetRow[]>(() =>
    readStorage(STORAGE_KEYS.sheet, DEFAULT_SHEET)
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile));
    } catch {
      // Ignore storage quota errors
    }
  }, [profile]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history));
    } catch {
      // Ignore storage quota errors
    }
  }, [history]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.plan, JSON.stringify(plan));
    } catch {
      // Ignore storage quota errors
    }
  }, [plan]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.sheet, JSON.stringify(sheetRows));
    } catch {
      // Ignore storage quota errors
    }
  }, [sheetRows]);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 2400);
  };

  const handleRecordOutcome = (record: TradeHistoryRecord) => {
    setHistory((prev) => [record, ...prev].slice(0, 100));
  };

  const handleTradePairFromNews = (pairSymbol: string) => {
    setPreselectedPair(pairSymbol);
    setActiveView("live-signals");
  };

  const activeTitle =
    activeView === "profile"
      ? "Profile"
      : NAV_ITEMS.find((n) => n.id === activeView)?.label ?? "Overview";

  return (
    <div className="min-h-screen bg-[#030817] text-slate-100 relative overflow-x-hidden">
      {/* Subtle Ambient Cobalt Lighting */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(circle at 50% -10%, rgba(37, 99, 235, 0.22), transparent 55%), radial-gradient(circle at 85% 90%, rgba(14, 165, 233, 0.1), transparent 45%)",
        }}
      />

      <div className="relative z-10 flex flex-col lg:flex-row min-h-screen">
        <TopBarAndMenu
          activeView={activeView}
          onSelectView={setActiveView}
          menuOpen={menuOpen}
          setMenuOpen={setMenuOpen}
          profile={profile}
        />

        <main className="flex-1 min-w-0 px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 pb-10">
          <div className="max-w-5xl mx-auto">
            {/* Desktop Section Header */}
            <div className="hidden lg:flex items-center justify-between mb-6 pb-4 border-b border-blue-900/35">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white">
                  {activeTitle}
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Brain Max AI · {profile.broker} workspace
                </p>
              </div>
              <div className="text-xs font-mono text-slate-400">
                {profile.userId} · {profile.tier}
              </div>
            </div>

            {activeView === "overview" && (
              <OverviewView
                profile={profile}
                history={history}
                onNavigate={setActiveView}
                onNotify={notify}
              />
            )}

            {activeView === "live-signals" && (
              <LiveSignalsView
                defaultBroker={profile.broker}
                preselectedPairSymbol={preselectedPair}
                onClearPreselect={() => setPreselectedPair(null)}
                onRecordOutcome={handleRecordOutcome}
                onNotify={notify}
              />
            )}

            {activeView === "otc-analyzer" && (
              <ChartAnalyzerView key="otc-chart" mode="OTC" onNotify={notify} />
            )}

            {activeView === "real-analyzer" && (
              <ChartAnalyzerView key="real-chart" mode="REAL" onNotify={notify} />
            )}

            {activeView === "future-signals" && (
              <FutureSignalsView
                onRecordOutcome={handleRecordOutcome}
                onNotify={notify}
              />
            )}

            {activeView === "news-signals" && (
              <NewsSignalsView
                onTradePair={handleTradePairFromNews}
                onNotify={notify}
              />
            )}

            {activeView === "management" && (
              <ManagementView
                plan={plan}
                onUpdatePlan={setPlan}
                sheetRows={sheetRows}
                onUpdateSheet={setSheetRows}
                onNotify={notify}
              />
            )}

            {activeView === "profile" && (
              <ProfileView
                profile={profile}
                onUpdateProfile={setProfile}
                history={history}
                onClearHistory={() => setHistory([])}
                onNotify={notify}
              />
            )}
          </div>
        </main>
      </div>

      {/* Non-blocking Toast Feedback */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-[#0D1E45]/95 border border-blue-400/35 text-xs font-semibold text-white shadow-[0_12px_32px_rgba(0,0,0,0.6)] backdrop-blur-md whitespace-nowrap"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
