import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { History, Receipt, CalendarCheck, DollarSign, Users, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Navbar } from '@/components/Navbar';
import { HubRoute } from '@/components/HubRoute';
import { useApuracoesFechadas } from '@/hooks/useApuracoesFechadas';
import { formatCurrency } from '@/lib/evCalculations';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

function HistoricoApuracoesContent() {
  const { apuracoes, isLoading, deleteApuracao, getApuracaoItens } = useApuracoesFechadas();
  const [selectedTipo, setSelectedTipo] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedItens, setExpandedItens] = useState<Record<string, any[]>>({});

  // Filter apuracoes
  const filteredApuracoes = useMemo(() => {
    if (selectedTipo === 'all') return apuracoes;
    return apuracoes.filter(a => a.tipo === selectedTipo);
  }, [apuracoes, selectedTipo]);

  // Calculate totals
  const totals = useMemo(() => {
    return filteredApuracoes.reduce(
      (acc, a) => ({
        geral: acc.geral + (a.total_geral || 0),
        cns: acc.cns + (a.total_cns || 0),
        evs: acc.evs + (a.total_evs || 0),
        lideranca: acc.lideranca + (a.total_lideranca || 0),
      }),
      { geral: 0, cns: 0, evs: 0, lideranca: 0 }
    );
  }, [filteredApuracoes]);

  // Load items when expanding
  const handleExpand = async (apuracaoId: string) => {
    if (expandedId === apuracaoId) {
      setExpandedId(null);
    } else {
      setExpandedId(apuracaoId);
      if (!expandedItens[apuracaoId]) {
        const itens = await getApuracaoItens(apuracaoId);
        setExpandedItens(prev => ({ ...prev, [apuracaoId]: itens }));
      }
    }
  };

  const handleDelete = async (id: string) => {
    await deleteApuracao(id);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="grid gap-6 md:grid-cols-4 mb-8">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24" />
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
              <History className="h-8 w-8 text-primary" />
              Histórico de Apurações
            </h1>
            <p className="text-muted-foreground mt-1">
              Consulte todas as apurações fechadas
            </p>
          </div>

          <Select value={selectedTipo} onValueChange={setSelectedTipo}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="mensal">Mensal</SelectItem>
              <SelectItem value="trimestral">Trimestral</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-6 md:grid-cols-4 mb-8">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total Pago
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">
                {formatCurrency(totals.geral)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total CNs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">
                {formatCurrency(totals.cns)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Total EVs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">
                {formatCurrency(totals.evs)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CalendarCheck className="h-4 w-4" />
                Total Liderança
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">
                {formatCurrency(totals.lideranca)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Apuracoes List */}
        <div className="space-y-4">
          {filteredApuracoes.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">
                Nenhuma apuração encontrada
              </p>
            </Card>
          ) : (
              filteredApuracoes.map(apuracao => {
                const apuracaoItens = expandedItens[apuracao.id] || [];
                const isExpanded = expandedId === apuracao.id;

                return (
                  <Collapsible
                  key={apuracao.id}
                  open={isExpanded}
                  onOpenChange={() => handleExpand(apuracao.id)}
                >
                  <Card>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              {isExpanded ? (
                                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                              )}
                              <Badge variant={apuracao.tipo === 'mensal' ? 'default' : 'secondary'}>
                                {apuracao.tipo === 'mensal' ? 'Mensal' : 'Trimestral'}
                              </Badge>
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground">
                                {apuracao.mes_referencia}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                Fechado em: {apuracao.data_fechamento ? format(new Date(apuracao.data_fechamento), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '-'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-2xl font-bold text-primary">
                                {formatCurrency(apuracao.total_geral || 0)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {apuracaoItens.length} colaborador{apuracaoItens.length !== 1 ? 'es' : ''}
                              </p>
                            </div>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir apuração?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação não pode ser desfeita. Isso excluirá permanentemente a apuração de {apuracao.mes_referencia} e todos os itens associados.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(apuracao.id)}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="border-t pt-4">
                          {/* Summary */}
                          <div className="grid grid-cols-3 gap-4 mb-4">
                            <div className="p-3 bg-muted/50 rounded-lg">
                              <p className="text-xs text-muted-foreground">CNs</p>
                              <p className="font-semibold">{formatCurrency(apuracao.total_cns || 0)}</p>
                            </div>
                            <div className="p-3 bg-muted/50 rounded-lg">
                              <p className="text-xs text-muted-foreground">EVs</p>
                              <p className="font-semibold">{formatCurrency(apuracao.total_evs || 0)}</p>
                            </div>
                            <div className="p-3 bg-muted/50 rounded-lg">
                              <p className="text-xs text-muted-foreground">Liderança</p>
                              <p className="font-semibold">{formatCurrency(apuracao.total_lideranca || 0)}</p>
                            </div>
                          </div>

                          {/* Items Table */}
                          {apuracaoItens.length > 0 && (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b">
                                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Colaborador ID</th>
                                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Comissão Base</th>
                                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Bônus</th>
                                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {apuracaoItens.map(item => (
                                    <tr key={item.id} className="border-b last:border-0">
                                      <td className="py-2 px-3 font-medium">
                                        {item.colaborador_id.substring(0, 8)}...
                                      </td>
                                      <td className="py-2 px-3 text-right">
                                        {formatCurrency(item.comissao_base || 0)}
                                      </td>
                                      <td className="py-2 px-3 text-right">
                                        {formatCurrency((item.bonus_trimestral || 0) + (item.bonus_ev || 0) + (item.bonus_lideranca || 0))}
                                      </td>
                                      <td className="py-2 px-3 text-right font-semibold text-primary">
                                        {formatCurrency(item.total_pagar)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default function HistoricoApuracoes() {
  return (
    <HubRoute>
      <HistoricoApuracoesContent />
    </HubRoute>
  );
}
