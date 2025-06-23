const express = require('express');
const router = express.Router();
const { MercadoPagoConfig, Preference } = require('mercadopago');
const db = require('../lib/db'); // conexão PostgreSQL
const fetch = require('node-fetch');

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_TOKEN || 'SUA_CHAVE_DO_MERCADO_PAGO',
});

const preference = new Preference(client);

// 👉 Verificar pagamento (consulta no banco)
router.post('/verificar-pagamento', async (req, res) => {
  const { userId } = req.body;
  try {
    const result = await db.query(
      'SELECT status FROM pagamentos WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({ status: 'pendente' });
    }

    return res.json({ status: result.rows[0].status });
  } catch (err) {
    console.error('Erro ao verificar pagamento', err);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// 👉 Gerar pagamento com Mercado Pago
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

// 👉 Webhook Mercado Pago (atualiza status no banco)
router.post('/webhook', async (req, res) => {
  const evento = req.body;
  console.log('Webhook recebido:', JSON.stringify(evento, null, 2)); // debug

  try {
    if (
      evento?.action === 'payment.updated' &&
      evento?.data?.id
    ) {
      const paymentId = evento.data.id;

      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          Authorization: `Bearer ${process.env.MP_TOKEN}`
        }
      });

      if (!mpResponse.ok) {
        console.error('Erro ao consultar o pagamento na API do Mercado Pago');
        return res.status(500).json({ error: 'Erro ao consultar pagamento' });
      }

      const paymentData = await mpResponse.json();
      const preferenceId = paymentData.preference_id || paymentData.order?.id;
      const status = paymentData.status;

      if (preferenceId) {
        await db.query(
          'UPDATE pagamentos SET status = $1 WHERE preference_id = $2',
          [status, preferenceId]
        );
        console.log(`Pagamento ${paymentId} atualizado para status: ${status}`);
      }

      return res.status(200).json({ updated: true });
    }

    return res.status(400).json({ error: 'Formato de webhook inválido' });
  } catch (err) {
    console.error('Erro ao registrar webhook:', err);
    return res.status(500).json({ error: 'Erro interno no webhook' });
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
