import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Contract, Porte } from '@/lib/evCalculations';
import { toast } from 'sonner';

export function useContracts() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchContracts = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('ev_contracts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar contratos:', error);
        toast.error('Erro ao carregar contratos');
        return;
      }

      if (data) {
        setContracts(data.map(row => ({
          id: row.id,
          nomeEV: row.nome_ev,
          cliente: row.cliente,
          produto: row.produto,
          operadora: row.operadora,
          porte: row.porte as Porte,
          atingimento: Number(row.atingimento),
          dataInicio: row.data_inicio,
          mesesPagosManual: row.meses_pagos_manual || 0
        })));
      }
    } catch (error) {
      console.error('Erro ao carregar contratos:', error);
      toast.error('Erro ao carregar contratos');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

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
      await fetchContracts();
      return data;
    } catch (error) {
      console.error('Erro ao adicionar contrato:', error);
      toast.error('Erro ao adicionar contrato');
      return null;
    }
  }, [fetchContracts]);

  const addContracts = useCallback(async (contracts: Omit<Contract, 'id'>[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const insertData = contracts.map(contract => ({
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

      toast.success(`${contracts.length} contrato(s) adicionado(s) com sucesso`);
      await fetchContracts();
      return true;
    } catch (error) {
      console.error('Erro ao adicionar contratos:', error);
      toast.error('Erro ao adicionar contratos');
      return false;
    }
  }, [fetchContracts]);

  const updateContract = useCallback(async (id: string, updates: Partial<Omit<Contract, 'id'>>) => {
    try {
      const updateData: Record<string, any> = {};
      
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
        // O uso de 'as any' aqui resolve o erro de tipagem estrita do TypeScript
        // garantindo que o objeto seja aceito mesmo se a definição de tipos estiver rígida
        .update(updateData as any)
        .eq('id', id);

      if (error) {
        console.error('Erro ao atualizar contrato:', error);
        toast.error('Erro ao atualizar contrato');
        return;
      }

      toast.success('Contrato atualizado');
      await fetchContracts();
    } catch (error) {
      console.error('Erro ao atualizar contrato:', error);
      toast.error('Erro ao atualizar contrato');
    }
  }, [fetchContracts]);

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
      await fetchContracts();
    } catch (error) {
      console.error('Erro ao excluir contrato:', error);
      toast.error('Erro ao excluir contrato');
    }
  }, [fetchContracts]);

  const getContractByKey = useCallback((cliente: string, produto: string, operadora: string) => {
    const normalize = (str: string) => 
      str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    
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
    refetch: fetchContracts
  };
}