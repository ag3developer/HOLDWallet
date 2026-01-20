# 🔐 Relatório de Segurança - Ataque OTC

**Data:** 19 de Janeiro de 2026  
**Investigador:** Sistema Automatizado + Admin

---

## 📋 Resumo Executivo

Foi detectado e neutralizado um ataque de fraude OTC originado da **Indonésia (IP: 114.10.42.105, cidade: Ancol, Jakarta)**.

### Impacto Financeiro

| Categoria                        | Valor        |
| -------------------------------- | ------------ |
| **Total de trades fraudulentos** | R$ 66.627,00 |
| **Crypto enviada (PERDIDO)**     | R$ 32.127,00 |
| **Crypto pendente (RECUPERADO)** | R$ 33.500,00 |

---

## 🔍 Linha do Tempo do Ataque

### Fase 1: Reconhecimento (05:08 - 06:06)

```
05:08:57 | okhttp/4.2.1 | app@holdwallet.com   | ❌ user_not_found
05:09:05 | okhttp/4.2.1 | app@holdwallet.com   | ❌ user_not_found
05:09:10 | okhttp/4.2.1 | app@holdwallet.com   | ❌ user_not_found
06:05:05 | okhttp/4.2.1 | admin@holdwallet.com | ❌ user_not_found
06:06:34 | okhttp/4.2.1 | admin@wolknow.com    | ✅ LOGIN SUCESSO!
```

**Observação:** Atacante usou biblioteca `okhttp` (Android/Script) para testar emails até encontrar o correto.

### Fase 2: Comprometimento do Admin (06:06 - 07:38)

- 06:06:34 - Login como `admin@wolknow.com` via script
- 07:38:55 - Segundo login como admin via browser Chrome

### Fase 3: Execução dos Trades (07:30 - 10:27)

```
07:30:08 - Login como mdhani212@proton.me
08:14:25 - Primeiro trade criado (R$ 150)
08:14-08:57 - 12 trades criados e aprovados
10:24:58 - Logout mdhani212
10:27:50 - Login como zrobert891@proton.me (conta admin CRIADA pelo atacante)
```

### Velocidade Suspeita das Operações

| Trade           | Tempo Total     | Veredicto    |
| --------------- | --------------- | ------------ |
| OTC-2026-384D34 | **9 segundos**  | 🤖 Automação |
| OTC-2026-E0614B | **10 segundos** | 🤖 Automação |
| OTC-2026-26D388 | **12 segundos** | 🤖 Automação |
| OTC-2026-941DB8 | **15 segundos** | 🤖 Automação |

---

## ✅ Ações Executadas

### 1. Trades Cancelados (R$ 33.500,00 recuperados)

- ✅ OTC-2026-4AF667: R$ 500,00 (USDT)
- ✅ OTC-2026-CD48E8: R$ 1.000,00 (ETH)
- ✅ OTC-2026-3B04E3: R$ 2.000,00 (USDC)
- ✅ OTC-2026-3F3AB3: R$ 10.000,00 (BTC)
- ✅ OTC-2026-0583D9: R$ 20.000,00 (USDT)

### 2. Contas Bloqueadas

- ✅ `mdhani212@proton.me` - is_active=false
- ✅ `zrobert891@proton.me` - is_active=false, is_admin=false

### 3. Senha Alterada

- ✅ `admin@wolknow.com` - Nova senha gerada

### 4. IP Bloqueado

- ✅ `114.10.42.105` - Bloqueado permanentemente

---

## 🛡️ Proteções Implementadas

### Novo Middleware de Proteção da API

Arquivo: `app/middleware/api_protection.py`

#### Funcionalidades:

1. **Bloqueio de User-Agents Suspeitos:**
   - `okhttp/` (usado no ataque)
   - `python-requests/`
   - `curl/`
   - `postman`
   - `axios/`
   - E outros scripts de automação

2. **Proteção do /docs em Produção:**
   - Desabilitado por padrão em produção
   - Requer header `X-Admin-Key` especial
   - Ou IP na whitelist

3. **Proteção de Rotas Admin por Localização:**
   - Apenas IPs brasileiros podem acessar `/admin/`
   - Bloqueia automaticamente IPs estrangeiros

4. **Rate Limiting Avançado:**
   - Máximo 60 requests/minuto por IP
   - Máximo 10 requests/segundo (detecta scripts)
   - Bloqueio automático após 5 violações

5. **Detecção de Automação:**
   - Analisa padrões de velocidade das requisições
   - Bloqueia automaticamente comportamento não-humano

---

## 🔧 Como Usar em Produção

### Ativar Proteção do /docs

1. Defina `ENVIRONMENT=production` no `.env`
2. Para acessar /docs em produção, adicione o header:
   ```
   X-Admin-Key: [primeiros 32 caracteres do SECRET_KEY]
   ```

### Adicionar IPs à Whitelist do Admin

Edite `app/middleware/api_protection.py`:

```python
ADMIN_ALLOWED_IPS: Set[str] = {
    '143.105.141.64',  # Seu IP
    # Adicione outros IPs confiáveis
}
```

---

## 📊 Métricas do Ataque

- **Duração total:** ~4 horas (06:06 - 10:27)
- **Trades criados:** 15
- **Trades completados:** 9
- **Trades cancelados:** 5 + 1 pending
- **Contas comprometidas:** 1 (admin@wolknow.com)
- **Contas fraudulentas criadas:** 2

---

## ⚠️ Recomendações Futuras

1. **Implementar 2FA obrigatório para admin**
2. **Adicionar CAPTCHA no login após 3 tentativas falhas**
3. **Criar alerta automático para logins de IPs novos**
4. **Implementar assinatura HMAC nas requisições do app**
5. **Criar logs detalhados de todas as aprovações de trades**
6. **Revisar senha do admin periodicamente**

---

## 🔑 Credenciais Atualizadas

**admin@wolknow.com:**

- Nova senha foi gerada e mostrada no console
- ANOTE A SENHA! Não é possível recuperá-la depois

---

_Relatório gerado automaticamente pelo sistema de segurança HOLDWallet_
