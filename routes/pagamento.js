// pagamento.js
const express = require('express');
const router = express.Router();
const { MercadoPagoConfig, Preference } = require('mercadopago');
const db = require('../lib/db');
const fetch = require('node-fetch');

// ✅ Configuração correta para SDK v3
const mp = new MercadoPagoConfig({
  accessToken: process.env.MP_TOKEN || 'SUA_CHAVE_DO_MERCADO_PAGO',
});
const preference = new Preference(mp);

// ✅ Rota corrigida
router.post('/gerar-pagamento', async (req, res) => {
  const { userId, valor } = req.body;

  try {
    const valorConvertido = parseFloat(valor);
    if (!userId || isNaN(valorConvertido)) {
      return res.status(400).json({ error: 'Parâmetros inválidos: userId ou valor' });
    }

    const preferenceData = {
      items: [
        {
          title: 'Acesso ao cálculo da nota',
          quantity: 1,
          currency_id: 'BRL',
          unit_price: valorConvertido
        }
      ],
      metadata: { userId },
      back_urls: {
        success: 'https://google.com?resultado=sucesso',
        failure: 'https://google.com?resultado=erro',
        pending: 'https://google.com?resultado=pendente'
      },
      auto_return: 'approved',
      external_reference: userId
    };

    // ⚠️ AQUI: o body precisa estar dentro de { body: ... }
    const result = await preference.create({ body: preferenceData });

    const preferenceId = result.body.id;
    const linkPagamento = result.body.init_point;

    if (!preferenceId || !linkPagamento) {
      console.error('❌ Resposta inválida do Mercado Pago:', result.body);
      return res.status(500).json({ error: 'Erro na criação da preferência' });
    }

    await db.query(
      'INSERT INTO pagamentos (user_id, valor, status, preference_id) VALUES ($1, $2, $3, $4)',
      [userId, valorConvertido, 'pendente', preferenceId]
    );

    return res.json({ linkPagamento, preferenceId });

  } catch (err) {
    console.error('❌ Erro ao gerar pagamento:', err);
    return res.status(500).json({ error: 'Erro ao gerar pagamento' });
  }
});

// ✅ Verificar pagamento
router.post('/verificar-pagamento', async (req, res) => {
  const { preferenceId } = req.body;

  if (!preferenceId) {
    return res.status(400).json({ error: 'preferenceId é obrigatório' });
  }

  try {
    const result = await db.query(
      'SELECT status FROM pagamentos WHERE preference_id = $1 LIMIT 1',
      [preferenceId]
    );

    if (result.rows.length === 0) {
      return res.json({ status: 'pendente' });
    }

    return res.json({ status: result.rows[0].status });
  } catch (err) {
    console.error('Erro ao verificar pagamento:', err);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// 👉 Webhook Mercado Pago (atualiza status no banco)
router.post('/webhook', async (req, res) => {
  const evento = req.body;
  console.log('📥 Webhook recebido:', JSON.stringify(evento, null, 2)); // log para debug

  try {
    // Verifica se é um evento de atualização de pagamento
    if (
      evento?.action === 'payment.updated' &&
      evento?.data?.id
    ) {
      const paymentId = evento.data.id;

      // Consulta os detalhes completos do pagamento na API do Mercado Pago
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          Authorization: `Bearer ${process.env.MP_TOKEN}`
        }
      });

      if (!mpResponse.ok) {
        console.error('❌ Erro ao consultar o pagamento na API do Mercado Pago');
        return res.status(500).json({ error: 'Erro ao consultar pagamento' });
      }

      const paymentData = await mpResponse.json();

      const status = paymentData.status; // ex: "approved"
      const userId = paymentData.external_reference; // ID que você passou na criação do pagamento

      if (userId) {
        // Atualiza o status do último pagamento do usuário
        await db.query(
          `UPDATE pagamentos 
           SET status = $1 
           WHERE id = (
             SELECT id FROM pagamentos 
             WHERE user_id = $2 
             ORDER BY created_at DESC 
             LIMIT 1
           )`,
          [status, userId]
        );

        console.log(`✅ Pagamento ${paymentId} do usuário ${userId} atualizado para status: ${status}`);
      } else {
        console.warn('⚠️ external_reference (userId) não encontrado no paymentData:', paymentData);
      }

      return res.status(200).json({ updated: true });
    }

    return res.status(400).json({ error: 'Evento de webhook inválido ou irrelevante' });
  } catch (err) {
    console.error('❌ Erro ao processar webhook:', err);
    return res.status(500).json({ error: 'Erro interno no servidor ao lidar com webhook' });
  }
});

// 👉 Listar histórico de cálculos de um usuário
router.get('/calculos/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await db.query(
      `SELECT dp, cfsd, nep, dem, nota_final, created_at 
       FROM calculos 
       WHERE user_id = $1 
       ORDER BY created_at DESC LIMIT 10`,
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

    res.json(formatted);
  } catch (err) {
    console.error('Erro ao buscar histórico:', err);
    res.status(500).json({ error: 'Erro ao buscar histórico' });
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

// 👉 Excluir histórico de cálculo de um usuário
router.delete('/calculos/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await db.query(
      'DELETE FROM calculos WHERE user_id = $1',
      [userId]
    );

    res.json({ sucesso: true, mensagem: `Histórico de cálculos do usuário ${userId} excluído.` });
  } catch (err) {
    console.error('Erro ao excluir histórico:', err);
    res.status(500).json({ error: 'Erro ao excluir histórico' });
  }
});


module.exports = router;
