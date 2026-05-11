import { useState } from 'react';
import { FundHolding, Transaction } from '../types';
import { formatCurrency, formatPercent } from '../lib/utils';
import { Wallet, ChevronRight } from 'lucide-react';
import FundDetail from './FundDetail';

interface HoldingsTableProps {
  holdings: FundHolding[];
  transactions: Transaction[];
  historicalPrices: Record<string, Record<number, number>>;
}

export default function HoldingsTable({ holdings, transactions, historicalPrices }: HoldingsTableProps) {
  const [selectedIsin, setSelectedIsin] = useState<string | null>(null);

  // If a fund is selected, show its detail view
  if (selectedIsin) {
    const holding = holdings.find(h => h.isin === selectedIsin);
    const fundTransactions = transactions.filter(t => t.isin === selectedIsin);

    if (holding) {
      return (
        <FundDetail
          holding={holding}
          transactions={fundTransactions}
          historicalPrices={historicalPrices[selectedIsin] || {}}
          onBack={() => setSelectedIsin(null)}
        />
      );
    }
  }
  
  if (holdings.length === 0) {
    return (
      <div className="text-center py-20">
        <Wallet className="mx-auto h-12 w-12 text-slate-300 mb-4" />
        <h3 className="text-lg font-medium text-slate-900">Cartera vacía</h3>
        <p className="text-slate-500 mt-1">Importa tus datos desde la pestaña de Datos para empezar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Tu Cartera</h2>
        <p className="text-slate-500 text-sm">Haz click en un fondo para ver su detalle.</p>
      </div>

      <div className="glass overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fondo</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Invertido</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">NAV Actual</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Valor Estimado</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Rentabilidad</th>
                <th className="px-6 py-4 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {holdings.map((h, i) => {
                const estimatedValue = h.currentValue !== undefined ? h.currentValue : h.totalInvested;
                const returnVal = h.totalInvested > 0 ? (estimatedValue - h.totalInvested) / h.totalInvested : 0;
                const isPositive = returnVal >= 0;

                return (
                  <tr
                    key={i}
                    onClick={() => setSelectedIsin(h.isin)}
                    className="hover:bg-brand-50/40 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-slate-800 group-hover:text-brand-700 transition-colors">{h.name}</p>
                      <div className="flex gap-2 mt-1">
                        <span className="text-xs text-slate-400 font-mono">{h.isin}</span>
                        {h.ticker ? (
                          <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                            {h.ticker}
                          </span>
                        ) : (
                          <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded font-medium">
                            Falta ticker
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-slate-700 font-medium">
                      {formatCurrency(h.totalInvested)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-slate-700">
                      {h.currentNav ? (
                        <div>
                          <span>{h.currentNav.toFixed(4)}€</span>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {h.navDate?.toLocaleDateString()}
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-xs">Sin datos</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-bold text-slate-800">
                      {formatCurrency(estimatedValue)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex px-2 py-1 rounded-md text-xs font-semibold ${
                        isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {isPositive ? '+' : ''}{formatPercent(returnVal)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <ChevronRight size={16} className="text-slate-300 group-hover:text-brand-500 transition-colors inline-block" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
