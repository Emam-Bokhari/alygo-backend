export const calculateRefundPercentage = (fromDate: Date): number => {
  const now = Date.now();
  const diffMs = fromDate.getTime() - now;

  if (diffMs <= 0) return 0;

  const diffHours = diffMs / (1000 * 60 * 60);

  return diffHours >= 12 ? 1 : 0.5;
};
