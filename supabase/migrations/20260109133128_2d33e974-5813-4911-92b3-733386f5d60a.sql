-- Criar enum para tipo de cargo
CREATE TYPE cargo_type AS ENUM ('CN', 'EV', 'Lideranca');

-- Criar enum para tipo de apuração
CREATE TYPE tipo_apuracao AS ENUM ('mensal', 'trimestral');

-- Tabela de colaboradores (cadastro centralizado)
CREATE TABLE public.colaboradores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  cargo cargo_type NOT NULL,
  nivel TEXT, -- CN1, CN2, CN3 para CNs, null para outros
  lider_id UUID REFERENCES public.colaboradores(id) ON DELETE SET NULL,
  salario_base NUMERIC(10,2) DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Tabela de apurações fechadas (cabeçalho)
CREATE TABLE public.apuracoes_fechadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo tipo_apuracao NOT NULL,
  mes_referencia TEXT NOT NULL, -- "Jan/2026" ou "Q1/2026"
  data_fechamento TIMESTAMPTZ DEFAULT now(),
  total_geral NUMERIC(12,2) DEFAULT 0,
  total_cns NUMERIC(12,2) DEFAULT 0,
  total_evs NUMERIC(12,2) DEFAULT 0,
  total_lideranca NUMERIC(12,2) DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de itens da apuração (detalhes por colaborador)
CREATE TABLE public.apuracoes_fechadas_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apuracao_id UUID REFERENCES public.apuracoes_fechadas(id) ON DELETE CASCADE NOT NULL,
  colaborador_id UUID REFERENCES public.colaboradores(id) NOT NULL,
  
  -- Campos para CNs
  sao_meta NUMERIC,
  sao_realizado NUMERIC,
  vidas_meta NUMERIC,
  vidas_realizado NUMERIC,
  pct_sao NUMERIC,
  pct_vidas NUMERIC,
  score_final NUMERIC,
  multiplicador NUMERIC,
  comissao_base NUMERIC,
  bonus_trimestral NUMERIC DEFAULT 0,
  
  -- Campos para EVs
  comissao_safra NUMERIC DEFAULT 0,
  multiplicador_meta NUMERIC DEFAULT 1, -- 0, 0.5, 1, 1.5
  bonus_ev NUMERIC DEFAULT 0,
  
  -- Campos para Liderança
  bonus_lideranca NUMERIC DEFAULT 0,
  
  -- Total
  total_pagar NUMERIC NOT NULL DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apuracoes_fechadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apuracoes_fechadas_itens ENABLE ROW LEVEL SECURITY;

-- RLS Policies para colaboradores
CREATE POLICY "Admins can view all colaboradores"
ON public.colaboradores FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert colaboradores"
ON public.colaboradores FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update colaboradores"
ON public.colaboradores FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete colaboradores"
ON public.colaboradores FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies para apuracoes_fechadas
CREATE POLICY "Admins can view all apuracoes_fechadas"
ON public.apuracoes_fechadas FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert apuracoes_fechadas"
ON public.apuracoes_fechadas FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update apuracoes_fechadas"
ON public.apuracoes_fechadas FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete apuracoes_fechadas"
ON public.apuracoes_fechadas FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies para apuracoes_fechadas_itens
CREATE POLICY "Admins can view all apuracoes_fechadas_itens"
ON public.apuracoes_fechadas_itens FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert apuracoes_fechadas_itens"
ON public.apuracoes_fechadas_itens FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update apuracoes_fechadas_itens"
ON public.apuracoes_fechadas_itens FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete apuracoes_fechadas_itens"
ON public.apuracoes_fechadas_itens FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Usuários podem ver seus próprios itens de apuração
CREATE POLICY "Users can view own apuracao items"
ON public.apuracoes_fechadas_itens FOR SELECT
USING (
  colaborador_id IN (
    SELECT c.id FROM public.colaboradores c
    WHERE c.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Trigger para updated_at em colaboradores
CREATE TRIGGER update_colaboradores_updated_at
BEFORE UPDATE ON public.colaboradores
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Index para performance
CREATE INDEX idx_colaboradores_cargo ON public.colaboradores(cargo);
CREATE INDEX idx_colaboradores_ativo ON public.colaboradores(ativo);
CREATE INDEX idx_apuracoes_fechadas_tipo ON public.apuracoes_fechadas(tipo);
CREATE INDEX idx_apuracoes_fechadas_itens_colaborador ON public.apuracoes_fechadas_itens(colaborador_id);
CREATE INDEX idx_apuracoes_fechadas_itens_apuracao ON public.apuracoes_fechadas_itens(apuracao_id);