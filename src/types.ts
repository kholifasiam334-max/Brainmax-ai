export type NavView =
  | "overview"
  | "otc-analyzer"
  | "real-analyzer"
  | "live-signals"
  | "future-signals"
  | "news-signals"
  | "management"
  | "profile";

export type MarketMode = "OTC" | "LIVE";

export type SignalDirection = "CALL" | "PUT";

export type BrokerName = "Quotex" | "Pocket Option" | "IQ Option";

export interface CurrencyPair {
  id: string;
  symbol: string;
  base: string;
  quote: string;
  market: MarketMode;
  payout: number;
  basePrice: number;
  decimals: number;
}

export interface LiveSignalResult {
  id: string;
  pair: CurrencyPair;
  broker: BrokerName;
  direction: SignalDirection;
  confidence: number;
  durationMinutes: number;
  mtgSteps: number;
  entryTime: string;
  expiryTime: string;
  mtgTime: string;
  entryTimestampMs: number;
  expiryTimestampMs: number;
  smartFlowShort: string;
  smartFlowDetailed: string;
  indicators: {
    rsi: number;
    emaBias: string;
    momentum: string;
    volatility: string;
    support: string;
    resistance: string;
  };
  outcome?: "WIN" | "LOSS";
}

export interface FutureSignalItem {
  id: string;
  pair: CurrencyPair;
  direction: SignalDirection;
  confidence: number;
  durationMinutes: number;
  entryTime: string;
  expiryTime: string;
  entryTimestampMs: number;
  note: string;
  clarityPct?: number;
  gapStatus?: "CLEAN" | "GAP_RISK";
  outcome?: "WIN" | "LOSS";
}

export interface TrendStrengthAnalysis {
  score: number;
  classification: "GENUINE_TREND" | "CORRECTION" | "CONSOLIDATION";
  label: string;
  velocityScore: number;
  velocityLabel: string;
  volumeScore: number;
  volumeProfileLabel: string;
  pocZonePct?: number;
  verdict: string;
}

export interface ChartAnalysisResult {
  direction: "CALL" | "PUT" | "NEUTRAL";
  confidence: number;
  pairDetected: string;
  timeframe: string;
  recommendedExpiry: string;
  pattern: string;
  trendBias: string;
  supportZone: string;
  resistanceZone: string;
  smartFlow: string;
  keySignals: string[];
  trendStrength?: TrendStrengthAnalysis;
}

export interface NewsEvent {
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

export interface ManagementPlan {
  initialCapital: number;
  averagePayout: number;
  profitTargetPct: number;
  riskPerTradePct: number;
  martingaleOneStep: boolean;
}

export interface TradeSheetRow {
  id: string;
  tradeNo: number;
  pair: string;
  stake: number;
  isMtg: boolean;
  status: "PENDING" | "WIN" | "LOSS";
  pnl: number;
  balanceAfter: number;
}

export interface TradeHistoryRecord {
  id: string;
  pairSymbol: string;
  market: MarketMode;
  direction: SignalDirection;
  confidence: number;
  entryTime: string;
  outcome: "WIN" | "LOSS";
  createdAt: string;
}

export interface UserProfile {
  name: string;
  userId: string;
  tier: "Free" | "Pro";
  broker: BrokerName;
  baseWins: number;
  baseLosses: number;
}
