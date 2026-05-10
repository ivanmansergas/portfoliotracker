import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Wallet, 
  LineChart, 
  Database, 
  Settings as SettingsIcon,
  Briefcase
} from 'lucide-react';
import { cn } from './lib/utils';
import { PortfolioState, TabType, Transaction, FundHolding } from './types';
import Dashboard from './components/Dashboard';
import HoldingsTable from './components/HoldingsTable';
import Simulator from './components/Simulator';
import DataManager from './components/DataManager';
import Settings from './components/Settings';
import { fetchYahooFinancePrice } from './lib/finance';

const defaultState: PortfolioState = {
  transactions: [],
  mappings: {}
};

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [state, setState] = useState<PortfolioState>(() => {
    const saved = localStorage.getItem('portfolioTrackerState');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Revive dates
        parsed.transactions = parsed.transactions.map((t: any) => ({
          ...t,
          date: new Date(t.date)
        }));
        return parsed;
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
          name: t.concept || t.isin,
          ticker: state.mappings[t.isin],
          units: 0,
          totalInvested: 0,
        });
      }
      const h = holdingMap.get(t.isin)!;
      // In MyInvestor CSV, usually amount is positive for contributions.
      h.totalInvested += t.amount;
      // Note: Accurately tracking units requires unit price at transaction date.
      // Since CSV might only provide Amount, we approximate or rely on current Nav.
      // For a real tracker, units would be tracked explicitly.
      // We will estimate units later if we have currentNav and totalValue.
    });

    setHoldings(Array.from(holdingMap.values()));
  }, [state.transactions, state.mappings]);

  const updatePrices = async () => {
    setIsUpdatingPrices(true);
    const updatedHoldings = [...holdings];
    
    for (let h of updatedHoldings) {
      if (h.ticker) {
        const price = await fetchYahooFinancePrice(h.ticker);
        if (price) {
          h.currentNav = price;
          h.navDate = new Date();
          // We can't calculate currentValue precisely without units.
          // If the user inputs total units somewhere, we can do it.
          // For now, we will simulate this for demonstration unless added to CSV.
        }
      }
    }
    setHoldings(updatedHoldings);
    setIsUpdatingPrices(false);
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
          {activeTab === 'holdings' && <HoldingsTable holdings={holdings} />}
          {activeTab === 'simulator' && <Simulator />}
          {activeTab === 'data' && <DataManager state={state} setState={setState} />}
          {activeTab === 'settings' && <Settings state={state} setState={setState} holdings={holdings} />}
        </div>
      </main>
    </div>
  );
}

export default App;
