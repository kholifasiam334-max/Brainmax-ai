import React, { useMemo, useState } from "react";
import {
  SlidersHorizontal,
  Table2,
  DollarSign,
  Percent,
  Flag,
  ShieldAlert,
  RefreshCw,
  Plus,
  RotateCcw,
  Download,
  AlertTriangle,
} from "lucide-react";
import { ManagementPlan, TradeSheetRow } from "../types";

interface ManagementViewProps {
  plan: ManagementPlan;
  onUpdatePlan: (plan: ManagementPlan) => void;
  sheetRows: TradeSheetRow[];
  onUpdateSheet: (rows: TradeSheetRow[]) => void;
  onNotify: (msg: string) => void;
}

function recalculateSheet(
  rows: TradeSheetRow[],
  plan: ManagementPlan
): TradeSheetRow[] {
  const cap = Math.max(0, plan.initialCapital);
  const payoutRatio = Math.max(1, plan.averagePayout) / 100;
  const baseStake = Number(((cap * plan.riskPerTradePct) / 100).toFixed(2));
  let runningBalance = cap;
  let lastLost = false;

  return rows.map((row, idx) => {
    const isMtg = plan.martingaleOneStep && lastLost;
    const stake = isMtg
      ? Number((baseStake * (1 + 1 / payoutRatio)).toFixed(2))
      : baseStake;

    let pnl = 0;
    if (row.status === "WIN") {
      pnl = Number((stake * payoutRatio).toFixed(2));
      lastLost = false;
    } else if (row.status === "LOSS") {
      pnl = -stake;
      lastLost = !isMtg; // 1-step MTG then reset to base stake
    } else {
      lastLost = false;
    }

    runningBalance = Number((runningBalance + pnl).toFixed(2));
    return {
      ...row,
      tradeNo: idx + 1,
      stake,
      isMtg,
      pnl,
      balanceAfter: runningBalance,
    };
  });
}

export const ManagementView: React.FC<ManagementViewProps> = ({
  plan,
  onUpdatePlan,
  sheetRows,
  onUpdateSheet,
  onNotify,
}) => {
  const [tab, setTab] = useState<"plan" | "sheet">("plan");

  const metrics = useMemo(() => {
    const cap = Math.max(0, plan.initialCapital);
    const payoutRatio = Math.max(1, plan.averagePayout) / 100;
    const targetProfit = (cap * plan.profitTargetPct) / 100;
    const targetBalance = cap + targetProfit;
    const baseTrade = (cap * plan.riskPerTradePct) / 100;
    const mtgStep1 = plan.martingaleOneStep
      ? baseTrade * (1 + 1 / payoutRatio)
      : 0;
    const profitPerWin = baseTrade * payoutRatio;
    const winsNeeded =
      profitPerWin > 0 ? Math.ceil(targetProfit / profitPerWin) : 0;
    const threeLossDrawdown = baseTrade * 3;
    return {
      targetProfit,
      targetBalance,
      baseTrade,
      mtgStep1,
      winsNeeded,
      threeLossDrawdown,
    };
  }, [plan]);

  const handleApplyToSheet = () => {
    const initialCount = Math.max(5, Math.min(12, metrics.winsNeeded || 6));
    const seedRows: TradeSheetRow[] = Array.from({ length: initialCount }).map(
      (_, i) => ({
        id: `row-${Date.now()}-${i}`,
        tradeNo: i + 1,
        pair: i % 2 === 0 ? "EUR/USD OTC" : "NZD/CHF OTC",
        stake: Number(metrics.baseTrade.toFixed(2)),
        isMtg: false,
        status: "PENDING",
        pnl: 0,
        balanceAfter: plan.initialCapital,
      })
    );
    onUpdateSheet(recalculateSheet(seedRows, plan));
    setTab("sheet");
    onNotify("Risk plan applied to trading sheet");
  };

  const handleSetRowStatus = (rowId: string, status: "PENDING" | "WIN" | "LOSS") => {
    const updated = sheetRows.map((r) => (r.id === rowId ? { ...r, status } : r));
    onUpdateSheet(recalculateSheet(updated, plan));
  };

  const handleAddRow = () => {
    const nextRow: TradeSheetRow = {
      id: `row-${Date.now()}`,
      tradeNo: sheetRows.length + 1,
      pair: "GBP/CAD OTC",
      stake: Number(metrics.baseTrade.toFixed(2)),
      isMtg: false,
      status: "PENDING",
      pnl: 0,
      balanceAfter: plan.initialCapital,
    };
    onUpdateSheet(recalculateSheet([...sheetRows, nextRow], plan));
  };

  const handleUpdatePair = (rowId: string, pair: string) => {
    const updated = sheetRows.map((r) => (r.id === rowId ? { ...r, pair } : r));
    onUpdateSheet(updated);
  };

  const handleExportCsv = () => {
    const header = "Trade #,Pair,Stake,MTG Step,Status,P&L,Balance\n";
    const body = sheetRows
      .map(
        (r) =>
          `${r.tradeNo},"${r.pair}",${r.stake.toFixed(2)},${r.isMtg ? "MTG 1" : "Base"},${r.status},${r.pnl.toFixed(2)},${r.balanceAfter.toFixed(2)}`
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "brain-max-management-sheet.csv";
    a.click();
    URL.revokeObjectURL(url);
    onNotify("Exported sheet to CSV");
  };

  const currentBalance =
    sheetRows.length > 0
      ? sheetRows[sheetRows.length - 1].balanceAfter
      : plan.initialCapital;
  const netPnl = currentBalance - plan.initialCapital;
  const targetPctProgress =
    metrics.targetProfit > 0
      ? Math.max(0, Math.min(100, (netPnl / metrics.targetProfit) * 100))
      : 0;

  // Check consecutive losses
  let consecutiveLosses = 0;
  let stopLossHit = false;
  for (const r of sheetRows) {
    if (r.status === "LOSS") {
      consecutiveLosses++;
      if (consecutiveLosses >= 3) stopLossHit = true;
    } else if (r.status === "WIN") {
      consecutiveLosses = 0;
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-[#0B1736]/85 border border-blue-400/15 p-4 sm:p-6 shadow-[0_16px_40px_rgba(2,6,23,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] space-y-5">
        {/* Segmented Plan | Sheet Tabs */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-[#061028] border border-blue-900/40 max-w-md mx-auto">
          <button
            type="button"
            onClick={() => setTab("plan")}
            className={`min-h-[44px] rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all whitespace-nowrap ${
              tab === "plan"
                ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-[0_4px_16px_rgba(37,99,235,0.4)]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Plan
          </button>
          <button
            type="button"
            onClick={() => setTab("sheet")}
            className={`min-h-[44px] rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all whitespace-nowrap ${
              tab === "sheet"
                ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-[0_4px_16px_rgba(37,99,235,0.4)]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Table2 className="w-4 h-4" />
            Sheet
          </button>
        </div>

        {tab === "plan" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Inputs Column */}
            <div className="lg:col-span-7 space-y-3.5">
              {/* Initial capital */}
              <label className="block rounded-2xl bg-[#07112B]/90 border border-blue-400/15 p-4 focus-within:border-blue-400/60 transition-colors">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-2">
                  <DollarSign className="w-3.5 h-3.5 text-sky-400" />
                  <span>Initial capital</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-mono text-slate-400">$</span>
                  <input
                    type="number"
                    min={0}
                    step="1"
                    value={plan.initialCapital || ""}
                    placeholder="0"
                    onChange={(e) =>
                      onUpdatePlan({
                        ...plan,
                        initialCapital: Math.max(0, Number(e.target.value)),
                      })
                    }
                    className="w-full bg-transparent text-xl font-mono font-bold text-white focus:outline-none placeholder:text-slate-600"
                  />
                </div>
              </label>

              {/* Average payout */}
              <label className="block rounded-2xl bg-[#07112B]/90 border border-blue-400/15 p-4 focus-within:border-blue-400/60 transition-colors">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-2">
                  <Percent className="w-3.5 h-3.5 text-sky-400" />
                  <span>Average payout</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="number"
                    min={10}
                    max={100}
                    value={plan.averagePayout || ""}
                    placeholder="85"
                    onChange={(e) =>
                      onUpdatePlan({
                        ...plan,
                        averagePayout: Math.min(100, Math.max(0, Number(e.target.value))),
                      })
                    }
                    className="w-full bg-transparent text-xl font-mono font-bold text-white focus:outline-none placeholder:text-slate-600"
                  />
                  <span className="text-lg font-mono text-slate-400">%</span>
                </div>
              </label>

              {/* Profit target */}
              <label className="block rounded-2xl bg-[#07112B]/90 border border-blue-400/15 p-4 focus-within:border-blue-400/60 transition-colors">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-2">
                  <Flag className="w-3.5 h-3.5 text-sky-400" />
                  <span>Profit target</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={plan.profitTargetPct || ""}
                    placeholder="20"
                    onChange={(e) =>
                      onUpdatePlan({
                        ...plan,
                        profitTargetPct: Math.max(0, Number(e.target.value)),
                      })
                    }
                    className="w-full bg-transparent text-xl font-mono font-bold text-white focus:outline-none placeholder:text-slate-600"
                  />
                  <span className="text-lg font-mono text-slate-400">%</span>
                </div>
              </label>

              {/* Risk per trade */}
              <label className="block rounded-2xl bg-[#07112B]/90 border border-blue-400/15 p-4 focus-within:border-blue-400/60 transition-colors">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-sky-400" />
                  <span>Risk per trade</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="number"
                    min={0.5}
                    max={50}
                    step="0.5"
                    value={plan.riskPerTradePct || ""}
                    placeholder="2"
                    onChange={(e) =>
                      onUpdatePlan({
                        ...plan,
                        riskPerTradePct: Math.min(50, Math.max(0, Number(e.target.value))),
                      })
                    }
                    className="w-full bg-transparent text-xl font-mono font-bold text-white focus:outline-none placeholder:text-slate-600"
                  />
                  <span className="text-lg font-mono text-slate-400">%</span>
                </div>
              </label>

              {/* Martingale 1 step toggle */}
              <div className="rounded-2xl bg-[#07112B]/90 border border-blue-400/15 px-4 py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <RefreshCw className="w-4 h-4 text-sky-400" />
                  <span className="text-sm font-semibold text-white">
                    Martingale · 1 step
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={plan.martingaleOneStep}
                  onClick={() =>
                    onUpdatePlan({
                      ...plan,
                      martingaleOneStep: !plan.martingaleOneStep,
                    })
                  }
                  className={`w-12 h-7 rounded-full p-1 transition-colors flex items-center ${
                    plan.martingaleOneStep ? "bg-blue-600 justify-end" : "bg-slate-700 justify-start"
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-white shadow-sm" />
                </button>
              </div>
            </div>

            {/* Preview Column */}
            <div className="lg:col-span-5 rounded-2xl bg-[#07112B]/90 border border-blue-400/15 p-5 space-y-4">
              <div className="text-sm font-semibold text-slate-300">Preview</div>

              <div className="space-y-3 divide-y divide-blue-900/40">
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-400">Target</span>
                  <div className="text-right">
                    <div className="text-base font-mono font-bold text-emerald-400">
                      +${metrics.targetProfit.toFixed(2)}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      Goal ${metrics.targetBalance.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3">
                  <span className="text-xs text-slate-400">Base trade</span>
                  <span className="text-base font-mono font-bold text-white">
                    ${metrics.baseTrade.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-3">
                  <span className="text-xs text-slate-400">MTG step 1 stake</span>
                  <span className="text-base font-mono font-bold text-sky-300">
                    {plan.martingaleOneStep ? `$${metrics.mtgStep1.toFixed(2)}` : "Disabled"}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-3">
                  <span className="text-xs text-slate-400">Wins needed</span>
                  <span className="text-base font-mono font-bold text-white">
                    {metrics.winsNeeded} trades
                  </span>
                </div>

                <div className="flex items-center justify-between pt-3">
                  <span className="text-xs text-slate-400">3-loss stop limit</span>
                  <span className="text-base font-mono font-bold text-rose-400">
                    -${metrics.threeLossDrawdown.toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleApplyToSheet}
                disabled={plan.initialCapital <= 0}
                className="w-full min-h-[48px] rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white font-semibold text-sm shadow-[0_8px_24px_rgba(37,99,235,0.35)] transition-all"
              >
                Apply Plan to Sheet
              </button>
            </div>
          </div>
        ) : (
          /* Sheet Tab */
          <div className="space-y-4">
            {/* Session Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-2xl bg-[#07112B]/90 border border-blue-400/15 p-3.5">
                <div className="text-[11px] text-slate-400">Balance</div>
                <div className="text-lg font-mono font-bold text-white mt-0.5">
                  ${currentBalance.toFixed(2)}
                </div>
              </div>
              <div className="rounded-2xl bg-[#07112B]/90 border border-blue-400/15 p-3.5">
                <div className="text-[11px] text-slate-400">Session P&L</div>
                <div
                  className={`text-lg font-mono font-bold mt-0.5 ${
                    netPnl >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {netPnl >= 0 ? "+" : ""}${netPnl.toFixed(2)}
                </div>
              </div>
              <div className="rounded-2xl bg-[#07112B]/90 border border-blue-400/15 p-3.5">
                <div className="text-[11px] text-slate-400">Target Goal</div>
                <div className="text-lg font-mono font-bold text-sky-300 mt-0.5">
                  +${metrics.targetProfit.toFixed(2)}
                </div>
              </div>
              <div className="rounded-2xl bg-[#07112B]/90 border border-blue-400/15 p-3.5">
                <div className="text-[11px] text-slate-400">Progress</div>
                <div className="text-lg font-mono font-bold text-white mt-0.5">
                  {Math.round(targetPctProgress)}%
                </div>
              </div>
            </div>

            {stopLossHit && (
              <div className="rounded-2xl bg-rose-500/15 border border-rose-400/35 px-4 py-3 flex items-center gap-3 text-xs sm:text-sm text-rose-200">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                <span>
                  3 consecutive losses reached. Follow rule #4: pause trading and reset your session.
                </span>
              </div>
            )}

            {/* Sheet Table */}
            <div className="rounded-2xl bg-[#07112B]/80 border border-blue-400/15 overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[560px]">
                <thead>
                  <tr className="border-b border-blue-900/50 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-3">Pair</th>
                    <th className="py-3 px-3">Stake</th>
                    <th className="py-3 px-3">Outcome</th>
                    <th className="py-3 px-3 text-right">P&L</th>
                    <th className="py-3 px-4 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-900/35 text-sm">
                  {sheetRows.map((row) => (
                    <tr key={row.id} className="hover:bg-white/[0.02]">
                      <td className="py-2.5 px-4 font-mono text-xs text-slate-400">
                        {row.tradeNo}
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={row.pair}
                          onChange={(e) => handleUpdatePair(row.id, e.target.value)}
                          className="w-28 bg-[#0B1736] border border-blue-900/50 rounded-lg px-2 py-1 text-xs font-semibold text-white focus:outline-none focus:border-blue-400"
                          aria-label={`Trade ${row.tradeNo} pair`}
                        />
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs text-white">
                        ${row.stake.toFixed(2)}
                        {row.isMtg && (
                          <span className="ml-1.5 text-[10px] text-amber-300 font-sans">
                            (MTG)
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              handleSetRowStatus(
                                row.id,
                                row.status === "WIN" ? "PENDING" : "WIN"
                              )
                            }
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                              row.status === "WIN"
                                ? "bg-emerald-500/25 border-emerald-400 text-emerald-300"
                                : "bg-[#0B1736] border-blue-900/50 text-slate-400 hover:text-emerald-300"
                            }`}
                          >
                            Win
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleSetRowStatus(
                                row.id,
                                row.status === "LOSS" ? "PENDING" : "LOSS"
                              )
                            }
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                              row.status === "LOSS"
                                ? "bg-rose-500/25 border-rose-400 text-rose-300"
                                : "bg-[#0B1736] border-blue-900/50 text-slate-400 hover:text-rose-300"
                            }`}
                          >
                            Loss
                          </button>
                        </div>
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-mono text-xs font-semibold ${
                          row.pnl > 0
                            ? "text-emerald-400"
                            : row.pnl < 0
                            ? "text-rose-400"
                            : "text-slate-500"
                        }`}
                      >
                        {row.pnl > 0 ? "+" : ""}${row.pnl.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs font-semibold text-white">
                        ${row.balanceAfter.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Action Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="min-h-[42px] px-3.5 py-2 rounded-xl bg-blue-600/20 border border-blue-400/35 text-xs font-semibold text-sky-300 hover:bg-blue-600/30 flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Trade
                </button>
                <button
                  type="button"
                  onClick={handleApplyToSheet}
                  className="min-h-[42px] px-3.5 py-2 rounded-xl bg-[#07112B] border border-blue-400/20 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Sheet
                </button>
              </div>

              <button
                type="button"
                onClick={handleExportCsv}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-[#07112B] border border-blue-400/20 text-xs font-semibold text-slate-200 hover:border-blue-400/45 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-sky-400" />
                Export CSV
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
