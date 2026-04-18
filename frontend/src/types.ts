export interface IncomeEntry {
  id: number;
  sourceName: string;
  amount: number;
  frequency: 'monthly' | 'one-time' | 'annual';
  effectiveDate: string;
  incomeType?: 'base' | 'variable' | 'pf' | 'other'; // New field to categorize income
}

export interface ExpenseEntry {
  id: number;
  name: string;
  amount: number;
  category: 'Rent' | 'EMI' | 'Food' | 'Transport' | 'Utilities' | 'Entertainment' | 'Other';
  type: 'Fixed' | 'Variable';
  date: string;
  dueDate?: number; // Day of month when due (e.g., 6 for 6th of each month)
}

export interface Loan {
  id: number;
  loanName: string;
  originalPrincipal: number;
  outstandingPrincipal: number;
  emiAmount: number;
  interestRatePa: number;
  emiStartDate: string;
  isClosed: boolean;
  remainingInstalments: number;
  estimatedClosureDate: string;
  emiWarning?: boolean;
}

export interface EmiPayment {
  id: number;
  loanId: number;
  paymentMonth: string;
  emiPaid: number;
  principalComponent: number;
  interestComponent: number;
  balanceAfter: number;
}

export interface AmortisationRow {
  paymentDate: string;
  principalComponent: number;
  interestComponent: number;
  balanceAfter: number;
}

export interface InvestmentHolding {
  id: number;
  stockSymbol: string;
  stockName: string;
  quantity: number;
  purchasePrice: number;
  purchaseDate: string;
  isClosed: boolean;
  currentPrice: number | null;
  priceStale: boolean;
  priceFetchedAt: string | null;
}

export interface SellTransaction {
  id: number;
  holdingId: number;
  quantitySold: number;
  sellPrice: number;
  sellDate: string;
  realisedGain: number;
}

export interface SavingsTransaction {
  id: number;
  type: 'Deposit' | 'Withdrawal';
  amount: number;
  date: string;
  description: string;
}

export interface MonthlyNote {
  id: number;
  month: string;
  note: string;
}

export interface DashboardSummary {
  totalIncome: number;
  totalExpenses: number;
  monthlySurplus: number;
  outstandingLoanPrincipal: number;
  netWorth: number;
  savingsRate: number;
  portfolioCurrentValue: number;
  portfolioInvestedValue: number;
  portfolioGainLoss: number;
  portfolioGainLossPct: number;
  savingsBalance: number;
}

export interface CashFlowPoint {
  month: string;
  income: number;
  expenses: number;
}

export interface DashboardAlerts {
  budgetAlert: boolean;
  lowSurplusAlert: boolean;
  emiReminder: boolean;
  emiReminderLoanName?: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}
