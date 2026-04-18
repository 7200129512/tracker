import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from './client';
import type { SavingsTransaction } from '../types';

export const useSavingsTransactions = () =>
  useQuery<SavingsTransaction[]>({
    queryKey: ['savings', 'transactions'],
    queryFn: async () => (await apiClient.get('/savings/transactions')).data,
  });

export const useSavingsBalance = (from?: string, to?: string) =>
  useQuery<{ balance: number; totalDeposited: number; totalWithdrawn: number }>({
    queryKey: ['savings', 'balance', from, to],
    queryFn: async () =>
      (await apiClient.get('/savings/balance', { params: { from, to } })).data,
  });

export const useAddTransaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<SavingsTransaction, 'id'>) =>
      apiClient.post('/savings/transactions', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['savings'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useUpdateTransaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: SavingsTransaction) =>
      apiClient.put(`/savings/transactions/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['savings'] }),
  });
};

export const useDeleteTransaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/savings/transactions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['savings'] }),
  });
};
