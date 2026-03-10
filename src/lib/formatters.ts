export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

// Alias mantido para compatibilidade com arquivos que importam formatPercent
export const formatPercent = formatPercentage;
