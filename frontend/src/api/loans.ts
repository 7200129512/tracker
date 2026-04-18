import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from './client';
import type { Loan, EmiPayment, AmortisationRow } from '../types';

export const useLoans = () =>
  useQuery<Loan[]>({
    queryKey: ['loans'],
    queryFn: async () => {
      try {
        const res = await supabaseClient.get('/loans?order=id.desc');
        return res.data;
      } catch (error) {
        console.error('Loans error:', error);
        return [];
      }
    },
  });

export const useLoanPayments = (loanId: number) =>
  useQuery<EmiPayment[]>({
    queryKey: ['loans', loanId, 'payments'],
    queryFn: async () => {
      try {
        const res = await supabaseClient.get(`/emi_payments?loan_id=eq.${loanId}&order=id.desc`);
        return res.data;
      } catch (error) {
        console.error('Loan payments error:', error);
        return [];
      }
    },
  });

export const useAmortisationSchedule = (loanId: number) =>
  useQuery<AmortisationRow[]>({
    queryKey: ['loans', loanId, 'amortisation'],
    queryFn: async () => {
      try {
        const res = await supabaseClient.get(`/emi_payments?loan_id=eq.${loanId}&order=id.asc`);
        return res.data;
      } catch (error) {
        console.error('Amortisation error:', error);
        return [];
      }
    },
  });

export const useAddLoan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Loan, 'id' | 'remainingInstalments' | 'estimatedClosureDate'>) =>
      supabaseClient.post('/loans', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loans'] }),
  });
};

export const useUpdateLoan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Loan> & { id: number }) =>
      supabaseClient.patch(`/loans?id=eq.${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loans'] }),
  });
};

export const useDeleteLoan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => supabaseClient.delete(`/loans?id=eq.${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loans'] }),
  });
};

export const useRecordEmiPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ loanId, paymentMonth }: { loanId: number; paymentMonth: string }) =>
      supabaseClient.post(`/emi_payments`, { loan_id: loanId, payment_month: paymentMonth }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loans'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};
