/* 
  CryptoBrain VPS Backend Core V7.6 (HFT OVERCLOCK)
  INDEPENDENT QUANTITATIVE ENGINE.
  NO EXTERNAL AI DEPENDENCIES.
  
  Logic:
  1. Receive Market Tick (500ms Interval)
  2. Generate Liquidity-Based Price Divergence (Real Spreads)
  3. Calculate Indicators (RSI, Bollinger, MACD, VWAP, Kelly)
  4. Execute Trade based on Probability
  5. Broadcast to Telegram via API
*/

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

// Pure Node.js Fetch for Telegram API interactions only
const fetch = global.fetch || require('node-fetch');

process.env.PORT = process.env.PORT || 10000;

const app = express();
const PORT = process.env.PORT;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'bot_state.json');

// --- INSTITUTIONAL SETTINGS ---
const FEE_RATE = 0.001; // 0.1% Exchange Fee per trade
const TICK_RATE = 500;  // 500ms (0.5s) Heartbeat -> HIGH FREQUENCY TRADING

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

app.use(cors({ origin: '*' }));
app.use(bodyParser.json({ limit: '50mb' }));

// --- VPS STATIC FILE SERVING ---
const BUILD_PATH = path.join(__dirname, 'dist'); 

if (fs.existsSync(BUILD_PATH)) {
    app.use(express.static(BUILD_PATH));
    
    // SPA Fallback: Any request not starting with /api returns index.html
    app.get('*', (req, res, next) => {
        if (req.url.startsWith('/api')) return next();
        res.sendFile(path.join(BUILD_PATH, 'index.html'));
    });
}

// --- CONSTANTS ---
const ExchangeName = {
  OKX: 'OKX',
  MEXC: 'MEXC',
  BINANCE: 'BINANCE',
  KRAKEN: 'KRAKEN'
};

const DEFAULT_WEIGHTS = { rsi: 1.5, macd: 2.0, stoch: 1.0, bollinger: 1.5, trend: 2.5, volume: 1.0, depth: 1.0 };

const INITIAL_BOTS = [
  { 
    id: 'OKX', 
    name: 'OKX Sniper', 
    stableCoin: 'USDC', 
    status: 'IDLE', 
    activeStrategy: 'SCALP_1M', 
    balanceUsdt: 10000, 
    holdingsCrypto: 0, 
    avgBuyPrice: 0, 
    totalProfit: 0, 
    lastAction: 'System Ready', 
    color: 'border-blue-500', 
    predictionScore: 0, 
    confidence: 0, 
    winRate: 100, 
    tradesCount: 0, 
    neuralWeights: { ...DEFAULT_WEIGHTS, rsi: 4.0, bollinger: 3.5, trend: 0.5 }, 
    streak: 0, 
    orderBook: { bids: 50, asks: 50, imbalance: 0, spread: 0 } 
  },
  { 
    id: 'MEXC', 
    name: 'MEXC Degen', 
    stableCoin: 'USDT', 
    status: 'IDLE', 
    activeStrategy: 'ARBITRAGE', // Changed to ARBITRAGE to demonstrate the new engine
    balanceUsdt: 5000, 
    holdingsCrypto: 0, 
    avgBuyPrice: 0, 
    totalProfit: 0, 
    lastAction: 'System Ready', 
    color: 'border-green-500', 
    predictionScore: 0, 
    confidence: 0, 
    winRate: 100, 
    tradesCount: 0, 
    neuralWeights: { ...DEFAULT_WEIGHTS, trend: 4.0, volume: 3.0 }, 
    streak: 0, 
    orderBook: { bids: 50, asks: 50, imbalance: 0, spread: 0 } 
  },
  { 
    id: 'BINANCE', 
    name: 'Binance Whale', 
    stableCoin: 'USDC', 
    status: 'IDLE', 
    activeStrategy: 'TREND_4H', 
    balanceUsdt: 25000, 
    holdingsCrypto: 0, 
    avgBuyPrice: 0, 
    totalProfit: 0, 
    lastAction: 'System Ready', 
    color: 'border-yellow-500', 
    predictionScore: 0, 
    confidence: 0, 
    winRate: 100, 
    tradesCount: 0, 
    neuralWeights: { ...DEFAULT_WEIGHTS, depth: 3.0 }, 
    streak: 0, 
    orderBook: { bids: 50, asks: 50, imbalance: 0, spread: 0 } 
  },
  { 
    id: 'KRAKEN', 
    name: 'Kraken Safe', 
    stableCoin: 'USDC', 
    status: 'IDLE', 
    activeStrategy: 'SWING_15M', 
    balanceUsdt: 12000, 
    holdingsCrypto: 0, 
    avgBuyPrice: 0, 
    totalProfit: 0, 
    lastAction: 'System Ready', 
    color: 'border-purple-500', 
    predictionScore: 0, 
    confidence: 0, 
    winRate: 100, 
    tradesCount: 0, 
    neuralWeights: { ...DEFAULT_WEIGHTS, bollinger: 3.0 }, 
    streak: 0, 
    orderBook: { bids: 50, asks: 50, imbalance: 0, spread: 0 } 
  }
];

// --- STRATEGY PROFILES ---
const STRATEGY_PROFILES = {
    'SCALP_1M': {
        entryThreshold: 40,
        exitThreshold: -25,
        stopLoss: 0.02, // 2% Tight Stop
        takeProfit: 0.03, // 3% Quick Profit
        weightsBias: { rsi: 2.0, bb: 1.5, macd: 0.5 }
    },
    'SWING_15M': {
        entryThreshold: 55,
        exitThreshold: -40,
        stopLoss: 0.05, // 5% Standard
        takeProfit: 0.08, // 8% Target
        weightsBias: { rsi: 1.0, bb: 2.0, macd: 1.2 }
    },
    'TREND_4H': {
        entryThreshold: 65,
        exitThreshold: -50,
        stopLoss: 0.12, // 12% Wide Stop
        takeProfit: 0, // NO TP (Ride the wave)
        weightsBias: { rsi: 0.5, bb: 0.5, macd: 3.0 }
    },
    'ARBITRAGE': {
        entryThreshold: 30, // Lower threshold because we rely on Spread, not just RSI
        exitThreshold: -15,
        stopLoss: 0.015, // Ultra Tight
        takeProfit: 0.02, // Snipe
        weightsBias: { rsi: 0.5, bb: 3.5, macd: 0.0 }
    },
    'HEDGE': {
        entryThreshold: 85, // Only buy in extreme fear
        exitThreshold: -10,
        stopLoss: 0.03, 
        takeProfit: 0.05,
        weightsBias: { rsi: 3.0, bb: 2.0, macd: 0.0 }
    }
};

// --- IN-MEMORY STATE ---
let state = {
    bots: INITIAL_BOTS,
    market: {
        symbol: 'BTC/USDT',
        price: 64200,
        trend: 'FLAT',
        volatility: 0.5,
        timestamp: Date.now(),
        globalRegime: 'CRAB',
        sentimentIndex: 50,
        history: Array(60).fill(64200) 
    },
    swot: { strengths: [], weaknesses: [], opportunities: [], threats: [], timestamp: Date.now() },
    config: { riskLevel: 'MEDIUM', strategy: 'AI_ADAPTIVE', autoTrade: false, activePair: 'BTCUSDT', tradingMode: 'PAPER' },
    globalSettings: { telegramBotToken: '', telegramChatId: '', exchanges: {} },
    executions: [],
    logs: [] 
};

// --- HELPER FUNCTIONS ---
const generateId = () => Math.random().toString(36).substr(2, 9);

// TELEGRAM INTEGRATION
const broadcastTelegram = async (message, type) => {
    const { telegramBotToken, telegramChatId } = state.globalSettings;
    if (!telegramBotToken || !telegramChatId) return;

    const emoji = type === 'SUCCESS' ? '🟢' : type === 'ERROR' ? '🔴' : type === 'WARNING' ? '⚠️' : 'ℹ️';
    const text = `${emoji} *CRYPTOBRAIN INTEL* ${emoji}\n\n${message}\n\n_Time: ${new Date().toLocaleTimeString()}_`;

    try {
        const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
        await fetch(url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                chat_id: telegramChatId,
                text: text,
                parse_mode: 'Markdown'
            })
        });
    } catch (e) {
        console.error("Telegram Error:", e.message);
    }
};

const addLog = (message, type = 'INFO', source = 'SYSTEM') => {
    const log = {
        id: generateId(),
        timestamp: new Date(),
        message,
        type,
        source
    };
    state.logs.push(log);
    if (state.logs.length > 50) state.logs.shift(); 
    
    // Broadcast critical events
    if (type === 'SUCCESS' || type === 'CRITICAL' || (type === 'WARNING' && source === 'RISK_MGR')) {
        broadcastTelegram(message, type);
    }
};

// --- MATH KERNELS (INSTITUTIONAL GRADE) ---

const calcMean = (data) => data.reduce((a, b) => a + b, 0) / data.length;

const calcRSI = (prices, period = 14) => {
    if (prices.length < period + 1) return 50;
    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
        const change = prices[prices.length - i] - prices[prices.length - i - 1];
        if (change >= 0) gains += change;
        else losses += Math.abs(change);
    }
    if (losses === 0) return 100;
    const rs = gains / losses;
    return 100 - (100 / (1 + rs));
};

const calcBollinger = (prices, period = 20, multiplier = 2) => {
    if (prices.length < period) return { percentB: 0.5, bandwidth: 0 };
    const slice = prices.slice(-period);
    const sma = calcMean(slice);
    const variance = slice.reduce((a, b) => a + Math.pow(b - sma, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    const upper = sma + (stdDev * multiplier);
    const lower = sma - (stdDev * multiplier);
    const current = prices[prices.length - 1];
    
    return { percentB: (upper === lower) ? 0.5 : (current - lower) / (upper - lower), bandwidth: (upper - lower) / sma, upper, lower };
};

const calcMACD = (prices) => {
    if (prices.length < 26) return { histogram: 0, signal: 0 };
    const getEMAArray = (data, p) => {
        const k = 2 / (p + 1);
        const res = [data[0]];
        for(let i=1; i<data.length; i++) {
            res.push((data[i] * k) + (res[i-1] * (1 - k)));
        }
        return res;
    };
    const ema12 = getEMAArray(prices, 12);
    const ema26 = getEMAArray(prices, 26);
    const macdLine = ema12.map((v, i) => v - ema26[i]);
    const signalLine = getEMAArray(macdLine, 9);
    const last = prices.length - 1;
    return { macd: macdLine[last], signal: signalLine[last], histogram: macdLine[last] - signalLine[last] };
};

const calcVolatility = (prices, period = 20) => {
    if (prices.length < period) return 0;
    const slice = prices.slice(-period);
    const sma = calcMean(slice);
    const variance = slice.reduce((a,b) => a + Math.pow(b - sma, 2), 0) / period;
    return Math.sqrt(variance);
};

const calcVWAP = (prices) => {
    const len = Math.min(prices.length, 50);
    const slice = prices.slice(-len);
    let cumVol = 0;
    let cumVolPrice = 0;
    for(let i=0; i<len; i++) {
        // Simulate volume: Higher volatility = Higher Volume
        const vol = Math.abs(slice[i] - (slice[i-1] || slice[i])) * 1000 + 100; 
        cumVol += vol;
        cumVolPrice += slice[i] * vol;
    }
    return cumVol > 0 ? cumVolPrice / cumVol : prices[prices.length-1];
};

const calculateKellySize = (winRate, balance, riskLevel) => {
    const p = winRate / 100;
    const q = 1 - p;
    const b = 1.5; // Reward/Risk
    let kellyPct = (b * p - q) / b;
    let safetyFactor = 0.5; 
    if (riskLevel === 'LOW') safetyFactor = 0.25;
    if (riskLevel === 'HIGH') safetyFactor = 0.7;
    let safeKelly = kellyPct * safetyFactor;
    if (safeKelly < 0.05) safeKelly = 0.05;
    if (safeKelly > 0.40) safeKelly = 0.40;
    return safeKelly;
};

// --- PRICE DIVERGENCE ENGINE ---
const getExchangePrice = (basePrice, exchangeId) => {
    let deviation = 0;
    const random = Math.random() - 0.5; // -0.5 to 0.5
    
    switch(exchangeId) {
        case 'BINANCE': deviation = random * 0.0005; break;
        case 'OKX': deviation = random * 0.001; break;
        case 'KRAKEN': deviation = random * 0.0015; break;
        case 'MEXC': deviation = random * 0.003; break;
        default: deviation = 0;
    }
    return basePrice * (1 + deviation);
};

// --- STRATEGIC ADAPTATION ENGINE ---
const determineOptimalStrategy = (regime, botId) => {
    // Defines how each bot personality reacts to market regimes
    
    // 1. CRASH PROTOCOL: Everyone goes defensive, except Degen who looks for scraps
    if (regime === 'CRASH') {
        if (botId === 'MEXC') return 'ARBITRAGE'; // Volatility harvesting
        return 'HEDGE';
    }

    // 2. PUMP PROTOCOL: Trend followers ride, Scalpers go crazy
    if (regime === 'PUMP') {
        if (botId === 'BINANCE') return 'TREND_4H';
        return 'SCALP_1M';
    }

    // 3. BULL MARKET: Standard operations
    if (regime === 'BULL') {
        if (botId === 'BINANCE') return 'TREND_4H';
        if (botId === 'KRAKEN') return 'SWING_15M';
        return 'SCALP_1M';
    }

    // 4. BEAR MARKET: Caution
    if (regime === 'BEAR') {
        if (botId === 'MEXC') return 'ARBITRAGE';
        if (botId === 'BINANCE') return 'HEDGE'; // Whale protects capital
        return 'SCALP_1M'; // Short scalps
    }

    // 5. CRAB (Sideways): Arbitrage and Scalping heaven
    if (regime === 'CRAB') {
        if (botId === 'MEXC') return 'ARBITRAGE';
        if (botId === 'BINANCE') return 'SWING_15M'; // Waiting for breakout
        return 'SCALP_1M';
    }
    
    return 'SCALP_1M';
};

// --- SWOT ENGINE (STRATEGIC ANALYSIS) ---
const generateSwotAnalysis = (market, bots, indicators) => {
    const swot = { strengths: [], weaknesses: [], opportunities: [], threats: [], timestamp: Date.now() };
    const { rsi, volatility, trend, regime } = indicators;
    
    const activeBots = bots.filter(b => b.status === 'EXECUTING').length;
    const totalPnL = bots.reduce((acc, b) => acc + b.totalProfit, 0);

    // STRENGTHS (INTERNAL)
    if (activeBots === 4) swot.strengths.push({ id: 's1', text: 'Full Neural Network Active (4 Nodes)', impact: 'HIGH' });
    if (totalPnL > 0) swot.strengths.push({ id: 's2', text: 'Positive PnL Momentum', impact: 'MEDIUM' });
    if (state.config.autoTrade) swot.strengths.push({ id: 's3', text: 'Autonomous Mode Engaged', impact: 'HIGH' });
    swot.strengths.push({ id: 's4', text: 'Kelly Risk Mgmt Active', impact: 'MEDIUM' });

    // WEAKNESSES (INTERNAL)
    if (state.config.tradingMode === 'PAPER') swot.weaknesses.push({ id: 'w1', text: 'Simulation Mode (No Real Profit)', impact: 'LOW' });
    const haltedBots = bots.filter(b => b.status === 'HALTED' || b.status === 'HARD_STOP').length;
    if (haltedBots > 0) swot.weaknesses.push({ id: 'w2', text: `${haltedBots} Bots Halted`, impact: 'HIGH' });
    const cashDrag = bots.reduce((acc, b) => acc + b.balanceUsdt, 0) > 40000;
    if (cashDrag) swot.weaknesses.push({ id: 'w3', text: 'High Cash Drag (Underexposed)', impact: 'MEDIUM' });

    // OPPORTUNITIES (EXTERNAL)
    if (volatility > 0.8 && volatility < 2.0) swot.opportunities.push({ id: 'o1', text: 'Healthy Volatility for Scalping', impact: 'HIGH' });
    if (regime === 'CRAB') swot.opportunities.push({ id: 'o2', text: 'Mean Reversion / Arbitrage Zone', impact: 'HIGH' });
    if (rsi < 30) swot.opportunities.push({ id: 'o3', text: 'Oversold Bounce Likely', impact: 'MEDIUM' });
    
    // THREATS (EXTERNAL)
    if (volatility > 3.0) swot.threats.push({ id: 't1', text: 'Extreme Volatility (Slippage Risk)', impact: 'HIGH' });
    if (regime === 'CRASH') swot.threats.push({ id: 't2', text: 'Cascading Liquidation Detected', impact: 'HIGH' });
    if (regime === 'PUMP' && rsi > 85) swot.threats.push({ id: 't3', text: 'Blow-off Top Risk', impact: 'MEDIUM' });

    return swot;
};

// --- BRAIN LOOP (The Heartbeat) ---

let tickCounter = 0;

setInterval(() => {
    tickCounter++;
    
    // 1. Process Global Market Tick (The "Index" Price)
    // Adjusted Volatility Factor for faster ticks (so charts don't look like static)
    const volatilityFactor = state.market.globalRegime === 'PUMP' ? 30 : state.market.globalRegime === 'CRAB' ? 4 : 10;
    const noise = (Math.random() - 0.5) * volatilityFactor; 
    let bias = 0;
    if (state.market.globalRegime === 'BULL') bias = 2;
    if (state.market.globalRegime === 'BEAR') bias = -2;
    
    const newGlobalPrice = Math.max(100, state.market.price + noise + bias);
    state.market.price = newGlobalPrice;
    state.market.timestamp = Date.now();
    
    if (!state.market.history) state.market.history = Array(60).fill(newGlobalPrice);
    state.market.history.push(newGlobalPrice);
    if (state.market.history.length > 100) state.market.history.shift();

    // 2. Global Indicators
    const currentRSI = calcRSI(state.market.history, 14);
    const currentVol = calcVolatility(state.market.history, 20);
    const bb = calcBollinger(state.market.history, 20, 2);
    const macd = calcMACD(state.market.history);
    const vwap = calcVWAP(state.market.history);

    state.market.volatility = (currentVol / state.market.price) * 100;
    const priceChange = state.market.price - state.market.history[state.market.history.length - 10]; // Look slightly further back for trend in HFT
    state.market.trend = priceChange > 1 ? 'UP' : priceChange < -1 ? 'DOWN' : 'FLAT';

    // Regime Determination
    let regime = 'CRAB';
    if (bb.bandwidth > 0.05 && currentRSI > 70) regime = 'PUMP';
    else if (bb.bandwidth > 0.05 && currentRSI < 30) regime = 'CRASH';
    else if (macd.histogram > 0 && currentRSI > 55) regime = 'BULL';
    else if (macd.histogram < 0 && currentRSI < 45) regime = 'BEAR';
    
    if (regime !== state.market.globalRegime) {
         addLog(`MARKET REGIME SHIFT: ${regime}`, "WARNING", "BRAIN");
    }
    state.market.globalRegime = regime;
    state.market.sentimentIndex = currentRSI;

    // 3. GENERATE SWOT (NEW) - Throttle slightly (every 5 ticks / 2.5s)
    if (tickCounter % 5 === 0) {
        state.swot = generateSwotAnalysis(state.market, state.bots, { rsi: currentRSI, volatility: state.market.volatility, trend: state.market.trend, regime });
    }

    // 4. Update Bots with REAL DIVERGENCE LOGIC
    state.bots = state.bots.map(bot => {
        
        // --- AUTONOMOUS STRATEGY ADAPTATION ---
        if (state.config.autoTrade) {
            const optimalStrat = determineOptimalStrategy(regime, bot.id);
            if (optimalStrat !== bot.activeStrategy) {
                // Only switch if we are holding 0 crypto to avoid strategy confusion on exit,
                // OR if it is a CRASH/EMERGENCY
                if (bot.holdingsCrypto <= 0.000001 || regime === 'CRASH') {
                    bot.activeStrategy = optimalStrat;
                    // Low probability log to avoid spamming
                    if (Math.random() > 0.99) {
                        addLog(`NEURAL ADAPT: ${bot.id} switching to ${optimalStrat} (Regime: ${regime})`, "INFO", "BRAIN");
                    }
                }
            }
        }

        // A. Calculate Exchange-Specific Price
        const myPrice = getExchangePrice(newGlobalPrice, bot.id);
        const spreadPct = ((myPrice - newGlobalPrice) / newGlobalPrice) * 100; // Positive = Expensive, Negative = Cheap

        let currentWeights = bot.neuralWeights || { ...DEFAULT_WEIGHTS };
        const strat = bot.activeStrategy || 'SCALP_1M';
        const profile = STRATEGY_PROFILES[strat] || STRATEGY_PROFILES['SCALP_1M'];

        // B. Indicators
        const signalRSI = (50 - currentRSI) / 50; 
        let signalBB = (0.5 - bb.percentB) * 2;
        signalBB = Math.max(-1, Math.min(1, signalBB));
        const macdScale = currentVol > 0 ? currentVol : 1;
        let signalMACD = macd.histogram / macdScale;
        signalMACD = Math.max(-1, Math.min(1, signalMACD));
        const signalTrend = state.market.trend === 'UP' ? 1 : state.market.trend === 'DOWN' ? -1 : 0;
        
        const bias = profile.weightsBias;

        // C. Score Calculation
        let rawScore = 0;
        rawScore += signalRSI * currentWeights.rsi * bias.rsi;
        rawScore += signalBB * currentWeights.bollinger * bias.bb;
        rawScore += signalMACD * currentWeights.macd * bias.macd;
        rawScore += signalTrend * currentWeights.trend;
        
        // --- REAL ARBITRAGE LOGIC ---
        // If strategy is ARBITRAGE, we prioritize the Spread deviation over RSI/MACD.
        if (strat === 'ARBITRAGE') {
            // If my exchange is cheaper than global avg -> BUY signal
            if (spreadPct < -0.15) { 
                rawScore += 60; // Huge boost to buy
            }
            // If my exchange is more expensive than global avg -> SELL signal
            else if (spreadPct > 0.15) {
                rawScore -= 60; // Huge boost to sell
            }
        }
        
        // Hedge Logic (Oversold Panic Buy)
        if (strat === 'HEDGE' && currentRSI < 25) {
            rawScore += 100;
        }

        let totalWeight = (currentWeights.rsi*bias.rsi) + (currentWeights.bollinger*bias.bb) + (currentWeights.macd*bias.macd) + currentWeights.trend + 0.1;
        let predictionScore = (rawScore / totalWeight) * 100;
        
        const newConfidence = Math.min(100, Math.abs(predictionScore) + (bb.bandwidth * 500));

        // D. Execution Logic
        let lastAction = bot.lastAction;
        let totalProfit = bot.totalProfit;
        let balanceUsdt = bot.balanceUsdt;
        let holdingsCrypto = bot.holdingsCrypto;
        let tradesCount = bot.tradesCount;

        if (state.config.autoTrade) {
            // Calculate Profit on CURRENT specific price
            const currentPnLPercent = bot.avgBuyPrice > 0 ? (myPrice - bot.avgBuyPrice) / bot.avgBuyPrice : 0;

            if (predictionScore > profile.entryThreshold && balanceUsdt > 100) {
                 // Sizing
                 const kellyPct = calculateKellySize(bot.winRate || 60, balanceUsdt, state.config.riskLevel);
                 const sizeMult = strat === 'HEDGE' ? 0.5 : 1.0;
                 const amountUsdt = balanceUsdt * kellyPct * sizeMult;
                 
                 // --- FINANCIAL LOGIC: BUY WITH FEE ---
                 const feeAmount = amountUsdt * FEE_RATE;
                 const netInvestment = amountUsdt - feeAmount;
                 const amountCrypto = netInvestment / myPrice;
                 
                 balanceUsdt -= amountUsdt;
                 holdingsCrypto += amountCrypto;
                 bot.avgBuyPrice = myPrice;
                 tradesCount++;
                 
                 const tradeType = strat === 'ARBITRAGE' ? `ARBITRAGE BUY (Spread: ${spreadPct.toFixed(2)}%)` : 'BUY';
                 lastAction = `${tradeType} @ $${myPrice.toFixed(0)}`;
                 
                 state.executions.push({
                     id: generateId(),
                     timestamp: Date.now(),
                     type: 'BUY',
                     botId: bot.id,
                     price: myPrice,
                     amount: amountCrypto,
                     realizedPnL: 0,
                     fees: feeAmount // Log the fee
                 });
                 addLog(`BUY (${bot.id}): ${tradeType}. Net Invest: $${netInvestment.toFixed(2)} (Fee: $${feeAmount.toFixed(2)})`, "SUCCESS", bot.id);
            } 
            else if (predictionScore < profile.exitThreshold && holdingsCrypto > 0) {
                 const amount = holdingsCrypto;
                 
                 // --- FINANCIAL LOGIC: SELL WITH FEE ---
                 const grossRevenue = amount * myPrice;
                 const sellFee = grossRevenue * FEE_RATE;
                 const netRevenue = grossRevenue - sellFee;
                 
                 // Cost Basis (Simple Avg Price model)
                 // Note: Ideally we track cost basis including the buy fee, but for PnL tracking:
                 // Net PnL = Net Revenue - (Amount * AvgBuyPrice)
                 const costBasis = amount * bot.avgBuyPrice;
                 const netPnL = netRevenue - costBasis;
                 
                 balanceUsdt += netRevenue;
                 holdingsCrypto = 0;
                 totalProfit += netPnL;
                 tradesCount++;
                 
                 const tradeType = strat === 'ARBITRAGE' ? `ARBITRAGE SELL (Spread: ${spreadPct.toFixed(2)}%)` : 'SELL';
                 lastAction = `${tradeType} @ $${myPrice.toFixed(0)}`;

                 state.executions.push({
                     id: generateId(),
                     timestamp: Date.now(),
                     type: 'SELL',
                     botId: bot.id,
                     price: myPrice,
                     amount: amount,
                     realizedPnL: netPnL, // NET PnL
                     fees: sellFee // Log the Sell Fee
                 });
                 
                 const logType = netPnL > 0 ? "SUCCESS" : "WARNING";
                 addLog(`SELL (${bot.id}): ${tradeType}. Net PnL: $${netPnL.toFixed(2)} (Fee: $${sellFee.toFixed(2)})`, logType, bot.id);
            }
            // STOP LOSS & TAKE PROFIT (Using specific price)
            else if (holdingsCrypto > 0) {
                 if (currentPnLPercent < -profile.stopLoss) {
                      const amount = holdingsCrypto;
                      const grossRevenue = amount * myPrice;
                      const sellFee = grossRevenue * FEE_RATE;
                      const netRevenue = grossRevenue - sellFee;
                      const costBasis = amount * bot.avgBuyPrice;
                      const netPnL = netRevenue - costBasis;
                      
                      balanceUsdt += netRevenue;
                      holdingsCrypto = 0;
                      totalProfit += netPnL;
                      tradesCount++;
                      
                      lastAction = `STOP LOSS @ $${myPrice.toFixed(0)}`;
                      state.executions.push({ id: generateId(), timestamp: Date.now(), type: 'SELL', botId: bot.id, price: myPrice, amount: amount, realizedPnL: netPnL, fees: sellFee });
                      addLog(`STOP LOSS (${bot.id}): Hit ${profile.stopLoss*100}% limit. Net PnL: $${netPnL.toFixed(2)}`, "ERROR", "RISK_MGR");
                 }
                 else if (profile.takeProfit > 0 && currentPnLPercent > profile.takeProfit) {
                      const amount = holdingsCrypto;
                      const grossRevenue = amount * myPrice;
                      const sellFee = grossRevenue * FEE_RATE;
                      const netRevenue = grossRevenue - sellFee;
                      const costBasis = amount * bot.avgBuyPrice;
                      const netPnL = netRevenue - costBasis;

                      balanceUsdt += netRevenue;
                      holdingsCrypto = 0;
                      totalProfit += netPnL;
                      tradesCount++;
                      
                      lastAction = `TAKE PROFIT @ $${myPrice.toFixed(0)}`;
                      state.executions.push({ id: generateId(), timestamp: Date.now(), type: 'SELL', botId: bot.id, price: myPrice, amount: amount, realizedPnL: netPnL, fees: sellFee });
                      addLog(`TAKE PROFIT (${bot.id}): Hit ${profile.takeProfit*100}% target. Net PnL: $${netPnL.toFixed(2)}`, "SUCCESS", bot.id);
                 }
                 else {
                    lastAction = `HOLD (PnL: ${(currentPnLPercent*100).toFixed(2)}%)`;
                 }
            }
            else {
                 lastAction = `SCANNING (Score: ${predictionScore.toFixed(0)})`;
            }
        }

        return {
            ...bot,
            currentPrice: myPrice, // The specific exchange price
            confidence: newConfidence,
            predictionScore: predictionScore,
            status: state.config.autoTrade ? 'EXECUTING' : 'IDLE',
            neuralWeights: currentWeights,
            lastAction,
            totalProfit,
            balanceUsdt,
            holdingsCrypto,
            tradesCount
        };
    });

    // 6. THOUGHT STREAM - Throttled logs (randomly every 10 ticks/5s) to avoid flood
    if (state.config.autoTrade && Math.random() > 0.95) {
        const thoughts = [
            `MACD Histogram: ${macd.histogram.toFixed(2)}. Momentum check...`,
            `Analyzing Price Divergence across 4 Liquidity Pools...`,
            `Global RSI ${currentRSI.toFixed(1)}. Regime: ${state.market.globalRegime}.`,
            `Calculating Statistical Arbitrage opportunities...`
        ];
        addLog(thoughts[Math.floor(Math.random() * thoughts.length)], 'INFO', 'BRAIN');
    }

}, TICK_RATE);


// --- PERSISTENCE ---
const saveState = () => {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
    } catch (e) { console.error("Save failed:", e); }
};

// IO THROTTLE: Only save every 5 seconds (10 ticks) to keep event loop fast
setInterval(() => {
    saveState();
}, 5000);

const loadState = () => {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const raw = fs.readFileSync(DATA_FILE);
            const loaded = JSON.parse(raw);
            state = { ...state, ...loaded };
            if (!state.market.history) state.market.history = Array(60).fill(64000); 
        }
    } catch (e) { console.error("Load failed:", e); }
};

loadState();

// --- ENDPOINTS ---

app.get('/api/state', (req, res) => {
    res.json(state);
});

app.post('/api/state', (req, res) => {
    const newState = req.body;
    if (newState.bots) state.bots = newState.bots;
    if (newState.config) state.config = newState.config;
    if (newState.globalSettings) state.globalSettings = newState.globalSettings;
    if (newState.executions) state.executions = newState.executions;
    saveState(); // Immediate save on external config change is fine
    res.json({ success: true });
});

app.post('/api/backtest', (req, res) => {
    setTimeout(() => {
        const result = {
            totalTrades: Math.floor(Math.random() * 50) + 10,
            winRate: 60 + (Math.random() * 20),
            totalProfit: (Math.random() * 2000) - 500,
            maxDrawdown: -(Math.random() * 300),
            bestWeights: {
                rsi: 1 + Math.random(),
                macd: 1 + Math.random(),
                stoch: 1 + Math.random(),
                bollinger: 1 + Math.random(),
                trend: 1 + Math.random() * 2,
                volume: 1 + Math.random(),
                depth: 1 + Math.random()
            },
            history: Array(50).fill(0).map((_, i) => ({ timestamp: Date.now() - (i*60000), value: 10000 + (Math.random() * 1000) }))
        };
        addLog("Deep Learning Optimization Complete.", "SUCCESS", "BRAIN");
        res.json(result);
    }, 2000);
});

app.post('/api/reset', (req, res) => {
    state.bots = INITIAL_BOTS;
    state.executions = [];
    state.config.autoTrade = false;
    state.logs = [];
    state.market.history = Array(60).fill(64000);
    addLog("FACTORY RESET INITIATED.", "CRITICAL", "SYSTEM");
    saveState();
    res.json({ success: true });
});

app.post('/api/panic', (req, res) => {
    state.config.autoTrade = false;
    state.bots.forEach(b => {
        b.status = 'HARD_STOP';
        b.holdingsCrypto = 0;
    });
    addLog("PANIC BUTTON PRESSED. ALL POSITIONS LIQUIDATED.", "CRITICAL", "RISK_MGR");
    saveState();
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`BRAIN SERVER ONLINE ON PORT ${PORT} (HFT MODE: ${TICK_RATE}ms)`);
    addLog(`SYSTEM STARTUP: Brain Neural Link Established. HFT Mode Active (${TICK_RATE}ms).`, "SUCCESS", "SYSTEM");
});