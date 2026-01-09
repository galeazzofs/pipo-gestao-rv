import { useState, useMemo } from 'react';
import { Plus, Upload, Search, FileText, CheckCircle2, XCircle, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { Navbar } from '@/components/Navbar';
import { HubRoute } from '@/components/HubRoute';
import { ContractForm } from '@/components/ev/ContractForm';
import { ContractExcelUpload } from '@/components/ev/ContractExcelUpload';
import { ContractCard } from '@/components/ev/ContractCard';
import { useContracts } from '@/hooks/useContracts';
import { useContractApuracoes } from '@/hooks/useContractApuracoes';
import { parseISO, addMonths, isBefore } from 'date-fns';
import { Contract } from '@/lib/evCalculations';

function EVContratosContent() {
  const { contracts, isLoading, addContract, addContracts, deleteContract, getUniqueEVNames } = useContracts();
  const { apuracaoInfo, isLoading: isLoadingApuracoes, getContractInfo } = useContractApuracoes();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isExcelOpen, setIsExcelOpen] = useState(false);
  const [showInativos, setShowInativos] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEV, setSelectedEV] = useState<string>('all');

  const uniqueEVs = getUniqueEVNames();

  // Check if contract is active
  const isContractActive = (contract: Contract) => {
    const dataInicio = parseISO(contract.dataInicio);
    const dataFim = addMonths(dataInicio, 12);
    return isBefore(new Date(), dataFim);
  };

  // Separate active and inactive contracts
  const { ativos, inativos } = useMemo(() => {
    const filtered = contracts.filter((contract) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        contract.cliente.toLowerCase().includes(searchLower) ||
        contract.produto.toLowerCase().includes(searchLower) ||
        contract.operadora.toLowerCase().includes(searchLower) ||
        contract.nomeEV.toLowerCase().includes(searchLower);

      const matchesEV = selectedEV === 'all' || contract.nomeEV === selectedEV;

      return matchesSearch && matchesEV;
    });

    return {
      ativos: filtered.filter(isContractActive),
      inativos: filtered.filter(c => !isContractActive(c)),
    };
  }, [contracts, searchTerm, selectedEV]);

  const handleFormSubmit = async (data: any) => {
    await addContract(data);
    setIsFormOpen(false);
  };

  const handleExcelImport = async (contractsData: any[]) => {
    await addContracts(contractsData);
    setIsExcelOpen(false);
  };

  if (isLoading || isLoadingApuracoes) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="grid gap-6 md:grid-cols-4 mb-8">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              Base de Contratos
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie sua carteira de contratos
            </p>
          </div>

          <div className="flex gap-2">
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Cadastrar
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Novo Contrato</DialogTitle>
                </DialogHeader>
                <ContractForm onSubmit={handleFormSubmit} existingEVNames={uniqueEVs} />
              </DialogContent>
            </Dialog>

            <Dialog open={isExcelOpen} onOpenChange={setIsExcelOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Upload className="h-4 w-4" />
                  Importar
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Importar Contratos do Excel</DialogTitle>
                </DialogHeader>
                <ContractExcelUpload onContractsLoaded={handleExcelImport} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-6 md:grid-cols-4 mb-8">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Total de Contratos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">{contracts.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Contratos Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">
                {contracts.filter(isContractActive).length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <XCircle className="h-4 w-4 text-muted-foreground" />
                Contratos Inativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">
                {contracts.filter(c => !isContractActive(c)).length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                EVs Cadastrados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">{uniqueEVs.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente, produto, operadora..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={selectedEV} onValueChange={setSelectedEV}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por EV" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os EVs</SelectItem>
                  {uniqueEVs.map((ev) => (
                    <SelectItem key={ev} value={ev}>
                      {ev}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Active Contracts Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Contratos Ativos ({ativos.length})
          </h2>
          {ativos.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">
                Nenhum contrato ativo encontrado
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {ativos.map((contract) => (
                <ContractCard
                  key={contract.id}
                  contract={contract}
                  onDelete={deleteContract}
                  apuracaoInfo={getContractInfo(contract.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Inactive Contracts Section (Collapsible) */}
        {inativos.length > 0 && (
          <Collapsible open={showInativos} onOpenChange={setShowInativos}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-4 h-auto">
                <span className="text-lg font-semibold text-muted-foreground flex items-center gap-2">
                  <XCircle className="h-5 w-5" />
                  Contratos Inativos ({inativos.length})
                </span>
                <ChevronDown
                  className={`h-5 w-5 transition-transform ${
                    showInativos ? 'rotate-180' : ''
                  }`}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
                {inativos.map((contract) => (
                  <ContractCard
                    key={contract.id}
                    contract={contract}
                    onDelete={deleteContract}
                    apuracaoInfo={getContractInfo(contract.id)}
                  />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </div>
  );
}

export default function EVContratos() {
  return (
    <HubRoute>
      <EVContratosContent />
    </HubRoute>
  );
}
