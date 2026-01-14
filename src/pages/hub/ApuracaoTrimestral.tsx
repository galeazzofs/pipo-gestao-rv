import { useState, useMemo, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Navbar } from '@/components/Navbar';
import { AdminRoute } from '@/components/AdminRoute';
import { useColaboradores, Colaborador } from '@/hooks/useColaboradores';
import { useApuracoesFechadas, ApuracaoItemInput, ApuracaoFechadaItem } from '@/hooks/useApuracoesFechadas';
import { useContracts } from '@/hooks/useContracts';
import { calcularComissaoCN, CNLevel, CN_TARGETS } from '@/lib/cnCalculations';
import { processCommissions, groupByEV, calculateTotals } from '@/components/ev/ProcessingEngine';
import { ExcelRow, formatCurrency as formatCurrencyEV, ProcessedResult } from '@/lib/evCalculations';
import { ResultsDashboard } from '@/components/ev/ResultsDashboard';
import { ResultsTable } from '@/components/ev/ResultsTable';
import { getMultiplicadorLideranca, calcularMetaMRRLider, getMRRFaixa, getSQLFaixa, getMultiplicadorColor, MATRIZ_LIDERANCA } from '@/lib/leadershipCalculations';
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
  CalendarCheck, 
  Save,
  Loader2,
  Users,
  Briefcase,
  Crown,
  Info,
  TrendingUp,
  FileCheck,
  Clock,
  AlertTriangle,
  HelpCircle,
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

// Function to calculate multiplier based on MRR achievement %
const calcularMultiplicadorMRR = (pctAtingimento: number): number => {
  if (pctAtingimento < 80) return 0;
  if (pctAtingimento < 95) return 0.5;
  if (pctAtingimento < 125) return 1.0;
  return 1.5;
};

// Returns the months of the selected quarter (0-indexed: Jan=0, Dec=11)
const getQuarterMonths = (quarter: string): number[] => {
  switch (quarter) {
    case 'Q1': return [0, 1, 2];
    case 'Q2': return [3, 4, 5];
    case 'Q3': return [6, 7, 8];
    case 'Q4': return [9, 10, 11];
    default: return [];
  }
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
  // Automático (calculado baseado nos EVs do time)
  metaMRRCalculada: number;
  evsDoTime: string[];
  
  // Inputs manuais
  metaSQL: string;
  realizadoMRR: string;
  realizadoSQL: string;
  
  // Calculados
  pctMRR: number;
  pctSQL: number;
  multiplicador: number;
  bonus: number;
  total: number;
}

export default function ApuracaoTrimestral() {
  const { getCNs, getEVs, getLideres, colaboradores, isLoading: loadingColaboradores } = useColaboradores();
  const { saveDraft, loadDraft, saveApuracao, finalizarApuracao } = useApuracoesFechadas();
  const { contracts, isLoading: loadingContracts } = useContracts();
  
  const currentDate = new Date();
  const currentQuarter = Math.ceil((currentDate.getMonth() + 1) / 3);
  const [trimestre, setTrimestre] = useState(`Q${currentQuarter}`);
  const [ano, setAno] = useState(String(currentDate.getFullYear()));
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>(['cns', 'evs', 'lideranca']);
  
  const cns = getCNs();
  const evs = getEVs();
  const lideres = getLideres();

  // States by category
  const [cnRows, setCnRows] = useState<Record<string, CNRow>>({});
  const [evRows, setEvRows] = useState<Record<string, EVRow>>({});
  const [liderRows, setLiderRows] = useState<Record<string, LiderRow>>({});
  const [isProcessingExcel, setIsProcessingExcel] = useState(false);
  
  // States for detailed EV visualization
  const [evResults, setEvResults] = useState<ProcessedResult[]>([]);
  const [hasProcessedExcel, setHasProcessedExcel] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('__all__');
  const [excelDataOriginal, setExcelDataOriginal] = useState<ExcelRow[]>([]);
  const [selectedEV, setSelectedEV] = useState('__all__');

  const mesReferencia = `${trimestre}/${ano}`;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  // Helper: Get EVs subordinated to a leader
  const getEVsDoLider = useCallback((liderId: string): Colaborador[] => {
    return colaboradores.filter(c => c.cargo === 'EV' && c.lider_id === liderId && c.ativo);
  }, [colaboradores]);

  // Calculate Meta MRR for a leader based on their EVs
  const calcularMetaMRRParaLider = useCallback((liderId: string): { metaMRR: number; evIds: string[] } => {
    const evsDoTime = getEVsDoLider(liderId);
    const evIds = evsDoTime.map(ev => ev.id);
    
    // Get the MRR goals from evRows
    const metasMRR = evsDoTime.map(ev => {
      const evRow = evRows[ev.id];
      return parseFloat(evRow?.metaMRR || '0') || 0;
    });
    
    const metaMRR = calcularMetaMRRLider(metasMRR);
    return { metaMRR, evIds };
  }, [getEVsDoLider, evRows]);

  // Load draft when quarter/year changes
  const loadExistingDraft = useCallback(async () => {
    setIsLoadingDraft(true);
    const draft = await loadDraft('trimestral', mesReferencia);
    
    if (draft) {
      setDraftId(draft.apuracao.id);
      setLastSaved(draft.apuracao.updated_at ? new Date(draft.apuracao.updated_at) : null);
      
      // Populate CN rows
      const newCnRows: Record<string, CNRow> = {};
      const newEvRows: Record<string, EVRow> = {};
      const newLiderRows: Record<string, LiderRow> = {};
      
      draft.itens.forEach((item: ApuracaoFechadaItem) => {
        if (item.colaborador?.cargo === 'CN') {
          newCnRows[item.colaborador_id] = {
            saoMeta: item.sao_meta?.toString() || '',
            saoRealizado: item.sao_realizado?.toString() || '',
            vidasMeta: item.vidas_meta?.toString() || '',
            vidasRealizado: item.vidas_realizado?.toString() || '',
            comissao: item.comissao_base || 0,
            pctSAO: item.pct_sao || 0,
            pctVidas: item.pct_vidas || 0,
            scoreFinal: item.score_final || 0,
            multiplicador: item.multiplicador || 0,
            bonus: item.bonus_trimestral?.toString() || '0',
            total: item.total_pagar,
          };
        } else if (item.colaborador?.cargo === 'EV') {
          newEvRows[item.colaborador_id] = {
            comissaoSafra: item.comissao_safra || 0,
            metaMRR: '',
            mrrRealizado: '',
            pctAtingimento: 0,
            multiplicador: item.multiplicador_meta || 1,
            bonusEV: item.bonus_ev || 0,
            total: item.total_pagar,
          };
        } else if (item.colaborador?.cargo === 'Lideranca') {
          newLiderRows[item.colaborador_id] = {
            metaMRRCalculada: item.meta_mrr_lider || 0,
            evsDoTime: [],
            metaSQL: item.meta_sql_lider?.toString() || '',
            realizadoMRR: item.realizado_mrr_lider?.toString() || '',
            realizadoSQL: item.realizado_sql_lider?.toString() || '',
            pctMRR: item.pct_mrr_lider || 0,
            pctSQL: item.pct_sql_lider || 0,
            multiplicador: item.multiplicador_lider || 0,
            bonus: item.bonus_lideranca || 0,
            total: item.total_pagar,
          };
        }
      });
      
      setCnRows(newCnRows);
      setEvRows(newEvRows);
      setLiderRows(newLiderRows);
      
      toast.info('Rascunho carregado');
    } else {
      // Reset state when no draft
      setDraftId(null);
      setLastSaved(null);
      setCnRows({});
      setEvRows({});
      setLiderRows({});
      setEvResults([]);
      setHasProcessedExcel(false);
    }
    
    setIsLoadingDraft(false);
  }, [loadDraft, mesReferencia]);

  useEffect(() => {
    if (!loadingColaboradores) {
      loadExistingDraft();
    }
  }, [trimestre, ano, loadingColaboradores]);

  // Recalculate leader's Meta MRR whenever EV rows change
  useEffect(() => {
    if (lideres.length === 0) return;
    
    setLiderRows(prev => {
      const updated = { ...prev };
      lideres.forEach(lider => {
        const { metaMRR, evIds } = calcularMetaMRRParaLider(lider.id);
        const current = updated[lider.id] || {
          metaMRRCalculada: 0,
          evsDoTime: [],
          metaSQL: '',
          realizadoMRR: '',
          realizadoSQL: '',
          pctMRR: 0,
          pctSQL: 0,
          multiplicador: 0,
          bonus: 0,
          total: 0
        };
        
        // Only update if Meta MRR changed
        if (current.metaMRRCalculada !== metaMRR || JSON.stringify(current.evsDoTime) !== JSON.stringify(evIds)) {
          const realizadoMRR = parseFloat(current.realizadoMRR) || 0;
          const metaSQL = parseFloat(current.metaSQL) || 0;
          const realizadoSQL = parseFloat(current.realizadoSQL) || 0;
          
          const pctMRR = metaMRR > 0 ? (realizadoMRR / metaMRR) * 100 : 0;
          const pctSQL = metaSQL > 0 ? (realizadoSQL / metaSQL) * 100 : 0;
          const multiplicador = getMultiplicadorLideranca(pctMRR, pctSQL);
          const bonus = (lider.salario_base || 0) * multiplicador;
          
          updated[lider.id] = {
            ...current,
            metaMRRCalculada: metaMRR,
            evsDoTime: evIds,
            pctMRR,
            pctSQL,
            multiplicador,
            bonus,
            total: bonus
          };
        }
      });
      return updated;
    });
  }, [evRows, lideres, calcularMetaMRRParaLider]);

  // Handlers for CNs
  const updateCNRow = (id: string, field: keyof CNRow, value: string) => {
    setCnRows(prev => {
      const current = prev[id] || {
        saoMeta: '', saoRealizado: '', vidasMeta: '', vidasRealizado: '',
        comissao: 0, pctSAO: 0, pctVidas: 0, scoreFinal: 0, multiplicador: 0,
        bonus: '0', total: 0
      };
      const updated = { ...current, [field]: value };

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

  // Handlers for EVs
  const updateEVRow = (id: string, field: keyof EVRow, value: string | number) => {
    setEvRows(prev => {
      const ev = evs.find(e => e.id === id);
      const current = prev[id] || {
        comissaoSafra: 0, metaMRR: '', mrrRealizado: '', 
        pctAtingimento: 0, multiplicador: 0, bonusEV: 0, total: 0
      };
      const updated = { ...current, [field]: value };

      const meta = parseFloat(updated.metaMRR) || 0;
      const realizado = parseFloat(updated.mrrRealizado) || 0;
      updated.pctAtingimento = meta > 0 ? (realizado / meta) * 100 : 0;
      updated.multiplicador = calcularMultiplicadorMRR(updated.pctAtingimento);
      updated.bonusEV = (ev?.salario_base || 0) * updated.multiplicador;
      updated.total = updated.comissaoSafra + updated.bonusEV;

      return { ...prev, [id]: updated };
    });
  };

  // Process Excel data for the selected quarter
  const processExcelForQuarter = useCallback((data: ExcelRow[], quarterFilter: string, yearFilter: string) => {
    if (contracts.length === 0) {
      toast.error('Nenhum contrato cadastrado. Cadastre contratos antes de processar.');
      return;
    }

    const quarterMonths = getQuarterMonths(quarterFilter);
    const yearNum = parseInt(yearFilter);
    
    const filteredData = data.filter(row => {
      const month = row.dataRecebimento.getMonth();
      const year = row.dataRecebimento.getFullYear();
      return year === yearNum && quarterMonths.includes(month);
    });

    if (filteredData.length === 0) {
      toast.warning(
        `Nenhuma parcela encontrada para ${quarterFilter}/${yearFilter}.`
      );
      setEvResults([]);
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

    const results = processCommissions({ excelData: filteredData, contracts });
    
    setEvResults(results);
    setHasProcessedExcel(true);
    
    const totals = calculateTotals(results);
    
    const normalize = (str: string) => 
      str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

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
    });
    
    setEvRows(newEvRows);
    
    const messages = [
      `📅 ${quarterFilter}/${yearFilter}: ${filteredData.length} parcelas`,
      `✅ ${totals.countValidos} válidos (${formatCurrencyEV(totals.totalComissaoValida)})`,
      totals.countExpirados > 0 ? `⚠️ ${totals.countExpirados} expirados` : null,
      totals.countNaoEncontrados > 0 ? `❌ ${totals.countNaoEncontrados} sem contrato` : null,
    ].filter(Boolean);

    toast.success(messages.join('\n'));
  }, [contracts, evs, evRows]);

  const handleExcelData = useCallback((data: ExcelRow[]) => {
    setIsProcessingExcel(true);
    
    try {
      setExcelDataOriginal(data);
      processExcelForQuarter(data, trimestre, ano);
    } catch (error) {
      console.error('Erro no processamento:', error);
      toast.error('Erro ao processar o Excel');
    } finally {
      setIsProcessingExcel(false);
    }
  }, [processExcelForQuarter, trimestre, ano]);

  useEffect(() => {
    if (excelDataOriginal.length > 0) {
      processExcelForQuarter(excelDataOriginal, trimestre, ano);
    }
  }, [trimestre, ano]);

  // Handler for Leadership
  const updateLiderRow = (id: string, field: 'metaSQL' | 'realizadoMRR' | 'realizadoSQL', value: string) => {
    setLiderRows(prev => {
      const lider = lideres.find(l => l.id === id);
      const { metaMRR: metaMRRCalculada, evIds } = calcularMetaMRRParaLider(id);
      
      const current = prev[id] || {
        metaMRRCalculada,
        evsDoTime: evIds,
        metaSQL: '',
        realizadoMRR: '',
        realizadoSQL: '',
        pctMRR: 0,
        pctSQL: 0,
        multiplicador: 0,
        bonus: 0,
        total: 0
      };
      
      const updated = { ...current, [field]: value, metaMRRCalculada, evsDoTime: evIds };
      
      const realizadoMRR = parseFloat(updated.realizadoMRR) || 0;
      const metaSQL = parseFloat(updated.metaSQL) || 0;
      const realizadoSQL = parseFloat(updated.realizadoSQL) || 0;
      
      updated.pctMRR = metaMRRCalculada > 0 ? (realizadoMRR / metaMRRCalculada) * 100 : 0;
      updated.pctSQL = metaSQL > 0 ? (realizadoSQL / metaSQL) * 100 : 0;
      updated.multiplicador = getMultiplicadorLideranca(updated.pctMRR, updated.pctSQL);
      updated.bonus = (lider?.salario_base || 0) * updated.multiplicador;
      updated.total = updated.bonus;
      
      return { ...prev, [id]: updated };
    });
  };

  // Totals
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

  // Build items array for saving
  const buildItensArray = (): ApuracaoItemInput[] => {
    const itens: ApuracaoItemInput[] = [];

    cns.forEach(cn => {
      const row = cnRows[cn.id];
      if (row && (row.total > 0 || row.saoMeta || row.saoRealizado)) {
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

    evs.forEach(ev => {
      const row = evRows[ev.id];
      if (row && (row.total > 0 || row.comissaoSafra > 0)) {
        itens.push({
          colaborador_id: ev.id,
          comissao_safra: row.comissaoSafra,
          multiplicador_meta: row.multiplicador,
          bonus_ev: row.bonusEV,
          total_pagar: row.total,
        });
      }
    });

    lideres.forEach(lider => {
      const row = liderRows[lider.id];
      if (row && (row.total > 0 || row.metaSQL || row.realizadoMRR || row.realizadoSQL)) {
        itens.push({
          colaborador_id: lider.id,
          bonus_lideranca: row.bonus,
          meta_mrr_lider: row.metaMRRCalculada,
          meta_sql_lider: parseFloat(row.metaSQL) || 0,
          realizado_mrr_lider: parseFloat(row.realizadoMRR) || 0,
          realizado_sql_lider: parseFloat(row.realizadoSQL) || 0,
          pct_mrr_lider: row.pctMRR,
          pct_sql_lider: row.pctSQL,
          multiplicador_lider: row.multiplicador,
          total_pagar: row.total,
        });
      }
    });

    return itens;
  };

  // Validation before finalization
  const validateBeforeFinalize = (): string[] => {
    const errors: string[] = [];

    // Check if EV Excel was processed (only if there are EVs with commissions)
    const hasEVsWithComissao = Object.values(evRows).some(r => r.comissaoSafra > 0);
    if (evs.length > 0 && !hasProcessedExcel && !hasEVsWithComissao) {
      errors.push('Processe o Excel de comissões dos EVs antes de finalizar');
    }

    // Validate leadership: all fields must be filled if there's any data
    lideres.forEach(lider => {
      const row = liderRows[lider.id];
      if (row && row.metaMRRCalculada > 0) {
        if (!row.metaSQL || !row.realizadoMRR || !row.realizadoSQL) {
          errors.push(`Preencha todos os campos de ${lider.nome}`);
        }
      }
    });

    if (totalGeral === 0) {
      errors.push('Preencha pelo menos uma seção antes de finalizar');
    }

    return errors;
  };

  const handleSaveDraft = async () => {
    const itens = buildItensArray();
    if (itens.length === 0) {
      toast.error('Nenhum dado para salvar');
      return;
    }

    setIsSavingDraft(true);
    const result = await saveDraft('trimestral', mesReferencia, itens);
    if (result) {
      setDraftId(result);
      setLastSaved(new Date());
    }
    setIsSavingDraft(false);
  };

  const handleFinalize = async () => {
    const errors = validateBeforeFinalize();
    if (errors.length > 0) {
      errors.forEach(err => toast.error(err));
      return;
    }

    setIsSaving(true);
    const itens = buildItensArray();
    const result = await saveApuracao('trimestral', mesReferencia, itens);
    setIsSaving(false);

    if (result) {
      setCnRows({});
      setEvRows({});
      setLiderRows({});
      setEvResults([]);
      setHasProcessedExcel(false);
      setDraftId(null);
      setLastSaved(null);
    }
  };

  const hasAnyData = Object.keys(cnRows).length > 0 || Object.keys(evRows).length > 0 || Object.keys(liderRows).length > 0;

  return (
    <AdminRoute>
      <div className="min-h-screen bg-background pb-32">
        <Navbar />
        
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
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

          {isLoadingDraft ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Carregando rascunho...</span>
            </div>
          ) : (
            <Accordion 
              type="multiple" 
              value={expandedSections} 
              onValueChange={setExpandedSections}
              className="space-y-4"
            >
              {/* Section 1: CNs */}
              <AccordionItem value="cns" className="border rounded-lg bg-card">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30">
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-semibold">Seção 1: CNs (Mês 3 + Bônus)</h3>
                      <p className="text-sm text-muted-foreground">
                        {cns.length} consultores • Subtotal: {formatCurrency(totalCNs)}
                      </p>
                    </div>
                    {totalCNs > 0 && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        {formatCurrency(totalCNs)}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="p-4 mb-4 flex items-start gap-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-800 dark:text-blue-300">Regra de Cálculo (Regra de Ouro)</p>
                      <p className="text-blue-700 dark:text-blue-400">
                        Score = (SAO × 70%) + (Vidas × 30%, trava em 150%). O bônus trimestral é um valor manual adicional.
                      </p>
                    </div>
                  </div>

                  {loadingColaboradores ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : cns.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum CN cadastrado.
                    </div>
                  ) : (
                    <div className="overflow-x-auto border rounded-lg">
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
                                <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400">
                                  {row.total ? formatCurrency(row.total) : '-'}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* Section 2: EVs */}
              <AccordionItem value="evs" className="border rounded-lg bg-card">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30">
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <Briefcase className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-semibold">Seção 2: EVs (Comissão Safra + Bônus MRR)</h3>
                      <p className="text-sm text-muted-foreground">
                        {evs.length} executivos • Subtotal: {formatCurrency(totalEVs)}
                        {hasProcessedExcel && <span className="ml-2 text-emerald-600">✓ Excel processado</span>}
                      </p>
                    </div>
                    {totalEVs > 0 && (
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                        {formatCurrency(totalEVs)}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="p-4 mb-4 flex items-start gap-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-lg">
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

                  {/* Dashboard with cards and filters */}
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

                  {/* MRR Bonus Rules Card */}
                  <div className="p-4 mb-4 flex items-start gap-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-800 dark:text-amber-300">Bônus Trimestral de MRR</p>
                      <p className="text-amber-700 dark:text-amber-400">
                        Multiplicador automático: &lt;80% = 0x | 80-94.9% = 0.5x | 95-124.9% = 1x | ≥125% = 1.5x
                      </p>
                    </div>
                  </div>

                  {/* EV Summary Table + Bonus */}
                  {evs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum EV cadastrado.
                    </div>
                  ) : (
                    <div className="overflow-x-auto border rounded-lg">
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
                                <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-400">
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
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
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
                </AccordionContent>
              </AccordionItem>

              {/* Section 3: Leadership */}
              <AccordionItem value="lideranca" className="border rounded-lg bg-card">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30">
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <Crown className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-semibold">Seção 3: Liderança (Matriz Mista MRR × SQL)</h3>
                      <p className="text-sm text-muted-foreground">
                        {lideres.length} líderes • Subtotal: {formatCurrency(totalLideranca)}
                      </p>
                    </div>
                    {totalLideranca > 0 && (
                      <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                        {formatCurrency(totalLideranca)}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  {/* Leadership Matrix Explanation */}
                  <div className="p-4 mb-4 flex items-start gap-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-lg">
                    <Info className="w-5 h-5 text-purple-600 mt-0.5 shrink-0" />
                    <div className="text-sm space-y-2">
                      <p className="font-medium text-purple-800 dark:text-purple-300">Matriz de Bônus de Liderança</p>
                      <div className="text-purple-700 dark:text-purple-400 space-y-1">
                        <p><strong>Meta MRR (Automática):</strong> 90% da soma das metas MRR dos EVs do time</p>
                        <p><strong>Meta SQL (Manual):</strong> Digitada pelo admin</p>
                        <p><strong>Bônus:</strong> Salário Base × Multiplicador (cruzando % MRR × % SQL na matriz)</p>
                      </div>
                    </div>
                  </div>

                  {/* Matrix Reference Table */}
                  <div className="mb-6 overflow-x-auto">
                    <div className="text-sm font-medium mb-2 flex items-center gap-2 text-muted-foreground">
                      <HelpCircle className="w-4 h-4" />
                      Tabela de Multiplicadores
                    </div>
                    <div className="border rounded-lg overflow-hidden text-xs">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="text-center font-bold">MRR ↓ / SQL →</TableHead>
                            <TableHead className="text-center">&lt; 80%</TableHead>
                            <TableHead className="text-center">80% - 94.9%</TableHead>
                            <TableHead className="text-center">95% - 109.9%</TableHead>
                            <TableHead className="text-center">≥ 110%</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium bg-muted/30">&lt; 60%</TableCell>
                            <TableCell className="text-center text-destructive font-bold">0x</TableCell>
                            <TableCell className="text-center text-destructive font-bold">0x</TableCell>
                            <TableCell className="text-center text-destructive font-bold">0x</TableCell>
                            <TableCell className="text-center text-destructive font-bold">0x</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium bg-muted/30">60% - 79.9%</TableCell>
                            <TableCell className="text-center">0.5x</TableCell>
                            <TableCell className="text-center">0.75x</TableCell>
                            <TableCell className="text-center">1.0x</TableCell>
                            <TableCell className="text-center">1.25x</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium bg-muted/30">80% - 94.9%</TableCell>
                            <TableCell className="text-center">1.0x</TableCell>
                            <TableCell className="text-center">1.5x</TableCell>
                            <TableCell className="text-center">2.0x</TableCell>
                            <TableCell className="text-center">2.25x</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium bg-muted/30">95% - 109.9%</TableCell>
                            <TableCell className="text-center">1.5x</TableCell>
                            <TableCell className="text-center">2.0x</TableCell>
                            <TableCell className="text-center text-green-600 dark:text-green-400 font-bold">3.0x</TableCell>
                            <TableCell className="text-center text-green-600 dark:text-green-400 font-bold">3.25x</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium bg-muted/30">≥ 110%</TableCell>
                            <TableCell className="text-center">2.0x</TableCell>
                            <TableCell className="text-center">2.75x</TableCell>
                            <TableCell className="text-center text-emerald-600 dark:text-emerald-400 font-bold">3.5x</TableCell>
                            <TableCell className="text-center text-emerald-600 dark:text-emerald-400 font-bold">4.0x</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {lideres.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum líder cadastrado.
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Líder</TableHead>
                            <TableHead className="text-right">Salário Base</TableHead>
                            <TableHead className="text-right">
                              <Tooltip>
                                <TooltipTrigger className="flex items-center gap-1 justify-end w-full">
                                  Meta MRR
                                  <Info className="w-3 h-3" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>90% da soma das metas MRR dos EVs do time</p>
                                </TooltipContent>
                              </Tooltip>
                            </TableHead>
                            <TableHead className="text-right w-28">Meta SQL</TableHead>
                            <TableHead className="text-right w-28">Real MRR</TableHead>
                            <TableHead className="text-right w-28">Real SQL</TableHead>
                            <TableHead className="text-center">% MRR</TableHead>
                            <TableHead className="text-center">% SQL</TableHead>
                            <TableHead className="text-center">Mult.</TableHead>
                            <TableHead className="text-right">BÔNUS</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lideres.map((lider) => {
                            const { metaMRR: metaMRRCalculada, evIds } = calcularMetaMRRParaLider(lider.id);
                            const evsDoTime = getEVsDoLider(lider.id);
                            const row = liderRows[lider.id] || {
                              metaMRRCalculada,
                              evsDoTime: evIds,
                              metaSQL: '',
                              realizadoMRR: '',
                              realizadoSQL: '',
                              pctMRR: 0,
                              pctSQL: 0,
                              multiplicador: 0,
                              bonus: 0,
                              total: 0
                            };
                            
                            const hasNoEvs = evsDoTime.length === 0;

                            return (
                              <TableRow key={lider.id} className={hasNoEvs ? 'opacity-60' : ''}>
                                <TableCell className="font-medium">
                                  <div className="flex flex-col">
                                    <span>{lider.nome}</span>
                                    {evsDoTime.length > 0 ? (
                                      <span className="text-xs text-muted-foreground">
                                        {evsDoTime.length} EV{evsDoTime.length > 1 ? 's' : ''}: {evsDoTime.map(e => e.nome.split(' ')[0]).join(', ')}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" />
                                        Sem EVs vinculados
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                  {formatCurrency(lider.salario_base)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex flex-col items-end">
                                    <span className="font-medium">{formatCurrency(metaMRRCalculada)}</span>
                                    {evsDoTime.length > 0 && (
                                      <span className="text-xs text-muted-foreground">
                                        90% de {formatCurrency(metaMRRCalculada / 0.9)}
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={row.metaSQL}
                                    onChange={(e) => updateLiderRow(lider.id, 'metaSQL', e.target.value)}
                                    className="w-24 text-right"
                                    placeholder="0"
                                    disabled={hasNoEvs}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={row.realizadoMRR}
                                    onChange={(e) => updateLiderRow(lider.id, 'realizadoMRR', e.target.value)}
                                    className="w-24 text-right"
                                    placeholder="R$ 0"
                                    disabled={hasNoEvs}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={row.realizadoSQL}
                                    onChange={(e) => updateLiderRow(lider.id, 'realizadoSQL', e.target.value)}
                                    className="w-24 text-right"
                                    placeholder="0"
                                    disabled={hasNoEvs}
                                  />
                                </TableCell>
                                <TableCell className="text-center">
                                  <span className={cn(
                                    "text-sm font-semibold",
                                    row.pctMRR >= 110 ? "text-emerald-600 dark:text-emerald-400" :
                                    row.pctMRR >= 95 ? "text-green-600 dark:text-green-400" :
                                    row.pctMRR >= 80 ? "text-amber-600 dark:text-amber-400" :
                                    row.pctMRR >= 60 ? "text-orange-600 dark:text-orange-400" :
                                    row.pctMRR > 0 ? "text-red-600 dark:text-red-400" :
                                    "text-muted-foreground"
                                  )}>
                                    {row.pctMRR > 0 ? `${row.pctMRR.toFixed(1)}%` : '-'}
                                  </span>
                                </TableCell>
                                <TableCell className="text-center">
                                  <span className={cn(
                                    "text-sm font-semibold",
                                    row.pctSQL >= 110 ? "text-emerald-600 dark:text-emerald-400" :
                                    row.pctSQL >= 95 ? "text-green-600 dark:text-green-400" :
                                    row.pctSQL >= 80 ? "text-amber-600 dark:text-amber-400" :
                                    row.pctSQL > 0 ? "text-red-600 dark:text-red-400" :
                                    "text-muted-foreground"
                                  )}>
                                    {row.pctSQL > 0 ? `${row.pctSQL.toFixed(1)}%` : '-'}
                                  </span>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge 
                                    variant={
                                      row.multiplicador >= 3 ? "default" :
                                      row.multiplicador >= 2 ? "secondary" :
                                      row.multiplicador >= 1 ? "outline" :
                                      row.multiplicador > 0 ? "outline" :
                                      "destructive"
                                    }
                                    className={cn(
                                      row.multiplicador >= 3.5 && "bg-emerald-500 hover:bg-emerald-600",
                                      row.multiplicador >= 3 && row.multiplicador < 3.5 && "bg-green-500 hover:bg-green-600",
                                      row.multiplicador >= 2 && row.multiplicador < 3 && "bg-green-500/20 text-green-700 dark:text-green-300",
                                      row.multiplicador >= 1 && row.multiplicador < 2 && "border-amber-500 text-amber-700 dark:text-amber-300",
                                      row.multiplicador > 0 && row.multiplicador < 1 && "border-orange-500 text-orange-700 dark:text-orange-300"
                                    )}
                                  >
                                    {row.multiplicador}x
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right font-bold text-purple-600 dark:text-purple-400">
                                  {formatCurrency(row.bonus)}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </div>

        {/* Fixed Footer Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t shadow-lg z-50">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Real-time Totals */}
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="text-muted-foreground">CNs:</span>
                  <span className="font-semibold">{formatCurrency(totalCNs)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-emerald-600" />
                  <span className="text-muted-foreground">EVs:</span>
                  <span className="font-semibold">{formatCurrency(totalEVs)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-purple-600" />
                  <span className="text-muted-foreground">Liderança:</span>
                  <span className="font-semibold">{formatCurrency(totalLideranca)}</span>
                </div>
                <div className="h-6 w-px bg-border" />
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-medium">TOTAL:</span>
                  <span className="text-lg font-bold text-primary">{formatCurrency(totalGeral)}</span>
                </div>
              </div>

              {/* Action Buttons */}
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

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      disabled={isSaving || totalGeral === 0}
                      className="gap-2"
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <FileCheck className="w-4 h-4" />
                      )}
                      Finalizar Fechamento
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Finalizar Apuração Trimestral?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação irá fechar a apuração de {mesReferencia} com os seguintes totais:
                        <div className="mt-4 space-y-2 p-4 bg-muted rounded-lg">
                          <div className="flex justify-between">
                            <span>CNs:</span>
                            <span className="font-medium">{formatCurrency(totalCNs)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>EVs:</span>
                            <span className="font-medium">{formatCurrency(totalEVs)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Liderança:</span>
                            <span className="font-medium">{formatCurrency(totalLideranca)}</span>
                          </div>
                          <div className="flex justify-between border-t pt-2 font-bold">
                            <span>TOTAL:</span>
                            <span className="text-primary">{formatCurrency(totalGeral)}</span>
                          </div>
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleFinalize}>
                        Confirmar Fechamento
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminRoute>
  );
}
