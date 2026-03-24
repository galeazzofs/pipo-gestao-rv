import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Navbar } from '@/components/Navbar';
import { AdminRoute } from '@/components/AdminRoute';
import { useColaboradores, Colaborador } from '@/hooks/useColaboradores';
import { useApuracoesFechadas, ApuracaoItemInput, ApuracaoFechadaItem } from '@/hooks/useApuracoesFechadas';
import { useContracts } from '@/hooks/useContracts';
import { calcularComissaoCN, CNLevel } from '@/lib/cnCalculations';
import { processCommissions, calculateTotals } from '@/components/ev/ProcessingEngine';
import { ExcelRow, formatCurrency as formatCurrencyEV, ProcessedResult, calcularMultiplicadorMRR } from '@/lib/evCalculations';
import { getMultiplicadorLideranca, calcularMetaMRRLider } from '@/lib/leadershipCalculations';
import { formatCurrency } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Accordion } from '@/components/ui/accordion';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { CalendarCheck, Save, Loader2, Users, Briefcase, Crown, FileCheck, Clock } from 'lucide-react';
import { toast } from 'sonner';

import { CNRow, EVRow, LiderRow, EMPTY_CN_ROW, EMPTY_EV_ROW, EMPTY_LIDER_ROW } from '@/components/hub/apuracao-trimestral/types';
import { CNSection } from '@/components/hub/apuracao-trimestral/CNSection';
import { EVSection } from '@/components/hub/apuracao-trimestral/EVSection';
import { LiderancaSection } from '@/components/hub/apuracao-trimestral/LiderancaSection';

const TRIMESTRES = [
  { value: 'Q1', label: 'Q1 (Jan-Mar)' },
  { value: 'Q2', label: 'Q2 (Abr-Jun)' },
  { value: 'Q3', label: 'Q3 (Jul-Set)' },
  { value: 'Q4', label: 'Q4 (Out-Dez)' },
];

const ANOS = Array.from({ length: new Date().getFullYear() - 2024 + 3 }, (_, i) => String(2024 + i));

const getQuarterMonths = (quarter: string): number[] => {
  switch (quarter) {
    case 'Q1': return [0, 1, 2];
    case 'Q2': return [3, 4, 5];
    case 'Q3': return [6, 7, 8];
    case 'Q4': return [9, 10, 11];
    default: return [];
  }
};

export default function ApuracaoTrimestral() {
  const [searchParams] = useSearchParams();
  const { getCNs, getEVs, getLideres, colaboradores, isLoading: loadingColaboradores } = useColaboradores();
  const { saveDraft, loadDraft, saveApuracao } = useApuracoesFechadas();
  const { contracts, isLoading: loadingContracts } = useContracts();

  const currentDate = new Date();
  const currentQuarter = Math.ceil((currentDate.getMonth() + 1) / 3);

  const queryQuarter = searchParams.get('q');
  const queryYear = searchParams.get('year');

  const [trimestre, setTrimestre] = useState(queryQuarter || `Q${currentQuarter}`);
  const [ano, setAno] = useState(queryYear || String(currentDate.getFullYear()));
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>(['cns', 'evs', 'lideranca']);
  const [hasInitializedMetas, setHasInitializedMetas] = useState(false);

  const cns = getCNs;
  const evs = getEVs;
  const lideres = getLideres;

  const [cnRows, setCnRows] = useState<Record<string, CNRow>>({});
  const [evRows, setEvRows] = useState<Record<string, EVRow>>({});
  const [liderRows, setLiderRows] = useState<Record<string, LiderRow>>({});
  const [isProcessingExcel, setIsProcessingExcel] = useState(false);

  const [evResults, setEvResults] = useState<ProcessedResult[]>([]);
  const [hasProcessedExcel, setHasProcessedExcel] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('__all__');
  const [excelDataOriginal, setExcelDataOriginal] = useState<ExcelRow[]>([]);
  const [selectedEV, setSelectedEV] = useState('__all__');

  const mesReferencia = `${trimestre}/${ano}`;

  // Helper: Get EVs subordinated to a leader
  const getEVsDoLider = useCallback((liderId: string): Colaborador[] => {
    return colaboradores.filter(c => c.cargo === 'EV' && c.lider_id === liderId && c.ativo);
  }, [colaboradores]);

  // Calculate Meta MRR for a leader based on their EVs
  const calcularMetaMRRParaLider = useCallback((liderId: string): { metaMRR: number; evIds: string[] } => {
    const evsDoTime = getEVsDoLider(liderId);
    const evIds = evsDoTime.map(ev => ev.id);
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
          const metaMRR = item.sao_meta?.toString() || '';
          const mrrRealizado = item.sao_realizado?.toString() || '';
          const meta = parseFloat(metaMRR) || 0;
          const realizado = parseFloat(mrrRealizado) || 0;
          const pctAtingimento = meta > 0 ? (realizado / meta) * 100 : 0;
          newEvRows[item.colaborador_id] = {
            comissaoSafra: item.comissao_safra || 0,
            metaMRR,
            mrrRealizado,
            pctAtingimento,
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
  }, [trimestre, ano, loadingColaboradores, loadExistingDraft]);

  // Pre-fill goals from colaboradores when no draft loaded
  useEffect(() => {
    if (loadingColaboradores || hasInitializedMetas || draftId) return;

    const initialCnRows: Record<string, CNRow> = {};
    cns.forEach(cn => {
      initialCnRows[cn.id] = {
        saoMeta: String(cn.meta_sao || ''),
        saoRealizado: '',
        vidasMeta: String(cn.meta_vidas || ''),
        vidasRealizado: '',
        comissao: 0, pctSAO: 0, pctVidas: 0, scoreFinal: 0, multiplicador: 0,
        bonus: '0', total: 0
      };
    });

    const initialEvRows: Record<string, EVRow> = {};
    evs.forEach(ev => {
      initialEvRows[ev.id] = {
        comissaoSafra: 0,
        metaMRR: String(ev.meta_mrr || ''),
        mrrRealizado: '',
        pctAtingimento: 0, multiplicador: 0, bonusEV: 0, total: 0
      };
    });

    if (Object.keys(initialCnRows).length > 0 || Object.keys(initialEvRows).length > 0) {
      setCnRows(initialCnRows);
      setEvRows(initialEvRows);
    }

    setHasInitializedMetas(true);
  }, [cns, evs, loadingColaboradores, hasInitializedMetas, draftId]);

  // Recalculate leader's Meta MRR whenever EV rows change
  useEffect(() => {
    if (lideres.length === 0) return;

    setLiderRows(prev => {
      const updated = { ...prev };
      lideres.forEach(lider => {
        const { metaMRR, evIds } = calcularMetaMRRParaLider(lider.id);
        const current = updated[lider.id] || EMPTY_LIDER_ROW;

        const evsChanged = current.evsDoTime.length !== evIds.length || current.evsDoTime.some((id, i) => id !== evIds[i]);
        if (current.metaMRRCalculada !== metaMRR || evsChanged) {
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
            pctMRR, pctSQL, multiplicador, bonus, total: bonus
          };
        }
      });
      return updated;
    });
  }, [evRows, lideres, calcularMetaMRRParaLider]);

  // Handlers for CNs
  const updateCNRow = (id: string, field: keyof CNRow, value: string) => {
    setCnRows(prev => {
      const current = prev[id] || EMPTY_CN_ROW;
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
      const current = prev[id] || EMPTY_EV_ROW;
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
      toast.warning(`Nenhuma parcela encontrada para ${quarterFilter}/${yearFilter}.`);
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
        return normalize(r.contract.nomeEV) === normalize(ev.nome);
      });

      const comissaoSafra = evResultsFiltered
        .filter(r => r.status === 'valido')
        .reduce((sum, r) => sum + (r.comissao || 0), 0);

      const current = newEvRows[ev.id] || EMPTY_EV_ROW;
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
  }, [trimestre, ano, excelDataOriginal, processExcelForQuarter]);

  // Handler for Leadership
  const updateLiderRow = (id: string, field: 'metaSQL' | 'realizadoMRR' | 'realizadoSQL', value: string) => {
    setLiderRows(prev => {
      const lider = lideres.find(l => l.id === id);
      const { metaMRR: metaMRRCalculada, evIds } = calcularMetaMRRParaLider(id);

      const current = prev[id] || { ...EMPTY_LIDER_ROW, metaMRRCalculada, evsDoTime: evIds };
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
          colaborador_id: cn.id, cargo: 'CN',
          sao_meta: parseFloat(row.saoMeta) || 0,
          sao_realizado: parseFloat(row.saoRealizado) || 0,
          vidas_meta: parseFloat(row.vidasMeta) || 0,
          vidas_realizado: parseFloat(row.vidasRealizado) || 0,
          pct_sao: row.pctSAO, pct_vidas: row.pctVidas,
          score_final: row.scoreFinal, multiplicador: row.multiplicador,
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
          colaborador_id: ev.id, cargo: 'EV',
          comissao_safra: row.comissaoSafra,
          sao_meta: parseFloat(row.metaMRR) || 0,
          sao_realizado: parseFloat(row.mrrRealizado) || 0,
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
          colaborador_id: lider.id, cargo: 'Lideranca',
          bonus_lideranca: row.bonus,
          meta_mrr_lider: row.metaMRRCalculada,
          meta_sql_lider: parseFloat(row.metaSQL) || 0,
          realizado_mrr_lider: parseFloat(row.realizadoMRR) || 0,
          realizado_sql_lider: parseFloat(row.realizadoSQL) || 0,
          pct_mrr_lider: row.pctMRR, pct_sql_lider: row.pctSQL,
          multiplicador_lider: row.multiplicador,
          total_pagar: row.total,
        });
      }
    });

    return itens;
  };

  const validateBeforeFinalize = (): string[] => {
    const errors: string[] = [];
    const hasEVsWithComissao = Object.values(evRows).some(r => r.comissaoSafra > 0);
    if (evs.length > 0 && !hasProcessedExcel && !hasEVsWithComissao) {
      errors.push('Processe o Excel de comissões dos EVs antes de finalizar');
    }
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

    const contractPayments = evResults
      .filter(result => result.status === 'valido' && result.contract)
      .map(result => {
        const d = result.excelRow.dataRecebimento;
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return {
          contract_id: result.contract!.id,
          data_parcela: `${yyyy}-${mm}-${dd}`,
          valor_pago: result.comissao || 0
        };
      });

    const result = await saveApuracao('trimestral', mesReferencia, itens, contractPayments);
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
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRIMESTRES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={ano} onValueChange={setAno}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
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
              <CNSection
                cns={cns}
                cnRows={cnRows}
                updateCNRow={updateCNRow}
                totalCNs={totalCNs}
                loadingColaboradores={loadingColaboradores}
              />

              <EVSection
                evs={evs}
                evRows={evRows}
                updateEVRow={updateEVRow}
                totalEVs={totalEVs}
                hasProcessedExcel={hasProcessedExcel}
                evResults={evResults}
                selectedMonth={selectedMonth}
                selectedEV={selectedEV}
                onMonthChange={setSelectedMonth}
                onEVChange={setSelectedEV}
                onExcelData={handleExcelData}
                isProcessingExcel={isProcessingExcel}
              />

              <LiderancaSection
                lideres={lideres}
                liderRows={liderRows}
                updateLiderRow={updateLiderRow}
                totalLideranca={totalLideranca}
                calcularMetaMRRParaLider={calcularMetaMRRParaLider}
                getEVsDoLider={getEVsDoLider}
              />
            </Accordion>
          )}
        </div>

        {/* Fixed Footer Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t shadow-lg z-50">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
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

              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={handleSaveDraft} disabled={isSavingDraft || !hasAnyData} className="gap-2">
                  {isSavingDraft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar Rascunho
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button disabled={isSaving || totalGeral === 0} className="gap-2">
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
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
