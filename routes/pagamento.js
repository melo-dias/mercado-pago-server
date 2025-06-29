// pagamento.js
const express = require('express');
const router = express.Router();
const { MercadoPagoConfig, Preference } = require('mercadopago');
const { query, testConnection } = require('../lib/db');
const { validate, validateParams } = require('../lib/validation');
const winston = require('winston');
const fetch = require('node-fetch');

// Configuração do logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'pagamento-routes' },
  transports: [
    new winston.transports.File({ filename: 'pagamento-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'pagamento-combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Configuração do Mercado Pago
const mp = new MercadoPagoConfig({
  accessToken: process.env.MP_TOKEN || 'SUA_CHAVE_DO_MERCADO_PAGO',
});
const preference = new Preference(mp);

// Middleware para verificar conexão com banco
const checkDbConnection = async (req, res, next) => {
  console.log('🔍 DB CONNECTION: Iniciando verificação de conexão com banco...');
  
  try {
    console.log('🔄 DB CONNECTION: Chamando testConnection()...');
    await testConnection();
    console.log('✅ DB CONNECTION: Conexão com banco OK, prosseguindo...');
    next();
  } catch (error) {
    console.error('❌ DB CONNECTION: Erro na conexão com banco:', {
      error: error.message,
      stack: error.stack
    });
    
    logger.error('Erro na conexão com banco de dados:', error);
    res.status(503).json({
      error: 'Serviço temporariamente indisponível',
      message: 'Erro na conexão com banco de dados'
    });
  }
};

// ✅ Rota para gerar pagamento (MELHORADA)
router.post('/gerar-pagamento', 
  validate('gerarPagamento'),
  async (req, res) => {
    console.log('🚀 ROTA INICIADA: Gerar pagamento');
    
    try {
      const { userId, valor } = req.body;
      
      console.log('📋 DADOS RECEBIDOS:', { userId, valor });
      
      logger.info('🚀 INICIANDO: Geração de pagamento', { userId, valor });

      // Validação adicional
      if (!process.env.MP_TOKEN) {
        console.error('❌ TOKEN NÃO CONFIGURADO');
        logger.error('❌ ERRO: Token do Mercado Pago não configurado');
        return res.status(500).json({
          error: 'Configuração do servidor incompleta',
          message: 'Token do Mercado Pago não encontrado'
        });
      }

      console.log('✅ TOKEN CONFIGURADO');
      logger.info('✅ Token do MP encontrado, criando preferência...');

      const preferenceData = {
        items: [{
          title: 'Acesso ao cálculo da nota',
          quantity: 1,
          currency_id: 'BRL',
          unit_price: valor
        }],
        back_urls: {
          success: process.env.SUCCESS_URL || 'https://calculadora-aeronautica.vercel.app/pagamento/sucesso',
          failure: process.env.FAILURE_URL || 'https://calculadora-aeronautica.vercel.app/pagamento/erro',
          pending: process.env.PENDING_URL || 'https://calculadora-aeronautica.vercel.app/pagamento/pendente'
        },
        auto_return: 'approved',
        notification_url: process.env.WEBHOOK_URL || 'https://mercado-pago-server-production.up.railway.app/api/webhook',
        external_reference: userId,
        metadata: { userId },
        expires: true,
        expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 horas
      };

      console.log('📋 PREFERÊNCIA PREPARADA:', { 
        valor, 
        userId,
        notification_url: preferenceData.notification_url,
        back_urls: preferenceData.back_urls
      });
      
      logger.info('📋 Dados da preferência preparados:', { 
        valor, 
        userId,
        notification_url: preferenceData.notification_url,
        back_urls: preferenceData.back_urls
      });

      console.log('🔄 CHAMANDO API DO MP...');
      logger.info('🔄 Chamando API do Mercado Pago...');
      
      const result = await preference.create({ body: preferenceData });

      console.log('📥 RESPOSTA RECEBIDA:', {
        hasResult: !!result,
        hasBody: !!result?.body,
        hasId: !!result?.body?.id,
        hasInitPoint: !!result?.body?.init_point,
        hasSandboxInitPoint: !!result?.body?.sandbox_init_point,
        status: result?.body?.api_response?.status
      });

      logger.info('📥 Resposta do Mercado Pago recebida:', {
        hasResult: !!result,
        hasBody: !!result?.body,
        hasId: !!result?.body?.id,
        hasInitPoint: !!result?.body?.init_point,
        hasSandboxInitPoint: !!result?.body?.sandbox_init_point,
        status: result?.body?.api_response?.status
      });

      if (!result || !result.body || !result.body.id) {
        console.error('❌ RESPOSTA INVÁLIDA - Sem ID:', result);
        logger.error('❌ Resposta inválida do Mercado Pago - Sem ID:', {
          result: JSON.stringify(result, null, 2),
          error: 'Estrutura da resposta inválida - Sem ID'
        });
        return res.status(500).json({
          error: 'Erro na criação da preferência',
          message: 'Resposta inválida do serviço de pagamento'
        });
      }

      const preferenceId = result.body.id;
      const linkPagamento = result.body.init_point || result.body.sandbox_init_point;

      if (!linkPagamento) {
        console.error('❌ RESPOSTA INVÁLIDA - Sem link de pagamento:', result.body);
        logger.error('❌ Resposta inválida do Mercado Pago - Sem link:', {
          result: JSON.stringify(result.body, null, 2),
          error: 'Estrutura da resposta inválida - Sem link de pagamento'
        });
        return res.status(500).json({
          error: 'Erro na criação da preferência',
          message: 'Link de pagamento não encontrado na resposta'
        });
      }

      console.log('✅ LINK DE PAGAMENTO OBTIDO:', linkPagamento);
      logger.info('✅ Link de pagamento obtido:', { linkPagamento });

      console.log('💾 SALVANDO NO BANCO...');
      logger.info('💾 Salvando no banco de dados...');
      
      // Salvar no banco de dados
      await query(
        'INSERT INTO pagamentos (user_id, valor, status, preference_id, created_at) VALUES ($1, $2, $3, $4, NOW())',
        [userId, valor, 'pendente', preferenceId]
      );

      console.log('✅ PAGAMENTO GERADO COM SUCESSO');
      logger.info('✅ Pagamento gerado com sucesso', { 
        userId, 
        preferenceId, 
        valor,
        linkPagamento: linkPagamento.substring(0, 50) + '...'
      });

      return res.json({
        success: true,
        data: {
          linkPagamento,
          preferenceId,
          valor,
          userId
        },
        message: 'Pagamento gerado com sucesso'
      });

    } catch (err) {
      console.error('❌ ERRO CAPTURADO:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      
      logger.error('❌ ERRO DETALHADO ao gerar pagamento:', {
        error: err.message,
        stack: err.stack,
        userId: req.body?.userId,
        valor: req.body?.valor,
        mpToken: process.env.MP_TOKEN ? 'CONFIGURADO' : 'NÃO CONFIGURADO',
        nodeEnv: process.env.NODE_ENV
      });

      return res.status(500).json({
        error: 'Erro ao gerar pagamento',
        message: process.env.NODE_ENV === 'production' 
          ? 'Erro interno do servidor' 
          : err.message
      });
    }
  }
);

// ✅ Verificar pagamento (MELHORADA)
router.post('/verificar-pagamento',
  checkDbConnection,
  validate('verificarPagamento'),
  async (req, res) => {
    const { preferenceId } = req.body;

    try {
      logger.info('Verificando status do pagamento', { preferenceId });

      const result = await query(
        'SELECT status, valor, user_id, created_at FROM pagamentos WHERE preference_id = $1 LIMIT 1',
        [preferenceId]
      );

      if (result.rows.length === 0) {
        logger.warn('Pagamento não encontrado', { preferenceId });
        return res.json({
          success: true,
          data: { status: 'pendente' },
          message: 'Pagamento não encontrado'
        });
      }

      const pagamento = result.rows[0];
      
      logger.info('Status do pagamento verificado', { 
        preferenceId, 
        status: pagamento.status 
      });

      return res.json({
        success: true,
        data: {
          status: pagamento.status,
          valor: pagamento.valor,
          userId: pagamento.user_id,
          createdAt: pagamento.created_at
        },
        message: 'Status verificado com sucesso'
      });

    } catch (err) {
      logger.error('Erro ao verificar pagamento:', {
        error: err.message,
        stack: err.stack,
        preferenceId
      });

      return res.status(500).json({
        error: 'Erro ao verificar pagamento',
        message: process.env.NODE_ENV === 'production' 
          ? 'Erro interno do servidor' 
          : err.message
      });
    }
  }
);

// 👉 Webhook Mercado Pago (MELHORADO)
router.post('/webhook', async (req, res) => {
  const evento = req.body;
  
  logger.info('Webhook recebido', {
    action: evento?.action,
    dataId: evento?.data?.id,
    timestamp: new Date().toISOString()
  });

  try {
    // Verifica se é um evento de atualização de pagamento
    if (evento?.action === 'payment.updated' && evento?.data?.id) {
      const paymentId = evento.data.id;

      logger.info('Processando atualização de pagamento', { paymentId });

      // Consulta os detalhes do pagamento na API do Mercado Pago
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.MP_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (!mpResponse.ok) {
        const errorText = await mpResponse.text();
        logger.error('Erro ao consultar pagamento no Mercado Pago', {
          status: mpResponse.status,
          error: errorText,
          paymentId
        });
        return res.status(500).json({
          error: 'Erro ao consultar pagamento',
          message: 'Falha na comunicação com Mercado Pago'
        });
      }

      const paymentData = await mpResponse.json();
      const status = paymentData.status;
      const userId = paymentData.external_reference;

      logger.info('Dados do pagamento obtidos', {
        paymentId,
        status,
        userId,
        amount: paymentData.transaction_amount
      });

      if (userId) {
        // Atualiza o status do pagamento
        await query(
          `UPDATE pagamentos 
           SET status = $1, updated_at = NOW()
           WHERE preference_id = (
             SELECT preference_id FROM pagamentos 
             WHERE user_id = $2 
             ORDER BY created_at DESC 
             LIMIT 1
           )`,
          [status, userId]
        );

        logger.info('Pagamento atualizado com sucesso', {
          paymentId,
          userId,
          status
        });
      } else {
        logger.warn('external_reference não encontrado', { paymentData });
      }

      return res.status(200).json({
        success: true,
        message: 'Webhook processado com sucesso'
      });
    }

    logger.info('Evento de webhook ignorado (não é payment.updated)');
    return res.status(200).json({
      success: true,
      message: 'Evento ignorado'
    });

  } catch (err) {
    logger.error('Erro ao processar webhook:', {
      error: err.message,
      stack: err.stack,
      evento
    });

    return res.status(500).json({
      error: 'Erro interno no servidor',
      message: 'Falha ao processar webhook'
    });
  }
});

// 👉 Listar histórico de cálculos (MELHORADA)
router.get('/calculos/:userId',
  checkDbConnection,
  validateParams('userId'),
  async (req, res) => {
    const { userId } = req.params;

    try {
      logger.info('Buscando histórico de cálculos', { userId });

      const result = await query(
        `SELECT dp, cfsd, nep, dem, nota_final, created_at 
         FROM calculos 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT 10`,
        [userId]
      );

      const formatted = result.rows.map(row => ({
        date: row.created_at,
        result: row.nota_final,
        details: {
          desempenhoProfissional: row.dp,
          notaCFSD: row.cfsd,
          escolaridade: row.nep,
          demerito: row.dem
        }
      }));

      logger.info('Histórico de cálculos retornado', {
        userId,
        count: formatted.length
      });

      res.json({
        success: true,
        data: formatted,
        message: 'Histórico carregado com sucesso'
      });

    } catch (err) {
      logger.error('Erro ao buscar histórico:', {
        error: err.message,
        stack: err.stack,
        userId
      });

      res.status(500).json({
        error: 'Erro ao buscar histórico',
        message: process.env.NODE_ENV === 'production' 
          ? 'Erro interno do servidor' 
          : err.message
      });
    }
  }
);

// 👉 Salvar cálculo da nota (MELHORADA)
router.post('/salvar-calculo',
  checkDbConnection,
  validate('salvarCalculo'),
  async (req, res) => {
    const { userId, dp, cfsd, nep, dem, resultado } = req.body;

    try {
      logger.info('Salvando cálculo', { userId, resultado });

      await query(
        `INSERT INTO calculos (user_id, dp, cfsd, nep, dem, nota_final, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [userId, dp, cfsd, nep, dem, resultado]
      );

      logger.info('Cálculo salvo com sucesso', { userId, resultado });

      res.json({
        success: true,
        message: 'Cálculo salvo com sucesso'
      });

    } catch (err) {
      logger.error('Erro ao salvar cálculo:', {
        error: err.message,
        stack: err.stack,
        userId,
        resultado
      });

      res.status(500).json({
        error: 'Erro ao salvar cálculo',
        message: process.env.NODE_ENV === 'production' 
          ? 'Erro interno do servidor' 
          : err.message
      });
    }
  }
);

// 👉 Excluir histórico de cálculo (MELHORADA)
router.delete('/calculos/:userId',
  checkDbConnection,
  validateParams('userId'),
  async (req, res) => {
    const { userId } = req.params;

    try {
      logger.info('Excluindo histórico de cálculos', { userId });

      const result = await query(
        'DELETE FROM calculos WHERE user_id = $1',
        [userId]
      );

      logger.info('Histórico excluído com sucesso', {
        userId,
        deletedCount: result.rowCount
      });

      res.json({
        success: true,
        data: {
          deletedCount: result.rowCount
        },
        message: `Histórico de cálculos do usuário ${userId} excluído com sucesso.`
      });

    } catch (err) {
      logger.error('Erro ao excluir histórico:', {
        error: err.message,
        stack: err.stack,
        userId
      });

      res.status(500).json({
        error: 'Erro ao excluir histórico',
        message: process.env.NODE_ENV === 'production' 
          ? 'Erro interno do servidor' 
          : err.message
      });
    }
  }
);

module.exports = router;