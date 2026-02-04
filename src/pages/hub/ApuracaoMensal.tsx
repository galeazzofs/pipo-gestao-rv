import { useState, useMemo, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { AdminRoute } from '@/components/AdminRoute';
import { useColaboradores } from '@/hooks/useColaboradores';
import { useApuracoesFechadas, ApuracaoItemInput, ApuracaoFechadaItem } from '@/hooks/useApuracoesFechadas';
import { calcularComissaoCN, CNLevel, CN_TARGETS } from '@/lib/cnCalculations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Receipt, 
  Calculator,
  Save,
  Loader2,
  Info,
  Clock,
  FileCheck
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const ANOS = ['2024', '2025', '2026', '2027'];

interface CNRow {
  colaboradorId: string;
  nome: string;
  nivel: CNLevel;
  target: number;
  saoMeta: string;
  saoRealizado: string;
  vidasMeta: string;
  vidasRealizado: string;
  comissao: number;
  pctSAO: number;
  pctVidas: number;
  scoreFinal: number;
  multiplicador: number;
}

export default function ApuracaoMensal() {
  const { colaboradores, isLoading: loadingColaboradores, getCNs } = useColaboradores();
  const { saveApuracao, saveDraft, loadDraft, isLoading: loadingApuracoes } = useApuracoesFechadas();
  
  const currentDate = new Date();
  const [mes, setMes] = useState(MESES[currentDate.getMonth()]);
  const [ano, setAno] = useState(String(currentDate.getFullYear()));
  
  // Estados de salvamento/carregamento
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const cns = getCNs();

  // Estado para cada linha de CN
  const [rows, setRows] = useState<Record<string, Omit<CNRow, 'colaboradorId' | 'nome' | 'nivel' | 'target'>>>({});

  const mesReferencia = `${mes.slice(0, 3)}/${ano}`;

  // Função para carregar rascunho existente
  const loadExistingDraft = useCallback(async () => {
    setIsLoadingDraft(true);
    const draft = await loadDraft('mensal', mesReferencia);
    
    if (draft) {
      setDraftId(draft.apuracao.id);
      setLastSaved(draft.apuracao.updated_at ? new Date(draft.apuracao.updated_at) : null);
      
      const newRows: Record<string, any> = {};
      
      draft.itens.forEach((item: ApuracaoFechadaItem) => {
        if (item.colaborador_id) {
          newRows[item.colaborador_id] = {
            saoMeta: item.sao_meta?.toString() || '',
            saoRealizado: item.sao_realizado?.toString() || '',
            vidasMeta: item.vidas_meta?.toString() || '',
            vidasRealizado: item.vidas_realizado?.toString() || '',
            comissao: item.comissao_base || 0,
            pctSAO: item.pct_sao || 0,
            pctVidas: item.pct_vidas || 0,
            scoreFinal: item.score_final || 0,
            multiplicador: item.multiplicador || 0,
          };
        }
      });
      
      setRows(newRows);
      toast.info('Rascunho carregado');
    } else {
      setDraftId(null);
      setLastSaved(null);
      setRows({});
    }
    
    setIsLoadingDraft(false);
  }, [loadDraft, mesReferencia]);

  // Carregar rascunho ao mudar mês/ano ou terminar de carregar colaboradores
  useEffect(() => {
    if (!loadingColaboradores) {
      loadExistingDraft();
    }
  }, [mes, ano, loadingColaboradores]);

  // Inicializar rows com dados da Gestão de Time (Metas Automáticas)
  useEffect(() => {
    if (loadingColaboradores || isLoadingDraft || draftId) return;

    const newRows: Record<string, any> = {};
    let hasChanges = false;

    cns.forEach(cn => {
      // Se a linha ainda não existe no estado local
      if (!rows[cn.id]) {
        newRows[cn.id] = {
          // AQUI ESTÁ A MUDANÇA: Puxa meta_sao e meta_vidas do cadastro do colaborador
          saoMeta: cn.meta_sao?.toString() || '', 
          saoRealizado: '', 
          vidasMeta: cn.meta_vidas?.toString() || '', 
          vidasRealizado: '',
          comissao: 0, pctSAO: 0, pctVidas: 0, scoreFinal: 0, multiplicador: 0,
        };
        hasChanges = true;
      } else {
        newRows[cn.id] = rows[cn.id];
      }
    });

    if (hasChanges) {
      setRows(prev => ({ ...prev, ...newRows }));
    }
  }, [cns, loadingColaboradores, isLoadingDraft, draftId, rows]);

  const updateRow = (colaboradorId: string, field: keyof CNRow, value: string) => {
    setRows(prev => {
      const current = prev[colaboradorId] || {
        saoMeta: '', saoRealizado: '', vidasMeta: '', vidasRealizado: '',
        comissao: 0, pctSAO: 0, pctVidas: 0, scoreFinal: 0, multiplicador: 0,
      };

      const updated = { ...current, [field]: value };

      // Recalcular comissão se todos os campos estiverem preenchidos
      const colaborador = cns.find(c => c.id === colaboradorId);
      if (colaborador && updated.saoMeta && updated.saoRealizado && updated.vidasMeta && updated.vidasRealizado) {
        const nivel = (colaborador.nivel || 'CN1') as CNLevel;
        const resultado = calcularComissaoCN(
          nivel,
          parseFloat(updated.saoMeta) || 0,
          parseFloat(updated.saoRealizado) || 0,
          parseFloat(updated.vidasMeta) || 0,
          parseFloat(updated.vidasRealizado) || 0
        );
        updated.comissao = resultado.comissao;
        updated.pctSAO = resultado.details.pctSAO;
        updated.pctVidas = resultado.details.pctVidas;
        updated.scoreFinal = resultado.details.scoreFinal;
        updated.multiplicador = resultado.details.multiplicador;
      }

      return { ...prev, [colaboradorId]: updated };
    });
  };

  const totalComissoes = useMemo(() => {
    return Object.values(rows).reduce((sum, row) => sum + (row.comissao || 0), 0);
  }, [rows]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  // Constrói o array de itens para salvar (usado tanto para Rascunho quanto Finalizar)
  const buildItensArray = (onlyComplete = true): ApuracaoItemInput[] => {
    const itens: ApuracaoItemInput[] = [];

    cns.forEach(cn => {
      const row = rows[cn.id];
      if (!row) return;

      const isComplete = row.saoMeta !== '' && row.saoRealizado !== '' && row.vidasMeta !== '' && row.vidasRealizado !== '';
      const hasAnyData = row.saoMeta || row.saoRealizado || row.vidasMeta || row.vidasRealizado;

      // Para finalizar, exige completo. Para rascunho, basta ter algum dado.
      if ((onlyComplete && isComplete) || (!onlyComplete && hasAnyData)) {
        itens.push({
          colaborador_id: cn.id,
          sao_meta: parseFloat(row.saoMeta) || 0,
          sao_realizado: parseFloat(row.saoRealizado) || 0,
          vidas_meta: parseFloat(row.vidasMeta) || 0,
          vidas_realizado: parseFloat(row.vidasRealizado) || 0,
          pct_sao: row.pctSAO,
          pct_vidas: row.pctVidas,
          score_final: row.scoreFinal,
          multiplicador: row.multiplicador,
          comissao_base: row.comissao,
          total_pagar: row.comissao,
        });
      }
    });

    return itens;
  };

  const handleSaveDraft = async () => {
    const itens = buildItensArray(false); // Permite dados parciais
    
    if (itens.length === 0) {
      toast.error('Preencha algum dado para salvar rascunho');
      return;
    }

    setIsSavingDraft(true);
    const result = await saveDraft('mensal', mesReferencia, itens);
    setIsSavingDraft(false);

    if (result) {
      setDraftId(result);
      setLastSaved(new Date());
    }
  };

  const handleFinalize = async () => {
    const itens = buildItensArray(true); // Exige dados completos para os itens incluídos

    if (itens.length === 0) {
      toast.error('Nenhum CN com dados completos para finalizar');
      return;
    }

    setIsSaving(true);
    const result = await saveApuracao('mensal', mesReferencia, itens);
    setIsSaving(false);

    if (result) {
      // Limpar formulário após finalizar
      const clearedRows: Record<string, any> = {};
      cns.forEach(cn => {
        clearedRows[cn.id] = {
          saoMeta: '', saoRealizado: '', vidasMeta: '', vidasRealizado: '',
          comissao: 0, pctSAO: 0, pctVidas: 0, scoreFinal: 0, multiplicador: 0,
        };
      });
      setRows(clearedRows);
      setDraftId(null);
      setLastSaved(null);
    }
  };

  const hasAnyData = Object.values(rows).some(r => r.saoMeta || r.saoRealizado);

  return (
    <AdminRoute>
      <div className="min-h-screen bg-background">
        <Navbar />
        
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <Receipt className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Apuração Mensal</h1>
                <p className="text-sm text-muted-foreground">
                  Fechamento de comissões dos CNs
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Select value={mes} onValueChange={setMes}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MESES.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={ano} onValueChange={setAno}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ANOS.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Draft Status */}
          {(draftId || lastSaved) && (
            <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="text-sm text-amber-700 dark:text-amber-400">
                {lastSaved 
                  ? `Rascunho salvo em ${format(lastSaved, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`
                  : 'Rascunho carregado'
                }
              </span>
            </div>
          )}

          {/* Info Card */}
          <div className="card-premium p-4 mb-6 flex items-start gap-3 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-800 dark:text-blue-300">Regra de Cálculo (Regra de Ouro)</p>
              <p className="text-blue-700 dark:text-blue-400">
                Score = (SAO × 70%) + (Vidas × 30%, trava em 150%). Metas carregadas da Gestão de Time.
              </p>
            </div>
          </div>

          {/* Table */}
          <div className="card-premium overflow-hidden mb-6">
            {loadingColaboradores || isLoadingDraft ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">
                  {isLoadingDraft ? 'Carregando rascunho...' : 'Carregando colaboradores...'}
                </span>
              </div>
            ) : cns.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nenhum CN cadastrado. Acesse Gestão de Time para adicionar colaboradores.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[160px]">Consultor</TableHead>
                      <TableHead className="text-center">Nível</TableHead>
                      <TableHead className="text-center">Target</TableHead>
                      <TableHead className="text-center w-24">Meta SAO</TableHead>
                      <TableHead className="text-center w-24">Real SAO</TableHead>
                      <TableHead className="text-center w-24">Meta Vidas</TableHead>
                      <TableHead className="text-center w-24">Real Vidas</TableHead>
                      <TableHead className="text-center">
                        <Tooltip>
                          <TooltipTrigger className="flex items-center gap-1 justify-center">
                            Score
                            <Info className="w-3 h-3" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>(SAO × 70%) + (Vidas × 30%)</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableHead>
                      <TableHead className="text-center">Mult.</TableHead>
                      <TableHead className="text-right">Comissão</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                      {cns.map((cn) => {
                        const row = rows[cn.id] || {
                          saoMeta: '',
                          saoRealizado: '',
                          vidasMeta: '',
                          vidasRealizado: '',
                          comissao: 0,
                          pctSAO: 0,
                          pctVidas: 0,
                          scoreFinal: 0,
                          multiplicador: 0,
                        };
                        const nivel = (cn.nivel || 'CN1') as CNLevel;
                        const target = CN_TARGETS[nivel];
                        
                        // Verifica se todos os campos estão preenchidos (diferente de string vazia)
                        const isComplete = row.saoMeta !== '' && row.saoRealizado !== '' && row.vidasMeta !== '' && row.vidasRealizado !== '';

                        return (
                          <TableRow key={cn.id}>
                            <TableCell className="font-medium">{cn.nome}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline">{nivel}</Badge>
                            </TableCell>
                            <TableCell className="text-center text-muted-foreground">
                              {formatCurrency(target)}
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={row.saoMeta}
                                onChange={(e) => updateRow(cn.id, 'saoMeta', e.target.value)}
                                className="w-20 text-center"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={row.saoRealizado}
                                onChange={(e) => updateRow(cn.id, 'saoRealizado', e.target.value)}
                                className="w-20 text-center"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={row.vidasMeta}
                                onChange={(e) => updateRow(cn.id, 'vidasMeta', e.target.value)}
                                className="w-20 text-center"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={row.vidasRealizado}
                                onChange={(e) => updateRow(cn.id, 'vidasRealizado', e.target.value)}
                                className="w-20 text-center"
                              />
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {isComplete ? formatPercentage(row.scoreFinal) : '-'}
                            </TableCell>
                            <TableCell className="text-center">
                              {isComplete ? formatPercentage(row.multiplicador) : '-'}
                            </TableCell>
                            <TableCell className="text-right font-bold text-success">
                              {isComplete ? formatCurrency(row.comissao) : '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          {cns.length > 0 && (
            <div className="card-premium p-6 sticky bottom-4 z-10 shadow-lg border-t bg-background/95 backdrop-blur">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Calculator className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total a Pagar</p>
                    <p className="text-2xl font-bold text-success">
                      {formatCurrency(totalComissoes)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button 
                    variant="outline"
                    onClick={handleSaveDraft} 
                    disabled={isSavingDraft || !hasAnyData}
                    className="gap-2"
                  >
                    {isSavingDraft ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Salvar Rascunho
                  </Button>

                  <Button 
                    onClick={handleFinalize} 
                    disabled={isSaving || totalComissoes === 0}
                    className="gap-2"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileCheck className="w-4 h-4" />
                    )}
                    Finalizar Fechamento
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminRoute>
  );
}