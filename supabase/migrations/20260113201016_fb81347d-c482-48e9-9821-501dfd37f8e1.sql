-- Add status column to track draft vs finalized apurations
ALTER TABLE apuracoes_fechadas 
ADD COLUMN status text DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'finalizado'));

-- Add update timestamp for tracking last modification
ALTER TABLE apuracoes_fechadas 
ADD COLUMN updated_at timestamp with time zone DEFAULT now();

-- Create trigger to auto-update timestamp
CREATE TRIGGER set_updated_at_apuracoes_fechadas
  BEFORE UPDATE ON apuracoes_fechadas
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();