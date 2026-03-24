import { Colaborador } from '@/hooks/useColaboradores';
import { CNLevel, CN_TARGETS } from '@/lib/cnCalculations';
import { formatCurrency, formatPercentage } from '@/lib/formatters';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Users, Info, Loader2 } from 'lucide-react';
import { CNRow, EMPTY_CN_ROW } from './types';

interface CNSectionProps {
  cns: Colaborador[];
  cnRows: Record<string, CNRow>;
  updateCNRow: (id: string, field: keyof CNRow, value: string) => void;
  totalCNs: number;
  loadingColaboradores: boolean;
}

export function CNSection({ cns, cnRows, updateCNRow, totalCNs, loadingColaboradores }: CNSectionProps) {
  return (
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
                {cns.map((cnCollab) => {
                  const row: CNRow = cnRows[cnCollab.id] || EMPTY_CN_ROW;
                  const nivel = (cnCollab.nivel || 'CN1') as CNLevel;
                  const target = CN_TARGETS[nivel];
                  const isComplete = row.saoMeta !== '' && row.saoRealizado !== '' && row.vidasMeta !== '' && row.vidasRealizado !== '';

                  return (
                    <TableRow key={cnCollab.id}>
                      <TableCell className="font-medium">{cnCollab.nome}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{nivel}</Badge>
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {formatCurrency(target)}
                      </TableCell>
                      <TableCell>
                        <Input type="number" min="0" placeholder="0" value={row.saoMeta}
                          onChange={(e) => updateCNRow(cnCollab.id, 'saoMeta', e.target.value)}
                          className="w-16 text-center" />
                      </TableCell>
                      <TableCell>
                        <Input type="number" min="0" placeholder="0" value={row.saoRealizado}
                          onChange={(e) => updateCNRow(cnCollab.id, 'saoRealizado', e.target.value)}
                          className="w-16 text-center" />
                      </TableCell>
                      <TableCell>
                        <Input type="number" min="0" placeholder="0" value={row.vidasMeta}
                          onChange={(e) => updateCNRow(cnCollab.id, 'vidasMeta', e.target.value)}
                          className="w-16 text-center" />
                      </TableCell>
                      <TableCell>
                        <Input type="number" min="0" placeholder="0" value={row.vidasRealizado}
                          onChange={(e) => updateCNRow(cnCollab.id, 'vidasRealizado', e.target.value)}
                          className="w-16 text-center" />
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {isComplete ? formatPercentage(row.scoreFinal) : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        {isComplete ? formatPercentage(row.multiplicador) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {isComplete ? formatCurrency(row.comissao) : '-'}
                      </TableCell>
                      <TableCell>
                        <Input type="number" min="0" value={row.bonus}
                          onChange={(e) => updateCNRow(cnCollab.id, 'bonus', e.target.value)}
                          className="w-20" placeholder="R$ 0" />
                      </TableCell>
                      <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {(isComplete || row.total > 0) ? formatCurrency(row.total) : '-'}
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
