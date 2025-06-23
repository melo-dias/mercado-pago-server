const express = require('express');
const router = express.Router();
const { MercadoPagoConfig, Preference } = require('mercadopago');
const db = require('../lib/db'); // conexão PostgreSQL

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_TOKEN || 'SUA_CHAVE_DO_MERCADO_PAGO',
});

const preference = new Preference(client);

// 👉 Verificar pagamento (padrão: pendente)
router.post('/verificar-pagamento', async (req, res) => {
  const { userId } = req.body;
  try {
    // Aqui você pode buscar do banco se quiser futuramente
    return res.json({ status: 'pendente' });
  } catch (err) {
    console.error('Erro ao verificar pagamento', err);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// 👉 Gerar pagamento Mercado Pago
router.post('/gerar-pagamento', async (req, res) => {
  const { userId, valor } = req.body;
  try {
    const result = await preference.create({
      body: {
        items: [{
          title: 'Acesso ao cálculo da nota',
          quantity: 1,
          currency_id: 'BRL',
          unit_price: parseFloat(valor)
        }],
        metadata: { userId },
        back_urls: {
          success: 'https://seu-site.com/sucesso',
          failure: 'https://seu-site.com/erro',
          pending: 'https://seu-site.com/pendente'
        },
        auto_return: 'approved',
        external_reference: userId
      }
    });

    await db.query(
      'INSERT INTO pagamentos (user_id, valor, status, preference_id) VALUES ($1, $2, $3, $4)',
      [userId, valor, 'pendente', result.id]
    );

    res.json({ linkPagamento: result.init_point });
  } catch (err) {
    console.error('Erro ao gerar pagamento:', err);
    res.status(500).json({ error: 'Erro ao gerar pagamento' });
  }
});

// 👉 Webhook Mercado Pago
router.post('/webhook', async (req, res) => {
  const evento = req.body;

  try {
    await db.query(
      'INSERT INTO pagamentos (user_id, valor, status, preference_id) VALUES ($1, $2, $3, $4)',
      [
        evento?.data?.user_id || 'desconhecido',
        0,
        'webhook_evento',
        evento?.data?.id || null
      ]
    );
    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Erro ao registrar webhook:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// 👉 Salvar cálculo da nota
router.post('/salvar-calculo', async (req, res) => {
  const { userId, dp, cfsd, nep, dem, resultado } = req.body;
  try {
    await db.query(
      `INSERT INTO calculos (user_id, dp, cfsd, nep, dem, nota_final) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, dp, cfsd, nep, dem, resultado]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao salvar cálculo:', err);
    res.status(500).json({ error: 'Erro ao salvar cálculo' });
  }
});

module.exports = router;
