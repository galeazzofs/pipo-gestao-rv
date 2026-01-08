import { useCallback, useState } from 'react';
import { Upload, FileSpreadsheet, X, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Contract, Porte, PRODUTOS_DISPONIVEIS } from '@/lib/evCalculations';
import * as XLSX from 'xlsx';
import { normalizeString } from '@/lib/excelParser';

interface ContractExcelUploadProps {
  onContractsLoaded: (contracts: Omit<Contract, 'id'>[]) => Promise<unknown> | void;
}

interface ParsedContract {
  nomeEV: string;
  cliente: string;
  produto: string;
  operadora: string;
  porte: Porte;
  atingimento: number;
  dataInicio: string;
}

const PORTES_MAP: Record<string, Porte> = {
  'pp/p': 'PP/P',
  'pp': 'PP/P',
  'p': 'PP/P',
  'inside sales': 'Inside Sales',
  'inside': 'Inside Sales',
  'm': 'M',
  'medio': 'M',
  'g+': 'G+',
  'g': 'G+',
  'grande': 'G+',
  'enterprise': 'Enterprise',
  'ent': 'Enterprise'
};

function parsePorte(value: string): Porte {
  const normalized = normalizeString(value);
  return PORTES_MAP[normalized] || 'PP/P';
}

function parseProduto(value: string): string {
  const normalized = normalizeString(value);
  const produto = PRODUTOS_DISPONIVEIS.find(p => 
    normalizeString(p) === normalized || normalized.includes(normalizeString(p))
  );
  return produto || value;
}

function parseDataInicio(value: any): string | null {
  if (!value) return null;

  // Se for número serial do Excel
  if (typeof value === 'number') {
    const baseDate = new Date(1899, 11, 30);
    const date = new Date(baseDate.getTime() + value * 24 * 60 * 60 * 1000);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
  }

  // Se já é uma Date
  if (value instanceof Date) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-01`;
  }

  // Se é string
  if (typeof value === 'string') {
    // Formato mm/yyyy ou mm-yyyy
    const monthYearMatch = value.match(/^(\d{1,2})[\/\-](\d{4})$/);
    if (monthYearMatch) {
      return `${monthYearMatch[2]}-${monthYearMatch[1].padStart(2, '0')}-01`;
    }

    // Formato yyyy-mm
    const isoMonthMatch = value.match(/^(\d{4})[\/\-](\d{1,2})$/);
    if (isoMonthMatch) {
      return `${isoMonthMatch[1]}-${isoMonthMatch[2].padStart(2, '0')}-01`;
    }

    // Formato dd/mm/yyyy
    const fullDateMatch = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (fullDateMatch) {
      return `${fullDateMatch[3]}-${fullDateMatch[2].padStart(2, '0')}-01`;
    }

    // Mês por extenso (jan/2025, fev/2025, etc)
    const months: Record<string, string> = {
      'jan': '01', 'fev': '02', 'mar': '03', 'abr': '04',
      'mai': '05', 'jun': '06', 'jul': '07', 'ago': '08',
      'set': '09', 'out': '10', 'nov': '11', 'dez': '12'
    };
    const textMatch = value.toLowerCase().match(/^([a-z]{3})[\/\-]?(\d{4})$/);
    if (textMatch && months[textMatch[1]]) {
      return `${textMatch[2]}-${months[textMatch[1]]}-01`;
    }
  }

  return null;
}

interface ColumnMapping {
  ev: number;
  cliente: number;
  produto: number;
  operadora: number;
  porte: number;
  atingimento: number;
  dataInicio: number;
}

function findColumns(headers: string[]): ColumnMapping | null {
  const normalizedHeaders = headers.map(h => normalizeString(h || ''));
  
  const mapping: ColumnMapping = {
    ev: -1,
    cliente: -1,
    produto: -1,
    operadora: -1,
    porte: -1,
    atingimento: -1,
    dataInicio: -1
  };

  normalizedHeaders.forEach((header, index) => {
    if (header.includes('ev') || header.includes('executivo') || header.includes('vendas')) {
      mapping.ev = index;
    } else if (header.includes('cliente')) {
      mapping.cliente = index;
    } else if (header.includes('produto')) {
      mapping.produto = index;
    } else if (header.includes('operadora')) {
      mapping.operadora = index;
    } else if (header.includes('porte')) {
      mapping.porte = index;
    } else if (header.includes('atingimento') || header.includes('safra')) {
      mapping.atingimento = index;
    } else if (header.includes('inicio') || header.includes('vigencia')) {
      mapping.dataInicio = index;
    }
  });

  // Valida colunas obrigatórias
  if (mapping.ev === -1 || mapping.cliente === -1) {
    return null;
  }

  return mapping;
}

export function ContractExcelUpload({ onContractsLoaded }: ContractExcelUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ParsedContract[] | null>(null);

  const processFile = async (file: File) => {
    setError(null);
    setPreview(null);
    
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('Por favor, selecione um arquivo Excel (.xlsx ou .xls)');
      return;
    }

    setIsProcessing(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

      if (jsonData.length < 2) {
        setError('Planilha vazia ou sem dados');
        return;
      }

      const headers = jsonData[0] as string[];
      const mapping = findColumns(headers);

      if (!mapping) {
        setError(`Colunas obrigatórias não encontradas. Esperadas: EV, Cliente, Produto, Operadora, Porte, Atingimento, Início de Vigência\n\nColunas encontradas: ${headers.filter(Boolean).join(', ')}`);
        return;
      }

      const contracts: ParsedContract[] = [];

      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i] as any[];
        if (!row || row.length === 0) continue;

        const nomeEV = String(row[mapping.ev] || '').trim();
        const cliente = String(row[mapping.cliente] || '').trim();

        if (!nomeEV || !cliente) continue;

        const produto = mapping.produto >= 0 
          ? parseProduto(String(row[mapping.produto] || 'Saúde'))
          : 'Saúde';
        
        const operadora = mapping.operadora >= 0 
          ? String(row[mapping.operadora] || '').trim()
          : '';

        const porte = mapping.porte >= 0 
          ? parsePorte(String(row[mapping.porte] || 'PP/P'))
          : 'PP/P';

        let atingimento = 100;
        if (mapping.atingimento >= 0 && row[mapping.atingimento] !== undefined) {
          const raw = row[mapping.atingimento];
          if (typeof raw === 'number') {
            atingimento = raw > 1 ? raw : raw * 100;
          } else if (typeof raw === 'string') {
            atingimento = parseFloat(raw.replace('%', '').replace(',', '.')) || 100;
          }
        }

        const dataInicio = mapping.dataInicio >= 0 
          ? parseDataInicio(row[mapping.dataInicio])
          : null;

        if (!dataInicio) {
          continue; // Pula se não conseguir parsear a data
        }

        contracts.push({
          nomeEV,
          cliente,
          produto,
          operadora,
          porte,
          atingimento: parseFloat(atingimento.toFixed(1)),
          dataInicio
        });
      }

      if (contracts.length === 0) {
        setError('Nenhum contrato válido encontrado. Verifique se todas as linhas têm EV, Cliente e Data de Início.');
        return;
      }

      setPreview(contracts);
    } catch (err) {
      console.error('Erro ao processar Excel:', err);
      setError('Erro ao processar o arquivo Excel');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleConfirm = async () => {
    if (!preview) return;
    
    setIsProcessing(true);
    try {
      await onContractsLoaded(preview);
      setPreview(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    setPreview(null);
    setError(null);
  };

  // Preview mode
  if (preview) {
    return (
      <div className="card-premium p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-6 h-6 text-success" />
            <div>
              <h3 className="font-semibold text-foreground">
                {preview.length} contratos encontrados
              </h3>
              <p className="text-sm text-muted-foreground">
                Revise os dados antes de importar
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleCancel}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="max-h-[300px] overflow-auto border border-border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="p-2 text-left font-medium">EV</th>
                <th className="p-2 text-left font-medium">Cliente</th>
                <th className="p-2 text-left font-medium">Produto</th>
                <th className="p-2 text-left font-medium">Operadora</th>
                <th className="p-2 text-left font-medium">Porte</th>
                <th className="p-2 text-left font-medium">Ating.</th>
                <th className="p-2 text-left font-medium">Início</th>
              </tr>
            </thead>
            <tbody>
              {preview.slice(0, 20).map((c, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="p-2">{c.nomeEV}</td>
                  <td className="p-2">{c.cliente}</td>
                  <td className="p-2">{c.produto}</td>
                  <td className="p-2">{c.operadora || '-'}</td>
                  <td className="p-2">{c.porte}</td>
                  <td className="p-2">{c.atingimento}%</td>
                  <td className="p-2">{c.dataInicio.slice(0, 7)}</td>
                </tr>
              ))}
              {preview.length > 20 && (
                <tr className="border-t border-border">
                  <td colSpan={7} className="p-2 text-center text-muted-foreground">
                    ... e mais {preview.length - 20} contratos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleConfirm} disabled={isProcessing} className="btn-primary">
            {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Importar {preview.length} Contratos
          </Button>
          <Button variant="outline" onClick={handleCancel} disabled={isProcessing}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
        className={`
          card-premium p-6 border-2 border-dashed transition-all duration-200 cursor-pointer
          ${isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
        `}
      >
        <label className="flex items-center gap-4 cursor-pointer">
          <div className={`
            w-12 h-12 rounded-full flex items-center justify-center transition-colors
            ${isDragging ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
          `}>
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <p className="font-medium text-foreground">
              Importar contratos do Excel
            </p>
            <p className="text-sm text-muted-foreground">
              Arraste ou clique para selecionar
            </p>
          </div>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
      </div>

      {error && (
        <div className="card-premium p-4 bg-destructive/5 border-destructive/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-destructive">Erro ao carregar arquivo</p>
              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="text-sm text-muted-foreground">
        <p className="font-medium mb-2">Colunas esperadas no Excel:</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>Executivo de Vendas / EV (obrigatório)</li>
          <li>Cliente (obrigatório)</li>
          <li>Produto (Saúde, Odonto, Vida)</li>
          <li>Operadora</li>
          <li>Porte (PP/P, M, G+, Enterprise, Inside Sales)</li>
          <li>Atingimento / Safra (%)</li>
          <li>Início de Vigência (obrigatório)</li>
        </ul>
      </div>
    </div>
  );
}
