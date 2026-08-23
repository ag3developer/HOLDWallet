# 🚀 Guia de Implementação: Account Deletion com Export de Dados

**Status:** 🔄 Scaffolding Completo  
**Data:** 2026-08-23  
**Tempo Restante:** ~6 horas para concluir

---

## 📦 O que foi Criado

### ✅ Arquivos Backend

| Arquivo                                                 | Status         | Função                                    |
| ------------------------------------------------------- | -------------- | ----------------------------------------- |
| `backend/app/services/user/account_export_service.py`   | ✅ Completo    | Coleta e exporta dados (PDF, Excel, JSON) |
| `backend/app/services/user/account_deletion_service.py` | ✅ Scaffolding | Gerencia ciclo de vida da deleção         |
| `backend/app/routers/user/account.py`                   | ✅ Scaffolding | Endpoints REST da API                     |

### 📋 Documentação

| Arquivo                                    | Conteúdo                          |
| ------------------------------------------ | --------------------------------- |
| `ACCOUNT_DELETION_EXPORT_FEATURE.md`       | Proposta completa com arquitetura |
| `ACCOUNT_DELETION_IMPLEMENTATION_GUIDE.md` | Este arquivo                      |

---

## 🛠️ Próximas Etapas (6 horas)

### 1️⃣ Instalar Dependências (30 min)

```bash
# Dependências para PDF e Excel
pip install reportlab openpyxl python-dateutil

# Adicionar ao requirements.txt
reportlab==4.0.9
openpyxl==3.11.2
python-dateutil==2.8.2
```

### 2️⃣ Criar Modelo de Banco de Dados (45 min)

**Arquivo:** `backend/app/models/deletion.py`

```python
from sqlalchemy import Column, String, DateTime, Enum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime, timezone

from app.core.db import Base


class DeletionRequest(Base):
    """Requisições de exclusão de conta"""
    __tablename__ = "account_deletion_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # Tipos: SOFT, HARD, SCHEDULED
    deletion_type = Column(String(20), nullable=False)

    # Status: PENDING, CONFIRMED, EXECUTED, CANCELLED, EXPIRED
    status = Column(String(20), nullable=False, default="pending")

    confirmation_code = Column(String(10), nullable=False)
    token = Column(String(512), nullable=False, unique=True)
    token_expires_at = Column(DateTime(timezone=True), nullable=False)

    reason = Column(Text, nullable=True)
    export_data_hash = Column(String(256), nullable=True)

    requested_at = Column(DateTime(timezone=True), default=datetime.now(timezone.utc))
    confirmed_at = Column(DateTime(timezone=True), nullable=True)
    executed_at = Column(DateTime(timezone=True), nullable=True)
    scheduled_deletion_date = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), default=datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))

    # Índices para melhor performance
    __table_args__ = (
        Index('idx_deletion_user_id', 'user_id'),
        Index('idx_deletion_status', 'status'),
        Index('idx_deletion_token', 'token'),
    )
```

### 3️⃣ Adicionar Campos ao User Model (20 min)

**Modificar:** `backend/app/models/user.py`

Adicionar estes campos:

```python
# Soft delete tracking
scheduled_deletion_at = Column(DateTime(timezone=True), nullable=True)
deletion_reason = Column(Text, nullable=True)
```

### 4️⃣ Criar Migration (15 min)

```bash
# Gerar migration
alembic revision --autogenerate -m "Add account deletion tables and fields"

# Aplicar
alembic upgrade head
```

### 5️⃣ Integração com Email Templates (30 min)

**Criar:** `backend/app/services/notifications/templates/account_deletion.html`

```html
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <style>
      body {
        font-family: Arial, sans-serif;
        background: #f5f5f5;
      }
      .container {
        background: white;
        max-width: 600px;
        margin: 20px auto;
        padding: 30px;
        border-radius: 8px;
      }
      .header {
        color: #1a1a1a;
        border-bottom: 2px solid #3498db;
        padding-bottom: 20px;
      }
      .code-box {
        background: #f9f9f9;
        border-left: 4px solid #3498db;
        padding: 15px;
        margin: 20px 0;
        font-family: monospace;
      }
      .warning {
        color: #e74c3c;
        font-weight: bold;
      }
      .button {
        background: #e74c3c;
        color: white;
        padding: 12px 30px;
        text-decoration: none;
        border-radius: 4px;
        display: inline-block;
        margin: 20px 0;
      }
      .footer {
        color: #999;
        font-size: 12px;
        text-align: center;
        margin-top: 30px;
        border-top: 1px solid #eee;
        padding-top: 20px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Solicitação de Exclusão de Conta</h1>
      </div>

      <p>Olá <strong>{{ username }}</strong>,</p>

      <p>
        Recebemos sua solicitação de exclusão de conta em
        <strong>{{ email }}</strong>.
      </p>

      <h2>📋 Tipo de Exclusão</h2>
      <p><strong>{{ deletion_type }}</strong></p>

      <h2>📎 Seus Dados</h2>
      <p>
        Anexado a este email, você encontrará seus dados completos em 3
        formatos:
      </p>
      <ul>
        <li>📄 <strong>PDF</strong>: Relatório formatado (fácil de ler)</li>
        <li>
          📊 <strong>Excel</strong>: Planilhas com detalhes (fácil de análise)
        </li>
        <li>📁 <strong>JSON</strong>: Dados brutos (para importação)</li>
      </ul>

      <p>
        <span class="warning"
          >⚠️ Os links de download são válidos por 24 horas.</span
        >
      </p>

      <h2>🔐 Confirme Sua Exclusão</h2>
      <p>Para confirmar a exclusão da sua conta, use o seguinte código:</p>

      <div class="code-box">{{ confirmation_code }}</div>

      <h2>📅 Timeline</h2>
      <ul>
        <li>✅ Você recebeu este email</li>
        <li>⏳ Próximo passo: Clique em confirmar ou use o código acima</li>
        <li>🗑️ Data de deleção: <strong>{{ deletion_date }}</strong></li>
      </ul>

      <h2>⚠️ IMPORTANTE</h2>
      <p style="color: #e74c3c; font-weight: bold;">
        Após a exclusão de sua conta:<br />
        ❌ Você não conseguirá fazer login<br />
        ❌ Seu saldo será transferido/perdido conforme política<br />
        ❌ Seus dados não podem ser recuperados
      </p>

      <p>
        <strong>Se você não solicitou a exclusão, ignore este email.</strong>
      </p>

      <p>Token expira em: <strong>{{ token_expires }}</strong></p>

      <div class="footer">
        <p>
          Este é um email automático. Por favor, não responda. Se precisar de
          ajuda, entre em contato com {{ support_email }}
        </p>
        <p>&copy; 2026 HOLD Wallet. Todos os direitos reservados.</p>
      </div>
    </div>
  </body>
</html>
```

### 6️⃣ Integrar Endpoints na App (15 min)

**Modificar:** `backend/app/main.py`

```python
from app.routers.user import account

# Adicionar na seção de routers
app.include_router(account.router)
```

### 7️⃣ Criar Testes Unitários (60 min)

**Arquivo:** `backend/tests/test_account_deletion.py`

```python
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_export_account_pdf(authenticated_user_token):
    """Testa exportação em PDF"""
    response = client.post(
        "/account/export",
        headers={"Authorization": f"Bearer {authenticated_user_token}"},
        json={"format": "pdf", "send_to_email": False}
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"


def test_export_account_excel(authenticated_user_token):
    """Testa exportação em Excel"""
    response = client.post(
        "/account/export",
        headers={"Authorization": f"Bearer {authenticated_user_token}"},
        json={"format": "excel", "send_to_email": False}
    )
    assert response.status_code == 200
    assert "spreadsheet" in response.headers["content-type"]


def test_request_deletion_soft(authenticated_user_token, valid_password):
    """Testa requisição de soft delete"""
    response = client.post(
        "/account/delete-request",
        headers={"Authorization": f"Bearer {authenticated_user_token}"},
        json={
            "deletion_type": "soft",
            "password": valid_password,
            "reason": "Not using anymore"
        }
    )
    assert response.status_code == 200
    assert response.json()["success"]
    assert "deletion_id" in response.json()


def test_request_deletion_invalid_password(authenticated_user_token):
    """Testa rejeição com senha inválida"""
    response = client.post(
        "/account/delete-request",
        headers={"Authorization": f"Bearer {authenticated_user_token}"},
        json={
            "deletion_type": "soft",
            "password": "wrong_password"
        }
    )
    assert response.status_code == 401


def test_confirm_deletion(authenticated_user_token, deletion_request):
    """Testa confirmação de exclusão"""
    response = client.post(
        f"/account/delete-confirm/{deletion_request.id}",
        headers={"Authorization": f"Bearer {authenticated_user_token}"},
        json={"confirmation_code": deletion_request.confirmation_code}
    )
    assert response.status_code == 200
    assert response.json()["success"]
```

### 8️⃣ Frontend UI Component (90 min)

**Arquivo:** `frontend/src/components/AccountDeletion.vue` (Vue 3 + TypeScript)

```vue
<template>
  <div class="account-deletion-container">
    <!-- Modal de Confirmação -->
    <el-dialog
      v-model="showDeletionModal"
      title="Excluir Conta"
      width="600px"
      @close="resetForm"
    >
      <!-- Passo 1: Selecionar tipo -->
      <div v-if="step === 1" class="deletion-step">
        <el-alert
          title="Atenção"
          type="warning"
          description="Essa ação não pode ser desfeita em todas as opções"
          show-icon
          closable
        />

        <h3 class="mt-4">Escolha o tipo de exclusão:</h3>

        <el-radio-group v-model="deletionType" class="mt-3">
          <el-radio label="soft" border size="large">
            <div>
              <strong>Soft Delete (90 dias)</strong>
              <p class="text-muted">
                Conta desativada, dados retidos por 90 dias
              </p>
            </div>
          </el-radio>

          <el-radio label="scheduled" border size="large">
            <div>
              <strong>Deleção Agendada (30 dias)</strong>
              <p class="text-muted">Confirme dentro de 30 dias ou cancele</p>
            </div>
          </el-radio>

          <el-radio label="hard" border size="large">
            <div>
              <strong>Deleção Permanente</strong>
              <p class="text-muted">Imediata e irreversível</p>
            </div>
          </el-radio>
        </el-radio-group>
      </div>

      <!-- Passo 2: Confirmar e exportar -->
      <div v-if="step === 2" class="deletion-step">
        <h3>Opções de Exportação</h3>

        <el-checkbox-group v-model="exportFormats" class="mt-3">
          <el-checkbox label="pdf">📄 Baixar PDF</el-checkbox>
          <el-checkbox label="excel">📊 Baixar Excel</el-checkbox>
          <el-checkbox label="json">📁 Baixar JSON</el-checkbox>
        </el-checkbox-group>

        <el-checkbox v-model="sendToEmail" class="mt-3">
          📧 Enviar também para meu email
        </el-checkbox>

        <el-input
          v-model="password"
          type="password"
          placeholder="Digite sua senha para confirmar"
          class="mt-4"
        />
      </div>

      <!-- Passo 3: Confirmação por email -->
      <div v-if="step === 3" class="deletion-step">
        <el-alert
          type="success"
          title="Email Enviado"
          description="Você recebeu um email com um código de confirmação"
          show-icon
          closable
        />

        <p class="mt-4">
          Digite o código de 6 dígitos que você recebeu no email:
        </p>

        <el-input
          v-model="confirmationCode"
          placeholder="000000"
          class="mt-3"
          maxlength="6"
        />
      </div>

      <!-- Botões -->
      <template #footer>
        <el-button @click="showDeletionModal = false">Cancelar</el-button>
        <el-button v-if="step > 1" @click="step--"> ← Voltar </el-button>
        <el-button
          v-if="step < 3"
          type="primary"
          @click="nextStep"
          :loading="loading"
        >
          Próximo →
        </el-button>
        <el-button
          v-if="step === 3"
          type="danger"
          @click="confirmDeletion"
          :loading="loading"
        >
          Confirmar Exclusão
        </el-button>
      </template>
    </el-dialog>

    <!-- Botão Danger Zone -->
    <div class="danger-zone mt-5">
      <h3>⚠️ Zona de Perigo</h3>
      <p>Essas ações não podem ser desfeitas:</p>
      <el-button type="danger" @click="showDeletionModal = true">
        🗑️ Excluir Minha Conta
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { ElMessage } from "element-plus";

const showDeletionModal = ref(false);
const step = ref(1);
const deletionType = ref("soft");
const exportFormats = ref(["pdf"]);
const sendToEmail = ref(true);
const password = ref("");
const confirmationCode = ref("");
const loading = ref(false);

const nextStep = async () => {
  if (step.value === 2) {
    if (!password.value) {
      ElMessage.error("Digite sua senha");
      return;
    }

    loading.value = true;
    try {
      const response = await fetch("/api/v1/account/delete-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deletion_type: deletionType.value,
          password: password.value,
        }),
      });

      if (!response.ok) throw new Error("Erro ao criar requisição");

      step.value = 3;
    } catch (error) {
      ElMessage.error("Erro: " + error.message);
    } finally {
      loading.value = false;
    }
  } else {
    step.value++;
  }
};

const confirmDeletion = async () => {
  if (!confirmationCode.value || confirmationCode.value.length !== 6) {
    ElMessage.error("Digite o código correto");
    return;
  }

  loading.value = true;
  try {
    // Implementar confirmação
    ElMessage.success("Conta excluída com sucesso");
    showDeletionModal.value = false;
  } catch (error) {
    ElMessage.error("Erro: " + error.message);
  } finally {
    loading.value = false;
  }
};

const resetForm = () => {
  step.value = 1;
  password.value = "";
  confirmationCode.value = "";
};
</script>

<style scoped>
.danger-zone {
  padding: 20px;
  border: 2px solid #f56c6c;
  border-radius: 4px;
  background: #fef0f0;
}

.deletion-step {
  padding: 20px;
}

.text-muted {
  color: #999;
  font-size: 12px;
  margin-top: 5px;
}

.mt-3 {
  margin-top: 15px;
}

.mt-4 {
  margin-top: 20px;
}

.mt-5 {
  margin-top: 30px;
}
</style>
```

---

## 🧪 Testes Recomendados

```bash
# Testes unitários
pytest backend/tests/test_account_deletion.py -v

# Testes de integração
pytest backend/tests/integration/test_account_deletion_flow.py -v

# Teste de performance (exportar 10k registros)
pytest backend/tests/performance/test_export_performance.py -v
```

---

## 🔒 Checklist de Segurança

- [ ] Validação de password em todas as operações sensíveis
- [ ] 2FA required para hard delete
- [ ] Rate limiting em endpoints de deleção
- [ ] Audit logs de todas as solicitações
- [ ] Email verificado antes de confirmar
- [ ] Token com expiração (24h)
- [ ] Hash dos dados antes de deletar (GDPR)
- [ ] Backup automático antes de hard delete
- [ ] Notificação ao admin de exclusões
- [ ] CORS restrito para endpoint de deleção

---

## 📈 Métricas a Monitorar

```python
# Adicionar às métricas do dashboard
METRICS = {
    "deletion_requests_total": Counter("Solicitações de exclusão"),
    "deletions_completed": Counter("Exclusões completadas"),
    "deletion_cancellations": Counter("Exclusões canceladas"),
    "export_time_seconds": Histogram("Tempo de exportação"),
    "export_file_size_bytes": Histogram("Tamanho dos arquivos exportados"),
}
```

---

## 🚀 Deploy Checklist

- [ ] Testes unitários passando
- [ ] Testes de integração passando
- [ ] Migrations executadas com sucesso
- [ ] Email templates configurados
- [ ] Frontend componentes compilando
- [ ] Documentação atualizada
- [ ] Backup do banco criado
- [ ] Monitor de erros configurado
- [ ] Rate limiting ativo
- [ ] Testes E2E em staging

---

## 📞 Suporte

**Dúvidas durante implementação:**

1. Verificar logs: `tail -f backend.log`
2. Executar testes: `pytest -v`
3. Revisar documentação em `ACCOUNT_DELETION_EXPORT_FEATURE.md`

**Em produção:**

1. Monitorar `/metrics` para erros
2. Verificar email delivery em `/admin/email-logs`
3. Validar exportações em `/admin/exports`

---

**Estimativa: 6-8 horas para completa implementação e testes** ⏱️

---

_Documentação criada em 2026-08-23. Última atualização: 2026-08-23_
