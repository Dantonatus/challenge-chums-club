export const formatEUR = (cents: number) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR' }).format((cents || 0) / 100);
