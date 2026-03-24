import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type Cargo = 'CN' | 'EV' | 'Lideranca';
export type Nivel = 'CN1' | 'CN2' | 'CN3' | 'Senior' | 'Pleno' | 'Junior';
export type Porte = 'M' | 'G+';

export interface Colaborador {
  id: string;
  nome: string;
  email: string | null;
  cargo: Cargo;
  nivel: Nivel | null;
  porte: Porte | null;
  data_admissao: string | null;
  ativo: boolean;
  lider_id: string | null;
  salario_base: number | null;
  meta_sao: number | null;
  meta_vidas: number | null;
  meta_mrr: number | null;
}

export interface ColaboradorInput {
  nome: string;
  email: string;
  cargo: Cargo;
  nivel: string | null;
  porte?: Porte | null;
  lider_id: string | null;
  salario_base: number;
  meta_sao?: number;
  meta_vidas?: number;
  meta_mrr?: number;
}

export interface MetaMensal {
  id: string;
  colaborador_id: string;
  mes: number;
  ano: number;
  meta_sao: number;
}

const COLABORADORES_KEY = ['colaboradores'] as const;
const METAS_MENSAIS_KEY = ['metas-mensais'] as const;

async function fetchColaboradoresData(): Promise<Colaborador[]> {
  const { data, error } = await supabase
    .from('colaboradores')
    .select('*')
    .order('nome');

  if (error) throw error;
  return data as unknown as Colaborador[];
}

async function fetchMetasMensaisData(): Promise<MetaMensal[]> {
  const { data, error } = await supabase
    .from('metas_sao_mensais')
    .select('*');

  if (error) throw error;
  return data as MetaMensal[];
}

export function useColaboradores() {
  const queryClient = useQueryClient();

  const {
    data: colaboradores = [],
    isLoading: loadingColaboradores,
  } = useQuery({
    queryKey: COLABORADORES_KEY,
    queryFn: fetchColaboradoresData,
    staleTime: 30_000,
  });

  const {
    data: metasMensais = [],
    isLoading: loadingMetas,
  } = useQuery({
    queryKey: METAS_MENSAIS_KEY,
    queryFn: fetchMetasMensaisData,
    staleTime: 30_000,
  });

  const isLoading = loadingColaboradores || loadingMetas;

  // Helpers de filtro memoizados
  const getCNs = useMemo(() => colaboradores.filter(c => c.cargo === 'CN' && c.ativo), [colaboradores]);
  const getEVs = useMemo(() => colaboradores.filter(c => c.cargo === 'EV' && c.ativo), [colaboradores]);
  const getLideres = useMemo(() => colaboradores.filter(c => c.cargo === 'Lideranca' && c.ativo), [colaboradores]);

  const invalidateColaboradores = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: COLABORADORES_KEY });
  }, [queryClient]);

  const invalidateMetas = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: METAS_MENSAIS_KEY });
  }, [queryClient]);

  // --- CRUD ---

  const addColaborador = useCallback(async (input: ColaboradorInput): Promise<boolean> => {
    try {
      const payload = {
        nome: input.nome,
        email: input.email,
        cargo: input.cargo,
        nivel: input.cargo === 'CN' ? input.nivel : null,
        porte: input.cargo === 'CN' ? (input.porte ?? null) : null,
        lider_id: input.lider_id || null,
        salario_base: input.salario_base || 0,
        meta_sao: input.meta_sao || 0,
        meta_vidas: input.meta_vidas || 0,
        meta_mrr: input.meta_mrr || 0,
        ativo: true,
      };

      const { error } = await supabase.from('colaboradores').insert([payload]);
      if (error) throw error;

      toast.success('Colaborador adicionado com sucesso');
      invalidateColaboradores();
      return true;
    } catch (error) {
      console.error('Erro ao adicionar:', error);
      toast.error('Erro ao adicionar colaborador');
      return false;
    }
  }, [invalidateColaboradores]);

  const updateColaborador = useCallback(async (id: string, input: Partial<ColaboradorInput>): Promise<boolean> => {
    try {
      const updateData: Record<string, unknown> = {};
      if (input.nome !== undefined) updateData.nome = input.nome;
      if (input.email !== undefined) updateData.email = input.email;
      if (input.cargo !== undefined) updateData.cargo = input.cargo;
      if (input.nivel !== undefined) updateData.nivel = input.nivel;
      if (input.porte !== undefined) updateData.porte = input.porte;
      if (input.lider_id !== undefined) updateData.lider_id = input.lider_id;
      if (input.salario_base !== undefined) updateData.salario_base = input.salario_base;
      if (input.meta_sao !== undefined) updateData.meta_sao = input.meta_sao;
      if (input.meta_vidas !== undefined) updateData.meta_vidas = input.meta_vidas;
      if (input.meta_mrr !== undefined) updateData.meta_mrr = input.meta_mrr;

      const { error } = await supabase
        .from('colaboradores')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast.success('Colaborador atualizado');
      invalidateColaboradores();
      return true;
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      toast.error('Erro ao atualizar colaborador');
      return false;
    }
  }, [invalidateColaboradores]);

  const deleteColaborador = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('colaboradores')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Colaborador removido');
      invalidateColaboradores();
      return true;
    } catch (error) {
      console.error('Erro ao remover:', error);
      toast.error('Erro ao remover colaborador');
      return false;
    }
  }, [invalidateColaboradores]);

  const saveMetaMensal = useCallback(async (colaboradorId: string, mes: number, ano: number, metaSao: number): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('metas_sao_mensais')
        .upsert({
          colaborador_id: colaboradorId,
          mes,
          ano,
          meta_sao: metaSao
        }, { onConflict: 'colaborador_id,mes,ano' });

      if (error) throw error;

      invalidateMetas();
      toast.success('Meta mensal salva com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao salvar meta:', error);
      toast.error('Erro ao salvar meta mensal');
      return false;
    }
  }, [invalidateMetas]);

  return {
    colaboradores,
    metasMensais,
    isLoading,
    fetchColaboradores: invalidateColaboradores,
    refetch: () => {
      invalidateColaboradores();
      invalidateMetas();
    },
    getCNs,
    getEVs,
    getLideres,
    addColaborador,
    updateColaborador,
    deleteColaborador,
    saveMetaMensal
  };
}
