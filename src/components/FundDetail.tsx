import { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Percent, BarChart3 } from 'lucide-react';
import { FundHolding, Transaction } from '../types';
import { formatCurrency, formatPercent } from '../lib/utils';
import { xirr, CashFlow } from '../lib/finance';

interface FundDetailProps {
  holding: FundHolding;
  transactions: Transaction[];
  historicalPrices: Record<number, number>; // Year -> Price at 31/12
  onBack: () => void;
}

export default function FundDetail({ holding, transactions, historicalPrices, onBack }: FundDetailProps) {
  
  // Compute per-contribution analysis
  const contributionAnalysis = useMemo(() => {
    return transactions
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(t => {
        const navAtPurchase = t.nav || (t.units !== 0 ? Math.abs(t.amount / t.units) : 0);
        const currentValueOfContribution = holding.currentNav 
          ? Math.abs(t.units) * holding.currentNav 
          : Math.abs(t.amount);
        const returnPct = t.amount !== 0 
          ? (currentValueOfContribution - Math.abs(t.amount)) / Math.abs(t.amount) 
          : 0;

        return {
          date: t.date,
          amount: t.amount,
          units: t.units,
          navAtPurchase,
          currentValue: currentValueOfContribution,
          returnPct,
          profit: currentValueOfContribution - Math.abs(t.amount)
        };
      });
  }, [transactions, holding.currentNav]);

  // Compute XIRR for this fund
  const fundXirr = useMemo(() => {
    const cashFlows: CashFlow[] = transactions.map(t => ({
      amount: -t.amount,
      date: t.date
    }));

    const currentValue = holding.currentValue !== undefined 
      ? holding.currentValue 
      : holding.totalInvested;

    if (cashFlows.length > 0) {
      cashFlows.push({ amount: currentValue, date: new Date() });
    }

    return cashFlows.length > 1 ? xirr(cashFlows, 0.1) : 0;
  }, [transactions, holding]);

  // Generate chart data — accumulated investment vs estimated value over time
  const chartData = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => a.date.getTime() - b.date.getTime());
    let accumulatedInvested = 0;
    let accumulatedUnits = 0;

    return sorted.map(t => {
      accumulatedInvested += t.amount;
      accumulatedUnits += t.units;
      const estimatedValue = holding.currentNav
        ? accumulatedUnits * holding.currentNav
        : accumulatedInvested;

      return {
        date: t.date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' }),
        Invertido: accumulatedInvested,
        'Valor Estimado': estimatedValue
      };
    });
  }, [transactions, holding.currentNav]);

  // Yearly return breakdown - ACTUAL PERFORMANCE OF THE YEAR
  const yearlyBreakdown = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => a.date.getTime() - b.date.getTime());
    if (sorted.length === 0) return [];

    const startYear = sorted[0].date.getFullYear();
    const endYear = new Date().getFullYear();
    const result = [];

    let cumulativeUnits = 0;
    let cumulativeInvested = 0;

    for (let year = startYear; year <= endYear; year++) {
      const yearTransactions = sorted.filter(t => t.date.getFullYear() === year);
      const investedThisYear = yearTransactions.reduce((acc, t) => acc + t.amount, 0);
      const unitsThisYear = yearTransactions.reduce((acc, t) => acc + t.units, 0);

      // Precio al inicio del año (cierre del anterior)
      const navStart = historicalPrices[year - 1];
      // Precio al final del año (cierre de este año)
      let navEnd = historicalPrices[year];
      
      // Si es el año actual, usamos el NAV actual
      if (year === endYear && holding.currentNav) {
        navEnd = holding.currentNav;
      }

      const unitsAtStart = cumulativeUnits;
      const valueAtStart = navStart ? unitsAtStart * navStart : cumulativeInvested;
      
      cumulativeUnits += unitsThisYear;
      cumulativeInvested += investedThisYear;

      const valueAtEnd = navEnd ? cumulativeUnits * navEnd : cumulativeInvested;

      // Ganancia real del año: Valor Final - Valor Inicial - Invertido este año
      const gain = valueAtEnd - valueAtStart - investedThisYear;
      
      // Denominador para el cálculo de rentabilidad (Capital Inicial + media de aportaciones)
      const denominator = valueAtStart + (investedThisYear / 2);
      const returnPct = denominator > 0 ? gain / denominator : 0;

      result.push({
        year,
        investedThisYear,
        cumulativeInvested,
        cumulativeUnits,
        estimatedValue: valueAtEnd,
        returnPct,
        gain,
        contributions: yearTransactions.length,
        hasHistoricalData: !!navEnd
      });
    }

    return result.reverse(); // Mostrar años más recientes primero
  }, [transactions, holding.currentNav, historicalPrices]);

  const totalReturn = holding.totalInvested > 0
    ? ((holding.currentValue ?? holding.totalInvested) - holding.totalInvested) / holding.totalInvested
    : 0;
  const totalProfit = (holding.currentValue ?? holding.totalInvested) - holding.totalInvested;
  const isPositive = totalReturn >= 0;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={onBack}
          className="mt-1 p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all duration-200 shadow-sm"
          title="Volver a Cartera"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{holding.name}</h2>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-xs text-slate-400 font-mono bg-slate-50 px-2 py-0.5 rounded">{holding.isin}</span>
            {holding.ticker && (
              <span className="text-xs bg-brand-50 text-brand-600 px-2 py-0.5 rounded font-medium">
                {holding.ticker}
              </span>
            )}
            <span className="text-xs text-slate-400">
              {transactions.length} aportacion{transactions.length !== 1 ? 'es' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
              <DollarSign size={14} />
            </div>
            <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Invertido</h3>
          </div>
          <p className="text-2xl font-bold text-slate-800">{formatCurrency(holding.totalInvested)}</p>
        </div>

        <div className="glass p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isPositive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            </div>
            <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Valor Actual</h3>
          </div>
          <p className="text-2xl font-bold text-slate-800">
            {formatCurrency(holding.currentValue ?? holding.totalInvested)}
          </p>
          <p className={`text-xs mt-1 font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? '+' : ''}{formatCurrency(totalProfit)}
          </p>
        </div>

        <div className="glass p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isPositive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              <Percent size={14} />
            </div>
            <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Rentabilidad</h3>
          </div>
          <p className={`text-2xl font-bold ${isPositive ? 'text-green-700' : 'text-red-700'}`}>
            {isPositive ? '+' : ''}{formatPercent(totalReturn)}
          </p>
        </div>

        <div className="glass p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-600">
              <BarChart3 size={14} />
            </div>
            <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider">XIRR</h3>
          </div>
          <p className="text-2xl font-bold text-slate-800">{formatPercent(fundXirr)}</p>
          <p className="text-xs text-slate-400 mt-1">Anualizada</p>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 1 && (
        <div className="glass p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Evolución del Fondo</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValorFondo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} tickFormatter={(v) => `${(v/1000).toFixed(1)}k€`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.1)', fontSize: '13px' }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Area type="monotone" dataKey="Valor Estimado" stroke="#0ea5e9" strokeWidth={2.5} fillOpacity={1} fill="url(#colorValorFondo)" />
                <Area type="monotone" dataKey="Invertido" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Yearly Breakdown */}
      <div className="glass overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Rentabilidad por Año</h3>
            <p className="text-xs text-slate-400 mt-0.5">Rendimiento anual del capital invertido</p>
          </div>
          {!Object.keys(historicalPrices).length && (
            <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-100 px-2 py-1 rounded-lg font-medium animate-pulse">
              ⚠️ Pulsa "Actualizar Precios" para obtener datos históricos
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
          {yearlyBreakdown.map(y => {
            const isPos = y.returnPct >= 0;
            return (
              <div
                key={y.year}
                className="rounded-xl border border-slate-100 bg-gradient-to-br from-white to-slate-50/50 p-4 space-y-3 hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-slate-800">{y.year}</span>
                    {!y.hasHistoricalData && y.year < new Date().getFullYear() && (
                      <span className="text-[9px] text-slate-400 italic">(Estimado)</span>
                    )}
                  </div>
                  <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold ${
                    isPos ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {isPos ? '+' : ''}{formatPercent(y.returnPct)}
                  </span>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Resultado año</span>
                    <span className={`font-bold ${isPos ? 'text-green-600' : 'text-red-600'}`}>
                      {isPos ? '+' : ''}{formatCurrency(y.gain)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Aportado en {y.year}</span>
                    <span className="font-medium text-slate-700">{formatCurrency(y.investedThisYear)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-100 mt-1">
                    <span className="text-slate-400 text-xs">Valor a fin de año</span>
                    <span className="text-slate-500 text-xs">{formatCurrency(y.estimatedValue)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Contributions Table */}
      <div className="glass overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800">Aportaciones</h3>
          <p className="text-xs text-slate-400 mt-0.5">Detalle de cada aportación y su rentabilidad individual</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right">Importe</th>
                <th className="px-6 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right">Participaciones</th>
                <th className="px-6 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right">NAV Compra</th>
                <th className="px-6 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right">Valor Actual</th>
                <th className="px-6 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right">Beneficio</th>
                <th className="px-6 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right">Rent. %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {contributionAnalysis.map((c, i) => {
                const isPos = c.returnPct >= 0;
                return (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3 text-sm text-slate-700">
                      {c.date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-700 text-right font-medium">
                      {formatCurrency(c.amount)}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-500 text-right font-mono">
                      {c.units.toFixed(4)}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-500 text-right">
                      {c.navAtPurchase.toFixed(4)}€
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-700 text-right font-medium">
                      {holding.currentNav ? formatCurrency(c.currentValue) : <span className="text-slate-400 italic text-xs">—</span>}
                    </td>
                    <td className={`px-6 py-3 text-sm text-right font-medium ${isPos ? 'text-green-600' : 'text-red-600'}`}>
                      {holding.currentNav ? (
                        <>{isPos ? '+' : ''}{formatCurrency(c.profit)}</>
                      ) : (
                        <span className="text-slate-400 italic text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right">
                      {holding.currentNav ? (
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                          isPos ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {isPos ? '+' : ''}{formatPercent(c.returnPct)}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-xs">—</span>
                      )}
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
