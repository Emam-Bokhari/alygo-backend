export interface IRevenueResponse {
  summary: {
    totalRevenue: number;
    platformEarnings: number;
    driverPayouts: number;
  };
  revenue: {
    today: number;
    thisMonth: number;
  };
  trend: Array<{
    date: string;
    label: string;
    revenue: number;
  }>;
}

export interface IPayoutListItem {
  payoutId: string;
  driver: {
    id: string;
    name: string;
  };
  amount: number;
  status: string;
  date: Date;
}

export interface IWalletsResponse {
  totalWalletBalance: number;
  activeWallets: number;
  pendingTopUps: number;
}

export interface ITransactionListItem {
  transactionId: string;
  type: string;
  amount: number;
  platformFee: number;
  status: string;
  createdAt: Date;
}
