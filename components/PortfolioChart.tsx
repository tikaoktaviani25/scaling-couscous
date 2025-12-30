import React, { useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import { ExecutionPoint } from '../types';

interface DataPoint {
  timestamp: number;
  value: number;
}

interface PortfolioChartProps {
  data: DataPoint[];
  executions: ExecutionPoint[];
  color?: string;
}

const PortfolioChart: React.FC<PortfolioChartProps> = ({ data, executions, color = '#3b82f6' }) => {
  const chartHeight = 200;
  const chartWidth = 1000;

  const { pathD, areaD, minVal, maxVal, currentVal, markers, lastPoint } = useMemo(() => {
    if (data.length < 2) return { pathD: '', areaD: '', minVal: 0, maxVal: 0, currentVal: 0, markers: [], lastPoint: {x:0, y:0} };

    const values = data.map(d => d.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const valRange = maxVal - minVal || 1;
    
    // Add buffer
    const buffer = valRange * 0.1;
    const yMin = minVal - buffer;
    const yMax = maxVal + buffer;
    const yRange = yMax - yMin;

    const minTime = data[0].timestamp;
    const maxTime = data[data.length - 1].timestamp;
    const timeRange = maxTime - minTime;

    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * chartWidth;
      const y = chartHeight - ((d.value - yMin) / yRange) * chartHeight;
      return {x, y};
    });

    const pathD = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;
    const areaD = `${pathD} L ${chartWidth},${chartHeight} L 0,${chartHeight} Z`;

    // Calculate marker positions
    const visibleMarkers = executions.filter(e => e.timestamp >= minTime && e.timestamp <= maxTime).map(e => {
       const x = ((e.timestamp - minTime) / timeRange) * chartWidth;
       
       // Find closest data point for Y value to snap the marker to the line
       const closestData = data.reduce((prev, curr) => 
         Math.abs(curr.timestamp - e.timestamp) < Math.abs(prev.timestamp - e.timestamp) ? curr : prev
       );
       const y = chartHeight - ((closestData.value - yMin) / yRange) * chartHeight;
       
       return { ...e, x, y };
    });

    return { 
      pathD, 
      areaD, 
      minVal, 
      maxVal, 
      currentVal: values[values.length - 1],
      markers: visibleMarkers,
      lastPoint: points[points.length - 1]
    };
  }, [data, executions]);

  if (data.length === 0) return <div className="h-48 flex items-center justify-center text-slate-600">No Data</div>;

  return (
    <div className="w-full bg-slate-900/50 rounded-xl border border-slate-800 p-6 relative overflow-hidden shadow-lg">
      <div className="flex justify-between items-center mb-4">
         <div>
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <TrendingUp size={14} className="text-blue-400" /> Performance da Carteira (24h)
            </h3>
         </div>
         <div className="text-right">
            <span className="text-2xl font-mono font-bold text-white">
              ${currentVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
         </div>
      </div>

      <div className="w-full h-48 relative group">
        <svg 
          viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
          preserveAspectRatio="none" 
          className="w-full h-full overflow-visible"
        >
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.4" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Area Fill */}
          <path d={areaD} fill="url(#chartGradient)" className="transition-all duration-300" />
          
          {/* Line Stroke */}
          <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" />

          {/* Pulse Live Point */}
          <circle cx={lastPoint.x} cy={lastPoint.y} r="4" fill={color} className="animate-pulse" />
          <circle cx={lastPoint.x} cy={lastPoint.y} r="10" fill={color} opacity="0.2" className="animate-ping" />

          {/* Execution Markers */}
          {markers.map((marker) => (
            <g key={marker.id} className="cursor-pointer hover:scale-150 transition-transform origin-center">
              <circle 
                cx={marker.x} 
                cy={marker.y} 
                r="4" 
                fill={marker.type === 'BUY' ? '#22c55e' : '#ef4444'} 
                stroke="#0f172a" 
                strokeWidth="1.5"
                filter="url(#glow)"
              />
              <title>{`${marker.type} ${marker.amount.toFixed(4)} BTC @ $${marker.price.toFixed(2)} (${marker.botId})`}</title>
            </g>
          ))}
        </svg>

        {/* Min/Max Labels Overlay */}
        <div className="absolute top-0 right-0 text-[10px] text-slate-500 font-mono bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-800 pointer-events-none">
          High: ${maxVal.toFixed(2)}
        </div>
        <div className="absolute bottom-0 right-0 text-[10px] text-slate-500 font-mono bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-800 pointer-events-none">
          Low: ${minVal.toFixed(2)}
        </div>
      </div>
    </div>
  );
};

export default PortfolioChart;