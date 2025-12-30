import React, { useEffect, useRef, useState } from 'react';
import { LogMessage, ExchangeName, BotState, MarketData, BotStatus } from '../types';
import { 
  Cpu, 
  Server, 
  Terminal, 
  Activity,
  Globe,
  Shield,
  Gauge,
  Calculator,
  ShieldAlert,
  Search
} from 'lucide-react';

interface IntelPanelProps {
  logs: LogMessage[];
  bots: BotState[];
  market: MarketData;
  exchangePrices: Record<ExchangeName, number>;
  currentView?: 'RISK_ENGINE' | 'EXCHANGES' | 'LOGS' | null; 
}

const IntelPanel: React.FC<IntelPanelProps> = ({ logs, bots, market, exchangePrices, currentView }) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [internalTab, setInternalTab] = useState<'EXCHANGES' | 'RISK_ENGINE' | 'LOGS'>('EXCHANGES');

  // Determine active tab: either from prop (controlled) or internal state
  const activeTab = currentView || internalTab;

  // Auto-scroll for logs
  useEffect(() => {
    if (activeTab === 'LOGS') {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, activeTab]);

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'BRAIN': return <Cpu size={14} className="text-purple-400" />;
      case 'SYSTEM': return <Server size={14} className="text-slate-400" />;
      case 'RISK_MGR': return <ShieldAlert size={14} className="text-red-500" />;
      case ExchangeName.BINANCE: return <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />;
      case ExchangeName.OKX: return <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />;
      case ExchangeName.MEXC: return <div className="w-2.5 h-2.5 rounded-full bg-green-500" />;
      case ExchangeName.KRAKEN: return <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />;
      default: return <Activity size={14} className="text-slate-400" />;
    }
  };

  // --- Helpers for Metrics ---
  const globalAveragePrice = market.price;
  
  const calculateSpread = (exchangePrice: number) => {
      if (!globalAveragePrice || !exchangePrice) return 0;
      return ((exchangePrice - globalAveragePrice) / globalAveragePrice) * 100;
  };

  const totalLiquidity = bots.reduce((acc, bot) => {
      const price = exchangePrices[bot.id] || market.price;
      return acc + bot.balanceUsdt + (bot.holdingsCrypto * price);
  }, 0);

  const totalExposure = bots.reduce((acc, bot) => {
      const price = exchangePrices[bot.id] || market.price;
      return acc + (bot.holdingsCrypto * price);
  }, 0);

  const exposurePercent = totalLiquidity > 0 ? (totalExposure / totalLiquidity) * 100 : 0;
  
  // CHECK FOR HALT
  const isHalted = bots.some(b => b.status === BotStatus.HALTED);

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 relative overflow-hidden">
      
      {/* SYSTEM ALERT BANNER */}
      {isHalted && (
          <div className="bg-red-600/90 backdrop-blur-sm p-4 flex items-center justify-center gap-3 animate-pulse shadow-2xl z-50 sticky top-0">
              <ShieldAlert className="text-white" size={24} />
              <span className="text-white text-lg font-bold uppercase tracking-widest">CIRCUIT BREAKER ACTIVE - TRADING HALTED</span>
          </div>
      )}

      {/* Internal Tabs (Only show if NOT controlled externally) */}
      {!currentView && (
        <div className="flex items-center border-b border-slate-800 bg-slate-900/50 flex-shrink-0">
          <button onClick={() => setInternalTab('EXCHANGES')} className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider ${activeTab === 'EXCHANGES' ? 'text-blue-400 bg-blue-500/10 border-b-2 border-blue-500' : 'text-slate-500 hover:text-white'}`}>Exchanges</button>
          <button onClick={() => setInternalTab('RISK_ENGINE')} className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider ${activeTab === 'RISK_ENGINE' ? 'text-amber-400 bg-amber-500/10 border-b-2 border-amber-500' : 'text-slate-500 hover:text-white'}`}>Risk Engine</button>
          <button onClick={() => setInternalTab('LOGS')} className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider ${activeTab === 'LOGS' ? 'text-blue-400 bg-blue-500/10 border-b-2 border-blue-500' : 'text-slate-500 hover:text-white'}`}>Sys Logs</button>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 overflow-y-auto custom-scrollbar p-8">
        
        {/* --- TAB: EXCHANGES --- */}
        {activeTab === 'EXCHANGES' && (
             <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
                
                {/* Global Market Header */}
                <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800 flex flex-col md:flex-row justify-between items-center shadow-2xl gap-6">
                    <div className="flex items-center gap-6">
                        <div className="p-4 bg-blue-600/20 rounded-full text-blue-400 ring-1 ring-blue-500/50 shadow-[0_0_20px_rgba(37,99,235,0.2)]">
                           <Globe size={32} />
                        </div>
                        <div>
                            <span className="text-sm text-slate-400 font-bold uppercase tracking-widest block mb-1">Global Oracle Feed</span>
                            <span className="text-4xl font-mono text-white font-bold tracking-tight">{market.symbol}</span>
                        </div>
                    </div>
                    <div className="text-center md:text-right bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
                         <span className="text-xs text-slate-500 font-bold uppercase block mb-1">Weighted Average Price</span>
                         <span className="text-4xl font-mono text-blue-300 font-bold">
                             ${market.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                         </span>
                    </div>
                </div>

                {/* Exchange Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-6">
                    {bots.map((bot) => {
                        const price = exchangePrices[bot.id] || market.price;
                        const spread = calculateSpread(price);
                        const isSpreadPos = spread >= 0;
                        const totalValue = bot.balanceUsdt + (bot.holdingsCrypto * price);

                        return (
                            <div key={bot.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all shadow-lg hover:shadow-2xl hover:-translate-y-1">
                                <div className="flex justify-between items-center mb-6">
                                    <h4 className="font-bold text-2xl text-white flex items-center gap-4">
                                        <div className={`w-4 h-4 rounded-full ${bot.status === BotStatus.EXECUTING ? 'bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]' : 'bg-slate-600'}`} />
                                        {bot.id}
                                    </h4>
                                    <span className={`text-xs px-3 py-1.5 rounded-lg font-mono font-bold border ${bot.status === BotStatus.EXECUTING ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                                        {bot.status}
                                    </span>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                                        <span className="text-[10px] text-slate-500 block font-bold uppercase mb-1">Real-Time Price</span>
                                        <span className="text-xl font-mono text-slate-200">${price.toFixed(2)}</span>
                                    </div>
                                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                                        <span className="text-[10px] text-slate-500 block font-bold uppercase mb-1">Arbitrage Spread</span>
                                        <span className={`text-xl font-mono font-bold ${Math.abs(spread) > 0.05 ? (isSpreadPos ? 'text-emerald-400' : 'text-red-400') : 'text-slate-400'}`}>
                                            {spread > 0 ? '+' : ''}{spread.toFixed(3)}%
                                        </span>
                                    </div>
                                </div>

                                {/* Asset Allocation Bar */}
                                <div className="space-y-3">
                                    <div className="flex justify-between text-xs text-slate-400 uppercase font-bold tracking-wider">
                                        <span>USDT (Liquidity)</span>
                                        <span>Crypto (Asset)</span>
                                    </div>
                                    <div className="h-4 w-full bg-slate-950 rounded-full overflow-hidden flex border border-slate-800/50">
                                        <div 
                                            className="h-full bg-slate-700"
                                            style={{ width: `${(bot.balanceUsdt / (totalValue || 1)) * 100}%` }}
                                        />
                                        <div 
                                            className="h-full bg-blue-600"
                                            style={{ width: `${100 - ((bot.balanceUsdt / (totalValue || 1)) * 100)}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-sm font-mono text-slate-400 pt-1">
                                        <span>${bot.balanceUsdt.toLocaleString()}</span>
                                        <span className="text-blue-400">${(bot.holdingsCrypto * price).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
             </div>
        )}

        {/* --- TAB: RISK ENGINE (STATS) --- */}
        {activeTab === 'RISK_ENGINE' && (
             <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
                
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                    <Shield size={32} className="text-amber-500" />
                    Risk Management Core
                </h2>

                {/* Circuit Breaker Status */}
                <div className={`p-8 rounded-2xl border-2 flex items-center justify-between shadow-2xl transition-all ${isHalted ? 'bg-red-500/10 border-red-500/50 shadow-[0_0_30px_rgba(220,38,38,0.2)]' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
                    <div className="flex items-center gap-6">
                        <div className={`p-5 rounded-full ring-1 ${isHalted ? 'bg-red-500/20 text-red-500 ring-red-500/40' : 'bg-emerald-500/20 text-emerald-500 ring-emerald-500/40'}`}>
                             <ShieldAlert size={40} />
                        </div>
                        <div>
                             <h3 className={`text-2xl font-bold ${isHalted ? 'text-red-400' : 'text-emerald-400'}`}>
                                GLOBAL CIRCUIT BREAKER
                             </h3>
                             <p className="text-slate-400 mt-2 max-w-xl">
                                 Autonomous protection system. Monitors daily PnL and instantly halts trading if drawdown limits (-$500.00) are exceeded in a 24h window.
                             </p>
                        </div>
                    </div>
                    <div className={`px-6 py-3 rounded-lg text-sm font-bold tracking-widest uppercase border ${isHalted ? 'bg-red-500 text-white border-red-400 animate-pulse' : 'bg-slate-900 text-emerald-500 border-emerald-500/30'}`}>
                        {isHalted ? 'SYSTEM TRIPPED' : 'SYSTEM ARMED'}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Total Equity Card */}
                    <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Gauge size={150} className="text-white" />
                        </div>
                        <span className="text-sm text-slate-500 uppercase font-bold tracking-widest block mb-4">Total System Liquidity</span>
                        <div className="text-5xl font-mono font-bold text-white mb-8">
                            ${totalLiquidity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        
                        {/* Exposure Meter */}
                        <div className="mt-auto">
                            <div className="flex justify-between text-sm text-slate-400 mb-3 font-bold">
                                <span>Cash Reserves (Risk Free)</span>
                                <span className={exposurePercent > 50 ? 'text-amber-400' : 'text-blue-400'}>{exposurePercent.toFixed(1)}% Active Risk</span>
                            </div>
                            <div className="h-6 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800 relative">
                                {/* Grid lines on bar */}
                                <div className="absolute inset-0 flex justify-between px-2">
                                    {[1,2,3,4,5,6,7,8,9].map(i => <div key={i} className="w-px h-full bg-slate-900/50 z-10"></div>)}
                                </div>
                                <div 
                                    className={`h-full transition-all duration-1000 ${exposurePercent > 80 ? 'bg-red-500 shadow-[0_0_20px_#ef4444]' : exposurePercent > 40 ? 'bg-amber-500 shadow-[0_0_20px_#f59e0b]' : 'bg-emerald-500 shadow-[0_0_20px_#10b981]'}`}
                                    style={{ width: `${exposurePercent}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>

                    {/* Kelly Criterion Visualization */}
                    <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 relative shadow-xl flex flex-col justify-center">
                        <h3 className="text-xl font-bold text-blue-400 mb-6 flex items-center gap-3">
                            <Calculator size={24} /> Kelly Criterion Logic
                        </h3>
                        
                        <div className="space-y-5">
                            <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-3">
                                <span className="text-slate-400 font-bold">Estimated Win Rate</span>
                                <span className="text-emerald-400 font-mono font-bold text-lg bg-emerald-500/10 px-2 rounded">~65.0%</span>
                            </div>
                            <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-3">
                                <span className="text-slate-400 font-bold">Avg Reward/Risk Ratio</span>
                                <span className="text-white font-mono font-bold text-lg bg-slate-800 px-2 rounded">1.5:1</span>
                            </div>
                            <div className="flex justify-between items-center text-base pt-2">
                                <span className="text-slate-200 font-bold uppercase tracking-wider">Optimal Stake Size</span>
                                <span className="text-amber-400 font-mono font-bold text-2xl">~28.3%</span>
                            </div>
                        </div>
                        
                        <div className="mt-8 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 text-xs text-amber-200/60 leading-relaxed font-mono">
                            > WARNING: "Half-Kelly" strategy is currently forced for capital preservation.<br/>
                            > Actual trade size is capped at max 40% of available wallet balance to prevent ruin sequences.
                        </div>
                    </div>
                </div>
             </div>
        )}

        {/* --- TAB: LOGS (Full Screen) --- */}
        {activeTab === 'LOGS' && (
             <div className="h-full flex flex-col bg-[#050a14] rounded-xl border border-slate-800 overflow-hidden shadow-2xl animate-fade-in">
                 <div className="p-4 border-b border-slate-800 bg-slate-900 flex justify-between flex-shrink-0 items-center">
                     <span className="flex items-center gap-3 text-sm font-bold text-slate-300">
                         <Terminal size={18} className="text-blue-500"/> 
                         SYSTEM OUTPUT STREAM
                     </span>
                     <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                            LIVE CONNECTION
                        </div>
                        <span className="bg-slate-800 px-3 py-1 rounded text-xs font-mono text-slate-400 border border-slate-700">v4.2.1-stable</span>
                     </div>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto p-6 custom-scrollbar font-mono text-sm space-y-3 bg-[#050a14]">
                    {logs.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-700 italic">
                            <Activity size={64} className="mb-6 opacity-20 animate-pulse" />
                            <p className="text-lg">System Initializing...</p>
                            <p className="text-sm opacity-50">Waiting for neural events.</p>
                        </div>
                    )}
                    {logs.map((log) => (
                        <div key={log.id} className="flex gap-4 items-start group hover:bg-slate-900/30 p-1 -mx-2 px-2 rounded transition-colors">
                            <span className="text-slate-600 text-[10px] w-20 flex-shrink-0 pt-0.5">
                                {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                            <span className="text-slate-500 text-[10px] w-16 flex-shrink-0 pt-0.5 font-bold flex items-center gap-1">
                                {getSourceIcon(log.source)}
                                {log.source}
                            </span>
                            <span className={`break-all leading-relaxed ${
                                log.type === 'SUCCESS' ? 'text-emerald-400' :
                                log.type === 'ERROR' || log.type === 'CRITICAL' ? 'text-red-400 font-bold' :
                                log.type === 'WARNING' ? 'text-amber-400' :
                                'text-slate-300'
                            }`}>
                                {log.message}
                            </span>
                        </div>
                    ))}
                    <div ref={bottomRef} />
                 </div>
             </div>
        )}

        </div>
      </div>
    </div>
  );
};

export default IntelPanel;