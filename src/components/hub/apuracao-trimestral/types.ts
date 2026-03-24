import { Colaborador } from '@/hooks/useColaboradores';
import { ProcessedResult, ExcelRow } from '@/lib/evCalculations';

export interface CNRow {
  saoMeta: string;
  saoRealizado: string;
  vidasMeta: string;
  vidasRealizado: string;
  comissao: number;
  pctSAO: number;
  pctVidas: number;
  scoreFinal: number;
  multiplicador: number;
  bonus: string;
  total: number;
}

export interface EVRow {
  comissaoSafra: number;
  metaMRR: string;
  mrrRealizado: string;
  pctAtingimento: number;
  multiplicador: number;
  bonusEV: number;
  total: number;
}

export interface LiderRow {
  metaMRRCalculada: number;
  evsDoTime: string[];
  metaSQL: string;
  realizadoMRR: string;
  realizadoSQL: string;
  pctMRR: number;
  pctSQL: number;
  multiplicador: number;
  bonus: number;
  total: number;
}

export const EMPTY_CN_ROW: CNRow = {
  saoMeta: '', saoRealizado: '', vidasMeta: '', vidasRealizado: '',
  comissao: 0, pctSAO: 0, pctVidas: 0, scoreFinal: 0, multiplicador: 0,
  bonus: '0', total: 0
};

export const EMPTY_EV_ROW: EVRow = {
  comissaoSafra: 0, metaMRR: '', mrrRealizado: '',
  pctAtingimento: 0, multiplicador: 0, bonusEV: 0, total: 0
};

export const EMPTY_LIDER_ROW: LiderRow = {
  metaMRRCalculada: 0, evsDoTime: [],
  metaSQL: '', realizadoMRR: '', realizadoSQL: '',
  pctMRR: 0, pctSQL: 0, multiplicador: 0, bonus: 0, total: 0
};
