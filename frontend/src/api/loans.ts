import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from './client';
import { useAuth } from '../context/AuthContext';
import type { Loan, EmiPayment, AmortisationRow } from '../types';

export const useLoans = () => {
  const { user } = useAuth();

  return useQuery<Loan[]>({
    queryKey: ['loans', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        const res = await supabaseClient.get(`/loans?user_id=eq.${user.id}&order=id.desc`);
        return res.data;
      } catch (error) {
        console.error('Loans error:', error);
        return [];
      }
    },
    enabled: !!user?.id,
  });
};

export const useLoanPayments = (loanId: number) => {
  const { user } = useAuth();

  return useQuery<EmiPayment[]>({
    queryKey: ['loans', loanId, 'payments', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        const res = await supabaseClient.get(`/emi_payments?loan_id=eq.${loanId}&order=id.desc`);
        return res.data;
      } catch (error) {
        console.error('Loan payments error:', error);
        return [];
      }
    },
    enabled: !!user?.id,
  });
};

export const useAmortisationSchedule = (loanId: number) => {
  const { user } = useAuth();

  return useQuery<AmortisationRow[]>({
    queryKey: ['loans', loanId, 'amortisation', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        const res = await supabaseClient.get(`/emi_payments?loan_id=eq.${loanId}&order=id.asc`);
        return res.data;
      } catch (error) {
        console.error('Amortisation error:', error);
        return [];
      }
    },
    enabled: !!user?.id,
  });
};

export const useAddLoan = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Omit<Loan, 'id' | 'remainingInstalments' | 'estimatedClosureDate'>) => {
      if (!user?.id) throw new Error('User not authenticated');
      return supabaseClient.post('/loans', { ...data, user_id: user.id });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loans'] }),
  });
};

export const useUpdateLoan = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Loan> & { id: number }) => {
      if (!user?.id) throw new Error('User not authenticated');
      return supabaseClient.patch(`/loans?id=eq.${id}&user_id=eq.${user.id}`, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loans'] }),
  });
};

export const useDeleteLoan = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => {
      if (!user?.id) throw new Error('User not authenticated');
      return supabaseClient.delete(`/loans?id=eq.${id}&user_id=eq.${user.id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loans'] }),
  });
};

export const useRecordEmiPayment = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: ({ loanId, paymentMonth }: { loanId: number; paymentMonth: string }) => {
      if (!user?.id) throw new Error('User not authenticated');
      return supabaseClient.post(`/emi_payments`, { loan_id: loanId, payment_month: paymentMonth });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loans'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};
