# 🔐 GUIA DE SEGURANÇA - HOLD Wallet
## Protocolo de Segurança para Administradores

**Versão:** 1.0  
**Data:** Janeiro 2026  
**Classificação:** CONFIDENCIAL - Apenas para Administradores

---

## ⚠️ AVISO IMPORTANTE

Este documento contém informações críticas de segurança. Siga TODAS as instruções rigorosamente.
**A perda de fundos é IRREVERSÍVEL em blockchain.**

---

## 📋 ÍNDICE

1. [Princípios Fundamentais](#1-princípios-fundamentais)
2. [Gestão de Chaves Privadas](#2-gestão-de-chaves-privadas)
3. [Backup e Recuperação](#3-backup-e-recuperação)
4. [Segurança do Servidor](#4-segurança-do-servidor)
5. [Operações Diárias](#5-operações-diárias)
6. [Checklist de Segurança](#6-checklist-de-segurança)
7. [Procedimentos de Emergência](#7-procedimentos-de-emergência)
8. [Contatos de Emergência](#8-contatos-de-emergência)

---

## 1. PRINCÍPIOS FUNDAMENTAIS

### 🎯 Regras de Ouro

```
1. NUNCA compartilhe chaves privadas por chat, email ou telefone
2. NUNCA armazene chaves em texto plano
3. SEMPRE use 2FA para acessar sistemas administrativos
4. SEMPRE verifique endereços de destino DUAS VEZES
5. NUNCA faça operações sob pressão ou urgência suspeita
```

### 🚫 O que NUNCA fazer

| ❌ PROIBIDO | ✅ CORRETO |
|-------------|-----------|
| Enviar private key por WhatsApp/Telegram | Usar cofre físico ou hardware wallet |
| Salvar mnemonic em arquivo .txt | Guardar em papel, local seguro |
| Usar mesma senha em múltiplos sistemas | Usar gerenciador de senhas (1Password, Bitwarden) |
| Acessar admin de WiFi público | Usar apenas rede segura ou VPN |
| Clicar em links de "verificação" | Acessar sempre digitando URL manualmente |

---

## 2. GESTÃO DE CHAVES PRIVADAS

### 🔑 Hierarquia de Chaves

```
┌─────────────────────────────────────────────────────────────┐
│                    SYSTEM WALLET (HOT)                      │
│  Uso: Operações diárias de envio automático                 │
│  Limite: Máximo 5-10% dos fundos totais                     │
│  Backup: Criptografado no banco + Backup físico             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    COLD WALLET (FRIA)                       │
│  Uso: Reserva principal (90-95% dos fundos)                 │
│  Armazenamento: Hardware Wallet (Ledger/Trezor)             │
│  Acesso: Apenas para reposição da Hot Wallet                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKUP WALLET (EMERGÊNCIA)               │
│  Uso: Apenas se Cold Wallet for comprometida                │
│  Armazenamento: Cofre bancário ou local externo             │
│  Conhecimento: Apenas 2+ pessoas autorizadas                │
└─────────────────────────────────────────────────────────────┘
```

### 📝 Mnemonic/Seed Phrase (24 palavras)

**ONDE ARMAZENAR:**
1. **Papel (3 cópias):**
   - Cópia 1: Cofre do escritório
   - Cópia 2: Cofre bancário
   - Cópia 3: Local seguro de terceiro confiável

2. **Metal (recomendado):**
   - Placa de aço inoxidável gravada
   - Resistente a fogo e água
   - Produtos: Cryptosteel, Billfodl, Coldti

**NUNCA ARMAZENAR EM:**
- ❌ Google Drive / Dropbox / iCloud
- ❌ Email
- ❌ Arquivo de texto no computador
- ❌ Print screen / Foto no celular
- ❌ Gerenciador de senhas online

### 🔐 Criptografia das Chaves no Sistema

As private keys no banco de dados estão criptografadas com:
- Algoritmo: Fernet (AES-128-CBC)
- Chave de criptografia: Variável de ambiente `ENCRYPTION_KEY`

```bash
# A ENCRYPTION_KEY deve:
- Ter 32 bytes (256 bits)
- Ser gerada aleatoriamente
- NUNCA estar no código fonte
- Estar apenas em variáveis de ambiente seguras
```

---

## 3. BACKUP E RECUPERAÇÃO

### 📦 O que fazer backup

| Item | Frequência | Método | Responsável |
|------|------------|--------|-------------|
| Banco de dados | Diário (automático) | pg_dump criptografado | DevOps |
| Mnemonic da System Wallet | Uma vez (físico) | Papel + Metal | CEO/CTO |
| Variáveis de ambiente (.env) | A cada mudança | Cofre digital (1Password) | DevOps |
| Código fonte | Contínuo | GitHub privado | Dev Team |

### 🔄 Procedimento de Backup do Banco

```bash
# Backup automático (configurar no cron)
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="holdwallet_backup_$DATE.sql.gz.enc"

# Dump do banco
pg_dump $DATABASE_URL | gzip | openssl enc -aes-256-cbc -salt -pbkdf2 -pass pass:$BACKUP_PASSWORD > $BACKUP_FILE

# Enviar para storage seguro (S3, Google Cloud Storage)
aws s3 cp $BACKUP_FILE s3://holdwallet-backups/daily/

# Manter apenas últimos 30 dias localmente
find /backups -name "*.enc" -mtime +30 -delete
```

### 🔓 Procedimento de Recuperação

```
1. PARAR todos os serviços
2. Verificar integridade do backup
3. Restaurar banco de dados
4. Verificar chaves criptografadas
5. Testar conexões blockchain (read-only)
6. Validar saldos contra explorers
7. Reativar serviços gradualmente
```

---

## 4. SEGURANÇA DO SERVIDOR

### 🖥️ Configurações Obrigatórias

```bash
# 1. Firewall (UFW)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH (mudar porta se possível)
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# 2. Fail2ban (proteção contra brute force)
sudo apt install fail2ban
sudo systemctl enable fail2ban

# 3. Atualizações automáticas de segurança
sudo apt install unattended-upgrades
sudo dpkg-reconfigure unattended-upgrades
```

### 🔒 Acesso SSH

```bash
# Desabilitar login com senha (usar apenas chave SSH)
# Em /etc/ssh/sshd_config:
PasswordAuthentication no
PermitRootLogin no
PubkeyAuthentication yes

# Reiniciar SSH
sudo systemctl restart sshd
```

### 🌐 Variáveis de Ambiente Sensíveis

```bash
# NUNCA COMMITAR NO GIT:
DATABASE_URL=postgresql://...
ENCRYPTION_KEY=...
JWT_SECRET_KEY=...
PLATFORM_EVM_PRIVATE_KEY=...
PLATFORM_BTC_PRIVATE_KEY_WIF=...
```

**Onde armazenar:**
- DigitalOcean: App Platform Secrets
- AWS: Secrets Manager ou Parameter Store
- Servidor próprio: Arquivo .env com chmod 600

---

## 5. OPERAÇÕES DIÁRIAS

### ✅ Checklist Matinal (Obrigatório)

```
□ Verificar saldo das hot wallets
□ Comparar saldo com registro interno
□ Verificar logs de transações das últimas 24h
□ Verificar alertas de segurança
□ Confirmar que backups foram executados
□ Revisar pedidos pendentes
```

### 💰 Limites de Operação

| Operação | Limite Diário | Aprovação Necessária |
|----------|---------------|---------------------|
| Envio automático (único) | Até $1,000 | Automático |
| Envio automático (dia) | Até $10,000 | Automático |
| Envio manual | Até $5,000 | 1 admin |
| Envio grande | $5,000 - $50,000 | 2 admins |
| Transferência para cold wallet | Qualquer valor | 2 admins + CEO |

### 🔍 Verificação de Transações

**ANTES de confirmar qualquer envio grande:**

1. **Verificar endereço destino:**
   ```
   - Conferir os 4 primeiros caracteres
   - Conferir os 4 últimos caracteres
   - Validar formato do endereço na rede correta
   ```

2. **Verificar valor:**
   ```
   - Confirmar quantidade de crypto
   - Verificar taxa de rede (não está muito alta?)
   - Comparar com pedido original
   ```

3. **Teste com valor pequeno:**
   ```
   - Para novos endereços: enviar $1 primeiro
   - Aguardar confirmação
   - Então enviar valor total
   ```

### 📊 Monitoramento de Saldos

```python
# Script de verificação de saldos (executar diariamente)
# backend/scripts/check_balances.py

Wallets a monitorar:
- EVM (Polygon): 0xc3F6487656E9D7BD1148D997A9EeDD703435A1B7
- Bitcoin: 1JnwPXAtGHDJxNbd3QwrhSCqWYpqq4Lmcb
- Solana: 96fGJpCVTMM17d8Zw8tqXrcU4NHE3hAgsBcXSW2n36dB
- TRON: TQ15TiASc1ep9c7nW6VJsPjRucuhgwyU4Z
- Polkadot: 162Er6RCfoyt2YEkBzuB7Ae3W7Uq9YYQp2EDKL9yJdK37Ek6

Alertar se:
- Saldo < 20% do esperado
- Transação não autorizada detectada
- Falha no envio automático
```

---

## 6. CHECKLIST DE SEGURANÇA

### 📋 Checklist Semanal

```
□ Revisar logs de acesso ao servidor
□ Verificar tentativas de login falhas
□ Atualizar dependências de segurança
□ Testar restauração de backup
□ Verificar certificados SSL
□ Revisar permissões de usuários admin
```

### 📋 Checklist Mensal

```
□ Rotacionar senhas de admin
□ Revisar e remover acessos não utilizados
□ Auditoria de transações do mês
□ Verificar saldos contra contabilidade
□ Atualizar sistema operacional
□ Teste de penetração (se possível)
```

### 📋 Checklist Trimestral

```
□ Auditar código de segurança
□ Revisar políticas de segurança
□ Treinar equipe em novos procedimentos
□ Simular cenário de recuperação de desastre
□ Revisar e atualizar este documento
```

---

## 7. PROCEDIMENTOS DE EMERGÊNCIA

### 🚨 CARTEIRA COMPROMETIDA

**Se suspeitar que chave privada foi exposta:**

```
AÇÃO IMEDIATA (< 5 minutos):

1. 🛑 PARAR TODOS OS ENVIOS AUTOMÁTICOS
   - Desligar backend ou desabilitar endpoint de envio
   
2. 💸 TRANSFERIR FUNDOS PARA NOVA CARTEIRA
   - Prioridade: maior valor primeiro
   - Usar cold wallet como destino temporário
   
3. 📞 NOTIFICAR EQUIPE
   - Ligar para todos os admins
   - Não usar chat (pode estar comprometido)
   
4. 📝 DOCUMENTAR TUDO
   - Hora da descoberta
   - Como foi descoberto
   - Ações tomadas
```

### 🚨 SERVIDOR COMPROMETIDO

```
1. DESCONECTAR SERVIDOR DA INTERNET
   - Não desligar (preservar evidências)
   
2. ATIVAR SERVIDOR DE BACKUP (se disponível)

3. ANALISAR LOGS
   - /var/log/auth.log
   - Logs do aplicativo
   
4. NOTIFICAR AUTORIDADES (se necessário)
   - Polícia cibernética
   - Advogados
```

### 🚨 ATAQUE DE PHISHING EM ADMIN

```
1. REVOGAR ACESSO IMEDIATAMENTE
   - Desabilitar conta do admin afetado
   - Rotacionar todas as senhas/tokens
   
2. VERIFICAR ATIVIDADES RECENTES
   - O que foi acessado?
   - Houve movimentação de fundos?
   
3. ALERTAR EQUIPE
   - Outros podem ter recebido mesmo phishing
```

---

## 8. CONTATOS DE EMERGÊNCIA

### 📞 Equipe Interna

| Função | Nome | Telefone | Responsabilidade |
|--------|------|----------|------------------|
| CEO | [NOME] | [TELEFONE] | Decisões críticas |
| CTO | [NOME] | [TELEFONE] | Técnico principal |
| DevOps | [NOME] | [TELEFONE] | Infraestrutura |
| Segurança | [NOME] | [TELEFONE] | Incidentes |

### 📞 Contatos Externos

| Serviço | Contato | Uso |
|---------|---------|-----|
| DigitalOcean Suporte | support.digitalocean.com | Problemas de servidor |
| Cloudflare | cloudflare.com/support | Ataques DDoS |
| Advogado | [CONTATO] | Questões legais |
| Polícia Cibernética | [CONTATO LOCAL] | Crimes cibernéticos |

---

## 📌 RESUMO EXECUTIVO

### Os 10 Mandamentos da Segurança HOLD Wallet

```
1. Mnemonic/Seed NUNCA online, SEMPRE em papel/metal
2. Hot Wallet com máximo 10% dos fundos
3. 2FA obrigatório para TODOS os admins
4. Verificar endereços DUAS vezes antes de enviar
5. Backups diários criptografados
6. Logs de TUDO, revisar semanalmente
7. Atualizar sistemas regularmente
8. Teste de restauração mensal
9. Plano de emergência conhecido por todos
10. Na dúvida, NÃO EXECUTE - pergunte primeiro
```

---

## 📝 TERMO DE RESPONSABILIDADE

Eu, _________________________, declaro que:

- [ ] Li e entendi completamente este guia de segurança
- [ ] Comprometo-me a seguir todos os procedimentos descritos
- [ ] Entendo que violações podem resultar em perda de fundos e demissão
- [ ] Manterei este documento confidencial

**Assinatura:** _________________________ **Data:** _____________

---

*Documento atualizado em: Janeiro 2026*
*Próxima revisão: Abril 2026*
*Versão: 1.0*
