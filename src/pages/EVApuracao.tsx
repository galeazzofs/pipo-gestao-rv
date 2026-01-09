import { useState } from 'react';
import { Calculator, Upload, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Navbar } from '@/components/Navbar';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ExcelDropzone } from '@/components/ev/ExcelDropzone';
import { ResultsDashboard } from '@/components/ev/ResultsDashboard';
import { useContracts } from '@/hooks/useContracts';
import { useApuracoes } from '@/hooks/useApuracoes';
import { processCommissions, calculateTotals } from '@/components/ev/ProcessingEngine';
import { ExcelRow, ProcessedResult } from '@/lib/evCalculations';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function EVApuracaoContent() {
  const { contracts, isLoading: contractsLoading } = useContracts();
  const { saveApuracao } = useApuracoes();
  const { toast } = useToast();

  const [excelData, setExcelData] = useState<ExcelRow[]>([]);
  const [results, setResults] = useState<ProcessedResult[]>([]);
  const [hasProcessed, setHasProcessed] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [apuracaoNome, setApuracaoNome] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Filters for dashboard
  const [selectedMonth, setSelectedMonth] = useState('__all__');
  const [selectedEV, setSelectedEV] = useState('__all__');

  const handleExcelUpload = (data: ExcelRow[]) => {
    setExcelData(data);
    setResults([]);
    setHasProcessed(false);
  };

  const handleProcess = () => {
    if (excelData.length === 0) {
      toast({
        title: 'Nenhum dado',
        description: 'Faça upload de um arquivo Excel primeiro.',
        variant: 'destructive',
      });
      return;
    }

    if (contracts.length === 0) {
      toast({
        title: 'Sem contratos',
        description: 'Cadastre contratos antes de processar.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    const processed = processCommissions({ excelData, contracts });
    setResults(processed);
    setHasProcessed(true);
    setIsProcessing(false);

    const totals = calculateTotals(processed);
    toast({
      title: 'Processamento concluído',
      description: `${totals.countValidos} válidos, ${totals.countExpirados} expirados, ${totals.countNaoEncontrados} não encontrados.`,
    });
  };

  const handleSaveApuracao = async () => {
    if (!apuracaoNome.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Digite um nome para a apuração.',
        variant: 'destructive',
      });
      return;
    }

    // Detectar mês de referência do primeiro resultado
    const mesReferencia = results[0]?.excelRow.mesRecebimento || format(new Date(), 'MMM/yyyy', { locale: ptBR });

    setIsSaving(true);
    const success = await saveApuracao(apuracaoNome.trim(), mesReferencia, results);
    setIsSaving(false);

    if (success) {
      setIsSaveDialogOpen(false);
      setApuracaoNome('');
      toast({
        title: 'Apuração salva!',
        description: 'A apuração foi salva com sucesso no histórico.',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Calculator className="h-8 w-8 text-primary" />
              Apuração Mensal
            </h1>
            <p className="text-muted-foreground mt-1">
              Processe o arquivo de comissões e calcule os valores
            </p>
          </div>

          {hasProcessed && results.length > 0 && (
            <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Save className="h-4 w-4" />
                  Salvar Apuração
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Salvar Apuração</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="nome">Nome da Apuração</Label>
                    <Input
                      id="nome"
                      placeholder="Ex: Comissões Janeiro 2026"
                      value={apuracaoNome}
                      onChange={(e) => setApuracaoNome(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleSaveApuracao}
                    disabled={isSaving}
                    className="w-full"
                  >
                    {isSaving ? 'Salvando...' : 'Confirmar'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Upload Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload do Arquivo
            </CardTitle>
            <CardDescription>
              Faça upload do arquivo Excel com os dados de comissão do mês
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ExcelDropzone onDataLoaded={handleExcelUpload} isProcessing={isProcessing} />

            {excelData.length > 0 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {excelData.length} linhas carregadas
                </p>
                <Button
                  onClick={handleProcess}
                  disabled={contractsLoading || isProcessing}
                  className="gap-2"
                >
                  <Calculator className="h-4 w-4" />
                  Processar Apuração
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {hasProcessed && (
          <ResultsDashboard 
            results={results}
            selectedMonth={selectedMonth}
            selectedEV={selectedEV}
            onMonthChange={setSelectedMonth}
            onEVChange={setSelectedEV}
          />
        )}
      </div>
    </div>
  );
}

export default function EVApuracao() {
  return (
    <ProtectedRoute>
      <EVApuracaoContent />
    </ProtectedRoute>
  );
}
