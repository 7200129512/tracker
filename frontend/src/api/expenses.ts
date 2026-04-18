import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from './client';
import type { ExpenseEntry } from '../types';

export const useExpenseEntries = (month?: string) =>
  useQuery<ExpenseEntry[]>({
    queryKey: ['expenses', month],
    queryFn: async () =>
      (await apiClient.get('/expenses', { params: month ? { month } : {} })).data,
  });

export const useMonthlySummary = () =>
  useQuery<{ month: string; expenses: number }[]>({
    queryKey: ['expenses', 'monthly-summary'],
    queryFn: async () => (await apiClient.get('/expenses/monthly-summary')).data,
  });

export const useCategoryBreakdown = (month: string) =>
  useQuery<{ category: string; amount: number; percentage: number }[]>({
    queryKey: ['expenses', 'category-breakdown', month],
    queryFn: async () =>
      (await apiClient.get('/expenses/category-breakdown', { params: { month } })).data,
  });

export const useAddExpense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<ExpenseEntry, 'id'>) => apiClient.post('/expenses', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
};

export const useUpdateExpense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: ExpenseEntry) => apiClient.put(`/expenses/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
};

export const useDeleteExpense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/expenses/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
};
