const Joi = require('joi');

// Schemas de validação
const schemas = {
  // Validação para gerar pagamento
  gerarPagamento: Joi.object({
    userId: Joi.string().required().min(1).max(100),
    valor: Joi.number().positive().required().max(10000)
  }),

  // Validação para verificar pagamento
  verificarPagamento: Joi.object({
    preferenceId: Joi.string().required().min(1).max(100)
  }),

  // Validação para salvar cálculo
  salvarCalculo: Joi.object({
    userId: Joi.string().required().min(1).max(100),
    dp: Joi.number().min(0).max(100).required(),
    cfsd: Joi.number().min(0).max(100).required(),
    nep: Joi.number().min(0).max(100).required(),
    dem: Joi.number().min(0).max(100).required(),
    resultado: Joi.number().min(0).max(100).required()
  }),

  // Validação para userId em parâmetros
  userId: Joi.object({
    userId: Joi.string().required().min(1).max(100)
  })
};

// Middleware de validação
const validate = (schemaName) => {
  return (req, res, next) => {
    console.log('🔍 VALIDAÇÃO: Iniciando validação para schema:', schemaName);
    console.log('📋 VALIDAÇÃO: Dados recebidos:', JSON.stringify(req.body, null, 2));
    
    const schema = schemas[schemaName];
    if (!schema) {
      console.error('❌ VALIDAÇÃO: Schema não encontrado:', schemaName);
      return res.status(500).json({ error: 'Schema de validação não encontrado' });
    }

    const { error, value } = schema.validate(req.body);
    
    if (error) {
      console.error('❌ VALIDAÇÃO: Erro de validação:', {
        schema: schemaName,
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
      
      return res.status(400).json({
        error: 'Dados inválidos',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }

    console.log('✅ VALIDAÇÃO: Dados válidos, prosseguindo...');
    
    // Substitui req.body pelos dados validados
    req.body = value;
    next();
  };
};

// Middleware para validar parâmetros de URL
const validateParams = (schemaName) => {
  return (req, res, next) => {
    console.log('🔍 VALIDAÇÃO PARAMS: Iniciando validação de parâmetros para schema:', schemaName);
    console.log('📋 VALIDAÇÃO PARAMS: Parâmetros recebidos:', JSON.stringify(req.params, null, 2));
    
    const schema = schemas[schemaName];
    if (!schema) {
      console.error('❌ VALIDAÇÃO PARAMS: Schema não encontrado:', schemaName);
      return res.status(500).json({ error: 'Schema de validação não encontrado' });
    }

    const { error, value } = schema.validate(req.params);
    
    if (error) {
      console.error('❌ VALIDAÇÃO PARAMS: Erro de validação:', {
        schema: schemaName,
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
      
      return res.status(400).json({
        error: 'Parâmetros inválidos',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }

    console.log('✅ VALIDAÇÃO PARAMS: Parâmetros válidos, prosseguindo...');
    
    req.params = value;
    next();
  };
};

module.exports = {
  validate,
  validateParams,
  schemas
}; 