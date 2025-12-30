import React, { useState } from 'react';
import { Play, TrendingUp, RefreshCw, BarChart2, Cpu, Activity } from 'lucide-react';
import { persistence } from '../services/persistenceService';
import { BacktestResult } from '../types';
import PortfolioChart from './PortfolioChart';

const BacktestPanel: React.FC = () => {
    const [isRunning, setIsRunning] = useState(false);
    const [result, setResult] = useState<BacktestResult | null>(null);

    const runSimulation = async () => {
        setIsRunning(true);
        setResult(null);
        try {
            const data = await persistence.runBacktest();
            setResult(data);
        } catch (e) {
            alert("Simulation failed.");
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className="h-full p-8 overflow-y-auto custom-scrollbar animate-fade-in">
            <div className="max-w-5xl mx-auto space-y-6">
                
                {/* Header Section */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col md:flex-row justify-between items-center shadow-2xl gap-6">
                    <div>
                        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                            <Cpu size={32} className="text-purple-500" />
                            Motor de Aprendizagem Profunda
                        </h2>
                        <p className="text-slate-400 mt-2 max-w-xl">
                            O motor analisa 1000 candles de <strong>dados reais do mercado</strong> em milissegundos usando Algoritmos Genéticos para encontrar os pesos ideais antes de arriscar capital.
                        </p>
                    </div>
                    <button 
                        onClick={runSimulation}
                        disabled={isRunning}
                        className={`px-8 py-4 rounded-xl font-bold text-lg flex items-center gap-3 transition-all shadow-lg whitespace-nowrap ${
                            isRunning 
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                            : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/40 hover:scale-105'
                        }`}
                    >
                        {isRunning ? <RefreshCw className="animate-spin" /> : <Play fill="currentColor" />}
                        {isRunning ? 'PROCESSANDO...' : 'EXECUTAR SIMULAÇÃO'}
                    </button>
                </div>

                {/* Results Section */}
                {result && (
                    <div className="animate-fade-in space-y-6">
                        {/* Simulation Chart */}
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
                             <div className="flex items-center gap-2 mb-4">
                                <Activity size={18} className="text-purple-400" />
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Simulação de Performance (Curva de Equity)</h3>
                             </div>
                             <PortfolioChart 
                                data={result.history} 
                                executions={[]} // No individual trade markers for backtest summary yet
                                color="#a855f7" // Purple for Backtest
                             />
                        </div>

                        {/* KPI Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <TrendingUp size={64} />
                                </div>
                                <span className="text-xs font-bold text-slate-500 uppercase">Profit Projetado</span>
                                <div className={`text-3xl font-mono font-bold mt-2 ${result.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    ${result.totalProfit.toLocaleString('en-US', {minimumFractionDigits: 2})}
                                </div>
                                <span className="text-[10px] text-slate-600 font-mono mt-1 block">Baseado em 1000 iterações</span>
                            </div>
                            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                                <span className="text-xs font-bold text-slate-500 uppercase">Win Rate Estimada</span>
                                <div className="text-3xl font-mono font-bold mt-2 text-blue-400">
                                    {result.winRate.toFixed(1)}%
                                </div>
                                <div className="w-full bg-slate-950 h-1.5 rounded-full mt-3 overflow-hidden">
                                    <div className="h-full bg-blue-500" style={{ width: `${result.winRate}%` }}></div>
                                </div>
                            </div>
                            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                                <span className="text-xs font-bold text-slate-500 uppercase">Max Drawdown</span>
                                <div className="text-3xl font-mono font-bold mt-2 text-amber-400">
                                    {result.maxDrawdown.toFixed(2)}
                                </div>
                                <span className="text-[10px] text-slate-600 font-mono mt-1 block">Risco máximo suportado</span>
                            </div>
                        </div>

                        {/* Best Weights Discovered */}
                        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                                <BarChart2 size={18} className="text-emerald-500" />
                                Pesos Neurais Otimizados
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                                {Object.entries(result.bestWeights).map(([key, val]) => {
                                    const value = val as number;
                                    const intensity = Math.min(100, (value / 5) * 100);
                                    return (
                                        <div key={key} className="bg-slate-950 p-3 rounded border border-slate-800 flex flex-col justify-between h-20">
                                            <span className="text-[10px] text-slate-500 uppercase font-bold block">{key.slice(0,4)}</span>
                                            <div className="flex items-end gap-2">
                                                <span className="text-sm font-mono text-emerald-300 font-bold">{value.toFixed(1)}</span>
                                                <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden mb-1">
                                                    <div className="h-full bg-emerald-500" style={{ width: `${intensity}%` }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded text-sm text-emerald-400 flex items-center gap-2 animate-pulse">
                                <RefreshCw size={16} />
                                O Sistema aplicou automaticamente estes pesos ao cérebro central para máxima precisão.
                            </div>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!result && !isRunning && (
                    <div className="h-64 flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/30">
                        <Cpu size={48} className="mb-4 opacity-50" />
                        <p className="font-bold">Aguardando dados de simulação...</p>
                        <p className="text-sm opacity-50">Clique em "Executar Simulação" para treinar a IA.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BacktestPanel;