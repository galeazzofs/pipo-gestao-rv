import { useState, useMemo } from 'react';
import { Navbar } from '@/components/Navbar';
import { AdminRoute } from '@/components/AdminRoute';
import { useColaboradores } from '@/hooks/useColaboradores';
import { useApuracoesFechadas, ApuracaoItemInput } from '@/hooks/useApuracoesFechadas';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  CalendarCheck, 
  Calculator,
  Save,
  Loader2,
  Users,
  Briefcase,
  Crown,
  Info,
  Upload
} from 'lucide-react';
import { toast } from 'sonner';
import { ExcelDropzone } from '@/components/ev/ExcelDropzone';
import { ExcelRow } from '@/lib/excelParser';

const TRIMESTRES = [
  { value: 'Q1', label: 'Q1 (Jan-Mar)' },
  { value: 'Q2', label: 'Q2 (Abr-Jun)' },
  { value: 'Q3', label: 'Q3 (Jul-Set)' },
  { value: 'Q4', label: 'Q4 (Out-Dez)' },
];

const ANOS = ['2024', '2025', '2026', '2027'];

const MULTIPLICADORES = [
  { value: '0', label: '0x' },
  { value: '0.5', label: '0.5x' },
  { value: '1', label: '1x' },
  { value: '1.5', label: '1.5x' },
];

interface CNRow {
  saoMeta: string;
  saoRealizado: string;
  vidasMeta: string;
  vidasRealizado: string;
  comissao: number;
  bonus: string;
  total: number;
}

interface EVRow {
  comissaoSafra: number;
  multiplicador: string;
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

  // Handlers para CNs
  const updateCNRow = (id: string, field: keyof CNRow, value: string) => {
    setCnRows(prev => {
      const current = prev[id] || {
        saoMeta: '', saoRealizado: '', vidasMeta: '', vidasRealizado: '',
        comissao: 0, bonus: '0', total: 0
      };
      const updated = { ...current, [field]: value };

      // Recalcular
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
      }
      updated.total = updated.comissao + (parseFloat(updated.bonus) || 0);

      return { ...prev, [id]: updated };
    });
  };

  // Handlers para EVs
  const updateEVRow = (id: string, field: keyof EVRow, value: string | number) => {
    setEvRows(prev => {
      const ev = evs.find(e => e.id === id);
      const current = prev[id] || {
        comissaoSafra: 0, multiplicador: '1', bonusEV: 0, total: 0
      };
      const updated = { ...current, [field]: value };

      // Recalcular bônus EV
      const mult = parseFloat(updated.multiplicador) || 0;
      updated.bonusEV = (ev?.salario_base || 0) * mult;
      updated.total = updated.comissaoSafra + updated.bonusEV;

      return { ...prev, [id]: updated };
    });
  };

  // Handler para Excel dos EVs
  const handleExcelData = (data: ExcelRow[]) => {
    // Simular processamento - em produção aqui entraria a lógica de safra
    setIsProcessingExcel(true);
    
    // Por enquanto, apenas log
    console.log('Dados do Excel:', data);
    toast.info(`${data.length} linhas processadas do Excel`);
    
    setIsProcessingExcel(false);
  };

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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

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
          multiplicador_meta: parseFloat(row.multiplicador) || 1,
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

            {/* CNs Tab */}
            <TabsContent value="cns">
              <div className="card-premium p-4 mb-4 flex items-start gap-3 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-800 dark:text-blue-300">Comissão Mês 3 + Bônus Trimestral</p>
                  <p className="text-blue-700 dark:text-blue-400">
                    Preencha os KPIs do último mês do trimestre. O bônus trimestral é um valor manual.
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
                          <TableHead>Consultor</TableHead>
                          <TableHead className="text-center">Nível</TableHead>
                          <TableHead className="text-center w-20">M SAO</TableHead>
                          <TableHead className="text-center w-20">R SAO</TableHead>
                          <TableHead className="text-center w-20">M Vidas</TableHead>
                          <TableHead className="text-center w-20">R Vidas</TableHead>
                          <TableHead className="text-right">Comissão M3</TableHead>
                          <TableHead className="text-center w-28">Bônus Tri</TableHead>
                          <TableHead className="text-right">TOTAL</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cns.map((cn) => {
                          const row = cnRows[cn.id] || {};
                          const nivel = (cn.nivel || 'CN1') as CNLevel;

                          return (
                            <TableRow key={cn.id}>
                              <TableCell className="font-medium">{cn.nome}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline">{nivel}</Badge>
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  value={row.saoMeta || ''}
                                  onChange={(e) => updateCNRow(cn.id, 'saoMeta', e.target.value)}
                                  className="w-16 text-center"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  value={row.saoRealizado || ''}
                                  onChange={(e) => updateCNRow(cn.id, 'saoRealizado', e.target.value)}
                                  className="w-16 text-center"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  value={row.vidasMeta || ''}
                                  onChange={(e) => updateCNRow(cn.id, 'vidasMeta', e.target.value)}
                                  className="w-16 text-center"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  value={row.vidasRealizado || ''}
                                  onChange={(e) => updateCNRow(cn.id, 'vidasRealizado', e.target.value)}
                                  className="w-16 text-center"
                                />
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {row.comissao ? formatCurrency(row.comissao) : '-'}
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  value={row.bonus || ''}
                                  onChange={(e) => updateCNRow(cn.id, 'bonus', e.target.value)}
                                  className="w-24"
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
                    Faça upload do Excel de comissões ou preencha manualmente. Bônus = Salário Base × Multiplicador.
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

              <div className="card-premium overflow-hidden">
                {evs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Nenhum EV cadastrado.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Executivo</TableHead>
                        <TableHead className="text-right">Salário Base</TableHead>
                        <TableHead className="text-right w-32">Comissão Safra</TableHead>
                        <TableHead className="text-center w-28">Multiplicador</TableHead>
                        <TableHead className="text-right">Bônus EV</TableHead>
                        <TableHead className="text-right">TOTAL</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {evs.map((ev) => {
                        const row = evRows[ev.id] || { comissaoSafra: 0, multiplicador: '1', bonusEV: 0, total: 0 };

                        return (
                          <TableRow key={ev.id}>
                            <TableCell className="font-medium">{ev.nome}</TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {formatCurrency(ev.salario_base)}
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                value={row.comissaoSafra || ''}
                                onChange={(e) => updateEVRow(ev.id, 'comissaoSafra', parseFloat(e.target.value) || 0)}
                                className="w-28"
                                placeholder="R$ 0"
                              />
                            </TableCell>
                            <TableCell>
                              <Select
                                value={row.multiplicador}
                                onValueChange={(v) => updateEVRow(ev.id, 'multiplicador', v)}
                              >
                                <SelectTrigger className="w-24">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {MULTIPLICADORES.map((m) => (
                                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(row.bonusEV)}
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
