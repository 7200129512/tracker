import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from './client';
import { useAuth } from '../context/AuthContext';
import type { SavingsTransaction } from '../types';

export const useSavingsTransactions = () => {
  const { user } = useAuth();

  return useQuery<SavingsTransaction[]>({
    queryKey: ['savings', 'transactions', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        const res = await supabaseClient.get(`/savings_transactions?user_id=eq.${user.id}&order=id.desc`);
        return res.data;
      } catch (error) {
        console.error('Savings transactions error:', error);
        return [];
      }
    },
    enabled: !!user?.id,
  });
};

export const useSavingsBalance = (from?: string, to?: string) => {
  const { user } = useAuth();

  return useQuery<{ balance: number; totalDeposited: number; totalWithdrawn: number }>({
    queryKey: ['savings', 'balance', from, to, user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        const res = await supabaseClient.get(`/savings_transactions?user_id=eq.${user.id}&select=type,amount`);
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
    enabled: !!user?.id,
  });
};

export const useAddTransaction = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Omit<SavingsTransaction, 'id'>) => {
      if (!user?.id) throw new Error('User not authenticated');
      return supabaseClient.post('/savings_transactions', { ...data, user_id: user.id });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['savings'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useUpdateTransaction = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, ...data }: SavingsTransaction) => {
      if (!user?.id) throw new Error('User not authenticated');
      return supabaseClient.patch(`/savings_transactions?id=eq.${id}&user_id=eq.${user.id}`, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['savings'] }),
  });
};

export const useDeleteTransaction = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => {
      if (!user?.id) throw new Error('User not authenticated');
      return supabaseClient.delete(`/savings_transactions?id=eq.${id}&user_id=eq.${user.id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['savings'] }),
  });
};
