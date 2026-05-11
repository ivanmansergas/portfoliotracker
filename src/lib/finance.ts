import { differenceInDays } from 'date-fns';

export interface CashFlow {
  amount: number;
  date: Date;
}

// XIRR Implementation based on Newton-Raphson method
export function xirr(cashFlows: CashFlow[], guess: number = 0.1): number {
  if (cashFlows.length < 2) return 0;
  
  // Sort cash flows by date
  const sortedFlows = [...cashFlows].sort((a, b) => a.date.getTime() - b.date.getTime());
  
  const minDate = sortedFlows[0].date;
  
  // Define the NPV function
  const npv = (rate: number) => {
    return sortedFlows.reduce((acc, flow) => {
      const days = differenceInDays(flow.date, minDate);
      return acc + flow.amount / Math.pow(1 + rate, days / 365);
    }, 0);
  };
  
  // Define the derivative of the NPV function
  const npvDerivative = (rate: number) => {
    return sortedFlows.reduce((acc, flow) => {
      const days = differenceInDays(flow.date, minDate);
      if (days === 0) return acc;
      return acc - (days / 365) * flow.amount / Math.pow(1 + rate, (days / 365) + 1);
    }, 0);
  };
  
  // Newton-Raphson method
  let rate = guess;
  const maxIterations = 100;
  const epsilon = 1e-6;
  
  for (let i = 0; i < maxIterations; i++) {
    const value = npv(rate);
    if (Math.abs(value) < epsilon) {
      return rate;
    }
    const derivative = npvDerivative(rate);
    if (derivative === 0) break;
    rate = rate - value / derivative;
  }
  
  return rate; // Returns a decimal, e.g. 0.05 for 5%
}

// Yahoo Finance API via Vite proxy
export interface YahooFinanceResult {
  price: number;
  name: string;
}

export async function fetchYahooFinancePrice(ticker: string): Promise<YahooFinanceResult | null> {
  const cleanTicker = ticker.trim();
  try {
    const url = `/api/yahoo/v8/finance/chart/${cleanTicker}?interval=1d`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.warn(`Yahoo API error for ${cleanTicker}: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const yahooData = await response.json();
    
    if (yahooData.chart?.error) {
      console.error(`Yahoo error for ${cleanTicker}:`, yahooData.chart.error);
      return null;
    }
    
    const result = yahooData.chart?.result?.[0];
    if (!result) return null;

    const name = result.meta?.longName || result.meta?.shortName || cleanTicker;
    
    // 1. Intentar precio actual en meta
    if (result.meta && typeof result.meta.regularMarketPrice === 'number') {
      return { price: result.meta.regularMarketPrice, name };
    }
    
    // 2. Intentar precio de cierre anterior en meta
    if (result.meta && typeof result.meta.previousClose === 'number') {
      return { price: result.meta.previousClose, name };
    }
    
    // 3. Buscar en el indicador de cierre (el último valor no nulo)
    const quote = result.indicators?.quote?.[0];
    if (quote?.close) {
      const closePrices = quote.close;
      for (let i = closePrices.length - 1; i >= 0; i--) {
        if (closePrices[i] !== null && closePrices[i] !== undefined) {
          return { price: closePrices[i], name };
        }
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}
export async function fetchHistoricalYearEndPrices(ticker: string): Promise<Record<number, number>> {
  try {
    // Pedimos datos mensuales de los últimos 10 años para encontrar los cierres de año
    const url = `/api/yahoo/v8/finance/chart/${ticker}?range=10y&interval=1mo`;
    
    const response = await fetch(url);
    if (!response.ok) return {};
    
    const data = await response.json();
    const result = data.chart?.result?.[0];
    if (!result || !result.timestamp || !result.indicators?.quote?.[0]?.close) return {};

    const timestamps = result.timestamp;
    const prices = result.indicators.quote[0].close;
    const yearEndPrices: Record<number, number> = {};

    timestamps.forEach((ts: number, i: number) => {
      const date = new Date(ts * 1000);
      const year = date.getFullYear();
      const month = date.getMonth(); // 0-11
      const price = prices[i];

      if (price !== null && price !== undefined) {
        // Guardamos el último precio disponible para cada año (usualmente diciembre)
        // O si ya tenemos uno de ese año, solo lo actualizamos si es un mes posterior
        if (!yearEndPrices[year] || month >= date.getMonth()) {
          yearEndPrices[year] = price;
        }
      }
    });

    return yearEndPrices;
  } catch (error) {
    console.error(`Error fetching historical prices for ${ticker}:`, error);
    return {};
  }
}

/**
 * Obtiene el histórico diario completo para mapear precios a fechas de ejecución.
 * Retorna un objeto { "YYYY-MM-DD": precio }
 */
export async function fetchDailyHistoricalPrices(ticker: string): Promise<Record<string, number>> {
  try {
    // Pedimos datos diarios de los últimos 5 años
    const url = `/api/yahoo/v8/finance/chart/${ticker}?range=5y&interval=1d`;
    
    const response = await fetch(url);
    if (!response.ok) return {};
    
    const data = await response.json();
    const result = data.chart?.result?.[0];
    if (!result || !result.timestamp || !result.indicators?.quote?.[0]?.close) return {};

    const timestamps = result.timestamp;
    const prices = result.indicators.quote[0].close;
    const dailyPrices: Record<string, number> = {};

    timestamps.forEach((ts: number, i: number) => {
      const price = prices[i];
      if (price !== null && price !== undefined) {
        const date = new Date(ts * 1000);
        const dateStr = date.toISOString().split('T')[0];
        dailyPrices[dateStr] = price;
      }
    });

    return dailyPrices;
  } catch (error) {
    console.error(`Error fetching daily historical prices for ${ticker}:`, error);
    return {};
  }
}
