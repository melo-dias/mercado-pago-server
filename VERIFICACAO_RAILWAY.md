# 🔧 Verificação de Configuração no Railway

## ✅ **Status Atual**
- ✅ Servidor está funcionando
- ✅ Deploy realizado com sucesso
- ✅ Rotas protegidas (erro 404 na raiz é normal)

## ⚙️ **Variáveis Necessárias no Railway**

### **1. Acesse o Railway Dashboard**
- Vá para [railway.app](https://railway.app)
- Selecione seu projeto "mercado-pago-server"

### **2. Configure as Variáveis**
Vá em **"Variables"** e adicione:

| Variável | Valor | Status |
|----------|-------|--------|
| `DATABASE_URL` | (Railway fornece automaticamente) | ✅ |
| `MP_TOKEN` | `TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` | ⚠️ |
| `NODE_ENV` | `production` | ⚠️ |
| `WEBHOOK_URL` | `https://mercado-pago-server-production.up.railway.app/api/webhook` | ⚠️ |

### **3. Como Adicionar Variáveis**
1. **Clique em "Variables"**
2. **Clique em "New Variable"**
3. **Digite o nome e valor**
4. **Clique em "Add"**

## 🧪 **Testes de Verificação**

### **Teste 1: Health Check**
```bash
curl https://mercado-pago-server-production.up.railway.app/health
```

**Resposta Esperada:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00Z",
  "environment": "production"
}
```

### **Teste 2: Gerar Pagamento**
```bash
curl -X POST https://mercado-pago-server-production.up.railway.app/api/gerar-pagamento \
  -H "Content-Type: application/json" \
  -d '{"userId": "teste", "valor": 29.90}'
```

**Resposta Esperada:**
```json
{
  "success": true,
  "data": {
    "linkPagamento": "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=...",
    "preferenceId": "123456789",
    "valor": 29.90,
    "userId": "teste"
  },
  "message": "Pagamento gerado com sucesso"
}
```

## 🚨 **Possíveis Problemas**

### **Erro 500 - Token do Mercado Pago**
Se aparecer erro 500 ao gerar pagamento:
- Verifique se `MP_TOKEN` está configurado
- Use token de TEST primeiro: `TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

### **Erro de Banco de Dados**
Se aparecer erro de conexão:
- Verifique se `DATABASE_URL` está configurado
- Railway deve fornecer automaticamente

### **Erro de CORS**
Se aparecer erro de CORS no frontend:
- Verifique se o domínio do frontend está no CORS
- Configure `SUCCESS_URL`, `FAILURE_URL`, `PENDING_URL`

## 📊 **Logs do Railway**

### **Como Ver os Logs**
1. **No Railway Dashboard**
2. **Selecione seu projeto**
3. **Vá em "Deployments"**
4. **Clique no deployment mais recente**
5. **Veja os logs em tempo real**

### **Logs Importantes**
- ✅ "🚀 Servidor rodando na porta 3000"
- ✅ "🌍 Ambiente: production"
- ✅ "🔗 Health check: http://localhost:3000/health"

## 🎯 **Próximos Passos**

1. **Configure as variáveis** no Railway
2. **Teste o Health Check** no navegador
3. **Use a coleção do Postman** para testes completos
4. **Configure o webhook** no Mercado Pago
5. **Teste o fluxo completo** de pagamento

## 🔗 **URLs Importantes**

- **Servidor:** `https://mercado-pago-server-production.up.railway.app`
- **Health Check:** `https://mercado-pago-server-production.up.railway.app/health`
- **API Base:** `https://mercado-pago-server-production.up.railway.app/api`
- **Webhook:** `https://mercado-pago-server-production.up.railway.app/api/webhook`

---

**🎉 Seu servidor está funcionando! Agora é só configurar as variáveis e testar!** 