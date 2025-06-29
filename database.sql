-- Script de criação do banco de dados para o servidor Mercado Pago
-- Execute este script no seu banco PostgreSQL

-- Tabela de pagamentos
CREATE TABLE IF NOT EXISTS pagamentos (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pendente',
    preference_id VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de cálculos
CREATE TABLE IF NOT EXISTS calculos (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    dp DECIMAL(5,2) NOT NULL,
    cfsd DECIMAL(5,2) NOT NULL,
    nep DECIMAL(5,2) NOT NULL,
    dem DECIMAL(5,2) NOT NULL,
    nota_final DECIMAL(5,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_pagamentos_user_id ON pagamentos(user_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_preference_id ON pagamentos(preference_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_status ON pagamentos(status);
CREATE INDEX IF NOT EXISTS idx_pagamentos_created_at ON pagamentos(created_at);

CREATE INDEX IF NOT EXISTS idx_calculos_user_id ON calculos(user_id);
CREATE INDEX IF NOT EXISTS idx_calculos_created_at ON calculos(created_at);

-- Comentários nas tabelas
COMMENT ON TABLE pagamentos IS 'Tabela para armazenar informações de pagamentos do Mercado Pago';
COMMENT ON TABLE calculos IS 'Tabela para armazenar histórico de cálculos da calculadora aeronáutica';

-- Comentários nas colunas
COMMENT ON COLUMN pagamentos.user_id IS 'ID único do usuário';
COMMENT ON COLUMN pagamentos.valor IS 'Valor do pagamento em reais';
COMMENT ON COLUMN pagamentos.status IS 'Status do pagamento: pendente, approved, rejected, cancelled';
COMMENT ON COLUMN pagamentos.preference_id IS 'ID da preferência do Mercado Pago';
COMMENT ON COLUMN pagamentos.created_at IS 'Data de criação do registro';
COMMENT ON COLUMN pagamentos.updated_at IS 'Data da última atualização';

COMMENT ON COLUMN calculos.user_id IS 'ID único do usuário';
COMMENT ON COLUMN calculos.dp IS 'Nota de Desempenho Profissional';
COMMENT ON COLUMN calculos.cfsd IS 'Nota do CFSD';
COMMENT ON COLUMN calculos.nep IS 'Nota de Escolaridade';
COMMENT ON COLUMN calculos.dem IS 'Nota de Demérito';
COMMENT ON COLUMN calculos.nota_final IS 'Nota final calculada';
COMMENT ON COLUMN calculos.created_at IS 'Data de criação do cálculo';

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_pagamentos_updated_at 
    BEFORE UPDATE ON pagamentos 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Inserir dados de exemplo (opcional)
-- INSERT INTO pagamentos (user_id, valor, status, preference_id) VALUES 
-- ('user123', 29.90, 'pendente', 'test_preference_123');

-- INSERT INTO calculos (user_id, dp, cfsd, nep, dem, nota_final) VALUES 
-- ('user123', 85.5, 78.2, 92.0, 0, 87.8); 