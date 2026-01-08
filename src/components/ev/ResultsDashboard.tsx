import { ProcessedResult, formatCurrency } from '@/lib/evCalculations';
import { calculateTotals, groupByMonth, groupByEV } from './ProcessingEngine';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, CheckCircle2, XCircle, HelpCircle } from 'lucide-react';

interface ResultsDashboardProps {
  results: ProcessedResult[];
  selectedMonth: string;
  selectedEV: string;
  onMonthChange: (month: string) => void;
  onEVChange: (ev: string) => void;
}

export function ResultsDashboard({
  results,
  selectedMonth,
  selectedEV,
  onMonthChange,
  onEVChange
}: ResultsDashboardProps) {
  // Extrai meses e EVs únicos dos resultados
  const months = [...new Set(results.map(r => r.excelRow.mesRecebimento))].sort();
  const evNames = [...new Set(results.filter(r => r.contract).map(r => r.contract!.nomeEV))].sort();

  // Filtra resultados
  let filteredResults = results;
  if (selectedMonth && selectedMonth !== '__all__') {
    filteredResults = filteredResults.filter(r => r.excelRow.mesRecebimento === selectedMonth);
  }
  if (selectedEV && selectedEV !== '__all__') {
    filteredResults = filteredResults.filter(r => r.contract?.nomeEV === selectedEV);
  }

  const totals = calculateTotals(filteredResults);

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-wrap gap-4">
        <div className="min-w-[180px]">
          <label className="text-sm font-medium text-muted-foreground mb-2 block">
            Mês de Referência
          </label>
          <Select value={selectedMonth} onValueChange={onMonthChange}>
            <SelectTrigger className="input-field">
              <SelectValue placeholder="Todos os meses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos os meses</SelectItem>
              {months.map(month => (
                <SelectItem key={month} value={month}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[180px]">
          <label className="text-sm font-medium text-muted-foreground mb-2 block">
            Executivo de Vendas
          </label>
          <Select value={selectedEV} onValueChange={onEVChange}>
            <SelectTrigger className="input-field">
              <SelectValue placeholder="Todos os EVs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos os EVs</SelectItem>
              {evNames.map(ev => (
                <SelectItem key={ev} value={ev}>{ev}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Processado */}
        <div className="card-premium p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-foreground" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Total Processado</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {formatCurrency(totals.totalProcessado)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {filteredResults.length} linhas
          </p>
        </div>

        {/* Comissão Válida */}
        <div className="card-premium p-6 border-success/20 bg-success/5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-success" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Comissão Válida</span>
          </div>
          <p className="text-2xl font-bold text-success">
            {formatCurrency(totals.totalComissaoValida)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {totals.countValidos} contratos
          </p>
        </div>

        {/* Fora de Vigência */}
        <div className="card-premium p-6 border-destructive/20 bg-destructive/5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-destructive" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Fora de Vigência</span>
          </div>
          <p className="text-2xl font-bold text-destructive">
            {formatCurrency(totals.totalExpirado)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {totals.countExpirados} linhas
          </p>
        </div>

        {/* Não Encontrados */}
        <div className="card-premium p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-muted-foreground" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Sem Contrato</span>
          </div>
          <p className="text-2xl font-bold text-muted-foreground">
            {formatCurrency(totals.totalNaoEncontrado)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {totals.countNaoEncontrados} linhas
          </p>
        </div>
      </div>
    </div>
  );
}
