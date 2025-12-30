import { BotState, StrategyType } from "../types";

// --- PURE MATH KERNELS (QUANTITATIVE ANALYSIS) ---
// No external AI APIs. Just raw math and probability logic.

const sanitize = (val: number) => {
    if (isNaN(val) || !isFinite(val)) return 0;
    return val;
};

// Exponential Moving Average
const calculateEMAArray = (prices: number[], period: number): number[] => {
  if (!prices || prices.length === 0) return [];
  const k = 2 / (period + 1);
  const emaArray: number[] = new Array(prices.length).fill(0);
  let ema = prices[0]; 
  emaArray[0] = ema;
  for (let i = 1; i < prices.length; i++) {
    ema = (prices[i] * k) + (ema * (1 - k));
    emaArray[i] = sanitize(ema);
  }
  return emaArray;
};

// Relative Strength Index (Momentum)
const calculateRSIArray = (prices: number[], period: number = 14): number[] => {
  const rsis: number[] = new Array(prices.length).fill(50);
  if (prices.length <= period) return rsis;
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    const currentGain = diff > 0 ? diff : 0;
    const currentLoss = diff < 0 ? Math.abs(diff) : 0;
    avgGain = ((avgGain * (period - 1)) + currentGain) / period;
    avgLoss = ((avgLoss * (period - 1)) + currentLoss) / period;
    if (avgLoss === 0) rsis[i] = 100;
    else {
        const rs = avgGain / avgLoss;
        rsis[i] = sanitize(100 - (100 / (1 + rs)));
    }
  }
  return rsis;
};

// Bollinger Bands (Volatility)
const calculateBollingerArray = (prices: number[], period: number = 20, multiplier: number = 2) => {
    const upper: number[] = [];
    const lower: number[] = [];
    const middle: number[] = [];
    const bandwidth: number[] = [];
    const percentB: number[] = [];

    for (let i = 0; i < prices.length; i++) {
        if (i < period - 1) {
            upper.push(prices[i]); lower.push(prices[i]); middle.push(prices[i]); bandwidth.push(0); percentB.push(0.5);
            continue;
        }
        const slice = prices.slice(i - period + 1, i + 1);
        const sma = slice.reduce((a, b) => a + b, 0) / period;
        const variance = slice.reduce((a, b) => a + Math.pow(b - sma, 2), 0) / period;
        const stdDev = Math.sqrt(variance);
        
        const u = sma + (stdDev * multiplier);
        const l = sma - (stdDev * multiplier);
        
        upper.push(u);
        lower.push(l);
        middle.push(sma);
        bandwidth.push((u - l) / sma);
        percentB.push((u === l) ? 0.5 : (prices[i] - l) / (u - l));
    }
    return { upper, lower, middle, bandwidth, percentB };
};

// MACD (Trend Following)
const calculateMACD = (prices: number[]) => {
    const ema12 = calculateEMAArray(prices, 12);
    const ema26 = calculateEMAArray(prices, 26);
    const macdLine = ema12.map((v, i) => v - ema26[i]);
    const signalLine = calculateEMAArray(macdLine, 9);
    const histogram = macdLine.map((v, i) => v - signalLine[i]);
    return { macd: macdLine, signal: signalLine, histogram };
};

// Average True Range (Volatility Sizing)
const calculateATR = (prices: number[], period: number = 14): number[] => {
    if (prices.length < 2) return new Array(prices.length).fill(0);
    const tr: number[] = [0];
    for (let i = 1; i < prices.length; i++) {
        tr.push(Math.abs(prices[i] - prices[i-1]));
    }
    return calculateEMAArray(tr, period);
};

// --- AUTONOMOUS BRAIN LOGIC ---

export interface BrainResult {
    action: 'BUY' | 'SELL' | 'HOLD';
    reason: string;
    confidence: number;
    score: number;
    regime: string;
    metrics: {
        stopLossPrice: number;
        takeProfitPrice: number;
        atr: number;
        trendStrength: number;
    };
}

// STRATEGY PROFILES (DNA)
const STRATEGY_DNA = {
    [StrategyType.SCALP_1M]: {
        name: 'SCALP',
        stopAtrMult: 1.0,  // Tight Stop
        tpAtrMult: 1.5,    // Quick Target
        entryThreshold: 40, // Aggressive Entry
        exitThreshold: -25, // Quick Exit
        weights: { rsi: 2.0, bb: 1.5, macd: 0.5 }
    },
    [StrategyType.SWING_15M]: {
        name: 'SWING',
        stopAtrMult: 2.0,  // Standard Stop
        tpAtrMult: 3.0,    // Standard Target
        entryThreshold: 55, // Confirmed Entry
        exitThreshold: -40, // Standard Exit
        weights: { rsi: 1.0, bb: 2.0, macd: 1.0 }
    },
    [StrategyType.TREND_4H]: {
        name: 'TREND',
        stopAtrMult: 4.0,  // Wide Stop (Survive noise)
        tpAtrMult: 0,      // NO TARGET (Ride the wave)
        entryThreshold: 65, // Strong Confirmation needed
        exitThreshold: -50, // Trend Reversal needed
        weights: { rsi: 0.5, bb: 0.5, macd: 3.0 }
    },
    [StrategyType.ARBITRAGE]: {
        name: 'ARBITRAGE', // Mean Reversion in this context
        stopAtrMult: 1.5,
        tpAtrMult: 1.0,    // Very Quick
        entryThreshold: 35,
        exitThreshold: -20,
        weights: { rsi: 0.5, bb: 3.5, macd: 0.0 }
    },
    [StrategyType.HEDGE]: {
        name: 'HEDGE',
        stopAtrMult: 0.8,  // Ultra Tight
        tpAtrMult: 1.0,
        entryThreshold: 80, // Only enter extreme conditions
        exitThreshold: -10,
        weights: { rsi: 2.0, bb: 2.0, macd: 0 }
    }
};

export const executeMathCycle = (
    bot: BotState,
    marketHistory: number[] 
): BrainResult => {
    const prices = marketHistory.length > 0 ? marketHistory : [bot.currentPrice || 0];
    const currentPrice = prices[prices.length - 1];
    
    // 0. LOAD STRATEGY DNA
    const strategyName = bot.activeStrategy || StrategyType.SCALP_1M;
    const dna = STRATEGY_DNA[strategyName] || STRATEGY_DNA[StrategyType.SCALP_1M];

    // 1. EXECUTE KERNELS
    const rsiArr = calculateRSIArray(prices);
    const bb = calculateBollingerArray(prices);
    const macd = calculateMACD(prices);
    const atrArr = calculateATR(prices);
    
    // 2. EXTRACT VECTORS
    const rsi = rsiArr[rsiArr.length - 1];
    const bBandwidth = bb.bandwidth[bb.bandwidth.length - 1];
    const bPercent = bb.percentB[bb.percentB.length - 1];
    const macdHist = macd.histogram[macd.histogram.length - 1];
    const atr = atrArr[atrArr.length - 1] || (currentPrice * 0.01); 

    // 3. DETERMINE MARKET REGIME
    let regime = 'CRAB'; 
    if (bBandwidth > 0.05 && rsi > 70) regime = 'PUMP';
    else if (bBandwidth > 0.05 && rsi < 30) regime = 'CRASH';
    else if (macdHist > 0 && rsi > 55) regime = 'BULL';
    else if (macdHist < 0 && rsi < 45) regime = 'BEAR';

    // 4. RISK CALCULATIONS (Strategy Adaptive)
    
    // High Water Mark Logic
    const recentHigh = Math.max(...prices.slice(-10));
    const trailBase = bot.holdingsCrypto > 0 ? recentHigh : currentPrice;
    
    // Adapt Stop Loss Multiplier based on Regime AND Strategy
    let adaptiveStopMult = dna.stopAtrMult;
    if (regime === 'PUMP' && strategyName === StrategyType.TREND_4H) adaptiveStopMult *= 1.5; // Let trend run
    if (regime === 'BEAR' && strategyName === StrategyType.SCALP_1M) adaptiveStopMult *= 0.8; // Tighten scalp

    const dynamicStopLoss = trailBase - (atr * adaptiveStopMult);

    // Adapt Take Profit
    let dynamicTakeProfit = 0;
    if (dna.tpAtrMult > 0) {
        dynamicTakeProfit = currentPrice + (atr * dna.tpAtrMult);
    } 
    // Special Override: If TREND strategy, TP is 0 (Trailing stop only), UNLESS we are in BEAR
    if (strategyName === StrategyType.TREND_4H && regime === 'BEAR') {
         dynamicTakeProfit = currentPrice + (atr * 2.0); // Take profit in bear bounces
    }

    // 5. SCORING ALGORITHM (Strategy Weighted)
    let score = 0;
    
    // RSI Signal
    if (rsi < 30) score += (20 * dna.weights.rsi); 
    if (rsi > 70) score -= (20 * dna.weights.rsi); 
    
    // Bollinger Mean Reversion
    if (bPercent < 0) score += (20 * dna.weights.bb); 
    if (bPercent > 1) score -= (20 * dna.weights.bb); 
    
    // MACD Momentum
    score += (macdHist > 0 ? (10 * dna.weights.macd) : -(10 * dna.weights.macd));

    // 6. DECISION MATRIX
    const confidence = Math.min(100, Math.abs(score) + (bBandwidth * 500));
    
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let reason = `Scanning ${regime} structure (${dna.name})...`;

    // Use DNA Thresholds
    if (score > dna.entryThreshold) {
        action = 'BUY';
        reason = `${dna.name} Signal: Strong Entry in ${regime} (Score: ${score.toFixed(0)})`;
    } else if (score < dna.exitThreshold) {
        action = 'SELL';
        reason = `${dna.name} Signal: Distribution/Exit (Score: ${score.toFixed(0)})`;
    }

    // Hard Rules Override
    if (bot.holdingsCrypto > 0 && currentPrice < dynamicStopLoss) {
        action = 'SELL';
        reason = `RISK (${dna.name}): Trailing Stop Hit @ $${dynamicStopLoss.toFixed(2)}`;
    }
    
    if (bot.holdingsCrypto > 0 && dynamicTakeProfit > 0 && currentPrice > dynamicTakeProfit) {
        action = 'SELL';
        reason = `PROFIT (${dna.name}): Target Reached @ $${dynamicTakeProfit.toFixed(2)}`;
    }

    return {
        action,
        reason,
        confidence,
        score,
        regime,
        metrics: {
            stopLossPrice: dynamicStopLoss,
            takeProfitPrice: dynamicTakeProfit,
            atr,
            trendStrength: Math.abs(macdHist) * 100
        }
    };
};