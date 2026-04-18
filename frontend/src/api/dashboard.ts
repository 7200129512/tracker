import { useQuery } from '@tanstack/react-query';
import { supabaseClient } from './client';
import { useAuth } from '../context/AuthContext';
import type { DashboardSummary, CashFlowPoint, DashboardAlerts } from '../types';

export const useDashboardSummary = (month: string) => {
  const { user } = useAuth();

  return useQuery<DashboardSummary>({
    queryKey: ['dashboard', 'summary', month, user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        // Fetch income entries - for now, get all (user_id column doesn't exist yet)
        const incomeRes = await supabaseClient.get('/income_entries?select=source_name,amount,frequency');
        
        // Calculate income: exclude PF and Variable Pay from monthly income
        let totalIncome = 0;
        let pfAmount = 0;
        let variablePayAmount = 0;
        
        incomeRes.data.forEach((row: any) => {
          const amount = parseFloat(row.amount || 0);
          const sourceName = (row.source_name || '').toLowerCase();
          
          if (sourceName.includes('pf')) {
            // Sum all PF entries (both one-time and monthly)
            pfAmount += amount;
          } else if (sourceName.includes('variable')) {
            // Variable pay is tracked separately, not added to monthly income
            variablePayAmount = amount;
          } else {
            // Include only base salary and other income
            totalIncome += amount;
          }
        });

        // Fetch expense entries - for now, get all
        const expenseRes = await supabaseClient.get('/expense_entries?select=amount');
        const totalExpenses = expenseRes.data.reduce((sum: number, row: any) => sum + parseFloat(row.amount || 0), 0);

        // Fetch loans - for now, get all
        const loanRes = await supabaseClient.get('/loans?select=outstanding_principal&is_closed=eq.false');
        const outstandingLoanPrincipal = loanRes.data.reduce((sum: number, row: any) => sum + parseFloat(row.outstanding_principal || 0), 0);

        // Fetch investments - for now, get all
        const investRes = await supabaseClient.get('/investment_holdings?is_closed=eq.false&select=quantity,purchase_price');
        const portfolioInvestedValue = investRes.data.reduce((sum: number, row: any) => sum + (parseFloat(row.quantity || 0) * parseFloat(row.purchase_price || 0)), 0);

        // Fetch savings - for now, get all
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
          pfAmount: parseFloat(pfAmount.toFixed(2)),
          variablePayAmount: parseFloat(variablePayAmount.toFixed(2)),
        };
      } catch (error) {
        console.error('Dashboard error:', error);
        throw error;
      }
    },
    refetchInterval: 30000,
    enabled: !!user?.id,
  });
};

export const useCashFlow = () => {
  const { user } = useAuth();

  return useQuery<CashFlowPoint[]>({
    queryKey: ['dashboard', 'cashflow', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        const incomeRes = await supabaseClient.get('/income_entries?select=effective_date,amount,source_name');
        const expenseRes = await supabaseClient.get('/expense_entries?select=date,amount');
        
        // Combine and group by month, excluding PF and Variable Pay from income
        const allData = [
          ...incomeRes.data
            .filter((row: any) => {
              const sourceName = (row.source_name || '').toLowerCase();
              return !sourceName.includes('pf') && !sourceName.includes('variable');
            })
            .map((row: any) => ({ date: row.effective_date, amount: parseFloat(row.amount || 0), type: 'income' })),
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
    enabled: !!user?.id,
  });
};

export const useDashboardAlerts = (month: string) => {
  const { user } = useAuth();

  return useQuery<DashboardAlerts>({
    queryKey: ['dashboard', 'alerts', month, user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

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
    enabled: !!user?.id,
  });
};
