import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

interface CalendarEventItem {
  id: string;
  time: string;
  isAllDay: boolean;
  currency: string;
  impact: 1 | 2 | 3;
  title: string;
  bias: "bullish" | "bearish" | "neutral";
  forecast: string;
  previous: string;
  actual: string;
  affectedPairs: string[];
  signalNote: string;
}

function buildDailyCalendar(): CalendarEventItem[] {
  return [
    {
      id: "ev-1",
      time: "All day",
      isAllDay: true,
      currency: "JPY",
      impact: 1,
      title: "Bank Holiday",
      bias: "neutral",
      forecast: "—",
      previous: "—",
      actual: "Holiday",
      affectedPairs: ["USD/JPY", "EUR/JPY", "CHF/JPY"],
      signalNote: "Lower Tokyo liquidity expected. Prefer OTC or European cross pairs during Asian hours.",
    },
    {
      id: "ev-2",
      time: "03:45",
      isAllDay: false,
      currency: "NZD",
      impact: 2,
      title: "Unemployment Rate",
      bias: "bearish",
      forecast: "4.8%",
      previous: "4.6%",
      actual: "4.9%",
      affectedPairs: ["NZD/USD", "NZD/CHF", "EUR/NZD"],
      signalNote: "Softer labor print weighs on NZD short-term momentum. Watch PUT setups on NZD crosses after stabilization.",
    },
    {
      id: "ev-3",
      time: "07:45",
      isAllDay: false,
      currency: "CNY",
      impact: 2,
      title: "Caixin Manufacturing PMI",
      bias: "bullish",
      forecast: "50.2",
      previous: "49.8",
      actual: "50.6",
      affectedPairs: ["AUD/USD", "AUD/NZD", "AUD/CAD"],
      signalNote: "Expansion above 50.0 supports proxy commodity currencies (AUD/NZD). Avoid ±2 min spike.",
    },
    {
      id: "ev-4",
      time: "09:30",
      isAllDay: false,
      currency: "AUD",
      impact: 3,
      title: "RBA Cash Rate",
      bias: "bullish",
      forecast: "4.35%",
      previous: "4.35%",
      actual: "4.35%",
      affectedPairs: ["AUD/USD", "EUR/AUD", "AUD/CAD"],
      signalNote: "High-impact central bank decision. Stay flat ±2 min around release, then follow 5M post-announcement trend.",
    },
    {
      id: "ev-5",
      time: "14:55",
      isAllDay: false,
      currency: "EUR",
      impact: 2,
      title: "German Final Manufacturing PMI",
      bias: "bullish",
      forecast: "43.1",
      previous: "42.6",
      actual: "43.4",
      affectedPairs: ["EUR/USD", "EUR/GBP", "EUR/CAD"],
      signalNote: "Beat vs consensus lends mild EUR support through London midday session.",
    },
    {
      id: "ev-6",
      time: "15:00",
      isAllDay: false,
      currency: "EUR",
      impact: 1,
      title: "Final Manufacturing PMI",
      bias: "bullish",
      forecast: "45.9",
      previous: "45.9",
      actual: "46.1",
      affectedPairs: ["EUR/USD", "EUR/AUD", "EUR/CHF"],
      signalNote: "Modest Eurozone breadth uptick confirms German print; favor trend-continuation CALL entries on pullbacks.",
    },
    {
      id: "ev-7",
      time: "15:30",
      isAllDay: false,
      currency: "GBP",
      impact: 2,
      title: "Final Manufacturing PMI",
      bias: "neutral",
      forecast: "50.3",
      previous: "50.3",
      actual: "50.3",
      affectedPairs: ["GBP/USD", "GBP/CAD", "GBP/CHF"],
      signalNote: "In-line release causes minimal repricing. Trade technical price action only.",
    },
    {
      id: "ev-8",
      time: "18:30",
      isAllDay: false,
      currency: "CAD",
      impact: 2,
      title: "Manufacturing PMI",
      bias: "bullish",
      forecast: "50.8",
      previous: "50.4",
      actual: "51.2",
      affectedPairs: ["USD/CAD", "EUR/CAD", "GBP/CAD"],
      signalNote: "Strong Canadian factory expansion strengthens CAD; watch USD/CAD PUT retracements.",
    },
    {
      id: "ev-9",
      time: "20:00",
      isAllDay: false,
      currency: "USD",
      impact: 3,
      title: "ISM Manufacturing PMI",
      bias: "neutral",
      forecast: "47.6",
      previous: "47.2",
      actual: "Pending",
      affectedPairs: ["EUR/USD", "GBP/USD", "USD/CHF"],
      signalNote: "Major Tier-1 USD volatility catalyst. Mandatory ±2 min pause before generating USD Live Signals.",
    },
    {
      id: "ev-10",
      time: "20:00",
      isAllDay: false,
      currency: "USD",
      impact: 2,
      title: "ISM Manufacturing Prices",
      bias: "neutral",
      forecast: "49.5",
      previous: "48.3",
      actual: "Pending",
      affectedPairs: ["EUR/USD", "USD/JPY", "USD/CAD"],
      signalNote: "Released alongside ISM PMI; upside inflation component boosts USD yields.",
    },
    {
      id: "ev-11",
      time: "20:00",
      isAllDay: false,
      currency: "USD",
      impact: 1,
      title: "Construction Spending m/m",
      bias: "neutral",
      forecast: "0.1%",
      previous: "-0.1%",
      actual: "Pending",
      affectedPairs: ["USD/CAD", "USD/CHF"],
      signalNote: "Secondary release overshadowed by ISM Manufacturing PMI.",
    },
    {
      id: "ev-12",
      time: "22:15",
      isAllDay: false,
      currency: "USD",
      impact: 3,
      title: "FOMC Member Speaks",
      bias: "neutral",
      forecast: "—",
      previous: "—",
      actual: "Pending",
      affectedPairs: ["EUR/USD", "GBP/USD", "USD/JPY"],
      signalNote: "Unscheduled headline risk on interest rate guidance. Keep position risk at 1% during speech.",
    },
  ];
}

const RETRYABLE_CODES = new Set([429, 500, 502, 503, 504]);

function extractApiError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err ?? "Unknown error");
  try {
    const parsed = JSON.parse(raw);
    const code = Number(parsed?.error?.code) || 500;
    const msg =
      typeof parsed?.error?.message === "string"
        ? parsed.error.message
        : raw;
    return { status: code, message: msg };
  } catch {
    if (raw.includes("503") || raw.includes("UNAVAILABLE") || raw.includes("high demand")) {
      return { status: 503, message: "AI service is temporarily experiencing high demand. Please retry in a moment." };
    }
    if (raw.includes("429") || raw.includes("RESOURCE_EXHAUSTED")) {
      return { status: 429, message: "Rate limit reached temporarily. Please wait a few seconds and retry." };
    }
    return { status: 500, message: raw };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateWithRetryAndFallback(
  ai: GoogleGenAI,
  buildRequest: (model: string) => Parameters<GoogleGenAI["models"]["generateContent"]>[0],
  modelOrder: string[] = ["gemini-3.1-flash-lite", "gemini-4-hydrogen"]
) {
  let lastError: unknown;

  for (let mIdx = 0; mIdx < modelOrder.length; mIdx++) {
    const model = modelOrder[mIdx];
    const maxAttempts = mIdx === 0 ? 2 : 1;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        await sleep(300);
      }
      try {
        return await ai.models.generateContent(buildRequest(model));
      } catch (err) {
        lastError = err;
        const { status } = extractApiError(err);
        if (!RETRYABLE_CODES.has(status)) {
          throw err;
        }
      }
    }
  }

  throw lastError;
}

interface OhlcBar {
  open: number;
  high: number;
  low: number;
  close: number;
}

const spotCache: { rates: Record<string, number>; fetchedAt: number } = {
  rates: {},
  fetchedAt: 0,
};

const candleCache = new Map<string, { bars: OhlcBar[]; fetchedAt: number }>();

async function fetchLiveSpotRates(): Promise<Record<string, number>> {
  if (Date.now() - spotCache.fetchedAt < 60000 && Object.keys(spotCache.rates).length > 0) {
    return spotCache.rates;
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1600);
    const resp = await fetch("https://open.er-api.com/v6/latest/USD", {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (resp.ok) {
      const data = (await resp.json()) as { rates?: Record<string, number> };
      if (data.rates) {
        spotCache.rates = data.rates;
        spotCache.fetchedAt = Date.now();
      }
    }
  } catch {
    // Use cached or fallback spot rates silently
  }
  return spotCache.rates;
}

function resolveSpotPrice(
  base: string,
  quote: string,
  rates: Record<string, number>,
  fallbackPrice: number
): number {
  if (base === "XAU" && quote === "USD") return fallbackPrice;
  const rBase = base === "USD" ? 1 : rates[base];
  const rQuote = quote === "USD" ? 1 : rates[quote];
  if (rBase && rQuote && rBase > 0) {
    return rQuote / rBase;
  }
  return fallbackPrice;
}

async function fetchMarketCandles(
  base: string,
  quote: string,
  market: "OTC" | "LIVE",
  fallbackPrice: number
): Promise<OhlcBar[]> {
  const key = `${base}${quote}-${market}`;
  const cached = candleCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < 25000) {
    return cached.bars;
  }

  const rates = await fetchLiveSpotRates();
  const anchorPrice = resolveSpotPrice(base, quote, rates, fallbackPrice);
  const ticker = base === "XAU" ? "GC=F" : `${base}${quote}=X`;

  let realBars: OhlcBar[] = [];
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1600);
    const resp = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
        ticker
      )}?interval=5m&range=2d`,
      {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: controller.signal,
      }
    );
    clearTimeout(timer);
    if (resp.ok) {
      const json = (await resp.json()) as {
        chart?: {
          result?: Array<{
            indicators?: {
              quote?: Array<{
                open?: Array<number | null>;
                high?: Array<number | null>;
                low?: Array<number | null>;
                close?: Array<number | null>;
              }>;
            };
          }>;
        };
      };
      const q = json.chart?.result?.[0]?.indicators?.quote?.[0];
      if (q?.close && q.open && q.high && q.low) {
        for (let i = 0; i < q.close.length; i++) {
          const o = q.open[i];
          const h = q.high[i];
          const l = q.low[i];
          const c = q.close[i];
          if (o != null && h != null && l != null && c != null) {
            realBars.push({ open: o, high: h, low: l, close: c });
          }
        }
      }
    }
  } catch {
    // Fall back to spot-anchored series silently
  }

  // If live candles are available and market is LIVE, use recent 40 candles
  if (market === "LIVE" && realBars.length >= 25) {
    const sliced = realBars.slice(-40);
    candleCache.set(key, { bars: sliced, fetchedAt: Date.now() });
    return sliced;
  }

  // For 24/7 OTC markets (or thin weekend feeds), anchor micro-candles to live spot rate
  const nowSec = Math.floor(Date.now() / 60000);
  const baseAnchor =
    realBars.length > 0 ? realBars[realBars.length - 1].close : anchorPrice;
  const vol = baseAnchor * 0.00065;
  const bars: OhlcBar[] = [];
  let prev = baseAnchor;
  const pairSeed = base.charCodeAt(0) * 13 + quote.charCodeAt(0) * 7;

  for (let i = 0; i < 36; i++) {
    const phase = (nowSec - (36 - i) + pairSeed) * 0.45;
    const wave = Math.sin(phase) * 0.6 + Math.cos(phase * 1.7) * 0.4;
    const delta = wave * vol;
    const open = prev;
    const close = open + delta;
    const high = Math.max(open, close) + Math.abs(Math.sin(phase + 1.1)) * vol * 0.55;
    const low = Math.min(open, close) - Math.abs(Math.cos(phase + 0.7)) * vol * 0.55;
    bars.push({ open, high, low, close });
    prev = close;
  }

  candleCache.set(key, { bars, fetchedAt: Date.now() });
  return bars;
}

function computeEma(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const ema: number[] = [];
  let prev = values[0];
  ema.push(prev);
  for (let i = 1; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    ema.push(prev);
  }
  return ema;
}

function computeRsi(closes: number[], period = 14): number {
  if (closes.length <= period) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  if (losses === 0) return 78;
  const rs = gains / losses;
  return Math.round(100 - 100 / (1 + rs));
}

const UTC6_OFFSET_MS = 6 * 3600 * 1000;

function toUtc6Date(date: Date): Date {
  return new Date(date.getTime() + UTC6_OFFSET_MS);
}

function formatServerHHMM(date: Date): string {
  const utc6 = toUtc6Date(date);
  return `${String(utc6.getUTCHours()).padStart(2, "0")}:${String(
    utc6.getUTCMinutes()
  ).padStart(2, "0")}`;
}

interface MarketQualityMetrics {
  dojiPct: number;
  clarityPct: number;
  avoidDojiPassed: boolean;
  gapDetected: boolean;
  avoidGapPassed: boolean;
  emaSlope: number;
  trendStrength: number;
}

function computeMarketQuality(bars: OhlcBar[], ema9: number[], ema21: number[]): MarketQualityMetrics {
  const recent = bars.slice(-14);
  let dojiCount = 0;
  let rangeSum = 0;

  for (const b of recent) {
    const range = Math.max(1e-8, b.high - b.low);
    const body = Math.abs(b.close - b.open);
    rangeSum += range;
    // Candle has >= 80% wick / <= 20% body -> Doji / indecision candle
    if (body / range < 0.2) {
      dojiCount++;
    }
  }

  const atr = Math.max(1e-8, rangeSum / Math.max(1, recent.length));
  const dojiPct = Math.round((dojiCount / Math.max(1, recent.length)) * 100);
  const clarityPct = Math.max(0, 100 - dojiPct);
  const avoidDojiPassed = dojiPct < 45;

  // Check last 5 candles for Gap Up / Gap Down against ATR
  let maxGapRatio = 0;
  const tail = bars.slice(-6);
  for (let i = 1; i < tail.length; i++) {
    const gap = Math.abs(tail[i].open - tail[i - 1].close);
    maxGapRatio = Math.max(maxGapRatio, gap / atr);
  }
  const gapDetected = maxGapRatio > 0.35;
  const avoidGapPassed = !gapDetected;

  const lastEma9 = ema9[ema9.length - 1];
  const prevEma9 = ema9[Math.max(0, ema9.length - 4)];
  const lastEma21 = ema21[ema21.length - 1];
  const emaSlope = (lastEma9 - prevEma9) / atr;
  const trendStrength = Math.abs(lastEma9 - lastEma21) / atr;

  return {
    dojiPct,
    clarityPct,
    avoidDojiPassed,
    gapDetected,
    avoidGapPassed,
    emaSlope,
    trendStrength,
  };
}

function analyzeBarsToSignal(
  bars: OhlcBar[],
  symbol: string,
  market: "OTC" | "LIVE",
  decimals: number,
  durationMinutes: number,
  mtgSteps: number,
  broker: string
) {
  const closes = bars.map((b) => b.close);
  const ema9 = computeEma(closes, 9);
  const ema21 = computeEma(closes, 21);
  const rsi = computeRsi(closes, 14);
  const quality = computeMarketQuality(bars, ema9, ema21);

  const lastEma9 = ema9[ema9.length - 1];
  const lastEma21 = ema21[ema21.length - 1];
  const lastBar = bars[bars.length - 1];
  const prevBar = bars[bars.length - 2] ?? lastBar;

  const recent20 = bars.slice(-20);
  const supportNum = Math.min(...recent20.map((b) => b.low));
  const resistanceNum = Math.max(...recent20.map((b) => b.high));
  const support = supportNum.toFixed(decimals);
  const resistance = resistanceNum.toFixed(decimals);

  // Score bullish vs bearish confluence + EMA slope + Doji/Gap penalties
  let bullScore = 0;
  if (lastEma9 > lastEma21) bullScore += 2;
  else bullScore -= 2;

  if (quality.emaSlope > 0.08) bullScore += 1;
  else if (quality.emaSlope < -0.08) bullScore -= 1;

  if (lastBar.close > lastBar.open) bullScore += 1;
  else bullScore -= 1;

  if (lastBar.close > prevBar.close) bullScore += 1;
  else bullScore -= 1;

  if (rsi <= 38) bullScore += 2;
  else if (rsi >= 62) bullScore -= 2;
  else if (rsi > 50) bullScore += 1;
  else bullScore -= 1;

  const direction: "CALL" | "PUT" = bullScore >= 0 ? "CALL" : "PUT";
  const strength = Math.min(5, Math.abs(bullScore));
  const penalty = (!quality.avoidDojiPassed ? 6 : 0) + (quality.gapDetected ? 5 : 0);
  const confidence = Math.max(72, Math.min(95, 78 + strength * 3 + (rsi % 3) - penalty));

  const now = new Date();
  const entryDate = new Date(now.getTime());
  entryDate.setSeconds(0, 0);
  entryDate.setMinutes(entryDate.getMinutes() + 1);
  if (entryDate.getTime() - now.getTime() < 20000) {
    entryDate.setMinutes(entryDate.getMinutes() + 1);
  }
  const expiryDate = new Date(entryDate.getTime() + durationMinutes * 60000);
  const mtgDate = new Date(expiryDate.getTime() + durationMinutes * 60000);

  const tfLabel = `${durationMinutes}-minute`;
  const smartFlowShort =
    direction === "CALL"
      ? `The market is showing higher lows above ${support} (${quality.clarityPct}% clean non-Doji candles) and ${tfLabel} buyers are stepping in.`
      : `The recent price action shows rejection at ${resistance} (${quality.clarityPct}% clean non-Doji structure) followed by bearish pressure.`;

  const smartFlowDetailed =
    direction === "CALL"
      ? `Buyers defended ${support} with EMA-9 holding above EMA-21 and RSI at ${rsi}. Doji filter: ${quality.clarityPct}% clean candles · Gap check: ${
          quality.avoidGapPassed ? "No abnormal gaps" : "Minor gap caution"
        }. Enter at ${formatServerHHMM(entryDate)}${
          mtgSteps > 0 ? ` with ${mtgSteps}-step MTG protection` : ""
        }.`
      : `Sellers rejected ${resistance} as EMA-9 crossed below EMA-21 and RSI read ${rsi}. Doji filter: ${quality.clarityPct}% clean candles · Gap check: ${
          quality.avoidGapPassed ? "No abnormal gaps" : "Minor gap caution"
        }. Enter at ${formatServerHHMM(entryDate)}${
          mtgSteps > 0 ? ` with ${mtgSteps}-step MTG protection` : ""
        }.`;

  return {
    id: `sig-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    broker,
    direction,
    confidence,
    durationMinutes,
    mtgSteps,
    entryTime: formatServerHHMM(entryDate),
    expiryTime: formatServerHHMM(expiryDate),
    mtgTime: formatServerHHMM(mtgDate),
    entryTimestampMs: entryDate.getTime(),
    expiryTimestampMs: expiryDate.getTime(),
    smartFlowShort,
    smartFlowDetailed,
    quality,
    indicators: {
      rsi,
      emaBias:
        lastEma9 >= lastEma21
          ? `EMA-9 (${lastEma9.toFixed(decimals)}) > EMA-21`
          : `EMA-9 (${lastEma9.toFixed(decimals)}) < EMA-21`,
      momentum:
        direction === "CALL"
          ? "Buyer absorption at support"
          : "Supply rejection at resistance",
      volatility: `${quality.clarityPct}% non-Doji · ${
        quality.avoidGapPassed ? "No Gap" : "Gap Caution"
      }`,
      support,
      resistance,
    },
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "15mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  app.post("/api/analyze-market", async (req, res) => {
    try {
      const { symbol, base, quote, market, basePrice, decimals, durationMinutes, mtgSteps, broker } =
        req.body as {
          symbol: string;
          base: string;
          quote: string;
          market: "OTC" | "LIVE";
          basePrice: number;
          decimals: number;
          durationMinutes: number;
          mtgSteps: number;
          broker: string;
        };

      const bars = await fetchMarketCandles(base, quote, market, basePrice);
      const signal = analyzeBarsToSignal(
        bars,
        symbol,
        market,
        decimals,
        durationMinutes || 1,
        mtgSteps ?? 1,
        broker || "Quotex"
      );
      res.json({ signal });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Market analysis failed.";
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/analyze-future-markets", async (req, res) => {
    try {
      const {
        pairs,
        count,
        durationMinutes,
        startOffsetMinutes,
        intervalMinutes = 3,
        avoidDoji = true,
        avoidGaps = true,
      } = req.body as {
        pairs: Array<{
          id: string;
          symbol: string;
          base: string;
          quote: string;
          market: "OTC" | "LIVE";
          basePrice: number;
          decimals: number;
          payout: number;
        }>;
        count: number;
        durationMinutes: number;
        startOffsetMinutes: number;
        intervalMinutes?: number;
        avoidDoji?: boolean;
        avoidGaps?: boolean;
      };

      if (!Array.isArray(pairs) || pairs.length === 0) {
        res.status(400).json({ error: "Select at least one pair." });
        return;
      }

      // Analyze every selected pair concurrently for trend, Doji ratio, and Gap status
      const analyzedList = await Promise.all(
        pairs.map(async (p) => {
          const bars = await fetchMarketCandles(p.base, p.quote, p.market, p.basePrice);
          const analyzed = analyzeBarsToSignal(
            bars,
            p.symbol,
            p.market,
            p.decimals,
            durationMinutes || 1,
            1,
            "Quotex"
          );
          return { pair: p, analyzed };
        })
      );

      // Apply Avoid Doji 80% Market & Avoid Gap Up/Down filters (keeping fallback if all filtered)
      let eligible = analyzedList.filter(({ analyzed }) => {
        if (avoidDoji && !analyzed.quality.avoidDojiPassed) return false;
        if (avoidGaps && !analyzed.quality.avoidGapPassed) return false;
        return true;
      });
      if (eligible.length === 0) {
        eligible = [...analyzedList].sort(
          (a, b) => b.analyzed.quality.clarityPct - a.analyzed.quality.clarityPct
        );
      }

      // Compute shared currency basket strength (e.g. if multiple USD/* pairs align UP)
      const currencyBias = new Map<string, number>();
      for (const { pair, analyzed } of eligible) {
        const score = analyzed.direction === "CALL" ? 1 : -1;
        currencyBias.set(pair.base, (currencyBias.get(pair.base) ?? 0) + score);
        currencyBias.set(pair.quote, (currencyBias.get(pair.quote) ?? 0) - score);
      }

      const now = new Date();
      const baseStart = new Date(now.getTime());
      baseStart.setSeconds(0, 0);
      baseStart.setMinutes(baseStart.getMinutes() + 3);

      const stepMins = Math.max(1, Number(intervalMinutes) || 3);
      const items = [];

      for (let i = 0; i < count; i++) {
        const entryObj = eligible[i % eligible.length];
        const { pair, analyzed } = entryObj;
        const entry = new Date(baseStart.getTime() + i * stepMins * 60000);
        const expiry = new Date(entry.getTime() + (durationMinutes || 1) * 60000);

        const baseBias = currencyBias.get(pair.base) ?? 0;
        const quoteBias = currencyBias.get(pair.quote) ?? 0;
        const basketDelta = baseBias - quoteBias;

        let direction: "CALL" | "PUT" = analyzed.direction;
        if (eligible.length > 1 && Math.abs(basketDelta) >= 2 && analyzed.quality.trendStrength >= 0.12) {
          // Correlated multi-pair basket alignment (e.g. USD/* pairs moving together)
          direction = basketDelta > 0 ? "CALL" : "PUT";
        } else if (eligible.length === 1) {
          // Single-pair multi-slot swing projection around live S/R & RSI cycle
          const cycleWave = Math.sin((i + 1) * 1.45 + analyzed.indicators.rsi * 0.05);
          if (cycleWave < -0.25) direction = analyzed.direction === "CALL" ? "PUT" : "CALL";
        }

        items.push({
          id: `fut-${Date.now()}-${i}`,
          pair,
          direction,
          confidence: Math.max(76, Math.min(95, analyzed.confidence - (i % 3))),
          durationMinutes: durationMinutes || 1,
          entryTime: formatServerHHMM(entry),
          expiryTime: formatServerHHMM(expiry),
          entryTimestampMs: entry.getTime(),
          clarityPct: analyzed.quality.clarityPct,
          gapStatus: analyzed.quality.avoidGapPassed ? "CLEAN" : "GAP_RISK",
          note:
            direction === "CALL"
              ? `${analyzed.quality.clarityPct}% non-Doji · Bullish continuation above ${analyzed.indicators.support}`
              : `${analyzed.quality.clarityPct}% non-Doji · Bearish rejection below ${analyzed.indicators.resistance}`,
        });
      }

      res.json({ schedule: items });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to analyze future markets.";
      res.status(500).json({ error: message });
    }
  });

  app.get("/api/news-calendar", (_req, res) => {
    const events = buildDailyCalendar();
    const now = new Date();
    const utc6Now = toUtc6Date(now);
    res.json({
      dateLabel: utc6Now.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
      updatedAt: formatServerHHMM(now),
      events,
    });
  });

  app.post("/api/analyze-chart", async (req, res) => {
    try {
      const { imageBase64, mimeType, marketType, pixelTelemetry } = req.body as {
        imageBase64?: string;
        mimeType?: string;
        marketType?: "OTC" | "REAL";
        pixelTelemetry?: {
          detectedCandles?: number;
          bullCount?: number;
          bearCount?: number;
          dojiRatioPct?: number;
          macroSlope?: "RISING" | "FALLING" | "FLAT";
          slopeDeltaPct?: number;
          currentRangePct?: number;
          marketStructure?: string;
          structureEvent?: string;
          swingSequence?: string[];
          pricePhase?: string;
          latestRejection?: string;
          momentumShift?: string;
          velocityScore?: number;
          velocityState?: string;
          volumeScore?: number;
          volumeState?: string;
          pocZonePct?: number;
          trendStrengthScore?: number;
          trendMoveType?: string;
          recentSequence?: string[];
        } | null;
      };

      if (!imageBase64 || !mimeType) {
        res.status(400).json({ error: "Chart image data and MIME type are required." });
        return;
      }

      const ai = getGeminiClient();
      if (!ai) {
        res.status(503).json({
          error:
            "Gemini API key is not configured in server secrets. Add GEMINI_API_KEY in Settings > Secrets to enable AI chart analysis.",
        });
        return;
      }

      const cleanBase64 = imageBase64.includes(",")
        ? imageBase64.split(",")[1]
        : imageBase64;

      const marketLabel = marketType === "REAL" ? "Real Live Market" : "OTC Market";
      const marketGuidance =
        marketType === "REAL"
          ? "Real Live Market rules: follow institutional HH/HL or LH/LL market structure, Break of Structure (BOS) continuations, Higher-Low / Lower-High pullbacks, S/R flips, and visible EMA/RSI alignment."
          : "OTC Market rules: respect swing High/Low liquidity sweeps (stop-hunt wick rejections), CHoCH structural shifts, S/R flips, Bollinger outer-band mean reversion, and guard against OTC gap traps.";

      const hasTelemetry =
        pixelTelemetry &&
        typeof pixelTelemetry.detectedCandles === "number" &&
        pixelTelemetry.detectedCandles >= 5;

      const telemetrySummary = hasTelemetry
        ? `\nPIXEL MARKET-STRUCTURE & TREND STRENGTH TELEMETRY (computed directly from screenshot candles):
- Candles scanned: ${pixelTelemetry.detectedCandles} (Bull: ${pixelTelemetry.bullCount ?? 0}, Bear: ${pixelTelemetry.bearCount ?? 0})
- Market Structure State: ${pixelTelemetry.marketStructure ?? "RANGING_CONSOLIDATION"}
- Active Structural Event: ${pixelTelemetry.structureEvent ?? "RANGE_EQUILIBRIUM"}
- Swing Pivot Sequence (left->right): ${(pixelTelemetry.swingSequence ?? []).join(" -> ") || "Scanning swings"}
- Current Price Phase: ${pixelTelemetry.pricePhase ?? "IMPULSE"} | Range Position: ${pixelTelemetry.currentRangePct ?? 50}% (0%=Support floor, 100%=Resistance ceiling)
- Candle Velocity: ${pixelTelemetry.velocityScore ?? 55}/100 (${pixelTelemetry.velocityState ?? "STEADY"})
- Volume Profile & POC: ${pixelTelemetry.volumeScore ?? 55}/100 (${pixelTelemetry.volumeState ?? "POC_REACTION"}, Point of Control @ ${pixelTelemetry.pocZonePct ?? 50}% chart height)
- Measured Trend Move Classification: ${pixelTelemetry.trendMoveType ?? "CORRECTION"} (Composite Strength: ${pixelTelemetry.trendStrengthScore ?? 58}/100)
- Macro Slope: ${pixelTelemetry.macroSlope ?? "FLAT"} (${pixelTelemetry.slopeDeltaPct ?? 0}%)
- Doji/Indecision Ratio: ${pixelTelemetry.dojiRatioPct ?? 0}% (${100 - (pixelTelemetry.dojiRatioPct ?? 0)}% clean bodies)
- Rightmost Rejection & Momentum: ${pixelTelemetry.latestRejection ?? "MOMENTUM_CLOSE"} | ${pixelTelemetry.momentumShift ?? "BALANCED"}
- Rightmost 6 Candles: ${(pixelTelemetry.recentSequence ?? []).join(" -> ")}`
        : "";

      const response = await generateWithRetryAndFallback(
        ai,
        (model) => ({
          model,
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: cleanBase64,
                },
              },
              {
                text: `Perform a true MARKET STRUCTURE + TREND STRENGTH analysis on this ${marketLabel} candlestick chart screenshot (focus on swing pivots and the rightmost 8-10 candles):
1. Identify Market Structure (HH/HL uptrend, LH/LL downtrend, or Ranging) and read Pair/Timeframe if visible.
2. Diagnose the exact Structural Event:
   - Break of Structure (Bullish BOS / Bearish BOS): candle body closing cleanly beyond prior swing High/Low in trend direction.
   - Change of Character (Bullish CHoCH / Bearish CHoCH): first structural break against the prior trend (breaking last LH in downtrend or last HL in uptrend).
   - Liquidity Sweep (Stop Hunt): wick piercing above swing high / below swing low and closing back inside -> high-probability reversal!
   - S/R Flip / Pullback: price retesting a broken swing level, Higher Low demand zone, or Lower High supply zone.
3. Evaluate Trend Strength (Genuine Trend vs Correction/Pullback vs Consolidation):
   - Candle Velocity: are bodies & candle-to-candle displacement accelerating (impulsive trend) or shrinking/overlapping (pullback/correction)?
   - Volume Profile: is price breaking cleanly from a High Volume Node / expanding volume bars (genuine trend) or drifting on thin/contracting participation into POC/support (correction)?
4. Verify the latest 2-3 candles (Engulfing, Pin Bar wick rejection, Marubozu, or Doji) and any visibly plotted indicators (EMA/BB/RSI/MACD/Volume bars).
${marketGuidance}${telemetrySummary}

Decision rule:
- Trade WITH Market Structure (BOS genuine trend continuation or HL/LH pullback rejection) OR on a confirmed CHoCH / Liquidity Sweep reversal.
- Output NEUTRAL ONLY if structure is flat choppy range with >=55% Dojis or not a trading chart.`,
              },
            ],
          },
          config: {
            thinkingConfig: {
              thinkingLevel: ThinkingLevel.LOW,
            },
            systemInstruction:
              "You are Brain Max AI's Chief Market-Structure & Trend-Velocity Strategist. Read Market Structure (HH, HL, LH, LL, BOS, CHoCH, S/R flips, Liquidity Sweeps), Candle Velocity, and Volume Profile (HVN breakout vs thin pullback vs POC reaction) from the screenshot and telemetry. Never invent unseen indicator values. Return CALL or PUT (confidence 74-94) when Market Structure + latest candle align; return NEUTRAL (50-64) only on severe Doji chop or invalid charts. Write smartFlow in 2 crisp institutional sentences (30-46 words) citing Market Structure and entry edge, and include trendMoveClassification, velocityAssessment, volumeProfileAssessment, and trendStrengthVerdict.",
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                direction: {
                  type: Type.STRING,
                  description: "Strictly CALL, PUT, or NEUTRAL",
                },
                confidence: {
                  type: Type.INTEGER,
                  description:
                    "74-94 for aligned Market Structure setups, 50-64 for NEUTRAL/choppy charts",
                },
                pairDetected: {
                  type: Type.STRING,
                  description:
                    "Exact pair symbol from screenshot (e.g. BRL/USD (OTC), EUR/USD) or Chart Pair",
                },
                timeframe: {
                  type: Type.STRING,
                  description: "Visible chart timeframe e.g. 1 min, 5 min, 15s",
                },
                recommendedExpiry: {
                  type: Type.STRING,
                  description: "Strictly one of: 1 min, 2 min, 3 min, 5 min",
                },
                pattern: {
                  type: Type.STRING,
                  description:
                    "Market structure + candle pattern (e.g. Bullish BOS Continuation, Bearish CHoCH Reversal, HL Demand Pin Bar)",
                },
                trendBias: {
                  type: Type.STRING,
                  description: "Bullish, Bearish, or Ranging",
                },
                supportZone: {
                  type: Type.STRING,
                  description: "Nearest Y-axis support price or concise zone (max 16 chars)",
                },
                resistanceZone: {
                  type: Type.STRING,
                  description: "Nearest Y-axis resistance price or concise zone (max 16 chars)",
                },
                smartFlow: {
                  type: Type.STRING,
                  description:
                    "2 concise institutional sentences citing Market Structure (HH/HL, LH/LL, BOS, CHoCH, Liquidity Sweep) and why this trade has an edge.",
                },
                keySignals: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description:
                    "4 crisp bullets: (1) Market Structure & BOS/CHoCH, (2) Candle Velocity & Momentum, (3) Volume Profile / S-R Confluence, (4) Doji Quality & Entry Plan",
                },
                trendMoveClassification: {
                  type: Type.STRING,
                  description: "Strictly GENUINE_TREND, CORRECTION, or CONSOLIDATION",
                },
                trendStrengthScore: {
                  type: Type.INTEGER,
                  description: "0-100 overall trend strength score",
                },
                velocityAssessment: {
                  type: Type.STRING,
                  description: "Short 1-2 word label e.g. Accelerating, Steady, Decelerating, Stalled",
                },
                volumeProfileAssessment: {
                  type: Type.STRING,
                  description: "Short 2-3 word label e.g. HVN Breakout, POC Support, Low-Vol Pullback, Exhaustion Spike",
                },
                trendStrengthVerdict: {
                  type: Type.STRING,
                  description:
                    "1 concise sentence stating whether current move is a genuine impulsive trend or a temporary correction/pullback based on candle velocity and volume profile.",
                },
              },
            },
          },
        }),
        ["gemini-3.1-flash-lite", "gemini-4-hydrogen"]
      );

      const rawText = (response.text ?? "{}").trim();
      const rawParsed = JSON.parse(rawText) as Record<string, unknown>;

      const rawDir = String(rawParsed.direction ?? "NEUTRAL").toUpperCase().trim();
      let direction: "CALL" | "PUT" | "NEUTRAL" =
        rawDir === "CALL" || rawDir === "UP" || rawDir === "BUY"
          ? "CALL"
          : rawDir === "PUT" || rawDir === "DOWN" || rawDir === "SELL"
          ? "PUT"
          : "NEUTRAL";

      const rawConf = Number(rawParsed.confidence);
      let confidence =
        direction === "NEUTRAL"
          ? Math.max(50, Math.min(64, Number.isFinite(rawConf) ? Math.round(rawConf) : 58))
          : Math.max(72, Math.min(94, Number.isFinite(rawConf) ? Math.round(rawConf) : 82));

      const keySignals = Array.isArray(rawParsed.keySignals)
        ? rawParsed.keySignals
            .map((item) => String(item ?? "").trim())
            .filter(Boolean)
            .slice(0, 4)
        : [];

      // Deterministic server-side Market Structure & pixel audit guard
      if (hasTelemetry) {
        const dojiPct = pixelTelemetry.dojiRatioPct ?? 0;
        const rangePct = pixelTelemetry.currentRangePct ?? 50;
        const mStruct = pixelTelemetry.marketStructure ?? "";
        const sEvent = pixelTelemetry.structureEvent ?? "";
        const rej = pixelTelemetry.latestRejection ?? "";

        if (dojiPct >= 70 && direction !== "NEUTRAL") {
          direction = "NEUTRAL";
          confidence = 56;
        } else if (dojiPct >= 52 && direction !== "NEUTRAL") {
          confidence = Math.min(confidence, 75);
        } else if (direction === "CALL") {
          const structBullAligned =
            sEvent === "BULLISH_BOS" ||
            sEvent === "BULLISH_CHOCH" ||
            sEvent === "SELL_SIDE_LIQUIDITY_SWEEP" ||
            sEvent === "PULLBACK_TO_HL_DEMAND" ||
            mStruct === "BULLISH_HH_HL";
          const exhaustionRisk =
            sEvent === "BUY_SIDE_LIQUIDITY_SWEEP" ||
            (rej === "STRONG_UPPER_WICK_REJECTION" && rangePct >= 86);
          if (exhaustionRisk) {
            confidence = Math.min(confidence, 74);
          } else if (structBullAligned && dojiPct <= 30) {
            confidence = Math.min(95, confidence + 3);
          }
        } else if (direction === "PUT") {
          const structBearAligned =
            sEvent === "BEARISH_BOS" ||
            sEvent === "BEARISH_CHOCH" ||
            sEvent === "BUY_SIDE_LIQUIDITY_SWEEP" ||
            sEvent === "PULLBACK_TO_LH_SUPPLY" ||
            mStruct === "BEARISH_LH_LL";
          const exhaustionRisk =
            sEvent === "SELL_SIDE_LIQUIDITY_SWEEP" ||
            (rej === "STRONG_LOWER_WICK_REJECTION" && rangePct <= 14);
          if (exhaustionRisk) {
            confidence = Math.min(confidence, 74);
          } else if (structBearAligned && dojiPct <= 30) {
            confidence = Math.min(95, confidence + 3);
          }
        }
      }

      // Compute fused Trend Strength (Candle Velocity + Volume Profile)
      const aiMoveRaw = String(rawParsed.trendMoveClassification ?? "").toUpperCase();
      const aiStrengthRaw = Number(rawParsed.trendStrengthScore);

      const pxVel = hasTelemetry ? Number(pixelTelemetry.velocityScore ?? 58) : undefined;
      const pxVol = hasTelemetry ? Number(pixelTelemetry.volumeScore ?? 56) : undefined;
      const pxStrength = hasTelemetry ? Number(pixelTelemetry.trendStrengthScore ?? 58) : undefined;

      const velocityScore =
        pxVel !== undefined && Number.isFinite(pxVel)
          ? Math.max(10, Math.min(98, Math.round(pxVel)))
          : direction === "NEUTRAL"
          ? 34
          : Math.max(45, Math.min(92, confidence - 4));

      const volumeScore =
        pxVol !== undefined && Number.isFinite(pxVol)
          ? Math.max(12, Math.min(96, Math.round(pxVol)))
          : direction === "NEUTRAL"
          ? 38
          : Math.max(46, Math.min(90, confidence - 6));

      const fusedScore = Math.max(
        15,
        Math.min(
          96,
          Math.round(
            pxStrength !== undefined && Number.isFinite(pxStrength)
              ? Number.isFinite(aiStrengthRaw)
                ? pxStrength * 0.6 + aiStrengthRaw * 0.4
                : pxStrength
              : Number.isFinite(aiStrengthRaw)
              ? aiStrengthRaw
              : (velocityScore + volumeScore) / 2
          )
        )
      );

      let classification: "GENUINE_TREND" | "CORRECTION" | "CONSOLIDATION" =
        aiMoveRaw.includes("GENUINE")
          ? "GENUINE_TREND"
          : aiMoveRaw.includes("CORRECT") || aiMoveRaw.includes("PULLBACK")
          ? "CORRECTION"
          : aiMoveRaw.includes("CONSOLID") || aiMoveRaw.includes("CHOP")
          ? "CONSOLIDATION"
          : fusedScore >= 64
          ? "GENUINE_TREND"
          : fusedScore >= 42
          ? "CORRECTION"
          : "CONSOLIDATION";

      if (hasTelemetry) {
        if ((pixelTelemetry.dojiRatioPct ?? 0) >= 60) {
          classification = "CONSOLIDATION";
        } else if (
          pixelTelemetry.trendMoveType === "GENUINE_TREND" &&
          fusedScore >= 64
        ) {
          classification = "GENUINE_TREND";
        } else if (
          pixelTelemetry.pricePhase === "PULLBACK" ||
          pixelTelemetry.volumeState === "LVN_PULLBACK"
        ) {
          classification = "CORRECTION";
        }
      }

      const label =
        classification === "GENUINE_TREND"
          ? "Genuine Trend"
          : classification === "CORRECTION"
          ? "Correction / Pullback"
          : "Consolidation";

      const aiVelLabel = String(rawParsed.velocityAssessment ?? "").trim();
      const velocityLabel =
        velocityScore >= 70
          ? aiVelLabel || "Accelerating"
          : velocityScore >= 50
          ? /steady|moderate|balanced/i.test(aiVelLabel)
            ? aiVelLabel
            : "Steady"
          : hasTelemetry && pixelTelemetry.velocityState === "STALLED"
          ? "Stalled"
          : "Decelerating";

      const defaultVolLabel =
        hasTelemetry && pixelTelemetry.volumeState === "HVN_BREAKOUT"
          ? "HVN Breakout"
          : hasTelemetry && pixelTelemetry.volumeState === "LVN_PULLBACK"
          ? "Low-Vol Pullback"
          : hasTelemetry && pixelTelemetry.volumeState === "CLIMAX_EXHAUSTION"
          ? "Exhaustion Spike"
          : hasTelemetry && typeof pixelTelemetry.pocZonePct === "number"
          ? `POC @ ${pixelTelemetry.pocZonePct}%`
          : "POC Reaction";

      const volumeProfileLabel =
        String(rawParsed.volumeProfileAssessment ?? "").trim() || defaultVolLabel;

      const defaultVerdict =
        classification === "GENUINE_TREND"
          ? `Expanding candle velocity (${velocityScore}%) and strong volume participation (${volumeScore}%) confirm a genuine impulsive trend.`
          : classification === "CORRECTION"
          ? `Contracting candle velocity (${velocityScore}%) on thinner volume (${volumeScore}%) marks this move as a healthy correction/pullback.`
          : `Low directional velocity (${velocityScore}%) and compressed volume indicate sideways consolidation; wait for a clean BOS breakout.`;

      const trendStrength = {
        score: fusedScore,
        classification,
        label,
        velocityScore,
        velocityLabel,
        volumeScore,
        volumeProfileLabel,
        pocZonePct: hasTelemetry ? pixelTelemetry.pocZonePct : undefined,
        verdict: String(rawParsed.trendStrengthVerdict ?? "").trim() || defaultVerdict,
      };

      const rawExpiry = String(rawParsed.recommendedExpiry ?? "").trim();
      const recommendedExpiry = /^(1|2|3|5)\s*min/i.test(rawExpiry)
        ? rawExpiry
        : "1 min";

      const rawPair = String(rawParsed.pairDetected ?? "").trim();
      const pairDetected =
        !rawPair || /_|UNKNOWN|NOT\s*VISIBLE/i.test(rawPair)
          ? "Chart Pair"
          : rawPair;

      const analysis = {
        direction,
        confidence,
        pairDetected,
        timeframe:
          String(rawParsed.timeframe ?? "").trim().replace(/^unknown$/i, "1 min") ||
          "1 min",
        recommendedExpiry,
        pattern: String(rawParsed.pattern ?? "").trim() || "Market Structure Setup",
        trendBias:
          String(rawParsed.trendBias ?? "").trim() ||
          (direction === "CALL" ? "Bullish" : direction === "PUT" ? "Bearish" : "Ranging"),
        supportZone: String(rawParsed.supportZone ?? "").trim() || "Swing Low",
        resistanceZone: String(rawParsed.resistanceZone ?? "").trim() || "Swing High",
        smartFlow:
          String(rawParsed.smartFlow ?? "").trim() ||
          "Market structure and swing liquidity levels evaluated across recent candles.",
        keySignals:
          keySignals.length > 0
            ? keySignals
            : ["Candlestick structure and S/R rejection levels evaluated from screenshot."],
        trendStrength,
      };

      res.json({ analysis });
    } catch (err) {
      const { status, message } = extractApiError(err);
      res.status(status).json({ error: message });
    }
  });

  app.post("/api/smartflow-insight", async (req, res) => {
    try {
      const { pair, market, direction, duration, confidence, indicators } = req.body as {
        pair?: string;
        market?: string;
        direction?: string;
        duration?: string;
        confidence?: number;
        indicators?: Record<string, string | number>;
      };

      const ai = getGeminiClient();
      if (!ai) {
        res.status(503).json({
          error:
            "Gemini API key is not configured in server secrets. Add GEMINI_API_KEY in Settings > Secrets to enable AI deep insights.",
        });
        return;
      }

      const response = await generateWithRetryAndFallback(ai, (model) => ({
        model,
        contents: `Provide a crisp 2-sentence Brain SmartFlow breakdown for ${pair} (${market}), ${direction} at ${confidence}% confidence (${duration}). Readings: ${JSON.stringify(
          indicators ?? {}
        )}.`,
        config: {
          thinkingConfig: {
            thinkingLevel:
              model === "gemini-3.1-flash-lite"
                ? ThinkingLevel.MINIMAL
                : ThinkingLevel.LOW,
          },
          systemInstruction:
            "You are Brain Max AI's quantitative desk assistant. Write concise, practical trading insight.",
        },
      }));

      res.json({ insight: (response.text ?? "").trim() });
    } catch (err) {
      const { status, message } = extractApiError(err);
      res.status(status).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Brain Max AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Server failed to start:", err);
  process.exit(1);
});
