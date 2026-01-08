// Matriz de taxas baseada em Porte e % Atingimento
export const MATRIZ_TAXAS: Record<string, Record<string, number>> = {
  'PP/P': {
    '0-50': 0.03,
    '51-80': 0.04,
    '81-100': 0.05,
    '101+': 0.06
  },
  'M': {
    '0-50': 0.025,
    '51-80': 0.035,
    '81-100': 0.045,
    '101+': 0.055
  },
  'G+': {
    '0-50': 0.02,
    '51-80': 0.03,
    '81-100': 0.04,
    '101+': 0.05
  },
  'Enterprise': {
    '0-50': 0.015,
    '51-80': 0.025,
    '81-100': 0.035,
    '101+': 0.045
  }
};

export type Porte = 'PP/P' | 'M' | 'G+' | 'Enterprise';

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
  if (atingimento <= 50) return '0-50';
  if (atingimento <= 80) return '51-80';
  if (atingimento <= 100) return '81-100';
  return '101+';
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
