import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from './client';
import type { Loan, EmiPayment, AmortisationRow } from '../types';

export const useLoans = () =>
  useQuery<Loan[]>({
    queryKey: ['loans'],
    queryFn: async () => (await apiClient.get('/loans')).data,
  });

export const useLoanPayments = (loanId: number) =>
  useQuery<EmiPayment[]>({
    queryKey: ['loans', loanId, 'payments'],
    queryFn: async () => (await apiClient.get(`/loans/${loanId}/payments`)).data,
  });

export const useAmortisationSchedule = (loanId: number) =>
  useQuery<AmortisationRow[]>({
    queryKey: ['loans', loanId, 'amortisation'],
    queryFn: async () => (await apiClient.get(`/loans/${loanId}/amortisation`)).data,
  });

export const useAddLoan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Loan, 'id' | 'remainingInstalments' | 'estimatedClosureDate'>) =>
      apiClient.post('/loans', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loans'] }),
  });
};

export const useUpdateLoan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Loan> & { id: number }) =>
      apiClient.put(`/loans/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loans'] }),
  });
};

export const useDeleteLoan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/loans/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loans'] }),
  });
};

export const useRecordEmiPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ loanId, paymentMonth }: { loanId: number; paymentMonth: string }) =>
      apiClient.post(`/loans/${loanId}/payments`, { paymentMonth }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loans'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};
