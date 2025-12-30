import React from 'react';
import { MarketData } from '../types';
import { Eye, Zap, Skull, TrendingUp, TrendingDown, Activity, Minus } from 'lucide-react';

interface GodModeWidgetProps {
  market: MarketData;
}

const GodModeWidget: React.FC<GodModeWidgetProps> = ({ market }) => {
  const { sentimentIndex, globalRegime } = market;
  
  // Visual Logic
  let color = 'text-slate-400';
  let bgColor = 'bg-slate-900';
  let glow = '';
  let icon = <Activity size={24} />;
  let label = 'NEUTRAL';
  let description = 'Market is undecided. Algorithms scanning for structure.';

  if (globalRegime === 'PUMP' || (sentimentIndex >= 80)) {
      color = 'text-emerald-400';
      bgColor = 'bg-emerald-950/30';
      glow = 'shadow-[0_0_30px_rgba(16,185,129,0.3)]';
      icon = <Zap size={24} className="animate-pulse" />;
      label = 'EXTREME GREED';
      description = 'High buy pressure detected. FOMO protocols active.';
  } else if (globalRegime === 'BULL' || (sentimentIndex >= 60)) {
      color = 'text-emerald-400';
      bgColor = 'bg-emerald-900/20';
      icon = <TrendingUp size={24} />;
      label = 'GREED';
      description = 'Trend is bullish. Accumulation strategies engaged.';
  } else if (globalRegime === 'CRASH' || (sentimentIndex <= 20)) {
      color = 'text-red-500';
      bgColor = 'bg-red-950/30';
      glow = 'shadow-[0_0_30px_rgba(239,68,68,0.3)]';
      icon = <Skull size={24} className="animate-bounce" />;
      label = 'EXTREME FEAR';
      description = 'Capitulation imminent. Defensive nets deployed.';
  } else if (globalRegime === 'BEAR' || (sentimentIndex <= 40)) {
      color = 'text-red-400';
      bgColor = 'bg-red-900/20';
      icon = <TrendingDown size={24} />;
      label = 'FEAR';
      description = 'Trend is bearish. Short exposure increased.';
  }

  // Needle Rotation (0 to 180 degrees)
  // sentiment 0 -> -90deg
  // sentiment 100 -> 90deg
  const rotation = (sentimentIndex / 100) * 180 - 90;

  return (
    <div className={`relative rounded-2xl border border-slate-800 p-6 overflow-hidden transition-all duration-500 ${bgColor} ${glow}`}>
       {/* Background Tech Lines */}
       <div className="absolute inset-0 opacity-10 pointer-events-none">
           <div className="absolute top-1/2 left-0 w-full h-px bg-white/20"></div>
           <div className="absolute top-0 left-1/2 w-px h-full bg-white/20"></div>
           <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/10 to-transparent"></div>
       </div>

       <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
           
           {/* Left: The Eye & Score */}
           <div className="flex items-center gap-6">
               <div className="relative w-24 h-24 flex items-center justify-center">
                    {/* Gauge Arc */}
                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="45" fill="none" stroke="#1e293b" strokeWidth="8" strokeDasharray="141" strokeDashoffset="0" strokeLinecap="round" />
                        <circle 
                            cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" 
                            strokeDasharray="141" 
                            strokeDashoffset={141 - (141 * (sentimentIndex / 100))} 
                            className={`${color} transition-all duration-1000`}
                            strokeLinecap="round"
                        />
                    </svg>
                    
                    {/* Central Icon */}
                    <div className={`relative z-10 ${color}`}>
                        {globalRegime === 'CRASH' || globalRegime === 'PUMP' ? (
                            <Eye size={32} className="animate-pulse" />
                        ) : (
                            <span className="text-2xl font-bold font-mono">{sentimentIndex.toFixed(0)}</span>
                        )}
                    </div>
               </div>

               <div>
                   <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest flex items-center gap-2 mb-1">
                       <Eye size={14} /> All-Seeing Eye
                   </h3>
                   <div className={`text-2xl font-black italic tracking-tighter ${color}`}>
                       {label}
                   </div>
                   <div className="text-[10px] font-mono text-slate-400 mt-1 uppercase bg-slate-950/50 px-2 py-1 rounded border border-slate-800/50 inline-block">
                       REGIME: <span className="text-white font-bold">{globalRegime}</span>
                   </div>
               </div>
           </div>

           {/* Right: Analysis Text */}
           <div className="flex-1 border-l border-slate-700/50 pl-6 hidden md:block">
               <div className="flex items-center gap-2 mb-2">
                   {icon}
                   <span className="text-sm font-bold text-white">AI Global Outlook</span>
               </div>
               <p className={`text-sm ${color} font-mono leading-relaxed opacity-90`}>
                   "{description}"
               </p>
               
               {/* Mini Indicators */}
               <div className="flex gap-4 mt-3">
                   <div className="flex flex-col">
                       <span className="text-[9px] text-slate-500 uppercase font-bold">Volatility</span>
                       <span className="text-xs text-slate-300 font-mono">
                           {(market.volatility * 100).toFixed(1)}%
                       </span>
                   </div>
                   <div className="flex flex-col">
                       <span className="text-[9px] text-slate-500 uppercase font-bold">Trend</span>
                       <span className={`text-xs font-mono font-bold ${market.trend === 'UP' ? 'text-emerald-400' : market.trend === 'DOWN' ? 'text-red-400' : 'text-slate-400'}`}>
                           {market.trend}
                       </span>
                   </div>
               </div>
           </div>

       </div>
    </div>
  );
};

export default GodModeWidget;
