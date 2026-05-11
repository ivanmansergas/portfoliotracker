import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Wallet, 
  LineChart, 
  Database, 
  Settings as SettingsIcon,
  Briefcase
} from 'lucide-react';
import { cn } from './lib/utils';
import { PortfolioState, TabType, FundHolding } from './types';
import Dashboard from './components/Dashboard';
import HoldingsTable from './components/HoldingsTable';
import Simulator from './components/Simulator';
import DataManager from './components/DataManager';
import Settings from './components/Settings';
import { fetchYahooFinancePrice, fetchHistoricalYearEndPrices, fetchDailyHistoricalPrices } from './lib/finance';

const defaultState: PortfolioState = {
  transactions: [],
  mappings: {},
  fundNames: {},
  historicalPrices: {},
  currentPrices: {}
};

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [state, setState] = useState<PortfolioState>(() => {
    const saved = localStorage.getItem('portfolioTrackerState');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Revive dates and merge with defaults to handle new state fields
        return {
          ...defaultState,
          ...parsed,
          transactions: (parsed.transactions || []).map((t: any) => ({
            ...t,
            date: new Date(t.date)
          }))
        };
      } catch (e) {
        console.error('Failed to parse saved state');
      }
    }
    return defaultState;
  });

  const [holdings, setHoldings] = useState<FundHolding[]>([]);
  const [isUpdatingPrices, setIsUpdatingPrices] = useState(false);

  // Save to local storage whenever state changes
  useEffect(() => {
    localStorage.setItem('portfolioTrackerState', JSON.stringify(state));
  }, [state]);

  // Compute Holdings based on transactions
  useEffect(() => {
    const holdingMap = new Map<string, FundHolding>();
    
    state.transactions.forEach(t => {
      if (!holdingMap.has(t.isin)) {
        holdingMap.set(t.isin, {
          isin: t.isin,
          name: state.fundNames[t.isin] || t.concept || t.isin,
          ticker: state.mappings[t.isin],
          units: 0,
          totalInvested: 0,
        });
      }
      const h = holdingMap.get(t.isin)!;
      h.totalInvested += t.amount;
      h.units += (t.units || 0);
    });

    setHoldings(Array.from(holdingMap.values()).map(nh => {
      const savedPrice = state.currentPrices?.[nh.isin];
      if (savedPrice) {
        return {
          ...nh,
          currentNav: savedPrice.price,
          navDate: new Date(savedPrice.date),
          currentValue: nh.units * savedPrice.price
        };
      }
      return nh;
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.transactions, state.mappings, state.currentPrices]);

  const updatePrices = async () => {
    setIsUpdatingPrices(true);
    console.log("Iniciando actualización de precios...");
    
    try {
      if (holdings.length === 0) {
        alert("Primero debes importar tus datos desde la pestaña 'Datos'.");
        return;
      }

      const configuredTickers = holdings.filter(h => h.ticker).length;
      if (configuredTickers === 0) {
        alert("⚠️ No tienes ningún ticker de Yahoo Finance configurado.\n\nVe a la pestaña 'Ajustes' y vincula tus fondos con sus tickers correspondientes.");
        return;
      }

      // Copias para actualizar el estado
      const updatedHoldings = holdings.map(h => ({ ...h }));
      const updatedTransactions = [...state.transactions];
      const newFundNames: Record<string, string> = { ...state.fundNames };
      const newHistoricalPrices: Record<string, Record<number, number>> = { ...state.historicalPrices };
      
      let updatedCount = 0;
      let recoveredNavs = 0;

      // Procesar fondos secuencialmente para evitar saturar el proxy/API
      for (let h of updatedHoldings) {
        if (!h.ticker) continue;

        console.log(`Procesando ${h.ticker}...`);
        
        try {
          // 1. Obtener precio actual
          const result = await fetchYahooFinancePrice(h.ticker);
          if (result) {
            h.currentNav = result.price;
            h.navDate = new Date();
            h.currentValue = h.units * result.price;
            if (result.name) {
              newFundNames[h.isin] = result.name;
              h.name = result.name;
            }
            updatedCount++;
          }

          // 2. Obtener cierres anuales (para la vista de detalle)
          const historical = await fetchHistoricalYearEndPrices(h.ticker);
          if (Object.keys(historical).length > 0) {
            newHistoricalPrices[h.isin] = historical;
          }

          // 3. Recuperación de NAVs históricos (solo si faltan en transacciones)
          const transactionsToFix = updatedTransactions.filter(t => t.isin === h.isin && !t.nav);
          if (transactionsToFix.length > 0) {
            console.log(`Recuperando precios históricos para ${h.ticker}...`);
            const dailyPrices = await fetchDailyHistoricalPrices(h.ticker);
            
            if (Object.keys(dailyPrices).length > 0) {
              const availableDates = Object.keys(dailyPrices).sort();
              transactionsToFix.forEach(t => {
                const targetDate = new Date(t.date);
                // Buscamos el precio del día siguiente (o el más cercano)
                targetDate.setDate(targetDate.getDate() + 1);
                let dateStr = targetDate.toISOString().split('T')[0];
                
                if (!dailyPrices[dateStr]) {
                  const nextDate = availableDates.find(d => d > dateStr);
                  if (nextDate) dateStr = nextDate;
                }
                
                if (dailyPrices[dateStr]) {
                  t.nav = dailyPrices[dateStr];
                  recoveredNavs++;
                }
              });
            }
          }
        } catch (err) {
          console.error(`Error procesando ticker ${h.ticker}:`, err);
        }
      }
      
      console.log(`Actualización completada.`);
      
      setHoldings(updatedHoldings);
      setState(prev => ({ 
        ...prev, 
        transactions: updatedTransactions,
        fundNames: newFundNames,
        historicalPrices: newHistoricalPrices,
        currentPrices: {
          ...(prev.currentPrices || {}),
          ...Object.fromEntries(
            updatedHoldings
              .filter(h => h.currentNav !== undefined)
              .map(h => [h.isin, { price: h.currentNav!, date: new Date().toISOString() }])
          )
        }
      }));
      
      if (recoveredNavs > 0) {
        alert(`✅ ¡Éxito! Se han actualizado los precios y se han recuperado ${recoveredNavs} precios históricos de compra.`);
      } else if (updatedCount > 0) {
        alert(`✅ Precios actualizados correctamente.`);
      } else {
        alert(`⚠️ No se han podido obtener datos nuevos. Revisa los Tickers en 'Ajustes'.`);
      }
      
    } catch (error) {
      console.error("Error al actualizar precios:", error);
      alert("Hubo un error al conectar con Yahoo Finance. Revisa la consola para más detalles.");
    } finally {
      setIsUpdatingPrices(false);
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'holdings', label: 'Cartera', icon: Wallet },
    { id: 'simulator', label: 'Simulador', icon: LineChart },
    { id: 'data', label: 'Datos', icon: Database },
    { id: 'settings', label: 'Ajustes', icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 px-4 py-6 flex flex-col">
        <div className="flex items-center gap-3 px-2 mb-8 text-slate-800">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-500 to-brand-300 flex items-center justify-center text-white shadow-soft">
            <Briefcase size={20} />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Portfolio</h1>
        </div>

        <nav className="flex-1 space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                activeTab === tab.id 
                  ? "bg-brand-50 text-brand-700 shadow-sm" 
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <tab.icon size={18} className={cn(
                activeTab === tab.id ? "text-brand-600" : "text-slate-400"
              )} />
              {tab.label}
            </button>
          ))}
        </nav>
        
        <div className="mt-auto px-2 pt-6">
          <p className="text-xs text-slate-400 font-medium">Portfolio Tracker v1.0</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          {activeTab === 'dashboard' && <Dashboard state={state} holdings={holdings} updatePrices={updatePrices} isUpdatingPrices={isUpdatingPrices} />}
          {activeTab === 'holdings' && <HoldingsTable holdings={holdings} transactions={state.transactions} historicalPrices={state.historicalPrices} />}
          {activeTab === 'simulator' && <Simulator />}
          {activeTab === 'data' && <DataManager state={state} setState={setState} />}
          {activeTab === 'settings' && <Settings state={state} setState={setState} holdings={holdings} />}
        </div>
      </main>
    </div>
  );
}

export default App;
