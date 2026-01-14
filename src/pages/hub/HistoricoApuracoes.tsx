import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { History, Receipt, CalendarCheck, DollarSign, Users, ChevronDown, ChevronRight, Trash2, Crown, Briefcase, FileEdit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Navbar } from '@/components/Navbar';
import { HubRoute } from '@/components/HubRoute';
import { useApuracoesFechadas, ApuracaoFechadaItem } from '@/hooks/useApuracoesFechadas';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function HistoricoApuracoesContent() {
  const { apuracoes, isLoading, deleteApuracao, getApuracaoItens } = useApuracoesFechadas();
  const [selectedTipo, setSelectedTipo] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedItens, setExpandedItens] = useState<Record<string, ApuracaoFechadaItem[]>>({});
  const [activeDetailTab, setActiveDetailTab] = useState<string>('cns');

  // Filter apuracoes
  const filteredApuracoes = useMemo(() => {
    return apuracoes.filter(a => {
      const tipoMatch = selectedTipo === 'all' || a.tipo === selectedTipo;
      const statusMatch = selectedStatus === 'all' || a.status === selectedStatus;
      return tipoMatch && statusMatch;
    });
  }, [apuracoes, selectedTipo, selectedStatus]);

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

  // Group items by cargo
  const groupItemsByCargo = (itens: ApuracaoFechadaItem[]) => {
    const cns = itens.filter(i => i.colaborador?.cargo === 'CN');
    const evs = itens.filter(i => i.colaborador?.cargo === 'EV');
    const lideranca = itens.filter(i => i.colaborador?.cargo === 'Lideranca');
    return { cns, evs, lideranca };
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
              Consulte todas as apurações fechadas e rascunhos
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="rascunho">Rascunhos</SelectItem>
                <SelectItem value="finalizado">Finalizados</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedTipo} onValueChange={setSelectedTipo}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="mensal">Mensal</SelectItem>
                <SelectItem value="trimestral">Trimestral</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
              const { cns, evs, lideranca } = groupItemsByCargo(apuracaoItens);
              const isTrimestral = apuracao.tipo === 'trimestral';
              const isRascunho = apuracao.status === 'rascunho';

              return (
                <Collapsible
                  key={apuracao.id}
                  open={isExpanded}
                  onOpenChange={() => handleExpand(apuracao.id)}
                >
                  <Card className={isRascunho ? 'border-amber-300 dark:border-amber-700' : ''}>
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
                              {isRascunho && (
                                <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400">
                                  <FileEdit className="w-3 h-3 mr-1" />
                                  Rascunho
                                </Badge>
                              )}
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground">
                                {apuracao.mes_referencia}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {isRascunho 
                                  ? `Última edição: ${apuracao.updated_at ? format(new Date(apuracao.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '-'}`
                                  : `Fechado em: ${apuracao.data_fechamento ? format(new Date(apuracao.data_fechamento), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '-'}`
                                }
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
                          {/* Summary Cards */}
                          <div className="grid grid-cols-3 gap-4 mb-4">
                            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Users className="w-3 h-3" /> CNs
                              </p>
                              <p className="font-semibold">{formatCurrency(apuracao.total_cns || 0)}</p>
                            </div>
                            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Briefcase className="w-3 h-3" /> EVs
                              </p>
                              <p className="font-semibold">{formatCurrency(apuracao.total_evs || 0)}</p>
                            </div>
                            <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Crown className="w-3 h-3" /> Liderança
                              </p>
                              <p className="font-semibold">{formatCurrency(apuracao.total_lideranca || 0)}</p>
                            </div>
                          </div>

                          {/* Hierarchical Tabs for Trimestral */}
                          {isTrimestral && apuracaoItens.length > 0 ? (
                            <Tabs value={activeDetailTab} onValueChange={setActiveDetailTab}>
                              <TabsList className="grid w-full grid-cols-3 mb-4">
                                <TabsTrigger value="cns" className="gap-1">
                                  <Users className="w-3 h-3" />
                                  CNs ({cns.length})
                                </TabsTrigger>
                                <TabsTrigger value="evs" className="gap-1">
                                  <Briefcase className="w-3 h-3" />
                                  EVs ({evs.length})
                                </TabsTrigger>
                                <TabsTrigger value="lideranca" className="gap-1">
                                  <Crown className="w-3 h-3" />
                                  Liderança ({lideranca.length})
                                </TabsTrigger>
                              </TabsList>

                              <TabsContent value="cns">
                                {cns.length === 0 ? (
                                  <p className="text-center py-4 text-muted-foreground">Nenhum CN nesta apuração</p>
                                ) : (
                                  <div className="overflow-x-auto border rounded-lg">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Nome</TableHead>
                                          <TableHead className="text-center">Nível</TableHead>
                                          <TableHead className="text-right">Meta SAO</TableHead>
                                          <TableHead className="text-right">Real SAO</TableHead>
                                          <TableHead className="text-right">Score</TableHead>
                                          <TableHead className="text-right">Comissão</TableHead>
                                          <TableHead className="text-right">Bônus</TableHead>
                                          <TableHead className="text-right">Total</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {cns.map(item => (
                                          <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.colaborador?.nome || '-'}</TableCell>
                                            <TableCell className="text-center">
                                              <Badge variant="outline">{item.colaborador?.nivel || '-'}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">{item.sao_meta || '-'}</TableCell>
                                            <TableCell className="text-right">{item.sao_realizado || '-'}</TableCell>
                                            <TableCell className="text-right">
                                              {item.score_final ? `${(item.score_final * 100).toFixed(1)}%` : '-'}
                                            </TableCell>
                                            <TableCell className="text-right">{formatCurrency(item.comissao_base || 0)}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(item.bonus_trimestral || 0)}</TableCell>
                                            <TableCell className="text-right font-bold text-primary">
                                              {formatCurrency(item.total_pagar)}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                )}
                              </TabsContent>

                              <TabsContent value="evs">
                                {evs.length === 0 ? (
                                  <p className="text-center py-4 text-muted-foreground">Nenhum EV nesta apuração</p>
                                ) : (
                                  <div className="overflow-x-auto border rounded-lg">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Nome</TableHead>
                                          <TableHead className="text-right">Comissão Safra</TableHead>
                                          <TableHead className="text-center">Multiplicador</TableHead>
                                          <TableHead className="text-right">Bônus EV</TableHead>
                                          <TableHead className="text-right">Total</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {evs.map(item => (
                                          <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.colaborador?.nome || '-'}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(item.comissao_safra || 0)}</TableCell>
                                            <TableCell className="text-center">
                                              <Badge variant="secondary">{item.multiplicador_meta || 1}x</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">{formatCurrency(item.bonus_ev || 0)}</TableCell>
                                            <TableCell className="text-right font-bold text-primary">
                                              {formatCurrency(item.total_pagar)}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                )}
                              </TabsContent>

                              <TabsContent value="lideranca">
                                {lideranca.length === 0 ? (
                                  <p className="text-center py-4 text-muted-foreground">Nenhum líder nesta apuração</p>
                                ) : (
                                  <div className="overflow-x-auto border rounded-lg">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Nome</TableHead>
                                          <TableHead className="text-right">Salário Base</TableHead>
                                          <TableHead className="text-right">Meta MRR</TableHead>
                                          <TableHead className="text-right">Meta SQL</TableHead>
                                          <TableHead className="text-right">Real MRR</TableHead>
                                          <TableHead className="text-right">Real SQL</TableHead>
                                          <TableHead className="text-center">% MRR</TableHead>
                                          <TableHead className="text-center">% SQL</TableHead>
                                          <TableHead className="text-center">Mult.</TableHead>
                                          <TableHead className="text-right">Bônus</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {lideranca.map(item => (
                                          <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.colaborador?.nome || '-'}</TableCell>
                                            <TableCell className="text-right">
                                              {formatCurrency(item.colaborador?.salario_base || 0)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                              {formatCurrency((item as any).meta_mrr_lider || 0)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                              {(item as any).meta_sql_lider || '-'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                              {formatCurrency((item as any).realizado_mrr_lider || 0)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                              {(item as any).realizado_sql_lider || '-'}
                                            </TableCell>
                                            <TableCell className="text-center">
                                              {(item as any).pct_mrr_lider ? `${((item as any).pct_mrr_lider).toFixed(1)}%` : '-'}
                                            </TableCell>
                                            <TableCell className="text-center">
                                              {(item as any).pct_sql_lider ? `${((item as any).pct_sql_lider).toFixed(1)}%` : '-'}
                                            </TableCell>
                                            <TableCell className="text-center">
                                              <Badge variant="secondary">{(item as any).multiplicador_lider || 0}x</Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-primary">
                                              {formatCurrency(item.bonus_lideranca || 0)}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                )}
                              </TabsContent>
                            </Tabs>
                          ) : apuracaoItens.length > 0 ? (
                            // Simple table for Mensal
                            <div className="overflow-x-auto border rounded-lg">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Colaborador</TableHead>
                                    <TableHead className="text-center">Cargo</TableHead>
                                    <TableHead className="text-right">Comissão Base</TableHead>
                                    <TableHead className="text-right">Bônus</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {apuracaoItens.map(item => (
                                    <TableRow key={item.id}>
                                      <TableCell className="font-medium">
                                        {item.colaborador?.nome || item.colaborador_id.substring(0, 8) + '...'}
                                      </TableCell>
                                      <TableCell className="text-center">
                                        <Badge variant="outline">{item.colaborador?.cargo || '-'}</Badge>
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {formatCurrency(item.comissao_base || 0)}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {formatCurrency((item.bonus_trimestral || 0) + (item.bonus_ev || 0) + (item.bonus_lideranca || 0))}
                                      </TableCell>
                                      <TableCell className="text-right font-bold text-primary">
                                        {formatCurrency(item.total_pagar)}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          ) : null}
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
