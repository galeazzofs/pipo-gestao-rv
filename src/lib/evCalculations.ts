// Matriz de taxas baseada em Porte e % Atingimento
// PP/P e Inside Sales: <50% = 7%, 50-99.9% = 8%, >=100% = 10%
// M: <50% = 5%, 50-99.9% = 6%, >=100% = 8%
// G+: <50% = 3%, 50-99.9% = 4%, >=100% = 6%
// Enterprise: 4% fixo para qualquer atingimento
export const MATRIZ_TAXAS: Record<string, Record<string, number>> = {
  'PP/P': {
    '<50': 0.07,
    '50-99.9': 0.08,
    '>=100': 0.10
  },
  'Inside Sales': {
    '<50': 0.07,
    '50-99.9': 0.08,
    '>=100': 0.10
  },
  'M': {
    '<50': 0.05,
    '50-99.9': 0.06,
    '>=100': 0.08
  },
  'G+': {
    '<50': 0.03,
    '50-99.9': 0.04,
    '>=100': 0.06
  },
  'Enterprise': {
    '<50': 0.04,
    '50-99.9': 0.04,
    '>=100': 0.04
  }
};

export type Porte = 'PP/P' | 'M' | 'G+' | 'Enterprise' | 'Inside Sales';

export interface Contract {
  id: string;
  nomeEV: string;
  cliente: string;
  produto: string;
  operadora: string;
  porte: Porte;
  atingimento: number;
  dataInicio: string; // ISO date string do primeiro mês de pagamento
}

export interface ExcelRow {
  clienteMae: string;
  produto: string;
  operadora: string;
  nfLiquido: number;
  dataRecebimento: Date;
  mesRecebimento: string;
}

export type ProcessedStatus = 'valido' | 'expirado' | 'nao_encontrado' | 'pre_vigencia';

export interface ProcessedResult {
  excelRow: ExcelRow;
  contract: Contract | null;
  status: ProcessedStatus;
  mesVigencia?: number; // Mês X de 12
  taxa?: number;
  comissao?: number;
}

// Determina a faixa de atingimento para buscar na matriz
export function getAtingimentoFaixa(atingimento: number): string {
  if (atingimento < 50) return '<50';
  if (atingimento < 100) return '50-99.9';
  return '>=100';
}

// Busca a taxa na matriz
export function getTaxa(porte: Porte, atingimento: number): number {
  const faixa = getAtingimentoFaixa(atingimento);
  return MATRIZ_TAXAS[porte]?.[faixa] ?? 0;
}

// Formata valor em BRL
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

// Formata percentual
export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
