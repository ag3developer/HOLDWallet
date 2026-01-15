"""
🚀 WolkPay Bill Payment Router
===============================

Endpoints para pagamento de boletos usando crypto.

Endpoints:
- POST /bill/validate - Validar código de barras
- POST /bill/quote - Cotar pagamento
- POST /bill/confirm - Confirmar e debitar crypto
- GET /bill/payments - Listar pagamentos do usuário
- GET /bill/payment/{id} - Detalhes de um pagamento

Admin/Operator:
- POST /bill/admin/pay - Marcar boleto como pago
- POST /bill/admin/refund - Reembolsar crypto
- GET /bill/admin/pending - Listar boletos pendentes de pagamento

Author: HOLD Wallet Team
Date: Janeiro 2026
"""

import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_user, get_current_admin
from app.models.user import User
from app.models.wolkpay import WolkPayBillPayment, BillPaymentStatus
from app.services.wolkpay_bill_service import WolkPayBillService, RequestContext
from app.services.platform_settings_service import platform_settings_service
from app.schemas.wolkpay import (
    ValidateBillRequest,
    BillInfoResponse,
    QuoteBillPaymentRequest,
    BillPaymentQuoteResponse,
    ConfirmBillPaymentRequest,
    BillPaymentResponse,
    BillPaymentListResponse,
    OperatorPayBillRequest,
    RefundBillPaymentRequest
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/wolkpay/bill", tags=["WolkPay Bill Payment"])


# ============================================
# ENDPOINTS PÚBLICOS (configurações)
# ============================================

@router.get("/settings")
async def get_bill_payment_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retorna configurações públicas do serviço de Bill Payment
    
    Usado pelo frontend para mostrar:
    - Taxa de serviço e rede
    - Valor mínimo e máximo permitido
    - Tempo de expiração da cotação
    """
    try:
        settings = {
            "service_fee_percent": float(platform_settings_service.get(db, "wolkpay_service_fee_percentage", 3.65)),
            "network_fee_percent": float(platform_settings_service.get(db, "wolkpay_network_fee_percentage", 0.35)),
            "total_fee_percent": float(platform_settings_service.get(db, "wolkpay_service_fee_percentage", 3.65)) + 
                                  float(platform_settings_service.get(db, "wolkpay_network_fee_percentage", 0.35)),
            "min_amount_brl": float(platform_settings_service.get(db, "wolkpay_min_brl", 100.0)),
            "max_amount_brl": float(platform_settings_service.get(db, "wolkpay_max_brl", 15000.0)),
            "quote_expiry_minutes": int(platform_settings_service.get(db, "wolkpay_expiry_minutes", 15)),
        }
        
        return {
            "success": True,
            "data": settings
        }
    except Exception as e:
        logger.error(f"Erro ao buscar configurações de Bill Payment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# ENDPOINTS DO USUÁRIO
# ============================================

@router.post("/validate", response_model=BillInfoResponse)
async def validate_bill(
    request: ValidateBillRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Valida código de barras de um boleto
    
    Retorna:
    - Informações do boleto (valor, vencimento, banco)
    - Validação de vencimento (mínimo 1 dia antes)
    - Alertas se necessário
    
    ⚠️ Regras:
    - Boleto NÃO pode estar vencido
    - Mínimo 1 dia de antecedência
    """
    try:
        service = WolkPayBillService(db)
        result = await service.validate_bill(request.barcode)
        return result
    except Exception as e:
        logger.error(f"Erro ao validar boleto: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/quote", response_model=BillPaymentQuoteResponse)
async def quote_bill_payment(
    request_body: QuoteBillPaymentRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Gera cotacao para pagamento de boleto
    
    Calcula:
    - Valor do boleto
    - Taxas (4.75% servico + 0.25% rede = 5%)
    - Quantidade de crypto necessaria
    - Verifica saldo do usuario
    
    Cotacao valida por 5 minutos
    """
    try:
        context = RequestContext.from_request(request)
        service = WolkPayBillService(db)
        result = await service.quote_bill_payment(
            user_id=current_user.id,
            request=request_body,
            context=context
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Erro ao cotar pagamento: {e}")
        raise HTTPException(status_code=500, detail="Erro ao processar cotacao")


@router.post("/confirm", response_model=BillPaymentResponse)
async def confirm_bill_payment(
    request_body: ConfirmBillPaymentRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Confirma pagamento e DEBITA CRYPTO IMEDIATAMENTE
    
    IMPORTANTE: 
    - Apos esta chamada, a crypto SAI da carteira do usuario
    - O pagamento do boleto sera processado em ate 24h uteis
    - Em caso de falha, a crypto sera reembolsada
    
    Requisitos:
    - Cotacao valida (nao expirada)
    - Saldo suficiente em crypto
    - Boleto nao vencido
    """
    try:
        context = RequestContext.from_request(request)
        service = WolkPayBillService(db)
        result = await service.confirm_bill_payment(
            user_id=current_user.id,
            request=request_body,
            context=context
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Erro ao confirmar pagamento: {e}")
        raise HTTPException(status_code=500, detail="Erro ao processar pagamento")


@router.get("/payments", response_model=BillPaymentListResponse)
async def get_user_bill_payments(
    status: Optional[str] = Query(None, description="Filtrar por status (separados por vírgula)"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lista pagamentos de boletos do usuário
    
    Filtros disponíveis:
    - status: PENDING, CRYPTO_DEBITED, PROCESSING, PAYING, PAID, FAILED, REFUNDED, CANCELLED, EXPIRED
    """
    try:
        service = WolkPayBillService(db)
        result = await service.get_user_bill_payments(
            user_id=current_user.id,
            status=status,
            page=page,
            per_page=per_page
        )
        return result
    except Exception as e:
        logger.error(f"Erro ao listar pagamentos: {e}")
        raise HTTPException(status_code=500, detail="Erro ao listar pagamentos")


@router.get("/payment/{payment_id}", response_model=BillPaymentResponse)
async def get_bill_payment(
    payment_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtem detalhes de um pagamento especifico
    """
    try:
        payment = db.query(WolkPayBillPayment).filter(
            WolkPayBillPayment.id == payment_id,
            WolkPayBillPayment.user_id == current_user.id
        ).first()
        
        if not payment:
            raise HTTPException(status_code=404, detail="Pagamento nao encontrado")
        
        service = WolkPayBillService(db)
        return service._build_response(payment)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao buscar pagamento: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar pagamento")


@router.get("/payment/{payment_id}/timeline")
async def get_bill_payment_timeline(
    payment_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retorna timeline completa do pagamento de boleto
    
    Mostra todos os passos do fluxo:
    1. Pedido Criado
    2. Crypto Debitada (com TX hash e link do explorer)
    3. Em Processamento
    4. Pagando Boleto
    5. Pago / Falhou / Reembolsado
    
    Cada passo inclui:
    - Titulo e descricao
    - Timestamp
    - Status (completed, current, failed)
    - TX hash e explorer URL quando aplicavel
    """
    try:
        payment = db.query(WolkPayBillPayment).filter(
            WolkPayBillPayment.id == payment_id,
            WolkPayBillPayment.user_id == current_user.id
        ).first()
        
        if not payment:
            raise HTTPException(status_code=404, detail="Pagamento nao encontrado")
        
        service = WolkPayBillService(db)
        timeline = await service.get_payment_timeline(str(payment.id))
        
        # Buscar logs detalhados
        from app.models.wolkpay import WolkPayBillPaymentLog
        logs = db.query(WolkPayBillPaymentLog).filter(
            WolkPayBillPaymentLog.bill_payment_id == payment_id
        ).order_by(WolkPayBillPaymentLog.created_at.asc()).all()
        
        logs_data = []
        for log in logs:
            log_entry = {
                "event": log.event,
                "old_status": log.old_status,
                "new_status": log.new_status,
                "timestamp": log.created_at.isoformat() if log.created_at else None,
                "actor_type": log.actor_type,
            }
            # Adicionar campos de auditoria se existirem
            if hasattr(log, 'ip_address') and log.ip_address:
                log_entry["ip_address"] = log.ip_address
            if hasattr(log, 'user_agent') and log.user_agent:
                log_entry["user_agent"] = log.user_agent
            if hasattr(log, 'request_id') and log.request_id:
                log_entry["request_id"] = log.request_id
            logs_data.append(log_entry)
        
        return {
            "success": True,
            "payment_id": str(payment.id),
            "payment_number": payment.payment_number,
            "current_status": payment.status.value,
            "timeline": timeline,
            "logs": logs_data,
            "blockchain": {
                "tx_hash": getattr(payment, 'crypto_tx_hash', None) or payment.internal_tx_id,
                "explorer_url": getattr(payment, 'crypto_explorer_url', None),
                "network": payment.crypto_network,
                "debited_at": payment.crypto_debited_at.isoformat() if payment.crypto_debited_at else None
            },
            "bank_payment": {
                "authentication": payment.bank_authentication,
                "receipt_url": payment.payment_receipt_url,
                "paid_at": payment.paid_at.isoformat() if payment.paid_at else None
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao buscar timeline: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar timeline")


# ============================================
# ENDPOINTS DO ADMIN/OPERADOR
# ============================================

@router.get("/admin/pending", response_model=BillPaymentListResponse)
async def get_pending_bill_payments(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Lista boletos pendentes de pagamento (para operadores)
    
    Mostra boletos com status:
    - CRYPTO_DEBITED (crypto já debitada, aguardando pagamento)
    - PROCESSING (em processamento)
    - PAYING (sendo pago)
    """
    try:
        query = db.query(WolkPayBillPayment).filter(
            WolkPayBillPayment.status.in_([
                BillPaymentStatus.CRYPTO_DEBITED,
                BillPaymentStatus.PROCESSING,
                BillPaymentStatus.PAYING
            ])
        )
        
        total = query.count()
        
        payments = query.order_by(
            WolkPayBillPayment.created_at.asc()  # Mais antigos primeiro
        ).offset((page - 1) * per_page).limit(per_page).all()
        
        service = WolkPayBillService(db)
        
        return BillPaymentListResponse(
            payments=[service._build_response(p) for p in payments],
            total=total,
            page=page,
            per_page=per_page
        )
        
    except Exception as e:
        logger.error(f"Erro ao listar boletos pendentes: {e}")
        raise HTTPException(status_code=500, detail="Erro ao listar boletos")


@router.post("/admin/pay", response_model=BillPaymentResponse)
async def operator_pay_bill(
    request_body: OperatorPayBillRequest,
    request: Request,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Operador marca boleto como pago
    
    Apos pagar o boleto via internet banking:
    - Informar codigo de autenticacao bancaria
    - Opcionalmente, anexar comprovante
    """
    try:
        context = RequestContext.from_request(request)
        service = WolkPayBillService(db)
        result = await service.operator_pay_bill(
            operator_id=current_user.id,
            payment_id=request_body.payment_id,
            bank_authentication=request_body.bank_authentication,
            payment_receipt_url=request_body.payment_receipt_url,
            notes=request_body.notes,
            context=context
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Erro ao marcar boleto como pago: {e}")
        raise HTTPException(status_code=500, detail="Erro ao processar pagamento")


@router.post("/admin/refund", response_model=BillPaymentResponse)
async def refund_bill_payment(
    request_body: RefundBillPaymentRequest,
    request: Request,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Reembolsa crypto ao usuario
    
    Usado quando:
    - Boleto ja estava pago
    - Erro no sistema bancario
    - Outros problemas que impedem o pagamento
    
    A crypto sera creditada de volta na carteira do usuario.
    """
    try:
        context = RequestContext.from_request(request)
        service = WolkPayBillService(db)
        result = await service.refund_bill_payment(
            operator_id=current_user.id,
            payment_id=request_body.payment_id,
            reason=request_body.reason,
            context=context
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Erro ao reembolsar pagamento: {e}")
        raise HTTPException(status_code=500, detail="Erro ao processar reembolso")


@router.get("/admin/all", response_model=BillPaymentListResponse)
async def get_all_bill_payments(
    status: Optional[str] = Query(None, description="Filtrar por status"),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Lista todos os pagamentos de boletos (admin)
    """
    try:
        query = db.query(WolkPayBillPayment)
        
        if status:
            statuses = [s.strip() for s in status.split(',')]
            query = query.filter(WolkPayBillPayment.status.in_(statuses))
        
        total = query.count()
        
        payments = query.order_by(
            WolkPayBillPayment.created_at.desc()
        ).offset((page - 1) * per_page).limit(per_page).all()
        
        service = WolkPayBillService(db)
        
        return BillPaymentListResponse(
            payments=[service._build_response(p) for p in payments],
            total=total,
            page=page,
            per_page=per_page
        )
        
    except Exception as e:
        logger.error(f"Erro ao listar pagamentos: {e}")
        raise HTTPException(status_code=500, detail="Erro ao listar pagamentos")


@router.put("/admin/status/{payment_id}")
async def update_bill_payment_status(
    payment_id: str,
    new_status: str = Query(..., description="Novo status: PROCESSING, PAYING, FAILED"),
    notes: Optional[str] = Query(None),
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Atualiza status de um pagamento (admin)
    
    Status permitidos:
    - PROCESSING: Iniciando processamento
    - PAYING: Pagando o boleto
    - FAILED: Falhou (precisa de reembolso)
    """
    try:
        payment = db.query(WolkPayBillPayment).filter(
            WolkPayBillPayment.id == payment_id
        ).first()
        
        if not payment:
            raise HTTPException(status_code=404, detail="Pagamento não encontrado")
        
        valid_transitions = {
            'CRYPTO_DEBITED': ['PROCESSING', 'PAYING', 'FAILED'],
            'PROCESSING': ['PAYING', 'FAILED'],
            'PAYING': ['PAID', 'FAILED'],
        }
        
        current = payment.status.value
        allowed = valid_transitions.get(current, [])
        
        if new_status not in allowed:
            raise HTTPException(
                status_code=400, 
                detail=f"Transição inválida: {current} → {new_status}. Permitidos: {allowed}"
            )
        
        payment.status = BillPaymentStatus[new_status]
        
        if new_status == 'FAILED' and notes:
            payment.failure_reason = notes
        
        db.commit()
        
        service = WolkPayBillService(db)
        return service._build_response(payment)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao atualizar status: {e}")
        raise HTTPException(status_code=500, detail="Erro ao atualizar status")
