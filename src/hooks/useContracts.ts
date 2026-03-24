import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Contract, Porte } from '@/lib/evCalculations';
import { toast } from 'sonner';

const normalize = (str: string) =>
  str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

const CONTRACTS_KEY = ['contracts'] as const;

async function fetchContractsData(): Promise<Contract[]> {
  const { data, error } = await supabase
    .from('ev_contracts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map(row => ({
    id: row.id,
    nomeEV: row.nome_ev,
    cliente: row.cliente,
    produto: row.produto,
    operadora: row.operadora,
    porte: row.porte as Porte,
    atingimento: Number(row.atingimento),
    dataInicio: row.data_inicio,
    mesesPagosManual: row.meses_pagos_manual || 0,
    ativo: row.ativo !== false,
  }));
}

export function useContracts() {
  const queryClient = useQueryClient();

  const {
    data: contracts = [],
    isLoading,
  } = useQuery({
    queryKey: CONTRACTS_KEY,
    queryFn: fetchContractsData,
    staleTime: 30_000,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: CONTRACTS_KEY });
  }, [queryClient]);

  const addContract = useCallback(async (contract: Omit<Contract, 'id'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('ev_contracts')
        .insert({
          nome_ev: contract.nomeEV,
          cliente: contract.cliente,
          produto: contract.produto,
          operadora: contract.operadora,
          porte: contract.porte,
          atingimento: contract.atingimento,
          data_inicio: contract.dataInicio,
          meses_pagos_manual: contract.mesesPagosManual || 0,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao adicionar contrato:', error);
        toast.error('Erro ao adicionar contrato');
        return null;
      }

      toast.success('Contrato adicionado com sucesso');
      invalidate();
      return data;
    } catch (error) {
      console.error('Erro ao adicionar contrato:', error);
      toast.error('Erro ao adicionar contrato');
      return null;
    }
  }, [invalidate]);

  const addContracts = useCallback(async (contractsList: Omit<Contract, 'id'>[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const insertData = contractsList.map(contract => ({
        nome_ev: contract.nomeEV,
        cliente: contract.cliente,
        produto: contract.produto,
        operadora: contract.operadora,
        porte: contract.porte,
        atingimento: contract.atingimento,
        data_inicio: contract.dataInicio,
        meses_pagos_manual: contract.mesesPagosManual || 0,
        created_by: user?.id
      }));

      const { error } = await supabase
        .from('ev_contracts')
        .insert(insertData);

      if (error) {
        console.error('Erro ao adicionar contratos:', error);
        toast.error('Erro ao adicionar contratos');
        return false;
      }

      toast.success(`${contractsList.length} contrato(s) adicionado(s) com sucesso`);
      invalidate();
      return true;
    } catch (error) {
      console.error('Erro ao adicionar contratos:', error);
      toast.error('Erro ao adicionar contratos');
      return false;
    }
  }, [invalidate]);

  const updateContract = useCallback(async (id: string, updates: Partial<Omit<Contract, 'id'>>) => {
    try {
      interface EVContractUpdate {
        nome_ev?: string;
        cliente?: string;
        produto?: string;
        operadora?: string;
        porte?: Porte;
        atingimento?: number;
        data_inicio?: string;
        meses_pagos_manual?: number;
      }
      const updateData: EVContractUpdate = {};

      if (updates.nomeEV !== undefined) updateData.nome_ev = updates.nomeEV;
      if (updates.cliente !== undefined) updateData.cliente = updates.cliente;
      if (updates.produto !== undefined) updateData.produto = updates.produto;
      if (updates.operadora !== undefined) updateData.operadora = updates.operadora;
      if (updates.porte !== undefined) updateData.porte = updates.porte;
      if (updates.atingimento !== undefined) updateData.atingimento = updates.atingimento;
      if (updates.dataInicio !== undefined) updateData.data_inicio = updates.dataInicio;
      if (updates.mesesPagosManual !== undefined) updateData.meses_pagos_manual = updates.mesesPagosManual;

      const { error } = await supabase
        .from('ev_contracts')
        .update(updateData)
        .eq('id', id);

      if (error) {
        console.error('Erro ao atualizar contrato:', error);
        toast.error('Erro ao atualizar contrato');
        return;
      }

      toast.success('Contrato atualizado');
      invalidate();
    } catch (error) {
      console.error('Erro ao atualizar contrato:', error);
      toast.error('Erro ao atualizar contrato');
    }
  }, [invalidate]);

  const deleteContract = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('ev_contracts')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao excluir contrato:', error);
        toast.error('Erro ao excluir contrato');
        return;
      }

      toast.success('Contrato excluído');
      invalidate();
    } catch (error) {
      console.error('Erro ao excluir contrato:', error);
      toast.error('Erro ao excluir contrato');
    }
  }, [invalidate]);

  const getContractByKey = useCallback((cliente: string, produto: string, operadora: string) => {
    return contracts.find(c => {
      const clienteMatch = normalize(c.cliente) === normalize(cliente);
      const produtoMatch = normalize(c.produto) === normalize(produto);
      const operadoraMatch = normalize(c.operadora) === normalize(operadora);
      return clienteMatch && produtoMatch && operadoraMatch;
    });
  }, [contracts]);

  const getUniqueEVNames = useCallback(() => {
    return [...new Set(contracts.map(c => c.nomeEV))].sort();
  }, [contracts]);

  const getUniqueClientes = useCallback(() => {
    return [...new Set(contracts.map(c => c.cliente))].sort();
  }, [contracts]);

  return {
    contracts,
    isLoading,
    addContract,
    addContracts,
    updateContract,
    deleteContract,
    getContractByKey,
    getUniqueEVNames,
    getUniqueClientes,
    refetch: invalidate
  };
}
