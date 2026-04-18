import { useQuery } from '@tanstack/react-query';
import apiClient from './client';
import type { DashboardSummary, CashFlowPoint, DashboardAlerts } from '../types';

export const useDashboardSummary = (month: string) =>
  useQuery<DashboardSummary>({
    queryKey: ['dashboard', 'summary', month],
    queryFn: async () => (await apiClient.get('/dashboard/summary', { params: { month } })).data,
    refetchInterval: 30000,
  });

export const useCashFlow = () =>
  useQuery<CashFlowPoint[]>({
    queryKey: ['dashboard', 'cashflow'],
    queryFn: async () => (await apiClient.get('/dashboard/cashflow')).data,
  });

export const useDashboardAlerts = (month: string) =>
  useQuery<DashboardAlerts>({
    queryKey: ['dashboard', 'alerts', month],
    queryFn: async () => (await apiClient.get('/dashboard/alerts', { params: { month } })).data,
    refetchInterval: 30000,
  });
