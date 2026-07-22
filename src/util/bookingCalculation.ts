// -------- Price Calculation ----------
const calculatePrice = (fromDate: string, toDate: string) => {
  const from = new Date(fromDate);
  const to = new Date(toDate);

  const diffMs = to.getTime() - from.getTime();
  if (diffMs <= 0) return { days: 0, hours: 0 };

  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));

  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  return { days, hours, totalHours };
};

export { calculatePrice };
