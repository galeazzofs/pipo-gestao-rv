-- Adicionar novas colunas array
ALTER TABLE ev_contracts ADD COLUMN produtos TEXT[] DEFAULT '{}';
ALTER TABLE ev_contracts ADD COLUMN operadoras TEXT[] DEFAULT '{}';

-- Migrar dados existentes (se houver)
UPDATE ev_contracts SET 
  produtos = ARRAY[produto],
  operadoras = ARRAY[operadora]
WHERE produto IS NOT NULL AND operadora IS NOT NULL;

-- Remover colunas antigas
ALTER TABLE ev_contracts DROP COLUMN produto;
ALTER TABLE ev_contracts DROP COLUMN operadora;