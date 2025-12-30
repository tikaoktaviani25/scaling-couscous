import React from 'react';
import { BotState, BotStatus, ExecutionPoint, StrategyType, ExchangeName } from '../types';
import { 
  TrendingUp,
  TrendingDown,
  Layers,
  ShieldAlert,
  Trophy,
  Hash,
  Wallet,
  Coins,
  Cpu,
  Brain,
  Lock,
  Activity,
  Zap
} from 'lucide-react';

interface BotCardProps {
  bot: BotState;
  activePair: string; 
  recentTrades: ExecutionPoint[];
}

const BotCard: React.FC<BotCardProps> = ({ bot, activePair, recentTrades }) => {
  const currencySymbol = bot.stableCoin || 'USDT'; 
  const currentPrice = bot.currentPrice || 0;
  const assetValue = bot.holdingsCrypto * currentPrice;
  const totalEquity = bot.balanceUsdt + assetValue;

  // --- SEMAPHORE LOGIC (Traffic Light) ---
  let semaphoreColor = 'bg-slate-700';
  let semaphoreGlow = '';
  let semaphoreState = 'OFFLINE';
  let statusTextColor = 'text-slate-400';

  switch (bot.status) {
      case BotStatus.EXECUTING:
      case BotStatus.SCANNING:
          semaphoreColor = 'bg-emerald-500';
          semaphoreGlow = 'shadow-[0_0_12px_rgba(16,185,129,0.8)] animate-pulse';
          semaphoreState = 'ACTIVE';
          statusTextColor = 'text-emerald-400';
          break;
      case BotStatus.ANALYZING:
      case BotStatus.IDLE:
      case BotStatus.OPTIMIZING:
          semaphoreColor = 'bg-amber-500';
          semaphoreGlow = 'shadow-[0_0_8px_rgba(245,158,11,0.5)]';
          semaphoreState = 'STANDBY';
          statusTextColor = 'text-amber-400';
          break;
      case BotStatus.DEFENSIVE:
      case BotStatus.COOLDOWN:
          semaphoreColor = 'bg-red-500';
          semaphoreGlow = 'shadow-[0_0_12px_rgba(239,68,68,0.8)] animate-pulse';
          semaphoreState = 'STOPPED';
          statusTextColor = 'text-red-400';
          break;
      case BotStatus.HALTED: // Circuit Breaker
          semaphoreColor = 'bg-red-600';
          semaphoreGlow = 'shadow-[0_0_20px_rgba(220,38,38,1)] animate-pulse';
          semaphoreState = 'HALTED';
          statusTextColor = 'text-red-500';
          break;
  }

  // --- ORDER BOOK VISUALS ---
  const bids = bot.orderBook?.bids || 50;
  const asks = bot.orderBook?.asks || 50;
  const totalDepth = bids + asks;
  const bidPct = (bids / totalDepth) * 100;
  const imbalance = bot.orderBook?.imbalance || 0;

  // Win Rate Color Logic
  const winRateColor = bot.winRate >= 60 ? 'text-emerald-400' : bot.winRate >= 40 ? 'text-amber-400' : 'text-red-400';

  // Strategy Badge Color
  const getStrategyBadge = (strat: StrategyType) => {
      switch(strat) {
          case StrategyType.SCALP_1M: return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
          case StrategyType.SWING_15M: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
          case StrategyType.TREND_4H: return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
          case StrategyType.ARBITRAGE: return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
          case StrategyType.HEDGE: return 'bg-red-500/20 text-red-400 border-red-500/30';
          default: return 'bg-slate-800 text-slate-500';
      }
  };

  const isExecuting = bot.status === BotStatus.EXECUTING;

  return (
    <div className={`relative bg-slate-900 rounded-xl p-5 border-l-4 ${bot.color} shadow-lg backdrop-blur-sm bg-opacity-90 transition-all duration-300 hover:bg-slate-800 hover:translate-y-[-2px] overflow-hidden`}>
      
      {/* Background Pulse if Active */}
      {isExecuting && (
        <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none"></div>
      )}
      {bot.status === BotStatus.HALTED && (
         <div className="absolute inset-0 bg-red-900/20 pointer-events-none flex items-center justify-center">
             <ShieldAlert size={64} className="text-red-500/20 animate-pulse" />
         </div>
      )}

      {/* HEADER & SEMAPHORE */}
      <div className="flex justify-between items-start mb-4">
        <div>
           <h3 className="font-bold text-lg text-white leading-none">{bot.name}</h3>
           <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">{bot.id} | {activePair}</span>
        </div>

        {/* THE SEMAPHORE (Traffic Light) */}
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-full border border-slate-800 shadow-inner">
            <span className="text-[9px] font-bold text-slate-500 tracking-wider mr-1">STATUS</span>
            <div className={`w-3 h-3 rounded-full ${semaphoreColor} ${semaphoreGlow}`}></div>
            <span className={`text-[10px] font-bold ${statusTextColor}`}>
                {semaphoreState}
            </span>
        </div>
      </div>

      {/* ACTIVE STRATEGY BADGE (LOCKED / AUTO) */}
      <div className="mb-4">
          <div className="flex items-center gap-2">
            <div 
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded border text-[10px] font-bold uppercase tracking-widest ${getStrategyBadge(bot.activeStrategy || StrategyType.SCALP_1M)}`}
                title="Strategy is controlled autonomously by the Neural Engine"
            >
                <Cpu size={12} />
                {bot.activeStrategy || 'AI_AUTO'}
                <div className="flex items-center gap-1 ml-1 opacity-70">
                    <span className="w-px h-3 bg-current mx-1 opacity-30"></span>
                    <Lock size={10} /> AUTO
                </div>
            </div>
            {isExecuting && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 p-1.5 rounded" title="High Frequency Trading Mode Active">
                    <Zap size={14} className="animate-pulse" fill="currentColor" />
                </div>
            )}
          </div>
      </div>

      {/* ASSET BREAKDOWN (The Core Logic View) */}
      <div className="bg-slate-950/60 rounded-lg p-3 border border-slate-800 space-y-2 mb-4">
          {/* Row 1: Cash */}
          <div className="flex justify-between items-center text-xs">
              <span className="flex items-center gap-1.5 text-slate-500 font-bold uppercase">
                  <Wallet size={12} /> {currencySymbol} Cash
              </span>
              <span className="font-mono text-white font-bold">
                  ${bot.balanceUsdt.toLocaleString('en-US', {maximumFractionDigits: 2})}
              </span>
          </div>
          
          {/* Row 2: Asset (Showing DUST if tiny) */}
          <div className="flex justify-between items-center text-xs">
              <span className="flex items-center gap-1.5 text-slate-500 font-bold uppercase">
                  <Coins size={12} /> Crypto Asset
              </span>
              <div className="text-right">
                  <span className={`font-mono font-bold block ${assetValue > 0 ? 'text-blue-400' : 'text-slate-600'}`}>
                      ${assetValue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </span>
                  {bot.holdingsCrypto > 0 && (
                      <span className="text-[9px] text-slate-500 font-mono block">
                         {bot.holdingsCrypto.toFixed(6)} BTC
                      </span>
                  )}
              </div>
          </div>

          {/* Row 3: Total Equity */}
          <div className="border-t border-slate-800/50 pt-2 mt-1 flex justify-between items-center text-xs">
              <span className="text-slate-400 font-bold uppercase">Total Equity</span>
              <span className="font-mono text-emerald-300 font-bold text-sm">
                  ${totalEquity.toLocaleString('en-US', {maximumFractionDigits: 2})}
              </span>
          </div>
      </div>

      {/* NEURAL CORTEX VISUALIZER */}
      {bot.neuralWeights && (
          <div className="mb-4 bg-slate-950/30 p-2 rounded-lg border border-slate-800/50">
              <div className="flex items-center gap-2 mb-2">
                   <Brain size={12} className="text-purple-400" />
                   <span className="text-[9px] uppercase font-bold text-slate-500">Live Neural Cortex</span>
              </div>
              <div className="flex items-end gap-1 h-8 justify-between px-1">
                  {Object.entries(bot.neuralWeights).map(([key, rawValue]) => {
                      const value = rawValue as number;
                      const height = Math.min(100, (value / 5) * 100);
                      const isHigh = value > 2.5;
                      return (
                          <div key={key} className="flex flex-col items-center gap-1 w-full group">
                              <div className="w-full bg-slate-800 rounded-sm relative h-full flex items-end overflow-hidden">
                                  <div 
                                    className={`w-full transition-all duration-700 ${isHigh ? 'bg-purple-500 shadow-[0_0_5px_#a855f7]' : 'bg-slate-600'}`} 
                                    style={{ height: `${height}%` }}
                                  ></div>
                              </div>
                              <span className="text-[6px] uppercase font-bold text-slate-600 group-hover:text-slate-300">{key.slice(0,3)}</span>
                          </div>
                      )
                  })}
              </div>
          </div>
      )}

      {/* ORDER BOOK DEPTH VISUALIZER */}
      <div className="mb-4">
          <div className="flex justify-between text-[9px] uppercase font-bold text-slate-500 mb-1">
               <span className="flex items-center gap-1"><Layers size={10} /> Market Depth (L2)</span>
               <span className={imbalance > 0 ? 'text-emerald-500' : 'text-red-500'}>
                   {imbalance > 0 ? 'BUY Pressure' : 'SELL Pressure'}
               </span>
          </div>
          <div className="h-1.5 w-full bg-slate-950 rounded-full flex overflow-hidden border border-slate-800/50">
               <div className="h-full bg-emerald-500/70" style={{ width: `${bidPct}%` }}></div>
               <div className="h-full bg-red-500/70" style={{ width: `${100 - bidPct}%` }}></div>
          </div>
      </div>

      {/* LIVE PNL & ACTION */}
      <div className="flex items-center justify-between border-t border-slate-800 pt-3 mb-3">
          <div>
              <span className="text-[10px] text-slate-500 uppercase block">Last Action</span>
              <span className="text-xs text-white font-bold truncate max-w-[120px] block" title={bot.lastAction}>
                  {bot.lastAction}
              </span>
          </div>
          <div className="text-right">
              <span className="text-[10px] text-slate-500 uppercase block">Realized P/L</span>
              <div className={`text-sm font-mono font-bold flex items-center gap-1 justify-end ${bot.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {bot.totalProfit >= 0 ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
                  ${bot.totalProfit.toFixed(2)}
              </div>
          </div>
      </div>

      {/* STATS SECTION: WIN RATE & TRADES */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-slate-950/50 rounded-lg p-2 border border-slate-800 flex items-center justify-between">
           <div className="flex items-center gap-1.5">
              <Trophy size={12} className="text-yellow-500 opacity-80" />
              <span className="text-[9px] font-bold text-slate-500 uppercase">Win Rate</span>
           </div>
           <span className={`text-sm font-mono font-bold ${winRateColor}`}>
              {bot.winRate.toFixed(1)}%
           </span>
        </div>
        
        <div className="bg-slate-950/50 rounded-lg p-2 border border-slate-800 flex items-center justify-between">
           <div className="flex items-center gap-1.5">
              <Hash size={12} className="text-blue-500 opacity-80" />
              <span className="text-[9px] font-bold text-slate-500 uppercase">Trades</span>
           </div>
           <span className="text-sm font-mono font-bold text-white">
              {bot.tradesCount}
           </span>
        </div>
      </div>

      {/* AI CONFIDENCE SECTION */}
      <div className="pt-2 border-t border-slate-800">
           <div className="flex justify-between text-[9px] uppercase font-bold text-slate-500 mb-1">
               <span className="flex items-center gap-1"><Activity size={10} /> Neural Confidence</span>
               <span className={bot.confidence > 70 ? 'text-emerald-400' : 'text-slate-400'}>{bot.confidence.toFixed(0)}%</span>
           </div>
           <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
               <div 
                  className={`h-full transition-all duration-500 ${bot.confidence > 70 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : bot.confidence > 40 ? 'bg-amber-500' : 'bg-blue-500'}`}
                  style={{ width: `${bot.confidence}%` }}
               ></div>
           </div>
      </div>

    </div>
  );
};

export default BotCard;