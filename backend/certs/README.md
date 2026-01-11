# 🔐 Configuração do Certificado mTLS - Banco do Brasil

## ⚠️ IMPORTANTE

O Banco do Brasil **exige certificado mTLS** (mutual TLS) para a **API PIX em produção**.
Sem o certificado, as requisições retornarão erro 403 ou SSL error.

---

## 📋 Requisitos

Você precisa de um **certificado digital ICP-Brasil** (e-CNPJ) da empresa:

- **CNPJ:** 24.275.355/0001-51
- **Empresa:** HOLD DIGITAL ASSETS LTDA

### Tipos de certificado aceitos:

1. **e-CNPJ A1** - Arquivo .pfx/.p12 (recomendado para servidores)
2. **e-CNPJ A3** - Token/Smartcard (não suportado diretamente em servidores)

---

## 🚀 Passo a Passo

### 1️⃣ Obter o Certificado

Se ainda não tem o certificado e-CNPJ:

1. Acesse uma Autoridade Certificadora credenciada (Serasa, Certisign, etc.)
2. Solicite um **e-CNPJ A1** (arquivo digital)
3. O certificado será um arquivo `.pfx` ou `.p12` com senha

### 2️⃣ Extrair Certificado e Chave

Copie o arquivo `.pfx` para a pasta `backend/certs/`:

```bash
cp /caminho/do/seu/certificado.pfx backend/certs/
```

Execute o script de extração:

```bash
cd backend/certs
./extract_cert.sh certificado.pfx suasenha
```

Isso vai gerar:

- `bb_certificate.crt` - Certificado público
- `bb_private_key.key` - Chave privada (protegida!)
- `bb_chain.crt` - Cadeia de certificados (opcional)

### 3️⃣ Configurar o .env

Adicione os caminhos no arquivo `.env`:

```env
# Certificado mTLS (caminhos absolutos ou relativos ao backend/)
BB_CERT_PATH=/caminho/completo/backend/certs/bb_certificate.crt
BB_KEY_PATH=/caminho/completo/backend/certs/bb_private_key.key
```

### 4️⃣ Verificar Configuração

Reinicie o backend e verifique os logs:

```bash
# Deve aparecer:
# 🏦 BancoBrasilAPIService inicializado em modo: PRODUÇÃO | mTLS: ✅
```

---

## 🧪 Testar a Conexão

Execute o script de teste:

```bash
cd backend
python3 test_bb_auth.py
```

Se configurado corretamente, deve retornar:

```
✅ AUTENTICAÇÃO BEM SUCEDIDA!
   Token Type: Bearer
   Expires In: 600 segundos
```

---

## 🔒 Segurança

⚠️ **NUNCA** commite certificados ou chaves privadas no Git!

O arquivo `.gitignore` em `backend/certs/` já está configurado para ignorar:

- `*.pfx`
- `*.p12`
- `*.pem`
- `*.key`
- `*.crt`

### Permissões recomendadas:

```bash
# Apenas leitura pelo dono
chmod 600 backend/certs/bb_private_key.key
chmod 644 backend/certs/bb_certificate.crt
```

---

## ❓ Troubleshooting

### Erro: "SSL: SSLV3_ALERT_BAD_CERTIFICATE"

- Certificado não está sendo enviado ou está inválido
- Verifique se os caminhos no `.env` estão corretos

### Erro: 403 Forbidden

- Credenciais OAuth estão ok, mas falta mTLS
- Verifique se o certificado é do mesmo CNPJ da aplicação no portal BB

### Erro: "Certificado não encontrado"

- Verifique se o caminho no `.env` está correto
- Use caminhos absolutos se necessário

---

## 📞 Suporte

- **Portal BB Developers:** https://developers.bb.com.br
- **Documentação mTLS:** https://apoio.developers.bb.com.br/referency/post/5f890987b9d49100126ebf9a

---

_Documento criado em: 10 de Janeiro de 2026_
