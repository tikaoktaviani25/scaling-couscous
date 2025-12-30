import { ExchangeName, BotState, BotStatus, StrategyType } from './types';

const DEFAULT_WEIGHTS = { rsi: 1.5, macd: 2.0, stoch: 1.0, bollinger: 1.5, trend: 2.5, volume: 1.0, depth: 1.0 };

export const INITIAL_BOTS: BotState[] = [
  {
    id: ExchangeName.OKX,
    name: 'OKX Sniper',
    stableCoin: 'USDC',
    status: BotStatus.IDLE,
    activeStrategy: StrategyType.SCALP_1M, // Aggressive Scalper
    balanceUsdt: 10000,
    holdingsCrypto: 0,
    avgBuyPrice: 0,
    totalProfit: 0,
    lastAction: 'Inicializado',
    color: 'border-blue-500',
    predictionScore: 0,
    confidence: 0,
    winRate: 100,
    tradesCount: 0,
    neuralWeights: { ...DEFAULT_WEIGHTS, rsi: 4.0, bollinger: 3.5, trend: 0.5 }
  },
  {
    id: ExchangeName.MEXC,
    name: 'MEXC Degen',
    stableCoin: 'USDT',
    status: BotStatus.IDLE,
    activeStrategy: StrategyType.ARBITRAGE, // Spread Hunter (Volatility)
    balanceUsdt: 5000,
    holdingsCrypto: 0,
    avgBuyPrice: 0,
    totalProfit: 0,
    lastAction: 'Inicializado',
    color: 'border-green-500',
    predictionScore: 0,
    confidence: 0,
    winRate: 100,
    tradesCount: 0,
    neuralWeights: { ...DEFAULT_WEIGHTS, trend: 4.0, volume: 3.0 }
  },
  {
    id: ExchangeName.BINANCE,
    name: 'Binance Whale',
    stableCoin: 'USDC',
    status: BotStatus.IDLE,
    activeStrategy: StrategyType.TREND_4H, // Long Term Trend
    balanceUsdt: 25000,
    holdingsCrypto: 0,
    avgBuyPrice: 0,
    totalProfit: 0,
    lastAction: 'Inicializado',
    color: 'border-yellow-500',
    predictionScore: 0,
    confidence: 0,
    winRate: 100,
    tradesCount: 0,
    neuralWeights: { ...DEFAULT_WEIGHTS, depth: 3.0 }
  },
  {
    id: ExchangeName.KRAKEN,
    name: 'Kraken Guard',
    stableCoin: 'USDC',
    status: BotStatus.IDLE,
    activeStrategy: StrategyType.HEDGE, // Defensive / Crash Protection
    balanceUsdt: 12000,
    holdingsCrypto: 0,
    avgBuyPrice: 0,
    totalProfit: 0,
    lastAction: 'Inicializado',
    color: 'border-purple-500',
    predictionScore: 0,
    confidence: 0,
    winRate: 100,
    tradesCount: 0,
    neuralWeights: { ...DEFAULT_WEIGHTS, bollinger: 3.0 }
  }
];

export const MOCK_TELEGRAM_AVATARS = {
  [ExchangeName.OKX]: 'https://picsum.photos/40/40?random=1',
  [ExchangeName.MEXC]: 'https://picsum.photos/40/40?random=2',
  [ExchangeName.BINANCE]: 'https://picsum.photos/40/40?random=3',
  [ExchangeName.KRAKEN]: 'https://picsum.photos/40/40?random=4',
  'BRAIN': 'https://picsum.photos/40/40?random=5',
  'SYSTEM': 'https://picsum.photos/40/40?random=6'
};