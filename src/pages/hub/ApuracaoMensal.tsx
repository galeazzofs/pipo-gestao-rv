import { useState, useMemo } from 'react';
import { Navbar } from '@/components/Navbar';
import { AdminRoute } from '@/components/AdminRoute';
import { useColaboradores } from '@/hooks/useColaboradores';
import { useApuracoesFechadas, ApuracaoItemInput } from '@/hooks/useApuracoesFechadas';
import { calcularComissaoCN, CNLevel, CN_TARGETS } from '@/lib/cnCalculations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  const { saveApuracao, isLoading: loadingApuracoes } = useApuracoesFechadas();
  
  const currentDate = new Date();
  const [mes, setMes] = useState(MESES[currentDate.getMonth()]);
  const [ano, setAno] = useState(String(currentDate.getFullYear()));
  const [isSaving, setIsSaving] = useState(false);
  
  const cns = getCNs();

  // Estado para cada linha de CN
  const [rows, setRows] = useState<Record<string, Omit<CNRow, 'colaboradorId' | 'nome' | 'nivel' | 'target'>>>({});

  // Inicializar rows quando colaboradores carregam
  useMemo(() => {
    const newRows: Record<string, Omit<CNRow, 'colaboradorId' | 'nome' | 'nivel' | 'target'>> = {};
    cns.forEach(cn => {
      if (!rows[cn.id]) {
        newRows[cn.id] = {
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
      } else {
        newRows[cn.id] = rows[cn.id];
      }
    });
    if (Object.keys(newRows).length > 0 && JSON.stringify(newRows) !== JSON.stringify(rows)) {
      setRows(newRows);
    }
  }, [cns]);

  const updateRow = (colaboradorId: string, field: keyof CNRow, value: string) => {
    setRows(prev => {
      const current = prev[colaboradorId] || {
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

  const handleSave = async () => {
    // Validar se há pelo menos uma linha preenchida
    const linhasPreenchidas = cns.filter(cn => {
      const row = rows[cn.id];
      return row && row.saoMeta && row.saoRealizado && row.vidasMeta && row.vidasRealizado;
    });

    if (linhasPreenchidas.length === 0) {
      toast.error('Preencha pelo menos um CN para salvar');
      return;
    }

    setIsSaving(true);

    const mesReferencia = `${mes.slice(0, 3)}/${ano}`;
    
    const itens: ApuracaoItemInput[] = linhasPreenchidas.map(cn => {
      const row = rows[cn.id];
      return {
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
      };
    });

    const result = await saveApuracao('mensal', mesReferencia, itens);
    setIsSaving(false);

    if (result) {
      // Limpar formulário após salvar
      const clearedRows: Record<string, any> = {};
      cns.forEach(cn => {
        clearedRows[cn.id] = {
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
      });
      setRows(clearedRows);
    }
  };

  const isLoading = loadingColaboradores || loadingApuracoes;

  return (
    <AdminRoute>
      <div className="min-h-screen bg-background">
        <Navbar />
        
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
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

          {/* Info Card */}
          <div className="card-premium p-4 mb-6 flex items-start gap-3 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-800 dark:text-blue-300">Regra de Cálculo (Regra de Ouro)</p>
              <p className="text-blue-700 dark:text-blue-400">
                Score = (SAO × 70%) + (Vidas × 30%, trava em 150%). Multiplicador aplicado conforme régua de payout.
              </p>
            </div>
          </div>

          {/* Table */}
          <div className="card-premium overflow-hidden mb-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
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
                      const row = rows[cn.id] || {};
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
                              value={row.saoMeta || ''}
                              onChange={(e) => updateRow(cn.id, 'saoMeta', e.target.value)}
                              className="w-20 text-center"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={row.saoRealizado || ''}
                              onChange={(e) => updateRow(cn.id, 'saoRealizado', e.target.value)}
                              className="w-20 text-center"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={row.vidasMeta || ''}
                              onChange={(e) => updateRow(cn.id, 'vidasMeta', e.target.value)}
                              className="w-20 text-center"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={row.vidasRealizado || ''}
                              onChange={(e) => updateRow(cn.id, 'vidasRealizado', e.target.value)}
                              className="w-20 text-center"
                            />
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {row.scoreFinal ? formatPercentage(row.scoreFinal) : '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            {row.multiplicador ? formatPercentage(row.multiplicador) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-bold text-success">
                            {row.comissao ? formatCurrency(row.comissao) : '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Footer */}
          {cns.length > 0 && (
            <div className="card-premium p-6">
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

                <Button 
                  onClick={handleSave} 
                  disabled={isSaving || totalComissoes === 0}
                  className="gap-2"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Salvar Fechamento Mensal
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminRoute>
  );
}
