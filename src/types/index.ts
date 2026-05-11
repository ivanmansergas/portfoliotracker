export interface Transaction {
  id: string;
  date: Date;
  concept: string;
  isin: string;
  amount: number; // positive for deposit, negative for withdrawal
  units: number;  // number of shares/units
  nav?: number;   // price at acquisition
}

export interface FundHolding {
  isin: string;
  name: string;
  ticker?: string;
  units: number;
  totalInvested: number;
  currentNav?: number;
  navDate?: Date;
  currentValue?: number;
}

export interface PortfolioState {
  transactions: Transaction[];
  mappings: Record<string, string>; // ISIN -> Ticker
  fundNames: Record<string, string>; // ISIN -> Fund Name (from Yahoo Finance)
  historicalPrices: Record<string, Record<number, number>>; // ISIN -> Year -> Price
  currentPrices: Record<string, { price: number; date: string }>; // ISIN -> Price Data
}

export type TabType = 'dashboard' | 'holdings' | 'simulator' | 'data' | 'settings';
