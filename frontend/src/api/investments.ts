import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from './client';
import type { InvestmentHolding, SellTransaction } from '../types';

// Map snake_case database fields to camelCase TypeScript types
const mapHolding = (row: any): InvestmentHolding => ({
  id: row.id,
  stockSymbol: row.stock_symbol,
  stockName: row.stock_name,
  quantity: parseFloat(row.quantity || 0),
  purchasePrice: parseFloat(row.purchase_price || 0),
  purchaseDate: row.purchase_date,
  isClosed: row.is_closed,
  currentPrice: row.current_price ? parseFloat(row.current_price) : null,
  priceStale: row.price_stale || false,
  priceFetchedAt: row.price_fetched_at,
});

const mapTransaction = (row: any): SellTransaction => ({
  id: row.id,
  holdingId: row.holding_id,
  quantitySold: parseFloat(row.quantity_sold || 0),
  sellPrice: parseFloat(row.sell_price || 0),
  sellDate: row.sell_date,
  realisedGain: parseFloat(row.realised_gain || 0),
});

export const useHoldings = () =>
  useQuery<InvestmentHolding[]>({
    queryKey: ['investments', 'holdings'],
    queryFn: async () => {
      try {
        const res = await supabaseClient.get('/investment_holdings?is_closed=eq.false&order=id.desc');
        return res.data.map(mapHolding);
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
        return res.data.map(mapHolding);
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
        return res.data.map(mapTransaction);
      } catch (error) {
        console.error('Holding transactions error:', error);
        return [];
      }
    },
  });

export const useAddHolding = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<InvestmentHolding, 'id' | 'isClosed' | 'currentPrice' | 'priceStale' | 'priceFetchedAt'>) => {
      const payload = {
        stock_symbol: data.stockSymbol,
        stock_name: data.stockName,
        quantity: data.quantity,
        purchase_price: data.purchasePrice,
        purchase_date: data.purchaseDate,
      };
      return supabaseClient.post('/investment_holdings', payload);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['investments'] }),
  });
};

export const useUpdateHolding = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<InvestmentHolding> & { id: number }) => {
      const payload: any = {};
      if (data.stockSymbol) payload.stock_symbol = data.stockSymbol;
      if (data.stockName) payload.stock_name = data.stockName;
      if (data.quantity !== undefined) payload.quantity = data.quantity;
      if (data.purchasePrice !== undefined) payload.purchase_price = data.purchasePrice;
      if (data.purchaseDate) payload.purchase_date = data.purchaseDate;
      return supabaseClient.patch(`/investment_holdings?id=eq.${id}`, payload);
    },
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
