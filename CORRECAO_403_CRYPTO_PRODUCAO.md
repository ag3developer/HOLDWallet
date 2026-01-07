# Correção do Problema 403 ao Enviar Crypto em Produção

## Problema Identificado

O token biométrico estava sendo armazenado apenas **na memória** (`_biometric_tokens: Dict`), que é perdida toda vez que o servidor reinicia ou redeploy é feito.

## Solução Implementada

1. ✅ Criado modelo `BiometricToken` no banco de dados
2. ✅ Atualizado `webauthn_service.py` para usar banco de dados
3. ⏳ **PENDENTE**: Criar tabela no banco de dados de produção

---

## 🔐 SEGURANÇA DA SOLUÇÃO

### Sim, é seguro! Aqui estão as proteções implementadas:

| Proteção                     | Descrição                                                                                           |
| ---------------------------- | --------------------------------------------------------------------------------------------------- |
| **Single-use (uso único)**   | Token é marcado como `is_used = True` após verificação. Não pode ser reutilizado.                   |
| **Expiração curta**          | Token expira em ~5 minutos. Após isso, é rejeitado e deletado.                                      |
| **Vinculado ao usuário**     | Token só funciona para o `user_id` que o gerou.                                                     |
| **Substitui tokens antigos** | Quando um novo token é gerado, TODOS os tokens anteriores do usuário são **deletados/invalidados**. |
| **Token único (UUID)**       | Formato `bio_uuid4` impossível de adivinhar.                                                        |

### Fluxo de renovação de token:

```
1. Usuário solicita envio de crypto
2. Sistema pede autenticação biométrica
3. Usuário autentica com biometria (FaceID/TouchID)
4. Sistema gera novo token: bio_abc123...
   └── DELETA todos os tokens anteriores do usuário ← SEGURANÇA
5. Token é salvo no banco com expiração de 5 min
6. Usuário confirma transação com o token
7. Sistema verifica token:
   - Token existe? ✓
   - Pertence ao usuário? ✓
   - Não expirou? ✓
   - Não foi usado? ✓
8. Transação é autorizada
9. Token é marcado como usado (is_used=true)
   └── Token NÃO pode ser usado novamente ← SEGURANÇA
```

### Por que deletar tokens antigos?

**Previne "Replay Attacks"**:

- Se um atacante interceptar um token antigo, ele já foi deletado
- Apenas o token mais recente é válido
- Cada autenticação = novo token = tokens anteriores inválidos

---

## Como Aplicar em Produção

### Passo 1: Criar a tabela no banco de dados

Conecte-se ao seu servidor de produção via SSH e execute:

```bash
ssh root@sua_droplet_ip
```

Depois conecte ao PostgreSQL e execute o SQL:

```bash
psql -h localhost -U postgres -d holdwallet_db
```

Ou se estiver usando DigitalOcean Managed Database:

```bash
psql "postgresql://doadmin:SENHA@app-xxxxx-do-user-xxxxx-0.l.db.ondigitalocean.com:25060/defaultdb?sslmode=require"
```

Execute este SQL:

```sql
CREATE TABLE IF NOT EXISTS biometric_tokens (
    id SERIAL PRIMARY KEY,
    token VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_biometric_tokens_id ON biometric_tokens(id);
CREATE INDEX IF NOT EXISTS ix_biometric_tokens_token ON biometric_tokens(token);
CREATE INDEX IF NOT EXISTS ix_biometric_tokens_user_id ON biometric_tokens(user_id);
```

### Passo 2: Deploy das alterações no código

```bash
cd /root/HOLDWallet  # ou onde está o projeto no servidor
git pull origin main  # ou master
```

### Passo 3: Reiniciar o backend

```bash
supervisorctl restart holdwallet-backend
# ou
systemctl restart holdwallet-backend
# ou
pm2 restart backend
```

### Passo 4: Testar

1. Faça login na aplicação
2. Vá para Carteiras
3. Tente enviar crypto
4. Autorize com biometria
5. A transação deve funcionar sem erro 403

## Código Alterado

### `/backend/app/models/security.py`

- Adicionado modelo `BiometricToken`

### `/backend/app/services/webauthn_service.py`

- `store_biometric_token()`: Agora salva no banco de dados
- `verify_biometric_token()`: Agora consulta o banco de dados
- Fallback para memória se houver erro no banco

## Verificar se Funcionou

Após aplicar, você pode verificar no banco:

```sql
SELECT * FROM biometric_tokens ORDER BY created_at DESC LIMIT 10;
```

Deve mostrar tokens sendo criados quando o usuário autorizar transações.
