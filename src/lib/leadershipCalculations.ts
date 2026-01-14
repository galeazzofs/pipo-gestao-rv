/**
 * Leadership Bonus Calculation - Mixed Matrix
 * 
 * Meta MRR (Automática): 90% da soma das metas MRR dos EVs do time
 * Meta SQL (Manual): Digitada pelo admin
 * 
 * Multiplicador é determinado cruzando % MRR vs % SQL na matriz
 */

export type MRRFaixa = 'abaixo60' | '60a79' | '80a94' | '95a109' | 'acima110';
export type SQLFaixa = '<80' | '80a94' | '95a109' | '>=110';

// Matriz de Multiplicadores de Liderança
// Linha: faixa de MRR | Coluna: faixa de SQL
export const MATRIZ_LIDERANCA: Record<MRRFaixa, Record<SQLFaixa, number>> = {
  'abaixo60': { '<80': 0, '80a94': 0, '95a109': 0, '>=110': 0 },
  '60a79':    { '<80': 0.5, '80a94': 0.75, '95a109': 1.0, '>=110': 1.25 },
  '80a94':    { '<80': 1.0, '80a94': 1.5, '95a109': 2.0, '>=110': 2.25 },
  '95a109':   { '<80': 1.5, '80a94': 2.0, '95a109': 3.0, '>=110': 3.25 },
  'acima110': { '<80': 2.0, '80a94': 2.75, '95a109': 3.5, '>=110': 4.0 }
};

/**
 * Determina a faixa de MRR baseado na porcentagem de atingimento
 */
export const getMRRFaixa = (pct: number): MRRFaixa => {
  if (pct < 60) return 'abaixo60';
  if (pct < 80) return '60a79';
  if (pct < 95) return '80a94';
  if (pct < 110) return '95a109';
  return 'acima110';
};

/**
 * Determina a faixa de SQL baseado na porcentagem de atingimento
 */
export const getSQLFaixa = (pct: number): SQLFaixa => {
  if (pct < 80) return '<80';
  if (pct < 95) return '80a94';
  if (pct < 110) return '95a109';
  return '>=110';
};

/**
 * Obtém o multiplicador da matriz baseado nas porcentagens de MRR e SQL
 */
export const getMultiplicadorLideranca = (pctMRR: number, pctSQL: number): number => {
  const mrrFaixa = getMRRFaixa(pctMRR);
  const sqlFaixa = getSQLFaixa(pctSQL);
  return MATRIZ_LIDERANCA[mrrFaixa][sqlFaixa];
};

/**
 * Calcula a meta MRR do líder (90% da soma das metas MRR dos EVs do time)
 */
export const calcularMetaMRRLider = (metasMRREVs: number[]): number => {
  const soma = metasMRREVs.reduce((acc, val) => acc + val, 0);
  return soma * 0.90;
};

/**
 * Calcula o bônus final do líder
 */
export const calcularBonusLideranca = (
  salarioBase: number,
  pctMRR: number,
  pctSQL: number
): { multiplicador: number; bonus: number } => {
  const multiplicador = getMultiplicadorLideranca(pctMRR, pctSQL);
  const bonus = salarioBase * multiplicador;
  return { multiplicador, bonus };
};

/**
 * Retorna descrição da faixa de MRR para exibição
 */
export const getMRRFaixaLabel = (faixa: MRRFaixa): string => {
  const labels: Record<MRRFaixa, string> = {
    'abaixo60': '< 60%',
    '60a79': '60% - 79.99%',
    '80a94': '80% - 94.99%',
    '95a109': '95% - 109.99%',
    'acima110': '≥ 110%'
  };
  return labels[faixa];
};

/**
 * Retorna descrição da faixa de SQL para exibição
 */
export const getSQLFaixaLabel = (faixa: SQLFaixa): string => {
  const labels: Record<SQLFaixa, string> = {
    '<80': '< 80%',
    '80a94': '80% - 94.99%',
    '95a109': '95% - 109.99%',
    '>=110': '≥ 110%'
  };
  return labels[faixa];
};

/**
 * Retorna a cor do badge baseado no multiplicador
 */
export const getMultiplicadorColor = (mult: number): string => {
  if (mult === 0) return 'text-destructive';
  if (mult < 1) return 'text-amber-600 dark:text-amber-400';
  if (mult < 2) return 'text-yellow-600 dark:text-yellow-400';
  if (mult < 3) return 'text-green-600 dark:text-green-400';
  return 'text-emerald-600 dark:text-emerald-400';
};
