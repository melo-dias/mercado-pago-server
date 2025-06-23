const express = require('express');
const cors = require('cors');
const pagamentoRoutes = require('./routes/pagamento');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', pagamentoRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));