import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from './client';
import type { InvestmentHolding, SellTransaction } from '../types';

export const useHoldings = () =>
  useQuery<InvestmentHolding[]>({
    queryKey: ['investments', 'holdings'],
    queryFn: async () => (await apiClient.get('/investments/holdings')).data,
    refetchInterval: 60000,
  });

export const useClosedPositions = () =>
  useQuery<InvestmentHolding[]>({
    queryKey: ['investments', 'closed'],
    queryFn: async () => (await apiClient.get('/investments/closed')).data,
  });

export const useHoldingTransactions = (holdingId: number) =>
  useQuery<SellTransaction[]>({
    queryKey: ['investments', holdingId, 'transactions'],
    queryFn: async () =>
      (await apiClient.get(`/investments/holdings/${holdingId}/transactions`)).data,
  });

export const useAddHolding = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<InvestmentHolding, 'id' | 'isClosed' | 'currentPrice' | 'priceStale' | 'priceFetchedAt'>) =>
      apiClient.post('/investments/holdings', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['investments'] }),
  });
};

export const useUpdateHolding = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<InvestmentHolding> & { id: number }) =>
      apiClient.put(`/investments/holdings/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['investments'] }),
  });
};

export const useDeleteHolding = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/investments/holdings/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['investments'] }),
  });
};

export const useSellHolding = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      holdingId,
      quantitySold,
      sellPrice,
      sellDate,
    }: {
      holdingId: number;
      quantitySold: number;
      sellPrice: number;
      sellDate: string;
    }) =>
      apiClient.post(`/investments/holdings/${holdingId}/sell`, {
        quantitySold,
        sellPrice,
        sellDate,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['investments'] }),
  });
};

export const useRefreshPrices = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post('/investments/prices/refresh'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['investments'] }),
  });
};
