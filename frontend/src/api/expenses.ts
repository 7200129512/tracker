import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from './client';
import type { ExpenseEntry } from '../types';

export const useExpenseEntries = (month?: string) =>
  useQuery<ExpenseEntry[]>({
    queryKey: ['expenses', month],
    queryFn: async () => {
      try {
        const res = await supabaseClient.get('/expense_entries?order=id.desc');
        return res.data;
      } catch (error) {
        console.error('Expenses error:', error);
        return [];
      }
    },
  });

export const useMonthlySummary = () =>
  useQuery<{ month: string; expenses: number }[]>({
    queryKey: ['expenses', 'monthly-summary'],
    queryFn: async () => {
      try {
        const res = await supabaseClient.get('/expense_entries?select=*');
        return res.data.map((row: any) => ({
          month: new Date(row.date).toISOString().slice(0, 7),
          expenses: parseFloat(row.amount || 0)
        }));
      } catch (error) {
        console.error('Monthly summary error:', error);
        return [];
      }
    },
  });

export const useCategoryBreakdown = (month: string) =>
  useQuery<{ category: string; amount: number; percentage: number }[]>({
    queryKey: ['expenses', 'category-breakdown', month],
    queryFn: async () => {
      try {
        const res = await supabaseClient.get('/expense_entries?select=category,amount');
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
  });

export const useAddExpense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<ExpenseEntry, 'id'>) => 
      supabaseClient.post('/expense_entries', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
};

export const useUpdateExpense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: ExpenseEntry) => 
      supabaseClient.patch(`/expense_entries?id=eq.${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
};

export const useDeleteExpense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => 
      supabaseClient.delete(`/expense_entries?id=eq.${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
};
