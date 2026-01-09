import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type CargoType = 'CN' | 'EV' | 'Lideranca';

export interface Colaborador {
  id: string;
  nome: string;
  email: string;
  cargo: CargoType;
  nivel: string | null;
  lider_id: string | null;
  salario_base: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  lider?: Colaborador | null;
}

export interface ColaboradorInput {
  nome: string;
  email: string;
  cargo: CargoType;
  nivel?: string | null;
  lider_id?: string | null;
  salario_base?: number;
  ativo?: boolean;
}

export function useColaboradores() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchColaboradores = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('colaboradores')
        .select('*')
        .order('nome');

      if (error) throw error;
      
      // Type assertion needed because Supabase types might not include cargo_type enum
      setColaboradores((data || []) as Colaborador[]);
    } catch (error: any) {
      console.error('Erro ao buscar colaboradores:', error);
      toast.error('Erro ao carregar colaboradores');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchColaboradores();
  }, [fetchColaboradores]);

  const addColaborador = async (input: ColaboradorInput): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('colaboradores')
        .insert({
          nome: input.nome,
          email: input.email,
          cargo: input.cargo,
          nivel: input.cargo === 'CN' ? input.nivel : null,
          lider_id: input.lider_id || null,
          salario_base: input.salario_base || 0,
          ativo: input.ativo ?? true,
        });

      if (error) throw error;

      toast.success('Colaborador adicionado com sucesso!');
      await fetchColaboradores();
      return true;
    } catch (error: any) {
      console.error('Erro ao adicionar colaborador:', error);
      toast.error(error.message || 'Erro ao adicionar colaborador');
      return false;
    }
  };

  const updateColaborador = async (id: string, input: Partial<ColaboradorInput>): Promise<boolean> => {
    try {
      const updateData: any = { ...input };
      
      // Se cargo não é CN, nivel deve ser null
      if (input.cargo && input.cargo !== 'CN') {
        updateData.nivel = null;
      }

      const { error } = await supabase
        .from('colaboradores')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast.success('Colaborador atualizado com sucesso!');
      await fetchColaboradores();
      return true;
    } catch (error: any) {
      console.error('Erro ao atualizar colaborador:', error);
      toast.error(error.message || 'Erro ao atualizar colaborador');
      return false;
    }
  };

  const deleteColaborador = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('colaboradores')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Colaborador removido com sucesso!');
      await fetchColaboradores();
      return true;
    } catch (error: any) {
      console.error('Erro ao remover colaborador:', error);
      toast.error(error.message || 'Erro ao remover colaborador');
      return false;
    }
  };

  // Filtros úteis
  const getCNs = useCallback(() => {
    return colaboradores.filter(c => c.cargo === 'CN' && c.ativo);
  }, [colaboradores]);

  const getEVs = useCallback(() => {
    return colaboradores.filter(c => c.cargo === 'EV' && c.ativo);
  }, [colaboradores]);

  const getLideres = useCallback(() => {
    return colaboradores.filter(c => c.cargo === 'Lideranca' && c.ativo);
  }, [colaboradores]);

  const getAtivos = useCallback(() => {
    return colaboradores.filter(c => c.ativo);
  }, [colaboradores]);

  return {
    colaboradores,
    isLoading,
    addColaborador,
    updateColaborador,
    deleteColaborador,
    getCNs,
    getEVs,
    getLideres,
    getAtivos,
    refetch: fetchColaboradores,
  };
}
