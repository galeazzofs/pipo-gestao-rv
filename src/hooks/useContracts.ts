import { useState, useEffect, useCallback } from 'react';
import { Contract } from '@/lib/evCalculations';

const STORAGE_KEY = 'ev-contracts';

export function useContracts() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Carrega contratos do localStorage na inicialização
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setContracts(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Erro ao carregar contratos:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Salva contratos no localStorage quando mudam
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(contracts));
      } catch (error) {
        console.error('Erro ao salvar contratos:', error);
      }
    }
  }, [contracts, isLoading]);

  const addContract = useCallback((contract: Omit<Contract, 'id'>) => {
    const newContract: Contract = {
      ...contract,
      id: crypto.randomUUID()
    };
    setContracts(prev => [...prev, newContract]);
    return newContract;
  }, []);

  const updateContract = useCallback((id: string, updates: Partial<Omit<Contract, 'id'>>) => {
    setContracts(prev => 
      prev.map(c => c.id === id ? { ...c, ...updates } : c)
    );
  }, []);

  const deleteContract = useCallback((id: string) => {
    setContracts(prev => prev.filter(c => c.id !== id));
  }, []);

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
    getUniqueEVNames
  };
}
