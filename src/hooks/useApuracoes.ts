import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ApuracaoSalva, ApuracaoItem, ProcessedResult, ProcessedStatus } from '@/lib/evCalculations';
import { toast } from 'sonner';

interface Totals {
  totalProcessado: number;
  totalComissaoValida: number;
  totalExpirado: number;
  totalNaoEncontrado: number;
  countValidos: number;
  countExpirados: number;
  countNaoEncontrados: number;
  countPreVigencia: number;
}

export function useApuracoes() {
  const [apuracoes, setApuracoes] = useState<ApuracaoSalva[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchApuracoes = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('apuracoes')
        .select('*')
        .order('data_processamento', { ascending: false });

      if (error) {
        console.error('Erro ao carregar apurações:', error);
        toast.error('Erro ao carregar apurações');
        return;
      }

      if (data) {
        setApuracoes(data.map(row => ({
          id: row.id,
          nome: row.nome,
          mesReferencia: row.mes_referencia,
          dataProcessamento: row.data_processamento,
          totalProcessado: Number(row.total_processado),
          totalComissaoValida: Number(row.total_comissao_valida),
          totalExpirado: Number(row.total_expirado),
          totalNaoEncontrado: Number(row.total_nao_encontrado),
          countValidos: row.count_validos,
          countExpirados: row.count_expirados,
          countNaoEncontrados: row.count_nao_encontrados,
          countPreVigencia: row.count_pre_vigencia
        })));
      }
    } catch (error) {
      console.error('Erro ao carregar apurações:', error);
      toast.error('Erro ao carregar apurações');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApuracoes();
  }, [fetchApuracoes]);

  const saveApuracao = useCallback(async (
    nome: string,
    mesReferencia: string,
    totals: Totals,
    results: ProcessedResult[]
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Cria o registro principal
      const { data: apuracao, error: apuracaoError } = await supabase
        .from('apuracoes')
        .insert({
          nome,
          mes_referencia: mesReferencia,
          total_processado: totals.totalProcessado,
          total_comissao_valida: totals.totalComissaoValida,
          total_expirado: totals.totalExpirado,
          total_nao_encontrado: totals.totalNaoEncontrado,
          count_validos: totals.countValidos,
          count_expirados: totals.countExpirados,
          count_nao_encontrados: totals.countNaoEncontrados,
          count_pre_vigencia: totals.countPreVigencia,
          created_by: user?.id
        })
        .select()
        .single();

      if (apuracaoError || !apuracao) {
        console.error('Erro ao salvar apuração:', apuracaoError);
        toast.error('Erro ao salvar apuração');
        return null;
      }

      // Insere os itens detalhados
      const itens = results.map(r => ({
        apuracao_id: apuracao.id,
        cliente_mae: r.excelRow.clienteMae,
        produto: r.excelRow.produto,
        operadora: r.excelRow.operadora,
        nf_liquido: r.excelRow.nfLiquido,
        mes_recebimento: r.excelRow.mesRecebimento,
        status: r.status,
        contract_id: r.contract?.id || null,
        nome_ev: r.contract?.nomeEV || null,
        mes_vigencia: r.mesVigencia || null,
        taxa: r.taxa || null,
        comissao: r.comissao || null
      }));

      const { error: itensError } = await supabase
        .from('apuracao_itens')
        .insert(itens);

      if (itensError) {
        console.error('Erro ao salvar itens da apuração:', itensError);
        // Tenta deletar a apuração se falhar ao inserir itens
        await supabase.from('apuracoes').delete().eq('id', apuracao.id);
        toast.error('Erro ao salvar detalhes da apuração');
        return null;
      }

      toast.success('Apuração salva com sucesso!');
      await fetchApuracoes();
      return apuracao.id;
    } catch (error) {
      console.error('Erro ao salvar apuração:', error);
      toast.error('Erro ao salvar apuração');
      return null;
    }
  }, [fetchApuracoes]);

  const getApuracaoItens = useCallback(async (apuracaoId: string): Promise<ApuracaoItem[]> => {
    try {
      const { data, error } = await supabase
        .from('apuracao_itens')
        .select('*')
        .eq('apuracao_id', apuracaoId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Erro ao carregar itens:', error);
        toast.error('Erro ao carregar detalhes');
        return [];
      }

      return (data || []).map(row => ({
        id: row.id,
        apuracaoId: row.apuracao_id,
        clienteMae: row.cliente_mae,
        produto: row.produto,
        operadora: row.operadora,
        nfLiquido: Number(row.nf_liquido),
        mesRecebimento: row.mes_recebimento,
        status: row.status as ProcessedStatus,
        contractId: row.contract_id,
        nomeEV: row.nome_ev,
        mesVigencia: row.mes_vigencia,
        taxa: row.taxa ? Number(row.taxa) : null,
        comissao: row.comissao ? Number(row.comissao) : null
      }));
    } catch (error) {
      console.error('Erro ao carregar itens:', error);
      return [];
    }
  }, []);

  const deleteApuracao = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('apuracoes')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao excluir apuração:', error);
        toast.error('Erro ao excluir apuração');
        return;
      }

      toast.success('Apuração excluída');
      await fetchApuracoes();
    } catch (error) {
      console.error('Erro ao excluir apuração:', error);
      toast.error('Erro ao excluir apuração');
    }
  }, [fetchApuracoes]);

  // Filtros
  const getUniqueMeses = useCallback(() => {
    return [...new Set(apuracoes.map(a => a.mesReferencia))].sort();
  }, [apuracoes]);

  return {
    apuracoes,
    isLoading,
    saveApuracao,
    getApuracaoItens,
    deleteApuracao,
    getUniqueMeses,
    refetch: fetchApuracoes
  };
}
