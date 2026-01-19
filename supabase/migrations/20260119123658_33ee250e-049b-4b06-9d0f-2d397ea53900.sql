-- Add goal columns to colaboradores table
ALTER TABLE colaboradores 
ADD COLUMN IF NOT EXISTS meta_mrr numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS meta_sao numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS meta_vidas numeric DEFAULT 0;