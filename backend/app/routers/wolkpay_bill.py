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
from app.services.wolkpay_bill_service import WolkPayBillService
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
    request: QuoteBillPaymentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Gera cotação para pagamento de boleto
    
    Calcula:
    - Valor do boleto
    - Taxas (4.75% serviço + 0.25% rede = 5%)
    - Quantidade de crypto necessária
    - Verifica saldo do usuário
    
    ⚠️ Cotação válida por 5 minutos
    """
    try:
        service = WolkPayBillService(db)
        result = await service.quote_bill_payment(
            user_id=current_user.id,
            request=request
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Erro ao cotar pagamento: {e}")
        raise HTTPException(status_code=500, detail="Erro ao processar cotação")


@router.post("/confirm", response_model=BillPaymentResponse)
async def confirm_bill_payment(
    request: ConfirmBillPaymentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Confirma pagamento e DEBITA CRYPTO IMEDIATAMENTE
    
    ⚠️ IMPORTANTE: 
    - Após esta chamada, a crypto SAI da carteira do usuário
    - O pagamento do boleto será processado em até 24h úteis
    - Em caso de falha, a crypto será reembolsada
    
    Requisitos:
    - Cotação válida (não expirada)
    - Saldo suficiente em crypto
    - Boleto não vencido
    """
    try:
        service = WolkPayBillService(db)
        result = await service.confirm_bill_payment(
            user_id=current_user.id,
            request=request
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
    Obtém detalhes de um pagamento específico
    """
    try:
        payment = db.query(WolkPayBillPayment).filter(
            WolkPayBillPayment.id == payment_id,
            WolkPayBillPayment.user_id == current_user.id
        ).first()
        
        if not payment:
            raise HTTPException(status_code=404, detail="Pagamento não encontrado")
        
        service = WolkPayBillService(db)
        return service._build_response(payment)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao buscar pagamento: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar pagamento")


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
    request: OperatorPayBillRequest,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Operador marca boleto como pago
    
    Após pagar o boleto via internet banking:
    - Informar código de autenticação bancária
    - Opcionalmente, anexar comprovante
    """
    try:
        service = WolkPayBillService(db)
        result = await service.operator_pay_bill(
            operator_id=current_user.id,
            payment_id=request.payment_id,
            bank_authentication=request.bank_authentication,
            payment_receipt_url=request.payment_receipt_url,
            notes=request.notes
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Erro ao marcar boleto como pago: {e}")
        raise HTTPException(status_code=500, detail="Erro ao processar pagamento")


@router.post("/admin/refund", response_model=BillPaymentResponse)
async def refund_bill_payment(
    request: RefundBillPaymentRequest,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Reembolsa crypto ao usuário
    
    Usado quando:
    - Boleto já estava pago
    - Erro no sistema bancário
    - Outros problemas que impedem o pagamento
    
    A crypto será creditada de volta na carteira do usuário.
    """
    try:
        service = WolkPayBillService(db)
        result = await service.refund_bill_payment(
            operator_id=current_user.id,
            payment_id=request.payment_id,
            reason=request.reason
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
