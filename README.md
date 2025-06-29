# 🚀 Servidor Mercado Pago - Calculadora Aeronáutica

Servidor Node.js otimizado para integração com Mercado Pago, com sistema de logs estruturados, validação robusta e tratamento de erros avançado.

## ✨ **Melhorias Implementadas**

- ✅ **Logs estruturados** com Winston
- ✅ **Validação de dados** com Joi
- ✅ **Segurança** com Helmet e Rate Limiting
- ✅ **Tratamento de erros** robusto
- ✅ **Monitoramento** de conexões com banco
- ✅ **CORS configurado** para produção
- ✅ **Health check** endpoint
- ✅ **Variáveis de ambiente** organizadas

## 🛠️ **Instalação**

```bash
# Instalar dependências
npm install

# Copiar arquivo de configuração
cp env.example .env

# Configurar variáveis de ambiente no .env
```

## ⚙️ **Configuração**

### Variáveis de Ambiente (.env)

```env
# Banco de Dados PostgreSQL
DATABASE_URL=postgresql://usuario:senha@localhost:5432/nome_do_banco

# Token do Mercado Pago
MP_TOKEN=TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# URLs de Redirecionamento
SUCCESS_URL=https://calculadora-aeronautica.vercel.app/pagamento/sucesso
FAILURE_URL=https://calculadora-aeronautica.vercel.app/pagamento/erro
PENDING_URL=https://calculadora-aeronautica.vercel.app/pagamento/pendente

# URL do Webhook
WEBHOOK_URL=https://seu-dominio.com/api/webhook

# Ambiente
NODE_ENV=production
PORT=3000
```

### Estrutura do Banco de Dados

```sql
-- Tabela de pagamentos
CREATE TABLE pagamentos (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pendente',
    preference_id VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de cálculos
CREATE TABLE calculos (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    dp DECIMAL(5,2) NOT NULL,
    cfsd DECIMAL(5,2) NOT NULL,
    nep DECIMAL(5,2) NOT NULL,
    dem DECIMAL(5,2) NOT NULL,
    nota_final DECIMAL(5,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## 🚀 **Execução**

```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

## 📡 **Rotas da API**

### Base URL: `https://seu-dominio.com/api`

---

### 1. **Gerar Pagamento**
```http
POST /gerar-pagamento
```

**Body:**
```json
{
  "userId": "user123",
  "valor": 29.90
}
```

**Resposta de Sucesso:**
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

---

### 2. **Verificar Status do Pagamento**
```http
POST /verificar-pagamento
```

**Body:**
```json
{
  "preferenceId": "123456789"
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "status": "approved",
    "valor": 29.90,
    "userId": "user123",
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "message": "Status verificado com sucesso"
}
```

---

### 3. **Salvar Cálculo**
```http
POST /salvar-calculo
```

**Body:**
```json
{
  "userId": "user123",
  "dp": 85.5,
  "cfsd": 78.2,
  "nep": 92.0,
  "dem": 0,
  "resultado": 87.8
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "Cálculo salvo com sucesso"
}
```

---

### 4. **Listar Histórico de Cálculos**
```http
GET /calculos/:userId
```

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2024-01-15T10:30:00Z",
      "result": 87.8,
      "details": {
        "desempenhoProfissional": 85.5,
        "notaCFSD": 78.2,
        "escolaridade": 92.0,
        "demerito": 0
      }
    }
  ],
  "message": "Histórico carregado com sucesso"
}
```

---

### 5. **Excluir Histórico de Cálculos**
```http
DELETE /calculos/:userId
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "deletedCount": 5
  },
  "message": "Histórico de cálculos do usuário user123 excluído com sucesso."
}
```

---

### 6. **Webhook Mercado Pago**
```http
POST /webhook
```

**Configuração no Mercado Pago:**
- URL: `https://seu-dominio.com/api/webhook`
- Eventos: `payment.updated`

---

### 7. **Health Check**
```http
GET /health
```

**Resposta:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00Z",
  "environment": "production"
}
```

## 🔧 **Configuração no Frontend**

### Exemplo de uso com fetch:

```javascript
// Gerar pagamento
const gerarPagamento = async (userId, valor) => {
  try {
    const response = await fetch('https://seu-dominio.com/api/gerar-pagamento', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, valor })
    });
    
    const data = await response.json();
    
    if (data.success) {
      window.location.href = data.data.linkPagamento;
    } else {
      console.error('Erro:', data.error);
    }
  } catch (error) {
    console.error('Erro na requisição:', error);
  }
};

// Verificar pagamento
const verificarPagamento = async (preferenceId) => {
  try {
    const response = await fetch('https://seu-dominio.com/api/verificar-pagamento', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ preferenceId })
    });
    
    const data = await response.json();
    
    if (data.success) {
      return data.data.status;
    }
  } catch (error) {
    console.error('Erro ao verificar pagamento:', error);
  }
};
```

## 📊 **Logs e Monitoramento**

Os logs são salvos em arquivos separados:
- `combined.log` - Todos os logs
- `error.log` - Apenas erros
- `pagamento-combined.log` - Logs específicos de pagamento
- `pagamento-error.log` - Erros de pagamento
- `db-combined.log` - Logs do banco de dados
- `db-error.log` - Erros do banco de dados

## 🚨 **Tratamento de Erros**

Todas as rotas retornam respostas padronizadas:

**Erro de Validação:**
```json
{
  "error": "Dados inválidos",
  "details": [
    {
      "field": "valor",
      "message": "\"valor\" must be a positive number"
    }
  ]
}
```

**Erro Interno:**
```json
{
  "error": "Erro ao gerar pagamento",
  "message": "Erro interno do servidor"
}
```

## 🔒 **Segurança**

- **Rate Limiting**: 100 requests por IP a cada 15 minutos
- **Helmet**: Headers de segurança
- **CORS**: Configurado para domínios específicos
- **Validação**: Todos os dados são validados com Joi
- **Logs**: Monitoramento de todas as requisições

## 🚀 **Deploy no Railway**

1. Conecte seu repositório GitHub ao Railway
2. Configure as variáveis de ambiente no Railway
3. O deploy será automático a cada push

**Variáveis necessárias no Railway:**
- `DATABASE_URL`
- `MP_TOKEN`
- `NODE_ENV=production`
- `WEBHOOK_URL` (URL do seu app no Railway)

## 📝 **Changelog**

### v2.0.0
- ✅ Logs estruturados com Winston
- ✅ Validação robusta com Joi
- ✅ Middlewares de segurança
- ✅ Tratamento de erros melhorado
- ✅ Monitoramento de banco de dados
- ✅ Rate limiting
- ✅ Health check endpoint
- ✅ Respostas padronizadas
- ✅ Configuração de ambiente

---

**Desenvolvido com ❤️ para a Calculadora Aeronáutica** 