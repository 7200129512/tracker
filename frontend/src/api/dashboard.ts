import { useQuery } from '@tanstack/react-query';
import { supabaseClient } from './client';
import type { DashboardSummary, CashFlowPoint, DashboardAlerts } from '../types';

export const useDashboardSummary = (month: string) =>
  useQuery<DashboardSummary>({
    queryKey: ['dashboard', 'summary', month],
    queryFn: async () => {
      try {
        // Fetch income entries
        const incomeRes = await supabaseClient.get('/income_entries?select=amount');
        const totalIncome = incomeRes.data.reduce((sum: number, row: any) => sum + parseFloat(row.amount || 0), 0);

        // Fetch expense entries
        const expenseRes = await supabaseClient.get('/expense_entries?select=amount');
        const totalExpenses = expenseRes.data.reduce((sum: number, row: any) => sum + parseFloat(row.amount || 0), 0);

        // Fetch loans
        const loanRes = await supabaseClient.get('/loans?select=outstanding_principal&is_closed=eq.false');
        const outstandingLoanPrincipal = loanRes.data.reduce((sum: number, row: any) => sum + parseFloat(row.outstanding_principal || 0), 0);

        // Fetch investments
        const investRes = await supabaseClient.get('/investment_holdings?is_closed=eq.false&select=quantity,purchase_price');
        const portfolioInvestedValue = investRes.data.reduce((sum: number, row: any) => sum + (parseFloat(row.quantity || 0) * parseFloat(row.purchase_price || 0)), 0);

        // Fetch savings
        const savingsRes = await supabaseClient.get('/savings_transactions?select=type,amount');
        const savingsBalance = savingsRes.data.reduce((sum: number, row: any) => {
          const amount = parseFloat(row.amount || 0);
          return row.type === 'Deposit' ? sum + amount : sum - amount;
        }, 0);

        const monthlySurplus = totalIncome - totalExpenses;
        const savingsRate = totalIncome > 0 ? (monthlySurplus / totalIncome) * 100 : 0;
        const netWorth = savingsBalance - outstandingLoanPrincipal;

        return {
          totalIncome: parseFloat(totalIncome.toFixed(2)),
          totalExpenses: parseFloat(totalExpenses.toFixed(2)),
          monthlySurplus: parseFloat(monthlySurplus.toFixed(2)),
          savingsRate: parseFloat(savingsRate.toFixed(2)),
          netWorth: parseFloat(netWorth.toFixed(2)),
          portfolioCurrentValue: parseFloat(portfolioInvestedValue.toFixed(2)),
          portfolioInvestedValue: parseFloat(portfolioInvestedValue.toFixed(2)),
          portfolioGainLoss: 0,
          portfolioGainLossPct: 0,
          savingsBalance: parseFloat(savingsBalance.toFixed(2)),
          outstandingLoanPrincipal: parseFloat(outstandingLoanPrincipal.toFixed(2)),
        };
      } catch (error) {
        console.error('Dashboard error:', error);
        throw error;
      }
    },
    refetchInterval: 30000,
  });

export const useCashFlow = () =>
  useQuery<CashFlowPoint[]>({
    queryKey: ['dashboard', 'cashflow'],
    queryFn: async () => {
      try {
        const incomeRes = await supabaseClient.get('/income_entries?select=effective_date,amount');
        const expenseRes = await supabaseClient.get('/expense_entries?select=date,amount');
        
        // Combine and group by month
        const allData = [
          ...incomeRes.data.map((row: any) => ({ date: row.effective_date, amount: parseFloat(row.amount || 0), type: 'income' })),
          ...expenseRes.data.map((row: any) => ({ date: row.date, amount: parseFloat(row.amount || 0), type: 'expense' }))
        ];

        const grouped: { [key: string]: { income: number; expenses: number } } = {};
        allData.forEach((item: any) => {
          const month = item.date.substring(0, 7);
          if (!grouped[month]) grouped[month] = { income: 0, expenses: 0 };
          if (item.type === 'income') grouped[month].income += item.amount;
          else grouped[month].expenses += item.amount;
        });

        return Object.entries(grouped).map(([month, data]) => ({
          month,
          income: data.income,
          expenses: data.expenses
        }));
      } catch (error) {
        console.error('Cashflow error:', error);
        return [];
      }
    },
  });

export const useDashboardAlerts = (month: string) =>
  useQuery<DashboardAlerts>({
    queryKey: ['dashboard', 'alerts', month],
    queryFn: async () => {
      try {
        // Fetch loans to check for EMI reminders
        const loanRes = await supabaseClient.get('/loans?is_closed=eq.false&select=id,loan_name');
        const emiReminder = loanRes.data.length > 0;
        const emiReminderLoanName = loanRes.data.length > 0 ? loanRes.data[0].loan_name : undefined;

        return {
          budgetAlert: false,
          lowSurplusAlert: false,
          emiReminder,
          emiReminderLoanName,
        };
      } catch (error) {
        console.error('Alerts error:', error);
        return {
          budgetAlert: false,
          lowSurplusAlert: false,
          emiReminder: false,
        };
      }
    },
    refetchInterval: 30000,
  });
