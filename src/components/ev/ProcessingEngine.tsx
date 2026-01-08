import { Contract, ExcelRow, ProcessedResult, getTaxa } from '@/lib/evCalculations';
import { differenceInMonths, parseISO, addMonths, isAfter, isBefore } from 'date-fns';
import { normalizeString } from '@/lib/excelParser';

interface ProcessingParams {
  excelData: ExcelRow[];
  contracts: Contract[];
}

export function processCommissions({ excelData, contracts }: ProcessingParams): ProcessedResult[] {
  const results: ProcessedResult[] = [];

  for (const row of excelData) {
    // Passo A: Matching por chave composta (cliente + produto + operadora)
    const contract = findMatchingContract(row, contracts);

    if (!contract) {
      results.push({
        excelRow: row,
        contract: null,
        status: 'nao_encontrado'
      });
      continue;
    }

    // Passo B: Validação de Vigência (12 meses a partir da data de início deste contrato específico)
    const dataInicio = parseISO(contract.dataInicio);
    const dataFim = addMonths(dataInicio, 12);
    const dataRecebimento = row.dataRecebimento;

    // Se data de recebimento é anterior ao início
    if (isBefore(dataRecebimento, dataInicio)) {
      results.push({
        excelRow: row,
        contract,
        status: 'pre_vigencia'
      });
      continue;
    }

    // Se data de recebimento é posterior ao fim (12 meses)
    if (isAfter(dataRecebimento, dataFim)) {
      results.push({
        excelRow: row,
        contract,
        status: 'expirado'
      });
      continue;
    }

    // Passo C: Cálculo da comissão
    const taxa = getTaxa(contract.porte, contract.atingimento);
    const comissao = row.nfLiquido * taxa;
    
    // Calcula em qual mês da vigência estamos (1 a 12)
    const mesVigencia = differenceInMonths(dataRecebimento, dataInicio) + 1;

    results.push({
      excelRow: row,
      contract,
      status: 'valido',
      mesVigencia,
      taxa,
      comissao
    });
  }

  return results;
}

function findMatchingContract(row: ExcelRow, contracts: Contract[]): Contract | null {
  const normalizedCliente = normalizeString(row.clienteMae);
  const normalizedProduto = normalizeString(row.produto);
  const normalizedOperadora = normalizeString(row.operadora);

  // Busca contrato onde cliente + produto + operadora batem exatamente
  return contracts.find(c => {
    const clienteMatch = normalizeString(c.cliente) === normalizedCliente;
    const produtoMatch = normalizeString(c.produto) === normalizedProduto;
    const operadoraMatch = normalizeString(c.operadora) === normalizedOperadora;
    
    return clienteMatch && produtoMatch && operadoraMatch;
  }) || null;
}

// Agrupa resultados por mês
export function groupByMonth(results: ProcessedResult[]): Record<string, ProcessedResult[]> {
  return results.reduce((acc, result) => {
    const mes = result.excelRow.mesRecebimento;
    if (!acc[mes]) {
      acc[mes] = [];
    }
    acc[mes].push(result);
    return acc;
  }, {} as Record<string, ProcessedResult[]>);
}

// Agrupa resultados por EV
export function groupByEV(results: ProcessedResult[]): Record<string, ProcessedResult[]> {
  return results.reduce((acc, result) => {
    const ev = result.contract?.nomeEV || 'Sem EV';
    if (!acc[ev]) {
      acc[ev] = [];
    }
    acc[ev].push(result);
    return acc;
  }, {} as Record<string, ProcessedResult[]>);
}

// Calcula totais
export function calculateTotals(results: ProcessedResult[]) {
  const validos = results.filter(r => r.status === 'valido');
  const expirados = results.filter(r => r.status === 'expirado');
  const preVigencia = results.filter(r => r.status === 'pre_vigencia');
  const naoEncontrados = results.filter(r => r.status === 'nao_encontrado');

  return {
    totalProcessado: results.reduce((sum, r) => sum + r.excelRow.nfLiquido, 0),
    totalComissaoValida: validos.reduce((sum, r) => sum + (r.comissao || 0), 0),
    totalExpirado: expirados.reduce((sum, r) => sum + r.excelRow.nfLiquido, 0),
    totalPreVigencia: preVigencia.reduce((sum, r) => sum + r.excelRow.nfLiquido, 0),
    totalNaoEncontrado: naoEncontrados.reduce((sum, r) => sum + r.excelRow.nfLiquido, 0),
    countValidos: validos.length,
    countExpirados: expirados.length,
    countPreVigencia: preVigencia.length,
    countNaoEncontrados: naoEncontrados.length
  };
}
