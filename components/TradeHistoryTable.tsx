import React from 'react';
import { ExecutionPoint, ExchangeName } from '../types';
import { FileSpreadsheet, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';

interface TradeHistoryTableProps {
  executions: ExecutionPoint[];
}

const TradeHistoryTable: React.FC<TradeHistoryTableProps> = ({ executions }) => {
  if (executions.length === 0) {
    return (
        <div className="w-full h-32 flex flex-col items-center justify-center bg-slate-900/50 rounded-xl border border-slate-800 text-slate-500">
            <FileSpreadsheet size={24} className="mb-2 opacity-50" />
            <span className="text-xs italic">The Ledger is empty. Waiting for brain signals...</span>
        </div>
    );
  }

  return (
    <div className="w-full bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/80 flex justify-between items-center">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
           <FileSpreadsheet size={16} className="text-blue-500" />
           Live Execution Ledger (Net PnL)
        </h3>
        <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
             <Info size={12}/> All profits are net of fees (0.1%)
        </span>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/50 text-[10px] uppercase text-slate-500 border-b border-slate-800">
              <th className="py-3 px-4 font-bold tracking-wider">Time</th>
              <th className="py-3 px-4 font-bold tracking-wider">Exchange</th>
              <th className="py-3 px-4 font-bold tracking-wider">Type</th>
              <th className="py-3 px-4 font-bold tracking-wider text-right">Price</th>
              <th className="py-3 px-4 font-bold tracking-wider text-right">Volume</th>
              <th className="py-3 px-4 font-bold tracking-wider text-right">Fees (Est)</th>
              <th className="py-3 px-4 font-bold tracking-wider text-right text-white">NET P/L</th>
            </tr>
          </thead>
          <tbody className="text-xs font-mono">
            {executions.slice().reverse().map((exec) => {
               const isBuy = exec.type === 'BUY';
               const value = exec.amount * exec.price;
               const pnl = exec.realizedPnL || 0;
               const fees = exec.fees || 0;
               const isWin = pnl > 0;
               const pnlColor = isWin ? 'text-emerald-400' : 'text-red-400';
               
               return (
                <tr key={exec.id} className="border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors group">
                  <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                    {new Date(exec.timestamp).toLocaleTimeString([], { hour12: false })}
                    <span className="text-[9px] text-slate-600 ml-1">.{new Date(exec.timestamp).getMilliseconds()}</span>
                  </td>
                  
                  <td className="py-3 px-4">
                     <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                            exec.botId === ExchangeName.BINANCE ? 'bg-yellow-500' :
                            exec.botId === ExchangeName.OKX ? 'bg-blue-500' :
                            exec.botId === ExchangeName.MEXC ? 'bg-green-500' :
                            'bg-purple-500'
                        }`}></div>
                        <span className="font-bold text-slate-200">{exec.botId}</span>
                     </div>
                  </td>
                  
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        isBuy 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                      {exec.type}
                    </span>
                  </td>
                  
                  <td className="py-3 px-4 text-right text-slate-300">
                    ${exec.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  
                  <td className="py-3 px-4 text-right text-white font-bold">
                    ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  
                  <td className="py-3 px-4 text-right text-slate-500">
                    -${fees.toFixed(3)}
                  </td>
                  
                  <td className="py-3 px-4 text-right">
                    {!isBuy ? (
                      <div className="flex items-center justify-end gap-1.5">
                        {isWin ? (
                            <TrendingUp size={14} className="text-emerald-500" />
                        ) : (
                            <TrendingDown size={14} className="text-red-500" />
                        )}
                        <span className={`font-bold ${pnlColor} text-sm`}>
                          {isWin ? '+' : ''}{pnl.toFixed(2)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-700 flex items-center justify-end">
                          <Minus size={14} className="mr-1"/>
                      </span>
                    )}
                  </td>
                </tr>
               );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TradeHistoryTable;