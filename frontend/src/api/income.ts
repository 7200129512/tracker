import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from './client';
import type { IncomeEntry } from '../types';

export const useIncomeEntries = () =>
  useQuery<IncomeEntry[]>({
    queryKey: ['income'],
    queryFn: async () => (await apiClient.get('/income')).data,
  });

export const useMonthlyIncomeSummary = () =>
  useQuery<{ month: string; income: number }[]>({
    queryKey: ['income', 'monthly-summary'],
    queryFn: async () => (await apiClient.get('/income/monthly-summary')).data,
  });

export const useAddIncome = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<IncomeEntry, 'id'>) => apiClient.post('/income', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['income'] }),
  });
};

export const useUpdateIncome = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: IncomeEntry) => apiClient.put(`/income/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['income'] }),
  });
};

export const useDeleteIncome = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/income/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['income'] }),
  });
};
