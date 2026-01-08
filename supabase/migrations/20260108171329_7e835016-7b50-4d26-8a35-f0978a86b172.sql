-- Criar tabela de contratos EV
CREATE TABLE public.ev_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_ev TEXT NOT NULL,
  cliente TEXT NOT NULL,
  produto TEXT NOT NULL,
  operadora TEXT NOT NULL,
  porte TEXT NOT NULL CHECK (porte IN ('PP/P', 'M', 'G+', 'Enterprise', 'Inside Sales')),
  atingimento NUMERIC NOT NULL DEFAULT 100,
  data_inicio DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Habilitar RLS
ALTER TABLE public.ev_contracts ENABLE ROW LEVEL SECURITY;

-- Politica: Admins podem gerenciar todos os contratos
CREATE POLICY "Admins can view all contracts"
ON public.ev_contracts
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert contracts"
ON public.ev_contracts
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update contracts"
ON public.ev_contracts
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete contracts"
ON public.ev_contracts
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER ev_contracts_updated_at
BEFORE UPDATE ON public.ev_contracts
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();