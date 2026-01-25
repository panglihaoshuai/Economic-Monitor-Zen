export type View = 'dashboard' | 'records';

export interface EconomicData {
  series_id: string;
  date: string;
  value: number | null;
  created_at?: string;
}

export interface Transaction {
  id: string;
  type: 'buy' | 'sell';
  asset: string;
  amount: number;
  price: number;
  status: 'completed' | 'pending';
  timestamp: string;
  note?: string;
}

export interface DashboardStats {
  totalTransactions: number;
  completedTransactions: number;
  pendingTransactions: number;
  totalValue: number;
}