// Lógica de cálculo de comissão para CNs (Regra de Ouro)

export type CNLevel = 'CN1' | 'CN2' | 'CN3';

export const CN_TARGETS: Record<CNLevel, number> = {
  CN1: 2000,
  CN2: 2500,
  CN3: 3000,
};

export interface CalculoDetails {
  pctSAO: number;
  pctVidas: number;
  scoreFinal: number;
  multiplicador: number;
}

export interface CalculoResult {
  comissao: number;
  details: CalculoDetails;
}

/**
 * Calcula a comissão de um CN usando a Regra de Ouro
 * 
 * Lógica:
 * 1. Pct_SAO (Peso 70%) + Pct_Vidas (Peso 30% com trava de 1.5)
 * 2. Aplicação da Régua de Payout:
 *    - <19.9% = 0
 *    - 20%-39.9% = 20%
 *    - 40%-99.9% = score final
 *    - 100%-109.9% = 120%
 *    - 110%-139.9% = 180%
 *    - >140% = 210%
 * 3. Resultado = Target do Nível * Multiplicador da Régua
 */
export function calcularComissaoCN(
  nivel: CNLevel,
  saoMeta: number,
  saoRealizado: number,
  vidasMeta: number,
  vidasRealizado: number
): CalculoResult {
  // Validação de inputs
  if (saoMeta <= 0 || vidasMeta <= 0) {
    return {
      comissao: 0,
      details: { pctSAO: 0, pctVidas: 0, scoreFinal: 0, multiplicador: 0 }
    };
  }

  // 1. Calcular KPIs
  const pctSAO = saoRealizado / saoMeta;
  let pctVidas = vidasRealizado / vidasMeta;
  
  // Trava de Vidas em 1.5 (150%)
  if (pctVidas > 1.5) pctVidas = 1.5;

  // 2. Ponderação: SAO 70%, Vidas 30%
  const scoreFinal = (pctSAO * 0.70) + (pctVidas * 0.30);

  // 3. Régua de Pagamento
  let multiplicador = 0;
  if (scoreFinal < 0.199) {
    multiplicador = 0;
  } else if (scoreFinal >= 0.20 && scoreFinal < 0.399) {
    multiplicador = 0.20;
  } else if (scoreFinal >= 0.40 && scoreFinal < 0.999) {
    multiplicador = scoreFinal;
  } else if (scoreFinal >= 1.00 && scoreFinal < 1.099) {
    multiplicador = 1.20;
  } else if (scoreFinal >= 1.10 && scoreFinal < 1.399) {
    multiplicador = 1.80;
  } else if (scoreFinal >= 1.40) {
    multiplicador = 2.10;
  }

  // 4. Resultado final
  const comissao = CN_TARGETS[nivel] * multiplicador;

  return {
    comissao,
    details: {
      pctSAO,
      pctVidas,
      scoreFinal,
      multiplicador
    }
  };
}

/**
 * Formata porcentagem para exibição
 */
export function formatPorcentagem(valor: number): string {
  return `${(valor * 100).toFixed(1)}%`;
}

/**
 * Retorna a descrição da faixa de pagamento baseada no score
 */
export function getFaixaPagamento(scoreFinal: number): string {
  if (scoreFinal < 0.199) return 'Abaixo do mínimo';
  if (scoreFinal < 0.399) return 'Faixa inicial (20%)';
  if (scoreFinal < 0.999) return 'Faixa progressiva';
  if (scoreFinal < 1.099) return 'Meta atingida (120%)';
  if (scoreFinal < 1.399) return 'Superação (180%)';
  return 'Excelência (210%)';
}
