# 🚀 ATIVAÇÃO PIX BB - CHECKLIST RÁPIDO

## Quando você tiver o novo certificado e-CNPJ A1:

### 1️⃣ Copiar certificado para a pasta

```bash
cp /caminho/do/novo_certificado.pfx backend/certs/
```

### 2️⃣ Extrair certificado e chave

```bash
cd backend/certs
./extract_cert.sh novo_certificado.pfx SUA_SENHA
```

### 3️⃣ Verificar que os arquivos foram criados

```bash
ls -la backend/certs/
# Deve mostrar:
# - bb_certificate.crt
# - bb_private_key.key
```

### 4️⃣ Testar a integração

```bash
cd backend
python3 test_pix_mtls.py
```

### 5️⃣ Se funcionar, reiniciar o backend

```bash
# Parar o backend atual (Ctrl+C)
# Iniciar novamente
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## ✅ Configuração já feita no .env:

```
BB_ENVIRONMENT=production
BB_CLIENT_ID=eyJpZCI6IiIsImNvZGlnb1B1YmxpY2Fkb3IiOjAs...
BB_CLIENT_SECRET=eyJpZCI6ImQzZmVjNDEtM2VmIiwiY29kaWdv...
BB_GW_DEV_APP_KEY=5bded2f7cc604b38be9681a1df3017f4
BB_PIX_KEY=24275355000151
BB_WEBHOOK_URL=https://api.wolknow.com/webhooks/bb/pix
BB_CERT_PATH=/Users/josecarlosmartins/Documents/HOLDWallet/backend/certs/bb_certificate.crt
BB_KEY_PATH=/Users/josecarlosmartins/Documents/HOLDWallet/backend/certs/bb_private_key.key
```

---

## 📋 Aplicação BB configurada:

- **Nome:** wolknow-pix
- **ID:** 246114
- **Status:** Produção
- **API:** Pix
- **CNPJ:** 24.275.355/0001-51

---

## 🔗 Links úteis:

- Portal BB: https://developers.bb.com.br
- Renovar certificado: Serasa, Certisign, Soluti, etc.

---

_Atualizado em: 10/01/2026_
