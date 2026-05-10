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

// Yahoo Finance API via CORS proxy
export async function fetchYahooFinancePrice(ticker: string): Promise<number | null> {
  try {
    const url = encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d`);
    const proxyUrl = `https://api.allorigins.win/get?url=${url}`;
    
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error('Network response was not ok');
    
    const data = await response.json();
    const yahooData = JSON.parse(data.contents);
    
    if (yahooData.chart && yahooData.chart.result && yahooData.chart.result.length > 0) {
      const result = yahooData.chart.result[0];
      const closePrices = result.indicators.quote[0].close;
      // Get the last valid price
      for (let i = closePrices.length - 1; i >= 0; i--) {
        if (closePrices[i] !== null) {
          return closePrices[i];
        }
      }
    }
    return null;
  } catch (error) {
    console.error(`Error fetching price for ${ticker}:`, error);
    return null;
  }
}
