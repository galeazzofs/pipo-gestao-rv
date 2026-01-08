import { useCallback, useState } from 'react';
import { Upload, FileSpreadsheet, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parseExcelFile, ParseResult } from '@/lib/excelParser';
import { ExcelRow } from '@/lib/evCalculations';

interface ExcelDropzoneProps {
  onDataLoaded: (data: ExcelRow[]) => void;
  isProcessing: boolean;
}

export function ExcelDropzone({ onDataLoaded, isProcessing }: ExcelDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rowCount, setRowCount] = useState(0);

  const processFile = async (selectedFile: File) => {
    setError(null);
    
    if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      setError('Por favor, selecione um arquivo Excel (.xlsx ou .xls)');
      return;
    }

    const result: ParseResult = await parseExcelFile(selectedFile);
    
    if (!result.success) {
      setError(result.error || 'Erro ao processar arquivo');
      if (result.columnsFound) {
        setError(`${result.error}\n\nColunas encontradas: ${result.columnsFound.join(', ')}`);
      }
      return;
    }

    setFile(selectedFile);
    setRowCount(result.data.length);
    onDataLoaded(result.data);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const clearFile = () => {
    setFile(null);
    setError(null);
    setRowCount(0);
    onDataLoaded([]);
  };

  if (file) {
    return (
      <div className="card-premium p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="font-medium text-foreground">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {rowCount} linhas válidas carregadas
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={clearFile}
            disabled={isProcessing}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          card-premium p-8 border-2 border-dashed transition-all duration-200 cursor-pointer
          ${isDragging 
            ? 'border-primary bg-primary/5' 
            : 'border-border hover:border-primary/50'
          }
        `}
      >
        <label className="flex flex-col items-center gap-4 cursor-pointer">
          <div className={`
            w-16 h-16 rounded-full flex items-center justify-center transition-colors
            ${isDragging ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
          `}>
            <Upload className="w-8 h-8" />
          </div>
          <div className="text-center">
            <p className="font-medium text-foreground">
              Arraste o arquivo Excel aqui
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              ou clique para selecionar
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
          <li>Cliente "Mãe" (obrigatório)</li>
          <li>Produto</li>
          <li>Operadora</li>
          <li>NF Líquido / Valor (obrigatório)</li>
          <li>Data Recebimento</li>
          <li>Mês Recebimento</li>
        </ul>
      </div>
    </div>
  );
}
