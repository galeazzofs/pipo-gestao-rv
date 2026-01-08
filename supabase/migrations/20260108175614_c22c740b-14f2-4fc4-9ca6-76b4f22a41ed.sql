-- 1. Reverter ev_contracts para campos únicos (não arrays)
ALTER TABLE public.ev_contracts 
  ADD COLUMN produto TEXT,
  ADD COLUMN operadora TEXT;

-- Migrar dados (primeiro item dos arrays)
UPDATE public.ev_contracts SET 
  produto = COALESCE(produtos[1], 'Saúde'),
  operadora = COALESCE(operadoras[1], 'N/A');

-- Tornar obrigatórios
ALTER TABLE public.ev_contracts 
  ALTER COLUMN produto SET NOT NULL,
  ALTER COLUMN operadora SET NOT NULL;

-- Remover arrays
ALTER TABLE public.ev_contracts 
  DROP COLUMN produtos,
  DROP COLUMN operadoras;

-- 2. Criar tabela de apurações (cabeçalho)
CREATE TABLE public.apuracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  mes_referencia TEXT NOT NULL,
  data_processamento TIMESTAMPTZ DEFAULT NOW(),
  total_processado NUMERIC NOT NULL DEFAULT 0,
  total_comissao_valida NUMERIC NOT NULL DEFAULT 0,
  total_expirado NUMERIC NOT NULL DEFAULT 0,
  total_nao_encontrado NUMERIC NOT NULL DEFAULT 0,
  count_validos INTEGER NOT NULL DEFAULT 0,
  count_expirados INTEGER NOT NULL DEFAULT 0,
  count_nao_encontrados INTEGER NOT NULL DEFAULT 0,
  count_pre_vigencia INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para apuracoes
ALTER TABLE public.apuracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view apuracoes"
ON public.apuracoes FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert apuracoes"
ON public.apuracoes FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update apuracoes"
ON public.apuracoes FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete apuracoes"
ON public.apuracoes FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Criar tabela de itens da apuração (detalhes)
CREATE TABLE public.apuracao_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apuracao_id UUID NOT NULL REFERENCES public.apuracoes(id) ON DELETE CASCADE,
  cliente_mae TEXT NOT NULL,
  produto TEXT NOT NULL,
  operadora TEXT NOT NULL,
  nf_liquido NUMERIC NOT NULL,
  mes_recebimento TEXT NOT NULL,
  status TEXT NOT NULL,
  contract_id UUID REFERENCES public.ev_contracts(id) ON DELETE SET NULL,
  nome_ev TEXT,
  mes_vigencia INTEGER,
  taxa NUMERIC,
  comissao NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para apuracao_itens
ALTER TABLE public.apuracao_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view apuracao_itens"
ON public.apuracao_itens FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert apuracao_itens"
ON public.apuracao_itens FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update apuracao_itens"
ON public.apuracao_itens FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete apuracao_itens"
ON public.apuracao_itens FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));