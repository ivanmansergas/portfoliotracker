import React, { useRef } from 'react';
import Papa from 'papaparse';
import { Upload, Download, Trash2, FileText, Database } from 'lucide-react';
import { PortfolioState, Transaction } from '../types';

interface DataManagerProps {
  state: PortfolioState;
  setState: React.Dispatch<React.SetStateAction<PortfolioState>>;
}

export default function DataManager({ state, setState }: DataManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      delimiter: ';', // Usar explícitamente punto y coma
      complete: (results) => {
        try {
          const newTransactions: Transaction[] = results.data.map((row: any) => {
            // Limpiar las claves por si hay espacios invisibles
            const cleanRow: Record<string, string> = {};
            for (const key in row) {
              cleanRow[key.trim()] = row[key];
            }

            const rawDate = cleanRow['Fecha de la orden'] || cleanRow['Fecha'];
            if (!rawDate) return null;

            const dateParts = rawDate.split('/');
            const date = new Date(Number(dateParts[2]), Number(dateParts[1]) - 1, Number(dateParts[0]));
            
            const parseAmount = (val: any) => {
              if (!val) return 0;
              return parseFloat(String(val).replace(/EUR|€/gi, '').replace(/\./g, '').replace(',', '.').trim());
            };

            const amount = parseAmount(cleanRow['Importe estimado'] || cleanRow['Importe']);
            const units = parseAmount(cleanRow['Nº de participaciones'] || cleanRow['Nº participaciones']);
            
            // Intentar obtener el NAV de compra (Valor liquidativo en MyInvestor)
            const nav = parseAmount(cleanRow['Valor liquidativo'] || cleanRow['NAV compra'] || cleanRow['Precio de ejecución'] || cleanRow['Precio']);

            const isin = cleanRow['ISIN'];
            const concept = cleanRow['Concepto'] || `Orden ${isin || ''}`;

            // Solo procesamos las finalizadas si existe la columna Estado
            if (cleanRow['Estado'] && cleanRow['Estado'].trim().toLowerCase() !== 'finalizada') {
              return null;
            }

            return {
              id: crypto.randomUUID(),
              date,
              concept,
              isin,
              amount,
              units,
              nav: nav || (units !== 0 ? amount / units : undefined)
            };
          }).filter(t => t !== null && !isNaN(t.date.getTime()) && !isNaN(t.amount)) as Transaction[];

          setState(prev => {
            const existingIds = new Set(prev.transactions.map(t => `${t.isin}-${t.date.getTime()}-${t.amount.toFixed(2)}-${t.units.toFixed(4)}`));
            
            const uniqueNewTransactions = newTransactions.filter(t => {
              const key = `${t.isin}-${t.date.getTime()}-${t.amount.toFixed(2)}-${t.units.toFixed(4)}`;
              if (existingIds.has(key)) return false;
              return true;
            });

            return {
              ...prev,
              transactions: [...prev.transactions, ...uniqueNewTransactions].sort((a, b) => a.date.getTime() - b.date.getTime())
            };
          });

          if (fileInputRef.current) fileInputRef.current.value = '';
          alert(`Importadas ${newTransactions.length} transacciones correctamente.`);
        } catch (error) {
          console.error(error);
          alert('Error al procesar el CSV. Verifica el formato del archivo.');
        }
      }
    });
  };

  const exportData = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `portfolio-tracker-${new Date().toISOString().split('T')[0]}.json`;

    let linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        parsed.transactions = parsed.transactions.map((t: any) => ({
          ...t,
          date: new Date(t.date)
        }));
        setState(parsed);
        alert('Estado importado correctamente.');
      } catch (error) {
        alert('Error al importar el archivo JSON.');
      }
    };
    reader.readAsText(file);
  };

  const clearData = () => {
    setState({ transactions: [], mappings: {}, fundNames: {} });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Gestión de Datos</h2>
        <p className="text-slate-500 text-sm">Importa CSV o gestiona tu archivo de guardado.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        <div className="glass p-6 space-y-4">
          <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 mb-4">
            <FileText size={20} />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">Importar CSV de MyInvestor</h3>
          <p className="text-sm text-slate-500">
            Sube el archivo CSV exportado desde MyInvestor. Debe contener las columnas: <code className="bg-slate-100 px-1 py-0.5 rounded">Fecha de la orden</code>, <code className="bg-slate-100 px-1 py-0.5 rounded">ISIN</code>, <code className="bg-slate-100 px-1 py-0.5 rounded">Importe estimado</code>, <code className="bg-slate-100 px-1 py-0.5 rounded">Nº de participaciones</code> y <code className="bg-slate-100 px-1 py-0.5 rounded">Estado</code>. Solo se importarán las órdenes finalizadas.
          </p>

          <input
            type="file"
            accept=".csv"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-xl shadow-sm hover:bg-brand-700 transition-colors font-medium"
          >
            <Upload size={18} />
            Seleccionar archivo CSV
          </button>
        </div>

        <div className="glass p-6 space-y-4">
          <div className="w-10 h-10 rounded-full bg-gold-100 flex items-center justify-center text-gold-600 mb-4">
            <Database size={20} />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">Copia de Seguridad (JSON)</h3>
          <p className="text-sm text-slate-500">
            Descarga el estado completo de la app para guardarlo en tu repositorio de GitHub, o cárgalo para restaurarlo.
          </p>

          <div className="flex gap-3">
            <button
              onClick={exportData}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl shadow-sm hover:bg-slate-50 transition-colors font-medium"
            >
              <Download size={18} />
              Exportar
            </button>

            <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl shadow-sm hover:bg-slate-50 transition-colors font-medium cursor-pointer">
              <Upload size={18} />
              Importar
              <input type="file" accept=".json" className="hidden" onChange={importJson} />
            </label>
          </div>
        </div>

      </div>

      <div className="flex justify-end pt-8">
        <button
          onClick={clearData}
          className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors text-sm font-medium"
        >
          <Trash2 size={16} />
          Borrar todos los datos
        </button>
      </div>
    </div>
  );
}
