import React, { useState } from 'react';
import { PortfolioState, FundHolding } from '../types';
import { Link2, Save } from 'lucide-react';

interface SettingsProps {
  state: PortfolioState;
  setState: React.Dispatch<React.SetStateAction<PortfolioState>>;
  holdings: FundHolding[];
}

export default function Settings({ state, setState, holdings }: SettingsProps) {
  const [localMappings, setLocalMappings] = useState<Record<string, string>>(state.mappings);
  const [isSaved, setIsSaved] = useState(false);

  const handleMappingChange = (isin: string, ticker: string) => {
    setLocalMappings(prev => ({ ...prev, [isin]: ticker }));
    setIsSaved(false);
  };

  const saveMappings = () => {
    setState(prev => ({ ...prev, mappings: localMappings }));
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Ajustes</h2>
        <p className="text-slate-500 text-sm">Configura la vinculación de fondos.</p>
      </div>

      <div className="glass p-6 max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
            <Link2 size={20} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Mapeo de ISIN a Ticker de Yahoo Finance</h3>
            <p className="text-sm text-slate-500">
              Para obtener los precios en tiempo real, vincula el ISIN de tu fondo con su Ticker correspondiente en Yahoo Finance (ej: 0P0000XW97.F).
            </p>
          </div>
        </div>

        {holdings.length === 0 ? (
          <p className="text-sm text-slate-500 italic py-4">No hay fondos en la cartera. Importa un CSV primero.</p>
        ) : (
          <div className="space-y-4">
            {holdings.map(h => (
              <div key={h.isin} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800 truncate" title={h.name}>{h.name}</p>
                  <p className="text-xs text-slate-500 font-mono mt-1">{h.isin}</p>
                </div>
                <div className="w-full sm:w-64">
                  <input
                    type="text"
                    placeholder="Ticker en Yahoo Finance"
                    value={localMappings[h.isin] || ''}
                    onChange={(e) => handleMappingChange(h.isin, e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-shadow"
                  />
                </div>
              </div>
            ))}

            <div className="pt-4 flex justify-end">
              <button
                onClick={saveMappings}
                className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-xl shadow-sm hover:bg-brand-700 transition-colors font-medium"
              >
                <Save size={18} />
                {isSaved ? 'Guardado!' : 'Guardar Mapeo'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
