import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProcessedResult } from '@/lib/evCalculations';
import { calculateTotals } from '@/components/ev/ProcessingEngine';
import { toast } from 'sonner';

export interface Apuracao {
  id: string;
  nome: string;
  mesReferencia: string;
  dataProcessamento: string;
  totalProcessado: number;
  totalComissaoValida: number;
  totalExpirado: number;
  totalNaoEncontrado: number;
  countValidos: number;
  countExpirados: number;
  countPreVigencia: number;
  countNaoEncontrados: number;
}

export interface ApuracaoItem {
  id: string;
  apuracaoId: string;
  clienteMae: string;
  produto: string;
  operadora: string;
  nfLiquido: number;
  mesRecebimento: string;
  mesVigencia: number | null;
  taxa: number | null;
  comissao: number | null;
  status: string;
  nomeEV: string | null;
  contractId: string | null;
}

export function useApuracoes() {
  const [apuracoes, setApuracoes] = useState<Apuracao[]>([]);
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
        toast.error('Erro ao carregar histórico');
        return;
      }

      if (data) {
        setApuracoes(data.map(row => ({
          id: row.id,
          nome: row.nome,
          mesReferencia: row.mes_referencia,
          dataProcessamento: row.data_processamento || '',
          totalProcessado: Number(row.total_processado),
          totalComissaoValida: Number(row.total_comissao_valida),
          totalExpirado: Number(row.total_expirado),
          totalNaoEncontrado: Number(row.total_nao_encontrado),
          countValidos: row.count_validos,
          countExpirados: row.count_expirados,
          countPreVigencia: row.count_pre_vigencia,
          countNaoEncontrados: row.count_nao_encontrados
        })));
      }
    } catch (error) {
      console.error('Erro ao carregar apurações:', error);
      toast.error('Erro ao carregar histórico');
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
    results: ProcessedResult[]
  ): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const totals = calculateTotals(results);

      // Inserir cabeçalho da apuração
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
          count_pre_vigencia: totals.countPreVigencia,
          count_nao_encontrados: totals.countNaoEncontrados,
          created_by: user?.id
        })
        .select()
        .single();

      if (apuracaoError) {
        console.error('Erro ao salvar apuração:', apuracaoError);
        toast.error('Erro ao salvar apuração');
        return false;
      }

      // Inserir itens detalhados
      const itens = results.map(r => ({
        apuracao_id: apuracao.id,
        contract_id: r.contract?.id || null,
        cliente_mae: r.excelRow.clienteMae,
        produto: r.excelRow.produto,
        operadora: r.excelRow.operadora,
        nf_liquido: r.excelRow.nfLiquido,
        mes_recebimento: r.excelRow.mesRecebimento,
        mes_vigencia: r.mesVigencia || null,
        taxa: r.taxa || null,
        comissao: r.comissao || null,
        status: r.status,
        nome_ev: r.contract?.nomeEV || null
      }));

      const { error: itensError } = await supabase
        .from('apuracao_itens')
        .insert(itens);

      if (itensError) {
        console.error('Erro ao salvar itens:', itensError);
        toast.error('Erro ao salvar detalhes da apuração');
        return false;
      }

      toast.success('Apuração salva com sucesso!');
      await fetchApuracoes();
      return true;
    } catch (error) {
      console.error('Erro ao salvar apuração:', error);
      toast.error('Erro ao salvar apuração');
      return false;
    }
  }, [fetchApuracoes]);

  const getApuracaoItems = useCallback(async (apuracaoId: string): Promise<ApuracaoItem[]> => {
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

      return data.map(row => ({
        id: row.id,
        apuracaoId: row.apuracao_id,
        clienteMae: row.cliente_mae,
        produto: row.produto,
        operadora: row.operadora,
        nfLiquido: Number(row.nf_liquido),
        mesRecebimento: row.mes_recebimento,
        mesVigencia: row.mes_vigencia,
        taxa: row.taxa ? Number(row.taxa) : null,
        comissao: row.comissao ? Number(row.comissao) : null,
        status: row.status,
        nomeEV: row.nome_ev,
        contractId: row.contract_id
      }));
    } catch (error) {
      console.error('Erro ao carregar itens:', error);
      return [];
    }
  }, []);

  const deleteApuracao = useCallback(async (id: string): Promise<boolean> => {
    try {
      // Primeiro deleta os itens
      const { error: itensError } = await supabase
        .from('apuracao_itens')
        .delete()
        .eq('apuracao_id', id);

      if (itensError) {
        console.error('Erro ao deletar itens:', itensError);
        toast.error('Erro ao excluir apuração');
        return false;
      }

      // Depois deleta o cabeçalho
      const { error } = await supabase
        .from('apuracoes')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao deletar apuração:', error);
        toast.error('Erro ao excluir apuração');
        return false;
      }

      toast.success('Apuração excluída');
      await fetchApuracoes();
      return true;
    } catch (error) {
      console.error('Erro ao deletar apuração:', error);
      toast.error('Erro ao excluir apuração');
      return false;
    }
  }, [fetchApuracoes]);

  return {
    apuracoes,
    isLoading,
    saveApuracao,
    getApuracaoItems,
    deleteApuracao,
    refetch: fetchApuracoes
  };
}
