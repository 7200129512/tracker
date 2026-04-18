import axios from 'axios';

// Use the deployed URL directly for production
const BASE_URL = 'https://my-finance-ten-iota.vercel.app';

export const apiClient = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Unwrap { data, error } envelope
apiClient.interceptors.response.use(
  (response) => {
    if (response.data && 'data' in response.data) {
      response.data = response.data.data;
    }
    return response;
  },
  (error) => {
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

export default apiClient;
