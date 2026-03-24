import { Colaborador } from '@/hooks/useColaboradores';
import { formatCurrency } from '@/lib/formatters';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Crown, Info, HelpCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LiderRow, EMPTY_LIDER_ROW } from './types';

interface LiderancaSectionProps {
  lideres: Colaborador[];
  liderRows: Record<string, LiderRow>;
  updateLiderRow: (id: string, field: 'metaSQL' | 'realizadoMRR' | 'realizadoSQL', value: string) => void;
  totalLideranca: number;
  calcularMetaMRRParaLider: (liderId: string) => { metaMRR: number; evIds: string[] };
  getEVsDoLider: (liderId: string) => Colaborador[];
}

export function LiderancaSection({
  lideres, liderRows, updateLiderRow, totalLideranca,
  calcularMetaMRRParaLider, getEVsDoLider,
}: LiderancaSectionProps) {
  return (
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
                  const { metaMRR: metaMRRCalculada } = calcularMetaMRRParaLider(lider.id);
                  const evsDoTime = getEVsDoLider(lider.id);
                  const row = liderRows[lider.id] || { ...EMPTY_LIDER_ROW, metaMRRCalculada };

                  const hasNoEvs = evsDoTime.length === 0;
                  const hasValues = row.metaSQL !== '' && row.realizadoMRR !== '' && row.realizadoSQL !== '' && row.metaMRRCalculada > 0;

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
                        <Input type="number" min="0" value={row.metaSQL}
                          onChange={(e) => updateLiderRow(lider.id, 'metaSQL', e.target.value)}
                          className="w-24 text-right" placeholder="0" disabled={hasNoEvs} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" min="0" value={row.realizadoMRR}
                          onChange={(e) => updateLiderRow(lider.id, 'realizadoMRR', e.target.value)}
                          className="w-24 text-right" placeholder="R$ 0" disabled={hasNoEvs} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" min="0" value={row.realizadoSQL}
                          onChange={(e) => updateLiderRow(lider.id, 'realizadoSQL', e.target.value)}
                          className="w-24 text-right" placeholder="0" disabled={hasNoEvs} />
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
                          {hasValues ? `${row.pctMRR.toFixed(1)}%` : '-'}
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
                          {hasValues ? `${row.pctSQL.toFixed(1)}%` : '-'}
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
  );
}
