import { useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ContractForm } from '@/components/ev/ContractForm';
import { ContractTable } from '@/components/ev/ContractTable';
import { ExcelDropzone } from '@/components/ev/ExcelDropzone';
import { ResultsDashboard } from '@/components/ev/ResultsDashboard';
import { ResultsTable } from '@/components/ev/ResultsTable';
import { processCommissions } from '@/components/ev/ProcessingEngine';
import { useContracts } from '@/hooks/useContracts';
import { ExcelRow, ProcessedResult } from '@/lib/evCalculations';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileSpreadsheet, Database, Play, Loader2 } from 'lucide-react';

const EVCalculator = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { contracts, addContract, deleteContract, getUniqueEVNames, isLoading } = useContracts();
  
  const [activeTab, setActiveTab] = useState('base');
  const [excelData, setExcelData] = useState<ExcelRow[]>([]);
  const [results, setResults] = useState<ProcessedResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasProcessed, setHasProcessed] = useState(false);
  
  // Filtros do dashboard
  const [selectedMonth, setSelectedMonth] = useState('__all__');
  const [selectedEV, setSelectedEV] = useState('__all__');

  const handleProcess = async () => {
    if (excelData.length === 0 || contracts.length === 0) return;
    
    setIsProcessing(true);
    
    // Simula um pequeno delay para feedback visual
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const processedResults = processCommissions({
      excelData,
      contracts
    });
    
    setResults(processedResults);
    setHasProcessed(true);
    setIsProcessing(false);
  };

  const handleDataLoaded = (data: ExcelRow[]) => {
    setExcelData(data);
    setHasProcessed(false);
    setResults([]);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <header className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </button>
              <button
                onClick={signOut}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Sair
              </button>
            </div>
            
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Calculadora de Comissão EV
            </h1>
            <p className="text-muted-foreground mt-2">
              Gerencie contratos e calcule comissões com controle de vigência de 12 meses
            </p>
          </header>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-2 bg-muted p-1 rounded-xl">
              <TabsTrigger 
                value="base" 
                className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm flex items-center gap-2"
              >
                <Database className="w-4 h-4" />
                Base de Contratos
              </TabsTrigger>
              <TabsTrigger 
                value="apuracao"
                className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Apuração Mensal
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Base de Contratos */}
            <TabsContent value="base" className="space-y-6">
              <ContractForm 
                onSubmit={addContract}
                existingEVNames={getUniqueEVNames()}
              />
              
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  Contratos Cadastrados ({contracts.length})
                </h2>
                <ContractTable 
                  contracts={contracts}
                  onDelete={deleteContract}
                />
              </div>
            </TabsContent>

            {/* Tab 2: Apuração Mensal */}
            <TabsContent value="apuracao" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Upload e Processamento */}
                <div className="lg:col-span-1 space-y-4">
                  <ExcelDropzone 
                    onDataLoaded={handleDataLoaded}
                    isProcessing={isProcessing}
                  />
                  
                  <Button
                    onClick={handleProcess}
                    disabled={excelData.length === 0 || contracts.length === 0 || isProcessing}
                    className="btn-primary w-full"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Processar Comissões
                      </>
                    )}
                  </Button>

                  {contracts.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center">
                      Cadastre contratos na aba "Base de Contratos" primeiro.
                    </p>
                  )}
                </div>

                {/* Resultados */}
                <div className="lg:col-span-2">
                  {hasProcessed ? (
                    <div className="space-y-6">
                      <ResultsDashboard
                        results={results}
                        selectedMonth={selectedMonth}
                        selectedEV={selectedEV}
                        onMonthChange={setSelectedMonth}
                        onEVChange={setSelectedEV}
                      />
                    </div>
                  ) : (
                    <div className="card-premium p-8 text-center h-full flex flex-col items-center justify-center min-h-[300px]">
                      <FileSpreadsheet className="w-12 h-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">
                        Aguardando processamento
                      </h3>
                      <p className="text-muted-foreground max-w-sm">
                        Faça upload de um arquivo Excel e clique em "Processar Comissões" para ver os resultados.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Tabela de Resultados */}
              {hasProcessed && results.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-4">
                    Detalhamento
                  </h2>
                  <ResultsTable
                    results={results}
                    selectedMonth={selectedMonth}
                    selectedEV={selectedEV}
                  />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default EVCalculator;
