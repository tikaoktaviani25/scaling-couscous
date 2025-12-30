import React, { useState } from 'react';
import { ExchangeName, GlobalSettings, BotState, BrainConfig, StrategyType } from '../types';
import { X, Save, Eye, EyeOff, Lock, Key, Send, Wallet, RefreshCw, Trash2, ShieldCheck, Info, AlertTriangle, Zap, Database, Skull, Activity } from 'lucide-react';
import { persistence } from '../services/persistenceService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GlobalSettings;
  config: BrainConfig;
  bots: BotState[];
  onSave: (newSettings: GlobalSettings) => void;
  onUpdateBots: (newBots: BotState[]) => void;
  onFactoryReset?: () => void; 
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, config, bots, onSave, onUpdateBots, onFactoryReset }) => {
  const [localSettings, setLocalSettings] = useState<GlobalSettings>(settings);
  const [localBots, setLocalBots] = useState<BotState[]>(bots);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'EXCHANGES' | 'TELEGRAM' | 'PORTFOLIO' | 'DANGER'>('PORTFOLIO');
  const [isPanicConfirming, setIsPanicConfirming] = useState(false);

  if (!isOpen) return null;

  const isLive = config.tradingMode === 'LIVE';

  const toggleSecret = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const updateExchange = (exchange: ExchangeName, field: 'apiKey' | 'apiSecret', value: string) => {
    setLocalSettings(prev => ({
      ...prev,
      exchanges: {
        ...prev.exchanges,
        [exchange]: {
          ...prev.exchanges[exchange],
          [field]: value
        }
      }
    }));
  };

  const updateBotState = (id: ExchangeName, field: keyof BotState, value: any) => {
      // In Live mode, balance updates are blocked, but Strategy updates are ALLOWED
      if (isLive && (field === 'balanceUsdt' || field === 'holdingsCrypto')) return; 
      
      setLocalBots(prev => prev.map(b => 
          b.id === id ? { ...b, [field]: value } : b
      ));
  };

  const handleSave = () => {
    onSave(localSettings);
    onUpdateBots(localBots);
    onClose();
  };

  const triggerPanic = async () => {
      try {
          await persistence.panicSell();
          alert("PANIC PROTOCOL EXECUTED. ALL ASSETS LIQUIDATED. SYSTEM HALTED.");
          window.location.reload();
      } catch (e) {
          alert("Error executing panic protocol. Check logs.");
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#0f172a] w-full max-w-4xl rounded-2xl border border-slate-700 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-fade-in">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-900">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Lock className="text-blue-500" size={20} />
              Centro de Comando
            </h2>
            <p className="text-xs text-slate-400 mt-1">Configuração Segura do Núcleo Algorítmico.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700 bg-slate-900/50 overflow-x-auto">
           <button 
             onClick={() => setActiveTab('PORTFOLIO')}
             className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 whitespace-nowrap ${activeTab === 'PORTFOLIO' ? 'border-blue-500 text-blue-400 bg-blue-500/5' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
           >
             Gestão de Portfólio & Estratégia
           </button>
           <button 
             onClick={() => setActiveTab('EXCHANGES')}
             className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 whitespace-nowrap ${activeTab === 'EXCHANGES' ? 'border-blue-500 text-blue-400 bg-blue-500/5' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
           >
             API Keys
           </button>
           <button 
             onClick={() => setActiveTab('TELEGRAM')}
             className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 whitespace-nowrap ${activeTab === 'TELEGRAM' ? 'border-blue-500 text-blue-400 bg-blue-500/5' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
           >
             Telegram Bot
           </button>
           <button 
             onClick={() => setActiveTab('DANGER')}
             className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 whitespace-nowrap ${activeTab === 'DANGER' ? 'border-red-500 text-red-400 bg-red-500/5' : 'border-transparent text-slate-400 hover:text-red-300'}`}
           >
             Zona de Perigo
           </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar bg-[#0b121e]">
            
            {activeTab === 'PORTFOLIO' && (
                <div className="space-y-4">
                    
                    {/* Dynamic Banner based on Mode */}
                    {isLive ? (
                        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg flex gap-3 mb-6 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                            <Zap className="text-red-500 flex-shrink-0" size={24} />
                            <div>
                                <h4 className="text-sm font-bold text-red-500 flex items-center gap-2">
                                    LIVE SYNC ATIVO: CUSTÓDIA TOTAL DO CÉREBRO
                                    <span className="text-[10px] bg-red-500 text-white px-2 rounded-full animate-pulse">LIVE</span>
                                </h4>
                                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                    A intervenção humana nos saldos está <strong>BLOQUEADA</strong>. 
                                    Você pode apenas alterar a <strong>Estratégia Neural</strong>.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg flex gap-3 mb-6">
                            <Database className="text-blue-500 flex-shrink-0" size={24} />
                            <div>
                                <h4 className="text-sm font-bold text-blue-400">MODO PAPER TRADING</h4>
                                <p className="text-xs text-slate-400 mt-1">
                                    Simulação total. Você pode editar saldos e estratégias livremente.
                                </p>
                            </div>
                        </div>
                    )}

                    {localBots.map(bot => (
                        <div key={bot.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col gap-4">
                            
                            {/* Bot Header & Strategy Selector */}
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2.5 rounded-lg border-2 ${bot.color} bg-slate-950 shadow-lg`}>
                                        <Wallet className="text-white" size={18} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-lg leading-none">{bot.name}</h3>
                                        <p className="text-xs text-slate-500 font-mono mt-1">{bot.id}</p>
                                    </div>
                                </div>

                                <div className="w-full md:w-auto flex items-center gap-2">
                                     <Activity size={16} className="text-purple-400" />
                                     <select
                                        value={bot.activeStrategy}
                                        onChange={(e) => updateBotState(bot.id, 'activeStrategy', e.target.value)}
                                        className="bg-slate-950 border border-slate-700 text-white text-xs font-bold rounded-lg px-3 py-2 uppercase tracking-wide focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 cursor-pointer hover:bg-slate-800 transition-colors w-full md:w-48"
                                     >
                                         <option value={StrategyType.SCALP_1M}>⚡ Scalp (High Freq)</option>
                                         <option value={StrategyType.SWING_15M}>🌊 Swing (Balanced)</option>
                                         <option value={StrategyType.TREND_4H}>📈 Trend (Long Term)</option>
                                         <option value={StrategyType.ARBITRAGE}>⚖️ Arbitrage (Spread)</option>
                                         <option value={StrategyType.HEDGE}>🛡️ Hedge (Defensive)</option>
                                     </select>
                                </div>
                            </div>
                            
                            {/* Balance Inputs */}
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">USDT Balance</label>
                                    <div className="relative group">
                                        <span className="absolute left-3 top-2 text-slate-500 group-focus-within:text-blue-500 transition-colors">$</span>
                                        <input 
                                            type="number" 
                                            disabled={isLive}
                                            value={bot.balanceUsdt} 
                                            onChange={(e) => updateBotState(bot.id, 'balanceUsdt', parseFloat(e.target.value))}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg py-1.5 pl-6 pr-3 text-sm font-mono focus:border-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Crypto Holdings</label>
                                    <input 
                                        type="number" 
                                        disabled={isLive}
                                        value={bot.holdingsCrypto} 
                                        onChange={(e) => updateBotState(bot.id, 'holdingsCrypto', parseFloat(e.target.value))}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg py-1.5 px-3 text-sm font-mono focus:border-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'EXCHANGES' && (
                <div className="space-y-6">
                    <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-lg flex gap-3 mb-6">
                        <ShieldCheck className="text-amber-500 flex-shrink-0" size={24} />
                        <div>
                            <h4 className="text-sm font-bold text-amber-500">ENCRIPTAÇÃO ATIVA</h4>
                            <p className="text-xs text-slate-400 mt-1">
                                As chaves API nunca são expostas ao browser. Elas são enviadas diretamente para o VPS e encriptadas em repouso.
                            </p>
                        </div>
                    </div>

                    {Object.keys(localSettings.exchanges).map((key) => {
                        const exName = key as ExchangeName;
                        const exData = localSettings.exchanges[exName];
                        return (
                            <div key={exName} className="bg-slate-900 p-5 rounded-xl border border-slate-800">
                                <div className="flex items-center gap-2 mb-4">
                                    <Key size={16} className="text-blue-500" />
                                    <h3 className="font-bold text-white uppercase">{exName} Configuration</h3>
                                </div>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs text-slate-400 font-bold uppercase block mb-1">API Key</label>
                                        <input 
                                            type="text" 
                                            value={exData.apiKey}
                                            onChange={(e) => updateExchange(exName, 'apiKey', e.target.value)}
                                            placeholder={`Paste your ${exName} API Key`}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm font-mono text-white focus:border-blue-500 focus:outline-none placeholder:text-slate-700"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 font-bold uppercase block mb-1">Secret Key</label>
                                        <div className="relative">
                                            <input 
                                                type={showSecrets[exName] ? "text" : "password"} 
                                                value={exData.apiSecret}
                                                onChange={(e) => updateExchange(exName, 'apiSecret', e.target.value)}
                                                placeholder="••••••••••••••••••••••••••••"
                                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm font-mono text-white focus:border-blue-500 focus:outline-none placeholder:text-slate-700"
                                            />
                                            <button 
                                                onClick={() => toggleSecret(exName)}
                                                className="absolute right-3 top-2.5 text-slate-500 hover:text-white"
                                            >
                                                {showSecrets[exName] ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {activeTab === 'TELEGRAM' && (
                 <div className="space-y-6">
                     <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex flex-col items-center text-center">
                         <div className="p-4 bg-blue-500/10 rounded-full mb-4">
                             <Send size={32} className="text-blue-400" />
                         </div>
                         <h3 className="text-lg font-bold text-white mb-2">Conectar ao Telegram</h3>
                         <p className="text-sm text-slate-400 max-w-md mb-6">
                             Receba notificações em tempo real, alertas de pânico e relatórios de lucro diretamente no seu telemóvel.
                         </p>
                         
                         <div className="w-full max-w-lg space-y-4 text-left">
                             <div>
                                <label className="text-xs text-slate-400 font-bold uppercase block mb-1">Bot Token</label>
                                <input 
                                    type="text" 
                                    value={localSettings.telegramBotToken}
                                    onChange={(e) => setLocalSettings(prev => ({...prev, telegramBotToken: e.target.value}))}
                                    placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm font-mono text-white focus:border-blue-500 focus:outline-none"
                                />
                             </div>
                             <div>
                                <label className="text-xs text-slate-400 font-bold uppercase block mb-1">Chat ID</label>
                                <input 
                                    type="text" 
                                    value={localSettings.telegramChatId}
                                    onChange={(e) => setLocalSettings(prev => ({...prev, telegramChatId: e.target.value}))}
                                    placeholder="-100123456789"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm font-mono text-white focus:border-blue-500 focus:outline-none"
                                />
                             </div>
                         </div>
                     </div>
                 </div>
            )}

            {activeTab === 'DANGER' && (
                <div className="space-y-6">
                    <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-xl">
                        <h3 className="text-xl font-bold text-red-500 flex items-center gap-2 mb-2">
                            <AlertTriangle size={24} />
                            ZONA DE PERIGO
                        </h3>
                        <p className="text-sm text-red-300 mb-6">
                            Estas ações são destrutivas e irreversíveis. Prossiga com extrema cautela.
                        </p>

                        <div className="space-y-4">
                            {/* FACTORY RESET */}
                            <div className="flex items-center justify-between p-4 bg-slate-900 rounded-lg border border-slate-800">
                                <div>
                                    <h4 className="font-bold text-white text-sm">Reset de Fábrica</h4>
                                    <p className="text-xs text-slate-500">Limpa todas as configurações e histórico local.</p>
                                </div>
                                <button 
                                    onClick={onFactoryReset}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-2"
                                >
                                    <RefreshCw size={14} /> RESETAR MEMÓRIA
                                </button>
                            </div>

                            {/* PANIC BUTTON */}
                            <div className="flex items-center justify-between p-4 bg-red-950/30 rounded-lg border border-red-900/50">
                                <div>
                                    <h4 className="font-bold text-red-400 text-sm flex items-center gap-2">
                                        <Skull size={16} /> PROTOCOLO DE PÂNICO
                                    </h4>
                                    <p className="text-xs text-red-300/70">
                                        Vende <strong>TODOS</strong> os ativos a mercado instantaneamente e para os bots.
                                    </p>
                                </div>
                                {isPanicConfirming ? (
                                    <div className="flex items-center gap-2 animate-fade-in">
                                        <button 
                                            onClick={() => setIsPanicConfirming(false)}
                                            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold"
                                        >
                                            CANCEL
                                        </button>
                                        <button 
                                            onClick={triggerPanic}
                                            className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.5)]"
                                        >
                                            CONFIRM LIQUIDATION
                                        </button>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => setIsPanicConfirming(true)}
                                        className="px-4 py-2 bg-red-600/20 hover:bg-red-600 hover:text-white text-red-500 border border-red-500/50 rounded-lg text-xs font-bold transition-all"
                                    >
                                        LIQUIDATE ALL ASSETS
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700 bg-slate-900 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg text-sm font-bold text-slate-400 hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            className="px-6 py-2.5 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 transition-all flex items-center gap-2"
          >
            <Save size={16} />
            Gravar Configurações
          </button>
        </div>

      </div>
    </div>
  );
};

export default SettingsModal;