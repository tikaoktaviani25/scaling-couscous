import React, { useState, useEffect } from 'react';
import { 
  BotState, 
  MarketData, 
  LogMessage, 
  BrainConfig, 
  BotStatus, 
  ExchangeName,
  ExecutionPoint,
  GlobalSettings,
  SwotAnalysis,
  StrategyType
} from './types';
import { INITIAL_BOTS } from './constants';
import BotCard from './components/BotCard';
import IntelViews from './components/TelegramFeed';
import PortfolioChart from './components/PortfolioChart';
import SettingsModal from './components/SettingsModal';
import TradeHistoryTable from './components/TradeHistoryTable'; 
import BacktestPanel from './components/BacktestPanel'; 
import GodModeWidget from './components/GodModeWidget';
import SwotMatrix from './components/SwotMatrix'; // IMPORTED SWOT
import { persistence } from './services/persistenceService';
import { 
  BrainCircuit, 
  Settings,
  ShieldAlert,
  Database,
  Globe,
  LayoutDashboard,
  Terminal,
  ChevronRight,
  ChevronLeft,
  WifiOff,
  HardDrive,
  FlaskConical,
  X,
  CheckCircle,
  AlertTriangle,
  Activity,
  Zap
} from 'lucide-react';

// --- TOAST COMPONENT ---
const Toast = ({ message, type, onClose }: { message: string, type: string, onClose: () => void }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 5000);
        return () => clearTimeout(timer);
    }, [onClose]);

    let bg = 'bg-slate-800';
    let icon = <Terminal size={16} />;
    
    if (type === 'SUCCESS') { bg = 'bg-emerald-900/90 border-emerald-500'; icon = <CheckCircle size={16} className="text-emerald-400" />; }
    if (type === 'ERROR' || type === 'CRITICAL') { bg = 'bg-red-900/90 border-red-500'; icon = <ShieldAlert size={16} className="text-red-400" />; }
    if (type === 'WARNING') { bg = 'bg-amber-900/90 border-amber-500'; icon = <AlertTriangle size={16} className="text-amber-400" />; }

    return (
        <div className={`fixed bottom-8 right-8 z-50 p-4 rounded-xl border ${bg} text-white shadow-2xl flex items-start gap-3 max-w-sm animate-fade-in backdrop-blur-sm`}>
            <div className="mt-0.5">{icon}</div>
            <div className="flex-1">
                <p className="text-sm font-bold leading-tight">{message}</p>
                <span className="text-[10px] opacity-70 mt-1 block font-mono">{new Date().toLocaleTimeString()}</span>
            </div>
            <button onClick={onClose} className="text-white/50 hover:text-white"><X size={14}/></button>
        </div>
    );
};

const App: React.FC = () => {
  // --- STATE INITIALIZATION ---
  const [isHydrating, setIsHydrating] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'ONLINE' | 'OFFLINE'>('ONLINE');
  const [latency, setLatency] = useState<number>(0);
  const [activeView, setActiveView] = useState<'DASHBOARD' | 'RISK' | 'EXCHANGES' | 'LOGS' | 'BACKTEST'>('DASHBOARD');
  
  const [bots, setBots] = useState<BotState[]>(INITIAL_BOTS);
  
  const [config, setConfig] = useState<BrainConfig>({
    riskLevel: 'MEDIUM',
    strategy: 'AI_ADAPTIVE',
    autoTrade: false,
    activePair: 'BTCUSDT',
    tradingMode: 'PAPER'
  });

  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({
    telegramBotToken: '',
    telegramChatId: '',
    exchanges: {
        [ExchangeName.BINANCE]: { apiKey: '', apiSecret: '', isActive: true },
        [ExchangeName.OKX]: { apiKey: '', apiSecret: '', isActive: true },
        [ExchangeName.MEXC]: { apiKey: '', apiSecret: '', isActive: true },
        [ExchangeName.KRAKEN]: { apiKey: '', apiSecret: '', isActive: true },
    }
  });

  const [executions, setExecutions] = useState<ExecutionPoint[]>([]);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [toast, setToast] = useState<{message: string, type: string} | null>(null);
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Market State (Synced from Server)
  const [market, setMarket] = useState<MarketData>({
    symbol: 'BTC/USDT',
    price: 0, 
    trend: 'FLAT',
    volatility: 0,
    timestamp: Date.now(),
    globalRegime: 'CRAB',
    sentimentIndex: 50
  });

  const [swotData, setSwotData] = useState<SwotAnalysis | null>(null); // NEW STATE
  
  const [exchangePrices, setExchangePrices] = useState<Record<ExchangeName, number>>({
    [ExchangeName.BINANCE]: 0,
    [ExchangeName.OKX]: 0,
    [ExchangeName.MEXC]: 0,
    [ExchangeName.KRAKEN]: 0,
  });
  
  const [portfolioHistory, setPortfolioHistory] = useState<{timestamp: number, value: number}[]>([]);

  // --- VPS CONNECTION (POLLING) ---
  useEffect(() => {
    let mounted = true;
    let lastLogId = '';

    const syncWithVps = async () => {
        const startTime = performance.now();
        try {
            const state = await persistence.loadFullState();
            const endTime = performance.now();
            
            if (mounted) {
                setLatency(Math.round(endTime - startTime));
                
                if (state) {
                    // Sync Core State
                    setBots(state.bots);
                    setConfig(state.config);
                    setGlobalSettings(state.globalSettings);
                    if (state.executions) setExecutions(state.executions);
                    
                    // NEW: Sync Real-Time Logs & TOASTS
                    if (state.logs) {
                        setLogs(state.logs);
                        const latestLog = state.logs[state.logs.length - 1];
                        if (latestLog && latestLog.id !== lastLogId) {
                             lastLogId = latestLog.id;
                             // Trigger Toast for significant events
                             if (['SUCCESS', 'ERROR', 'CRITICAL', 'WARNING'].includes(latestLog.type)) {
                                 setToast({ message: latestLog.message, type: latestLog.type });
                             }
                        }
                    }
                    
                    // Sync Market Data (The God View)
                    let derivedGlobalPrice = 0;
                    
                    // If backend provides market data, use it. Else fallback (for older backend versions)
                    if ((state as any).market) {
                        setMarket((state as any).market);
                        derivedGlobalPrice = (state as any).market.price;
                    } else {
                         // Fallback derivation
                         const masterBot = state.bots.find(b => b.id === ExchangeName.BINANCE) || state.bots[0];
                         if (masterBot && masterBot.currentPrice) {
                             derivedGlobalPrice = masterBot.currentPrice;
                             setMarket(prev => ({
                                 ...prev,
                                 symbol: state.config.activePair,
                                 price: masterBot.currentPrice || 0,
                             }));
                         }
                    }

                    // NEW: SYNC SWOT
                    if (state.swot) {
                        setSwotData(state.swot);
                    }

                    // Sync Exchange Prices
                    const prices: Record<string, number> = {
                        [ExchangeName.BINANCE]: derivedGlobalPrice,
                        [ExchangeName.OKX]: derivedGlobalPrice,
                        [ExchangeName.MEXC]: derivedGlobalPrice,
                        [ExchangeName.KRAKEN]: derivedGlobalPrice,
                    };
                    
                    state.bots.forEach(b => {
                        if (b.currentPrice && b.currentPrice > 0) {
                            prices[b.id] = b.currentPrice;
                        }
                    });
                    
                    setExchangePrices(prices as Record<ExchangeName, number>);

                    setConnectionStatus('ONLINE');
                    setIsHydrating(false);
                } else {
                    setConnectionStatus('OFFLINE');
                    setIsHydrating(false);
                }
            }
        } catch (error: any) {
            if (mounted) {
                setConnectionStatus('OFFLINE');
                setIsHydrating(false); 
            }
        }
    };

    // Initial Load
    syncWithVps();

    const interval = setInterval(syncWithVps, 1000); 
    return () => {
        mounted = false;
        clearInterval(interval);
    };
  }, []);

  const handleConfigUpdate = async (newConfig: Partial<BrainConfig>) => {
      const updatedConfig = { ...config, ...newConfig };
      setConfig(updatedConfig);
      await persistence.saveFullState({ bots, config: updatedConfig, globalSettings, executions, logs, market });
  };

  const handleSettingsSave = async (newSettings: GlobalSettings) => {
      setGlobalSettings(newSettings);
      await persistence.saveFullState({ bots, config, globalSettings: newSettings, executions, logs, market });
  };

  const handleUpdateBots = async (newBots: BotState[]) => {
      setBots(newBots);
      await persistence.saveFullState({ bots: newBots, config, globalSettings, executions, logs, market });
  };

  const handleFactoryReset = async () => {
    if(window.confirm("CONFIRM: WIPE VPS DISK DATABASE? This cannot be undone.")) {
        try {
            await persistence.factoryReset();
            window.location.reload();
        } catch(e) { alert("Failed to reset. Backend offline."); }
    }
  };

  const calculateMetrics = () => {
    const totalCash = bots.reduce((acc, bot) => acc + bot.balanceUsdt, 0);
    const totalCryptoValue = bots.reduce((acc, bot) => {
        const price = exchangePrices[bot.id] || market.price;
        return acc + (bot.holdingsCrypto * price);
    }, 0);
    const totalEquity = totalCash + totalCryptoValue;
    const startOfDay = new Date();
    startOfDay.setHours(0,0,0,0);
    const dailyPnL = executions
        .filter(e => e.timestamp >= startOfDay.getTime())
        .reduce((acc, e) => acc + (e.realizedPnL || 0), 0);

    // Update History only if needed
    if (portfolioHistory.length === 0 || Date.now() - portfolioHistory[portfolioHistory.length-1].timestamp > 60000) {
        setPortfolioHistory(prev => [...prev, { timestamp: Date.now(), value: totalEquity }].slice(-100));
    }
    
    return { totalEquity, totalCash, dailyPnL };
  };

  const { totalEquity, dailyPnL } = calculateMetrics();

  if (isHydrating) {
    return (
        <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-center text-blue-500">
            <HardDrive size={64} className="animate-pulse mb-4" />
            <h1 className="text-xl font-bold tracking-widest uppercase">Mounting VPS Storage...</h1>
            <span className="text-xs text-slate-500 mt-2 font-mono">/data/bot_state.json</span>
        </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden selection:bg-blue-500/30 relative">
      
      {/* GLOBAL TOAST */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {connectionStatus === 'OFFLINE' && (
           <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 animate-fade-in">
                <div className="bg-slate-900 border-2 border-red-500/50 p-8 rounded-2xl max-w-md text-center shadow-2xl">
                    <WifiOff size={48} className="text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">VPS DISCONNECTED</h2>
                    <p className="text-slate-400 mb-6 text-sm">
                        Lost connection to the brain (backend). The interface is paused to prevent state desynchronization.
                        <br/><br/>
                        <span className="font-mono text-xs bg-slate-950 p-1 rounded">Attempting to reconnect...</span>
                    </p>
                    <button onClick={() => window.location.reload()} className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-colors">
                        Force Reload
                    </button>
                </div>
           </div>
      )}

      {/* --- SIDEBAR --- */}
      <aside className={`${isSidebarCollapsed ? 'w-20' : 'w-72'} bg-[#0a0f1c] border-r border-slate-800 flex flex-col transition-all duration-300 relative z-20 flex-shrink-0`}>
        <div className="h-20 flex items-center justify-center border-b border-slate-800/50 relative">
            {isSidebarCollapsed ? (
                <BrainCircuit size={32} className="text-blue-500 animate-pulse-slow" />
            ) : (
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <BrainCircuit size={32} className="text-blue-500" />
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0a0f1c] animate-pulse"></div>
                    </div>
                    <div>
                        <h1 className="font-bold text-lg text-white leading-none tracking-tight">CRYPTO<span className="text-blue-500">BRAIN</span></h1>
                        <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">VPS Core v7.0</span>
                    </div>
                </div>
            )}
            <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="absolute -right-3 top-1/2 -translate-y-1/2 bg-slate-800 text-slate-400 p-1 rounded-full border border-slate-700 hover:text-white hover:bg-slate-700 transition-all z-50">
                {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
        </div>

        <div className="flex-1 py-8 overflow-y-auto px-4 space-y-2">
            <button onClick={() => setActiveView('DASHBOARD')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all group ${activeView === 'DASHBOARD' ? 'bg-blue-600 shadow-lg shadow-blue-900/50 text-white' : 'hover:bg-slate-800/50 text-slate-400 hover:text-white'}`}>
                <LayoutDashboard size={20} className={activeView === 'DASHBOARD' ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'} />
                {!isSidebarCollapsed && <span className="font-bold text-sm tracking-wide">Dashboard</span>}
            </button>
            
            <button onClick={() => setActiveView('BACKTEST')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all group ${activeView === 'BACKTEST' ? 'bg-purple-600 shadow-lg shadow-purple-900/50 text-white' : 'hover:bg-slate-800/50 text-slate-400 hover:text-white'}`}>
                <FlaskConical size={20} className={activeView === 'BACKTEST' ? 'text-white' : 'text-slate-500 group-hover:text-purple-400'} />
                {!isSidebarCollapsed && <span className="font-bold text-sm tracking-wide">Deep Learning</span>}
            </button>

            <button onClick={() => setActiveView('RISK')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all group ${activeView === 'RISK' ? 'bg-amber-600 shadow-lg shadow-amber-900/50 text-white' : 'hover:bg-slate-800/50 text-slate-400 hover:text-white'}`}>
                <ShieldAlert size={20} className={activeView === 'RISK' ? 'text-white' : 'text-slate-500 group-hover:text-amber-400'} />
                {!isSidebarCollapsed && <span className="font-bold text-sm tracking-wide">Risk Engine</span>}
            </button>
            <button onClick={() => setActiveView('EXCHANGES')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all group ${activeView === 'EXCHANGES' ? 'bg-emerald-600 shadow-lg shadow-emerald-900/50 text-white' : 'hover:bg-slate-800/50 text-slate-400 hover:text-white'}`}>
                <Globe size={20} className={activeView === 'EXCHANGES' ? 'text-white' : 'text-slate-500 group-hover:text-emerald-400'} />
                {!isSidebarCollapsed && <span className="font-bold text-sm tracking-wide">Exchanges</span>}
            </button>
            <button onClick={() => setActiveView('LOGS')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all group ${activeView === 'LOGS' ? 'bg-slate-700 shadow-lg text-white' : 'hover:bg-slate-800/50 text-slate-400 hover:text-white'}`}>
                <Terminal size={20} className={activeView === 'LOGS' ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'} />
                {!isSidebarCollapsed && <span className="font-bold text-sm tracking-wide">Sys Logs</span>}
            </button>
        </div>

        <div className="p-4 border-t border-slate-800/50 bg-[#080c17]">
             {!isSidebarCollapsed && <h4 className="text-[10px] uppercase font-bold text-slate-500 mb-3 tracking-widest">Master Control</h4>}
             
             <div className="space-y-3">
                 <div className="grid grid-cols-2 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 relative">
                     <button
                         onClick={() => !config.autoTrade && handleConfigUpdate({ tradingMode: 'PAPER' })}
                         disabled={config.autoTrade}
                         className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                             config.tradingMode === 'PAPER' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/50' : 'text-slate-500 hover:text-slate-300'
                         }`}
                     >
                        <Database size={12} /> {!isSidebarCollapsed && 'PAPER'}
                     </button>
                     <button
                         onClick={() => !config.autoTrade && handleConfigUpdate({ tradingMode: 'LIVE' })}
                         disabled={config.autoTrade}
                         className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                             config.tradingMode === 'LIVE' ? 'bg-red-600/20 text-red-500 border border-red-500/50 animate-pulse' : 'text-slate-500 hover:text-slate-300'
                         }`}
                     >
                         <WifiOff size={12} /> {!isSidebarCollapsed && 'LIVE'}
                     </button>
                     
                     {config.autoTrade && (
                         <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center rounded-lg z-10 cursor-not-allowed" title="Stop Autotrade to change mode">
                             <ShieldAlert size={12} className="text-slate-500"/>
                         </div>
                     )}
                 </div>

                 <button
                    onClick={() => handleConfigUpdate({ autoTrade: !config.autoTrade })}
                    className={`w-full py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg ${
                        config.autoTrade 
                        ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/20 animate-pulse' 
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20'
                    }`}
                 >
                    {config.autoTrade ? 'STOP ENGINE' : 'START ENGINE'}
                 </button>

                 <button
                     onClick={() => setShowSettings(true)}
                     className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-slate-700"
                 >
                     <Settings size={14} /> {!isSidebarCollapsed && 'SETTINGS'}
                 </button>
             </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
          
          {/* Header */}
          <header className="h-20 border-b border-slate-800 flex items-center justify-between px-8 bg-slate-950/50 backdrop-blur-sm z-10">
              <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                  {activeView === 'DASHBOARD' && 'Mission Control'}
                  {activeView === 'RISK' && 'Risk Management Core'}
                  {activeView === 'EXCHANGES' && 'Exchange Connectivity'}
                  {activeView === 'LOGS' && 'System Terminals'}
                  {activeView === 'BACKTEST' && 'Deep Learning Lab'}
                  {config.autoTrade && <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full animate-pulse ml-2">LIVE EXECUTION</span>}
              </h2>
              
              <div className="flex items-center gap-8">
                  {/* Latency / Heartbeat Monitor */}
                  <div className="hidden md:flex items-center gap-3 bg-slate-900/50 px-3 py-1.5 rounded-full border border-slate-800">
                      <div className="relative flex items-center justify-center w-3 h-3">
                           {connectionStatus === 'ONLINE' ? (
                               <>
                                 <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping"></span>
                                 <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                               </>
                           ) : (
                               <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                           )}
                      </div>
                      <div className="flex flex-col leading-none">
                          <span className={`text-[9px] font-bold uppercase tracking-wider ${connectionStatus === 'ONLINE' ? 'text-emerald-400' : 'text-red-500'}`}>
                              {connectionStatus === 'ONLINE' ? 'NEURAL LINK' : 'OFFLINE'}
                          </span>
                          <span className="text-[9px] font-mono text-slate-500">
                              PING: {latency}ms
                          </span>
                      </div>
                      <Activity size={14} className={`${connectionStatus === 'ONLINE' ? 'text-blue-500 animate-pulse' : 'text-slate-600'}`} />
                  </div>

                  <div className="text-right hidden md:block">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Daily PnL</span>
                      <span className={`text-lg font-mono font-bold ${dailyPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {dailyPnL >= 0 ? '+' : ''}{dailyPnL.toFixed(2)} USDT
                      </span>
                  </div>
                  <div className="text-right hidden md:block">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Total Equity</span>
                      <span className="text-lg font-mono font-bold text-blue-400">
                          ${totalEquity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                  </div>
              </div>
          </header>

          {/* VIEWPORT */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-[#0b121e]">
              <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
                  
                  {activeView === 'DASHBOARD' && (
                      <>
                        {/* THE GOD MODE WIDGET */}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            <GodModeWidget market={market} />
                            {/* NEW: SWOT ANALYSIS */}
                            {swotData && <SwotMatrix data={swotData} />}
                        </div>

                        {/* CHARTS & STATS */}
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                            <div className="xl:col-span-2">
                                <PortfolioChart 
                                    data={portfolioHistory} 
                                    executions={executions}
                                />
                            </div>
                            <div className="xl:col-span-1 space-y-4">
                                <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex items-center justify-between">
                                     <div>
                                         <span className="text-xs text-slate-500 uppercase font-bold">Active Pair</span>
                                         <h3 className="text-2xl font-bold text-white">{market.symbol}</h3>
                                     </div>
                                     <div className="text-right">
                                         <span className="text-xs text-slate-500 uppercase font-bold">Oracle Price</span>
                                         <div className="text-xl font-mono text-blue-300 font-bold">
                                             ${market.price.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                         </div>
                                     </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 h-full max-h-[140px]">
                                     <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-center">
                                          <span className="text-[10px] text-slate-500 uppercase font-bold">24h Volatility</span>
                                          <span className="text-2xl font-mono text-amber-400 mt-1">{(market.volatility * 100).toFixed(2)}%</span>
                                     </div>
                                     <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-center">
                                          <span className="text-[10px] text-slate-500 uppercase font-bold">Active Bots</span>
                                          <span className="text-2xl font-mono text-emerald-400 mt-1">{bots.filter(b => b.status === BotStatus.EXECUTING).length}/{bots.length}</span>
                                     </div>
                                </div>
                            </div>
                        </div>

                        {/* BOT GRID */}
                        <h3 className="text-lg font-bold text-white mt-4 flex items-center gap-2">
                            <BrainCircuit size={20} className="text-blue-500" /> Active Neural Agents
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {bots.map(bot => (
                                <BotCard 
                                    key={bot.id} 
                                    bot={bot} 
                                    activePair={config.activePair} 
                                    recentTrades={executions.filter(e => e.botId === bot.id).slice(-5)}
                                />
                            ))}
                        </div>

                        {/* HISTORY */}
                        <div className="mt-8">
                            <TradeHistoryTable executions={executions} />
                        </div>
                      </>
                  )}

                  {(activeView === 'RISK' || activeView === 'EXCHANGES' || activeView === 'LOGS') && (
                      <div className="h-[calc(100vh-140px)]">
                           <IntelViews 
                                logs={logs} 
                                bots={bots} 
                                market={market}
                                exchangePrices={exchangePrices}
                                currentView={activeView === 'RISK' ? 'RISK_ENGINE' : activeView === 'EXCHANGES' ? 'EXCHANGES' : 'LOGS'} 
                            />
                      </div>
                  )}

                  {activeView === 'BACKTEST' && (
                       <div className="h-[calc(100vh-140px)]">
                           <BacktestPanel />
                       </div>
                  )}

              </div>
          </div>
      </main>

      {/* MODALS */}
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)}
        settings={globalSettings}
        config={config}
        bots={bots}
        onSave={handleSettingsSave}
        onUpdateBots={handleUpdateBots}
        onFactoryReset={handleFactoryReset}
      />
    </div>
  );
};

export default App;