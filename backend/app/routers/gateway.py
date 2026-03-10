"""
🚀 WolkPay Gateway - API Router
================================

Endpoints da API do Gateway para merchants.

Rotas:
- /gateway/merchants - Gerenciamento de merchants
- /gateway/api-keys - Gerenciamento de API Keys
- /gateway/payments - Criação e consulta de pagamentos
- /gateway/webhooks - Configuração de webhooks
- /gateway/checkout - Checkout público

Author: HOLD Wallet Team
Date: January 2026
"""

import logging
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status, Header, Request, Query
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_user, create_access_token
from app.models.user import User
from app.models.gateway import (
    GatewayMerchant,
    GatewayApiKey,
    GatewayPayment,
    GatewayPaymentStatus,
    GatewayPaymentMethod,
    MerchantStatus
)
from app.schemas.gateway import (
    # Merchant
    MerchantCreate,
    MerchantUpdate,
    MerchantResponse,
    MerchantPublicResponse,
    MerchantPublicRegister,
    # API Key
    ApiKeyCreate,
    ApiKeyResponse,
    ApiKeyCreatedResponse,
    ApiKeyRevokeRequest,
    # Payment
    PaymentCreate,
    PaymentResponse,
    PaymentPublicResponse,
    PaymentListResponse,
    PaymentFilterParams,
    # Webhook
    WebhookConfigUpdate,
    WebhookEventResponse,
    # Checkout
    CheckoutSessionCreate,
    CheckoutSessionResponse,
    # Other
    GatewayErrorResponse,
    GatewayFeesResponse,
    PaginatedResponse
)
from app.services.gateway import (
    MerchantService,
    ApiKeyService,
    GatewayPaymentService,
    WebhookService,
    GatewaySettingsService
)

logger = logging.getLogger(__name__)

# Router principal
router = APIRouter(prefix="/gateway", tags=["Gateway"])


# ============================================
# DEPENDENCIES
# ============================================

async def get_merchant_from_api_key(
    authorization: str = Header(..., description="Bearer API_KEY"),
    db: Session = Depends(get_db),
    request: Request = None
) -> GatewayMerchant:
    """
    Dependency para autenticar via API Key e retornar o merchant
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header deve começar com 'Bearer '"
        )
    
    api_key = authorization[7:]  # Remove "Bearer "
    
    api_key_service = ApiKeyService(db)
    ip_address = request.client.host if request else None
    
    is_valid, api_key_record, error = await api_key_service.validate_api_key(
        api_key, ip_address
    )
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error or "API Key inválida"
        )
    
    merchant = db.query(GatewayMerchant).filter(
        GatewayMerchant.id == api_key_record.merchant_id
    ).first()
    
    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Merchant não encontrado"
        )
    
    # Guardar api_key_id no request state para uso posterior
    if request:
        request.state.api_key_id = api_key_record.id
    
    return merchant


async def get_current_merchant(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> GatewayMerchant:
    """
    Dependency para obter merchant do usuário logado (dashboard)
    """
    # Buscar merchant pelo email do usuário
    merchant = db.query(GatewayMerchant).filter(
        GatewayMerchant.email == current_user.email
    ).first()
    
    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Você não possui um merchant cadastrado"
        )
    
    return merchant


# ============================================
# PUBLIC MERCHANT REGISTRATION (No Auth Required)
# ============================================

@router.post(
    "/merchants/register",
    status_code=status.HTTP_201_CREATED,
    summary="Registrar novo merchant (público)",
    description="Cria uma nova conta de merchant sem autenticação prévia"
)
async def register_merchant_public(
    data: MerchantPublicRegister,
    db: Session = Depends(get_db)
):
    """
    Endpoint PÚBLICO para registro de merchants.
    Cria usuário e merchant em uma única operação.
    
    Fluxo:
    1. Verifica se email já está em uso
    2. Cria usuário
    3. Cria merchant vinculado ao usuário
    4. Gera token JWT e retorna
    """
    # Verificar se email já existe
    existing_user = db.query(User).filter(User.email == data.business_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este email já está cadastrado"
        )
    
    # Verificar se documento já existe
    existing_merchant = db.query(GatewayMerchant).filter(
        GatewayMerchant.cnpj == data.business_document
    ).first()
    if existing_merchant:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este CNPJ/CPF já está cadastrado"
        )
    
    try:
        # 1. Criar usuário
        username = data.business_email.split('@')[0]
        # Garantir username único adicionando sufixo se necessário
        base_username = username
        counter = 1
        while db.query(User).filter(User.username == username).first():
            username = f"{base_username}{counter}"
            counter += 1
        
        user = User(
            email=data.business_email,
            username=username,
            password_hash=""
        )
        user.set_password(data.password)
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        logger.info(f"Usuário merchant criado: {user.email}")
        
        # 2. Criar merchant vinculado
        merchant_service = MerchantService(db)
        
        # Extrair nome do responsável do nome da empresa
        owner_name = data.business_name.split()[0] if data.business_name else username
        
        merchant_data = MerchantCreate(
            company_name=data.business_name,
            trade_name=data.business_name,
            cnpj=data.business_document,
            email=data.business_email,
            phone=data.business_phone,
            website=data.website_url,
            owner_name=owner_name,
            owner_email=data.business_email,
            owner_phone=data.business_phone
        )
        
        merchant, _ = await merchant_service.create_merchant(
            data=merchant_data,
            actor_id=str(user.id),
            actor_type="user"
        )
        
        logger.info(f"Merchant registrado: {merchant.merchant_code} por {user.email}")
        
        # 3. Gerar token JWT para auto-login
        access_token = create_access_token(
            data={"sub": user.email, "user_id": str(user.id)},
            expires_delta=timedelta(hours=24)
        )
        
        return {
            "message": "Conta criada com sucesso!",
            "merchant_id": merchant.id,
            "merchant_code": merchant.merchant_code,
            "access_token": access_token,
            "token_type": "bearer"
        }
        
    except ValueError as e:
        db.rollback()
        logger.error(f"ValueError ao registrar merchant: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        import traceback
        logger.error(f"Erro ao registrar merchant: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro interno ao criar conta: {str(e)}"
        )


# ============================================
# MERCHANT ENDPOINTS (Dashboard)
# ============================================

@router.post(
    "/merchants",
    response_model=MerchantResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar novo merchant",
    description="Cria um novo merchant (lojista) no Gateway"
)
async def create_merchant(
    data: MerchantCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cria um novo merchant vinculado ao usuário logado.
    O merchant inicia com status PENDING até aprovação.
    """
    # Verificar se usuário já tem merchant
    existing = db.query(GatewayMerchant).filter(
        GatewayMerchant.email == current_user.email
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Você já possui um merchant cadastrado"
        )
    
    try:
        merchant_service = MerchantService(db)
        merchant, webhook_secret = await merchant_service.create_merchant(
            data=data,
            actor_id=str(current_user.id),
            actor_type="user"
        )
        
        return merchant
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get(
    "/merchants/me",
    response_model=MerchantResponse,
    summary="Obter meu merchant",
    description="Retorna os dados do merchant do usuário logado"
)
async def get_my_merchant(
    merchant: GatewayMerchant = Depends(get_current_merchant)
):
    """Retorna dados do merchant do usuário logado"""
    return merchant


@router.put(
    "/merchants/me",
    response_model=MerchantResponse,
    summary="Atualizar meu merchant",
    description="Atualiza dados do merchant do usuário logado"
)
async def update_my_merchant(
    data: MerchantUpdate,
    merchant: GatewayMerchant = Depends(get_current_merchant),
    db: Session = Depends(get_db)
):
    """Atualiza dados do merchant"""
    try:
        merchant_service = MerchantService(db)
        updated = await merchant_service.update_merchant(
            merchant_id=merchant.id,
            data=data
        )
        return updated
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get(
    "/merchants/me/stats",
    summary="Estatísticas do merchant",
    description="Retorna estatísticas de pagamentos do merchant"
)
async def get_merchant_stats(
    merchant: GatewayMerchant = Depends(get_current_merchant),
    db: Session = Depends(get_db),
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None
):
    """Retorna estatísticas do merchant"""
    merchant_service = MerchantService(db)
    stats = await merchant_service.get_merchant_stats(
        merchant_id=merchant.id,
        date_from=date_from,
        date_to=date_to
    )
    return stats


# ============================================
# MERCHANT DASHBOARD - PAYMENTS (via JWT, not API Key)
# ============================================

@router.get(
    "/merchants/me/payments",
    response_model=PaginatedResponse,
    summary="Listar meus pagamentos",
    description="Lista pagamentos do merchant (via dashboard, autenticado com JWT)"
)
async def list_my_payments(
    merchant: GatewayMerchant = Depends(get_current_merchant),
    db: Session = Depends(get_db),
    status_filter: Optional[GatewayPaymentStatus] = Query(None, alias="status"),
    payment_method: Optional[GatewayPaymentMethod] = Query(None),
    search: Optional[str] = Query(None, description="Busca por ID, descrição ou email"),
    date_from: Optional[datetime] = Query(None, alias="from_date"),
    date_to: Optional[datetime] = Query(None, alias="to_date"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100)
):
    """
    Lista pagamentos do merchant autenticado (dashboard).
    Diferente do /payments que requer API Key.
    """
    filters = PaymentFilterParams(
        status=status_filter,
        payment_method=payment_method,
        date_from=date_from,
        date_to=date_to
    )
    
    payment_service = GatewayPaymentService(db)
    payments, total = await payment_service.list_payments(
        merchant_id=merchant.id,
        filters=filters,
        search=search,
        page=page,
        per_page=per_page
    )
    
    total_pages = (total + per_page - 1) // per_page
    
    return PaginatedResponse(
        items=[PaymentListResponse.model_validate(p) for p in payments],
        total=total,
        page=page,
        per_page=per_page,
        pages=total_pages,
        has_next=page < total_pages,
        has_prev=page > 1
    )


@router.get(
    "/merchants/me/payments/{payment_id}",
    response_model=PaymentResponse,
    summary="Obter detalhes do pagamento",
    description="Retorna detalhes de um pagamento específico do merchant"
)
async def get_my_payment(
    payment_id: str,
    merchant: GatewayMerchant = Depends(get_current_merchant),
    db: Session = Depends(get_db)
):
    """
    Retorna detalhes de um pagamento do merchant (dashboard).
    """
    payment_service = GatewayPaymentService(db)
    payment = await payment_service.get_payment_by_id(payment_id)
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pagamento não encontrado"
        )
    
    if payment.merchant_id != merchant.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Pagamento não pertence a este merchant"
        )
    
    return payment


@router.post(
    "/merchants/me/payments/{payment_id}/cancel",
    response_model=PaymentResponse,
    summary="Cancelar meu pagamento",
    description="Cancela um pagamento pendente do merchant"
)
async def cancel_my_payment(
    payment_id: str,
    merchant: GatewayMerchant = Depends(get_current_merchant),
    db: Session = Depends(get_db)
):
    """
    Cancela um pagamento pendente do merchant (dashboard).
    """
    payment_service = GatewayPaymentService(db)
    payment = await payment_service.get_payment_by_id(payment_id)
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pagamento não encontrado"
        )
    
    if payment.merchant_id != merchant.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Pagamento não pertence a este merchant"
        )
    
    if payment.status != GatewayPaymentStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Só é possível cancelar pagamentos pendentes. Status atual: {payment.status.value}"
        )
    
    payment.status = GatewayPaymentStatus.CANCELLED
    db.commit()
    db.refresh(payment)
    
    return payment


# ============================================
# API KEY ENDPOINTS
# ============================================

@router.post(
    "/api-keys",
    response_model=ApiKeyCreatedResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar API Key",
    description="Cria uma nova API Key para o merchant. A key completa só é mostrada UMA VEZ!"
)
async def create_api_key(
    data: ApiKeyCreate,
    merchant: GatewayMerchant = Depends(get_current_merchant),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Cria nova API Key.
    
    IMPORTANTE: A API Key completa só é retornada nesta resposta.
    Salve-a em local seguro!
    """
    if merchant.status != MerchantStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Merchant precisa estar ativo para criar API Keys"
        )
    
    try:
        api_key_service = ApiKeyService(db)
        api_key, full_key = await api_key_service.create_api_key(
            merchant_id=merchant.id,
            data=data,
            actor_id=str(current_user.id)
        )
        
        # Retornar com a key completa
        return ApiKeyCreatedResponse(
            id=api_key.id,
            merchant_id=api_key.merchant_id,
            name=api_key.name,
            description=api_key.description,
            key_prefix=api_key.key_prefix,
            is_test=api_key.is_test,
            is_active=api_key.is_active,
            permissions=api_key.permissions,
            allowed_ips=api_key.allowed_ips,
            rate_limit_per_minute=api_key.rate_limit_per_minute,
            rate_limit_per_hour=api_key.rate_limit_per_hour,
            last_used_at=api_key.last_used_at,
            total_requests=api_key.total_requests,
            expires_at=api_key.expires_at,
            created_at=api_key.created_at,
            api_key=full_key  # KEY COMPLETA - SÓ AGORA!
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get(
    "/api-keys",
    response_model=List[ApiKeyResponse],
    summary="Listar API Keys",
    description="Lista todas as API Keys do merchant"
)
async def list_api_keys(
    merchant: GatewayMerchant = Depends(get_current_merchant),
    db: Session = Depends(get_db),
    include_revoked: bool = Query(False, description="Incluir keys revogadas")
):
    """Lista API Keys do merchant"""
    api_key_service = ApiKeyService(db)
    keys = await api_key_service.list_api_keys(
        merchant_id=merchant.id,
        include_revoked=include_revoked
    )
    return keys


@router.delete(
    "/api-keys/{api_key_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Revogar API Key",
    description="Revoga uma API Key (não pode ser desfeito)"
)
async def revoke_api_key(
    api_key_id: str,
    data: ApiKeyRevokeRequest = None,
    merchant: GatewayMerchant = Depends(get_current_merchant),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Revoga uma API Key"""
    # Verificar se a key pertence ao merchant
    api_key = db.query(GatewayApiKey).filter(
        GatewayApiKey.id == api_key_id,
        GatewayApiKey.merchant_id == merchant.id
    ).first()
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API Key não encontrada"
        )
    
    try:
        api_key_service = ApiKeyService(db)
        await api_key_service.revoke_api_key(
            api_key_id=api_key_id,
            reason=data.reason if data else None,
            actor_id=str(current_user.id)
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# ============================================
# PAYMENT ENDPOINTS (API - Via API Key)
# ============================================

@router.post(
    "/payments",
    response_model=PaymentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar pagamento",
    description="Cria um novo pagamento PIX ou Crypto"
)
async def create_payment(
    data: PaymentCreate,
    request: Request,
    merchant: GatewayMerchant = Depends(get_merchant_from_api_key),
    db: Session = Depends(get_db)
):
    """
    Cria um novo pagamento.
    
    Para PIX: Gera QR Code via Banco do Brasil
    Para Crypto: Gera endereço único para recebimento
    """
    try:
        payment_service = GatewayPaymentService(db)
        
        api_key_id = getattr(request.state, 'api_key_id', None)
        
        payment = await payment_service.create_payment(
            merchant_id=merchant.id,
            data=data,
            api_key_id=api_key_id,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent")
        )
        
        return payment
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get(
    "/payments/{payment_id}",
    response_model=PaymentResponse,
    summary="Consultar pagamento",
    description="Consulta status e detalhes de um pagamento"
)
async def get_payment(
    payment_id: str,
    merchant: GatewayMerchant = Depends(get_merchant_from_api_key),
    db: Session = Depends(get_db)
):
    """Consulta um pagamento pelo ID"""
    payment_service = GatewayPaymentService(db)
    payment = await payment_service.get_payment_by_id(payment_id)
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pagamento não encontrado"
        )
    
    # Verificar se pertence ao merchant
    if payment.merchant_id != merchant.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Pagamento não pertence a este merchant"
        )
    
    return payment


@router.get(
    "/payments",
    response_model=PaginatedResponse,
    summary="Listar pagamentos",
    description="Lista pagamentos do merchant com filtros"
)
async def list_payments(
    merchant: GatewayMerchant = Depends(get_merchant_from_api_key),
    db: Session = Depends(get_db),
    status_filter: Optional[GatewayPaymentStatus] = Query(None, alias="status"),
    payment_method: Optional[GatewayPaymentMethod] = None,
    external_id: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100)
):
    """Lista pagamentos com filtros"""
    filters = PaymentFilterParams(
        status=status_filter,
        payment_method=payment_method,
        external_id=external_id,
        date_from=date_from,
        date_to=date_to
    )
    
    payment_service = GatewayPaymentService(db)
    payments, total = await payment_service.list_payments(
        merchant_id=merchant.id,
        filters=filters,
        page=page,
        per_page=per_page
    )
    
    total_pages = (total + per_page - 1) // per_page
    
    return PaginatedResponse(
        items=[PaymentListResponse.model_validate(p) for p in payments],
        total=total,
        page=page,
        per_page=per_page,
        pages=total_pages,
        has_next=page < total_pages,
        has_prev=page > 1
    )


@router.post(
    "/payments/{payment_id}/cancel",
    response_model=PaymentResponse,
    summary="Cancelar pagamento",
    description="Cancela um pagamento pendente"
)
async def cancel_payment(
    payment_id: str,
    merchant: GatewayMerchant = Depends(get_merchant_from_api_key),
    db: Session = Depends(get_db)
):
    """Cancela um pagamento pendente"""
    payment_service = GatewayPaymentService(db)
    payment = await payment_service.get_payment_by_id(payment_id)
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pagamento não encontrado"
        )
    
    if payment.merchant_id != merchant.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Pagamento não pertence a este merchant"
        )
    
    if payment.status != GatewayPaymentStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Só é possível cancelar pagamentos pendentes. Status atual: {payment.status.value}"
        )
    
    payment.status = GatewayPaymentStatus.CANCELLED
    db.commit()
    db.refresh(payment)
    
    return payment


# ============================================
# WEBHOOK CONFIGURATION
# ============================================

@router.put(
    "/webhooks/config",
    response_model=MerchantResponse,
    summary="Configurar webhooks",
    description="Configura URL e eventos de webhook"
)
async def configure_webhooks(
    data: WebhookConfigUpdate,
    merchant: GatewayMerchant = Depends(get_current_merchant),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Configura webhooks do merchant"""
    try:
        merchant_service = MerchantService(db)
        updated_merchant, new_secret = await merchant_service.update_webhook_config(
            merchant_id=merchant.id,
            webhook_url=data.webhook_url,
            webhook_events=data.webhook_events,
            actor_id=str(current_user.id)
        )
        
        return updated_merchant
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post(
    "/webhooks/regenerate-secret",
    summary="Regenerar webhook secret",
    description="Gera um novo webhook secret"
)
async def regenerate_webhook_secret(
    merchant: GatewayMerchant = Depends(get_current_merchant),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Regenera o webhook secret"""
    merchant_service = MerchantService(db)
    new_secret = await merchant_service.regenerate_webhook_secret(
        merchant_id=merchant.id,
        actor_id=str(current_user.id)
    )
    
    return {
        "webhook_secret": new_secret,
        "message": "Salve este secret! Ele não será mostrado novamente."
    }


@router.get(
    "/webhooks/events",
    response_model=List[WebhookEventResponse],
    summary="Listar eventos de webhook",
    description="Lista histórico de webhooks enviados"
)
async def list_webhook_events(
    merchant: GatewayMerchant = Depends(get_current_merchant),
    db: Session = Depends(get_db),
    payment_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100)
):
    """Lista eventos de webhook"""
    webhook_service = WebhookService(db)
    webhooks = await webhook_service.list_webhooks(
        merchant_id=merchant.id,
        payment_id=payment_id,
        page=page,
        per_page=per_page
    )
    return webhooks


# ============================================
# CHECKOUT PÚBLICO (Sem autenticação)
# ============================================

@router.get(
    "/checkout/{token}",
    response_model=PaymentPublicResponse,
    summary="Obter dados do checkout",
    description="Retorna dados públicos do pagamento para checkout"
)
async def get_checkout(
    token: str,
    db: Session = Depends(get_db)
):
    """
    Endpoint público para checkout page.
    Não requer autenticação.
    """
    payment_service = GatewayPaymentService(db)
    payment = await payment_service.get_payment_by_checkout_token(token)
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pagamento não encontrado"
        )
    
    if payment.status == GatewayPaymentStatus.EXPIRED:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Este pagamento expirou"
        )
    
    if payment.status in [GatewayPaymentStatus.COMPLETED, GatewayPaymentStatus.CANCELLED]:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail=f"Este pagamento já foi {payment.status.value.lower()}"
        )
    
    # Buscar merchant para dados públicos
    merchant = db.query(GatewayMerchant).filter(
        GatewayMerchant.id == payment.merchant_id
    ).first()
    
    return PaymentPublicResponse(
        payment_id=payment.payment_id,
        merchant=MerchantPublicResponse(
            merchant_code=merchant.merchant_code,
            company_name=merchant.company_name,
            trade_name=merchant.trade_name,
            logo_url=merchant.logo_url,
            primary_color=merchant.primary_color
        ),
        payment_method=payment.payment_method,
        amount_requested=payment.amount_requested,
        currency_requested=payment.currency_requested,
        status=payment.status,
        expires_at=payment.expires_at,
        pix_qrcode=payment.pix_qrcode,
        pix_qrcode_image=payment.pix_qrcode_image,
        crypto_currency=payment.crypto_currency,
        crypto_network=payment.crypto_network,
        crypto_address=payment.crypto_address,
        crypto_amount=payment.crypto_amount,
        description=payment.description,
        success_url=payment.success_url,
        cancel_url=payment.cancel_url
    )


@router.get(
    "/checkout/{token}/status",
    summary="Verificar status do checkout",
    description="Verifica status do pagamento (para polling)"
)
async def get_checkout_status(
    token: str,
    db: Session = Depends(get_db)
):
    """
    Endpoint público para verificar status.
    Usado para polling no frontend.
    """
    payment_service = GatewayPaymentService(db)
    payment = await payment_service.get_payment_by_checkout_token(token)
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pagamento não encontrado"
        )
    
    return {
        "payment_id": payment.payment_id,
        "status": payment.status.value,
        "confirmed_at": payment.confirmed_at.isoformat() if payment.confirmed_at else None,
        "completed_at": payment.completed_at.isoformat() if payment.completed_at else None,
        "success_url": payment.success_url if payment.status == GatewayPaymentStatus.COMPLETED else None
    }


from pydantic import BaseModel

class SelectMethodRequest(BaseModel):
    """Request para selecionar metodo de pagamento"""
    method: str  # PIX ou CRYPTO
    crypto_currency: Optional[str] = None
    crypto_network: Optional[str] = None


@router.post(
    "/checkout/{token}/select-method",
    summary="Selecionar metodo de pagamento",
    description="Cliente escolhe entre PIX ou Crypto"
)
async def select_payment_method(
    token: str,
    data: SelectMethodRequest,
    db: Session = Depends(get_db)
):
    """
    Endpoint publico para selecionar metodo de pagamento.
    Gera QR Code PIX ou endereco crypto.
    """
    payment_service = GatewayPaymentService(db)
    payment = await payment_service.get_payment_by_checkout_token(token)
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pagamento nao encontrado"
        )
    
    if payment.status != GatewayPaymentStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pagamento ja foi processado ou expirou"
        )
    
    # Verifica se expirou
    if payment.expires_at and datetime.now(timezone.utc) > payment.expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pagamento expirado"
        )
    
    method_upper = data.method.upper()
    
    if method_upper == 'PIX':
        # Gerar QR Code PIX
        result = await payment_service.generate_pix_for_payment(payment)
        return {
            "payment_id": payment.payment_id,
            "method": "PIX",
            "pix_qrcode": result.get("qrcode"),
            "pix_qrcode_image": result.get("qrcode_image"),
            "pix_txid": result.get("txid"),
            "expires_at": payment.expires_at.isoformat() if payment.expires_at else None
        }
        
    elif method_upper == 'CRYPTO':
        if not data.crypto_currency:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="crypto_currency e obrigatorio para pagamentos crypto"
            )
        
        # Gerar endereco crypto
        result = await payment_service.generate_crypto_address_for_payment(
            payment=payment,
            currency=data.crypto_currency.upper(),
            network=data.crypto_network
        )
        
        return {
            "payment_id": payment.payment_id,
            "method": "CRYPTO",
            "crypto_address": result.get("address"),
            "crypto_amount": result.get("amount"),
            "crypto_currency": result.get("currency"),
            "crypto_network": result.get("network"),
            "crypto_qrcode": result.get("qrcode"),
            "crypto_rate": result.get("rate"),
            "expires_at": payment.expires_at.isoformat() if payment.expires_at else None
        }
    
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Metodo invalido. Use PIX ou CRYPTO"
        )


# ============================================
# SETTINGS & FEES
# ============================================

@router.get(
    "/fees",
    response_model=GatewayFeesResponse,
    summary="Obter taxas",
    description="Retorna taxas atuais do gateway"
)
async def get_gateway_fees(
    db: Session = Depends(get_db)
):
    """Retorna taxas do gateway"""
    settings_service = GatewaySettingsService(db)
    
    return GatewayFeesResponse(
        pix_fee_percent=await settings_service.get_pix_fee_percent(),
        crypto_fee_percent=await settings_service.get_crypto_fee_percent(),
        network_fee_percent=await settings_service.get_network_fee_percent(),
        min_fee_brl=Decimal('0.50'),
        min_payment_brl=await settings_service.get_min_payment(),
        max_payment_brl=await settings_service.get_max_payment(),
        daily_limit_brl=Decimal('100000.00')
    )
