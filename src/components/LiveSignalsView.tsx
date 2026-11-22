import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  ArrowLeft,
  Clock,
  RefreshCw,
  Crosshair,
  Copy,
  Check,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Infinity as InfinityIcon,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  BrokerName,
  CurrencyPair,
  LiveSignalResult,
  MarketMode,
  TradeHistoryRecord,
} from "../types";
import {
  LIVE_PAIRS,
  OTC_PAIRS,
  generateTechnicalSignal,
  isLiveMarketWeekendClosed,
} from "../data/markets";
import { PairFlags } from "./CurrencyFlag";

interface LiveSignalsViewProps {
  defaultBroker: BrokerName;
  preselectedPairSymbol?: string | null;
  onClearPreselect?: () => void;
  onRecordOutcome: (record: TradeHistoryRecord) => void;
  onNotify: (msg: string) => void;
}

type SignalStep = "select" | "config" | "scanning" | "result";

const SCAN_STAGES = [
  { maxPct: 24, label: "Connecting feed" },
  { maxPct: 54, label: "Reading live pressure" },
  { maxPct: 82, label: "Timing the entry" },
  { maxPct: 100, label: "Signal ready" },
];

export const LiveSignalsView: React.FC<LiveSignalsViewProps> = ({
  defaultBroker,
  preselectedPairSymbol,
  onClearPreselect,
  onRecordOutcome,
  onNotify,
}) => {
  const [market, setMarket] = useState<MarketMode>("OTC");
  const [search, setSearch] = useState("");
  const [step, setStep] = useState<SignalStep>("select");
  const [selectedPair, setSelectedPair] = useState<CurrencyPair>(OTC_PAIRS[0]);
  const [durationMinutes, setDurationMinutes] = useState<number>(1);
  const [mtgSteps, setMtgSteps] = useState<number>(1);
  const [broker, setBroker] = useState<BrokerName>(defaultBroker);

  const [scanProgress, setScanProgress] = useState<number>(0);
  const [signal, setSignal] = useState<LiveSignalResult | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [smartFlowExpanded, setSmartFlowExpanded] = useState(false);
  const [copiedSignal, setCopiedSignal] = useState(false);

  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    setBroker(defaultBroker);
  }, [defaultBroker]);

  const liveClosed = isLiveMarketWeekendClosed();
  const openLivePairs = useMemo(
    () => (liveClosed ? [] : LIVE_PAIRS),
    [liveClosed]
  );

  useEffect(() => {
    if (!preselectedPairSymbol) return;
    const otcMatch = OTC_PAIRS.find((p) => p.symbol === preselectedPairSymbol);
    const liveMatch = openLivePairs.find((p) => p.symbol === preselectedPairSymbol);
    const found = liveMatch ?? otcMatch;
    if (found) {
      setMarket(found.market);
      setSelectedPair(found);
      setStep("config");
    } else if (liveClosed) {
      setMarket("LIVE");
      setStep("select");
      onNotify("Live market is closed on Saturday & Sunday");
    }
    onClearPreselect?.();
  }, [preselectedPairSymbol, onClearPreselect, liveClosed, onNotify, openLivePairs]);

  // Countdown tick while on result screen
  useEffect(() => {
    if (step !== "result") return;
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 250);
    return () => clearInterval(timer);
  }, [step]);

  // Scanning animation + silent server-side live market analysis (~1.6s)
  useEffect(() => {
    if (step !== "scanning") return;
    setScanProgress(8);
    let cancelled = false;
    const start = performance.now();
    const totalMs = 1600;

    const analysisPromise = fetch("/api/analyze-market", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol: selectedPair.symbol,
        base: selectedPair.base,
        quote: selectedPair.quote,
        market: selectedPair.market,
        basePrice: selectedPair.basePrice,
        decimals: selectedPair.decimals,
        durationMinutes,
        mtgSteps,
        broker,
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => (data?.signal ? { ...data.signal, pair: selectedPair } as LiveSignalResult : null))
      .catch(() => null);

    let rafId = 0;
    const tick = (now: number) => {
      if (cancelled) return;
      const elapsed = now - start;
      const pct = Math.min(100, Math.round((elapsed / totalMs) * 100));
      setScanProgress(pct);
      if (pct < 100) {
        rafId = requestAnimationFrame(tick);
      } else {
        void analysisPromise.then((serverSignal) => {
          if (cancelled) return;
          const resolved =
            serverSignal ??
            generateTechnicalSignal(
              selectedPair,
              durationMinutes,
              mtgSteps,
              broker
            );
          setSignal(resolved);
          setNowMs(Date.now());
          setSmartFlowExpanded(false);
          setAiInsight(null);
          setAiError(null);
          setStep("result");
        });
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [step, selectedPair, durationMinutes, mtgSteps, broker]);

  const activePairs = market === "OTC" ? OTC_PAIRS : openLivePairs;
  const filteredPairs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return activePairs;
    return activePairs.filter((p) => p.symbol.toLowerCase().includes(q));
  }, [activePairs, search]);

  const scanLabel =
    SCAN_STAGES.find((s) => scanProgress <= s.maxPct)?.label ?? "Signal ready";

  const handleSelectPair = (pair: CurrencyPair) => {
    setSelectedPair(pair);
    setStep("config");
  };

  const handleStartGenerate = () => {
    setStep("scanning");
  };

  const handleCopySignal = async () => {
    if (!signal) return;
    const text = [
      `Brain Max AI Signal`,
      `Pair: ${signal.pair.symbol} (${signal.pair.market})`,
      `Broker: ${signal.broker}`,
      `Direction: ${signal.direction} (${signal.confidence}%)`,
      `Entry: ${signal.entryTime} | Expiry: ${signal.expiryTime} (${signal.durationMinutes}m · UTC+6)`,
      signal.mtgSteps > 0 ? `MTG: ${signal.mtgTime} (${signal.mtgSteps} step)` : `MTG: None`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSignal(true);
      onNotify("Signal copied to clipboard");
      setTimeout(() => setCopiedSignal(false), 1800);
    } catch {
      onNotify("Copy failed");
    }
  };

  const handleMarkOutcome = (outcome: "WIN" | "LOSS") => {
    if (!signal || signal.outcome) return;
    setSignal({ ...signal, outcome });
    onRecordOutcome({
      id: `rec-${Date.now()}`,
      pairSymbol: signal.pair.symbol,
      market: signal.pair.market,
      direction: signal.direction,
      confidence: signal.confidence,
      entryTime: signal.entryTime,
      outcome,
      createdAt: new Date().toISOString(),
    });
    onNotify(`Logged ${signal.pair.symbol} as ${outcome}`);
  };

  const handleAskGeminiInsight = async () => {
    if (!signal || aiLoading) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const resp = await fetch("/api/smartflow-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pair: signal.pair.symbol,
          market: signal.pair.market,
          direction: signal.direction,
          duration: `${signal.durationMinutes} minute`,
          confidence: signal.confidence,
          indicators: signal.indicators,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || "Unable to fetch AI SmartFlow read.");
      }
      setAiInsight(data.insight);
      setSmartFlowExpanded(true);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "AI request failed.");
    } finally {
      setAiLoading(false);
    }
  };

  // Compute radial countdown state for result view
  const renderCountdownGauge = () => {
    if (!signal) return null;
    const msToEntry = signal.entryTimestampMs - nowMs;
    const msToExpiry = signal.expiryTimestampMs - nowMs;

    let statusText = "closed";
    let progressRatio = 1;

    if (msToEntry > 0) {
      const sec = Math.max(0, Math.ceil(msToEntry / 1000));
      const mm = String(Math.floor(sec / 60)).padStart(2, "0");
      const ss = String(sec % 60).padStart(2, "0");
      statusText = `entry in ${mm}:${ss}`;
      progressRatio = Math.min(1, Math.max(0.08, sec / 60));
    } else if (msToExpiry > 0) {
      const sec = Math.max(0, Math.ceil(msToExpiry / 1000));
      const mm = String(Math.floor(sec / 60)).padStart(2, "0");
      const ss = String(sec % 60).padStart(2, "0");
      statusText = `active ${mm}:${ss}`;
      progressRatio = Math.min(
        1,
        Math.max(0.05, msToExpiry / (signal.durationMinutes * 60000))
      );
    }

    const isCall = signal.direction === "CALL";
    const accentHex = isCall ? "#84CC16" : "#F43F5E";

    const totalTicks = 44;
    const activeTicks = Math.round(progressRatio * totalTicks);
    const dotAngleDeg = (1 - progressRatio) * 360 - 90;
    const dotAngleRad = (dotAngleDeg * Math.PI) / 180;
    const dotX = 120 + 86 * Math.cos(dotAngleRad);
    const dotY = 120 + 86 * Math.sin(dotAngleRad);

    return (
      <div className="relative w-64 h-64 mx-auto my-1 flex items-center justify-center">
        <svg className="w-64 h-64" viewBox="0 0 240 240" aria-hidden="true">
          {Array.from({ length: totalTicks }).map((_, idx) => {
            const angle = (idx / totalTicks) * 360 - 90;
            const rad = (angle * Math.PI) / 180;
            const x1 = 120 + 96 * Math.cos(rad);
            const y1 = 120 + 96 * Math.sin(rad);
            const x2 = 120 + 109 * Math.cos(rad);
            const y2 = 120 + 109 * Math.sin(rad);
            const lit = idx < activeTicks || statusText === "closed";
            return (
              <line
                key={idx}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={lit ? accentHex : "#1E3A70"}
                strokeWidth="2.4"
                strokeLinecap="round"
                opacity={lit ? 0.85 : 0.35}
              />
            );
          })}
          <circle
            cx="120"
            cy="120"
            r="86"
            fill="#071024"
            stroke={accentHex}
            strokeWidth="4.5"
          />
          <circle
            cx={statusText === "closed" ? 120 : dotX}
            cy={statusText === "closed" ? 34 : dotY}
            r="5"
            fill="#FFFFFF"
            stroke={accentHex}
            strokeWidth="3"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 shadow-lg ${
              isCall
                ? "bg-[#84CC16] text-slate-950 shadow-lime-500/35"
                : "bg-[#F43F5E] text-slate-950 shadow-rose-500/35"
            }`}
          >
            {isCall ? (
              <ArrowUp className="w-5 h-5" strokeWidth={2.75} />
            ) : (
              <ArrowDown className="w-5 h-5" strokeWidth={2.75} />
            )}
          </div>

          <div
            className={`text-4xl font-extrabold tracking-wide ${
              isCall ? "text-[#84CC16]" : "text-[#F43F5E]"
            }`}
          >
            {signal.direction}
          </div>

          <div className="mt-2 px-3.5 py-1 rounded-full bg-[#0D1833] border border-blue-400/20 text-xs font-mono text-slate-300">
            {statusText}
          </div>
          <div className="text-[11px] font-mono text-sky-300 mt-1">
            {signal.confidence}% confidence
          </div>
        </div>
      </div>
    );
  };

  if (step === "select") {
    return (
      <section className="rounded-3xl bg-[#0B1736]/85 border border-blue-400/15 p-4 sm:p-6 shadow-[0_16px_40px_rgba(2,6,23,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] space-y-4">
        {/* Market Switcher */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-[#061028] border border-blue-900/40">
          <button
            type="button"
            onClick={() => setMarket("OTC")}
            className={`min-h-[44px] rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all whitespace-nowrap ${
              market === "OTC"
                ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-[0_4px_16px_rgba(37,99,235,0.4)]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>OTC</span>
            <span className="px-1.5 py-0.5 rounded-md bg-white/15 text-[11px] font-mono">
              {OTC_PAIRS.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setMarket("LIVE")}
            className={`min-h-[44px] rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all whitespace-nowrap ${
              market === "LIVE"
                ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-[0_4px_16px_rgba(37,99,235,0.4)]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>Live</span>
            <span className="px-1.5 py-0.5 rounded-md bg-white/15 text-[11px] font-mono">
              {openLivePairs.length}
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search pair — e.g. EUR/USD"
            className="w-full h-12 pl-11 pr-4 rounded-2xl bg-[#061028] border border-blue-400/20 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Pairs Grid */}
        {market === "LIVE" && liveClosed ? (
          <div className="rounded-2xl border border-blue-400/15 bg-[#07112B]/55 py-12 px-4 text-center text-sm text-slate-400">
            No market is open right now.
          </div>
        ) : filteredPairs.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">
            No pairs match &ldquo;{search}&rdquo;.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5 max-h-[540px] overflow-y-auto pr-1">
            {filteredPairs.map((pair) => (
              <button
                key={pair.id}
                type="button"
                onClick={() => handleSelectPair(pair)}
                className="min-h-[52px] px-3 py-2.5 rounded-2xl bg-[#07112B]/80 border border-blue-400/15 hover:border-blue-400/45 hover:bg-[#0D1E45]/90 active:scale-[0.98] transition-all flex items-center justify-between gap-2 text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <PairFlags base={pair.base} quote={pair.quote} size={22} />
                  <span className="text-xs sm:text-sm font-semibold text-white truncate">
                    {pair.symbol}
                  </span>
                </div>
                <span className="text-[10px] font-mono font-semibold text-slate-400 bg-[#0D1E45] border border-blue-400/15 px-1.5 py-0.5 rounded-md shrink-0">
                  {pair.market}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    );
  }

  if (step === "config") {
    return (
      <section className="rounded-3xl bg-[#0B1736]/85 border border-blue-400/15 p-5 sm:p-6 shadow-[0_16px_40px_rgba(2,6,23,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] space-y-5 max-w-2xl mx-auto">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <PairFlags base={selectedPair.base} quote={selectedPair.quote} size={28} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white truncate">{selectedPair.symbol}</h2>
                <span className="text-[10px] font-mono font-semibold text-sky-300 bg-blue-500/20 border border-blue-400/30 px-1.5 py-0.5 rounded-md">
                  {selectedPair.market}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {selectedPair.market === "OTC" ? "OTC market" : "Live market"} · {selectedPair.payout}% payout
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setStep("select")}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#07112B] border border-blue-400/20 text-xs font-semibold text-slate-200 hover:border-blue-400/45 flex items-center gap-1.5 shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Change
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Duration Selector */}
          <div className="rounded-2xl bg-[#07112B]/90 border border-blue-400/15 p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              Duration
            </div>
            <select
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="w-full bg-transparent text-base font-semibold text-white focus:outline-none cursor-pointer"
              aria-label="Signal duration"
            >
              <option value={1} className="bg-[#0B1736]">1 minute</option>
              <option value={2} className="bg-[#0B1736]">2 minutes</option>
              <option value={3} className="bg-[#0B1736]">3 minutes</option>
              <option value={5} className="bg-[#0B1736]">5 minutes</option>
            </select>
          </div>

          {/* MTG Selector */}
          <div className="rounded-2xl bg-[#07112B]/90 border border-blue-400/15 p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
              MTG
            </div>
            <select
              value={mtgSteps}
              onChange={(e) => setMtgSteps(Number(e.target.value))}
              className="w-full bg-transparent text-base font-semibold text-white focus:outline-none cursor-pointer"
              aria-label="Martingale steps"
            >
              <option value={0} className="bg-[#0B1736]">No MTG</option>
              <option value={1} className="bg-[#0B1736]">1 step</option>
              <option value={2} className="bg-[#0B1736]">2 steps</option>
            </select>
          </div>

          {/* Broker Selector */}
          <div className="rounded-2xl bg-[#07112B]/90 border border-blue-400/15 p-3.5">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Broker Feed
            </div>
            <select
              value={broker}
              onChange={(e) => setBroker(e.target.value as BrokerName)}
              className="w-full bg-transparent text-base font-semibold text-white focus:outline-none cursor-pointer"
              aria-label="Broker"
            >
              <option value="Quotex" className="bg-[#0B1736]">Quotex</option>
              <option value="Pocket Option" className="bg-[#0B1736]">Pocket Option</option>
              <option value="IQ Option" className="bg-[#0B1736]">IQ Option</option>
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={handleStartGenerate}
          className="w-full min-h-[50px] rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(37,99,235,0.4)] active:scale-[0.99] transition-all"
        >
          <Crosshair className="w-4 h-4" />
          Generate
        </button>
      </section>
    );
  }

  if (step === "scanning") {
    return (
      <section className="rounded-3xl bg-[#0B1736]/85 border border-blue-400/15 p-5 sm:p-8 shadow-[0_16px_40px_rgba(2,6,23,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] max-w-2xl mx-auto space-y-8">
        <div className="flex items-center gap-3">
          <PairFlags base={selectedPair.base} quote={selectedPair.quote} size={28} />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">{selectedPair.symbol}</h2>
              <span className="text-[10px] font-mono font-semibold text-sky-300 bg-blue-500/20 border border-blue-400/30 px-1.5 py-0.5 rounded-md">
                {selectedPair.market}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {selectedPair.market === "OTC" ? "OTC market" : "Live market"} · {broker}
            </p>
          </div>
        </div>

        {/* Animated Green ECG Waveform */}
        <div className="py-6 flex items-center justify-center">
          <svg
            viewBox="0 0 360 110"
            className="w-full max-w-md h-28 overflow-visible"
            aria-label="Analyzing market waveform"
          >
            <defs>
              <filter id="ecgGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <path
              d="M10,58 L70,58 L84,48 L96,68 L112,24 L126,86 L140,36 L154,66 L168,58 L205,58 L218,45 L230,72 L242,20 L256,88 L272,42 L286,58 L315,58"
              fill="none"
              stroke="#84CC16"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#ecgGlow)"
              className="animate-pulse-ecg"
            />
            <circle cx="315" cy="58" r="14" fill="none" stroke="#84CC16" strokeWidth="2" opacity="0.7" />
            <circle cx="315" cy="58" r="4" fill="#A3E635" />
          </svg>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2.5 max-w-md mx-auto">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-slate-300">{scanLabel}</span>
            <span className="font-mono text-sky-300">{scanProgress}%</span>
          </div>
          <div className="h-2 rounded-full bg-[#061028] overflow-hidden border border-blue-900/40">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-600 via-sky-400 to-emerald-400 transition-all duration-100"
              style={{ width: `${scanProgress}%` }}
            />
          </div>
        </div>
      </section>
    );
  }

  // Result Step
  return (
    <section className="rounded-3xl bg-[#0B1736]/85 border border-blue-400/15 p-5 sm:p-6 shadow-[0_16px_40px_rgba(2,6,23,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] max-w-2xl mx-auto space-y-5">
      {signal && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <PairFlags base={signal.pair.base} quote={signal.pair.quote} size={30} />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white truncate">
                    {signal.pair.symbol}
                  </h2>
                  <span className="text-[10px] font-mono font-semibold text-sky-300 bg-blue-500/20 border border-blue-400/30 px-1.5 py-0.5 rounded-md">
                    {signal.pair.market}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {signal.pair.market === "OTC" ? "OTC market" : "Live market"} · {signal.broker}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopySignal}
              aria-label="Copy signal details"
              className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-xl bg-[#07112B] border border-blue-400/20 flex items-center justify-center text-slate-300 hover:text-white hover:border-blue-400/45 transition-all"
            >
              {copiedSignal ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Radial Gauge */}
          {renderCountdownGauge()}

          {/* Entry / Expiry / MTG Timeline Row */}
          {(() => {
            const accentHex =
              signal.direction === "CALL" ? "#84CC16" : "#F43F5E";
            return (
              <div className="rounded-2xl bg-[#07112B]/90 border border-blue-400/15 p-4 space-y-2.5">
                <div className="grid grid-cols-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <div className="text-left">Entry</div>
                  <div className="text-center">Expiry</div>
                  <div className="text-right">
                    {signal.mtgSteps > 0
                      ? `MTG · ${signal.mtgSteps * 2}x`
                      : "MTG · Off"}
                  </div>
                </div>

                <div className="relative flex items-center justify-between px-1 py-1">
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 z-10"
                    style={{ backgroundColor: accentHex }}
                  />
                  <div
                    className="flex-1 h-0.5 mx-1 relative flex items-center justify-center"
                    style={{ backgroundColor: accentHex }}
                  >
                    <span className="px-2.5 py-0.5 rounded-full bg-[#0D1B3E] border border-blue-400/25 text-[11px] font-mono text-slate-200">
                      {signal.durationMinutes} min
                    </span>
                  </div>
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 z-10"
                    style={{ backgroundColor: accentHex }}
                  />
                  <div className="flex-1 border-t-2 border-dashed border-slate-600 mx-1" />
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-dashed border-slate-500 shrink-0 z-10" />
                </div>

                <div className="grid grid-cols-3 text-base sm:text-lg font-mono font-bold text-white">
                  <div className="text-left">{signal.entryTime}</div>
                  <div className="text-center">{signal.expiryTime}</div>
                  <div className="text-right">
                    {signal.mtgSteps > 0 ? signal.mtgTime : "—"}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Brain SmartFlow Card */}
          <div className="rounded-2xl bg-[#07112B]/90 border border-blue-400/15 p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <InfinityIcon className="w-4 h-4 text-sky-400" />
                <span>Brain SmartFlow</span>
              </div>

              <button
                type="button"
                onClick={handleAskGeminiInsight}
                disabled={aiLoading}
                className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {aiLoading ? "Analyzing..." : "AI Deep Read"}
              </button>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {smartFlowExpanded ? signal.smartFlowDetailed : signal.smartFlowShort}
            </p>

            {aiInsight && (
              <div className="p-3 rounded-xl bg-blue-600/10 border border-blue-400/25 text-xs text-sky-100 leading-relaxed">
                {aiInsight}
              </div>
            )}

            {aiError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-400/25 text-xs text-rose-300">
                {aiError}
              </div>
            )}

            {smartFlowExpanded && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-blue-900/40 text-xs">
                <div className="p-2 rounded-xl bg-[#0B1736]">
                  <div className="text-slate-400 text-[10px]">RSI (14)</div>
                  <div className="font-mono font-semibold text-white mt-0.5">
                    {signal.indicators.rsi}
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-[#0B1736]">
                  <div className="text-slate-400 text-[10px]">Support</div>
                  <div className="font-mono font-semibold text-emerald-400 mt-0.5">
                    {signal.indicators.support}
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-[#0B1736]">
                  <div className="text-slate-400 text-[10px]">Resistance</div>
                  <div className="font-mono font-semibold text-rose-400 mt-0.5">
                    {signal.indicators.resistance}
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-[#0B1736] col-span-2 sm:col-span-3">
                  <div className="text-slate-400 text-[10px]">Structure</div>
                  <div className="text-slate-200 mt-0.5">
                    {signal.indicators.emaBias} · {signal.indicators.volatility}
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setSmartFlowExpanded(!smartFlowExpanded)}
              className="text-xs font-semibold text-sky-400 hover:text-sky-300 inline-flex items-center gap-1 pt-0.5"
            >
              {smartFlowExpanded ? (
                <>
                  Less <ChevronUp className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  More <ChevronDown className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          {/* Outcome Logger + New Signal */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={!!signal.outcome}
              onClick={() => handleMarkOutcome("WIN")}
              className={`min-h-[44px] rounded-2xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                signal.outcome === "WIN"
                  ? "bg-emerald-500/25 border-emerald-400 text-emerald-300"
                  : "bg-[#07112B] border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/15 disabled:opacity-45"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              {signal.outcome === "WIN" ? "Marked Win" : "Mark Win"}
            </button>

            <button
              type="button"
              disabled={!!signal.outcome}
              onClick={() => handleMarkOutcome("LOSS")}
              className={`min-h-[44px] rounded-2xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                signal.outcome === "LOSS"
                  ? "bg-rose-500/25 border-rose-400 text-rose-300"
                  : "bg-[#07112B] border-rose-500/30 text-rose-400 hover:bg-rose-500/15 disabled:opacity-45"
              }`}
            >
              <XCircle className="w-4 h-4" />
              {signal.outcome === "LOSS" ? "Marked Loss" : "Mark Loss"}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setStep("select")}
            className="w-full min-h-[50px] rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(37,99,235,0.4)] active:scale-[0.99] transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            New signal
          </button>
        </>
      )}
    </section>
  );
};
