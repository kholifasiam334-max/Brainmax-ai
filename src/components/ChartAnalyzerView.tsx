import React, { useEffect, useRef, useState } from "react";
import {
  ImagePlus,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Minus,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Infinity as InfinityIcon,
} from "lucide-react";
import { ChartAnalysisResult } from "../types";
import { ALL_PAIRS, formatHHMM } from "../data/markets";
import { PairFlags } from "./CurrencyFlag";

interface ChartAnalyzerViewProps {
  mode: "OTC" | "REAL";
  onNotify: (msg: string) => void;
}

interface PixelCandleSlice {
  color: "BULL" | "BEAR";
  highNorm: number;
  lowNorm: number;
  bodyTopNorm: number;
  bodyBotNorm: number;
  midPriceNorm: number;
  bodyPct: number;
  upperWickPct: number;
  lowerWickPct: number;
}

interface SwingPoint {
  index: number;
  type: "HIGH" | "LOW";
  priceNorm: number;
  tag?: "HH" | "LH" | "HL" | "LL" | "SH" | "SL";
}

interface ChartPixelTelemetry {
  detectedCandles: number;
  bullCount: number;
  bearCount: number;
  dojiRatioPct: number;
  macroSlope: "RISING" | "FALLING" | "FLAT";
  slopeDeltaPct: number;
  currentRangePct: number;
  marketStructure:
    | "BULLISH_HH_HL"
    | "BEARISH_LH_LL"
    | "BULLISH_REVERSAL_CHOCH"
    | "BEARISH_REVERSAL_CHOCH"
    | "RANGING_CONSOLIDATION";
  structureEvent:
    | "BULLISH_BOS"
    | "BEARISH_BOS"
    | "BULLISH_CHOCH"
    | "BEARISH_CHOCH"
    | "BUY_SIDE_LIQUIDITY_SWEEP"
    | "SELL_SIDE_LIQUIDITY_SWEEP"
    | "PULLBACK_TO_HL_DEMAND"
    | "PULLBACK_TO_LH_SUPPLY"
    | "RANGE_EQUILIBRIUM";
  swingSequence: string[];
  pricePhase: "IMPULSE" | "PULLBACK" | "REVERSAL_TEST" | "CHOP";
  latestRejection:
    | "STRONG_LOWER_WICK_REJECTION"
    | "STRONG_UPPER_WICK_REJECTION"
    | "MOMENTUM_CLOSE"
    | "INDECISION_DOJI";
  momentumShift:
    | "BULLISH_ACCELERATION"
    | "BEARISH_ACCELERATION"
    | "BULLISH_EXHAUSTION"
    | "BEARISH_EXHAUSTION"
    | "BALANCED";
  velocityScore: number;
  velocityState: "ACCELERATING" | "STEADY" | "DECELERATING" | "STALLED";
  volumeScore: number;
  volumeState: "HVN_BREAKOUT" | "POC_REACTION" | "LVN_PULLBACK" | "CLIMAX_EXHAUSTION";
  pocZonePct: number;
  trendStrengthScore: number;
  trendMoveType: "GENUINE_TREND" | "CORRECTION" | "CONSOLIDATION";
  recentSequence: string[];
}

function extractPixelTelemetry(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number
): ChartPixelTelemetry | null {
  try {
    const imgData = ctx.getImageData(0, 0, w, h).data;
    const xStart = Math.floor(w * 0.05);
    const xEnd = Math.floor(w * 0.88);
    const yStart = Math.floor(h * 0.11);
    const yEnd = Math.floor(h * 0.84);
    const plotW = Math.max(1, xEnd - xStart);
    const plotH = Math.max(1, yEnd - yStart);
    const numSlices = 48;
    const sliceW = Math.max(2, Math.floor(plotW / numSlices));

    const toNormY = (y: number) =>
      Math.max(0, Math.min(100, Math.round(((yEnd - y) / plotH) * 100)));

    const slices: PixelCandleSlice[] = [];

    for (let s = 0; s < numSlices; s++) {
      const sx0 = xStart + Math.floor((s * plotW) / numSlices);
      const sx1 = Math.min(xEnd, sx0 + sliceW);
      let bullPx = 0;
      let bearPx = 0;

      const rowBullCounts: number[] = [];
      const rowBearCounts: number[] = [];
      const rowYs: number[] = [];

      for (let y = yStart; y < yEnd; y += 2) {
        let rb = 0;
        let rr = 0;
        for (let x = sx0; x < sx1; x += 2) {
          const i = (y * w + x) * 4;
          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];
          if (g - r > 22 && g > 72 && g >= b - 18) {
            rb++;
            bullPx++;
          } else if (r - g > 22 && r > 85 && r > b + 8) {
            rr++;
            bearPx++;
          }
        }
        rowBullCounts.push(rb);
        rowBearCounts.push(rr);
        rowYs.push(y);
      }

      const dominantPx = Math.max(bullPx, bearPx);
      if (dominantPx < 4) continue;

      const isBull = bullPx >= bearPx;
      const counts = isBull ? rowBullCounts : rowBearCounts;
      const maxCols = Math.max(1, Math.ceil((sx1 - sx0) / 2));

      let minY = yEnd;
      let maxY = yStart;
      let bodyTop = yEnd;
      let bodyBot = yStart;
      let bodyRows = 0;

      for (let idx = 0; idx < counts.length; idx++) {
        const c = counts[idx];
        const y = rowYs[idx];
        if (c > 0) {
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          if (c >= Math.max(2, Math.floor(maxCols * 0.35))) {
            bodyRows++;
            if (y < bodyTop) bodyTop = y;
            if (y > bodyBot) bodyBot = y;
          }
        }
      }

      const totalSpan = Math.max(4, maxY - minY);
      if (bodyRows === 0) {
        bodyTop = Math.round((minY + maxY) / 2);
        bodyBot = bodyTop;
      }
      const bodySpan = Math.max(0, bodyBot - bodyTop);
      const bodyPct = Math.min(100, Math.round((bodySpan / totalSpan) * 100));
      const upperWickPct = Math.max(
        0,
        Math.round(((bodyTop - minY) / totalSpan) * 100)
      );
      const lowerWickPct = Math.max(
        0,
        Math.round(((maxY - bodyBot) / totalSpan) * 100)
      );
      const centerY = (bodyTop + bodyBot) / 2;

      slices.push({
        color: isBull ? "BULL" : "BEAR",
        highNorm: toNormY(minY),
        lowNorm: toNormY(maxY),
        bodyTopNorm: toNormY(bodyTop),
        bodyBotNorm: toNormY(bodyBot),
        midPriceNorm: toNormY(centerY),
        bodyPct,
        upperWickPct,
        lowerWickPct,
      });
    }

    if (slices.length < 5) return null;

    // 1. Detect Swing Highs & Swing Lows (fractal window = 2 candles each side)
    const swingHighs: SwingPoint[] = [];
    const swingLows: SwingPoint[] = [];

    for (let i = 2; i < slices.length - 2; i++) {
      const curH = slices[i].highNorm;
      const curL = slices[i].lowNorm;
      const isSH =
        curH >= slices[i - 1].highNorm &&
        curH >= slices[i - 2].highNorm &&
        curH >= slices[i + 1].highNorm &&
        curH >= slices[i + 2].highNorm;
      const isSL =
        curL <= slices[i - 1].lowNorm &&
        curL <= slices[i - 2].lowNorm &&
        curL <= slices[i + 1].lowNorm &&
        curL <= slices[i + 2].lowNorm;

      if (isSH) {
        const prev = swingHighs[swingHighs.length - 1];
        if (!prev || i - prev.index >= 3) {
          swingHighs.push({ index: i, type: "HIGH", priceNorm: curH });
        } else if (curH > prev.priceNorm) {
          swingHighs[swingHighs.length - 1] = { index: i, type: "HIGH", priceNorm: curH };
        }
      }
      if (isSL) {
        const prev = swingLows[swingLows.length - 1];
        if (!prev || i - prev.index >= 3) {
          swingLows.push({ index: i, type: "LOW", priceNorm: curL });
        } else if (curL < prev.priceNorm) {
          swingLows[swingLows.length - 1] = { index: i, type: "LOW", priceNorm: curL };
        }
      }
    }

    // Tag HH/LH and HL/LL
    for (let i = 0; i < swingHighs.length; i++) {
      if (i === 0) swingHighs[i].tag = "SH";
      else {
        const diff = swingHighs[i].priceNorm - swingHighs[i - 1].priceNorm;
        swingHighs[i].tag = diff >= 2 ? "HH" : diff <= -2 ? "LH" : "SH";
      }
    }
    for (let i = 0; i < swingLows.length; i++) {
      if (i === 0) swingLows[i].tag = "SL";
      else {
        const diff = swingLows[i].priceNorm - swingLows[i - 1].priceNorm;
        swingLows[i].tag = diff >= 2 ? "HL" : diff <= -2 ? "LL" : "SL";
      }
    }

    const mergedSwings = [...swingHighs, ...swingLows]
      .sort((a, b) => a.index - b.index)
      .slice(-6);
    const swingSequence = mergedSwings.map((s) => `${s.tag}(${s.priceNorm}%)`);

    // 2. Determine Market Structure & Structural Events (BOS / CHoCH / Sweep / Pullback)
    const last = slices[slices.length - 1];
    const prevCandle = slices[slices.length - 2];
    const recentSH = swingHighs[swingHighs.length - 1];
    const priorSH = swingHighs[swingHighs.length - 2];
    const recentSL = swingLows[swingLows.length - 1];
    const priorSL = swingLows[swingLows.length - 2];

    const hhCount = swingHighs.filter((s) => s.tag === "HH").length;
    const lhCount = swingHighs.filter((s) => s.tag === "LH").length;
    const hlCount = swingLows.filter((s) => s.tag === "HL").length;
    const llCount = swingLows.filter((s) => s.tag === "LL").length;

    const earlyWindow = slices.slice(
      Math.max(0, slices.length - 14),
      Math.max(1, slices.length - 6)
    );
    const lateWindow = slices.slice(-5);
    const avgEarly =
      earlyWindow.reduce((acc, c) => acc + c.midPriceNorm, 0) /
      Math.max(1, earlyWindow.length);
    const avgLate =
      lateWindow.reduce((acc, c) => acc + c.midPriceNorm, 0) /
      Math.max(1, lateWindow.length);
    const slopeDeltaPct = Math.round(avgLate - avgEarly);
    const macroSlope: ChartPixelTelemetry["macroSlope"] =
      slopeDeltaPct >= 5 ? "RISING" : slopeDeltaPct <= -5 ? "FALLING" : "FLAT";

    let marketStructure: ChartPixelTelemetry["marketStructure"] =
      "RANGING_CONSOLIDATION";
    if (hhCount + hlCount > lhCount + llCount || macroSlope === "RISING") {
      marketStructure = "BULLISH_HH_HL";
    } else if (lhCount + llCount > hhCount + hlCount || macroSlope === "FALLING") {
      marketStructure = "BEARISH_LH_LL";
    }

    let structureEvent: ChartPixelTelemetry["structureEvent"] =
      "RANGE_EQUILIBRIUM";

    const latestClose = last.color === "BULL" ? last.bodyTopNorm : last.bodyBotNorm;
    const prevClose =
      prevCandle.color === "BULL" ? prevCandle.bodyTopNorm : prevCandle.bodyBotNorm;

    // Check Liquidity Sweeps & BOS / CHoCH against recent swing pivots
    if (
      recentSH &&
      (last.highNorm > recentSH.priceNorm || prevCandle.highNorm > recentSH.priceNorm) &&
      latestClose <= recentSH.priceNorm &&
      last.color === "BEAR"
    ) {
      structureEvent = "BUY_SIDE_LIQUIDITY_SWEEP";
    } else if (
      recentSL &&
      (last.lowNorm < recentSL.priceNorm || prevCandle.lowNorm < recentSL.priceNorm) &&
      latestClose >= recentSL.priceNorm &&
      last.color === "BULL"
    ) {
      structureEvent = "SELL_SIDE_LIQUIDITY_SWEEP";
    } else if (
      recentSH &&
      (latestClose > recentSH.priceNorm + 1 || prevClose > recentSH.priceNorm + 1)
    ) {
      if (recentSH.tag === "LH" || marketStructure === "BEARISH_LH_LL") {
        marketStructure = "BULLISH_REVERSAL_CHOCH";
        structureEvent = "BULLISH_CHOCH";
      } else {
        marketStructure = "BULLISH_HH_HL";
        structureEvent = "BULLISH_BOS";
      }
    } else if (
      recentSL &&
      (latestClose < recentSL.priceNorm - 1 || prevClose < recentSL.priceNorm - 1)
    ) {
      if (recentSL.tag === "HL" || marketStructure === "BULLISH_HH_HL") {
        marketStructure = "BEARISH_REVERSAL_CHOCH";
        structureEvent = "BEARISH_CHOCH";
      } else {
        marketStructure = "BEARISH_LH_LL";
        structureEvent = "BEARISH_BOS";
      }
    } else if (
      marketStructure === "BULLISH_HH_HL" &&
      recentSL &&
      Math.abs(last.midPriceNorm - recentSL.priceNorm) <= 10
    ) {
      structureEvent = "PULLBACK_TO_HL_DEMAND";
    } else if (
      marketStructure === "BEARISH_LH_LL" &&
      recentSH &&
      Math.abs(last.midPriceNorm - recentSH.priceNorm) <= 10
    ) {
      structureEvent = "PULLBACK_TO_LH_SUPPLY";
    } else if (priorSH && latestClose > priorSH.priceNorm + 2) {
      structureEvent = "BULLISH_BOS";
    } else if (priorSL && latestClose < priorSL.priceNorm - 2) {
      structureEvent = "BEARISH_BOS";
    }

    // 3. Doji, Price Range Percentile, Rejection Wicks, Momentum & Phase
    const recent10 = slices.slice(-10);
    const dojiCount = recent10.filter((c) => c.bodyPct < 24).length;
    const dojiRatioPct = Math.round((dojiCount / recent10.length) * 100);

    const prices = slices.map((c) => c.midPriceNorm);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const currentRangePct =
      maxP - minP >= 6
        ? Math.round(((last.midPriceNorm - minP) / (maxP - minP)) * 100)
        : 50;

    let latestRejection: ChartPixelTelemetry["latestRejection"] = "MOMENTUM_CLOSE";
    const lastTwo = slices.slice(-2);
    const maxLower = Math.max(...lastTwo.map((c) => c.lowerWickPct));
    const maxUpper = Math.max(...lastTwo.map((c) => c.upperWickPct));
    if (last.bodyPct < 22 && maxLower < 38 && maxUpper < 38) {
      latestRejection = "INDECISION_DOJI";
    } else if (maxLower >= 40 && maxLower > maxUpper + 10) {
      latestRejection = "STRONG_LOWER_WICK_REJECTION";
    } else if (maxUpper >= 40 && maxUpper > maxLower + 10) {
      latestRejection = "STRONG_UPPER_WICK_REJECTION";
    }

    const last4 = slices.slice(-4);
    const bullScore4 = last4.reduce(
      (acc, c) => acc + (c.color === "BULL" ? c.bodyPct : -c.bodyPct),
      0
    );
    let momentumShift: ChartPixelTelemetry["momentumShift"] = "BALANCED";
    if (bullScore4 >= 90) {
      momentumShift =
        currentRangePct >= 88 && maxUpper >= 35
          ? "BULLISH_EXHAUSTION"
          : "BULLISH_ACCELERATION";
    } else if (bullScore4 <= -90) {
      momentumShift =
        currentRangePct <= 12 && maxLower >= 35
          ? "BEARISH_EXHAUSTION"
          : "BEARISH_ACCELERATION";
    }

    let pricePhase: ChartPixelTelemetry["pricePhase"] = "IMPULSE";
    if (dojiRatioPct >= 50) {
      pricePhase = "CHOP";
    } else if (
      structureEvent === "PULLBACK_TO_HL_DEMAND" ||
      structureEvent === "PULLBACK_TO_LH_SUPPLY"
    ) {
      pricePhase = "PULLBACK";
    } else if (
      structureEvent === "BULLISH_CHOCH" ||
      structureEvent === "BEARISH_CHOCH" ||
      structureEvent === "BUY_SIDE_LIQUIDITY_SWEEP" ||
      structureEvent === "SELL_SIDE_LIQUIDITY_SWEEP"
    ) {
      pricePhase = "REVERSAL_TEST";
    }

    // 4. Candle Velocity & Volume Profile (Genuine Trend vs Correction)
    const displacements: number[] = [];
    for (let i = 1; i < slices.length; i++) {
      displacements.push(Math.abs(slices[i].midPriceNorm - slices[i - 1].midPriceNorm));
    }
    const recentDisp = displacements.slice(-4);
    const earlierDisp = displacements.slice(0, Math.max(1, displacements.length - 4));
    const avgRecentDisp =
      recentDisp.reduce((a, b) => a + b, 0) / Math.max(1, recentDisp.length);
    const avgEarlyDisp =
      earlierDisp.reduce((a, b) => a + b, 0) / Math.max(1, earlierDisp.length);

    const recentBodies = slices.slice(-4).map((c) => c.bodyPct);
    const avgRecentBody =
      recentBodies.reduce((a, b) => a + b, 0) / Math.max(1, recentBodies.length);
    const prevBodies = slices.slice(-10, -4).map((c) => c.bodyPct);
    const avgPrevBody =
      prevBodies.length > 0
        ? prevBodies.reduce((a, b) => a + b, 0) / prevBodies.length
        : avgRecentBody;

    const dirAgreementCount = Math.max(
      last4.filter((c) => c.color === "BULL").length,
      last4.filter((c) => c.color === "BEAR").length
    );
    const dispExpansion = avgRecentDisp / Math.max(1.5, avgEarlyDisp);
    const bodyExpansion = avgRecentBody / Math.max(20, avgPrevBody);

    const velocityScore = Math.max(
      12,
      Math.min(
        96,
        Math.round(
          26 +
            Math.min(28, avgRecentDisp * 2.6) +
            Math.min(22, (avgRecentBody / 100) * 28) +
            (dirAgreementCount >= 3 ? 14 : 4) +
            (dispExpansion >= 1.15 ? 8 : dispExpansion <= 0.78 ? -10 : 0)
        )
      )
    );

    const velocityState: ChartPixelTelemetry["velocityState"] =
      dojiRatioPct >= 55 || avgRecentDisp < 2
        ? "STALLED"
        : velocityScore >= 72 && (dispExpansion >= 1.08 || bodyExpansion >= 1.05)
        ? "ACCELERATING"
        : velocityScore >= 52
        ? "STEADY"
        : "DECELERATING";

    // Horizontal Volume Profile (10 price bins weighted by candle body volume)
    const volumeBins = new Array<number>(10).fill(0);
    for (const c of slices) {
      const bin = Math.min(9, Math.max(0, Math.floor(c.midPriceNorm / 10)));
      volumeBins[bin] += Math.max(12, c.bodyPct) + Math.abs(c.highNorm - c.lowNorm) * 0.6;
    }
    let pocBin = 0;
    for (let b = 1; b < 10; b++) {
      if (volumeBins[b] > volumeBins[pocBin]) pocBin = b;
    }
    const pocZonePct = pocBin * 10 + 5;

    // Also scan bottom histogram strip (y: 77%..86%) for visible volume bars
    let earlyVolPx = 0;
    let lateVolPx = 0;
    const volY0 = Math.floor(h * 0.77);
    const volY1 = Math.floor(h * 0.86);
    const xMidSplit = Math.floor(xStart + plotW * 0.65);
    for (let y = volY0; y < volY1; y += 2) {
      for (let x = xStart; x < xEnd; x += 3) {
        const i = (y * w + x) * 4;
        const r = imgData[i];
        const g = imgData[i + 1];
        const b = imgData[i + 2];
        const isColored =
          (g - r > 22 && g > 70) || (r - g > 22 && r > 80) || (b - r > 30 && b > 95);
        if (isColored) {
          if (x < xMidSplit) earlyVolPx++;
          else lateVolPx++;
        }
      }
    }
    const histRatio =
      earlyVolPx > 25 ? (lateVolPx / Math.max(1, earlyVolPx)) * (0.65 / 0.35) : 1;

    const currentBin = Math.min(9, Math.max(0, Math.floor(last.midPriceNorm / 10)));
    const avgBinVol = volumeBins.reduce((a, b) => a + b, 0) / 10;
    const currentBinRatio = volumeBins[currentBin] / Math.max(1, avgBinVol);
    const distFromPoc = Math.abs(last.midPriceNorm - pocZonePct);

    let volumeState: ChartPixelTelemetry["volumeState"] = "POC_REACTION";
    if (
      (momentumShift === "BULLISH_EXHAUSTION" ||
        momentumShift === "BEARISH_EXHAUSTION") &&
      distFromPoc >= 28
    ) {
      volumeState = "CLIMAX_EXHAUSTION";
    } else if (
      distFromPoc >= 15 &&
      (structureEvent === "BULLISH_BOS" ||
        structureEvent === "BEARISH_BOS" ||
        structureEvent === "BULLISH_CHOCH" ||
        structureEvent === "BEARISH_CHOCH") &&
      avgRecentBody >= 52
    ) {
      volumeState = "HVN_BREAKOUT";
    } else if (
      pricePhase === "PULLBACK" ||
      (velocityState === "DECELERATING" && currentBinRatio < 1.15)
    ) {
      volumeState = "LVN_PULLBACK";
    }

    const volumeScore = Math.max(
      18,
      Math.min(
        95,
        Math.round(
          38 +
            (volumeState === "HVN_BREAKOUT"
              ? 28
              : volumeState === "POC_REACTION"
              ? 16
              : volumeState === "LVN_PULLBACK"
              ? 4
              : 10) +
            Math.min(18, (avgRecentBody / 100) * 20) +
            (histRatio >= 1.2 ? 12 : histRatio <= 0.78 ? -10 : 4) -
            (dojiRatioPct >= 50 ? 18 : 0)
        )
      )
    );

    const trendStrengthScore = Math.max(
      15,
      Math.min(
        96,
        Math.round(
          velocityScore * 0.52 +
            volumeScore * 0.33 +
            (structureEvent === "BULLISH_BOS" ||
            structureEvent === "BEARISH_BOS" ||
            structureEvent === "BULLISH_CHOCH" ||
            structureEvent === "BEARISH_CHOCH"
              ? 15
              : pricePhase === "PULLBACK"
              ? 4
              : 7) -
            (dojiRatioPct >= 55 ? 16 : 0)
        )
      )
    );

    const trendMoveType: ChartPixelTelemetry["trendMoveType"] =
      dojiRatioPct >= 55 ||
      (marketStructure === "RANGING_CONSOLIDATION" && velocityScore < 52)
        ? "CONSOLIDATION"
        : pricePhase === "PULLBACK" ||
          volumeState === "LVN_PULLBACK" ||
          velocityState === "DECELERATING" ||
          trendStrengthScore < 62
        ? "CORRECTION"
        : "GENUINE_TREND";

    const recentSequence = slices.slice(-6).map((c) => {
      const wickNote =
        c.lowerWickPct >= 38
          ? `,lowerWick:${c.lowerWickPct}%`
          : c.upperWickPct >= 38
          ? `,upperWick:${c.upperWickPct}%`
          : "";
      return `${c.color}(body:${c.bodyPct}%${wickNote})`;
    });

    return {
      detectedCandles: slices.length,
      bullCount: slices.filter((c) => c.color === "BULL").length,
      bearCount: slices.filter((c) => c.color === "BEAR").length,
      dojiRatioPct,
      macroSlope,
      slopeDeltaPct,
      currentRangePct,
      marketStructure,
      structureEvent,
      swingSequence,
      pricePhase,
      latestRejection,
      momentumShift,
      velocityScore,
      velocityState,
      volumeScore,
      volumeState,
      pocZonePct,
      trendStrengthScore,
      trendMoveType,
      recentSequence,
    };
  } catch {
    return null;
  }
}

function prepareChartPayload(
  dataUrl: string,
  rawMime: string,
  maxDim = 1280
): Promise<{
  imageBase64: string;
  mimeType: string;
  pixelTelemetry: ChartPixelTelemetry | null;
}> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve({
          imageBase64: dataUrl,
          mimeType: rawMime,
          pixelTelemetry: null,
        });
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      const pixelTelemetry = extractPixelTelemetry(ctx, w, h);
      const keepOriginal =
        rawMime === "image/jpeg" && dataUrl.length < 260000 && scale === 1;
      resolve({
        imageBase64: keepOriginal ? dataUrl : canvas.toDataURL("image/jpeg", 0.86),
        mimeType: keepOriginal ? rawMime : "image/jpeg",
        pixelTelemetry,
      });
    };
    img.onerror = () =>
      resolve({ imageBase64: dataUrl, mimeType: rawMime, pixelTelemetry: null });
    img.src = dataUrl;
  });
}

function generateSampleChartDataUrl(mode: "OTC" | "REAL"): string {
  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 420;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.fillStyle = "#070E20";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(59, 130, 246, 0.12)";
  ctx.lineWidth = 1;
  for (let x = 50; x < 660; x += 65) {
    ctx.beginPath();
    ctx.moveTo(x, 35);
    ctx.lineTo(x, 330);
    ctx.stroke();
  }
  for (let y = 50; y <= 310; y += 50) {
    ctx.beginPath();
    ctx.moveTo(35, y);
    ctx.lineTo(660, y);
    ctx.stroke();
  }

  ctx.fillStyle = "#E2E8F0";
  ctx.font = "bold 15px sans-serif";
  ctx.fillText(
    mode === "OTC" ? "CAD/CHF (OTC) · M1 · Quotex" : "EUR/USD · M1 · Real Feed",
    40,
    26
  );

  const candles =
    mode === "OTC"
      ? [
          { o: 245, c: 235, h: 228, l: 255 },
          { o: 235, c: 242, h: 230, l: 250 },
          { o: 242, c: 228, h: 220, l: 248 },
          { o: 228, c: 215, h: 208, l: 234 },
          { o: 215, c: 226, h: 210, l: 232 },
          { o: 226, c: 240, h: 220, l: 248 },
          { o: 240, c: 255, h: 236, l: 264 },
          { o: 255, c: 238, h: 232, l: 262 },
          { o: 238, c: 216, h: 210, l: 244 },
          { o: 216, c: 194, h: 188, l: 222 },
          { o: 194, c: 178, h: 170, l: 202 },
          { o: 178, c: 186, h: 172, l: 194 },
          { o: 186, c: 162, h: 154, l: 190 },
          { o: 162, c: 142, h: 134, l: 168 },
          { o: 142, c: 126, h: 118, l: 148 },
        ]
      : [
          { o: 135, c: 146, h: 128, l: 154 },
          { o: 146, c: 158, h: 140, l: 166 },
          { o: 158, c: 148, h: 142, l: 164 },
          { o: 148, c: 168, h: 144, l: 176 },
          { o: 168, c: 186, h: 162, l: 194 },
          { o: 186, c: 176, h: 170, l: 192 },
          { o: 176, c: 198, h: 172, l: 206 },
          { o: 198, c: 218, h: 192, l: 226 },
          { o: 218, c: 210, h: 202, l: 224 },
          { o: 210, c: 234, h: 206, l: 242 },
          { o: 234, c: 252, h: 228, l: 260 },
          { o: 252, c: 244, h: 238, l: 258 },
          { o: 244, c: 268, h: 240, l: 276 },
          { o: 268, c: 288, h: 262, l: 296 },
          { o: 288, c: 304, h: 282, l: 312 },
        ];

  const startX = 68;
  const stepX = 39;

  candles.forEach((cd, i) => {
    const x = startX + i * stepX;
    const bullish = cd.c < cd.o;
    const color = bullish ? "#22C55E" : "#EF4444";

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, cd.h);
    ctx.lineTo(x, cd.l);
    ctx.stroke();

    const top = Math.min(cd.o, cd.c);
    const height = Math.max(6, Math.abs(cd.o - cd.c));
    ctx.fillStyle = color;
    ctx.fillRect(x - 9, top, 18, height);
  });

  ctx.strokeStyle = "#38BDF8";
  ctx.lineWidth = 2;
  ctx.beginPath();
  candles.forEach((cd, i) => {
    const x = startX + i * stepX;
    const y = (cd.o + cd.c) / 2 + (mode === "OTC" ? 16 : -14);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.fillStyle = "#94A3B8";
  ctx.font = "11px monospace";
  const basePrice = mode === "OTC" ? 0.634 : 1.059;
  for (let row = 0; row <= 4; row++) {
    const y = 55 + row * 60;
    ctx.fillText((basePrice - row * 0.0011).toFixed(4), 668, y);
  }

  return canvas.toDataURL("image/jpeg", 0.82);
}

interface TimingMeta {
  entryTime: string;
  expiryTime: string;
  mtgTime: string;
  entryMs: number;
  expiryMs: number;
}

function buildTimingMeta(): TimingMeta {
  const now = new Date();
  const entry = new Date(now.getTime());
  entry.setSeconds(0, 0);
  entry.setMinutes(entry.getMinutes() + 1);
  if (entry.getTime() - now.getTime() < 20000) {
    entry.setMinutes(entry.getMinutes() + 1);
  }
  const expiry = new Date(entry.getTime() + 60000);
  const mtg = new Date(expiry.getTime() + 60000);
  return {
    entryTime: formatHHMM(entry),
    expiryTime: formatHHMM(expiry),
    mtgTime: formatHHMM(mtg),
    entryMs: entry.getTime(),
    expiryMs: expiry.getTime(),
  };
}

export const ChartAnalyzerView: React.FC<ChartAnalyzerViewProps> = ({
  mode,
  onNotify,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("image/jpeg");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<ChartAnalysisResult | null>(null);
  const [timing, setTiming] = useState<TimingMeta | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [smartFlowExpanded, setSmartFlowExpanded] = useState(false);
  const [copiedSignal, setCopiedSignal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (!result) return;
    const timer = setInterval(() => setNowMs(Date.now()), 250);
    return () => clearInterval(timer);
  }, [result]);

  const runAnalysis = async (rawUrl: string, rawMime: string) => {
    setImageDataUrl(rawUrl);
    setAnalyzing(true);
    setResult(null);
    setError(null);
    setSmartFlowExpanded(false);

    try {
      const prepared = await prepareChartPayload(rawUrl, rawMime, 1280);
      setMimeType(prepared.mimeType);

      const resp = await fetch("/api/analyze-chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: prepared.imageBase64,
          mimeType: prepared.mimeType,
          marketType: mode,
          pixelTelemetry: prepared.pixelTelemetry,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || "Failed to analyze chart screenshot.");
      }
      setTiming(buildTimingMeta());
      setNowMs(Date.now());
      setResult(data.analysis as ChartAnalysisResult);
      onNotify(`${mode} chart signal ready`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unexpected error analyzing chart."
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid PNG, JPG, or WebP chart screenshot.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        void runAnalysis(reader.result, file.type);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleTrySample = () => {
    const sampleUrl = generateSampleChartDataUrl(mode);
    if (!sampleUrl) return;
    void runAnalysis(sampleUrl, "image/jpeg");
  };

  const handleReset = () => {
    setImageDataUrl(null);
    setResult(null);
    setTiming(null);
    setError(null);
    setAnalyzing(false);
  };

  const handleCopySignal = async () => {
    if (!result || !timing) return;
    const text = [
      `Brain Max AI (${mode} Analyzer)`,
      `Pair: ${result.pairDetected}`,
      `Direction: ${result.direction} (${result.confidence}%)`,
      `Entry: ${timing.entryTime} | Expiry: ${timing.expiryTime} (UTC+6)`,
      `SmartFlow: ${result.smartFlow}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSignal(true);
      onNotify("Signal copied");
      setTimeout(() => setCopiedSignal(false), 1800);
    } catch {
      onNotify("Copy failed");
    }
  };

  const matchedPair = result
    ? ALL_PAIRS.find((p) =>
        result.pairDetected.toUpperCase().includes(p.symbol)
      )
    : undefined;
  const pairParts = matchedPair
    ? [matchedPair.base, matchedPair.quote]
    : result?.pairDetected.includes("/")
    ? result.pairDetected
        .replace(/[^A-Z/]/gi, "")
        .split("/")
        .slice(0, 2)
    : ["EUR", "USD"];

  const title = mode === "OTC" ? "OTC chart" : "Real chart";

  if (!imageDataUrl) {
    return (
      <section className="max-w-2xl mx-auto space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />

        <div className="rounded-3xl bg-[#0B1736]/85 border border-blue-400/15 p-5 shadow-[0_16px_40px_rgba(2,6,23,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] space-y-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
            className={`w-full min-h-[380px] sm:min-h-[420px] rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-6 text-center cursor-pointer ${
              dragOver
                ? "border-sky-400 bg-blue-600/15"
                : "border-blue-400/25 bg-[#07112B]/65 hover:border-blue-400/50 hover:bg-[#091636]"
            }`}
          >
            <div className="w-20 h-20 rounded-full bg-[#0D1E45] border border-blue-400/30 flex items-center justify-center mb-5 shadow-[0_0_24px_rgba(37,99,235,0.28)]">
              <ImagePlus className="w-8 h-8 text-sky-400" />
            </div>
            <h2 className="text-xl font-bold text-white">{title}</h2>
            <p className="text-sm text-slate-400 mt-1.5">
              Tap to upload a screenshot
            </p>
          </button>

          <button
            type="button"
            onClick={handleTrySample}
            className="w-full min-h-[50px] rounded-2xl bg-[#07112B] border border-blue-400/20 hover:border-blue-400/45 text-sm font-semibold text-slate-200 hover:text-white flex items-center justify-center gap-2 active:scale-[0.99] transition-all"
          >
            <Sparkles className="w-4 h-4 text-sky-400" />
            Try sample chart
          </button>
        </div>
      </section>
    );
  }

  // Analyzing View (fast ECG pulse)
  if (analyzing) {
    return (
      <section className="max-w-xl mx-auto rounded-3xl bg-[#0B1736]/85 border border-blue-400/15 p-6 shadow-[0_16px_40px_rgba(2,6,23,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] space-y-6">
        <div className="relative rounded-2xl overflow-hidden border border-blue-400/20 bg-[#050C1F]">
          <img
            src={imageDataUrl}
            alt="Scanning chart"
            referrerPolicy="no-referrer"
            className="w-full max-h-56 object-contain opacity-65"
          />
          <div className="absolute inset-0 bg-[#030817]/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 p-4">
            <div className="w-10 h-10 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
            <div className="text-sm font-semibold text-white">
              Scanning {mode} chart...
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Error View
  if (error) {
    return (
      <section className="max-w-xl mx-auto rounded-3xl bg-[#0B1736]/85 border border-blue-400/15 p-6 shadow-[0_16px_40px_rgba(2,6,23,0.5)] space-y-4">
        <div className="rounded-2xl bg-rose-500/10 border border-rose-400/30 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-sm text-rose-200 leading-relaxed">{error}</div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void runAnalysis(imageDataUrl, mimeType)}
            className="flex-1 min-h-[46px] rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 text-sm font-semibold text-white"
          >
            Retry analysis
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="min-h-[46px] px-5 rounded-2xl bg-[#07112B] border border-blue-400/20 text-sm font-semibold text-slate-300"
          >
            New chart
          </button>
        </div>
      </section>
    );
  }

  // Signal Result Card (matching screenshots 1 & 2)
  const isCall = result?.direction === "CALL";
  const isPut = result?.direction === "PUT";
  const accentHex = isCall ? "#84CC16" : isPut ? "#F43F5E" : "#38BDF8";

  const renderGaugeStatus = () => {
    if (!timing) return "ready";
    const toEntry = timing.entryMs - nowMs;
    const toExpiry = timing.expiryMs - nowMs;
    if (toEntry > 0) {
      const s = Math.ceil(toEntry / 1000);
      return `entry in ${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
    }
    if (toExpiry > 0) {
      const s = Math.ceil(toExpiry / 1000);
      return `active ${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
    }
    return "closed";
  };

  return (
    <section className="max-w-xl mx-auto rounded-3xl bg-[#0B1736]/90 border border-blue-400/15 p-5 sm:p-6 shadow-[0_16px_40px_rgba(2,6,23,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] space-y-5">
      {result && timing && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <PairFlags
                base={pairParts[0] || "EUR"}
                quote={pairParts[1] || "USD"}
                size={32}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white truncate">
                    {result.pairDetected}
                  </h2>
                  <span className="text-[10px] font-mono font-semibold text-sky-300 bg-blue-500/20 border border-blue-400/30 px-2 py-0.5 rounded-md">
                    {mode}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {mode === "OTC" ? "OTC market" : "Real market"} · {result.confidence}% confidence
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopySignal}
              aria-label="Copy signal"
              className="w-11 h-11 rounded-2xl bg-[#07112B] border border-blue-400/20 flex items-center justify-center text-slate-300 hover:text-white hover:border-blue-400/45 transition-all shrink-0"
            >
              {copiedSignal ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Radial Gauge Ring matching attached screenshots */}
          <div className="relative w-64 h-64 mx-auto flex items-center justify-center">
            <svg className="w-64 h-64" viewBox="0 0 240 240" aria-hidden="true">
              {Array.from({ length: 44 }).map((_, idx) => {
                const angle = (idx / 44) * 360 - 90;
                const rad = (angle * Math.PI) / 180;
                const x1 = 120 + 96 * Math.cos(rad);
                const y1 = 120 + 96 * Math.sin(rad);
                const x2 = 120 + 109 * Math.cos(rad);
                const y2 = 120 + 109 * Math.sin(rad);
                return (
                  <line
                    key={idx}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={accentHex}
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    opacity={0.75}
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
                cx="120"
                cy="34"
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
                    : isPut
                    ? "bg-[#F43F5E] text-slate-950 shadow-rose-500/35"
                    : "bg-sky-400 text-slate-950"
                }`}
              >
                {isCall ? (
                  <ArrowUp className="w-5 h-5" strokeWidth={2.75} />
                ) : isPut ? (
                  <ArrowDown className="w-5 h-5" strokeWidth={2.75} />
                ) : (
                  <Minus className="w-5 h-5" strokeWidth={2.75} />
                )}
              </div>

              <div
                className={`text-4xl font-extrabold tracking-wide ${
                  isCall
                    ? "text-[#84CC16]"
                    : isPut
                    ? "text-[#F43F5E]"
                    : "text-sky-400"
                }`}
              >
                {result.direction}
              </div>

              <div className="mt-2 px-3.5 py-1 rounded-full bg-[#0D1833] border border-blue-400/20 text-xs font-mono text-slate-300">
                {renderGaugeStatus()}
              </div>
            </div>
          </div>

          {/* Horizontal Timeline Card matching screenshots */}
          <div className="rounded-2xl bg-[#07112B]/90 border border-blue-400/15 p-4 space-y-2.5">
            <div className="grid grid-cols-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <div className="text-left">Entry</div>
              <div className="text-center">Expiry</div>
              <div className="text-right">MTG · 2x</div>
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
                  {result.recommendedExpiry || "1 min"}
                </span>
              </div>
              <span
                className="w-3.5 h-3.5 rounded-full shrink-0 z-10"
                style={{ backgroundColor: accentHex }}
              />
              <div className="flex-1 border-t-2 border-dashed border-slate-600 mx-1" />
              <span className="w-3.5 h-3.5 rounded-full border-2 border-dashed border-slate-500 shrink-0 z-10" />
            </div>

            <div className="grid grid-cols-3 text-base font-mono font-bold text-white">
              <div className="text-left">{timing.entryTime}</div>
              <div className="text-center">{timing.expiryTime}</div>
              <div className="text-right">{timing.mtgTime}</div>
            </div>
          </div>

          {/* Brain SmartFlow Card */}
          <div className="rounded-2xl bg-[#07112B]/90 border border-blue-400/15 p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <InfinityIcon className="w-4 h-4 text-sky-400" />
              <span>Brain SmartFlow</span>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {result.smartFlow}
            </p>

            {smartFlowExpanded && (
              <div className="space-y-3 pt-2.5 border-t border-blue-900/40">
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-[#0B1736]">
                    <div className="text-[10px] text-slate-400">Pattern</div>
                    <div className="font-semibold text-white mt-0.5 truncate">
                      {result.pattern}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#0B1736]">
                    <div className="text-[10px] text-slate-400">Support</div>
                    <div className="font-mono font-semibold text-emerald-400 mt-0.5 truncate">
                      {result.supportZone}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#0B1736]">
                    <div className="text-[10px] text-slate-400">Resistance</div>
                    <div className="font-mono font-semibold text-rose-400 mt-0.5 truncate">
                      {result.resistanceZone}
                    </div>
                  </div>
                </div>

                {result.keySignals?.length > 0 && (
                  <ul className="space-y-1 text-xs text-slate-300 list-disc list-inside">
                    {result.keySignals.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => setSmartFlowExpanded(!smartFlowExpanded)}
              className="text-xs font-semibold text-sky-400 hover:text-sky-300 inline-flex items-center gap-1"
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

          <button
            type="button"
            onClick={handleReset}
            className="w-full min-h-[50px] rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-[0_8px_28px_rgba(37,99,235,0.45)] active:scale-[0.99] transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            New signal
          </button>
        </>
      )}
    </section>
  );
};
