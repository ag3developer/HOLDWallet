# 🚀 Como Iniciar o Servidor Backend

## Comando Correto

Execute este comando **exatamente** como está:

```bash
cd /Users/josecarlosmartins/Documents/HOLDWallet/backend && /Users/josecarlosmartins/.pyenv/versions/3.9.19/bin/python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Ou use o script dev.py:

```bash
cd /Users/josecarlosmartins/Documents/HOLDWallet/backend && /Users/josecarlosmartins/.pyenv/versions/3.9.19/bin/python3 dev.py
```

## Verificar se está rodando:

```bash
curl http://localhost:8000/health
```

## Novo: Endpoints 2FA Adicionados

- `GET /auth/2fa/status` - Ver status do 2FA
- `POST /auth/2fa/setup` - Configurar 2FA (retorna QR code)
- `POST /auth/2fa/verify` - Verificar e ativar 2FA
- `POST /auth/2fa/disable` - Desabilitar 2FA

## Teste Rápido

```bash
# 1. Fazer login
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"app@holdwallet.com","password":"Test@123"}'

# 2. Copiar o token e testar status 2FA
curl http://localhost:8000/auth/2fa/status \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```
