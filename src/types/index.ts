export interface Transaction {
  id: string;
  date: Date;
  concept: string;
  isin: string;
  amount: number; // positive for deposit, negative for withdrawal
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
}

export type TabType = 'dashboard' | 'holdings' | 'simulator' | 'data' | 'settings';
