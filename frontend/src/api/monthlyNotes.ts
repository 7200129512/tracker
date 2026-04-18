import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from './client';
import type { MonthlyNote } from '../types';

export const useMonthlyNote = (month: string) =>
  useQuery<MonthlyNote | null>({
    queryKey: ['notes', month],
    queryFn: async () => {
      try {
        return (await apiClient.get(`/notes/${month}`)).data;
      } catch {
        return null;
      }
    },
  });

export const useSaveMonthlyNote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ month, note }: { month: string; note: string }) =>
      apiClient.post(`/notes/${month}`, { note }),
    onSuccess: (_data, { month }) => qc.invalidateQueries({ queryKey: ['notes', month] }),
  });
};
