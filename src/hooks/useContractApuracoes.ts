import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ContractApuracaoInfo {
  contractId: string;
  primeiraApuracaoData: Date | null;
  mesesProcessados: number;
}

export function useContractApuracoes() {
  const [apuracaoInfo, setApuracaoInfo] = useState<Record<string, ContractApuracaoInfo>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchApuracaoInfo = useCallback(async () => {
    setIsLoading(true);
    try {
      // Buscar a primeira apuração de cada contrato e contar meses processados
      const { data, error } = await supabase
        .from('apuracao_itens')
        .select('contract_id, created_at, mes_recebimento')
        .not('contract_id', 'is', null)
        .eq('status', 'valido')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching apuracao info:', error);
        return;
      }

      // Agrupar por contract_id
      const infoByContract: Record<string, ContractApuracaoInfo> = {};
      const mesesPorContrato: Record<string, Set<string>> = {};

      data?.forEach((item) => {
        if (!item.contract_id) return;

        const contractId = item.contract_id;

        // Inicializar se não existe
        if (!infoByContract[contractId]) {
          infoByContract[contractId] = {
            contractId,
            primeiraApuracaoData: new Date(item.created_at!),
            mesesProcessados: 0,
          };
          mesesPorContrato[contractId] = new Set();
        }

        // Contar meses únicos processados
        if (item.mes_recebimento) {
          mesesPorContrato[contractId].add(item.mes_recebimento);
        }
      });

      // Atualizar contagem de meses processados
      Object.keys(infoByContract).forEach((contractId) => {
        infoByContract[contractId].mesesProcessados = mesesPorContrato[contractId]?.size || 0;
      });

      setApuracaoInfo(infoByContract);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApuracaoInfo();
  }, [fetchApuracaoInfo]);

  const getContractInfo = useCallback((contractId: string): ContractApuracaoInfo | null => {
    return apuracaoInfo[contractId] || null;
  }, [apuracaoInfo]);

  return {
    apuracaoInfo,
    isLoading,
    getContractInfo,
    refetch: fetchApuracaoInfo,
  };
}
