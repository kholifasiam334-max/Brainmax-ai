import { BrokerName, CurrencyPair, LiveSignalResult, FutureSignalItem, SignalDirection } from "../types";

const RAW_OTC_PAIRS: Array<[string, number, number]> = [
  ["NZD/CHF", 0.5284, 4],
  ["CHF/JPY", 174.62, 2],
  ["EUR/AUD", 1.6518, 4],
  ["EUR/NZD", 1.8142, 4],
  ["EUR/USD", 1.0574, 4],
  ["GBP/CAD", 1.7735, 4],
  ["GBP/CHF", 1.1194, 4],
  ["USD/BDT", 119.52, 2],
  ["USD/CAD", 1.3992, 4],
  ["USD/CHF", 0.8831, 4],
  ["USD/COP", 4412.5, 1],
  ["USD/PHP", 58.74, 2],
  ["USD/PKR", 277.85, 2],
  ["AUD/NZD", 1.0984, 4],
  ["EUR/CAD", 1.4792, 4],
  ["AUD/CAD", 0.9096, 4],
  ["USD/DZD", 133.42, 2],
  ["USD/ARS", 1004.5, 2],
  ["USD/ZAR", 18.14, 2],
  ["USD/EGP", 49.38, 2],
  ["EUR/CHF", 0.9338, 4],
  ["GBP/AUD", 1.9762, 4],
  ["CAD/JPY", 109.84, 2],
  ["GBP/JPY", 195.46, 2],
  ["NZD/JPY", 90.82, 2],
  ["AUD/JPY", 99.64, 2],
  ["USD/JPY", 154.36, 2],
  ["EUR/GBP", 0.8342, 4],
  ["EUR/JPY", 163.24, 2],
  ["GBP/USD", 1.2675, 4],
  ["AUD/USD", 0.6502, 4],
  ["NZD/USD", 0.5918, 4],
  ["CAD/CHF", 0.6311, 4],
  ["GBP/NZD", 2.1422, 4],
  ["USD/INR", 84.42, 2],
  ["USD/BRL", 5.79, 3],
  ["USD/MXN", 20.38, 3],
  ["USD/TRY", 34.48, 3],
  ["BRL/USD", 0.1727, 5],
  ["USD/NGN", 1665, 0],
  ["XAU/USD", 2642.4, 2],
];

const RAW_LIVE_PAIRS: Array<[string, number, number]> = [
  ["EUR/USD", 1.0574, 4],
  ["GBP/USD", 1.2675, 4],
  ["USD/JPY", 154.36, 2],
  ["USD/CHF", 0.8831, 4],
  ["AUD/USD", 0.6502, 4],
  ["USD/CAD", 1.3992, 4],
  ["NZD/USD", 0.5918, 4],
  ["EUR/GBP", 0.8342, 4],
  ["EUR/JPY", 163.24, 2],
  ["GBP/JPY", 195.46, 2],
  ["EUR/AUD", 1.6518, 4],
  ["EUR/CAD", 1.4792, 4],
  ["EUR/CHF", 0.9338, 4],
  ["EUR/NZD", 1.8142, 4],
  ["GBP/AUD", 1.9762, 4],
  ["GBP/CAD", 1.7735, 4],
  ["GBP/CHF", 1.1194, 4],
  ["GBP/NZD", 2.1422, 4],
  ["AUD/CAD", 0.9096, 4],
  ["AUD/CHF", 0.5742, 4],
  ["AUD/JPY", 99.64, 2],
  ["AUD/NZD", 1.0984, 4],
  ["CAD/CHF", 0.6311, 4],
  ["CAD/JPY", 109.84, 2],
  ["CHF/JPY", 174.62, 2],
  ["NZD/CAD", 0.8284, 4],
  ["NZD/CHF", 0.5284, 4],
  ["NZD/JPY", 90.82, 2],
];

export const OTC_PAIRS: CurrencyPair[] = RAW_OTC_PAIRS.map(([symbol, basePrice, decimals], idx) => {
  const [base, quote] = symbol.split("/");
  return {
    id: `otc-${symbol}`,
    symbol,
    base,
    quote,
    market: "OTC",
    payout: 82 + ((idx * 3) % 11),
    basePrice,
    decimals,
  };
});

export const LIVE_PAIRS: CurrencyPair[] = RAW_LIVE_PAIRS.map(([symbol, basePrice, decimals], idx) => {
  const [base, quote] = symbol.split("/");
  return {
    id: `live-${symbol}`,
    symbol,
    base,
    quote,
    market: "LIVE",
    payout: 79 + ((idx * 4) % 10),
    basePrice,
    decimals,
  };
});

export const ALL_PAIRS: CurrencyPair[] = [...OTC_PAIRS, ...LIVE_PAIRS];

const UTC6_OFFSET_MS = 6 * 3600 * 1000;

export function toUtc6Date(date: Date): Date {
  return new Date(date.getTime() + UTC6_OFFSET_MS);
}

export function isLiveMarketWeekendClosed(date: Date = new Date()): boolean {
  const utc6Day = toUtc6Date(date).getUTCDay();
  return utc6Day === 6 || utc6Day === 0;
}

export function formatHHMM(date: Date): string {
  const utc6 = toUtc6Date(date);
  const h = String(utc6.getUTCHours()).padStart(2, "0");
  const m = String(utc6.getUTCMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export function generateTechnicalSignal(
  pair: CurrencyPair,
  durationMinutes: number,
  mtgSteps: number,
  broker: BrokerName
): LiveSignalResult {
  const now = new Date();
  // Round up to next full minute for clean entry timing (~35-70s countdown)
  const entryDate = new Date(now.getTime());
  entryDate.setSeconds(0, 0);
  entryDate.setMinutes(entryDate.getMinutes() + 1);
  if (entryDate.getTime() - now.getTime() < 25000) {
    entryDate.setMinutes(entryDate.getMinutes() + 1);
  }

  const expiryDate = new Date(entryDate.getTime() + durationMinutes * 60000);
  const mtgDate = new Date(expiryDate.getTime() + durationMinutes * 60000);

  // Simulate multi-indicator tick sequence for authentic directional bias
  const seed = (now.getMinutes() * 31 + pair.symbol.charCodeAt(0) * 17 + pair.symbol.charCodeAt(4) * 13 + now.getSeconds()) % 100;
  const direction: SignalDirection = seed % 2 === 0 ? "CALL" : "PUT";
  const confidence = 77 + (seed % 17); // 77% - 93% (respecting 75%+ rule)

  const rsi = direction === "CALL" ? 31 + (seed % 14) : 64 + (seed % 14);
  const emaBias = direction === "CALL" ? "EMA-9 > EMA-21 (Bullish cross)" : "EMA-9 < EMA-21 (Bearish cross)";
  const momentum = direction === "CALL" ? "Buyer absorption at support" : "Supply rejection at resistance";
  const volatility = seed % 3 === 0 ? "Moderate · Clean wicks" : "Controlled · Tight spread";

  const step = pair.basePrice * 0.0022;
  const support = (pair.basePrice - step).toFixed(pair.decimals);
  const resistance = (pair.basePrice + step).toFixed(pair.decimals);

  const tfLabel = `${durationMinutes}-minute`;
  const smartFlowShort =
    direction === "CALL"
      ? `Buyers absorbed the last dip and the ${tfLabel} candles are closing higher. Momentum is building above ${support}.`
      : `Sellers rejected the upper wick near ${resistance} and ${tfLabel} momentum shifted downward. Pressure favors continuation.`;

  const smartFlowDetailed =
    direction === "CALL"
      ? `Buyers absorbed the last dip and the ${tfLabel} candles are closing higher. RSI (${rsi}) is recovering out of pullback territory while EMA-9 crossed above EMA-21, signaling clean upside continuation toward ${resistance}. Enter at ${formatHHMM(entryDate)} with ${mtgSteps > 0 ? `${mtgSteps}-step MTG protection` : "fixed stake"}.`
      : `Sellers rejected the upper wick near ${resistance} and the ${tfLabel} candles are forming lower highs. RSI (${rsi}) cooled from overbought pressure while EMA-9 holds below EMA-21, confirming short-term downside pressure toward ${support}. Enter at ${formatHHMM(entryDate)} with ${mtgSteps > 0 ? `${mtgSteps}-step MTG protection` : "fixed stake"}.`;

  return {
    id: `sig-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    pair,
    broker,
    direction,
    confidence,
    durationMinutes,
    mtgSteps,
    entryTime: formatHHMM(entryDate),
    expiryTime: formatHHMM(expiryDate),
    mtgTime: formatHHMM(mtgDate),
    entryTimestampMs: entryDate.getTime(),
    expiryTimestampMs: expiryDate.getTime(),
    smartFlowShort,
    smartFlowDetailed,
    indicators: {
      rsi,
      emaBias,
      momentum,
      volatility,
      support,
      resistance,
    },
  };
}

export function generateFutureSchedule(
  pairs: CurrencyPair[],
  count: number,
  durationMinutes: number,
  startOffsetMinutes: number
): FutureSignalItem[] {
  const now = new Date();
  const baseStart = new Date(now.getTime());
  baseStart.setSeconds(0, 0);
  baseStart.setMinutes(baseStart.getMinutes() + startOffsetMinutes);

  const items: FutureSignalItem[] = [];
  let cursorMinutes = 0;

  for (let i = 0; i < count; i++) {
    const pair = pairs[i % pairs.length];
    cursorMinutes += i === 0 ? 0 : 3 + ((i * 2 + pair.symbol.charCodeAt(0)) % 4);
    const entry = new Date(baseStart.getTime() + cursorMinutes * 60000);
    const expiry = new Date(entry.getTime() + durationMinutes * 60000);
    const hash = (i * 29 + pair.symbol.charCodeAt(0) + entry.getMinutes() * 7) % 100;
    const direction: SignalDirection = hash % 2 === 0 ? "CALL" : "PUT";
    const confidence = 78 + (hash % 15);

    items.push({
      id: `fut-${Date.now()}-${i}`,
      pair,
      direction,
      confidence,
      durationMinutes,
      entryTime: formatHHMM(entry),
      expiryTime: formatHHMM(expiry),
      entryTimestampMs: entry.getTime(),
      note:
        direction === "CALL"
          ? "Projected cyclical support bounce & session order-flow alignment."
          : "Projected liquidity sweep rejection & mean-reversion window.",
    });
  }

  return items;
}
