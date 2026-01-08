import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useApuracoes } from '@/hooks/useApuracoes';
import { ApuracaoSalva, ApuracaoItem, formatCurrency, formatPercent } from '@/lib/evCalculations';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Trash2, ChevronDown, ChevronUp, Calendar, DollarSign, FileCheck } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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

const ApuracoesHistorico = () => {
  const navigate = useNavigate();
  const { apuracoes, isLoading, getApuracaoItens, deleteApuracao, getUniqueMeses } = useApuracoes();
  
  const [selectedMes, setSelectedMes] = useState('__all__');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedItens, setExpandedItens] = useState<ApuracaoItem[]>([]);
  const [loadingItens, setLoadingItens] = useState(false);

  const meses = getUniqueMeses();

  const filteredApuracoes = selectedMes === '__all__' 
    ? apuracoes 
    : apuracoes.filter(a => a.mesReferencia === selectedMes);

  const handleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setExpandedItens([]);
      return;
    }

    setExpandedId(id);
    setLoadingItens(true);
    const itens = await getApuracaoItens(id);
    setExpandedItens(itens);
    setLoadingItens(false);
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'valido':
        return <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">Válido</Badge>;
      case 'expirado':
        return <Badge variant="secondary" className="bg-orange-500/10 text-orange-600 border-orange-500/20">Expirado</Badge>;
      case 'nao_encontrado':
        return <Badge variant="destructive" className="bg-red-500/10 text-red-600 border-red-500/20">Não Encontrado</Badge>;
      case 'pre_vigencia':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">Pré-Vigência</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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
                onClick={() => navigate('/ev-calculator')}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </button>
            </div>
            
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Histórico de Apurações
            </h1>
            <p className="text-muted-foreground mt-2">
              Consulte e gerencie as apurações salvas
            </p>
          </header>

          {/* Filtros */}
          <div className="mb-6">
            <div className="flex items-center gap-4">
              <div className="w-48">
                <Select value={selectedMes} onValueChange={setSelectedMes}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por mês" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos os meses</SelectItem>
                    {meses.map(mes => (
                      <SelectItem key={mes} value={mes}>{mes}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Lista de Apurações */}
          {filteredApuracoes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileCheck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Nenhuma apuração encontrada
                </h3>
                <p className="text-muted-foreground">
                  {selectedMes !== '__all__' 
                    ? 'Não há apurações para o mês selecionado.' 
                    : 'Processe e salve apurações na calculadora EV.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredApuracoes.map(apuracao => (
                <Card key={apuracao.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{apuracao.nome}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          <Calendar className="w-3.5 h-3.5 inline mr-1" />
                          {formatDate(apuracao.dataProcessamento)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir apuração?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. A apuração "{apuracao.nome}" e todos os seus itens serão permanentemente excluídos.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteApuracao(apuracao.id)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Resumo */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">Processado</p>
                        <p className="text-lg font-semibold">{formatCurrency(apuracao.totalProcessado)}</p>
                      </div>
                      <div className="bg-green-500/10 rounded-lg p-3">
                        <p className="text-xs text-green-600">Comissão Válida</p>
                        <p className="text-lg font-semibold text-green-600">{formatCurrency(apuracao.totalComissaoValida)}</p>
                      </div>
                      <div className="bg-orange-500/10 rounded-lg p-3">
                        <p className="text-xs text-orange-600">Expirado</p>
                        <p className="text-lg font-semibold text-orange-600">{formatCurrency(apuracao.totalExpirado)}</p>
                      </div>
                      <div className="bg-red-500/10 rounded-lg p-3">
                        <p className="text-xs text-red-600">Não Encontrado</p>
                        <p className="text-lg font-semibold text-red-600">{formatCurrency(apuracao.totalNaoEncontrado)}</p>
                      </div>
                    </div>

                    {/* Contadores */}
                    <div className="flex gap-4 text-sm text-muted-foreground mb-4">
                      <span className="text-green-600">{apuracao.countValidos} válidos</span>
                      <span className="text-orange-600">{apuracao.countExpirados} expirados</span>
                      <span className="text-red-600">{apuracao.countNaoEncontrados} não encontrados</span>
                      <span className="text-blue-600">{apuracao.countPreVigencia} pré-vigência</span>
                    </div>

                    {/* Botão expandir */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExpand(apuracao.id)}
                      className="w-full"
                    >
                      {expandedId === apuracao.id ? (
                        <>
                          <ChevronUp className="w-4 h-4 mr-2" />
                          Ocultar Detalhes
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4 mr-2" />
                          Ver Detalhes
                        </>
                      )}
                    </Button>

                    {/* Tabela de itens expandida */}
                    {expandedId === apuracao.id && (
                      <div className="mt-4 border rounded-lg overflow-hidden">
                        {loadingItens ? (
                          <div className="py-8 flex justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Produto</TableHead>
                                <TableHead>Operadora</TableHead>
                                <TableHead>NF Líquido</TableHead>
                                <TableHead>EV</TableHead>
                                <TableHead>Mês</TableHead>
                                <TableHead>Taxa</TableHead>
                                <TableHead>Comissão</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {expandedItens.map(item => (
                                <TableRow key={item.id}>
                                  <TableCell className="font-medium">{item.clienteMae}</TableCell>
                                  <TableCell>{item.produto}</TableCell>
                                  <TableCell>{item.operadora}</TableCell>
                                  <TableCell>{formatCurrency(item.nfLiquido)}</TableCell>
                                  <TableCell>{item.nomeEV || '-'}</TableCell>
                                  <TableCell>{item.mesVigencia ? `${item.mesVigencia}/12` : '-'}</TableCell>
                                  <TableCell>{item.taxa ? formatPercent(item.taxa) : '-'}</TableCell>
                                  <TableCell className={item.comissao ? 'text-green-600 font-medium' : ''}>
                                    {item.comissao ? formatCurrency(item.comissao) : '-'}
                                  </TableCell>
                                  <TableCell>{getStatusBadge(item.status)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default ApuracoesHistorico;
