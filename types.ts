export enum ExchangeName {
  OKX = 'OKX',
  MEXC = 'MEXC',
  BINANCE = 'BINANCE',
  KRAKEN = 'KRAKEN'
}

export enum BotStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  EXECUTING = 'EXECUTING',
  COOLDOWN = 'COOLDOWN',
  SCANNING = 'SCANNING',
  DEFENSIVE = 'DEFENSIVE',
  HALTED = 'HALTED',
  HARD_STOP = 'HARD_STOP',
  OPTIMIZING = 'OPTIMIZING'
}

export enum StrategyType {
  SCALP_1M = 'SCALP_1M',     // High Frequency, Low Profit targets
  SWING_15M = 'SWING_15M',   // Standard Day Trading
  TREND_4H = 'TREND_4H',     // Safe, long term holds
  ARBITRAGE = 'ARBITRAGE',   // Price difference exploitation
  HEDGE = 'HEDGE'            // Protective mode
}

export enum ErrorCategory {
  NETWORK = 'NETWORK',
  EXCHANGE_API = 'EXCHANGE_API',
  DATA_INTEGRITY = 'DATA_INTEGRITY',
  INTERNAL = 'INTERNAL'
}

export interface MarketData {
  symbol: string;
  price: number;
  trend: 'UP' | 'DOWN' | 'FLAT';
  volatility: number;
  timestamp: number;
  // NEW: God View Metrics
  globalRegime: 'BULL' | 'BEAR' | 'CRAB' | 'CRASH' | 'PUMP';
  sentimentIndex: number; // 0 to 100
}

export interface OrderBook {
  bids: number;
  asks: number;
  imbalance: number;
  spread: number;
}

export interface TradeTargets {
  stopLoss: number;
  takeProfit: number;
  entry: number;
}

export interface NeuralWeights {
  rsi: number;
  macd: number;
  stoch: number;
  bollinger: number;
  trend: number;
  volume: number;
  depth: number;
}

export interface BotState {
  id: ExchangeName;
  name: string;
  stableCoin: 'USDT' | 'USDC'; 
  status: BotStatus;
  balanceUsdt: number; 
  holdingsCrypto: number; 
  avgBuyPrice: number; 
  currentPrice?: number; 
  totalProfit: number;
  lastAction: string;
  color: string;
  predictionScore: number;
  confidence: number;
  winRate: number;
  tradesCount: number;
  marketRegime?: 'BULL' | 'BEAR' | 'CRAB' | 'CRASH' | 'PUMP';
  activeStrategy: StrategyType; 
  targets?: TradeTargets; 
  neuralWeights?: NeuralWeights; 
  lastSignalSource?: string; 
  streak?: number;
  orderBook?: OrderBook;
}

export interface LogMessage {
  id: string;
  timestamp: Date;
  source: ExchangeName | 'SYSTEM' | 'BRAIN' | 'RISK_MGR';
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'CRITICAL';
  errorCategory?: ErrorCategory;
}

export interface BrainConfig {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'; 
  strategy: 'AI_ADAPTIVE'; 
  autoTrade: boolean;
  activePair: string; 
  tradingMode: 'PAPER' | 'LIVE';
  maxDrawdown?: number;
}

export interface ExecutionPoint {
  id: string;
  timestamp: number;
  type: 'BUY' | 'SELL';
  botId: ExchangeName;
  price: number;
  amount: number;
  realizedPnL?: number; 
  fees?: number;
  slippage?: number;
}

export interface ExchangeConfig {
  apiKey: string;
  apiSecret: string;
  isActive: boolean;
}

export interface GlobalSettings {
  telegramBotToken: string;
  telegramChatId: string;
  exchanges: Record<ExchangeName, ExchangeConfig>;
}

export interface SystemHealth {
    circuitBreakerTripped: boolean;
    lastDrawdownCheck: number;
    systemLoad: number;
    lastBreakerTriggerTime?: number;
    restartAttempts: number;
}

export interface BacktestResult {
    totalTrades: number;
    winRate: number;
    totalProfit: number;
    maxDrawdown: number;
    bestWeights: NeuralWeights;
    history: { timestamp: number, value: number }[];
}

// --- SWOT INTERFACES ---
export interface SwotItem {
    id: string;
    text: string;
    impact: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface SwotAnalysis {
    strengths: SwotItem[];
    weaknesses: SwotItem[];
    opportunities: SwotItem[];
    threats: SwotItem[];
    timestamp: number;
}

export interface FullState {
    bots: BotState[];
    config: BrainConfig;
    globalSettings: GlobalSettings;
    executions: ExecutionPoint[];
    logs: LogMessage[];
    market: MarketData;
    swot?: SwotAnalysis; // Added SWOT to state
}