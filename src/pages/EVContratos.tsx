import { useState, useMemo } from 'react';
import { Plus, Upload, Search, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { GlobalNavbar } from '@/components/GlobalNavbar';
import { AdminRoute } from '@/components/AdminRoute';
import { ContractForm } from '@/components/ev/ContractForm';
import { ContractExcelUpload } from '@/components/ev/ContractExcelUpload';
import { ContractTable } from '@/components/ev/ContractTable';
import { useContracts } from '@/hooks/useContracts';
import { format, parseISO } from 'date-fns';

function EVContratosContent() {
  const { contracts, isLoading, addContract, addContracts, deleteContract, getUniqueEVNames } = useContracts();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isExcelOpen, setIsExcelOpen] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEV, setSelectedEV] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  const uniqueEVs = getUniqueEVNames();
  
  // Extract unique months from contracts
  const uniqueMonths = useMemo(() => {
    const months = new Set<string>();
    contracts.forEach((c) => {
      const date = parseISO(c.dataInicio);
      months.add(format(date, 'yyyy-MM'));
    });
    return Array.from(months).sort().reverse();
  }, [contracts]);

  // Filter contracts
  const filteredContracts = useMemo(() => {
    return contracts.filter((contract) => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        contract.cliente.toLowerCase().includes(searchLower) ||
        contract.produto.toLowerCase().includes(searchLower) ||
        contract.operadora.toLowerCase().includes(searchLower);

      // EV filter
      const matchesEV = selectedEV === 'all' || contract.nomeEV === selectedEV;

      // Month filter
      const contractMonth = format(parseISO(contract.dataInicio), 'yyyy-MM');
      const matchesMonth = selectedMonth === 'all' || contractMonth === selectedMonth;

      return matchesSearch && matchesEV && matchesMonth;
    });
  }, [contracts, searchTerm, selectedEV, selectedMonth]);

  const handleFormSubmit = async (data: any) => {
    await addContract(data);
    setIsFormOpen(false);
  };

  const handleExcelImport = async (contractsData: any[]) => {
    await addContracts(contractsData);
    setIsExcelOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <GlobalNavbar />

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
                  Cadastrar Contrato
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
                  Importar Excel
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

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente, produto..."
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

              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por mês início" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os meses</SelectItem>
                  {uniqueMonths.map((month) => (
                    <SelectItem key={month} value={month}>
                      {format(parseISO(`${month}-01`), 'MMM/yyyy')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3 mb-6">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total de Contratos</p>
              <p className="text-2xl font-bold">{contracts.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Contratos Filtrados</p>
              <p className="text-2xl font-bold">{filteredContracts.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">EVs Cadastrados</p>
              <p className="text-2xl font-bold">{uniqueEVs.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Contracts Table */}
        <Card>
          <CardContent className="p-0">
            <ContractTable
              contracts={filteredContracts}
              onDelete={deleteContract}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function EVContratos() {
  return (
    <AdminRoute>
      <EVContratosContent />
    </AdminRoute>
  );
}
