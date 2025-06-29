// lib/db.js
const { Pool } = require('pg');
const winston = require('winston');

// Configuração do logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'db-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'db-combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Configuração do pool de conexões
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false,
  } : false,
  max: 20, // máximo de conexões no pool
  idleTimeoutMillis: 30000, // tempo limite de inatividade
  connectionTimeoutMillis: 2000, // tempo limite de conexão
});

// Event listeners para monitoramento
pool.on('connect', (client) => {
  logger.info('Nova conexão com o banco de dados estabelecida');
});

pool.on('error', (err, client) => {
  logger.error('Erro inesperado no pool de conexões:', err);
});

pool.on('remove', (client) => {
  logger.info('Cliente removido do pool de conexões');
});

// Função para testar a conexão
const testConnection = async () => {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    logger.info('✅ Conexão com banco de dados estabelecida com sucesso');
    return true;
  } catch (error) {
    logger.error('❌ Erro ao conectar com banco de dados:', error);
    return false;
  }
};

// Função wrapper para queries com melhor tratamento de erros
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    logger.info('Query executada', {
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      duration: `${duration}ms`,
      rowCount: result.rowCount
    });
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error('Erro na query:', {
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      duration: `${duration}ms`,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

// Função para fechar o pool (útil para testes)
const closePool = async () => {
  await pool.end();
  logger.info('Pool de conexões fechado');
};

module.exports = {
  query,
  testConnection,
  closePool,
  pool
};
