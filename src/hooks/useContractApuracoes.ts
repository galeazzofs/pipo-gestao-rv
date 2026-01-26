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
      // CORREÇÃO: Agora buscamos da tabela correta 'contract_payments'
      // onde as apurações trimestrais salvam as baixas
      const { data, error } = await supabase
        .from('contract_payments')
        .select('contract_id, created_at, data_parcela')
        .order('data_parcela', { ascending: true });

      if (error) {
        console.error('Error fetching contract payments info:', error);
        return;
      }

      // Agrupar por contract_id
      const infoByContract: Record<string, ContractApuracaoInfo> = {};
      const mesesPorContrato: Record<string, Set<string>> = {};

      data?.forEach((item) => {
        if (!item.contract_id) return;

        const contractId = item.contract_id;
        // O campo data_parcela vem como string (YYYY-MM-DD) do banco
        const dataParcela = new Date(item.data_parcela);
        
        // Cria uma chave única para o mês (ex: "2024-02") para contar meses distintos
        // (caso tenha recebido 2 pagamentos no mesmo mês, conta como 1 mês de vigência)
        const mesChave = `${dataParcela.getFullYear()}-${dataParcela.getMonth()}`;

        // Inicializar objeto se não existe
        if (!infoByContract[contractId]) {
          infoByContract[contractId] = {
            contractId,
            primeiraApuracaoData: dataParcela,
            mesesProcessados: 0,
          };
          mesesPorContrato[contractId] = new Set();
        }

        // Atualiza a data de início se encontrar uma data anterior
        if (dataParcela < infoByContract[contractId].primeiraApuracaoData!) {
          infoByContract[contractId].primeiraApuracaoData = dataParcela;
        }

        mesesPorContrato[contractId].add(mesChave);
      });

      // Atualizar contagem final de meses
      Object.keys(infoByContract).forEach((contractId) => {
        infoByContract[contractId].mesesProcessados = mesesPorContrato[contractId]?.size || 0;
      });

      setApuracaoInfo(infoByContract);
    } catch (err) {
      console.error('Error in useContractApuracoes:', err);
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