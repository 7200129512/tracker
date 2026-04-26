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
        // Map snake_case DB fields → camelCase
        return res.data.map((row: any) => ({
          id: row.id,
          loanName: row.loan_name,
          loanType: row.loan_type || 'Other',
          originalPrincipal: parseFloat(row.original_principal || 0),
          outstandingPrincipal: parseFloat(row.outstanding_principal || 0),
          emiAmount: parseFloat(row.emi_amount || 0),
          interestRatePa: parseFloat(row.interest_rate_pa || 0),
          emiStartDate: row.emi_start_date,
          isClosed: row.is_closed || false,
          remainingInstalments: row.remaining_instalments || 0,
          estimatedClosureDate: row.estimated_closure_date || '',
          tenureMonths: row.tenure_months || 0,
        }));
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
    mutationFn: async (data: Omit<Loan, 'id' | 'remainingInstalments' | 'estimatedClosureDate'>) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const payload: any = {
        loan_name: data.loanName,
        loan_type: (data as any).loanType || 'Other',
        original_principal: data.originalPrincipal,
        outstanding_principal: data.outstandingPrincipal,
        emi_amount: data.emiAmount,
        interest_rate_pa: data.interestRatePa,
        emi_start_date: data.emiStartDate,
        user_id: user.id,
      };
      if ((data as any).tenureMonths) payload.tenure_months = (data as any).tenureMonths;

      try {
        return await supabaseClient.post('/loans', payload);
      } catch (err: any) {
        if (err?.response?.status === 400 && payload.loan_type) {
          delete payload.loan_type;
          return supabaseClient.post('/loans', payload);
        }
        throw err;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loans'] }),
  });
};

export const useUpdateLoan = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Loan> & { id: number }) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const payload: any = {};
      if (data.loanName) payload.loan_name = data.loanName;
      if ((data as any).loanType) payload.loan_type = (data as any).loanType;
      if ((data as any).tenureMonths !== undefined) payload.tenure_months = (data as any).tenureMonths;
      if (data.originalPrincipal !== undefined) payload.original_principal = data.originalPrincipal;
      if (data.outstandingPrincipal !== undefined) payload.outstanding_principal = data.outstandingPrincipal;
      if (data.emiAmount !== undefined) payload.emi_amount = data.emiAmount;
      if (data.interestRatePa !== undefined) payload.interest_rate_pa = data.interestRatePa;
      if (data.emiStartDate) payload.emi_start_date = data.emiStartDate;
      if (data.isClosed !== undefined) payload.is_closed = data.isClosed;

      try {
        return await supabaseClient.patch(`/loans?id=eq.${id}&user_id=eq.${user.id}`, payload);
      } catch (err: any) {
        if (err?.response?.status === 400 && payload.loan_type) {
          delete payload.loan_type;
          return supabaseClient.patch(`/loans?id=eq.${id}&user_id=eq.${user.id}`, payload);
        }
        throw err;
      }
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
