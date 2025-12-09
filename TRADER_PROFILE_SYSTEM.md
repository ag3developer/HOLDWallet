# 🏢 Sistema de Perfil de Negociador P2P

## Visão Geral

Um usuário que cria anúncios na P2P agora pode criar um **Perfil de Negociador** profissional, permitindo que outros usuários vejam suas estatísticas, histórico e reputação antes de negociar.

## ✨ Features Implementadas

### 1. **Modelo de Dados (TraderProfile)**

```python
- id (UUID)
- user_id (FK)
- display_name (Nome do negociador)
- avatar_url (Foto/Avatar)
- bio (Descrição)
- is_verified (Verificado pela plataforma)
- verification_level (unverified, basic, advanced, premium)
- total_trades (Total de negociações)
- completed_trades (Negociações completadas)
- success_rate (Taxa de sucesso 0-100%)
- average_rating (Classificação média 0-5)
- total_reviews (Total de avaliações)
- auto_accept_orders (Auto-aceitar pedidos)
- min_order_amount (Valor mínimo em BRL)
- max_order_amount (Valor máximo em BRL)
- accepted_payment_methods (Métodos aceitos)
- average_response_time (Tempo médio de resposta)
- is_active (Perfil ativo)
- is_blocked (Perfil bloqueado)
```

### 2. **Estatísticas Diárias (TraderStats)**

Rastreia métricas diárias para análise:

- Negociações completadas
- Volume total em BRL
- Taxa de sucesso do dia
- Classificação média do dia
- Novas avaliações
- Disputas

### 3. **Endpoints da API**

#### Criar Perfil de Negociador

```
POST /api/v1/trader-profiles
Content-Type: application/json
Authorization: Bearer {token}

{
  "display_name": "João Trader",
  "bio": "Negociador confiável com 5 anos de experiência",
  "avatar_url": "https://example.com/avatar.jpg",
  "min_order_amount": 100,
  "max_order_amount": 50000,
  "accepted_payment_methods": "PIX,TED,DOC",
  "auto_accept_orders": true
}
```

#### Obter Meu Perfil

```
GET /api/v1/trader-profiles/me
Authorization: Bearer {token}
```

#### Atualizar Meu Perfil

```
PUT /api/v1/trader-profiles/me
Content-Type: application/json
Authorization: Bearer {token}

{
  "display_name": "João Trader Profissional",
  "bio": "Agora com 6 anos de experiência!",
  "max_order_amount": 100000
}
```

#### Obter Perfil Público

```
GET /api/v1/trader-profiles/{profile_id}
```

Resposta:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "display_name": "João Trader",
  "avatar_url": "https://example.com/avatar.jpg",
  "bio": "Negociador confiável",
  "is_verified": true,
  "verification_level": "advanced",
  "total_trades": 150,
  "completed_trades": 145,
  "success_rate": 96.67,
  "average_rating": 4.8,
  "total_reviews": 142,
  "created_at": "2025-01-01T10:00:00"
}
```

#### Listar Negociadores

```
GET /api/v1/trader-profiles?sort_by=success_rate&order=desc&limit=20&verified_only=true
```

Parâmetros:

- `skip` - Paginação (padrão: 0)
- `limit` - Limite por página (padrão: 10, máx: 100)
- `sort_by` - success_rate, average_rating, total_trades, created_at
- `order` - asc, desc
- `verified_only` - Apenas negociadores verificados

#### Obter Estatísticas do Negociador

```
GET /api/v1/trader-profiles/{profile_id}/stats?days=30
```

## 🗄️ Estrutura de Banco de Dados

### Tabela: trader_profiles

```sql
CREATE TABLE trader_profiles (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES users(id),
  display_name VARCHAR(100) NOT NULL,
  avatar_url VARCHAR(500),
  bio TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  verification_level VARCHAR(20) DEFAULT 'unverified',

  -- Statistics
  total_trades INTEGER DEFAULT 0,
  completed_trades INTEGER DEFAULT 0,
  success_rate FLOAT DEFAULT 0.0,
  average_rating FLOAT DEFAULT 0.0,
  total_reviews INTEGER DEFAULT 0,

  -- Settings
  auto_accept_orders BOOLEAN DEFAULT FALSE,
  min_order_amount FLOAT,
  max_order_amount FLOAT,
  accepted_payment_methods VARCHAR(500),
  average_response_time INTEGER,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_blocked BOOLEAN DEFAULT FALSE,

  created_at DATETIME DEFAULT NOW(),
  updated_at DATETIME DEFAULT NOW() ON UPDATE NOW()
);

CREATE TABLE trader_stats (
  id UUID PRIMARY KEY,
  trader_id UUID NOT NULL REFERENCES trader_profiles(id),
  date DATETIME DEFAULT NOW(),

  trades_completed INTEGER DEFAULT 0,
  total_volume_brl FLOAT DEFAULT 0.0,
  success_rate FLOAT DEFAULT 0.0,
  average_rating FLOAT DEFAULT 0.0,
  new_reviews INTEGER DEFAULT 0,
  disputes INTEGER DEFAULT 0,

  created_at DATETIME DEFAULT NOW(),

  INDEX idx_trader_date (trader_id, date)
);
```

## 🎯 Fluxo de Uso

### 1. Criar Perfil de Negociador

1. Usuário acessa: `/p2p/trader-setup` (nova página)
2. Preenche formulário com dados básicos:
   - Nome do negociador
   - Bio/Descrição
   - Avatar (upload ou URL)
   - Limites de ordem
   - Métodos de pagamento aceitos
   - Preferências (auto-aceitar, horários, etc)
3. Clica "Criar Perfil"
4. Perfil criado com estatísticas zeradas
5. Será atualizado automaticamente conforme negocições forem completadas

### 2. Visualizar Perfil (Público)

1. Na página de anúncios P2P
2. Clicar no nome/avatar do negociador
3. Ver perfil público com:
   - Foto e nome
   - Taxa de sucesso e classificação
   - Número de negociações
   - Bio
   - Métodos aceitos
   - Limite de ordem (se aplicável)

### 3. Atualizar Perfil

1. Usuário acessa `/p2p/trader-profile/edit`
2. Edita informações
3. Salva mudanças

## 📊 Atualização de Estatísticas

Quando uma negociação é **completada**:

```
1. Ambos (comprador e vendedor) recebem reputação
2. Se avaliação positiva:
   - success_rate += 1
   - average_rating = média das novas reviews
   - total_reviews += 1
3. Se avaliação negativa:
   - total_reviews += 1
   - average_rating reduz
4. Stats diários são atualizadas
```

## 🔐 Níveis de Verificação

| Nível          | Requisitos                          | Benefícios              |
| -------------- | ----------------------------------- | ----------------------- |
| **Unverified** | Criar conta                         | Acesso básico           |
| **Basic**      | Email verificado                    | Badge de confiança      |
| **Advanced**   | ID verificado + 50+ trades          | Limite de ordem maior   |
| **Premium**    | ID + banco verificado + 200+ trades | Limite máximo, destaque |

## 🎨 Componentes Frontend (A implementar)

### Páginas Novas:

- `/p2p/trader-setup` - Criar perfil
- `/p2p/trader-profile/:id` - Visualizar perfil público
- `/p2p/trader-profile/edit` - Editar meu perfil

### Componentes:

- `TraderProfileCard` - Card mostrando negociador
- `TraderProfileView` - Visualização completa
- `TraderProfileForm` - Formulário de criação/edição
- `TraderStats` - Gráfico de estatísticas

## 📈 Exemplo de Resposta da API

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "660e8400-e29b-41d4-a716-446655440001",
  "display_name": "João Trader Profissional",
  "avatar_url": "https://example.com/avatars/joao.jpg",
  "bio": "Negociador com 5 anos de experiência, especializado em Bitcoin",
  "is_verified": true,
  "verification_level": "advanced",

  "total_trades": 342,
  "completed_trades": 335,
  "success_rate": 97.95,
  "average_rating": 4.8,
  "total_reviews": 328,

  "auto_accept_orders": true,
  "min_order_amount": 100.0,
  "max_order_amount": 100000.0,
  "accepted_payment_methods": "PIX,TED,DOC,Transferência Bancária",
  "average_response_time": 120,

  "is_active": true,
  "is_blocked": false,

  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2025-12-08T15:45:30Z"
}
```

## 🚀 Próximas Etapas

1. ✅ Modelos de banco de dados criados
2. ✅ Schemas Pydantic criados
3. ✅ Endpoints da API criados
4. ⏳ Componentes Frontend
5. ⏳ Integração com sistema de reputação
6. ⏳ Dashboard de estatísticas
7. ⏳ Verificação de identidade
8. ⏳ Sistema de badge/selo

## 💡 Benefícios

- **Para Compradores**: Podem ver histórico e reputação antes de negociar
- **Para Vendedores**: Constroem reputação profissional
- **Para Plataforma**: Aumenta confiança e segurança
- **Gamificação**: Incentiva bom comportamento
