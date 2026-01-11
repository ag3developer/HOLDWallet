# WolkPay Frontend Implementation

## Resumo

O frontend do WolkPay foi implementado seguindo o padrão das páginas P2P e InstantTrade, usando apenas ícones do lucide-react (sem emojis).

## Arquivos Criados

### Service

- `Frontend/src/services/wolkpay.ts` - Serviço de API para comunicação com backend

### Páginas

- `Frontend/src/pages/wolkpay/WolkPayPage.tsx` - Página principal (beneficiário autenticado)
- `Frontend/src/pages/wolkpay/WolkPayCheckoutPage.tsx` - Checkout público (pagador)
- `Frontend/src/pages/wolkpay/WolkPayHistoryPage.tsx` - Histórico de faturas
- `Frontend/src/pages/wolkpay/index.ts` - Exports

### Arquivos Modificados

- `Frontend/src/App.tsx` - Adicionadas rotas:

  - `/wolkpay` - Página principal (autenticada)
  - `/wolkpay/history` - Histórico (autenticada)
  - `/wolkpay/checkout/:token` - Checkout público (sem auth)

- `Frontend/src/components/layout/Sidebar.tsx` - Adicionado item "WolkPay" no menu

- `Frontend/src/locales/pt-BR.json` - Traduções em português
- `Frontend/src/locales/en-US.json` - Traduções em inglês

## Funcionalidades

### Página Principal (WolkPayPage)

- Seleção de crypto (BTC, ETH, USDT, etc.)
- Input de valor em BRL ou crypto
- Cálculo automático de taxas (3.65% serviço + 0.15% rede)
- Validação de limites (R$100 - R$15.000)
- Criação de fatura
- Compartilhamento de link

### Checkout Público (WolkPayCheckoutPage)

- Timer de expiração (15 minutos)
- Formulário PF (Pessoa Física):
  - Nome completo, CPF, data nascimento, telefone, email
- Formulário PJ (Pessoa Jurídica):
  - Razão social, CNPJ, telefone, email
  - Dados do responsável legal
- Formulário de endereço com busca CEP
- Aceite de termos
- Geração de PIX (QR Code e código copia-cola)
- Polling de status de pagamento
- Oferta de conversão para conta WolkNow

### Histórico (WolkPayHistoryPage)

- Lista de faturas
- Filtros por status
- Copiar link de compartilhamento
- Cancelamento de faturas pendentes
- Paginação

## Rotas da API

### Autenticadas (Beneficiário)

- `POST /wolkpay/invoice` - Criar fatura
- `GET /wolkpay/my-invoices` - Listar faturas
- `GET /wolkpay/invoice/{id}` - Detalhes da fatura
- `POST /wolkpay/invoice/{id}/cancel` - Cancelar fatura

### Públicas (Checkout)

- `GET /wolkpay/checkout/{token}` - Dados do checkout
- `POST /wolkpay/checkout/{token}/payer` - Salvar dados do pagador
- `POST /wolkpay/checkout/{token}/pay` - Gerar PIX
- `GET /wolkpay/checkout/{token}/status` - Status do pagamento
- `GET /wolkpay/checkout/{token}/conversion-eligibility` - Elegibilidade para conversão
- `POST /wolkpay/checkout/{token}/create-account` - Criar conta
- `GET /wolkpay/checkout/{token}/benefits-info` - Benefícios da conta

## Design

- Seguiu o padrão visual de P2P e InstantTrade
- Cards com bordas arredondadas (rounded-2xl)
- Gradientes para CTAs principais
- Cores consistentes (blue-600, green-500, etc.)
- Dark mode suportado
- Responsivo (mobile-first)
- Apenas ícones lucide-react

## Status

✅ Service de API criado
✅ Páginas criadas
✅ Rotas configuradas
✅ Menu atualizado
✅ Traduções adicionadas
