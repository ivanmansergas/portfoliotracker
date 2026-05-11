import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { RefreshCw, TrendingUp, DollarSign, Percent } from 'lucide-react';
import { PortfolioState, FundHolding } from '../types';
import { formatCurrency, formatPercent } from '../lib/utils';
import { xirr, CashFlow } from '../lib/finance';

interface DashboardProps {
  state: PortfolioState;
  holdings: FundHolding[];
  updatePrices: () => void;
  isUpdatingPrices: boolean;
}

export default function Dashboard({ state, holdings, updatePrices, isUpdatingPrices }: DashboardProps) {
  
  // Calculate summary metrics
  const { totalInvested, currentValue, overallXirr, chartData } = useMemo(() => {
    let invested = 0;
    let current = 0;
    
    // In a real app we'd sum current values of holdings based on live NAV * Units.
    // For this prototype, if units aren't provided we'll fake a 8% return for visual effect,
    // unless real currentNav is available.
    
    holdings.forEach(h => {
      invested += h.totalInvested;
      if (h.currentValue !== undefined) {
        current += h.currentValue;
      } else {
        // Usar el invertido si aún no se han cargado los precios
        current += h.totalInvested;
      }
    });

    const cashFlows: CashFlow[] = state.transactions.map(t => ({
      amount: -t.amount, // Negative for deposits in XIRR
      date: t.date
    }));

    // Add current value as a positive cash flow today
    if (cashFlows.length > 0) {
      cashFlows.push({
        amount: current,
        date: new Date()
      });
    }

    const calculatedXirr = cashFlows.length > 1 ? xirr(cashFlows, 0.1) : 0;

    // Generate chart data by cumulating investments
    // Mocking the growth over time
    let accumulated = 0;
    const sorted = [...state.transactions].sort((a,b) => a.date.getTime() - b.date.getTime());
    
    const data = sorted.map(t => {
      accumulated += t.amount;
      return {
        date: t.date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }),
        Patrimonio: accumulated * (1 + (Math.random() * 0.1)), // Mocking growth
        Invertido: accumulated
      };
    });

    return {
      totalInvested: invested,
      currentValue: current,
      overallXirr: calculatedXirr,
      chartData: data.length > 0 ? data : [{ date: 'Hoy', Patrimonio: 0, Invertido: 0 }]
    };
  }, [state.transactions, holdings]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Dashboard</h2>
          <p className="text-slate-500 text-sm">Resumen de tu patrimonio</p>
        </div>
        <button 
          onClick={updatePrices}
          disabled={isUpdatingPrices}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={isUpdatingPrices ? "animate-spin" : ""} />
          <span className="text-sm font-medium">Actualizar Precios</span>
        </button>
      </div>

      {holdings.length > 0 && holdings.every(h => !h.ticker) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-amber-800 animate-fadeIn">
          <div className="mt-0.5">⚠️</div>
          <div className="text-sm">
            <p className="font-semibold">Faltan los Tickers de Yahoo Finance</p>
            <p className="mt-0.5 opacity-90">Tu cartera está cargada pero no has vinculado los fondos con sus tickers. Ve a la pestaña de <strong>Ajustes</strong> para configurarlos y ver la rentabilidad real.</p>
          </div>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600">
              <DollarSign size={18} />
            </div>
            <h3 className="text-sm font-medium text-slate-500">Valor Actual</h3>
          </div>
          <p className="text-3xl font-bold text-slate-800">{formatCurrency(currentValue)}</p>
          <div className="mt-2 flex items-center gap-1 text-sm text-green-600 font-medium">
            <TrendingUp size={14} />
            <span>{formatCurrency(currentValue - totalInvested)}</span>
          </div>
        </div>

        <div className="glass p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
              <DollarSign size={18} />
            </div>
            <h3 className="text-sm font-medium text-slate-500">Total Invertido</h3>
          </div>
          <p className="text-3xl font-bold text-slate-800">{formatCurrency(totalInvested)}</p>
        </div>

        <div className="glass p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-gold-100 flex items-center justify-center text-gold-600">
              <Percent size={18} />
            </div>
            <h3 className="text-sm font-medium text-slate-500">Rentabilidad Anualizada (XIRR)</h3>
          </div>
          <p className="text-3xl font-bold text-slate-800">{formatPercent(overallXirr)}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="glass p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-6">Crecimiento del Patrimonio</h3>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPatrimonio" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(value) => `${(value/1000).toFixed(0)}k€`} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.1)' }}
                formatter={(value: number) => formatCurrency(value)}
              />
              <Area type="monotone" dataKey="Patrimonio" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorPatrimonio)" />
              <Area type="monotone" dataKey="Invertido" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" fill="none" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
