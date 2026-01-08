import * as XLSX from 'xlsx';
import { addDays, parse, isValid } from 'date-fns';
import { ExcelRow } from './evCalculations';

// Excel armazena datas como números seriais desde 30/12/1899
export function excelDateToJS(excelDate: number | string | Date): Date | null {
  if (excelDate === null || excelDate === undefined) return null;

  // Se já é uma Date válida
  if (excelDate instanceof Date && isValid(excelDate)) {
    return excelDate;
  }

  // Se é número serial do Excel
  if (typeof excelDate === 'number') {
    // Excel usa 30/12/1899 como base (há um bug histórico do Excel com 1900)
    const baseDate = new Date(1899, 11, 30);
    return addDays(baseDate, excelDate);
  }

  // Se é string, tenta parsear em diferentes formatos
  if (typeof excelDate === 'string') {
    // Tenta formato ISO
    const isoDate = new Date(excelDate);
    if (isValid(isoDate)) return isoDate;

    // Tenta formato brasileiro DD/MM/YYYY
    const brDate = parse(excelDate, 'dd/MM/yyyy', new Date());
    if (isValid(brDate)) return brDate;

    // Tenta formato americano MM/DD/YYYY
    const usDate = parse(excelDate, 'MM/dd/yyyy', new Date());
    if (isValid(usDate)) return usDate;
  }

  return null;
}

// Extrai mês/ano de uma data para agrupamento
export function extractMonthYear(date: Date): string {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[date.getMonth()]}/${date.getFullYear()}`;
}

// Normaliza string para comparação (remove acentos, lowercase, trim)
export function normalizeString(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Mapeia colunas do Excel para nosso formato
interface ColumnMapping {
  clienteMae: number;
  produto: number;
  operadora: number;
  nfLiquido: number;
  dataRecebimento: number;
  mesRecebimento: number;
}

// Encontra as colunas baseado nos headers
function findColumns(headers: string[]): ColumnMapping | null {
  const normalizedHeaders = headers.map(h => normalizeString(h || ''));
  
  const mapping: ColumnMapping = {
    clienteMae: -1,
    produto: -1,
    operadora: -1,
    nfLiquido: -1,
    dataRecebimento: -1,
    mesRecebimento: -1
  };

  normalizedHeaders.forEach((header, index) => {
    if (header.includes('cliente') && (header.includes('mae') || header.includes('mãe'))) {
      mapping.clienteMae = index;
    } else if (header === 'cliente' && mapping.clienteMae === -1) {
      mapping.clienteMae = index;
    } else if (header.includes('produto')) {
      mapping.produto = index;
    } else if (header.includes('operadora')) {
      mapping.operadora = index;
    } else if (header.includes('nf') && header.includes('liquido') || header.includes('valor')) {
      mapping.nfLiquido = index;
    } else if (header.includes('data') && header.includes('recebimento')) {
      mapping.dataRecebimento = index;
    } else if (header.includes('mes') && header.includes('recebimento')) {
      mapping.mesRecebimento = index;
    }
  });

  // Valida se encontrou as colunas obrigatórias
  if (mapping.clienteMae === -1 || mapping.nfLiquido === -1) {
    return null;
  }

  return mapping;
}

export interface ParseResult {
  success: boolean;
  data: ExcelRow[];
  error?: string;
  columnsFound?: string[];
}

export function parseExcelFile(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        
        // Pega a primeira planilha
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Converte para JSON
        const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        
        if (jsonData.length < 2) {
          resolve({ success: false, data: [], error: 'Planilha vazia ou sem dados' });
          return;
        }

        // Primeira linha são os headers
        const headers = jsonData[0] as string[];
        const mapping = findColumns(headers);

        if (!mapping) {
          resolve({ 
            success: false, 
            data: [], 
            error: 'Não foi possível encontrar as colunas obrigatórias. Verifique se a planilha contém: Cliente (Mãe), Produto, Operadora, NF Líquido, Data Recebimento',
            columnsFound: headers.filter(Boolean)
          });
          return;
        }

        const rows: ExcelRow[] = [];
        
        // Processa cada linha (a partir da segunda)
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          if (!row || row.length === 0) continue;

          const clienteMae = String(row[mapping.clienteMae] || '').trim();
          const nfLiquidoRaw = row[mapping.nfLiquido];
          
          // Pula linhas sem cliente ou valor
          if (!clienteMae || nfLiquidoRaw === undefined || nfLiquidoRaw === null) continue;

          // Converte valor para número
          let nfLiquido = 0;
          if (typeof nfLiquidoRaw === 'number') {
            nfLiquido = nfLiquidoRaw;
          } else if (typeof nfLiquidoRaw === 'string') {
            // Remove R$, pontos de milhar e troca vírgula por ponto
            nfLiquido = parseFloat(
              nfLiquidoRaw
                .replace(/[R$\s]/g, '')
                .replace(/\./g, '')
                .replace(',', '.')
            );
          }

          if (isNaN(nfLiquido) || nfLiquido <= 0) continue;

          // Processa data de recebimento
          const dataRaw = mapping.dataRecebimento >= 0 ? row[mapping.dataRecebimento] : null;
          const dataRecebimento = excelDateToJS(dataRaw) || new Date();

          // Processa mês de recebimento (se não existir, extrai da data)
          let mesRecebimento = '';
          if (mapping.mesRecebimento >= 0 && row[mapping.mesRecebimento]) {
            mesRecebimento = String(row[mapping.mesRecebimento]).trim();
          } else {
            mesRecebimento = extractMonthYear(dataRecebimento);
          }

          rows.push({
            clienteMae,
            produto: mapping.produto >= 0 ? String(row[mapping.produto] || '').trim() : '',
            operadora: mapping.operadora >= 0 ? String(row[mapping.operadora] || '').trim() : '',
            nfLiquido,
            dataRecebimento,
            mesRecebimento
          });
        }

        if (rows.length === 0) {
          resolve({ success: false, data: [], error: 'Nenhuma linha válida encontrada na planilha' });
          return;
        }

        resolve({ success: true, data: rows });
      } catch (error) {
        console.error('Erro ao processar Excel:', error);
        resolve({ success: false, data: [], error: 'Erro ao processar o arquivo Excel' });
      }
    };

    reader.onerror = () => {
      resolve({ success: false, data: [], error: 'Erro ao ler o arquivo' });
    };

    reader.readAsArrayBuffer(file);
  });
}
