import apiClient from './client';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const exportData = () => {
  window.open(`${BASE_URL}/api/v1/data/export`, '_blank');
};

export const importData = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiClient.post('/data/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const confirmImport = async () => {
  const res = await apiClient.post('/data/import/confirm');
  return res.data;
};

export const resetData = async () => {
  const res = await apiClient.post('/data/reset');
  return res.data;
};
