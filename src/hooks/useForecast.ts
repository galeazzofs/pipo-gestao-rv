import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Contract } from '@/lib/evCalculations';
import { useContracts } from './useContracts';
import { addMonths, differenceInMonths, parseISO, isAfter } from 'date-fns';

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
  ultimo_mes_pago: string | null;
}

export function useForecast() {
  const { contracts, isLoading: contractsLoading } = useContracts();
  const [forecastData, setForecastData] = useState<ForecastContract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [ultimaApuracaoId, setUltimaApuracaoId] = useState<string | null>(null);

  const fetchForecastData = useCallback(async () => {
    if (contracts.length === 0) {
      setForecastData([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // 1. Buscar última apuração
      const { data: ultimaApuracao } = await supabase
        .from('apuracoes')
        .select('id, data_processamento')
        .order('data_processamento', { ascending: false })
        .limit(1)
        .maybeSingle();

      setUltimaApuracaoId(ultimaApuracao?.id || null);

      // 2. Buscar histórico de pagamentos por contrato
      const { data: paymentHistory, error: historyError } = await supabase
        .from('apuracao_itens')
        .select('contract_id, comissao, mes_recebimento, apuracao_id')
        .eq('status', 'valido')
        .not('contract_id', 'is', null);

      if (historyError) throw historyError;

      // 3. Agregar dados por contrato
      const historyByContract: Record<string, PaymentHistory> = {};
      const contractsInLastApuracao = new Set<string>();

      paymentHistory?.forEach((item) => {
        if (!item.contract_id) return;

        // Verificar se apareceu na última apuração
        if (item.apuracao_id === ultimaApuracao?.id) {
          contractsInLastApuracao.add(item.contract_id);
        }

        if (!historyByContract[item.contract_id]) {
          historyByContract[item.contract_id] = {
            contract_id: item.contract_id,
            meses_pagos: 0,
            ultima_comissao: 0,
            ultimo_mes_pago: null,
          };
        }

        historyByContract[item.contract_id].meses_pagos += 1;
        
        // Guardar a comissão mais recente
        if (item.comissao && item.comissao > 0) {
          historyByContract[item.contract_id].ultima_comissao = Number(item.comissao);
          historyByContract[item.contract_id].ultimo_mes_pago = item.mes_recebimento;
        }
      });

      // 4. Construir forecast para cada contrato
      const today = new Date();
      const forecast: ForecastContract[] = contracts.map((contract) => {
        const dataInicio = parseISO(contract.dataInicio);
        const dataFim = addMonths(dataInicio, 11); // 12 meses total
        const history = historyByContract[contract.id];

        const mesesPagos = history?.meses_pagos || 0;
        const parcelasRestantes = Math.max(0, 12 - mesesPagos);
        const ultimaComissao = history?.ultima_comissao || null;

        // Determinar status
        let status: 'ativo' | 'finalizado' | 'churn_risk' = 'ativo';
        
        if (parcelasRestantes === 0) {
          status = 'finalizado';
        } else if (
          ultimaApuracao &&
          parcelasRestantes > 0 &&
          mesesPagos > 0 && // Já teve pagamentos antes
          !contractsInLastApuracao.has(contract.id)
        ) {
          status = 'churn_risk';
        }

        // Calcular valor projetado (zero se churn risk)
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
          mesesPagos,
          parcelasRestantes,
          ultimaComissao,
          valorProjetado,
          status,
          ultimoMesPago: history?.ultimo_mes_pago || null,
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
