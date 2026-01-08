import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Contract, Porte } from '@/lib/evCalculations';
import { toast } from 'sonner';

export function useContracts() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Carrega contratos do banco na inicialização
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
          dataInicio: row.data_inicio
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

  const updateContract = useCallback(async (id: string, updates: Partial<Omit<Contract, 'id'>>) => {
    try {
      const updateData: Record<string, unknown> = {};
      if (updates.nomeEV !== undefined) updateData.nome_ev = updates.nomeEV;
      if (updates.cliente !== undefined) updateData.cliente = updates.cliente;
      if (updates.produto !== undefined) updateData.produto = updates.produto;
      if (updates.operadora !== undefined) updateData.operadora = updates.operadora;
      if (updates.porte !== undefined) updateData.porte = updates.porte;
      if (updates.atingimento !== undefined) updateData.atingimento = updates.atingimento;
      if (updates.dataInicio !== undefined) updateData.data_inicio = updates.dataInicio;

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
    
    return contracts.find(c => 
      normalize(c.cliente) === normalize(cliente) &&
      normalize(c.produto) === normalize(produto) &&
      normalize(c.operadora) === normalize(operadora)
    );
  }, [contracts]);

  const getUniqueEVNames = useCallback(() => {
    return [...new Set(contracts.map(c => c.nomeEV))].sort();
  }, [contracts]);

  return {
    contracts,
    isLoading,
    addContract,
    updateContract,
    deleteContract,
    getContractByKey,
    getUniqueEVNames,
    refetch: fetchContracts
  };
}
