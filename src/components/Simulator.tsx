import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Sparkles } from 'lucide-react';
import { formatCurrency } from '../lib/utils';

export default function Simulator() {
  const [initialCapital, setInitialCapital] = useState(10000);
  const [monthlyContribution, setMonthlyContribution] = useState(500);
  const [years, setYears] = useState(20);
  const [expectedReturn, setExpectedReturn] = useState(7); // %

  const chartData = useMemo(() => {
    let data = [];
    let currentBalance = initialCapital;
    let totalInvested = initialCapital;

    data.push({
      year: 0,
      Patrimonio: currentBalance,
      Invertido: totalInvested,
    });

    for (let i = 1; i <= years; i++) {
      // Add monthly contributions and compound interest
      // Simple approximation: add contributions for the year, then apply interest
      currentBalance += monthlyContribution * 12;
      currentBalance *= (1 + expectedReturn / 100);
      
      totalInvested += monthlyContribution * 12;

      data.push({
        year: i,
        Patrimonio: currentBalance,
        Invertido: totalInvested,
      });
    }

    return data;
  }, [initialCapital, monthlyContribution, years, expectedReturn]);

  const finalBalance = chartData[chartData.length - 1].Patrimonio;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
          <Sparkles size={20} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Proyección de Sueños</h2>
          <p className="text-slate-500 text-sm">Simula el poder del interés compuesto.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Controls */}
        <div className="glass p-6 space-y-6 lg:col-span-1">
          
          <div className="space-y-3">
            <label className="flex justify-between text-sm font-medium text-slate-700">
              <span>Capital Inicial</span>
              <span className="text-brand-600 font-bold">{formatCurrency(initialCapital)}</span>
            </label>
            <input 
              type="range" 
              min="0" max="100000" step="1000"
              value={initialCapital}
              onChange={(e) => setInitialCapital(Number(e.target.value))}
              className="w-full accent-brand-500 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="space-y-3">
            <label className="flex justify-between text-sm font-medium text-slate-700">
              <span>Aportación Mensual</span>
              <span className="text-brand-600 font-bold">{formatCurrency(monthlyContribution)}</span>
            </label>
            <input 
              type="range" 
              min="0" max="5000" step="50"
              value={monthlyContribution}
              onChange={(e) => setMonthlyContribution(Number(e.target.value))}
              className="w-full accent-brand-500 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="space-y-3">
            <label className="flex justify-between text-sm font-medium text-slate-700">
              <span>Años de Inversión</span>
              <span className="text-brand-600 font-bold">{years} años</span>
            </label>
            <input 
              type="range" 
              min="1" max="50" step="1"
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              className="w-full accent-brand-500 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="space-y-3">
            <label className="flex justify-between text-sm font-medium text-slate-700">
              <span>Rentabilidad Esperada</span>
              <span className="text-brand-600 font-bold">{expectedReturn}%</span>
            </label>
            <input 
              type="range" 
              min="0" max="20" step="0.5"
              value={expectedReturn}
              onChange={(e) => setExpectedReturn(Number(e.target.value))}
              className="w-full accent-brand-500 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          
          <div className="pt-4 border-t border-slate-100">
            <p className="text-sm text-slate-500 mb-1">Patrimonio Final Estimado</p>
            <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-indigo-600">
              {formatCurrency(finalBalance)}
            </p>
          </div>

        </div>

        {/* Chart */}
        <div className="glass p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Curva de Crecimiento</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} tickFormatter={(v) => `Año ${v}`} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(value) => `${(value/1000).toFixed(0)}k`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.1)' }}
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(v) => `Año ${v}`}
                />
                <Line type="monotone" dataKey="Patrimonio" stroke="#4f46e5" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#4f46e5', stroke: '#fff', strokeWidth: 2 }} />
                <Line type="monotone" dataKey="Invertido" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
