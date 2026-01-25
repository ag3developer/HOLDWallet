"""
🚀 WolkPay - API Router
========================

Endpoints da API WolkPay.

Routes:
- /wolkpay/invoice - Criar fatura (autenticado)
- /wolkpay/my-invoices - Minhas faturas (autenticado)
- /wolkpay/checkout/{token} - Checkout público
- /wolkpay/checkout/{token}/payer - Salvar dados pagador
- /wolkpay/checkout/{token}/pay - Gerar PIX
- /wolkpay/checkout/{token}/status - Status pagamento

Author: HOLD Wallet Team
Date: January 2026
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID

from app.db.database import get_db
from app.core.security import get_current_user, get_current_user_optional
from app.models.user import User
from app.services.wolkpay_service import WolkPayService
from app.core.kyc_middleware import check_user_kyc_level
from app.models.kyc import KYCLevel
from app.schemas.wolkpay import (
    CreateInvoiceRequest,
    InvoiceCreatedResponse,
    InvoiceResponse,
    InvoiceListResponse,
    CheckoutDataResponse,
    CheckoutExpiredResponse,
    SavePayerDataRequest,
    PixPaymentResponse,
    PaymentStatusResponse
)
from app.services.platform_settings_service import platform_settings_service
from app.services.kyc_service import KYCService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/wolkpay", tags=["WolkPay"])


# ==========================================
# CONFIGURAÇÕES PÚBLICAS (TAXAS/LIMITES)
# ==========================================

@router.get("/config")
async def get_wolkpay_config(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Retorna configurações públicas do WolkPay (taxas, limites, etc.)
    
    Endpoint que pode ser usado autenticado ou não.
    - Se autenticado: retorna o limite personalizado do usuário baseado no KYC
    - Se não autenticado: retorna o limite global do sistema
    """
    service_fee = platform_settings_service.get_wolkpay_service_fee(db)
    network_fee = platform_settings_service.get_wolkpay_network_fee(db)
    
    # Limites globais do sistema
    min_brl = platform_settings_service.get(db, "wolkpay_min_brl", 100.0)
    max_brl_global = platform_settings_service.get(db, "wolkpay_max_brl", 15000.0)
    expiry_minutes = platform_settings_service.get(db, "wolkpay_expiry_minutes", 15)
    
    # Se usuário autenticado, buscar limite personalizado do KYC
    max_brl = max_brl_global
    kyc_level = None
    kyc_level_name = None
    
    logger.info(f"[WolkPay Config] current_user: {current_user}")
    
    if current_user:
        try:
            logger.info(f"[WolkPay Config] Buscando limites para user: {current_user.id}")
            kyc_service = KYCService(db)
            # Converter para UUID explicitamente para o type checker
            user_uuid = UUID(str(current_user.id)) if not isinstance(current_user.id, UUID) else current_user.id
            user_limits = await kyc_service.get_user_limits(user_uuid)
            
            logger.info(f"[WolkPay Config] Limites retornados: {user_limits}")
            
            # Buscar limite do serviço WolkPay
            wolkpay_limit = user_limits.get("wolkpay", {})
            if wolkpay_limit and isinstance(wolkpay_limit, dict):
                # Usar o limite por transação ou diário, o que for menor
                transaction_limit = wolkpay_limit.get("transaction_limit_brl")
                daily_limit = wolkpay_limit.get("daily_limit_brl")
                
                logger.info(f"[WolkPay Config] transaction_limit={transaction_limit}, daily_limit={daily_limit}")
                
                # Determinar o limite máximo efetivo
                limits_to_check = [float(max_brl_global)]
                if transaction_limit is not None:
                    limits_to_check.append(float(transaction_limit))
                if daily_limit is not None:
                    limits_to_check.append(float(daily_limit))
                
                max_brl = min(limits_to_check)
                logger.info(f"[WolkPay Config] max_brl calculado: {max_brl}")
            
            # Incluir info do nível KYC (agora vem no nível raiz)
            kyc_level = user_limits.get("kyc_level")
            kyc_level_name = user_limits.get("kyc_level_name")
            
        except Exception as e:
            logger.warning(f"Erro ao buscar limites KYC do usuário: {e}")
            # Continua usando o limite global
    
    response = {
        "service_fee_percentage": service_fee,
        "network_fee_percentage": network_fee,
        "total_fee_percentage": round(service_fee + network_fee, 2),
        "min_amount_brl": min_brl,
        "max_amount_brl": max_brl,
        "expiry_minutes": expiry_minutes
    }
    
    # Adicionar info KYC se usuário autenticado
    if current_user:
        response["kyc_level"] = kyc_level
        response["kyc_level_name"] = kyc_level_name
        response["max_global_brl"] = max_brl_global  # Limite global para referência
    
    return response


# ==========================================
# BENEFICIÁRIO (AUTENTICADO)
# ==========================================

@router.post("/invoice", response_model=InvoiceCreatedResponse)
async def create_invoice(
    request: CreateInvoiceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Cria uma nova fatura WolkPay
    
    O beneficiário (usuário logado) cria uma fatura que pode ser paga por terceiros.
    
    - Validade: 15 minutos (devido à volatilidade crypto)
    - Limite por operação: Configurável pelo admin
    - Taxas: 3,65% serviço + 0,15% rede
    - KYC: Requer nível BASIC (verificação básica)
    
    Retorna URL de checkout para compartilhar com o pagador.
    """
    try:
        # Verificar KYC - WolkPay requer BASIC para usar a ferramenta
        await check_user_kyc_level(current_user.id, KYCLevel.BASIC, db)
        
        service = WolkPayService(db)
        invoice, checkout_url = await service.create_invoice(
            user_id=str(current_user.id),
            request=request
        )
        
        # Calcular tempo restante
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        if invoice.expires_at.tzinfo is None:
            expires_at = invoice.expires_at.replace(tzinfo=timezone.utc)
        else:
            expires_at = invoice.expires_at
        expires_in = max(0, int((expires_at - now).total_seconds()))
        
        return InvoiceCreatedResponse(
            invoice=InvoiceResponse(
                id=str(invoice.id),
                invoice_number=invoice.invoice_number,
                status=invoice.status.value,
                beneficiary_id=str(invoice.beneficiary_id),
                beneficiary_name=service._mask_name(current_user.username),
                crypto_currency=invoice.crypto_currency,
                crypto_amount=invoice.crypto_amount,
                crypto_network=invoice.crypto_network,
                usd_rate=invoice.usd_rate,
                brl_rate=invoice.brl_rate,
                base_amount_brl=invoice.base_amount_brl,
                service_fee_percent=invoice.service_fee_percent,
                service_fee_brl=invoice.service_fee_brl,
                network_fee_percent=invoice.network_fee_percent,
                network_fee_brl=invoice.network_fee_brl,
                total_amount_brl=invoice.total_amount_brl,
                beneficiary_receives_crypto=invoice.beneficiary_receives_crypto,
                checkout_token=invoice.checkout_token,
                checkout_url=checkout_url,
                created_at=invoice.created_at,
                expires_at=invoice.expires_at,
                expires_in_seconds=expires_in
            ),
            share_url=checkout_url,
            share_qr_code=service._generate_qr_code_base64(checkout_url),
            message="Fatura criada com sucesso! Compartilhe o link com o pagador. Válida por 15 minutos."
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Erro ao criar fatura WolkPay: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao criar fatura")


@router.get("/my-invoices", response_model=InvoiceListResponse)
async def get_my_invoices(
    status: Optional[str] = Query(None, description="Filtrar por status"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lista faturas criadas pelo usuário (beneficiário)
    """
    try:
        service = WolkPayService(db)
        invoices, total = await service.get_user_invoices(
            user_id=str(current_user.id),
            status=status,
            page=page,
            per_page=per_page
        )
        
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        
        return InvoiceListResponse(
            invoices=[
                InvoiceResponse(
                    id=str(inv.id),
                    invoice_number=inv.invoice_number,
                    status=inv.status.value,
                    beneficiary_id=str(inv.beneficiary_id),
                    beneficiary_name=service._mask_name(current_user.username),
                    crypto_currency=inv.crypto_currency,
                    crypto_amount=inv.crypto_amount,
                    crypto_network=inv.crypto_network,
                    usd_rate=inv.usd_rate,
                    brl_rate=inv.brl_rate,
                    base_amount_brl=inv.base_amount_brl,
                    service_fee_percent=inv.service_fee_percent,
                    service_fee_brl=inv.service_fee_brl,
                    network_fee_percent=inv.network_fee_percent,
                    network_fee_brl=inv.network_fee_brl,
                    total_amount_brl=inv.total_amount_brl,
                    fee_payer=inv.fee_payer.value if hasattr(inv.fee_payer, 'value') else str(inv.fee_payer) if inv.fee_payer else "BENEFICIARY",
                    beneficiary_receives_brl=inv.beneficiary_receives_brl,
                    beneficiary_receives_crypto=inv.beneficiary_receives_crypto,
                    checkout_token=inv.checkout_token,
                    checkout_url=inv.checkout_url,
                    # Dados da transação blockchain
                    crypto_tx_hash=inv.crypto_tx_hash,
                    crypto_tx_network=inv.crypto_tx_network,
                    crypto_wallet_address=inv.crypto_wallet_address,
                    crypto_sent_at=inv.crypto_sent_at,
                    crypto_explorer_url=inv.crypto_explorer_url,
                    created_at=inv.created_at,
                    expires_at=inv.expires_at,
                    expires_in_seconds=max(0, int((inv.expires_at.replace(tzinfo=timezone.utc) - now).total_seconds())) if inv.expires_at else 0
                )
                for inv in invoices
            ],
            total=total,
            page=page,
            per_page=per_page
        )
        
    except Exception as e:
        logger.error(f"Erro ao listar faturas: {e}")
        raise HTTPException(status_code=500, detail="Erro ao listar faturas")


@router.get("/invoice/{invoice_id}")
async def get_invoice(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtém detalhes de uma fatura específica (apenas do próprio usuário)
    """
    from app.models.wolkpay import WolkPayInvoice
    
    invoice = db.query(WolkPayInvoice).filter(
        WolkPayInvoice.id == invoice_id,
        WolkPayInvoice.beneficiary_id == str(current_user.id)
    ).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Fatura não encontrada")
    
    service = WolkPayService(db)
    
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    expires_in = 0
    if invoice.expires_at:
        if invoice.expires_at.tzinfo is None:
            expires_at = invoice.expires_at.replace(tzinfo=timezone.utc)
        else:
            expires_at = invoice.expires_at
        expires_in = max(0, int((expires_at - now).total_seconds()))
    
    return InvoiceResponse(
        id=str(invoice.id),
        invoice_number=invoice.invoice_number,
        status=invoice.status.value,
        beneficiary_id=str(invoice.beneficiary_id),
        beneficiary_name=service._mask_name(current_user.username),
        crypto_currency=invoice.crypto_currency,
        crypto_amount=invoice.crypto_amount,
        crypto_network=invoice.crypto_network,
        usd_rate=invoice.usd_rate,
        brl_rate=invoice.brl_rate,
        base_amount_brl=invoice.base_amount_brl,
        service_fee_percent=invoice.service_fee_percent,
        service_fee_brl=invoice.service_fee_brl,
        network_fee_percent=invoice.network_fee_percent,
        network_fee_brl=invoice.network_fee_brl,
        total_amount_brl=invoice.total_amount_brl,
        beneficiary_receives_crypto=invoice.beneficiary_receives_crypto,
        checkout_token=invoice.checkout_token,
        checkout_url=invoice.checkout_url,
        created_at=invoice.created_at,
        expires_at=invoice.expires_at,
        expires_in_seconds=expires_in
    )


# ==========================================
# CHECKOUT PÚBLICO (PAGADOR)
# ==========================================

@router.get("/checkout/{token}/lookup-payer")
async def lookup_payer_by_document(
    token: str,
    document: str = Query(..., description="CPF ou CNPJ do pagador (apenas números)"),
    db: Session = Depends(get_db)
):
    """
    Busca dados de pagador existente por CPF/CNPJ (checkout inteligente)
    
    Permite auto-preenchimento dos dados se o pagador já realizou
    pagamentos anteriores. Não requer autenticação.
    
    Returns:
        Dados do pagador se encontrado, ou vazio se novo
    """
    try:
        service = WolkPayService(db)
        payer_data = await service.lookup_payer_by_document(
            checkout_token=token,
            document=document
        )
        
        if payer_data:
            return {
                "found": True,
                "payer": payer_data
            }
        
        return {
            "found": False,
            "payer": None
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Erro ao buscar pagador: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar dados")


@router.get("/checkout/{token}")
async def get_checkout(
    token: str,
    db: Session = Depends(get_db)
):
    """
    Obtém dados do checkout (página pública para o pagador)
    
    Não requer autenticação - qualquer pessoa com o link pode acessar.
    
    Retorna:
    - Dados da fatura (valor, crypto, beneficiário parcial)
    - Status (PENDING, EXPIRED, etc)
    - Tempo restante
    """
    try:
        service = WolkPayService(db)
        checkout_data = await service.get_checkout_data(token)
        
        if not checkout_data:
            raise HTTPException(status_code=404, detail="Fatura não encontrada")
        
        if checkout_data.is_expired:
            return CheckoutExpiredResponse(
                invoice_id=checkout_data.invoice_id,
                invoice_number=checkout_data.invoice_number,
                status="EXPIRED",
                message="Esta fatura expirou. Solicite uma nova fatura ao beneficiário.",
                expired_at=checkout_data.expires_at
            )
        
        return checkout_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao obter checkout: {e}")
        raise HTTPException(status_code=500, detail="Erro ao carregar checkout")


@router.post("/checkout/{token}/payer")
async def save_payer_data(
    token: str,
    request: SavePayerDataRequest,
    http_request: Request,
    db: Session = Depends(get_db)
):
    """
    Salva dados do pagador no checkout (página pública)
    
    O pagador preenche:
    - Dados pessoais (PF) ou empresariais (PJ)
    - Endereço completo
    - Aceite dos termos
    
    Não requer autenticação.
    """
    try:
        # Obter IP e User-Agent
        ip_address = http_request.client.host if http_request.client else "unknown"
        user_agent = http_request.headers.get("user-agent", "unknown")
        
        # Tentar obter IP real se estiver atrás de proxy
        forwarded_for = http_request.headers.get("x-forwarded-for")
        if forwarded_for:
            ip_address = forwarded_for.split(",")[0].strip()
        
        service = WolkPayService(db)
        payer = await service.save_payer_data(
            checkout_token=token,
            request=request,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        return {
            "success": True,
            "message": "Dados salvos com sucesso. Prossiga para o pagamento.",
            "payer_id": payer.id,
            "next_step": "pay"
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        logger.error(f"Erro ao salvar dados do pagador: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Erro ao salvar dados: {str(e)}")


@router.post("/checkout/{token}/pay", response_model=PixPaymentResponse)
async def generate_payment(
    token: str,
    db: Session = Depends(get_db)
):
    """
    Gera PIX para pagamento (página pública)
    
    Requer que os dados do pagador já tenham sido preenchidos.
    
    Retorna:
    - QR Code PIX
    - Código copia e cola
    - Dados do favorecido (HOLD DIGITAL ASSETS)
    - Tempo restante
    """
    try:
        service = WolkPayService(db)
        pix_data = await service.generate_pix_payment(token)
        
        return pix_data
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        logger.error(f"Erro ao gerar PIX: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Erro ao gerar PIX: {str(e)}")


@router.get("/checkout/{token}/status", response_model=PaymentStatusResponse)
async def get_payment_status(
    token: str,
    db: Session = Depends(get_db)
):
    """
    Verifica status do pagamento (polling)
    
    O frontend pode chamar este endpoint periodicamente para verificar
    se o pagamento foi confirmado.
    
    Na Fase 1 (Conta Estática): Depende de confirmação manual do admin
    Na Fase 2 (BB-AUTO): Confirmação automática via webhook
    """
    from app.models.wolkpay import WolkPayInvoice, WolkPayPayment, InvoiceStatus
    
    invoice = db.query(WolkPayInvoice).filter(
        WolkPayInvoice.checkout_token == token
    ).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Fatura não encontrada")
    
    payment = db.query(WolkPayPayment).filter(
        WolkPayPayment.invoice_id == invoice.id
    ).first()
    
    # Verificar se expirou
    if invoice.is_expired() and invoice.status in [InvoiceStatus.PENDING, InvoiceStatus.AWAITING_PAYMENT]:
        invoice.status = InvoiceStatus.EXPIRED
        db.commit()
    
    paid = invoice.status in [InvoiceStatus.PAID, InvoiceStatus.APPROVED, InvoiceStatus.COMPLETED]
    
    messages = {
        InvoiceStatus.PENDING: "Aguardando preenchimento dos dados do pagador",
        InvoiceStatus.AWAITING_PAYMENT: "Aguardando pagamento PIX",
        InvoiceStatus.PAID: "Pagamento recebido! Aguardando processamento.",
        InvoiceStatus.APPROVED: "Pagamento aprovado! Crypto sendo enviada.",
        InvoiceStatus.COMPLETED: "Operação concluída! Crypto enviada ao beneficiário.",
        InvoiceStatus.EXPIRED: "Fatura expirada",
        InvoiceStatus.CANCELLED: "Fatura cancelada",
        InvoiceStatus.REJECTED: "Fatura rejeitada"
    }
    
    return PaymentStatusResponse(
        invoice_id=str(invoice.id),
        invoice_number=invoice.invoice_number,
        status=invoice.status.value,
        paid=paid,
        paid_at=payment.paid_at if payment else None,
        message=messages.get(invoice.status, "Status desconhecido")
    )


# ==========================================
# PAGADOR CONFIRMA QUE PAGOU
# ==========================================

@router.post("/checkout/{token}/payer-confirmed")
async def payer_confirmed_payment(
    token: str,
    db: Session = Depends(get_db)
):
    """
    Pagador informa que realizou o pagamento PIX.
    
    IMPORTANTE: Este endpoint NÃO muda o status da fatura para PAID.
    Apenas registra que o pagador confirmou ter pago, para que o admin
    possa verificar manualmente se o PIX foi recebido.
    
    O status só muda para PAID quando o admin confirmar.
    """
    from app.models.wolkpay import WolkPayInvoice, WolkPayPayment, InvoiceStatus
    from datetime import datetime, timezone
    
    invoice = db.query(WolkPayInvoice).filter(
        WolkPayInvoice.checkout_token == token
    ).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Fatura não encontrada")
    
    # Verificar se já expirou
    if invoice.is_expired() and invoice.status in [InvoiceStatus.PENDING, InvoiceStatus.AWAITING_PAYMENT]:
        invoice.status = InvoiceStatus.EXPIRED
        db.commit()
        raise HTTPException(status_code=400, detail="Fatura expirada")
    
    # Buscar payment
    payment = db.query(WolkPayPayment).filter(
        WolkPayPayment.invoice_id == invoice.id
    ).first()
    
    if payment:
        # Registrar que o pagador confirmou (se o campo existir)
        try:
            payment.payer_confirmed_at = datetime.now(timezone.utc)
            db.commit()
        except Exception:
            # Se o campo não existir ainda, continua sem erro
            pass
    
    # Log de auditoria
    service = WolkPayService(db)
    service._log_audit(
        invoice_id=str(invoice.id),
        actor_type="payer",
        actor_id=str(invoice.payer.id) if invoice.payer else "unknown",
        action="payer_confirmed",
        description=f"Pagador informou que realizou o pagamento PIX da fatura {invoice.invoice_number}. Aguardando verificação manual do admin."
    )
    db.commit()
    
    logger.info(f"Pagador confirmou pagamento da fatura {invoice.invoice_number}")
    
    return {
        "success": True,
        "message": "Confirmação recebida. O admin irá verificar o pagamento."
    }


# ==========================================
# CANCELAMENTO
# ==========================================

@router.post("/invoice/{invoice_id}/cancel")
async def cancel_invoice(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Cancela uma fatura (apenas o beneficiário pode cancelar)
    
    Só pode cancelar faturas nos status: PENDING, AWAITING_PAYMENT
    """
    from app.models.wolkpay import WolkPayInvoice, InvoiceStatus
    
    invoice = db.query(WolkPayInvoice).filter(
        WolkPayInvoice.id == invoice_id,
        WolkPayInvoice.beneficiary_id == str(current_user.id)
    ).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Fatura não encontrada")
    
    if invoice.status not in [InvoiceStatus.PENDING, InvoiceStatus.AWAITING_PAYMENT]:
        raise HTTPException(
            status_code=400, 
            detail=f"Não é possível cancelar fatura no status {invoice.status.value}"
        )
    
    invoice.status = InvoiceStatus.CANCELLED
    db.commit()
    
    # Log de auditoria
    service = WolkPayService(db)
    service._log_audit(
        invoice_id=invoice_id,
        actor_type="user",
        actor_id=str(current_user.id),
        action="cancel_invoice",
        description=f"Fatura {invoice.invoice_number} cancelada pelo beneficiário"
    )
    db.commit()
    
    return {
        "success": True,
        "message": "Fatura cancelada com sucesso",
        "invoice_number": invoice.invoice_number,
        "status": "CANCELLED"
    }


# ==========================================
# CONVERSÃO PAGADOR -> USUÁRIO
# ==========================================

@router.get("/checkout/{token}/conversion-eligibility")
async def check_conversion_eligibility(
    token: str,
    db: Session = Depends(get_db)
):
    """
    Verifica se o pagador pode criar uma conta WolkNow
    
    Chamado após o pagamento ser confirmado para mostrar
    a oferta de criação de conta.
    
    Retorna:
    - can_convert: se pode criar conta
    - dados do pagador (parciais) para preview
    - benefícios
    """
    service = WolkPayService(db)
    eligibility = await service.check_payer_conversion_eligibility(token)
    
    # Adicionar benefícios se elegível
    if eligibility.get("can_convert"):
        benefits = service.get_payer_benefits_info()
        eligibility["benefits_info"] = benefits
    
    return eligibility


@router.post("/checkout/{token}/create-account")
async def create_account_from_payer(
    token: str,
    request: Request,
    password: str = Query(..., min_length=8, description="Senha para a nova conta"),
    confirm_password: str = Query(..., min_length=8, description="Confirmação de senha"),
    accept_terms: bool = Query(..., description="Aceitar termos de uso"),
    accept_privacy: bool = Query(..., description="Aceitar política de privacidade"),
    accept_marketing: bool = Query(False, description="Aceitar comunicações de marketing"),
    db: Session = Depends(get_db)
):
    """
    Cria uma conta WolkNow a partir dos dados do pagador
    
    O pagador já preencheu todos os dados de compliance durante
    o checkout, então só precisa:
    - Criar uma senha
    - Aceitar termos e privacidade
    
    Os dados (nome, email, CPF/CNPJ, endereço) são copiados
    automaticamente do cadastro de pagador.
    """
    # Validar senhas
    if password != confirm_password:
        raise HTTPException(status_code=400, detail="As senhas não conferem")
    
    if not accept_terms:
        raise HTTPException(status_code=400, detail="É obrigatório aceitar os termos de uso")
    
    if not accept_privacy:
        raise HTTPException(status_code=400, detail="É obrigatório aceitar a política de privacidade")
    
    # Obter IP
    ip_address = None
    if request:
        ip_address = request.client.host if request.client else None
    
    try:
        service = WolkPayService(db)
        user, message = await service.convert_payer_to_user(
            checkout_token=token,
            password=password,
            accept_marketing=accept_marketing,
            ip_address=ip_address
        )
        
        return {
            "success": True,
            "user_id": str(user.id),
            "email": user.email,
            "name": user.username,
            "message": message,
            "benefits": [
                "Bônus de boas-vindas em crypto",
                "Taxas reduzidas em operações",
                "Acesso ao painel de investimentos",
                "Carteira segura com backup",
                "Compra e venda instantânea",
                "App mobile exclusivo"
            ],
            "next_steps": [
                "Confirme seu e-mail",
                "Complete a verificação de identidade",
                "Faça seu primeiro depósito",
                "Comece a investir!"
            ]
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Erro ao criar conta do pagador: {e}")
        raise HTTPException(status_code=500, detail="Erro ao criar conta")


@router.get("/checkout/{token}/benefits-info")
async def get_benefits_info(
    token: str,
    db: Session = Depends(get_db)
):
    """
    Retorna informações sobre benefícios de criar conta
    
    Usado para exibir o card de conversão no frontend
    após o pagamento ser confirmado.
    """
    service = WolkPayService(db)
    return service.get_payer_benefits_info()
