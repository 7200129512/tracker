import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from './client';
import { useAuth } from '../context/AuthContext';
import type { IncomeEntry } from '../types';

export const useIncomeEntries = () => {
  const { user } = useAuth();

  return useQuery<IncomeEntry[]>({
    queryKey: ['income', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        const res = await supabaseClient.get(`/income_entries?user_id=eq.${user.id}&order=id.desc`);
        return res.data;
      } catch (error) {
        console.error('Income error:', error);
        return [];
      }
    },
    enabled: !!user?.id,
  });
};

export const useMonthlyIncomeSummary = () => {
  const { user } = useAuth();

  return useQuery<{ month: string; income: number }[]>({
    queryKey: ['income', 'monthly-summary', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        const res = await supabaseClient.get(`/income_entries?user_id=eq.${user.id}&select=*`);
        return res.data.map((row: any) => ({
          month: new Date(row.effective_date).toISOString().slice(0, 7),
          income: parseFloat(row.amount || 0)
        }));
      } catch (error) {
        console.error('Monthly summary error:', error);
        return [];
      }
    },
    enabled: !!user?.id,
  });
};

export const useAddIncome = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Omit<IncomeEntry, 'id'>) => {
      if (!user?.id) throw new Error('User not authenticated');
      console.log('Adding income with user_id:', user.id);
      console.log('Data:', { ...data, user_id: user.id });
      return supabaseClient.post('/income_entries', { ...data, user_id: user.id });
    },
    onSuccess: () => {
      console.log('Income added successfully');
      qc.invalidateQueries({ queryKey: ['income'] });
    },
    onError: (error) => {
      console.error('Error adding income:', error);
    },
  });
};

export const useUpdateIncome = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, ...data }: IncomeEntry) => {
      if (!user?.id) throw new Error('User not authenticated');
      return supabaseClient.patch(`/income_entries?id=eq.${id}&user_id=eq.${user.id}`, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['income'] }),
  });
};

export const useDeleteIncome = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => {
      if (!user?.id) throw new Error('User not authenticated');
      return supabaseClient.delete(`/income_entries?id=eq.${id}&user_id=eq.${user.id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['income'] }),
  });
};
