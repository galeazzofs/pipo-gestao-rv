-- Add new leadership columns to apuracoes_fechadas_itens
ALTER TABLE public.apuracoes_fechadas_itens 
ADD COLUMN IF NOT EXISTS meta_mrr_lider numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS meta_sql_lider numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS realizado_mrr_lider numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS realizado_sql_lider numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS pct_mrr_lider numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS pct_sql_lider numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS multiplicador_lider numeric DEFAULT 0;