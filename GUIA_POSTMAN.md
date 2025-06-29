# 🚀 Guia de Testes - Postman Collection

## 📥 **Como Importar a Coleção**

1. **Abra o Postman**
2. **Clique em "Import"** (botão no canto superior esquerdo)
3. **Arraste o arquivo** `postman_collection.json` ou clique em "Upload Files"
4. **Selecione o arquivo** e clique em "Import"

## ⚙️ **Configuração Inicial**

### **1. Configure as Variáveis da Coleção**

Após importar, você precisa configurar as variáveis:

1. **Clique no nome da coleção** (Mercado Pago Server)
2. **Vá na aba "Variables"**
3. **Configure as seguintes variáveis:**

| Variável | Valor | Descrição |
|----------|-------|-----------|
| `base_url` | `https://seu-app.railway.app` | URL base do seu servidor |
| `api_base` | `{{base_url}}/api` | URL base da API (não altere) |
| `user_id` | `user123` | ID do usuário para testes |
| `preference_id` | (deixar vazio) | Será preenchido automaticamente |

### **2. Exemplo de Configuração**

```json
{
  "base_url": "https://mercado-pago-server-production.up.railway.app",
  "user_id": "teste_user_001",
  "preference_id": ""
}
```

## 🧪 **Ordem dos Testes**

Execute os testes na seguinte ordem:

### **1. 🔍 Health Check**
- **Método:** GET
- **URL:** `{{base_url}}/health`
- **Descrição:** Verifica se o servidor está funcionando
- **Resposta Esperada:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00Z",
  "environment": "production"
}
```

### **2. 💰 Gerar Pagamento**
- **Método:** POST
- **URL:** `{{api_base}}/gerar-pagamento`
- **Body:**
```json
{
  "userId": "{{user_id}}",
  "valor": 29.90
}
```
- **Resposta Esperada:**
```json
{
  "success": true,
  "data": {
    "linkPagamento": "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=...",
    "preferenceId": "123456789",
    "valor": 29.90,
    "userId": "user123"
  },
  "message": "Pagamento gerado com sucesso"
}
```

### **3. 🔍 Verificar Pagamento**
- **Método:** POST
- **URL:** `{{api_base}}/verificar-pagamento`
- **Body:**
```json
{
  "preferenceId": "{{preference_id}}"
}
```
- **Nota:** O `preference_id` é preenchido automaticamente pelo teste anterior

### **4. 📊 Salvar Cálculo**
- **Método:** POST
- **URL:** `{{api_base}}/salvar-calculo`
- **Body:**
```json
{
  "userId": "{{user_id}}",
  "dp": 85.5,
  "cfsd": 78.2,
  "nep": 92.0,
  "dem": 0,
  "resultado": 87.8
}
```

### **5. 📋 Listar Histórico**
- **Método:** GET
- **URL:** `{{api_base}}/calculos/{{user_id}}`

### **6. 🗑️ Excluir Histórico**
- **Método:** DELETE
- **URL:** `{{api_base}}/calculos/{{user_id}}`

## 🔧 **Testes Especiais**

### **❌ Teste de Validação**
- **Método:** POST
- **URL:** `{{api_base}}/gerar-pagamento`
- **Body:**
```json
{
  "userId": "",
  "valor": -10
}
```
- **Resposta Esperada:** Status 400 com detalhes dos erros

### **🔔 Webhook Simulado**
- **Método:** POST
- **URL:** `{{api_base}}/webhook`
- **Body:**
```json
{
  "action": "payment.updated",
  "data": {
    "id": 123456789
  }
}
```

## 📊 **Executando Todos os Testes**

### **Método 1: Runner do Postman**
1. **Clique em "Runner"** (ícone de play)
2. **Selecione a coleção**
3. **Configure:**
   - **Iterations:** 1
   - **Delay:** 1000ms (entre requests)
4. **Clique em "Run"**

### **Método 2: Execução Manual**
Execute cada teste na ordem listada acima.

## ✅ **Verificando os Resultados**

### **Testes Automáticos**
Cada request tem testes automáticos que verificam:
- ✅ Status code correto
- ✅ Estrutura da resposta
- ✅ Campos obrigatórios
- ✅ Tipos de dados corretos

### **Resultados Esperados**
- **Health Check:** Status 200
- **Gerar Pagamento:** Status 200 com link do Mercado Pago
- **Verificar Pagamento:** Status 200 com status do pagamento
- **Salvar Cálculo:** Status 200
- **Listar Histórico:** Status 200 com array de cálculos
- **Excluir Histórico:** Status 200 com contador de exclusões

## 🚨 **Possíveis Erros e Soluções**

### **Erro 500 - Servidor**
- Verifique se o servidor está rodando
- Verifique as variáveis de ambiente no Railway
- Verifique os logs do servidor

### **Erro 400 - Validação**
- Verifique se os dados estão no formato correto
- Verifique se todos os campos obrigatórios estão preenchidos

### **Erro 404 - Rota não encontrada**
- Verifique se a URL base está correta
- Verifique se o servidor está no Railway

### **Erro de CORS**
- Verifique se o domínio está configurado no CORS
- Verifique se está usando HTTPS

## 🔄 **Testes de Integração**

### **Fluxo Completo de Pagamento**
1. **Gerar Pagamento** → Obter `preference_id`
2. **Verificar Pagamento** → Status "pendente"
3. **Simular Webhook** → Atualizar status
4. **Verificar Pagamento** → Status atualizado

### **Fluxo de Cálculos**
1. **Salvar Cálculo** → Criar novo cálculo
2. **Listar Histórico** → Verificar se foi salvo
3. **Salvar Mais Cálculos** → Adicionar mais dados
4. **Listar Histórico** → Verificar lista completa
5. **Excluir Histórico** → Limpar dados
6. **Listar Histórico** → Verificar se está vazio

## 📝 **Logs e Debug**

### **Verificando Logs**
- Os logs são salvos em arquivos no servidor
- Verifique os logs no Railway para debug
- Use o endpoint `/health` para verificar status

### **Variáveis de Ambiente**
Certifique-se de que estas variáveis estão configuradas no Railway:
- `DATABASE_URL`
- `MP_TOKEN`
- `NODE_ENV=production`
- `WEBHOOK_URL`

## 🎯 **Dicas Importantes**

1. **Sempre execute o Health Check primeiro**
2. **Use IDs únicos para cada teste**
3. **Verifique os logs do servidor**
4. **Teste com dados válidos e inválidos**
5. **Execute o fluxo completo de pagamento**

---

**🎉 Agora você tem uma coleção completa para testar todas as rotas do seu servidor!** 