import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from './client';
import type { InvestmentHolding, SellTransaction } from '../types';

export const useHoldings = () =>
  useQuery<InvestmentHolding[]>({
    queryKey: ['investments', 'holdings'],
    queryFn: async () => {
      try {
        const res = await supabaseClient.get('/investment_holdings?is_closed=eq.false&order=id.desc');
        return res.data;
      } catch (error) {
        console.error('Holdings error:', error);
        return [];
      }
    },
    refetchInterval: 60000,
  });

export const useClosedPositions = () =>
  useQuery<InvestmentHolding[]>({
    queryKey: ['investments', 'closed'],
    queryFn: async () => {
      try {
        const res = await supabaseClient.get('/investment_holdings?is_closed=eq.true&order=id.desc');
        return res.data;
      } catch (error) {
        console.error('Closed positions error:', error);
        return [];
      }
    },
  });

export const useHoldingTransactions = (holdingId: number) =>
  useQuery<SellTransaction[]>({
    queryKey: ['investments', holdingId, 'transactions'],
    queryFn: async () => {
      try {
        const res = await supabaseClient.get(`/sell_transactions?holding_id=eq.${holdingId}&order=id.desc`);
        return res.data;
      } catch (error) {
        console.error('Holding transactions error:', error);
        return [];
      }
    },
  });

export const useAddHolding = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<InvestmentHolding, 'id' | 'isClosed' | 'currentPrice' | 'priceStale' | 'priceFetchedAt'>) =>
      supabaseClient.post('/investment_holdings', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['investments'] }),
  });
};

export const useUpdateHolding = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<InvestmentHolding> & { id: number }) =>
      supabaseClient.patch(`/investment_holdings?id=eq.${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['investments'] }),
  });
};

export const useDeleteHolding = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => supabaseClient.delete(`/investment_holdings?id=eq.${id}`),
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
    }) => {
      // Calculate realised gain
      const realizedGain = (sellPrice - 0) * quantitySold; // Simplified calculation
      return supabaseClient.post('/sell_transactions', {
        holding_id: holdingId,
        quantity_sold: quantitySold,
        sell_price: sellPrice,
        sell_date: sellDate,
        realised_gain: realizedGain,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['investments'] }),
  });
};

export const useRefreshPrices = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => {
      // This would typically call a backend endpoint to refresh prices
      // For now, just invalidate the cache
      return Promise.resolve();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['investments'] }),
  });
};
