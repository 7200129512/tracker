export const formatINR = (amount: number): string =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);

export const formatPct = (value: number): string => `${value.toFixed(2)}%`;

export const currentMonth = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export const formatMonth = (yyyyMM: string): string => {
  const [y, m] = yyyyMM.split('-');
  return new Date(Number(y), Number(m) - 1).toLocaleString('en-IN', {
    month: 'short',
    year: 'numeric',
  });
};
