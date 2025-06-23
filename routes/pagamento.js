
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { MercadoPagoConfig, Preference } = require('mercadopago');

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_TOKEN || 'SUA_CHAVE_DO_MERCADO_PAGO',
});

const preference = new Preference(client);
const dataPath = path.join(__dirname, '../db/pagamentos.json');

function salvarRegistro(dado) {
  let atual = [];
  if (fs.existsSync(dataPath)) {
    atual = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  }
  atual.push({ ...dado, data: new Date().toISOString() });
  fs.writeFileSync(dataPath, JSON.stringify(atual, null, 2));
}

router.post('/verificar-pagamento', async (req, res) => {
  const { userId } = req.body;
  try {
    return res.json({ status: 'pendente' });
  } catch (err) {
    console.error('Erro ao verificar pagamento', err);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

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

    salvarRegistro({
      userId,
      valor,
      preference_id: result.id,
      status: 'aguardando_pagamento'
    });

    res.json({ linkPagamento: result.init_point });
  } catch (err) {
    console.error('Erro ao gerar pagamento:', err);
    res.status(500).json({ error: 'Erro ao gerar pagamento' });
  }
});

// Webhook para Mercado Pago
router.post('/webhook', async (req, res) => {
  const evento = req.body;
  salvarRegistro({ origem: 'webhook', evento });
  res.status(200).json({ received: true });
});

// Rota para salvar cálculo
router.post('/salvar-calculo', async (req, res) => {
  const { userId, dp, cfsd, nep, dem, resultado } = req.body;
  salvarRegistro({
    tipo: 'calculo',
    userId,
    dp,
    cfsd,
    nep,
    dem,
    resultado
  });
  res.json({ ok: true });
});

module.exports = router;
