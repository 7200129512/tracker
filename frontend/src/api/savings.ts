import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from './client';
import type { SavingsTransaction } from '../types';

export const useSavingsTransactions = () =>
  useQuery<SavingsTransaction[]>({
    queryKey: ['savings', 'transactions'],
    queryFn: async () => {
      try {
        const res = await supabaseClient.get('/savings_transactions?order=id.desc');
        return res.data;
      } catch (error) {
        console.error('Savings transactions error:', error);
        return [];
      }
    },
  });

export const useSavingsBalance = (from?: string, to?: string) =>
  useQuery<{ balance: number; totalDeposited: number; totalWithdrawn: number }>({
    queryKey: ['savings', 'balance', from, to],
    queryFn: async () => {
      try {
        const res = await supabaseClient.get('/savings_transactions?select=type,amount');
        const totalDeposited = res.data
          .filter((row: any) => row.type === 'Deposit')
          .reduce((sum: number, row: any) => sum + parseFloat(row.amount || 0), 0);
        const totalWithdrawn = res.data
          .filter((row: any) => row.type === 'Withdrawal')
          .reduce((sum: number, row: any) => sum + parseFloat(row.amount || 0), 0);
        const balance = totalDeposited - totalWithdrawn;
        
        return {
          balance: parseFloat(balance.toFixed(2)),
          totalDeposited: parseFloat(totalDeposited.toFixed(2)),
          totalWithdrawn: parseFloat(totalWithdrawn.toFixed(2))
        };
      } catch (error) {
        console.error('Savings balance error:', error);
        return { balance: 0, totalDeposited: 0, totalWithdrawn: 0 };
      }
    },
  });

export const useAddTransaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<SavingsTransaction, 'id'>) =>
      supabaseClient.post('/savings_transactions', data),
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
      supabaseClient.patch(`/savings_transactions?id=eq.${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['savings'] }),
  });
};

export const useDeleteTransaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => supabaseClient.delete(`/savings_transactions?id=eq.${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['savings'] }),
  });
};
