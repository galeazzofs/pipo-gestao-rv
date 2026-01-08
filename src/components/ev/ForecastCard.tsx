import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/evCalculations';
import { ForecastContract } from '@/hooks/useForecast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ForecastCardProps {
  forecast: ForecastContract;
}

export function ForecastCard({ forecast }: ForecastCardProps) {
  const progressPercent = (forecast.mesesPagos / 12) * 100;
  const isChurnRisk = forecast.status === 'churn_risk';
  const isFinalized = forecast.status === 'finalizado';

  return (
    <Card
      className={cn(
        'transition-all',
        isChurnRisk && 'border-destructive bg-destructive/5',
        isFinalized && 'opacity-60'
      )}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {isChurnRisk && (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              )}
              {isFinalized && (
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              )}
              <h3 className="font-semibold text-foreground truncate">
                {forecast.cliente}
              </h3>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline" className="text-xs">
                {forecast.produto}
              </Badge>
              <span>•</span>
              <span>{forecast.operadora}</span>
            </div>
          </div>
          <Badge
            variant={isChurnRisk ? 'destructive' : isFinalized ? 'secondary' : 'default'}
            className="shrink-0"
          >
            {isChurnRisk ? 'Risco de Churn' : isFinalized ? 'Finalizado' : 'Ativo'}
          </Badge>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">
              {forecast.mesesPagos}/12 pagos
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {forecast.parcelasRestantes > 0
              ? `Faltam ${forecast.parcelasRestantes} parcela${forecast.parcelasRestantes > 1 ? 's' : ''}`
              : 'Todas as parcelas pagas'}
          </p>
        </div>

        {/* Churn Warning */}
        {isChurnRisk && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 mb-4">
            <p className="text-sm text-destructive font-medium">
              ⚠️ Não houve pagamento na última apuração
            </p>
            <p className="text-xs text-destructive/80 mt-1">
              Projeção zerada por risco de inadimplência
            </p>
          </div>
        )}

        {/* Values */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Último Pago</p>
            <p className="font-semibold text-foreground">
              {forecast.ultimaComissao
                ? formatCurrency(forecast.ultimaComissao)
                : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Projeção Restante</p>
            <p
              className={cn(
                'font-semibold',
                isChurnRisk ? 'text-destructive' : 'text-primary'
              )}
            >
              {formatCurrency(forecast.valorProjetado)}
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
          <span>EV: {forecast.nomeEV}</span>
          <span>
            Vigência: {format(forecast.dataInicio, 'MMM/yy', { locale: ptBR })} -{' '}
            {format(forecast.dataFim, 'MMM/yy', { locale: ptBR })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
