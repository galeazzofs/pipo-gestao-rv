import { useState, useMemo, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { AdminRoute } from '@/components/AdminRoute';
import { useColaboradores } from '@/hooks/useColaboradores';
import { useApuracoesFechadas, ApuracaoItemInput } from '@/hooks/useApuracoesFechadas';
import { useContracts } from '@/hooks/useContracts';
import { calcularComissaoCN, CNLevel, CN_TARGETS } from '@/lib/cnCalculations';
import { processCommissions, groupByEV, calculateTotals } from '@/components/ev/ProcessingEngine';
import { ExcelRow, formatCurrency as formatCurrencyEV, ProcessedResult } from '@/lib/evCalculations';
import { ResultsDashboard } from '@/components/ev/ResultsDashboard';
import { ResultsTable } from '@/components/ev/ResultsTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  CalendarCheck, 
  Calculator,
  Save,
  Loader2,
  Users,
  Briefcase,
  Crown,
  Info,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { ExcelDropzone } from '@/components/ev/ExcelDropzone';
import { cn } from '@/lib/utils';

const TRIMESTRES = [
  { value: 'Q1', label: 'Q1 (Jan-Mar)' },
  { value: 'Q2', label: 'Q2 (Abr-Jun)' },
  { value: 'Q3', label: 'Q3 (Jul-Set)' },
  { value: 'Q4', label: 'Q4 (Out-Dez)' },
];

const ANOS = ['2024', '2025', '2026', '2027'];

// Função para calcular multiplicador baseado no % de atingimento de MRR
const calcularMultiplicadorMRR = (pctAtingimento: number): number => {
  if (pctAtingimento < 80) return 0;
  if (pctAtingimento < 95) return 0.5;
  if (pctAtingimento < 125) return 1.0;
  return 1.5;
};

const getMultiplicadorLabel = (mult: number): string => {
  if (mult === 0) return 'Sem Bônus';
  if (mult === 0.5) return '0.5x Salário';
  if (mult === 1) return '1x Salário';
  return '1.5x Salário';
};

// Retorna os meses do quarter selecionado (0-indexed: Jan=0, Dez=11)
const getQuarterMonths = (quarter: string): number[] => {
  switch (quarter) {
    case 'Q1': return [0, 1, 2]; // Jan, Fev, Mar
    case 'Q2': return [3, 4, 5]; // Abr, Mai, Jun
    case 'Q3': return [6, 7, 8]; // Jul, Ago, Set
    case 'Q4': return [9, 10, 11]; // Out, Nov, Dez
    default: return [];
  }
};

// Verifica se uma data está dentro do quarter/ano selecionado
const isDateInQuarter = (date: Date, quarter: string, year: string): boolean => {
  const monthsInQuarter = getQuarterMonths(quarter);
  return date.getFullYear() === parseInt(year) && 
         monthsInQuarter.includes(date.getMonth());
};

interface CNRow {
  saoMeta: string;
  saoRealizado: string;
  vidasMeta: string;
  vidasRealizado: string;
  comissao: number;
  pctSAO: number;
  pctVidas: number;
  scoreFinal: number;
  multiplicador: number;
  bonus: string;
  total: number;
}

interface EVRow {
  comissaoSafra: number;
  metaMRR: string;
  mrrRealizado: string;
  pctAtingimento: number;
  multiplicador: number;
  bonusEV: number;
  total: number;
}

interface LiderRow {
  bonus: string;
  total: number;
}

export default function ApuracaoTrimestral() {
  const { getCNs, getEVs, getLideres, isLoading: loadingColaboradores } = useColaboradores();
  const { saveApuracao } = useApuracoesFechadas();
  const { contracts, isLoading: loadingContracts } = useContracts();
  
  const currentDate = new Date();
  const currentQuarter = Math.ceil((currentDate.getMonth() + 1) / 3);
  const [trimestre, setTrimestre] = useState(`Q${currentQuarter}`);
  const [ano, setAno] = useState(String(currentDate.getFullYear()));
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('cns');
  
  const cns = getCNs();
  const evs = getEVs();
  const lideres = getLideres();

  // Estados por categoria
  const [cnRows, setCnRows] = useState<Record<string, CNRow>>({});
  const [evRows, setEvRows] = useState<Record<string, EVRow>>({});
  const [liderRows, setLiderRows] = useState<Record<string, LiderRow>>({});
  const [isProcessingExcel, setIsProcessingExcel] = useState(false);
  
  // Estados para visualização detalhada dos EVs (como na implementação original)
  const [evResults, setEvResults] = useState<ProcessedResult[]>([]);
  const [hasProcessedExcel, setHasProcessedExcel] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('__all__');
  const [excelDataOriginal, setExcelDataOriginal] = useState<ExcelRow[]>([]);
  const [selectedEV, setSelectedEV] = useState('__all__');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  // Handlers para CNs (mesma lógica da ApuracaoMensal)
  const updateCNRow = (id: string, field: keyof CNRow, value: string) => {
    setCnRows(prev => {
      const current = prev[id] || {
        saoMeta: '', saoRealizado: '', vidasMeta: '', vidasRealizado: '',
        comissao: 0, pctSAO: 0, pctVidas: 0, scoreFinal: 0, multiplicador: 0,
        bonus: '0', total: 0
      };
      const updated = { ...current, [field]: value };

      // Recalcular usando a mesma lógica da ApuracaoMensal
      const cn = cns.find(c => c.id === id);
      if (cn && updated.saoMeta && updated.saoRealizado && updated.vidasMeta && updated.vidasRealizado) {
        const nivel = (cn.nivel || 'CN1') as CNLevel;
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
      updated.total = updated.comissao + (parseFloat(updated.bonus) || 0);

      return { ...prev, [id]: updated };
    });
  };

  // Handlers para EVs - Cálculo automático do multiplicador baseado em MRR
  const updateEVRow = (id: string, field: keyof EVRow, value: string | number) => {
    setEvRows(prev => {
      const ev = evs.find(e => e.id === id);
      const current = prev[id] || {
        comissaoSafra: 0, metaMRR: '', mrrRealizado: '', 
        pctAtingimento: 0, multiplicador: 0, bonusEV: 0, total: 0
      };
      const updated = { ...current, [field]: value };

      // Calcular % Atingimento
      const meta = parseFloat(updated.metaMRR) || 0;
      const realizado = parseFloat(updated.mrrRealizado) || 0;
      updated.pctAtingimento = meta > 0 ? (realizado / meta) * 100 : 0;
      
      // Calcular Multiplicador automaticamente baseado no atingimento
      updated.multiplicador = calcularMultiplicadorMRR(updated.pctAtingimento);
      
      // Calcular Bônus EV
      updated.bonusEV = (ev?.salario_base || 0) * updated.multiplicador;
      
      // Total final = Comissão Safra + Bônus MRR
      updated.total = updated.comissaoSafra + updated.bonusEV;

      return { ...prev, [id]: updated };
    });
  };

  // Processa dados do Excel filtrando pelo quarter selecionado
  const processExcelForQuarter = useCallback((data: ExcelRow[], quarterFilter: string, yearFilter: string) => {
    if (contracts.length === 0) {
      toast.error('Nenhum contrato cadastrado. Cadastre contratos antes de processar.');
      return;
    }

    // Filtrar linhas por quarter selecionado
    const quarterMonths = getQuarterMonths(quarterFilter);
    const yearNum = parseInt(yearFilter);
    
    const filteredData = data.filter(row => {
      const month = row.dataRecebimento.getMonth();
      const year = row.dataRecebimento.getFullYear();
      return year === yearNum && quarterMonths.includes(month);
    });

    console.log(`=== PROCESSAMENTO EV: ${quarterFilter}/${yearFilter} ===`);
    console.log(`Filtrado: ${filteredData.length} de ${data.length} parcelas`);

    if (filteredData.length === 0) {
      toast.warning(
        `Nenhuma parcela encontrada para ${quarterFilter}/${yearFilter}.\n` +
        `Total no arquivo: ${data.length} linhas.`
      );
      setEvResults([]);
      // Resetar comissões dos EVs quando não há dados
      const resetEvRows: Record<string, EVRow> = {};
      evs.forEach(ev => {
        const current = evRows[ev.id];
        resetEvRows[ev.id] = {
          comissaoSafra: 0,
          metaMRR: current?.metaMRR || '',
          mrrRealizado: current?.mrrRealizado || '',
          pctAtingimento: current?.pctAtingimento || 0,
          multiplicador: current?.multiplicador || 0,
          bonusEV: current?.bonusEV || 0,
          total: current?.bonusEV || 0
        };
      });
      setEvRows(resetEvRows);
      return;
    }

    // Processar usando o engine (matching + vigência + taxa)
    const results = processCommissions({ excelData: filteredData, contracts });
    
    setEvResults(results);
    setHasProcessedExcel(true);
    
    const totals = calculateTotals(results);
    
    // Helper para normalizar nomes para comparação
    const normalize = (str: string) => 
      str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    // Atualizar evRows com as comissões calculadas
    const newEvRows: Record<string, EVRow> = { ...evRows };

    evs.forEach(ev => {
      const evResultsFiltered = results.filter(r => {
        if (!r.contract) return false;
        const evName = normalize(r.contract.nomeEV);
        const colaboradorName = normalize(ev.nome);
        return evName === colaboradorName || 
               evName.includes(colaboradorName) || 
               colaboradorName.includes(evName);
      });
      
      const comissaoSafra = evResultsFiltered
        .filter(r => r.status === 'valido')
        .reduce((sum, r) => sum + (r.comissao || 0), 0);
      
      const current = newEvRows[ev.id] || { 
        comissaoSafra: 0, metaMRR: '', mrrRealizado: '',
        pctAtingimento: 0, multiplicador: 0, bonusEV: 0, total: 0 
      };
      
      const mult = current.multiplicador;
      const bonusEV = (ev.salario_base || 0) * mult;
      
      newEvRows[ev.id] = {
        comissaoSafra,
        metaMRR: current.metaMRR,
        mrrRealizado: current.mrrRealizado,
        pctAtingimento: current.pctAtingimento,
        multiplicador: mult,
        bonusEV,
        total: comissaoSafra + bonusEV
      };

      if (evResultsFiltered.length > 0) {
        console.log(`EV ${ev.nome}: ${evResultsFiltered.filter(r => r.status === 'valido').length} válidos, Comissão: ${formatCurrencyEV(comissaoSafra)}`);
      }
    });
    
    setEvRows(newEvRows);
    
    // Feedback para o usuário
    const messages = [
      `📅 ${quarterFilter}/${yearFilter}: ${filteredData.length} parcelas`,
      `✅ ${totals.countValidos} válidos (${formatCurrencyEV(totals.totalComissaoValida)})`,
      totals.countExpirados > 0 ? `⚠️ ${totals.countExpirados} expirados` : null,
      totals.countNaoEncontrados > 0 ? `❌ ${totals.countNaoEncontrados} sem contrato` : null,
    ].filter(Boolean);

    toast.success(messages.join('\n'));
  }, [contracts, evs, evRows]);

  // Handler para Excel dos EVs - Salva dados originais e processa
  const handleExcelData = useCallback((data: ExcelRow[]) => {
    setIsProcessingExcel(true);
    
    try {
      // Salvar dados originais para reprocessamento
      setExcelDataOriginal(data);
      
      // Processar com o quarter selecionado
      processExcelForQuarter(data, trimestre, ano);

    } catch (error) {
      console.error('Erro no processamento:', error);
      toast.error('Erro ao processar o Excel');
    } finally {
      setIsProcessingExcel(false);
    }
  }, [processExcelForQuarter, trimestre, ano]);

  // Reprocessar automaticamente quando quarter/ano mudar (se já tem dados carregados)
  useEffect(() => {
    if (excelDataOriginal.length > 0) {
      console.log(`Reprocessando para ${trimestre}/${ano}...`);
      processExcelForQuarter(excelDataOriginal, trimestre, ano);
    }
  }, [trimestre, ano]);

  // Handlers para Liderança
  const updateLiderRow = (id: string, bonus: string) => {
    setLiderRows(prev => ({
      ...prev,
      [id]: {
        bonus,
        total: parseFloat(bonus) || 0
      }
    }));
  };

  // Totais
  const totalCNs = useMemo(() => 
    Object.values(cnRows).reduce((sum, row) => sum + (row.total || 0), 0),
  [cnRows]);

  const totalEVs = useMemo(() => 
    Object.values(evRows).reduce((sum, row) => sum + (row.total || 0), 0),
  [evRows]);

  const totalLideranca = useMemo(() => 
    Object.values(liderRows).reduce((sum, row) => sum + (row.total || 0), 0),
  [liderRows]);

  const totalGeral = totalCNs + totalEVs + totalLideranca;

  const handleSave = async () => {
    if (totalGeral === 0) {
      toast.error('Preencha pelo menos um valor para salvar');
      return;
    }

    setIsSaving(true);
    const mesReferencia = `${trimestre}/${ano}`;
    
    const itens: ApuracaoItemInput[] = [];

    // CNs
    cns.forEach(cn => {
      const row = cnRows[cn.id];
      if (row && row.total > 0) {
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
          bonus_trimestral: parseFloat(row.bonus) || 0,
          total_pagar: row.total,
        });
      }
    });

    // EVs
    evs.forEach(ev => {
      const row = evRows[ev.id];
      if (row && row.total > 0) {
        itens.push({
          colaborador_id: ev.id,
          comissao_safra: row.comissaoSafra,
          multiplicador_meta: row.multiplicador,
          bonus_ev: row.bonusEV,
          total_pagar: row.total,
        });
      }
    });

    // Liderança
    lideres.forEach(lider => {
      const row = liderRows[lider.id];
      if (row && row.total > 0) {
        itens.push({
          colaborador_id: lider.id,
          bonus_lideranca: row.total,
          total_pagar: row.total,
        });
      }
    });

    const result = await saveApuracao('trimestral', mesReferencia, itens);
    setIsSaving(false);

    if (result) {
      setCnRows({});
      setEvRows({});
      setLiderRows({});
    }
  };

  return (
    <AdminRoute>
      <div className="min-h-screen bg-background">
        <Navbar />
        
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <CalendarCheck className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Apuração Trimestral</h1>
                <p className="text-sm text-muted-foreground">
                  Fechamento completo: CNs + EVs + Liderança
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Select value={trimestre} onValueChange={setTrimestre}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRIMESTRES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
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

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="cns" className="gap-2">
                <Users className="w-4 h-4" />
                CNs
                {totalCNs > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {formatCurrency(totalCNs)}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="evs" className="gap-2">
                <Briefcase className="w-4 h-4" />
                EVs
                {totalEVs > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {formatCurrency(totalEVs)}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="lideranca" className="gap-2">
                <Crown className="w-4 h-4" />
                Liderança
                {totalLideranca > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {formatCurrency(totalLideranca)}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* CNs Tab - Padronizado com ApuracaoMensal */}
            <TabsContent value="cns">
              <div className="card-premium p-4 mb-4 flex items-start gap-3 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-800 dark:text-blue-300">Regra de Cálculo (Regra de Ouro)</p>
                  <p className="text-blue-700 dark:text-blue-400">
                    Score = (SAO × 70%) + (Vidas × 30%, trava em 150%). O bônus trimestral é um valor manual adicional.
                  </p>
                </div>
              </div>

              <div className="card-premium overflow-hidden">
                {loadingColaboradores ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : cns.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Nenhum CN cadastrado.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[140px]">Consultor</TableHead>
                          <TableHead className="text-center">Nível</TableHead>
                          <TableHead className="text-center">Target</TableHead>
                          <TableHead className="text-center w-20">M SAO</TableHead>
                          <TableHead className="text-center w-20">R SAO</TableHead>
                          <TableHead className="text-center w-20">M Vidas</TableHead>
                          <TableHead className="text-center w-20">R Vidas</TableHead>
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
                          <TableHead className="text-center w-24">Bônus Tri</TableHead>
                          <TableHead className="text-right">TOTAL</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cns.map((cn) => {
                          const row: CNRow = cnRows[cn.id] || {
                            saoMeta: '', saoRealizado: '', vidasMeta: '', vidasRealizado: '',
                            comissao: 0, pctSAO: 0, pctVidas: 0, scoreFinal: 0, multiplicador: 0,
                            bonus: '0', total: 0
                          };
                          const nivel = (cn.nivel || 'CN1') as CNLevel;
                          const target = CN_TARGETS[nivel];

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
                                  onChange={(e) => updateCNRow(cn.id, 'saoMeta', e.target.value)}
                                  className="w-16 text-center"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  value={row.saoRealizado}
                                  onChange={(e) => updateCNRow(cn.id, 'saoRealizado', e.target.value)}
                                  className="w-16 text-center"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  value={row.vidasMeta}
                                  onChange={(e) => updateCNRow(cn.id, 'vidasMeta', e.target.value)}
                                  className="w-16 text-center"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  value={row.vidasRealizado}
                                  onChange={(e) => updateCNRow(cn.id, 'vidasRealizado', e.target.value)}
                                  className="w-16 text-center"
                                />
                              </TableCell>
                              <TableCell className="text-center font-medium">
                                {row.scoreFinal ? formatPercentage(row.scoreFinal) : '-'}
                              </TableCell>
                              <TableCell className="text-center">
                                {row.multiplicador ? formatPercentage(row.multiplicador) : '-'}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {row.comissao ? formatCurrency(row.comissao) : '-'}
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  value={row.bonus}
                                  onChange={(e) => updateCNRow(cn.id, 'bonus', e.target.value)}
                                  className="w-20"
                                  placeholder="R$ 0"
                                />
                              </TableCell>
                              <TableCell className="text-right font-bold text-success">
                                {row.total ? formatCurrency(row.total) : '-'}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* EVs Tab */}
            <TabsContent value="evs">
              <div className="card-premium p-4 mb-4 flex items-start gap-3 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900">
                <Info className="w-5 h-5 text-emerald-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-emerald-800 dark:text-emerald-300">Comissão Safra + Bônus EV</p>
                  <p className="text-emerald-700 dark:text-emerald-400">
                    Faça upload do Excel de comissões. Bônus = Salário Base × Multiplicador.
                  </p>
                </div>
              </div>

              {/* Excel Upload */}
              <div className="mb-6">
                <ExcelDropzone 
                  onDataLoaded={handleExcelData}
                  isProcessing={isProcessingExcel}
                />
              </div>

              {/* Dashboard com cards e filtros (visualização original) */}
              {hasProcessedExcel && evResults.length > 0 && (
                <div className="space-y-6 mb-6">
                  <ResultsDashboard 
                    results={evResults}
                    selectedMonth={selectedMonth}
                    selectedEV={selectedEV}
                    onMonthChange={setSelectedMonth}
                    onEVChange={setSelectedEV}
                  />
                  
                  <ResultsTable 
                    results={evResults}
                    selectedMonth={selectedMonth}
                    selectedEV={selectedEV}
                  />
                </div>
              )}

              {/* Card de Regras do Bônus Trimestral MRR */}
              <div className="card-premium p-4 mb-4 flex items-start gap-3 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
                <TrendingUp className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-300">Bônus Trimestral de MRR</p>
                  <p className="text-amber-700 dark:text-amber-400">
                    Multiplicador automático baseado no atingimento da meta: &lt;80% = 0x | 80-94.9% = 0.5x | 95-124.9% = 1x | ≥125% = 1.5x
                  </p>
                </div>
              </div>

              {/* Tabela de Totais por EV + Bônus */}
              <div className="card-premium overflow-hidden">
                <div className="p-4 border-b bg-muted/30">
                  <h3 className="font-semibold">Resumo por EV + Bônus MRR</h3>
                </div>
                {evs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Nenhum EV cadastrado.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Executivo</TableHead>
                          <TableHead className="text-right">Salário Base</TableHead>
                          <TableHead className="text-right">Comissão Safra</TableHead>
                          <TableHead className="text-right w-28">Meta MRR</TableHead>
                          <TableHead className="text-right w-28">MRR Realizado</TableHead>
                          <TableHead className="text-center w-36">% Atingimento</TableHead>
                          <TableHead className="text-center">Mult.</TableHead>
                          <TableHead className="text-right">Bônus MRR</TableHead>
                          <TableHead className="text-right">TOTAL</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {evs.map((ev) => {
                          const row = evRows[ev.id] || { 
                            comissaoSafra: 0, metaMRR: '', mrrRealizado: '', 
                            pctAtingimento: 0, multiplicador: 0, bonusEV: 0, total: 0 
                          };

                          return (
                            <TableRow key={ev.id}>
                              <TableCell className="font-medium">{ev.nome}</TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {formatCurrency(ev.salario_base)}
                              </TableCell>
                              <TableCell className="text-right font-medium text-success">
                                {formatCurrency(row.comissaoSafra)}
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  value={row.metaMRR}
                                  onChange={(e) => updateEVRow(ev.id, 'metaMRR', e.target.value)}
                                  className="w-24 text-right"
                                  placeholder="R$ 0"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  value={row.mrrRealizado}
                                  onChange={(e) => updateEVRow(ev.id, 'mrrRealizado', e.target.value)}
                                  className="w-24 text-right"
                                  placeholder="R$ 0"
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex flex-col items-center gap-1.5">
                                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                    <div 
                                      className={cn(
                                        "h-full transition-all duration-300",
                                        row.pctAtingimento >= 125 ? "bg-emerald-500" :
                                        row.pctAtingimento >= 95 ? "bg-green-500" :
                                        row.pctAtingimento >= 80 ? "bg-amber-500" :
                                        "bg-red-500"
                                      )}
                                      style={{ width: `${Math.min(row.pctAtingimento, 150) / 1.5}%` }}
                                    />
                                  </div>
                                  <span className={cn(
                                    "text-xs font-semibold",
                                    row.pctAtingimento >= 125 ? "text-emerald-600 dark:text-emerald-400" :
                                    row.pctAtingimento >= 95 ? "text-green-600 dark:text-green-400" :
                                    row.pctAtingimento >= 80 ? "text-amber-600 dark:text-amber-400" :
                                    row.pctAtingimento > 0 ? "text-red-600 dark:text-red-400" :
                                    "text-muted-foreground"
                                  )}>
                                    {row.pctAtingimento > 0 ? `${row.pctAtingimento.toFixed(1)}%` : '-'}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge 
                                  variant={
                                    row.multiplicador >= 1.5 ? "default" :
                                    row.multiplicador >= 1 ? "secondary" :
                                    row.multiplicador >= 0.5 ? "outline" :
                                    "destructive"
                                  }
                                  className={cn(
                                    row.multiplicador >= 1.5 && "bg-emerald-500 hover:bg-emerald-600",
                                    row.multiplicador === 1 && "bg-green-500/20 text-green-700 dark:text-green-300",
                                    row.multiplicador === 0.5 && "border-amber-500 text-amber-700 dark:text-amber-300"
                                  )}
                                >
                                  {row.multiplicador}x
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(row.bonusEV)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex flex-col items-end">
                                  <span className="font-bold text-success">
                                    {formatCurrency(row.total)}
                                  </span>
                                  {row.total > 0 && (
                                    <span className="text-xs text-muted-foreground">
                                      {formatCurrency(row.comissaoSafra)} + {formatCurrency(row.bonusEV)}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Liderança Tab */}
            <TabsContent value="lideranca">
              <div className="card-premium p-4 mb-4 flex items-start gap-3 bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900">
                <Info className="w-5 h-5 text-purple-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-purple-800 dark:text-purple-300">Bônus Liderança</p>
                  <p className="text-purple-700 dark:text-purple-400">
                    Valor manual. Regra de cálculo automático em definição.
                  </p>
                </div>
              </div>

              <div className="card-premium overflow-hidden">
                {lideres.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Nenhum líder cadastrado.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Líder</TableHead>
                        <TableHead className="text-right">Salário Base</TableHead>
                        <TableHead className="text-right w-40">Bônus Liderança</TableHead>
                        <TableHead className="text-right">TOTAL</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lideres.map((lider) => {
                        const row = liderRows[lider.id] || { bonus: '', total: 0 };

                        return (
                          <TableRow key={lider.id}>
                            <TableCell className="font-medium">{lider.nome}</TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {formatCurrency(lider.salario_base)}
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                value={row.bonus || ''}
                                onChange={(e) => updateLiderRow(lider.id, e.target.value)}
                                className="w-36"
                                placeholder="R$ 0"
                              />
                            </TableCell>
                            <TableCell className="text-right font-bold text-success">
                              {formatCurrency(row.total)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Resumo Final */}
          <div className="card-premium p-6 mt-6">
            <h3 className="text-lg font-semibold mb-4">Resumo do Fechamento - {trimestre}/{ano}</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20">
                <p className="text-sm text-muted-foreground">CNs ({cns.length})</p>
                <p className="text-xl font-bold">{formatCurrency(totalCNs)}</p>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20">
                <p className="text-sm text-muted-foreground">EVs ({evs.length})</p>
                <p className="text-xl font-bold">{formatCurrency(totalEVs)}</p>
              </div>
              <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/20">
                <p className="text-sm text-muted-foreground">Liderança ({lideres.length})</p>
                <p className="text-xl font-bold">{formatCurrency(totalLideranca)}</p>
              </div>
              <div className="p-4 rounded-xl bg-primary/5 border-2 border-primary/20">
                <p className="text-sm text-muted-foreground">TOTAL GERAL</p>
                <p className="text-xl font-bold text-success">{formatCurrency(totalGeral)}</p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button 
                onClick={handleSave} 
                disabled={isSaving || totalGeral === 0}
                size="lg"
                className="gap-2"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Salvar Fechamento Trimestral
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AdminRoute>
  );
}
