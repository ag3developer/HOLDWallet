# 📋 KYC MODULE CHECKLIST - HOLDWallet

## 📊 Status Geral: **~25% Completo**

```
████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 25%
```

---

## 🎯 Resumo Executivo

| Área                         | Status        | Progresso |
| ---------------------------- | ------------- | --------- |
| **Frontend - Página KYC**    | 🟡 Parcial    | 40%       |
| **Frontend - Serviços**      | 🔴 Não existe | 0%        |
| **Backend - Modelo/Tabelas** | 🔴 Não existe | 0%        |
| **Backend - Serviço KYC**    | 🔴 Não existe | 0%        |
| **Backend - Router/API**     | 🔴 Não existe | 0%        |
| **Admin - Gestão KYC**       | 🔴 Não existe | 5%        |
| **Integrações Externas**     | 🔴 Não existe | 0%        |
| **Armazenamento Documentos** | 🔴 Não existe | 0%        |
| **Notificações**             | 🟡 Parcial    | 20%       |

---

## ✅ O QUE JÁ EXISTE

### Frontend

#### 1. Página KYC Básica (`/kyc`)

- [x] `Frontend/src/pages/kyc/KYCPage.tsx` - Página existe (586 linhas)
- [x] Rota configurada em `App.tsx`
- [x] UI com 5 steps de verificação (mockado)
- [x] Componente de upload de arquivos (local, não salva)
- [x] Formulário de informações pessoais (mockado)
- [x] Exibição de status por etapa
- [x] Design responsivo com dark mode
- [x] Traduções básicas (pt-BR e en-US)

#### 2. Referências a KYC no Sistema

- [x] Link no `ProfilePage.tsx` → `/kyc`
- [x] Link no `ServicesPage.tsx` → `/kyc`
- [x] Badge "KYC Verificado" no P2P
- [x] Campo `kyc_status` no `AdminUserDetailPage.tsx`

### Backend

#### 1. Notificações Admin

- [x] Query para buscar usuários com KYC pendente (`admin_notification_service.py`)
- [x] Notificação de KYC pendente para admin

---

## ❌ O QUE FALTA IMPLEMENTAR

### 🔴 BACKEND - Prioridade ALTA

#### 1. Modelo de Dados (Database)

- [ ] Criar modelo `KYCVerification` em `app/models/kyc.py`

  ```python
  class KYCVerification:
      id: UUID
      user_id: UUID (FK → users)
      status: Enum (pending, submitted, under_review, approved, rejected, expired)
      level: Enum (basic, intermediate, advanced)
      submitted_at: DateTime
      reviewed_at: DateTime
      reviewed_by: UUID (FK → users)
      rejection_reason: String
      expiration_date: DateTime
      created_at: DateTime
      updated_at: DateTime
  ```

- [ ] Criar modelo `KYCDocument` em `app/models/kyc.py`

  ```python
  class KYCDocument:
      id: UUID
      verification_id: UUID (FK → kyc_verifications)
      document_type: Enum (identity_front, identity_back, selfie, address_proof, income_proof)
      file_path: String (S3 URL)
      file_hash: String (SHA256)
      original_filename: String
      mime_type: String
      file_size: Integer
      status: Enum (pending, approved, rejected)
      rejection_reason: String
      ocr_data: JSON (dados extraídos)
      face_match_score: Float
      uploaded_at: DateTime
  ```

- [ ] Criar modelo `KYCPersonalData` em `app/models/kyc.py`

  ```python
  class KYCPersonalData:
      id: UUID
      verification_id: UUID (FK → kyc_verifications)
      # Dados Pessoais
      full_name: String
      social_name: String (opcional)
      birth_date: Date
      nationality: String
      document_type: Enum (cpf, cnpj)
      document_number: String (encrypted)
      rg_number: String (encrypted)
      # Endereço
      zip_code: String
      street: String
      number: String
      complement: String
      neighborhood: String
      city: String
      state: String
      country: String
      # Contato
      phone: String (encrypted)
      email: String
      # Informações Financeiras
      occupation: String
      monthly_income_range: Enum
      source_of_funds: Enum (salary, business, investments, inheritance, other)
      pep: Boolean (Pessoa Politicamente Exposta)
      fatca: Boolean (cidadão/residente EUA)
      # Dados validados externamente
      cpf_validated: Boolean
      cpf_validation_date: DateTime
      serpro_data: JSON
  ```

- [ ] Criar modelo `KYCAuditLog` em `app/models/kyc.py`

  ```python
  class KYCAuditLog:
      id: UUID
      verification_id: UUID
      actor_id: UUID
      actor_type: Enum (user, admin, system, api)
      action: String
      old_status: String
      new_status: String
      details: JSON
      ip_address: String
      user_agent: String
      created_at: DateTime
  ```

- [ ] Criar migration Alembic para tabelas KYC

#### 2. Serviço KYC (`app/services/kyc_service.py`)

- [ ] `create_verification()` - Inicia processo KYC
- [ ] `get_verification()` - Busca status atual
- [ ] `upload_document()` - Upload de documento com validação
- [ ] `save_personal_data()` - Salva dados pessoais
- [ ] `submit_for_review()` - Submete para análise
- [ ] `approve_verification()` - Admin aprova
- [ ] `reject_verification()` - Admin rejeita
- [ ] `request_additional_documents()` - Pede mais docs
- [ ] `validate_cpf_serpro()` - Valida CPF na Receita/Serpro
- [ ] `check_expiration()` - Verifica expiração
- [ ] `get_user_kyc_level()` - Retorna nível atual do usuário

#### 3. Router/API KYC (`app/routers/kyc.py`)

- [ ] `POST /kyc/start` - Inicia verificação KYC
- [ ] `GET /kyc/status` - Status atual do KYC
- [ ] `POST /kyc/documents` - Upload de documento
- [ ] `DELETE /kyc/documents/{id}` - Remove documento
- [ ] `POST /kyc/personal-data` - Salva dados pessoais
- [ ] `POST /kyc/submit` - Submete para análise
- [ ] `GET /kyc/requirements` - Requisitos por nível

#### 4. Router Admin KYC (`app/routers/admin/kyc_admin.py`)

- [ ] `GET /admin/kyc` - Lista verificações pendentes
- [ ] `GET /admin/kyc/{id}` - Detalhes de uma verificação
- [ ] `POST /admin/kyc/{id}/approve` - Aprovar KYC
- [ ] `POST /admin/kyc/{id}/reject` - Rejeitar KYC
- [ ] `POST /admin/kyc/{id}/request-documents` - Pedir mais docs
- [ ] `GET /admin/kyc/stats` - Estatísticas de KYC
- [ ] `GET /admin/kyc/export` - Exportar relatório

#### 5. Schemas Pydantic (`app/schemas/kyc.py`)

- [ ] `KYCStatusResponse`
- [ ] `KYCDocumentUploadRequest`
- [ ] `KYCPersonalDataRequest`
- [ ] `KYCVerificationResponse`
- [ ] `KYCAdminListResponse`
- [ ] `KYCApprovalRequest`
- [ ] `KYCRejectionRequest`

---

### 🔴 FRONTEND - Prioridade ALTA

#### 1. Serviço KYC (`src/services/kyc.ts`)

- [ ] `startVerification()` - Inicia KYC
- [ ] `getStatus()` - Busca status
- [ ] `uploadDocument()` - Upload de arquivo
- [ ] `deleteDocument()` - Remove documento
- [ ] `savePersonalData()` - Salva dados
- [ ] `submitForReview()` - Submete
- [ ] `getRequirements()` - Requisitos

#### 2. Página KYC Conectada ao Backend

- [ ] Integrar com API real (atualmente mockado)
- [ ] Upload de arquivos para S3/storage
- [ ] Validação de CPF em tempo real
- [ ] Consulta de CEP via ViaCEP
- [ ] Preview de imagens antes do upload
- [ ] Compressão de imagens
- [ ] Validação de tamanho/formato de arquivo
- [ ] Barra de progresso de upload
- [ ] Mensagens de erro do backend

#### 3. Componentes Adicionais

- [ ] `KYCDocumentUploader` - Componente de upload específico
- [ ] `KYCSelfieCapture` - Captura de selfie com câmera
- [ ] `KYCStatusBadge` - Badge de status reutilizável
- [ ] `KYCProgressIndicator` - Indicador de progresso
- [ ] `KYCDocumentPreview` - Preview de documento

#### 4. Hooks

- [ ] `useKYCStatus()` - Hook para status KYC
- [ ] `useDocumentUpload()` - Hook para upload

---

### 🔴 ADMIN - Prioridade MÉDIA

#### 1. Página Admin KYC (`src/pages/admin/AdminKYCPage.tsx`)

- [ ] Lista de verificações pendentes
- [ ] Filtros por status, data, nível
- [ ] Busca por usuário
- [ ] Ações em lote

#### 2. Página Detalhe KYC (`src/pages/admin/AdminKYCDetailPage.tsx`)

- [ ] Visualização de todos os documentos
- [ ] Comparação facial (selfie vs documento)
- [ ] Dados pessoais completos
- [ ] Histórico de ações
- [ ] Botões: Aprovar / Rejeitar / Pedir mais docs
- [ ] Campo de motivo de rejeição
- [ ] Validação SERPRO inline

#### 3. Serviços Admin

- [ ] `src/services/admin/adminKyc.ts`

---

### 🔴 INTEGRAÇÕES EXTERNAS - Prioridade ALTA

#### 1. Validação de CPF/CNPJ

- [ ] Integração com SERPRO (Receita Federal)
- [ ] Ou BigData Corp
- [ ] Ou Nubax
- [ ] Verificar situação cadastral
- [ ] Verificar nome completo
- [ ] Verificar data de nascimento

#### 2. OCR de Documentos

- [ ] Integração com AWS Textract
- [ ] Ou Google Vision API
- [ ] Ou Microsoft Azure Computer Vision
- [ ] Extração automática de dados do RG/CNH
- [ ] Validação de documento não adulterado

#### 3. Reconhecimento Facial

- [ ] Integração com AWS Rekognition
- [ ] Ou Face++
- [ ] Ou BioPass ID
- [ ] Comparação selfie vs foto documento
- [ ] Liveness detection (prova de vida)
- [ ] Anti-spoofing

#### 4. Consulta de Endereço

- [ ] Integração com ViaCEP (já pode existir parcialmente)
- [ ] Validação de endereço

---

### 🔴 ARMAZENAMENTO DE DOCUMENTOS - Prioridade ALTA

#### 1. Storage de Arquivos

- [ ] Configurar AWS S3 ou similar
- [ ] Bucket privado para documentos KYC
- [ ] Criptografia em repouso
- [ ] Presigned URLs para acesso temporário
- [ ] Política de retenção (LGPD)

#### 2. Segurança de Dados

- [ ] Criptografia de dados sensíveis no banco (CPF, RG)
- [ ] Mascaramento em logs
- [ ] Controle de acesso por role

---

### 🟡 NOTIFICAÇÕES - Prioridade MÉDIA

#### 1. Notificações para Usuário

- [ ] Email: KYC submetido
- [ ] Email: KYC aprovado
- [ ] Email: KYC rejeitado (com motivo)
- [ ] Email: Documentos adicionais necessários
- [ ] Email: KYC expirando
- [ ] Push notification mobile

#### 2. Notificações para Admin

- [x] Notificação de KYC pendente (parcial)
- [ ] Email diário com resumo
- [ ] Alerta de acúmulo de pendências

---

### 🟡 COMPLIANCE / LGPD - Prioridade ALTA

#### 1. LGPD

- [ ] Termo de consentimento para coleta de dados
- [ ] Opção de exclusão de dados (direito ao esquecimento)
- [ ] Relatório de dados do titular
- [ ] Log de consentimento

#### 2. AML (Anti-Money Laundering)

- [ ] Verificação em listas restritivas (OFAC, PEP)
- [ ] Scoring de risco
- [ ] Alertas automáticos para operações suspeitas

---

## 📊 NÍVEIS DE KYC SUGERIDOS

| Nível             | Requisitos                               | Limites        |
| ----------------- | ---------------------------------------- | -------------- |
| **Básico**        | Email + Celular verificado               | R$ 1.000/mês   |
| **Intermediário** | CPF + Selfie + Dados pessoais            | R$ 50.000/mês  |
| **Avançado**      | RG/CNH + Comprovante endereço + Renda    | R$ 300.000/mês |
| **Premium**       | Contrato físico + Verificação presencial | Sem limite     |

---

## 🚀 PLANO DE IMPLEMENTAÇÃO SUGERIDO

### Fase 1 - MVP (2-3 semanas)

1. ✅ Backend: Modelos de dados
2. ✅ Backend: Migration do banco
3. ✅ Backend: CRUD básico (service + router)
4. ✅ Frontend: Conectar página existente ao backend
5. ✅ Frontend: Upload funcional de documentos
6. ✅ Admin: Lista de KYCs pendentes
7. ✅ Admin: Aprovar/Rejeitar manual

### Fase 2 - Validações (2-3 semanas)

1. ✅ Integração SERPRO ou BigData para CPF
2. ✅ OCR básico para extração de dados
3. ✅ Comparação facial básica
4. ✅ Notificações por email
5. ✅ Logs de auditoria

### Fase 3 - Automação (2-3 semanas)

1. ✅ Auto-aprovação para KYC simples
2. ✅ Liveness detection
3. ✅ Verificação em listas restritivas
4. ✅ Dashboard de métricas KYC
5. ✅ Relatórios de compliance

### Fase 4 - Compliance Total (2-3 semanas)

1. ✅ LGPD completo
2. ✅ Integração AML
3. ✅ Auditoria externa
4. ✅ Documentação legal

---

## 💰 ESTIMATIVA DE CUSTOS MENSAIS (APIs)

| Serviço            | Estimativa             | Observação            |
| ------------------ | ---------------------- | --------------------- |
| AWS S3             | R$ 50-200              | Documentos            |
| SERPRO/BigData     | R$ 0.50-2.00/consulta  | ~500 users = R$ 1.000 |
| AWS Rekognition    | R$ 0.001/imagem        | ~2.000 imagens = R$ 2 |
| AWS Textract       | R$ 0.0015/página       | ~1.000 docs = R$ 1.50 |
| **Total estimado** | **R$ 1.000-2.000/mês** | Para ~500 novos KYCs  |

---

## 📁 ESTRUTURA DE ARQUIVOS SUGERIDA

```
Backend/
├── app/
│   ├── models/
│   │   └── kyc.py                    🔴 CRIAR
│   ├── schemas/
│   │   └── kyc.py                    🔴 CRIAR
│   ├── services/
│   │   └── kyc_service.py            🔴 CRIAR
│   │   └── serpro_service.py         🔴 CRIAR (ou bigdata)
│   │   └── ocr_service.py            🔴 CRIAR
│   │   └── face_recognition_service.py 🔴 CRIAR
│   ├── routers/
│   │   ├── kyc.py                    🔴 CRIAR
│   │   └── admin/
│   │       └── kyc_admin.py          🔴 CRIAR
│   └── core/
│       └── s3.py                     🔴 CRIAR (storage)

Frontend/
├── src/
│   ├── pages/
│   │   ├── kyc/
│   │   │   └── KYCPage.tsx           ✅ EXISTE (melhorar)
│   │   └── admin/
│   │       ├── AdminKYCPage.tsx      🔴 CRIAR
│   │       └── AdminKYCDetailPage.tsx 🔴 CRIAR
│   ├── services/
│   │   ├── kyc.ts                    🔴 CRIAR
│   │   └── admin/
│   │       └── adminKyc.ts           🔴 CRIAR
│   └── components/
│       └── kyc/
│           ├── KYCDocumentUploader.tsx 🔴 CRIAR
│           ├── KYCSelfieCapture.tsx    🔴 CRIAR
│           └── KYCStatusBadge.tsx      🔴 CRIAR
```

---

## 📝 PRÓXIMOS PASSOS IMEDIATOS

1. **Decidir provedor de validação de CPF** (SERPRO vs BigData)
2. **Decidir provedor de OCR** (AWS vs Google vs Azure)
3. **Decidir provedor de face recognition** (AWS vs Face++)
4. **Criar tabelas no banco** (migration)
5. **Implementar backend básico** (model, service, router)
6. **Conectar frontend existente**

---

_Última atualização: 11 de Janeiro de 2026_
_Versão: 1.0_
