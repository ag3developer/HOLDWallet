# 🔧 PATCH vs PUT - Qual Usar na API Wolknow?

**Data**: 14 de Dezembro de 2025  
**Status Atual**: Usando PUT em todo o API  

---

## 📚 DIFERENÇA ENTRE PATCH E PUT

### PUT (Substituição Completa)
```
PUT /api/v1/users/me
{
  "email": "novo@email.com",
  "username": "novo_username"
}
```

**Comportamento**:
- Substitui o recurso inteiro
- Requer todos os campos obrigatórios
- Se não enviar um campo, pode ser zerado/deletado
- Segue padrão REST REST-ful

**Exemplo**:
```json
// PUT - Substitui tudo
{
  "email": "novo@email.com",
  "username": "novo_user",
  "profile_photo": "url...",
  "bio": "Nova bio"
}
// Resultado: Todos os 4 campos são atualizados
```

---

### PATCH (Atualização Parcial)
```
PATCH /api/v1/users/me
{
  "email": "novo@email.com"
}
```

**Comportamento**:
- Atualiza apenas os campos enviados
- Campos não enviados não são alterados
- Mais eficiente para atualizações parciais
- Melhor para APIs modernas (REST Nível 3)

**Exemplo**:
```json
// PATCH - Atualiza só o que foi enviado
{
  "email": "novo@email.com"
}
// Resultado: Apenas email é atualizado, resto fica igual
```

---

## 📊 COMPARAÇÃO TÉCNICA

| Aspecto | PUT | PATCH |
|---------|-----|-------|
| **Semantics** | Replace entire | Partial update |
| **Body** | Complete object | Only changed fields |
| **Idempotent** | ✅ Sim (sempre mesmo resultado) | ✅ Sim |
| **Safe** | ❌ Não | ❌ Não |
| **Caching** | Cacheable | Cacheable |
| **Browser Support** | ❌ Não | ❌ Não |
| **Headers** | Content-Type: application/json | Content-Type: application/json |

---

## 🤔 QUAL USAR NA WOLKNOW?

### Recomendação: **PATCH** (Melhor Prática)

**Razões**:

1. **Melhor UX** - Usuário envia só o que mudou
2. **Menos Dados** - Reduz payload da requisição
3. **Menos Erros** - Não precisa enviar todos os campos
4. **Padrão Moderno** - APIs como GitHub, Slack, Stripe usam
5. **Mais Eficiente** - Menos processamento no backend

---

## 📋 PLANO DE IMPLEMENTAÇÃO

### Fase 1: Adicionar Suporte a PATCH
Manter PUT funcionando, adicionar PATCH

```python
# users.py
@router.patch("/me", response_model=UserResponse)
async def partial_update_user(
    user_update: UserPartialUpdateRequest,  # Todos os campos são opcionais
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update specific user fields"""
    # Atualizar apenas campos fornecidos
    if user_update.email:
        current_user.email = user_update.email
    if user_update.username:
        current_user.username = user_update.username
    # ... etc
```

### Fase 2: Deprecar PUT (Opcional)
Manter PUT mas indicar PATCH como preferido

```python
@router.put("/me", deprecated=True, response_model=UserResponse)
async def update_current_user_profile(...):
    """
    ⚠️ DEPRECATED: Use PATCH /me instead
    """
```

---

## 🚀 IMPLEMENTAÇÃO NO WOLKNOW

### Endpoints que Devem Usar PATCH

```
Profile Updates:
  PATCH /api/v1/users/me
  
Wallet Settings:
  PATCH /api/v1/wallets/{wallet_id}
  PATCH /api/v1/addresses/{address_id}
  
P2P Orders:
  PATCH /api/v1/p2p/orders/{order_id}
  
Trading:
  PATCH /api/v1/instant-trade/{trade_id}
  PATCH /api/v1/exchange/{exchange_id}
  
Chat:
  PATCH /api/v1/chat/messages/{message_id}
  
Profile:
  PATCH /api/v1/trader-profiles/{profile_id}
```

---

## 💡 EXEMPLO PRÁTICO

### Cenário: Atualizar Username do Usuário

#### Com PUT (Atual)
```bash
PUT /api/v1/users/me
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "novo_username",
  "profile_photo": "https://...",
  "bio": "Minha bio"
}
```

**Problema**: Precisa enviar email, foto, bio também

#### Com PATCH (Novo)
```bash
PATCH /api/v1/users/me
Content-Type: application/json

{
  "username": "novo_username"
}
```

**Vantagem**: Envia só o que mudou!

---

## 📝 CÓDIGO NECESSÁRIO

### Schema Atualizado

```python
# schemas/user.py
from typing import Optional
from pydantic import BaseModel

class UserPartialUpdateRequest(BaseModel):
    """Partial update - todos os campos são opcionais"""
    email: Optional[str] = None
    username: Optional[str] = None
    profile_photo: Optional[str] = None
    bio: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "username": "novo_username"
            }
        }

class UserUpdateRequest(BaseModel):
    """Full update - campos obrigatórios"""
    email: str
    username: str
    profile_photo: Optional[str] = None
    bio: Optional[str] = None
```

### Router Atualizado

```python
# routers/users.py
from app.schemas.user import UserUpdateRequest, UserPartialUpdateRequest

@router.put("/me", response_model=UserResponse, deprecated=True)
async def update_current_user_profile(
    user_update: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    ⚠️ DEPRECATED: Use PATCH instead
    Update current user profile (full replacement).
    """
    # ... código existente

@router.patch("/me", response_model=UserResponse)
async def partial_update_user(
    user_update: UserPartialUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update specific user fields (partial update)."""
    
    # Atualizar apenas os campos fornecidos
    update_data = user_update.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        if field == "email" and value != current_user.email:
            # Verificar duplicata
            existing = db.query(User).filter(
                User.email == value,
                User.id != current_user.id
            ).first()
            if existing:
                raise ValidationError("Email já registrado")
            setattr(current_user, field, value)
        elif field == "username" and value != current_user.username:
            # Verificar duplicata
            existing = db.query(User).filter(
                User.username == value,
                User.id != current_user.id
            ).first()
            if existing:
                raise ValidationError("Username já existe")
            setattr(current_user, field, value)
        else:
            setattr(current_user, field, value)
    
    current_user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(current_user)
    
    return UserResponse.model_validate(current_user)
```

---

## 🧪 TESTES

### Test PATCH
```bash
# Só atualizar username
curl -X PATCH http://localhost:8000/api/v1/users/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username": "novo_user"}'

# Resposta: 200 OK
{
  "id": 1,
  "email": "original@email.com",  # Não mudou
  "username": "novo_user",        # Mudou
  "created_at": "2025-12-14T...",
  "is_active": true
}
```

### Test PUT (com deprecation)
```bash
# Ainda funciona mas com aviso
curl -X PUT http://localhost:8000/api/v1/users/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "novo@email.com",
    "username": "novo_user",
    "profile_photo": "url"
  }'
```

---

## 📊 RECOMENDAÇÃO FINAL

### ✅ Implementar PATCH porque:
1. **Padrão Moderno** - APIs profissionais usam
2. **Melhor UX** - Usuários enviam menos dados
3. **Eficiente** - Reduz carga de rede
4. **Seguro** - Não substitui dados acidentalmente
5. **Flexível** - Manter PUT deprecado não quebra clientes

### Timeline:
- **Imediatamente**: Adicionar endpoints PATCH
- **3 meses**: Deprecar PUT (warning)
- **6 meses**: Remover PUT (breaking change v2.0)

---

## 📞 PRÓXIMAS AÇÕES

### Se quer implementar PATCH:
1. [ ] Criar schemas com campos opcionais
2. [ ] Adicionar endpoints @router.patch
3. [ ] Testar com curl/Postman
4. [ ] Atualizar documentação
5. [ ] Deploy em produção
6. [ ] Notificar clientes

### Se quer manter só PUT:
- Tudo continua igual
- Funciona normalmente
- Apenas menos eficiente que PATCH

---

**Recomendação**: 🟢 **Implementar PATCH** - é padrão da indústria!

