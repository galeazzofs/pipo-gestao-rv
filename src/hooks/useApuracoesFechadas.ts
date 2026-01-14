import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type TipoApuracao = 'mensal' | 'trimestral';
export type StatusApuracao = 'rascunho' | 'finalizado';

export interface ApuracaoFechada {
  id: string;
  tipo: TipoApuracao;
  mes_referencia: string;
  data_fechamento: string;
  total_geral: number;
  total_cns: number;
  total_evs: number;
  total_lideranca: number;
  created_by: string | null;
  created_at: string;
  status: StatusApuracao;
  updated_at: string | null;
}

export interface ApuracaoFechadaItem {
  id: string;
  apuracao_id: string;
  colaborador_id: string;
  
  // CNs
  sao_meta: number | null;
  sao_realizado: number | null;
  vidas_meta: number | null;
  vidas_realizado: number | null;
  pct_sao: number | null;
  pct_vidas: number | null;
  score_final: number | null;
  multiplicador: number | null;
  comissao_base: number | null;
  bonus_trimestral: number | null;
  
  // EVs
  comissao_safra: number | null;
  multiplicador_meta: number | null;
  bonus_ev: number | null;
  
  // Liderança
  bonus_lideranca: number | null;
  meta_mrr_lider: number | null;
  meta_sql_lider: number | null;
  realizado_mrr_lider: number | null;
  realizado_sql_lider: number | null;
  pct_mrr_lider: number | null;
  pct_sql_lider: number | null;
  multiplicador_lider: number | null;
  
  total_pagar: number;
  observacoes: string | null;
  created_at: string;
  
  // Joined
  colaborador?: {
    id: string;
    nome: string;
    cargo: string;
    nivel: string | null;
    salario_base: number;
    lider_id: string | null;
  };
}

export interface ApuracaoItemInput {
  colaborador_id: string;
  
  // CNs
  sao_meta?: number;
  sao_realizado?: number;
  vidas_meta?: number;
  vidas_realizado?: number;
  pct_sao?: number;
  pct_vidas?: number;
  score_final?: number;
  multiplicador?: number;
  comissao_base?: number;
  bonus_trimestral?: number;
  
  // EVs
  comissao_safra?: number;
  multiplicador_meta?: number;
  bonus_ev?: number;
  
  // Liderança
  bonus_lideranca?: number;
  meta_mrr_lider?: number;
  meta_sql_lider?: number;
  realizado_mrr_lider?: number;
  realizado_sql_lider?: number;
  pct_mrr_lider?: number;
  pct_sql_lider?: number;
  multiplicador_lider?: number;
  
  total_pagar: number;
  observacoes?: string;
}

export function useApuracoesFechadas() {
  const [apuracoes, setApuracoes] = useState<ApuracaoFechada[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchApuracoes = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('apuracoes_fechadas')
        .select('*')
        .order('data_fechamento', { ascending: false });

      if (error) throw error;
      
      setApuracoes((data || []) as ApuracaoFechada[]);
    } catch (error: any) {
      console.error('Erro ao buscar apurações:', error);
      toast.error('Erro ao carregar apurações');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApuracoes();
  }, [fetchApuracoes]);

  // Load existing draft for a given tipo + mesReferencia
  const loadDraft = async (tipo: TipoApuracao, mesReferencia: string): Promise<{ apuracao: ApuracaoFechada; itens: ApuracaoFechadaItem[] } | null> => {
    try {
      const { data: apuracaoData, error: apuracaoError } = await supabase
        .from('apuracoes_fechadas')
        .select('*')
        .eq('tipo', tipo)
        .eq('mes_referencia', mesReferencia)
        .eq('status', 'rascunho')
        .maybeSingle();

      if (apuracaoError) throw apuracaoError;
      if (!apuracaoData) return null;

      const { data: itensData, error: itensError } = await supabase
        .from('apuracoes_fechadas_itens')
        .select(`
          *,
          colaborador:colaboradores(id, nome, cargo, nivel, salario_base, lider_id)
        `)
        .eq('apuracao_id', apuracaoData.id);

      if (itensError) throw itensError;

      return {
        apuracao: apuracaoData as ApuracaoFechada,
        itens: (itensData || []) as ApuracaoFechadaItem[]
      };
    } catch (error: any) {
      console.error('Erro ao carregar rascunho:', error);
      return null;
    }
  };

  // Save or update a draft
  const saveDraft = async (
    tipo: TipoApuracao,
    mesReferencia: string,
    itens: ApuracaoItemInput[]
  ): Promise<string | null> => {
    try {
      // Check if draft already exists
      const { data: existingDraft } = await supabase
        .from('apuracoes_fechadas')
        .select('id')
        .eq('tipo', tipo)
        .eq('mes_referencia', mesReferencia)
        .eq('status', 'rascunho')
        .maybeSingle();

      // Calculate totals
      const totalCNs = itens
        .filter(i => i.comissao_base !== undefined)
        .reduce((sum, i) => sum + (i.total_pagar || 0), 0);
      
      const totalEVs = itens
        .filter(i => i.comissao_safra !== undefined)
        .reduce((sum, i) => sum + (i.total_pagar || 0), 0);
      
      const totalLideranca = itens
        .filter(i => i.bonus_lideranca !== undefined && i.bonus_lideranca > 0)
        .reduce((sum, i) => sum + (i.total_pagar || 0), 0);

      const totalGeral = totalCNs + totalEVs + totalLideranca;

      let apuracaoId: string;

      if (existingDraft) {
        // Update existing draft
        apuracaoId = existingDraft.id;
        
        const { error: updateError } = await supabase
          .from('apuracoes_fechadas')
          .update({
            total_geral: totalGeral,
            total_cns: totalCNs,
            total_evs: totalEVs,
            total_lideranca: totalLideranca,
          })
          .eq('id', apuracaoId);

        if (updateError) throw updateError;

        // Delete old items and insert new ones
        await supabase
          .from('apuracoes_fechadas_itens')
          .delete()
          .eq('apuracao_id', apuracaoId);
      } else {
        // Create new draft
        const { data: apuracaoData, error: apuracaoError } = await supabase
          .from('apuracoes_fechadas')
          .insert({
            tipo,
            mes_referencia: mesReferencia,
            total_geral: totalGeral,
            total_cns: totalCNs,
            total_evs: totalEVs,
            total_lideranca: totalLideranca,
            status: 'rascunho',
          })
          .select()
          .single();

        if (apuracaoError) throw apuracaoError;
        apuracaoId = apuracaoData.id;
      }

      // Insert items
      if (itens.length > 0) {
        const itensToInsert = itens.map(item => ({
          apuracao_id: apuracaoId,
          colaborador_id: item.colaborador_id,
          sao_meta: item.sao_meta,
          sao_realizado: item.sao_realizado,
          vidas_meta: item.vidas_meta,
          vidas_realizado: item.vidas_realizado,
          pct_sao: item.pct_sao,
          pct_vidas: item.pct_vidas,
          score_final: item.score_final,
          multiplicador: item.multiplicador,
          comissao_base: item.comissao_base,
          bonus_trimestral: item.bonus_trimestral || 0,
          comissao_safra: item.comissao_safra || 0,
          multiplicador_meta: item.multiplicador_meta || 1,
          bonus_ev: item.bonus_ev || 0,
          bonus_lideranca: item.bonus_lideranca || 0,
          meta_mrr_lider: item.meta_mrr_lider || 0,
          meta_sql_lider: item.meta_sql_lider || 0,
          realizado_mrr_lider: item.realizado_mrr_lider || 0,
          realizado_sql_lider: item.realizado_sql_lider || 0,
          pct_mrr_lider: item.pct_mrr_lider || 0,
          pct_sql_lider: item.pct_sql_lider || 0,
          multiplicador_lider: item.multiplicador_lider || 0,
          total_pagar: item.total_pagar,
          observacoes: item.observacoes,
        }));

        const { error: itensError } = await supabase
          .from('apuracoes_fechadas_itens')
          .insert(itensToInsert);

        if (itensError) throw itensError;
      }

      toast.success('Rascunho salvo com sucesso!');
      await fetchApuracoes();
      return apuracaoId;
    } catch (error: any) {
      console.error('Erro ao salvar rascunho:', error);
      toast.error(error.message || 'Erro ao salvar rascunho');
      return null;
    }
  };

  // Finalize a draft (change status to 'finalizado')
  const finalizarApuracao = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('apuracoes_fechadas')
        .update({ 
          status: 'finalizado',
          data_fechamento: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Apuração finalizada com sucesso!');
      await fetchApuracoes();
      return true;
    } catch (error: any) {
      console.error('Erro ao finalizar apuração:', error);
      toast.error(error.message || 'Erro ao finalizar apuração');
      return false;
    }
  };

  const saveApuracao = async (
    tipo: TipoApuracao,
    mesReferencia: string,
    itens: ApuracaoItemInput[]
  ): Promise<string | null> => {
    try {
      // Check if draft exists and delete it
      const { data: existingDraft } = await supabase
        .from('apuracoes_fechadas')
        .select('id')
        .eq('tipo', tipo)
        .eq('mes_referencia', mesReferencia)
        .eq('status', 'rascunho')
        .maybeSingle();

      if (existingDraft) {
        await supabase
          .from('apuracoes_fechadas')
          .delete()
          .eq('id', existingDraft.id);
      }

      // Calculate totals
      const totalCNs = itens
        .filter(i => i.comissao_base !== undefined)
        .reduce((sum, i) => sum + (i.total_pagar || 0), 0);
      
      const totalEVs = itens
        .filter(i => i.comissao_safra !== undefined)
        .reduce((sum, i) => sum + (i.total_pagar || 0), 0);
      
      const totalLideranca = itens
        .filter(i => i.bonus_lideranca !== undefined && i.bonus_lideranca > 0)
        .reduce((sum, i) => sum + (i.total_pagar || 0), 0);

      const totalGeral = totalCNs + totalEVs + totalLideranca;

      // Insert finalized apuracao
      const { data: apuracaoData, error: apuracaoError } = await supabase
        .from('apuracoes_fechadas')
        .insert({
          tipo,
          mes_referencia: mesReferencia,
          total_geral: totalGeral,
          total_cns: totalCNs,
          total_evs: totalEVs,
          total_lideranca: totalLideranca,
          status: 'finalizado',
          data_fechamento: new Date().toISOString(),
        })
        .select()
        .single();

      if (apuracaoError) throw apuracaoError;

      // Insert items
      const itensToInsert = itens.map(item => ({
        apuracao_id: apuracaoData.id,
        colaborador_id: item.colaborador_id,
        sao_meta: item.sao_meta,
        sao_realizado: item.sao_realizado,
        vidas_meta: item.vidas_meta,
        vidas_realizado: item.vidas_realizado,
        pct_sao: item.pct_sao,
        pct_vidas: item.pct_vidas,
        score_final: item.score_final,
        multiplicador: item.multiplicador,
        comissao_base: item.comissao_base,
        bonus_trimestral: item.bonus_trimestral || 0,
        comissao_safra: item.comissao_safra || 0,
        multiplicador_meta: item.multiplicador_meta || 1,
        bonus_ev: item.bonus_ev || 0,
        bonus_lideranca: item.bonus_lideranca || 0,
        meta_mrr_lider: item.meta_mrr_lider || 0,
        meta_sql_lider: item.meta_sql_lider || 0,
        realizado_mrr_lider: item.realizado_mrr_lider || 0,
        realizado_sql_lider: item.realizado_sql_lider || 0,
        pct_mrr_lider: item.pct_mrr_lider || 0,
        pct_sql_lider: item.pct_sql_lider || 0,
        multiplicador_lider: item.multiplicador_lider || 0,
        total_pagar: item.total_pagar,
        observacoes: item.observacoes,
      }));

      const { error: itensError } = await supabase
        .from('apuracoes_fechadas_itens')
        .insert(itensToInsert);

      if (itensError) throw itensError;

      toast.success(`Apuração ${tipo} finalizada com sucesso!`);
      await fetchApuracoes();
      return apuracaoData.id;
    } catch (error: any) {
      console.error('Erro ao salvar apuração:', error);
      toast.error(error.message || 'Erro ao salvar apuração');
      return null;
    }
  };

  const getApuracaoItens = async (apuracaoId: string): Promise<ApuracaoFechadaItem[]> => {
    try {
      const { data, error } = await supabase
        .from('apuracoes_fechadas_itens')
        .select(`
          *,
          colaborador:colaboradores(id, nome, cargo, nivel, salario_base, lider_id)
        `)
        .eq('apuracao_id', apuracaoId);

      if (error) throw error;
      
      return (data || []) as ApuracaoFechadaItem[];
    } catch (error: any) {
      console.error('Erro ao buscar itens da apuração:', error);
      toast.error('Erro ao carregar detalhes da apuração');
      return [];
    }
  };

  const deleteApuracao = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('apuracoes_fechadas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Apuração removida com sucesso!');
      await fetchApuracoes();
      return true;
    } catch (error: any) {
      console.error('Erro ao remover apuração:', error);
      toast.error(error.message || 'Erro ao remover apuração');
      return false;
    }
  };

  // Filters
  const getMensais = useCallback(() => {
    return apuracoes.filter(a => a.tipo === 'mensal');
  }, [apuracoes]);

  const getTrimestrais = useCallback(() => {
    return apuracoes.filter(a => a.tipo === 'trimestral');
  }, [apuracoes]);

  const getRascunhos = useCallback(() => {
    return apuracoes.filter(a => a.status === 'rascunho');
  }, [apuracoes]);

  const getFinalizados = useCallback(() => {
    return apuracoes.filter(a => a.status === 'finalizado');
  }, [apuracoes]);

  // For users to see their own results
  const getMeusResultados = async (email: string): Promise<ApuracaoFechadaItem[]> => {
    try {
      // First find the collaborator by email
      const { data: colaboradorData, error: colaboradorError } = await supabase
        .from('colaboradores')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (colaboradorError || !colaboradorData) {
        return [];
      }

      // Fetch apuracao items for this collaborator
      const { data, error } = await supabase
        .from('apuracoes_fechadas_itens')
        .select(`
          *,
          apuracao:apuracoes_fechadas(id, tipo, mes_referencia, data_fechamento, status)
        `)
        .eq('colaborador_id', colaboradorData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []) as any[];
    } catch (error: any) {
      console.error('Erro ao buscar meus resultados:', error);
      return [];
    }
  };

  return {
    apuracoes,
    isLoading,
    saveApuracao,
    saveDraft,
    loadDraft,
    finalizarApuracao,
    getApuracaoItens,
    deleteApuracao,
    getMensais,
    getTrimestrais,
    getRascunhos,
    getFinalizados,
    getMeusResultados,
    refetch: fetchApuracoes,
  };
}
