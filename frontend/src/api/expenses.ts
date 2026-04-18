import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from './client';
import { useAuth } from '../context/AuthContext';
import type { ExpenseEntry } from '../types';

export const useExpenseEntries = (month?: string) => {
  const { user } = useAuth();

  return useQuery<ExpenseEntry[]>({
    queryKey: ['expenses', month, user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        const res = await supabaseClient.get(`/expense_entries?user_id=eq.${user.id}&order=id.desc`);
        return res.data;
      } catch (error) {
        console.error('Expenses error:', error);
        return [];
      }
    },
    enabled: !!user?.id,
  });
};

export const useMonthlySummary = () => {
  const { user } = useAuth();

  return useQuery<{ month: string; expenses: number }[]>({
    queryKey: ['expenses', 'monthly-summary', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        const res = await supabaseClient.get(`/expense_entries?user_id=eq.${user.id}&select=*`);
        return res.data.map((row: any) => ({
          month: new Date(row.date).toISOString().slice(0, 7),
          expenses: parseFloat(row.amount || 0)
        }));
      } catch (error) {
        console.error('Monthly summary error:', error);
        return [];
      }
    },
    enabled: !!user?.id,
  });
};

export const useCategoryBreakdown = (month: string) => {
  const { user } = useAuth();

  return useQuery<{ category: string; amount: number; percentage: number }[]>({
    queryKey: ['expenses', 'category-breakdown', month, user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        const res = await supabaseClient.get(`/expense_entries?user_id=eq.${user.id}&select=category,amount`);
        const total = res.data.reduce((sum: number, row: any) => sum + parseFloat(row.amount || 0), 0);
        const grouped = res.data.reduce((acc: any, row: any) => {
          const cat = row.category || 'Other';
          if (!acc[cat]) acc[cat] = 0;
          acc[cat] += parseFloat(row.amount || 0);
          return acc;
        }, {});
        
        return Object.entries(grouped).map(([category, amount]: any) => ({
          category,
          amount,
          percentage: (amount / total) * 100
        }));
      } catch (error) {
        console.error('Category breakdown error:', error);
        return [];
      }
    },
    enabled: !!user?.id,
  });
};

export const useAddExpense = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Omit<ExpenseEntry, 'id'>) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      // Convert camelCase to snake_case for database
      const payload = {
        name: data.name,
        amount: data.amount,
        category: data.category,
        type: data.type,
        date: data.date,
        due_date: data.dueDate,
        user_id: user.id,
      };
      
      return supabaseClient.post('/expense_entries', payload);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
};

export const useUpdateExpense = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, ...data }: ExpenseEntry) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      // Convert camelCase to snake_case for database
      const payload = {
        name: data.name,
        amount: data.amount,
        category: data.category,
        type: data.type,
        date: data.date,
        due_date: data.dueDate,
      };
      
      return supabaseClient.patch(`/expense_entries?id=eq.${id}&user_id=eq.${user.id}`, payload);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
};

export const useDeleteExpense = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => {
      if (!user?.id) throw new Error('User not authenticated');
      return supabaseClient.delete(`/expense_entries?id=eq.${id}&user_id=eq.${user.id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
};
