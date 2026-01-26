import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useContracts } from './useContracts';
import { addMonths, parseISO } from 'date-fns';

export interface ForecastContract {
  contractId: string;
  cliente: string;
  produto: string;
  operadora: string;
  nomeEV: string;
  porte: string;
  dataInicio: Date;
  dataFim: Date;
  mesesPagos: number;
  mesesPagosManual: number; // Para debug se necessário
  parcelasRestantes: number;
  ultimaComissao: number | null;
  valorProjetado: number;
  status: 'ativo' | 'finalizado' | 'churn_risk';
  ultimoMesPago: string | null;
}

interface PaymentHistory {
  contract_id: string;
  meses_pagos: number;
  ultima_comissao: number;
  ultimo_mes_pago: Date | null;
  meses_unicos: Set<string>;
}

export function useForecast() {
  const { contracts, isLoading: contractsLoading } = useContracts();
  const [forecastData, setForecastData] = useState<ForecastContract[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchForecastData = useCallback(async () => {
    // Se não houver contratos, não há o que projetar
    if (contracts.length === 0) {
      setForecastData([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // 1. Buscar última apuração FINALIZADA para cálculo de Churn
      const { data: ultimaApuracao } = await supabase
        .from('apuracoes_fechadas')
        .select('id, data_fechamento')
        .order('data_fechamento', { ascending: false })
        .limit(1)
        .maybeSingle();

      const ultimaApuracaoId = ultimaApuracao?.id;

      // 2. Buscar histórico de pagamentos REALIZADOS (nova tabela)
      const { data: payments, error: paymentsError } = await supabase
        .from('contract_payments')
        .select('contract_id, valor_pago, data_parcela, apuracao_id')
        .order('data_parcela', { ascending: true });

      if (paymentsError) throw paymentsError;

      // 3. Agregar dados por contrato
      const historyByContract: Record<string, PaymentHistory> = {};
      const contractsInLastApuracao = new Set<string>();

      payments?.forEach((item) => {
        if (!item.contract_id) return;

        // Verificar se este contrato teve pagamento na última apuração fechada
        if (ultimaApuracaoId && item.apuracao_id === ultimaApuracaoId) {
          contractsInLastApuracao.add(item.contract_id);
        }

        if (!historyByContract[item.contract_id]) {
          historyByContract[item.contract_id] = {
            contract_id: item.contract_id,
            meses_pagos: 0,
            ultima_comissao: 0,
            ultimo_mes_pago: null,
            meses_unicos: new Set(),
          };
        }

        const history = historyByContract[item.contract_id];
        
        // Identificar mês único (YYYY-MM) para contagem correta de parcelas
        const dataParcela = new Date(item.data_parcela);
        const mesChave = `${dataParcela.getFullYear()}-${dataParcela.getMonth()}`;
        
        history.meses_unicos.add(mesChave);
        history.meses_pagos = history.meses_unicos.size;

        // Atualizar última comissão e data (se houver valor)
        if (item.valor_pago > 0) {
          history.ultima_comissao = Number(item.valor_pago);
          history.ultimo_mes_pago = dataParcela;
        }
      });

      // 4. Construir forecast para cada contrato
      const forecast: ForecastContract[] = contracts.map((contract) => {
        const dataInicio = parseISO(contract.dataInicio);
        const dataFim = addMonths(dataInicio, 11); // 12 meses de vigência
        const history = historyByContract[contract.id];

        // LOGICA DE SOMA: Sistema + Manual
        const mesesPagosSistema = history?.meses_pagos || 0;
        const mesesPagosManual = contract.mesesPagosManual || 0;
        const mesesPagosTotal = mesesPagosSistema + mesesPagosManual;

        // Calcula restantes (travando em 0)
        const parcelasRestantes = Math.max(0, 12 - mesesPagosTotal);
        
        // Se não tiver histórico no sistema, mas tiver manual, usamos 0 como base por enquanto
        // (o valor projetado aparecerá quando entrar a primeira parcela no sistema)
        const ultimaComissao = history?.ultima_comissao || null;

        // Formatar último mês pago para exibição
        let ultimoMesPagoStr: string | null = null;
        if (history?.ultimo_mes_pago) {
          const d = history.ultimo_mes_pago;
          const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
          ultimoMesPagoStr = `${months[d.getMonth()]}/${d.getFullYear()}`;
        } else if (mesesPagosManual > 0) {
          ultimoMesPagoStr = "Legado";
        }

        // Determinar status
        let status: 'ativo' | 'finalizado' | 'churn_risk' = 'ativo';
        
        if (parcelasRestantes === 0) {
          status = 'finalizado';
        } else if (
          ultimaApuracaoId && // Existe apuração no sistema
          parcelasRestantes > 0 && // Ainda falta receber
          mesesPagosSistema > 0 && // Já começou a receber PELO SISTEMA
          !contractsInLastApuracao.has(contract.id) // Falhou na última
        ) {
          // Só consideramos churn risk se já tiver entrado no fluxo automático do sistema
          // Se for legado puro e ainda não caiu a primeira no sistema, não é churn risk ainda
          status = 'churn_risk';
        }

        // Calcular valor projetado
        // Se só tiver legado (sem comissão registrada), valor projetado é 0 até entrar a primeira
        const valorProjetado = status === 'churn_risk' 
          ? 0 
          : (ultimaComissao || 0) * parcelasRestantes;

        return {
          contractId: contract.id,
          cliente: contract.cliente,
          produto: contract.produto,
          operadora: contract.operadora,
          nomeEV: contract.nomeEV,
          porte: contract.porte,
          dataInicio,
          dataFim,
          mesesPagos: mesesPagosTotal, // Soma para exibição
          mesesPagosManual,
          parcelasRestantes,
          ultimaComissao,
          valorProjetado,
          status,
          ultimoMesPago: ultimoMesPagoStr,
        };
      });

      setForecastData(forecast);
    } catch (error) {
      console.error('Erro ao calcular forecast:', error);
    } finally {
      setIsLoading(false);
    }
  }, [contracts]);

  useEffect(() => {
    if (!contractsLoading) {
      fetchForecastData();
    }
  }, [contractsLoading, fetchForecastData]);

  // Métricas agregadas
  const metrics = useMemo(() => {
    const ativos = forecastData.filter((f) => f.status === 'ativo');
    const churnRisk = forecastData.filter((f) => f.status === 'churn_risk');
    const finalizados = forecastData.filter((f) => f.status === 'finalizado');

    const carteiraFutura = ativos.reduce((sum, f) => sum + f.valorProjetado, 0);
    const mediaMensal = ativos.reduce((sum, f) => sum + (f.ultimaComissao || 0), 0);

    return {
      carteiraFutura,
      mediaMensal,
      totalAtivos: ativos.length,
      totalChurnRisk: churnRisk.length,
      totalFinalizados: finalizados.length,
    };
  }, [forecastData]);

  // Função para filtrar por EV
  const filterByEV = useCallback(
    (nomeEV: string | null) => {
      if (!nomeEV) return forecastData;
      return forecastData.filter((f) => f.nomeEV === nomeEV);
    },
    [forecastData]
  );

  // Lista de EVs únicos
  const uniqueEVs = useMemo(() => {
    const evs = new Set(forecastData.map((f) => f.nomeEV));
    return Array.from(evs).sort();
  }, [forecastData]);

  return {
    forecastData,
    metrics,
    isLoading: isLoading || contractsLoading,
    filterByEV,
    uniqueEVs,
    refetch: fetchForecastData,
  };
}