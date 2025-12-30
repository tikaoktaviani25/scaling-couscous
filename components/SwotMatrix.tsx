import React from 'react';
import { SwotAnalysis, SwotItem } from '../types';
import { Shield, TrendingUp, AlertTriangle, Zap, Target, Search } from 'lucide-react';

interface SwotMatrixProps {
  data: SwotAnalysis;
}

const SwotCard: React.FC<{ title: string, items: SwotItem[], color: string, icon: React.ReactNode }> = ({ title, items, color, icon }) => (
    <div className={`bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col h-full hover:border-${color} transition-colors group relative overflow-hidden`}>
        <div className={`absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity text-${color}`}>
            {icon}
        </div>
        <div className="flex items-center gap-2 mb-3 z-10">
            <div className={`text-${color}`}>{icon}</div>
            <h4 className={`text-sm font-bold uppercase tracking-wider text-${color}`}>{title}</h4>
        </div>
        <div className="space-y-2 z-10 flex-1">
            {items.length === 0 ? (
                <span className="text-xs text-slate-600 italic">None detected...</span>
            ) : (
                items.map(item => (
                    <div key={item.id} className="flex items-center justify-between bg-slate-950/50 p-2 rounded border border-slate-800/50">
                        <span className="text-xs text-slate-300 font-mono">{item.text}</span>
                        {item.impact === 'HIGH' && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>}
                    </div>
                ))
            )}
        </div>
    </div>
);

const SwotMatrix: React.FC<SwotMatrixProps> = ({ data }) => {
  if (!data) return null;

  return (
    <div className="animate-fade-in mt-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Target size={20} className="text-blue-500" />
            Strategic Intel Matrix (S.W.O.T.)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
            <SwotCard 
                title="Strengths (Internal)" 
                items={data.strengths} 
                color="emerald-400" 
                icon={<Shield size={18} />} 
            />
            <SwotCard 
                title="Weaknesses (Internal)" 
                items={data.weaknesses} 
                color="amber-400" 
                icon={<AlertTriangle size={18} />} 
            />
            <SwotCard 
                title="Opportunities (External)" 
                items={data.opportunities} 
                color="blue-400" 
                icon={<Search size={18} />} 
            />
            <SwotCard 
                title="Threats (External)" 
                items={data.threats} 
                color="red-400" 
                icon={<Zap size={18} />} 
            />
        </div>
        <div className="flex justify-between items-center mt-2 text-[10px] text-slate-500 font-mono uppercase">
            <span>Dynamic Strategic Analysis</span>
            <span>Last Update: {new Date(data.timestamp).toLocaleTimeString()}</span>
        </div>
    </div>
  );
};

export default SwotMatrix;