import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Exportando os tipos para serem usados nas páginas
export type Cargo = 'CN' | 'EV' | 'Lideranca';
export type Nivel = 'CN1' | 'CN2' | 'CN3' | 'Senior' | 'Pleno' | 'Junior';
export type Porte = 'M' | 'G+';

export interface Colaborador {
  id: string;
  nome: string;
  email: string | null;
  cargo: Cargo;
  nivel: Nivel | null;
  porte: Porte | null; // Campo novo
  data_admissao: string | null;
  ativo: boolean;
  lider_id: string | null;
  salario_base: number | null;
  meta_sao: number | null;
  meta_vidas: number | null;
  meta_mrr: number | null;
}

// Interface para input de criação/edição
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

export function useColaboradores() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [metasMensais, setMetasMensais] = useState<MetaMensal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Busca Colaboradores
  const fetchColaboradores = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('colaboradores')
        .select('*')
        .order('nome');

      if (error) throw error;
      
      // Cast forçado para evitar conflitos de tipagem estrita do Supabase vs Typescript Enums
      setColaboradores(data as unknown as Colaborador[]);
    } catch (error) {
      console.error('Erro ao carregar colaboradores:', error);
      toast.error('Erro ao carregar time');
    }
  }, []);

  // Busca Metas Mensais
  const fetchMetasMensais = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('metas_sao_mensais')
        .select('*');

      if (error) throw error;
      setMetasMensais(data as MetaMensal[]);
    } catch (error) {
      console.error('Erro ao carregar metas mensais:', error);
    }
  }, []);

  // Função unificada de refresh
  const refetch = async () => {
    setIsLoading(true);
    await Promise.all([fetchColaboradores(), fetchMetasMensais()]);
    setIsLoading(false);
  };

  useEffect(() => {
    refetch();
  }, []);

  // Helpers de filtro (memoizados para evitar re-renders desnecessários)
  const getCNs = useMemo(() => colaboradores.filter(c => c.cargo === 'CN' && c.ativo), [colaboradores]);
  const getEVs = useMemo(() => colaboradores.filter(c => c.cargo === 'EV' && c.ativo), [colaboradores]);
  const getLideres = useMemo(() => colaboradores.filter(c => c.cargo === 'Lideranca' && c.ativo), [colaboradores]);

  // --- FUNÇÕES DE CRUD (Restauradas) ---

  const addColaborador = async (input: ColaboradorInput): Promise<boolean> => {
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
      await fetchColaboradores();
      return true;
    } catch (error) {
      console.error('Erro ao adicionar:', error);
      toast.error('Erro ao adicionar colaborador');
      return false;
    }
  };

  const updateColaborador = async (id: string, input: Partial<ColaboradorInput>): Promise<boolean> => {
    try {
      // Constrói payload com nomes de coluna corretos do banco
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
      await fetchColaboradores();
      return true;
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      toast.error('Erro ao atualizar colaborador');
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

      toast.success('Colaborador removido');
      await fetchColaboradores();
      return true;
    } catch (error) {
      console.error('Erro ao remover:', error);
      toast.error('Erro ao remover colaborador');
      return false;
    }
  };

  // --- NOVA FUNÇÃO: Salvar Meta Mensal ---

  const saveMetaMensal = async (colaboradorId: string, mes: number, ano: number, metaSao: number): Promise<boolean> => {
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
      
      await fetchMetasMensais(); // Recarrega apenas as metas
      toast.success('Meta mensal salva com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao salvar meta:', error);
      toast.error('Erro ao salvar meta mensal');
      return false;
    }
  };

  return {
    colaboradores,
    metasMensais,
    isLoading,
    fetchColaboradores, // Mantive este nome pois é usado no GestaoTime.tsx que te mandei
    refetch,
    getCNs,
    getEVs,
    getLideres,
    addColaborador,
    updateColaborador,
    deleteColaborador,
    saveMetaMensal
  };
}