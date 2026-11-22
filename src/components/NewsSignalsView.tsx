import React, { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Minus,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  BarChart3,
  ArrowUpRight,
} from "lucide-react";
import { NewsEvent } from "../types";
import { CurrencyFlag } from "./CurrencyFlag";

interface NewsSignalsViewProps {
  onTradePair: (pairSymbol: string) => void;
  onNotify: (msg: string) => void;
}

export const NewsSignalsView: React.FC<NewsSignalsViewProps> = ({
  onTradePair,
  onNotify,
}) => {
  const [tab, setTab] = useState<"events" | "fundamental">("events");
  const [loading, setLoading] = useState(true);
  const [loadPct, setLoadPct] = useState(18);
  const [events, setEvents] = useState<NewsEvent[]>([]);
  const [dateLabel, setDateLabel] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [impactFilter, setImpactFilter] = useState<"all" | "high">("all");
  const [error, setError] = useState<string | null>(null);

  const loadCalendar = async () => {
    setLoading(true);
    setLoadPct(21);
    setError(null);

    try {
      const progressTimer = setInterval(() => {
        setLoadPct((prev) => (prev < 88 ? prev + 19 : prev));
      }, 180);

      const resp = await fetch("/api/news-calendar");
      const data = await resp.json();

      clearInterval(progressTimer);
      if (!resp.ok) {
        throw new Error(data.error || "Failed to load news calendar.");
      }

      setLoadPct(100);
      setTimeout(() => {
        setEvents(data.events ?? []);
        setDateLabel(data.dateLabel ?? "Today");
        setUpdatedAt(data.updatedAt ?? "—");
        setLoading(false);
      }, 280);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load news feed.");
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCalendar();
  }, []);

  const stats = useMemo(() => {
    const highCount = events.filter((e) => e.impact === 3).length;
    const bullishCount = events.filter((e) => e.bias === "bullish").length;
    const bearishCount = events.filter((e) => e.bias === "bearish").length;
    const actionableSignals = events.filter((e) => e.bias !== "neutral" || e.impact === 3).length;
    return { highCount, bullishCount, bearishCount, actionableSignals };
  }, [events]);

  const visibleEvents = useMemo(() => {
    let list = events;
    if (tab === "fundamental") {
      list = list.filter((e) => e.bias !== "neutral" || e.impact >= 2);
    }
    if (impactFilter === "high") {
      list = list.filter((e) => e.impact === 3);
    }
    return list;
  }, [events, tab, impactFilter]);

  const renderImpactBars = (impact: 1 | 2 | 3) => {
    const activeColor =
      impact === 3 ? "bg-rose-500" : impact === 2 ? "bg-amber-400" : "bg-sky-400";
    return (
      <span className="inline-flex items-end gap-0.5 h-3" aria-label={`Impact ${impact} of 3`}>
        <span className={`w-1 h-1.5 rounded-sm ${impact >= 1 ? activeColor : "bg-slate-700"}`} />
        <span className={`w-1 h-2 rounded-sm ${impact >= 2 ? activeColor : "bg-slate-700"}`} />
        <span className={`w-1 h-3 rounded-sm ${impact >= 3 ? activeColor : "bg-slate-700"}`} />
      </span>
    );
  };

  const renderBiasBadge = (bias: NewsEvent["bias"]) => {
    if (bias === "bullish") {
      return (
        <span className="w-7 h-7 rounded-full bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
          <ArrowUp className="w-3.5 h-3.5" strokeWidth={2.5} />
        </span>
      );
    }
    if (bias === "bearish") {
      return (
        <span className="w-7 h-7 rounded-full bg-rose-500/15 border border-rose-400/30 flex items-center justify-center text-rose-400 shrink-0">
          <ArrowDown className="w-3.5 h-3.5" strokeWidth={2.5} />
        </span>
      );
    }
    return (
      <span className="w-7 h-7 rounded-full bg-slate-500/15 border border-slate-500/25 flex items-center justify-center text-slate-400 shrink-0">
        <Minus className="w-3.5 h-3.5" />
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Tabs */}
      <section className="rounded-3xl bg-[#0B1736]/85 border border-blue-400/15 p-4 sm:p-5 shadow-[0_16px_40px_rgba(2,6,23,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-[#061028] border border-blue-900/40 flex-1 min-w-[260px]">
            <button
              type="button"
              onClick={() => setTab("events")}
              className={`min-h-[44px] px-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all whitespace-nowrap ${
                tab === "events"
                  ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-[0_4px_16px_rgba(37,99,235,0.4)]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Calendar className="w-4 h-4" />
              Today&apos;s events
            </button>
            <button
              type="button"
              onClick={() => setTab("fundamental")}
              className={`min-h-[44px] px-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all whitespace-nowrap ${
                tab === "fundamental"
                  ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-[0_4px_16px_rgba(37,99,235,0.4)]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <AlertCircle className="w-4 h-4" />
              Fundamental
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              void loadCalendar();
              onNotify("Refreshing economic calendar");
            }}
            aria-label="Refresh economic calendar"
            className="min-h-[44px] px-3.5 rounded-2xl bg-[#07112B] border border-blue-400/20 text-xs font-semibold text-slate-200 hover:border-blue-400/45 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Loading Orbit Animation (matching 00:38-00:40) */}
        {loading && (
          <div className="py-14 flex flex-col items-center justify-center space-y-8">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-[#0D1E45] border border-blue-400/35 flex items-center justify-center shadow-[0_0_28px_rgba(37,99,235,0.35)]">
                <BarChart3 className="w-7 h-7 text-sky-400" />
              </div>
              <div className="absolute inset-0 animate-orbit">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 animate-orbit-counter">
                  <CurrencyFlag code="USD" size={26} />
                </div>
                <div className="absolute top-1/2 -right-3 -translate-y-1/2 animate-orbit-counter">
                  <CurrencyFlag code="EUR" size={26} />
                </div>
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 animate-orbit-counter">
                  <CurrencyFlag code="GBP" size={26} />
                </div>
                <div className="absolute top-1/2 -left-3 -translate-y-1/2 animate-orbit-counter">
                  <CurrencyFlag code="JPY" size={26} />
                </div>
              </div>
            </div>

            <div className="w-full max-w-xs space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">
                  {loadPct < 60 ? "Fetching calendar" : "Reading bias"}
                </span>
                <span className="font-mono text-sky-300">{loadPct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-[#061028] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-600 to-sky-400 transition-all duration-150"
                  style={{ width: `${loadPct}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="rounded-2xl bg-rose-500/10 border border-rose-400/30 p-4 text-sm text-rose-200">
            {error}
          </div>
        )}

        {/* KPI Summary Strip */}
        {!loading && !error && (
          <>
            {tab === "events" ? (
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-[#07112B]/90 border border-blue-400/15 p-3.5">
                  <div className="text-[11px] text-slate-400">Events</div>
                  <div className="text-xl font-bold font-mono text-white mt-0.5">
                    {events.length}
                  </div>
                </div>
                <div className="rounded-2xl bg-[#07112B]/90 border border-blue-400/15 p-3.5">
                  <div className="text-[11px] text-slate-400">High</div>
                  <div className="text-xl font-bold font-mono text-rose-400 mt-0.5">
                    {stats.highCount}
                  </div>
                </div>
                <div className="rounded-2xl bg-[#07112B]/90 border border-blue-400/15 p-3.5">
                  <div className="text-[11px] text-slate-400">Updated</div>
                  <div className="text-xl font-bold font-mono text-white mt-0.5">
                    {updatedAt}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-[#07112B]/90 border border-blue-400/15 p-3.5">
                  <div className="text-[11px] text-slate-400">Bullish</div>
                  <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
                    {stats.bullishCount}
                  </div>
                </div>
                <div className="rounded-2xl bg-[#07112B]/90 border border-blue-400/15 p-3.5">
                  <div className="text-[11px] text-slate-400">Bearish</div>
                  <div className="text-xl font-bold font-mono text-rose-400 mt-0.5">
                    {stats.bearishCount}
                  </div>
                </div>
                <div className="rounded-2xl bg-[#07112B]/90 border border-blue-400/15 p-3.5">
                  <div className="text-[11px] text-slate-400">Signals</div>
                  <div className="text-xl font-bold font-mono text-sky-400 mt-0.5">
                    {stats.actionableSignals}
                  </div>
                </div>
              </div>
            )}

            {/* Date & Filter Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <h2 className="text-sm font-semibold text-slate-200">{dateLabel}</h2>
              <div className="flex items-center gap-1.5 bg-[#061028] border border-blue-900/40 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setImpactFilter("all")}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    impactFilter === "all"
                      ? "bg-blue-600 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  All Impact
                </button>
                <button
                  type="button"
                  onClick={() => setImpactFilter("high")}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    impactFilter === "high"
                      ? "bg-rose-600 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  High Only
                </button>
              </div>
            </div>

            {/* Event List */}
            <div className="divide-y divide-blue-900/40 rounded-2xl bg-[#07112B]/75 border border-blue-400/15 overflow-hidden">
              {visibleEvents.map((ev) => {
                const isExpanded = expandedId === ev.id;
                return (
                  <div key={ev.id} className="transition-colors">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : ev.id)}
                      className="w-full min-h-[64px] px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-white/[0.03] transition-colors"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-12 text-xs font-mono text-slate-300 shrink-0">
                          {ev.time}
                        </div>
                        <CurrencyFlag code={ev.currency} size={26} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-semibold text-slate-300">
                              {ev.currency}
                            </span>
                            {renderImpactBars(ev.impact)}
                          </div>
                          <div className="text-sm font-semibold text-white truncate mt-0.5">
                            {ev.title}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        {renderBiasBadge(ev.bias)}
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 bg-[#061028]/80 space-y-3 border-t border-blue-900/30">
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="p-2.5 rounded-xl bg-[#0B1736]">
                            <div className="text-[10px] text-slate-400">Previous</div>
                            <div className="text-xs font-mono font-semibold text-slate-200 mt-0.5">
                              {ev.previous}
                            </div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-[#0B1736]">
                            <div className="text-[10px] text-slate-400">Forecast</div>
                            <div className="text-xs font-mono font-semibold text-sky-300 mt-0.5">
                              {ev.forecast}
                            </div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-[#0B1736]">
                            <div className="text-[10px] text-slate-400">Actual</div>
                            <div className="text-xs font-mono font-semibold text-white mt-0.5">
                              {ev.actual}
                            </div>
                          </div>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">
                          {ev.signalNote}
                        </p>

                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] text-slate-400">Trade pairs:</span>
                          {ev.affectedPairs.map((pairSym) => (
                            <button
                              key={pairSym}
                              type="button"
                              onClick={() => onTradePair(pairSym)}
                              className="px-2.5 py-1 rounded-lg bg-blue-600/20 border border-blue-400/30 text-xs font-semibold text-sky-300 hover:bg-blue-600/35 inline-flex items-center gap-1"
                            >
                              {pairSym}
                              <ArrowUpRight className="w-3 h-3" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
};
