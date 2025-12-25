-- Adicionar novos campos para renda variável
ALTER TABLE renda_variavel 
ADD COLUMN IF NOT EXISTS moeda TEXT DEFAULT 'BRL',
ADD COLUMN IF NOT EXISTS mercado TEXT DEFAULT 'b3';

-- Atualizar valores existentes
UPDATE renda_variavel SET moeda = 'BRL' WHERE moeda IS NULL;
UPDATE renda_variavel SET mercado = 'b3' WHERE mercado IS NULL;
