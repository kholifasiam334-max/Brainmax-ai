import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  Minus,
  Plus,
  History,
  RefreshCw,
  Copy,
  Check,
  X,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  CurrencyPair,
  FutureSignalItem,
  MarketMode,
  TradeHistoryRecord,
} from "../types";
import {
  LIVE_PAIRS,
  OTC_PAIRS,
  generateFutureSchedule,
  isLiveMarketWeekendClosed,
} from "../data/markets";
import { PairFlags } from "./CurrencyFlag";

interface FutureSignalsViewProps {
  onRecordOutcome: (record: TradeHistoryRecord) => void;
  onNotify: (msg: string) => void;
}

const PRESET_COUNTS = [3, 5, 10, 15];

export const FutureSignalsView: React.FC<FutureSignalsViewProps> = ({
  onRecordOutcome,
  onNotify,
}) => {
  const [market, setMarket] = useState<MarketMode>("OTC");
  const [search, setSearch] = useState("");
  const [selectedPairs, setSelectedPairs] = useState<CurrencyPair[]>([]);
  const [signalCount, setSignalCount] = useState<number>(3);
  const [schedule, setSchedule] = useState<FutureSignalItem[]>([]);
  const [copiedAll, setCopiedAll] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (schedule.length === 0) return;
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [schedule.length]);

  const liveClosed = isLiveMarketWeekendClosed();
  const openLivePairs = liveClosed ? [] : LIVE_PAIRS;
  const activePairs = market === "OTC" ? OTC_PAIRS : openLivePairs;
  const filteredPairs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return activePairs;
    return activePairs.filter((p) => p.symbol.toLowerCase().includes(q));
  }, [activePairs, search]);

  const togglePair = (pair: CurrencyPair) => {
    setSelectedPairs((prev) => {
      const exists = prev.some((p) => p.id === pair.id);
      if (exists) return prev.filter((p) => p.id !== pair.id);
      return [...prev, pair];
    });
  };

  const handleGenerate = async () => {
    if (selectedPairs.length === 0) {
      onNotify("Select at least one market pair first");
      return;
    }
    setGenerating(true);
    setExpandedRowId(null);
    try {
      const resp = await fetch("/api/analyze-future-markets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pairs: selectedPairs,
          count: signalCount,
          durationMinutes: 1,
          startOffsetMinutes: 3,
          intervalMinutes: 3,
          avoidDoji: true,
          avoidGaps: true,
        }),
      });
      const data = resp.ok ? await resp.json() : null;
      const items: FutureSignalItem[] =
        data?.schedule ??
        generateFutureSchedule(selectedPairs, signalCount, 1, 3);
      setNowMs(Date.now());
      setSchedule(items);
      onNotify(`Generated ${items.length} future signals`);
    } catch {
      const items = generateFutureSchedule(selectedPairs, signalCount, 1, 3);
      setNowMs(Date.now());
      setSchedule(items);
      onNotify(`Generated ${items.length} future signals`);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyAll = async () => {
    if (schedule.length === 0) return;
    const utc6Now = new Date(Date.now() + 6 * 3600 * 1000);
    const day = String(utc6Now.getUTCDate()).padStart(2, "0");
    const month = String(utc6Now.getUTCMonth() + 1).padStart(2, "0");
    const year = utc6Now.getUTCFullYear();
    const hh = String(utc6Now.getUTCHours()).padStart(2, "0");
    const mm = String(utc6Now.getUTCMinutes()).padStart(2, "0");
    const ss = String(utc6Now.getUTCSeconds()).padStart(2, "0");
    const dateStr = `${day}/${month}/${year}`;
    const timeStr = `${hh}:${mm}:${ss}`;

    const lines = [
      `BRAIN MAX AI FUTURE SIGNAL LIST`,
      `Date: ${dateStr} | ${timeStr} (UTC+6)`,
      `Timeframe: 1 Minute`,
      `Avoid Doji 80% Market`,
      `Avoid Gap Up / Gap Down`,
      "",
      ...schedule.map((s, idx) => {
        const marketTag = s.pair.market === "OTC" ? " (OTC)" : "";
        const dirLabel = s.direction === "CALL" ? "UP" : "DOWN";
        return `${idx + 1}. 1 MIN | ${s.pair.symbol}${marketTag} | ${s.entryTime} | ${dirLabel}`;
      }),
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopiedAll(true);
      onNotify("Signal list copied");
      setTimeout(() => setCopiedAll(false), 1800);
    } catch {
      onNotify("Unable to copy schedule");
    }
  };

  const handleMarkItem = (id: string, outcome: "WIN" | "LOSS") => {
    const target = schedule.find((s) => s.id === id);
    if (!target || target.outcome) return;
    setSchedule((prev) =>
      prev.map((s) => (s.id === id ? { ...s, outcome } : s))
    );
    onRecordOutcome({
      id: `fut-rec-${Date.now()}`,
      pairSymbol: target.pair.symbol,
      market: target.pair.market,
      direction: target.direction,
      confidence: target.confidence,
      entryTime: target.entryTime,
      outcome,
      createdAt: new Date().toISOString(),
    });
    onNotify(`Logged ${target.pair.symbol} (${target.entryTime}) as ${outcome}`);
  };

  const callCount = schedule.filter((s) => s.direction === "CALL").length;
  const putCount = schedule.filter((s) => s.direction === "PUT").length;

  const getScheduleStatus = (item: FutureSignalItem, idx: number): string => {
    const diffMs = item.entryTimestampMs - nowMs;
    const expiryEndMs = item.entryTimestampMs + item.durationMinutes * 60000;
    if (nowMs >= expiryEndMs) return "completed";
    if (diffMs <= 0) return "active now";
    const totalSec = Math.ceil(diffMs / 1000);
    if (idx === 0 || totalSec <= 240) {
      const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
      const ss = String(totalSec % 60).padStart(2, "0");
      return `in ${mm}:${ss}`;
    }
    return "queued";
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Market Picker + Signals Stepper */}
        <section className="lg:col-span-7 rounded-3xl bg-[#0B1736]/85 border border-blue-400/15 p-4 sm:p-5 shadow-[0_16px_40px_rgba(2,6,23,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] space-y-4">
          {/* Market Tabs */}
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

          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search pair — e.g. EUR/USD"
              className="w-full h-12 pl-11 pr-4 rounded-2xl bg-[#061028] border border-blue-400/20 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-400/60"
            />
          </div>

          {/* Multi-select Pair Grid */}
          {market === "LIVE" && liveClosed ? (
            <div className="rounded-2xl border border-blue-400/15 bg-[#07112B]/55 py-12 px-4 text-center text-sm text-slate-400">
              No market is open right now.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[280px] overflow-y-auto pr-1">
              {filteredPairs.map((pair) => {
                const selected = selectedPairs.some((p) => p.id === pair.id);
                return (
                  <button
                    key={pair.id}
                    type="button"
                    onClick={() => togglePair(pair)}
                    className={`min-h-[50px] px-3 py-2 rounded-2xl border transition-all flex items-center justify-between gap-2 text-left ${
                      selected
                        ? "bg-blue-600/25 border-blue-400 text-white shadow-[0_0_16px_rgba(59,130,246,0.25)]"
                        : "bg-[#07112B]/80 border-blue-400/15 hover:border-blue-400/40 text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <PairFlags base={pair.base} quote={pair.quote} size={20} />
                      <span className="text-xs font-semibold truncate">{pair.symbol}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 bg-[#0D1E45] px-1.5 py-0.5 rounded-md shrink-0">
                      {selected ? "✓" : pair.market}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Signals Count Card matching screenshot */}
          <div className="rounded-2xl bg-[#07112B]/90 border border-blue-400/15 p-4 space-y-3">
            <div className="text-xs font-semibold text-slate-300">Signals</div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1 p-1 rounded-xl bg-[#061028] border border-blue-900/50">
                {PRESET_COUNTS.map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setSignalCount(cnt)}
                    className={`min-w-[40px] min-h-[38px] px-2.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                      signalCount === cnt
                        ? "bg-[#16274F] text-white border border-blue-400/25 shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {cnt}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 bg-[#061028] border border-blue-900/50 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setSignalCount((c) => Math.max(1, c - 1))}
                  aria-label="Decrease signals count"
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-300 hover:bg-white/10"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-7 text-center text-sm font-mono font-bold text-white">
                  {signalCount}
                </span>
                <button
                  type="button"
                  onClick={() => setSignalCount((c) => Math.min(30, c + 1))}
                  aria-label="Increase signals count"
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-300 hover:bg-white/10"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Selection Card matching screenshot */}
        <section className="lg:col-span-5 rounded-3xl bg-[#0B1736]/85 border border-blue-400/15 p-4 sm:p-5 shadow-[0_16px_40px_rgba(2,6,23,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">Selection</h2>
            {selectedPairs.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedPairs([])}
                className="text-xs text-slate-400 hover:text-white"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="min-h-[140px] flex flex-col justify-start">
            {selectedPairs.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-6 text-slate-500">
                <History className="w-6 h-6 mb-2 opacity-60" />
                <span className="text-xs font-medium">No markets</span>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {selectedPairs.map((pair) => (
                  <button
                    key={pair.id}
                    type="button"
                    onClick={() => togglePair(pair)}
                    className="px-3 py-1.5 rounded-full bg-[#07112B] border border-blue-400/25 text-xs font-semibold text-white flex items-center gap-2 hover:border-rose-400/40 transition-colors"
                  >
                    <PairFlags base={pair.base} quote={pair.quote} size={18} />
                    <span>{pair.symbol}</span>
                    <span className="text-[10px] font-mono text-sky-300 bg-blue-500/20 px-1.5 py-0.5 rounded-md">
                      {pair.market}
                    </span>
                    <X className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-blue-900/40 pt-4 grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-slate-400">Markets</div>
              <div className="text-xl font-bold font-mono text-white mt-0.5">
                {selectedPairs.length}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Signals</div>
              <div className="text-xl font-bold font-mono text-white mt-0.5">
                {signalCount}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={selectedPairs.length === 0 || generating}
            className="w-full min-h-[50px] rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(37,99,235,0.4)] disabled:shadow-none transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
            {generating ? "Generating..." : "Generate"}
          </button>
        </section>
      </div>

      {/* Generated Schedule Card matching screenshot */}
      {schedule.length > 0 && (
        <section className="rounded-3xl bg-[#0B1736]/85 border border-blue-400/15 p-4 sm:p-6 shadow-[0_16px_40px_rgba(2,6,23,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-bold text-white">
                {schedule.length} signals
              </h3>
              <div className="text-xs font-mono font-semibold flex items-center gap-1.5">
                <span className="text-[#84CC16]">{callCount} call</span>
                <span className="text-slate-500">·</span>
                <span className="text-[#F43F5E]">{putCount} put</span>
              </div>
            </div>
            <span className="text-[11px] font-mono text-slate-400">UTC+6</span>
          </div>

          <button
            type="button"
            onClick={handleCopyAll}
            className="w-full min-h-[46px] rounded-2xl bg-[#07112B] border border-blue-400/20 hover:border-blue-400/45 text-sm font-semibold text-slate-200 hover:text-white flex items-center justify-center gap-2 transition-all"
          >
            {copiedAll ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            {copiedAll ? "Copied" : "Copy"}
          </button>

          <div className="relative pl-1 pt-2">
            {schedule.map((item, idx) => {
              const isCall = item.direction === "CALL";
              const statusText = getScheduleStatus(item, idx);
              const isLast = idx === schedule.length - 1;
              const isExpanded = expandedRowId === item.id;

              return (
                <div key={item.id} className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedRowId(isExpanded ? null : item.id)
                    }
                    className="w-full flex items-center justify-between gap-3 py-3.5 text-left hover:bg-white/[0.02] rounded-xl px-1 transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-12 text-sm font-mono font-semibold text-white shrink-0">
                        {item.entryTime}
                      </div>

                      {/* Vertical Timeline Dot & Line */}
                      <div className="relative flex flex-col items-center justify-center self-stretch">
                        {!isLast && (
                          <span className="absolute top-1/2 bottom-[-18px] w-px bg-blue-900/70" />
                        )}
                        {idx > 0 && (
                          <span className="absolute top-[-18px] bottom-1/2 w-px bg-blue-900/70" />
                        )}
                        <span
                          className={`relative z-10 w-2.5 h-2.5 rounded-full ${
                            isCall
                              ? "bg-[#84CC16] shadow-[0_0_8px_rgba(132,204,22,0.7)]"
                              : "bg-[#F43F5E] shadow-[0_0_8px_rgba(244,63,94,0.7)]"
                          }`}
                        />
                      </div>

                      <PairFlags
                        base={item.pair.base}
                        quote={item.pair.quote}
                        size={24}
                      />

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white truncate">
                            {item.pair.symbol}
                          </span>
                          <span className="text-[10px] font-mono text-sky-300 bg-blue-500/20 border border-blue-400/25 px-1.5 py-0.5 rounded-md">
                            {item.pair.market}
                          </span>
                        </div>
                        <div
                          className={`text-xs font-mono mt-0.5 ${
                            statusText.startsWith("in ") ||
                            statusText === "active now"
                              ? "text-sky-300"
                              : "text-slate-500"
                          }`}
                        >
                          {statusText}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`min-w-[78px] px-3 py-1.5 rounded-xl text-xs font-mono font-bold inline-flex items-center justify-center gap-1 border shrink-0 ${
                        isCall
                          ? "bg-[#84CC16]/15 text-[#84CC16] border-[#84CC16]/35"
                          : "bg-[#F43F5E]/15 text-[#F43F5E] border-[#F43F5E]/35"
                      }`}
                    >
                      {isCall ? (
                        <ArrowUp className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5" />
                      )}
                      {item.direction}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="ml-16 mb-2 px-3 py-2 rounded-xl bg-[#07112B] border border-blue-900/40 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="text-slate-400 truncate">{item.note}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          disabled={!!item.outcome}
                          onClick={() => handleMarkItem(item.id, "WIN")}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 border ${
                            item.outcome === "WIN"
                              ? "bg-emerald-500/25 border-emerald-400 text-emerald-300"
                              : "bg-[#0B1736] border-emerald-500/30 text-emerald-400 disabled:opacity-40"
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          Win
                        </button>
                        <button
                          type="button"
                          disabled={!!item.outcome}
                          onClick={() => handleMarkItem(item.id, "LOSS")}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 border ${
                            item.outcome === "LOSS"
                              ? "bg-rose-500/25 border-rose-400 text-rose-300"
                              : "bg-[#0B1736] border-rose-500/30 text-rose-400 disabled:opacity-40"
                          }`}
                        >
                          <XCircle className="w-3 h-3" />
                          Loss
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
