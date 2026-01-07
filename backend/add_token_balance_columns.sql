-- Adicionar colunas de cache de tokens ERC-20 à tabela system_blockchain_addresses
ALTER TABLE system_blockchain_addresses 
ADD COLUMN IF NOT EXISTS cached_usdt_balance FLOAT DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS cached_usdc_balance FLOAT DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS cached_dai_balance FLOAT DEFAULT 0.0;

-- Verificar colunas
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'system_blockchain_addresses' 
AND column_name LIKE 'cached_%';
