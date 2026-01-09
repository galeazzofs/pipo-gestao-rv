import { Trash2, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { format, parseISO, addMonths, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Contract } from '@/lib/evCalculations';
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
import { ContractApuracaoInfo } from '@/hooks/useContractApuracoes';

interface ContractCardProps {
  contract: Contract;
  onDelete?: (id: string) => void;
  apuracaoInfo?: ContractApuracaoInfo | null;
}

export function ContractCard({ contract, onDelete, apuracaoInfo }: ContractCardProps) {
  const dataInicio = parseISO(contract.dataInicio);
  const dataFim = addMonths(dataInicio, 12);
  const now = new Date();
  
  // Só contar meses se houver apuração processada
  const temApuracao = apuracaoInfo && apuracaoInfo.mesesProcessados > 0;
  const mesesDecorridos = temApuracao ? Math.min(12, apuracaoInfo.mesesProcessados) : 0;
  const isActive = isBefore(now, dataFim);
  const progressPercent = (mesesDecorridos / 12) * 100;

  return (
    <Card className={cn('transition-all hover:shadow-md', !isActive && 'opacity-60')}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">
              {contract.cliente}
            </h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <Badge variant="outline" className="text-xs">
                {contract.produto}
              </Badge>
              <span>•</span>
              <span className="truncate">{contract.operadora}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isActive ? 'default' : 'secondary'}>
              {isActive ? 'Ativo' : 'Finalizado'}
            </Badge>
            {onDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir contrato?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. Isso excluirá permanentemente o contrato de {contract.cliente}.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(contract.id)}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Vigência</span>
            <span className="font-medium">
              {mesesDecorridos}/12 meses
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          {temApuracao ? (
            <p className="text-xs text-muted-foreground mt-1">
              {12 - mesesDecorridos > 0
                ? `Faltam ${12 - mesesDecorridos} ${12 - mesesDecorridos > 1 ? 'meses' : 'mes'}`
                : 'Vigência completa'}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Aguardando primeira apuração
            </p>
          )}
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Porte</p>
            <p className="font-medium text-sm">{contract.porte}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Atingimento</p>
            <p className="font-medium text-sm">{contract.atingimento}%</p>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
          <span>EV: {contract.nomeEV}</span>
          <span>
            {format(dataInicio, 'MMM/yy', { locale: ptBR })} - {format(dataFim, 'MMM/yy', { locale: ptBR })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
