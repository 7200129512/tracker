import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from './client';
import type { IncomeEntry } from '../types';

export const useIncomeEntries = () =>
  useQuery<IncomeEntry[]>({
    queryKey: ['income'],
    queryFn: async () => {
      try {
        const res = await supabaseClient.get('/income_entries?order=id.desc');
        return res.data;
      } catch (error) {
        console.error('Income error:', error);
        return [];
      }
    },
  });

export const useMonthlyIncomeSummary = () =>
  useQuery<{ month: string; income: number }[]>({
    queryKey: ['income', 'monthly-summary'],
    queryFn: async () => {
      try {
        const res = await supabaseClient.get('/income_entries?select=*');
        return res.data.map((row: any) => ({
          month: new Date(row.effective_date).toISOString().slice(0, 7),
          income: parseFloat(row.amount || 0)
        }));
      } catch (error) {
        console.error('Monthly summary error:', error);
        return [];
      }
    },
  });

export const useAddIncome = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<IncomeEntry, 'id'>) => 
      supabaseClient.post('/income_entries', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['income'] }),
  });
};

export const useUpdateIncome = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: IncomeEntry) => 
      supabaseClient.patch(`/income_entries?id=eq.${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['income'] }),
  });
};

export const useDeleteIncome = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => 
      supabaseClient.delete(`/income_entries?id=eq.${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['income'] }),
  });
};
