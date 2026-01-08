import { Contract, formatPercent, getTaxa } from '@/lib/evCalculations';
import { format, addMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

interface ContractTableProps {
  contracts: Contract[];
  onDelete: (id: string) => void;
}

export function ContractTable({ contracts, onDelete }: ContractTableProps) {
  if (contracts.length === 0) {
    return (
      <div className="card-premium p-8 text-center">
        <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">Nenhum contrato cadastrado</h3>
        <p className="text-muted-foreground">
          Adicione contratos usando o formulário acima para começar a calcular comissões.
        </p>
      </div>
    );
  }

  return (
    <div className="card-premium overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>EV</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Produtos</TableHead>
              <TableHead>Operadoras</TableHead>
              <TableHead>Porte</TableHead>
              <TableHead>Ating.</TableHead>
              <TableHead>Taxa</TableHead>
              <TableHead>Início</TableHead>
              <TableHead>Fim (12m)</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contracts.map((contract) => {
              const dataInicio = parseISO(contract.dataInicio);
              const dataFim = addMonths(dataInicio, 12);
              const taxa = getTaxa(contract.porte, contract.atingimento);
              const isExpired = new Date() > dataFim;

              return (
                <TableRow 
                  key={contract.id}
                  className={isExpired ? 'opacity-50 bg-destructive/5' : ''}
                >
                  <TableCell className="font-medium">{contract.nomeEV}</TableCell>
                  <TableCell>{contract.cliente}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {contract.produtos.map(p => (
                        <Badge key={p} variant="outline" className="text-xs">
                          {p}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {contract.operadoras.map(o => (
                        <Badge key={o} variant="secondary" className="text-xs">
                          {o}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="px-2 py-1 rounded-md bg-muted text-xs font-medium">
                      {contract.porte}
                    </span>
                  </TableCell>
                  <TableCell>{contract.atingimento}%</TableCell>
                  <TableCell className="font-medium text-success">
                    {formatPercent(taxa)}
                  </TableCell>
                  <TableCell>
                    {format(dataInicio, 'MMM/yyyy', { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <span className={isExpired ? 'text-destructive font-medium' : ''}>
                      {format(dataFim, 'MMM/yyyy', { locale: ptBR })}
                    </span>
                    {isExpired && (
                      <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium bg-destructive text-destructive-foreground">
                        Expirado
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir contrato?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir o contrato de <strong>{contract.cliente}</strong>? 
                            Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDelete(contract.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
