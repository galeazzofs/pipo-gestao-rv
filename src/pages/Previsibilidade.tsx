import { useState, useMemo } from 'react';
import { TrendingUp, DollarSign, AlertTriangle, CheckCircle2, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Navbar } from '@/components/Navbar';
import { ForecastCard } from '@/components/ev/ForecastCard';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useForecast } from '@/hooks/useForecast';
import { useAuth } from '@/contexts/AuthContext';
import { useColaboradores } from '@/hooks/useColaboradores';
import { formatCurrency } from '@/lib/evCalculations';

function PrevisibilidadeContent() {
  const { forecastData, isLoading: forecastLoading, uniqueEVs } = useForecast();
  const { user, isAdmin } = useAuth();
  const { colaboradores, isLoading: colaboradoresLoading } = useColaboradores();
  
  const [selectedEV, setSelectedEV] = useState<string>('all');
  const [showFinalizados, setShowFinalizados] = useState(false);

  const isLoading = forecastLoading || colaboradoresLoading;

  // Check user permissions
  const colaborador = colaboradores.find(c => c.email === user?.email);
  const isLider = colaborador?.cargo === 'Lideranca';
  const canViewAll = isAdmin || isLider;

  // Filter data based on permissions
  const visibleData = useMemo(() => {
    if (canViewAll) return forecastData;
    // For CNs/EVs, filter only their own contracts
    if (colaborador) {
      return forecastData.filter(f => f.nomeEV === colaborador.nome);
    }
    return [];
  }, [forecastData, canViewAll, colaborador]);

  // Then apply EV filter on visible data
  const filteredData = useMemo(() => {
    if (selectedEV === 'all') return visibleData;
    return visibleData.filter((f) => f.nomeEV === selectedEV);
  }, [visibleData, selectedEV]);

  // Get unique EVs from visible data only
  const visibleEVs = useMemo(() => {
    const evs = new Set(visibleData.map(f => f.nomeEV));
    return Array.from(evs).sort();
  }, [visibleData]);

  const { ativos, churnRisk, finalizados } = useMemo(() => {
    return {
      ativos: filteredData.filter((f) => f.status === 'ativo'),
      churnRisk: filteredData.filter((f) => f.status === 'churn_risk'),
      finalizados: filteredData.filter((f) => f.status === 'finalizado'),
    };
  }, [filteredData]);

  const filteredMetrics = useMemo(() => {
    const data = selectedEV === 'all' ? visibleData : filteredData;
    const ativosData = data.filter((f) => f.status === 'ativo');
    
    return {
      carteiraFutura: ativosData.reduce((sum, f) => sum + f.valorProjetado, 0),
      mediaMensal: ativosData.reduce((sum, f) => sum + (f.ultimaComissao || 0), 0),
      totalAtivos: ativosData.length,
      totalChurnRisk: data.filter((f) => f.status === 'churn_risk').length,
      totalFinalizados: data.filter((f) => f.status === 'finalizado').length,
    };
  }, [visibleData, filteredData, selectedEV]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-64" />
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
              <TrendingUp className="h-8 w-8 text-primary" />
              {canViewAll ? 'Previsibilidade' : 'Minha Previsibilidade'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {canViewAll 
                ? 'Visualize a projeção de comissões de todos os contratos' 
                : 'Veja quanto ainda tem a receber dos seus contratos ativos'}
            </p>
          </div>

          {/* Only show EV filter if user can view all and there are multiple EVs */}
          {canViewAll && visibleEVs.length > 1 && (
            <Select value={selectedEV} onValueChange={setSelectedEV}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Filtrar por EV" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os EVs</SelectItem>
                {visibleEVs.map((ev) => (
                  <SelectItem key={ev} value={ev}>
                    {ev}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Carteira Futura Estimada
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">
                {formatCurrency(filteredMetrics.carteiraFutura)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Projetado para receber nos próximos meses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Média Mensal Recorrente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">
                {formatCurrency(filteredMetrics.mediaMensal)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {canViewAll ? 'Total mensal recorrente' : 'Seu "salário" atual de comissão'}
              </p>
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
                {filteredMetrics.totalAtivos}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Com parcelas restantes
              </p>
            </CardContent>
          </Card>

          <Card className={filteredMetrics.totalChurnRisk > 0 ? 'border-destructive/50' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Risco de Churn
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${filteredMetrics.totalChurnRisk > 0 ? 'text-destructive' : 'text-foreground'}`}>
                {filteredMetrics.totalChurnRisk}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Sem pagamento na última apuração
              </p>
            </CardContent>
          </Card>
        </div>

        {/* No data message for non-admin users */}
        {!canViewAll && visibleData.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              Você ainda não possui contratos cadastrados em seu nome.
            </p>
          </Card>
        )}

        {/* Churn Risk Section */}
        {churnRisk.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-destructive flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5" />
              Atenção: Risco de Churn ({churnRisk.length})
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {churnRisk.map((forecast) => (
                <ForecastCard key={forecast.contractId} forecast={forecast} />
              ))}
            </div>
          </div>
        )}

        {/* Active Contracts Section */}
        {ativos.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2 mb-4">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Contratos Ativos ({ativos.length})
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {ativos.map((forecast) => (
                <ForecastCard key={forecast.contractId} forecast={forecast} />
              ))}
            </div>
          </div>
        )}

        {/* Finalized Contracts Section (Collapsible) */}
        {finalizados.length > 0 && (
          <Collapsible open={showFinalizados} onOpenChange={setShowFinalizados}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-4 h-auto">
                <span className="text-lg font-semibold text-muted-foreground">
                  Contratos Finalizados ({finalizados.length})
                </span>
                <ChevronDown
                  className={`h-5 w-5 transition-transform ${
                    showFinalizados ? 'rotate-180' : ''
                  }`}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
                {finalizados.map((forecast) => (
                  <ForecastCard key={forecast.contractId} forecast={forecast} />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </div>
  );
}

export default function Previsibilidade() {
  return (
    <ProtectedRoute>
      <PrevisibilidadeContent />
    </ProtectedRoute>
  );
}
