import { ProcessedResult, formatCurrency, formatPercent } from '@/lib/evCalculations';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface ResultsTableProps {
  results: ProcessedResult[];
  selectedMonth: string;
  selectedEV: string;
}

export function ResultsTable({ results, selectedMonth, selectedEV }: ResultsTableProps) {
  // Filtra resultados
  let filteredResults = results;
  if (selectedMonth && selectedMonth !== '__all__') {
    filteredResults = filteredResults.filter(r => r.excelRow.mesRecebimento === selectedMonth);
  }
  if (selectedEV && selectedEV !== '__all__') {
    filteredResults = filteredResults.filter(r => r.contract?.nomeEV === selectedEV);
  }

  // Ordena: válidos primeiro, depois por data
  filteredResults = [...filteredResults].sort((a, b) => {
    if (a.status === 'valido' && b.status !== 'valido') return -1;
    if (a.status !== 'valido' && b.status === 'valido') return 1;
    return b.excelRow.dataRecebimento.getTime() - a.excelRow.dataRecebimento.getTime();
  });

  const getStatusBadge = (result: ProcessedResult) => {
    switch (result.status) {
      case 'valido':
        return (
          <Badge className="bg-success/10 text-success border-0 hover:bg-success/20">
            Mês {result.mesVigencia}/12
          </Badge>
        );
      case 'expirado':
        return (
          <Badge variant="destructive" className="opacity-80">
            Expirado
          </Badge>
        );
      case 'pre_vigencia':
        return (
          <Badge variant="secondary" className="opacity-80">
            Pré-vigência
          </Badge>
        );
      case 'nao_encontrado':
        return (
          <Badge variant="outline" className="opacity-60">
            Sem contrato
          </Badge>
        );
    }
  };

  if (filteredResults.length === 0) {
    return (
      <div className="card-premium p-8 text-center text-muted-foreground">
        Nenhum resultado para exibir com os filtros selecionados.
      </div>
    );
  }

  return (
    <div className="card-premium overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Data Rec.</TableHead>
              <TableHead>EV</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Operadora</TableHead>
              <TableHead>NF Líquido</TableHead>
              <TableHead>Vigência</TableHead>
              <TableHead>Taxa</TableHead>
              <TableHead className="text-right">Comissão</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredResults.map((result, index) => {
              const isInvalid = result.status !== 'valido';
              
              return (
                <TableRow 
                  key={index}
                  className={isInvalid ? 'opacity-50 bg-muted/20' : ''}
                >
                  <TableCell className="whitespace-nowrap">
                    {format(result.excelRow.dataRecebimento, 'dd/MM/yyyy', { locale: ptBR })}
                  </TableCell>
                  <TableCell className="font-medium">
                    {result.contract?.nomeEV || '-'}
                  </TableCell>
                  <TableCell>
                    <span className="max-w-[200px] truncate block">
                      {result.excelRow.clienteMae}
                    </span>
                  </TableCell>
                  <TableCell>{result.excelRow.operadora || '-'}</TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(result.excelRow.nfLiquido)}
                  </TableCell>
                  <TableCell>{getStatusBadge(result)}</TableCell>
                  <TableCell>
                    {result.taxa ? formatPercent(result.taxa) : '-'}
                  </TableCell>
                  <TableCell className={`text-right font-bold ${
                    result.status === 'valido' ? 'text-success' : 'text-muted-foreground'
                  }`}>
                    {result.comissao ? formatCurrency(result.comissao) : '-'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
