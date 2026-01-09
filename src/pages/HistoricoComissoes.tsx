import { useState, useMemo } from 'react';
import { GlobalNavbar } from '@/components/GlobalNavbar';
import { AdminRoute } from '@/components/AdminRoute';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useApuracoes, ApuracaoItem } from '@/hooks/useApuracoes';
import { useContracts } from '@/hooks/useContracts';
import { Loader2, ChevronDown, ChevronRight, Trash2, History } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency, formatPercent } from '@/lib/evCalculations';

function HistoricoContent() {
  const { apuracoes, isLoading, getApuracaoItems, deleteApuracao } = useApuracoes();
  const { getUniqueEVNames, getUniqueClientes } = useContracts();
  
  const [filterMes, setFilterMes] = useState('');
  const [filterEV, setFilterEV] = useState('__all__');
  const [filterCliente, setFilterCliente] = useState('__all__');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<ApuracaoItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const evNames = getUniqueEVNames();
  const clientes = getUniqueClientes();

  // Filtrar apurações
  const filteredApuracoes = useMemo(() => {
    return apuracoes.filter(a => {
      if (filterMes && !a.mesReferencia.includes(filterMes)) return false;
      // Filtros por EV e Cliente serão aplicados nos itens expandidos
      return true;
    });
  }, [apuracoes, filterMes]);

  const handleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setExpandedItems([]);
      return;
    }

    setLoadingItems(true);
    setExpandedId(id);
    
    const items = await getApuracaoItems(id);
    setExpandedItems(items);
    setLoadingItems(false);
  };

  const filteredItems = useMemo(() => {
    return expandedItems.filter(item => {
      if (filterEV !== '__all__' && item.nomeEV !== filterEV) return false;
      if (filterCliente !== '__all__' && item.clienteMae !== filterCliente) return false;
      return true;
    });
  }, [expandedItems, filterEV, filterCliente]);

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const formatMesReferencia = (mesRef: string) => {
    try {
      // mesRef pode vir como "2026-01" ou "2026-01-01"
      const date = parseISO(mesRef.length === 7 ? `${mesRef}-01` : mesRef);
      return format(date, "MMM/yyyy", { locale: ptBR });
    } catch {
      return mesRef;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'valido':
        return <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">Válido</Badge>;
      case 'expirado':
        return <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">Expirado</Badge>;
      case 'pre_vigencia':
        return <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30">Pré-Vigência</Badge>;
      case 'nao_encontrado':
        return <Badge className="bg-red-500/20 text-red-600 border-red-500/30">Não Encontrado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <GlobalNavbar />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <GlobalNavbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <History className="w-8 h-8 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Histórico de Comissões
            </h1>
          </div>
          <p className="text-muted-foreground">
            Visualize e gerencie as apurações salvas
          </p>
        </header>

        {/* Filtros */}
        <div className="card-premium p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Mês de Referência</Label>
              <Input
                type="month"
                value={filterMes}
                onChange={(e) => setFilterMes(e.target.value)}
                className="input-field"
                placeholder="Filtrar por mês"
              />
            </div>

            <div className="space-y-2">
              <Label>Executivo de Vendas</Label>
              <Select value={filterEV} onValueChange={setFilterEV}>
                <SelectTrigger className="input-field">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  {evNames.map(name => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={filterCliente} onValueChange={setFilterCliente}>
                <SelectTrigger className="input-field">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  {clientes.map(name => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Lista de Apurações */}
        {filteredApuracoes.length === 0 ? (
          <div className="card-premium p-8 text-center">
            <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Nenhuma apuração salva
            </h3>
            <p className="text-muted-foreground">
              Processe comissões na calculadora e salve para ver aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredApuracoes.map(apuracao => (
              <Collapsible key={apuracao.id} open={expandedId === apuracao.id}>
                <div className="card-premium overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <CollapsibleTrigger asChild>
                        <button
                          onClick={() => handleExpand(apuracao.id)}
                          className="flex items-center gap-3 text-left flex-1"
                        >
                          {expandedId === apuracao.id ? (
                            <ChevronDown className="w-5 h-5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                          )}
                          <div>
                            <h3 className="font-semibold text-foreground">{apuracao.nome}</h3>
                            <p className="text-sm text-muted-foreground">
                              Ref: {formatMesReferencia(apuracao.mesReferencia)} • Processado em {formatDate(apuracao.dataProcessamento)}
                            </p>
                          </div>
                        </button>
                      </CollapsibleTrigger>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Comissão Total</p>
                          <p className="text-lg font-bold text-emerald-600">
                            {formatCurrency(apuracao.totalComissaoValida)}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{apuracao.countValidos} válidos</Badge>
                          <Badge variant="secondary">{apuracao.countExpirados + apuracao.countPreVigencia} fora</Badge>
                          <Badge variant="destructive">{apuracao.countNaoEncontrados} não encontrados</Badge>
                        </div>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir apuração?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. A apuração "{apuracao.nome}" será removida permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteApuracao(apuracao.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>

                  <CollapsibleContent>
                    <div className="border-t border-border">
                      {loadingItems ? (
                        <div className="p-8 text-center">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead>EV</TableHead>
                              <TableHead>Cliente</TableHead>
                              <TableHead>Produto</TableHead>
                              <TableHead>Operadora</TableHead>
                              <TableHead className="text-right">NF Líquido</TableHead>
                              <TableHead className="text-center">Mês Vig.</TableHead>
                              <TableHead className="text-center">Taxa</TableHead>
                              <TableHead className="text-right">Comissão</TableHead>
                              <TableHead className="text-center">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredItems.map(item => (
                              <TableRow key={item.id}>
                                <TableCell>{item.nomeEV || '-'}</TableCell>
                                <TableCell className="font-medium">{item.clienteMae}</TableCell>
                                <TableCell>{item.produto}</TableCell>
                                <TableCell>{item.operadora}</TableCell>
                                <TableCell className="text-right font-mono">
                                  {formatCurrency(item.nfLiquido)}
                                </TableCell>
                                <TableCell className="text-center">
                                  {item.mesVigencia ? `${item.mesVigencia}/12` : '-'}
                                </TableCell>
                                <TableCell className="text-center font-mono">
                                  {item.taxa ? formatPercent(item.taxa) : '-'}
                                </TableCell>
                                <TableCell className="text-right font-mono font-semibold">
                                  {item.comissao ? formatCurrency(item.comissao) : '-'}
                                </TableCell>
                                <TableCell className="text-center">
                                  {getStatusBadge(item.status)}
                                </TableCell>
                              </TableRow>
                            ))}
                            {filteredItems.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                                  Nenhum item encontrado com os filtros selecionados.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function HistoricoComissoes() {
  return (
    <AdminRoute>
      <HistoricoContent />
    </AdminRoute>
  );
}
