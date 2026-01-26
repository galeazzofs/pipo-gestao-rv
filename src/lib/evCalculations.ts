// Matriz de taxas baseada em Porte e % Atingimento
export const MATRIZ_TAXAS: Record<string, Record<string, number>> = {
  'PP/P': { '<50': 0.07, '50-99.9': 0.08, '>=100': 0.10 },
  'Inside Sales': { '<50': 0.07, '50-99.9': 0.08, '>=100': 0.10 },
  'M': { '<50': 0.05, '50-99.9': 0.06, '>=100': 0.08 },
  'G+': { '<50': 0.03, '50-99.9': 0.04, '>=100': 0.06 },
  'Enterprise': { '<50': 0.04, '50-99.9': 0.04, '>=100': 0.04 }
};

export type Porte = 'PP/P' | 'M' | 'G+' | 'Enterprise' | 'Inside Sales';

export const PRODUTOS_DISPONIVEIS = [
  'Saúde', 'Odonto', 'Vida', 'Mental', 'Físico'
] as const;

export interface Contract {
  id: string;
  nomeEV: string;
  cliente: string;
  produto: string;
  operadora: string;
  porte: Porte;
  atingimento: number;
  dataInicio: string; 
  mesesPagosManual?: number; // <--- ADICIONADO AQUI
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
  mesVigencia?: number;
  taxa?: number;
  comissao?: number;
}

export function getAtingimentoFaixa(atingimento: number): string {
  if (atingimento < 50) return '<50';
  if (atingimento < 100) return '50-99.9';
  return '>=100';
}

export function getTaxa(porte: Porte, atingimento: number): number {
  const faixa = getAtingimentoFaixa(atingimento);
  return MATRIZ_TAXAS[porte]?.[faixa] ?? 0;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}