import { Colaborador } from '@/hooks/useColaboradores';
import { formatCurrency } from '@/lib/formatters';
import { ExcelRow, ProcessedResult } from '@/lib/evCalculations';
import { ResultsDashboard } from '@/components/ev/ResultsDashboard';
import { ResultsTable } from '@/components/ev/ResultsTable';
import { ExcelDropzone } from '@/components/ev/ExcelDropzone';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Info, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EVRow, EMPTY_EV_ROW } from './types';

interface EVSectionProps {
  evs: Colaborador[];
  evRows: Record<string, EVRow>;
  updateEVRow: (id: string, field: keyof EVRow, value: string | number) => void;
  totalEVs: number;
  hasProcessedExcel: boolean;
  evResults: ProcessedResult[];
  selectedMonth: string;
  selectedEV: string;
  onMonthChange: (value: string) => void;
  onEVChange: (value: string) => void;
  onExcelData: (data: ExcelRow[]) => void;
  isProcessingExcel: boolean;
}

export function EVSection({
  evs, evRows, updateEVRow, totalEVs,
  hasProcessedExcel, evResults, selectedMonth, selectedEV,
  onMonthChange, onEVChange, onExcelData, isProcessingExcel,
}: EVSectionProps) {
  return (
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
          <ExcelDropzone onDataLoaded={onExcelData} isProcessing={isProcessingExcel} />
        </div>

        {/* Dashboard with cards and filters */}
        {hasProcessedExcel && evResults.length > 0 && (
          <div className="space-y-6 mb-6">
            <ResultsDashboard
              results={evResults}
              selectedMonth={selectedMonth}
              selectedEV={selectedEV}
              onMonthChange={onMonthChange}
              onEVChange={onEVChange}
            />
            <ResultsTable results={evResults} selectedMonth={selectedMonth} selectedEV={selectedEV} />
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
                  const row = evRows[ev.id] || EMPTY_EV_ROW;
                  const hasMetaMRR = row.metaMRR !== '' && row.mrrRealizado !== '';

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
                        <Input type="number" min="0" value={row.metaMRR}
                          onChange={(e) => updateEVRow(ev.id, 'metaMRR', e.target.value)}
                          className="w-24 text-right" placeholder="R$ 0" />
                      </TableCell>
                      <TableCell>
                        <Input type="number" min="0" value={row.mrrRealizado}
                          onChange={(e) => updateEVRow(ev.id, 'mrrRealizado', e.target.value)}
                          className="w-24 text-right" placeholder="R$ 0" />
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
                            {hasMetaMRR ? `${row.pctAtingimento.toFixed(1)}%` : '-'}
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
  );
}
