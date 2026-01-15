"""
🚀 WolkPay Bill Payment - Admin Router
=======================================

Endpoints administrativos para gerenciamento de pagamentos de boleto.

Routes:
- /admin/wolkpay/bill-payments - Lista todos os pagamentos
- /admin/wolkpay/bill-payments/pending - Pagamentos pendentes
- /admin/wolkpay/bill-payments/{id} - Detalhes do pagamento
- /admin/wolkpay/bill-payments/{id}/approve - Aprovar pagamento
- /admin/wolkpay/bill-payments/{id}/reject - Rejeitar com reembolso
- /admin/wolkpay/bill-payments/{id}/mark-paid - Marcar como pago
- /admin/wolkpay/bill-payments/{id}/process-crypto - Debitar crypto do usuário
- /admin/wolkpay/bill-payments/stats - Estatísticas
- /admin/wolkpay/bill-payments/reports - Relatórios
- /admin/wolkpay/bill-payments/expired-quotes - Lista cotações expiradas
- /admin/wolkpay/bill-payments/expire-quotes - Expira cotações em lote
- /admin/wolkpay/bill-payments/{id}/expire - Expira cotação específica

Author: HOLD Wallet Team
Date: January 2026
"""

import logging
import uuid
from datetime import datetime, timezone, date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc, text
from typing import Optional, List
from decimal import Decimal
from pydantic import BaseModel, Field

from app.db.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.wolkpay import (
    WolkPayBillPayment,
    WolkPayBillPaymentLog,
    BillPaymentStatus,
    BillType
)
from app.services.wallet_balance_service import WalletBalanceService
from app.services.blockchain_withdraw_service import blockchain_withdraw_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/wolkpay/bill-payments", tags=["WolkPay Bill Payment Admin"])


# ==========================================
# SCHEMAS
# ==========================================

class BillPaymentAdminResponse(BaseModel):
    """Resposta completa de um pagamento de boleto para admin"""
    id: str
    payment_number: str
    status: str
    status_display: str
    
    # Usuário
    user_id: str
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    user_phone: Optional[str] = None
    
    # Dados do Boleto
    bill_type: str
    bill_type_display: str
    barcode: str
    digitable_line: Optional[str] = None
    
    # Valores do Boleto
    bill_amount_brl: float
    bill_due_date: str
    is_overdue: bool
    days_until_due: int
    
    # Beneficiário do Boleto (quem recebe o pagamento)
    bill_beneficiary_name: Optional[str] = None
    bill_beneficiary_document: Optional[str] = None
    bill_payer_name: Optional[str] = None
    bill_payer_document: Optional[str] = None
    bill_bank_code: Optional[str] = None
    bill_bank_name: Optional[str] = None
    
    # Crypto
    crypto_currency: str
    crypto_amount: float
    crypto_network: Optional[str] = None
    crypto_usd_rate: float
    brl_usd_rate: float
    
    # Taxas
    base_amount_brl: float
    service_fee_percent: float
    service_fee_brl: float
    network_fee_percent: float
    network_fee_brl: float
    total_amount_brl: float
    
    # Controle
    quote_expires_at: Optional[str] = None
    crypto_debited_at: Optional[str] = None
    internal_tx_id: Optional[str] = None
    crypto_tx_hash: Optional[str] = None
    
    # Pagamento do Boleto
    paid_by_operator_id: Optional[str] = None
    paid_by_operator_name: Optional[str] = None
    payment_receipt_url: Optional[str] = None
    bank_authentication: Optional[str] = None
    paid_at: Optional[str] = None
    
    # Falha/Reembolso
    failure_reason: Optional[str] = None
    refunded_at: Optional[str] = None
    refund_tx_id: Optional[str] = None
    
    # Timestamps
    created_at: str
    updated_at: Optional[str] = None
    
    class Config:
        from_attributes = True


class BillPaymentListResponse(BaseModel):
    """Lista de pagamentos para admin"""
    payments: List[BillPaymentAdminResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
    
    # Estatísticas
    stats: dict


class ApprovePaymentRequest(BaseModel):
    """Request para aprovar pagamento"""
    bank_authentication: Optional[str] = Field(None, description="Autenticação bancária")
    notes: Optional[str] = Field(None, description="Observações do operador")


class RejectPaymentRequest(BaseModel):
    """Request para rejeitar pagamento"""
    reason: str = Field(..., description="Motivo da rejeição")
    refund_crypto: bool = Field(True, description="Devolver crypto ao usuário?")


class MarkPaidRequest(BaseModel):
    """Request para marcar como pago"""
    bank_authentication: str = Field(..., description="Autenticação bancária")
    payment_receipt_url: Optional[str] = Field(None, description="URL do comprovante")
    notes: Optional[str] = Field(None, description="Observações")


class ProcessCryptoRequest(BaseModel):
    """Request para processar débito de crypto"""
    force_blockchain_transfer: bool = Field(False, description="Forçar transferência na blockchain mesmo se já debitado do DB")


class StatsResponse(BaseModel):
    """Estatísticas de pagamentos"""
    total_payments: int
    pending_count: int
    crypto_debited_count: int
    processing_count: int
    paying_count: int
    paid_count: int
    failed_count: int
    refunded_count: int
    cancelled_count: int
    expired_count: int
    
    # Valores
    total_brl_pending: float
    total_brl_paid: float
    total_crypto_pending: float
    total_crypto_paid: float
    
    # Hoje
    today_count: int
    today_brl: float
    
    # Este mês
    month_count: int
    month_brl: float


# ==========================================
# HELPERS
# ==========================================

def require_admin(user: User):
    """Verifica se o usuário é admin"""
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Acesso negado. Requer privilégios de administrador.")
    return user


def get_status_display(status: BillPaymentStatus) -> str:
    """Retorna nome amigável do status"""
    display_map = {
        BillPaymentStatus.PENDING: "⏳ Aguardando Confirmação",
        BillPaymentStatus.CRYPTO_DEBITED: "💰 Crypto Debitada",
        BillPaymentStatus.PROCESSING: "⚙️ Processando",
        BillPaymentStatus.PAYING: "💳 Pagando Boleto",
        BillPaymentStatus.PAID: "✅ Pago",
        BillPaymentStatus.FAILED: "❌ Falhou",
        BillPaymentStatus.REFUNDED: "↩️ Reembolsado",
        BillPaymentStatus.CANCELLED: "🚫 Cancelado",
        BillPaymentStatus.EXPIRED: "⏰ Expirado",
    }
    return display_map.get(status, status.value)


def get_bill_type_display(bill_type: BillType) -> str:
    """Retorna nome amigável do tipo de boleto"""
    display_map = {
        BillType.BANK_SLIP: "📄 Boleto Bancário",
        BillType.UTILITY: "💡 Conta de Consumo",
        BillType.TAX: "📋 Guia de Imposto",
        BillType.OTHER: "📝 Outro",
    }
    return display_map.get(bill_type, bill_type.value)


def payment_to_admin_response(payment: WolkPayBillPayment, db: Session) -> BillPaymentAdminResponse:
    """Converte payment para response de admin"""
    # Buscar dados do usuário
    user = db.query(User).filter(User.id == payment.user_id).first()
    
    # Buscar operador se existir
    operator = None
    if payment.paid_by_operator_id:
        operator = db.query(User).filter(User.id == payment.paid_by_operator_id).first()
    
    # Calcular dias até vencimento
    today = date.today()
    due_date = payment.bill_due_date
    days_until_due = (due_date - today).days if due_date else 0
    is_overdue = days_until_due < 0
    
    return BillPaymentAdminResponse(
        id=str(payment.id),
        payment_number=payment.payment_number,
        status=payment.status.value,
        status_display=get_status_display(payment.status),
        
        # Usuário
        user_id=str(payment.user_id),
        user_name=user.username if user else None,
        user_email=user.email if user else None,
        user_phone=getattr(user, 'phone', None) if user else None,
        
        # Dados do Boleto
        bill_type=payment.bill_type.value,
        bill_type_display=get_bill_type_display(payment.bill_type),
        barcode=payment.barcode,
        digitable_line=payment.digitable_line,
        
        # Valores do Boleto
        bill_amount_brl=float(payment.bill_amount_brl),
        bill_due_date=payment.bill_due_date.isoformat() if payment.bill_due_date else None,
        is_overdue=is_overdue,
        days_until_due=days_until_due,
        
        # Beneficiário do Boleto
        bill_beneficiary_name=payment.bill_beneficiary_name,
        bill_beneficiary_document=payment.bill_beneficiary_document,
        bill_payer_name=payment.bill_payer_name,
        bill_payer_document=payment.bill_payer_document,
        bill_bank_code=payment.bill_bank_code,
        bill_bank_name=payment.bill_bank_name,
        
        # Crypto
        crypto_currency=payment.crypto_currency,
        crypto_amount=float(payment.crypto_amount),
        crypto_network=payment.crypto_network,
        crypto_usd_rate=float(payment.crypto_usd_rate) if payment.crypto_usd_rate else 0,
        brl_usd_rate=float(payment.brl_usd_rate) if payment.brl_usd_rate else 0,
        
        # Taxas
        base_amount_brl=float(payment.base_amount_brl),
        service_fee_percent=float(payment.service_fee_percent),
        service_fee_brl=float(payment.service_fee_brl),
        network_fee_percent=float(payment.network_fee_percent),
        network_fee_brl=float(payment.network_fee_brl),
        total_amount_brl=float(payment.total_amount_brl),
        
        # Controle
        quote_expires_at=payment.quote_expires_at.isoformat() if payment.quote_expires_at else None,
        crypto_debited_at=payment.crypto_debited_at.isoformat() if payment.crypto_debited_at else None,
        internal_tx_id=payment.internal_tx_id,
        crypto_tx_hash=getattr(payment, 'crypto_tx_hash', None),
        
        # Pagamento
        paid_by_operator_id=str(payment.paid_by_operator_id) if payment.paid_by_operator_id else None,
        paid_by_operator_name=operator.username if operator else None,
        payment_receipt_url=payment.payment_receipt_url,
        bank_authentication=payment.bank_authentication,
        paid_at=payment.paid_at.isoformat() if payment.paid_at else None,
        
        # Falha/Reembolso
        failure_reason=payment.failure_reason,
        refunded_at=payment.refunded_at.isoformat() if payment.refunded_at else None,
        refund_tx_id=payment.refund_tx_id,
        
        # Timestamps
        created_at=payment.created_at.isoformat() if payment.created_at else None,
        updated_at=payment.updated_at.isoformat() if payment.updated_at else None,
    )


def log_admin_action(
    db: Session,
    payment_id: str,
    action: str,
    old_status: str,
    new_status: str,
    admin_id: str,
    details: Optional[dict] = None
):
    """Registra ação administrativa"""
    log = WolkPayBillPaymentLog(
        bill_payment_id=payment_id,
        action=action,
        old_status=old_status,
        new_status=new_status,
        details=details,
        performed_by=admin_id,
        performed_at=datetime.now(timezone.utc)
    )
    db.add(log)
    db.commit()


def register_bill_payment_fee(
    db: Session,
    payment: WolkPayBillPayment,
    admin_id: str
) -> Optional[str]:
    """
    Registra as taxas do pagamento de boleto no accounting_entries.
    Chamado quando um boleto é marcado como PAGO.
    
    Registra:
    - service_fee_brl: Taxa de serviço (aparece em /admin/fees)
    - network_fee_brl: Taxa de rede (aparece em /admin/fees)
    
    Returns:
        ID do registro criado ou None em caso de erro
    """
    try:
        # Calcular taxa total
        total_fee = float(payment.service_fee_brl) + float(payment.network_fee_brl)
        
        if total_fee <= 0:
            logger.warning(f"⚠️ Pagamento {payment.payment_number} não tem taxas para registrar")
            return None
        
        entry_id = str(uuid.uuid4())
        
        # Inserir no accounting_entries
        query = text("""
            INSERT INTO accounting_entries (
                id, trade_id, reference_code, entry_type, amount, currency,
                percentage, base_amount, description, status, user_id, created_by, created_at
            ) VALUES (
                :id, :trade_id, :reference_code, :entry_type, :amount, :currency,
                :percentage, :base_amount, :description, :status, :user_id, :created_by, NOW()
            )
        """)
        
        # Taxa de serviço
        service_fee_percent = float(payment.service_fee_percent) if payment.service_fee_percent else 0
        total_fee_percent = service_fee_percent + (float(payment.network_fee_percent) if payment.network_fee_percent else 0)
        
        db.execute(query, {
            "id": entry_id,
            "trade_id": str(payment.id),
            "reference_code": payment.payment_number,
            "entry_type": "bill_payment_fee",
            "amount": total_fee,
            "currency": "BRL",
            "percentage": total_fee_percent,
            "base_amount": float(payment.bill_amount_brl),
            "description": f"Taxa de Pagamento de Boleto #{payment.payment_number} - R$ {float(payment.bill_amount_brl):,.2f}",
            "status": "confirmed",
            "user_id": str(payment.user_id),
            "created_by": admin_id
        })
        
        db.commit()
        
        logger.info(f"💰 Fee registrada: R$ {total_fee:.2f} para boleto {payment.payment_number}")
        
        return entry_id
        
    except Exception as e:
        logger.error(f"❌ Erro ao registrar fee do boleto: {e}")
        db.rollback()
        return None


# ==========================================
# ENDPOINTS - LISTAGEM
# ==========================================

@router.get("", response_model=BillPaymentListResponse)
async def list_bill_payments(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None, description="Filtrar por status"),
    search: Optional[str] = Query(None, description="Buscar por número, código de barras, usuário"),
    date_from: Optional[date] = Query(None, description="Data inicial"),
    date_to: Optional[date] = Query(None, description="Data final"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lista todos os pagamentos de boleto
    
    Filtros disponíveis:
    - status: PENDING, CRYPTO_DEBITED, PROCESSING, PAYING, PAID, FAILED, REFUNDED, CANCELLED, EXPIRED
    - search: Busca por número do pagamento, código de barras ou nome do usuário
    - date_from/date_to: Filtrar por período
    """
    require_admin(current_user)
    
    try:
        query = db.query(WolkPayBillPayment)
        
        # Filtro por status
        if status:
            try:
                status_enum = BillPaymentStatus(status.upper())
                query = query.filter(WolkPayBillPayment.status == status_enum)
            except ValueError:
                pass
        
        # Filtro por busca
        if search:
            search_term = f"%{search}%"
            # Buscar usuário pelo nome
            user_ids = db.query(User.id).filter(
                or_(
                    User.username.ilike(search_term),
                    User.email.ilike(search_term)
                )
            ).all()
            user_id_list = [uid[0] for uid in user_ids]
            
            query = query.filter(
                or_(
                    WolkPayBillPayment.payment_number.ilike(search_term),
                    WolkPayBillPayment.barcode.ilike(search_term),
                    WolkPayBillPayment.user_id.in_(user_id_list) if user_id_list else False
                )
            )
        
        # Filtro por data
        if date_from:
            query = query.filter(WolkPayBillPayment.created_at >= datetime.combine(date_from, datetime.min.time()))
        if date_to:
            query = query.filter(WolkPayBillPayment.created_at <= datetime.combine(date_to, datetime.max.time()))
        
        # Contar total
        total = query.count()
        
        # Paginar
        payments = query.order_by(desc(WolkPayBillPayment.created_at)).offset((page - 1) * per_page).limit(per_page).all()
        
        # Converter para response
        payment_responses = [payment_to_admin_response(p, db) for p in payments]
        
        # Calcular estatísticas
        stats = await get_stats_internal(db)
        
        return BillPaymentListResponse(
            payments=payment_responses,
            total=total,
            page=page,
            per_page=per_page,
            total_pages=(total + per_page - 1) // per_page,
            stats=stats
        )
        
    except Exception as e:
        logger.error(f"Erro ao listar pagamentos: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pending")
async def list_pending_payments(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lista pagamentos que precisam de ação:
    - CRYPTO_DEBITED: Crypto debitada, precisa pagar o boleto
    - PROCESSING: Em processamento
    - PAYING: Operador pagando
    """
    require_admin(current_user)
    
    try:
        query = db.query(WolkPayBillPayment).filter(
            WolkPayBillPayment.status.in_([
                BillPaymentStatus.CRYPTO_DEBITED,
                BillPaymentStatus.PROCESSING,
                BillPaymentStatus.PAYING
            ])
        )
        
        total = query.count()
        payments = query.order_by(WolkPayBillPayment.created_at.asc()).offset((page - 1) * per_page).limit(per_page).all()
        
        return {
            "payments": [payment_to_admin_response(p, db) for p in payments],
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": (total + per_page - 1) // per_page
        }
        
    except Exception as e:
        logger.error(f"Erro ao listar pagamentos pendentes: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# ENDPOINTS - DETALHES
# ==========================================

@router.get("/{payment_id}")
async def get_payment_details(
    payment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Detalhes completos de um pagamento de boleto
    
    Inclui:
    - Todos os dados do boleto
    - Dados do usuário
    - Histórico de ações
    - Saldo atual do usuário
    """
    require_admin(current_user)
    
    try:
        payment = db.query(WolkPayBillPayment).filter(
            WolkPayBillPayment.id == payment_id
        ).first()
        
        if not payment:
            raise HTTPException(status_code=404, detail="Pagamento não encontrado")
        
        # Dados básicos
        payment_data = payment_to_admin_response(payment, db)
        
        # Histórico de ações
        logs = db.query(WolkPayBillPaymentLog).filter(
            WolkPayBillPaymentLog.bill_payment_id == payment_id
        ).order_by(desc(WolkPayBillPaymentLog.performed_at)).all()
        
        logs_data = []
        for log in logs:
            admin = db.query(User).filter(User.id == log.performed_by).first() if log.performed_by else None
            logs_data.append({
                "id": log.id,
                "action": log.action,
                "old_status": log.old_status,
                "new_status": log.new_status,
                "details": log.details,
                "performed_by": log.performed_by,
                "performed_by_name": admin.username if admin else "Sistema",
                "performed_at": log.performed_at.isoformat() if log.performed_at else None
            })
        
        # Saldo atual do usuário (para verificar se pode debitar)
        balance_key = f"{payment.crypto_network}_{payment.crypto_currency}".lower() if payment.crypto_network else payment.crypto_currency.upper()
        user_balance = WalletBalanceService.get_balance(
            db=db,
            user_id=str(payment.user_id),
            cryptocurrency=balance_key
        )
        
        return {
            "payment": payment_data,
            "logs": logs_data,
            "user_balance": {
                "cryptocurrency": balance_key,
                "available_balance": user_balance.get('available_balance', 0) if user_balance else 0,
                "locked_balance": user_balance.get('locked_balance', 0) if user_balance else 0,
                "total_balance": user_balance.get('total_balance', 0) if user_balance else 0,
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao buscar detalhes do pagamento: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# ENDPOINTS - AÇÕES ADMINISTRATIVAS
# ==========================================

@router.post("/{payment_id}/process-crypto")
async def process_crypto_debit(
    payment_id: str,
    request: ProcessCryptoRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Processa o débito de crypto do usuário
    
    1. Verifica saldo do usuário
    2. Debita do banco de dados (wallet_balances)
    3. Transfere na blockchain para carteira do sistema
    
    Usado quando:
    - O débito automático falhou
    - Admin precisa forçar o débito manualmente
    """
    require_admin(current_user)
    
    try:
        payment = db.query(WolkPayBillPayment).filter(
            WolkPayBillPayment.id == payment_id
        ).first()
        
        if not payment:
            raise HTTPException(status_code=404, detail="Pagamento não encontrado")
        
        # Verificar status
        if payment.status not in [BillPaymentStatus.PENDING, BillPaymentStatus.CRYPTO_DEBITED]:
            raise HTTPException(
                status_code=400, 
                detail=f"Pagamento com status {payment.status.value} não pode ter crypto processada"
            )
        
        old_status = payment.status.value
        
        # Build balance key
        balance_key = f"{payment.crypto_network}_{payment.crypto_currency}".lower() if payment.crypto_network else payment.crypto_currency.upper()
        
        # 1. Verificar saldo
        user_balance = WalletBalanceService.get_balance(
            db=db,
            user_id=str(payment.user_id),
            cryptocurrency=balance_key
        )
        
        available = Decimal(str(user_balance.get('available_balance', 0))) if user_balance else Decimal('0')
        
        if available < payment.crypto_amount:
            raise HTTPException(
                status_code=400,
                detail=f"Saldo insuficiente. Disponível: {available} {balance_key}, Necessário: {payment.crypto_amount}"
            )
        
        # 2. Debitar do banco de dados
        try:
            WalletBalanceService.debit_available_balance(
                db=db,
                user_id=str(payment.user_id),
                cryptocurrency=balance_key,
                amount=float(payment.crypto_amount),
                reason=f"Bill Payment: {payment.payment_number}",
                reference_id=str(payment.id)
            )
            logger.info(f"✅ Saldo debitado do DB: {payment.crypto_amount} {balance_key}")
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        
        # 3. Transferir na blockchain
        tx_hash = None
        if payment.crypto_network:
            try:
                blockchain_result = blockchain_withdraw_service.transfer_to_platform(
                    db=db,
                    user_id=str(payment.user_id),
                    symbol=payment.crypto_currency.upper(),
                    amount=payment.crypto_amount,
                    network=payment.crypto_network.lower(),
                    reference_id=str(payment.id)
                )
                
                if blockchain_result.get("success"):
                    tx_hash = blockchain_result.get("tx_hash")
                    logger.info(f"✅ Transferência blockchain: {tx_hash}")
                else:
                    logger.warning(f"⚠️ Falha na transferência blockchain: {blockchain_result.get('error')}")
                    # Não falha - crypto já foi debitada do DB
            except Exception as e:
                logger.error(f"❌ Erro na transferência blockchain: {e}")
                # Não falha - crypto já foi debitada do DB
        
        # 4. Atualizar payment
        payment.status = BillPaymentStatus.CRYPTO_DEBITED
        payment.crypto_debited_at = datetime.now(timezone.utc)
        payment.internal_tx_id = tx_hash or f"admin_debit_{payment_id[:8]}"
        if tx_hash:
            payment.crypto_tx_hash = tx_hash
        
        db.commit()
        
        # Log
        log_admin_action(
            db=db,
            payment_id=str(payment_id),
            action="process_crypto",
            old_status=old_status,
            new_status=payment.status.value,
            admin_id=str(current_user.id),
            details={
                "amount": str(payment.crypto_amount),
                "currency": balance_key,
                "tx_hash": tx_hash,
                "forced": request.force_blockchain_transfer
            }
        )
        
        return {
            "success": True,
            "message": "Crypto debitada com sucesso",
            "payment": payment_to_admin_response(payment, db),
            "tx_hash": tx_hash
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao processar crypto: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{payment_id}/mark-paid")
async def mark_as_paid(
    payment_id: str,
    request: MarkPaidRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Marca o boleto como pago
    
    Usado após o operador pagar o boleto no banco.
    Requer autenticação bancária como comprovante.
    """
    require_admin(current_user)
    
    try:
        payment = db.query(WolkPayBillPayment).filter(
            WolkPayBillPayment.id == payment_id
        ).first()
        
        if not payment:
            raise HTTPException(status_code=404, detail="Pagamento não encontrado")
        
        # Verificar se já está pago
        if payment.status == BillPaymentStatus.PAID:
            raise HTTPException(
                status_code=400, 
                detail=f"Este pagamento já foi marcado como PAGO em {payment.paid_at.strftime('%d/%m/%Y %H:%M') if payment.paid_at else 'data desconhecida'}. Autenticação: {payment.bank_authentication or 'N/A'}"
            )
        
        # Verificar status - permitir PENDING, CRYPTO_DEBITED, PROCESSING, PAYING
        allowed_statuses = [
            BillPaymentStatus.PENDING,
            BillPaymentStatus.CRYPTO_DEBITED, 
            BillPaymentStatus.PROCESSING, 
            BillPaymentStatus.PAYING
        ]
        
        if payment.status not in allowed_statuses:
            raise HTTPException(
                status_code=400, 
                detail=f"Pagamento com status '{payment.status.value}' não pode ser marcado como pago. Status permitidos: PENDING, CRYPTO_DEBITED, PROCESSING, PAYING"
            )
        
        old_status = payment.status.value
        
        # Atualizar
        payment.status = BillPaymentStatus.PAID
        payment.bank_authentication = request.bank_authentication
        payment.payment_receipt_url = request.payment_receipt_url
        payment.paid_by_operator_id = current_user.id
        payment.paid_at = datetime.now(timezone.utc)
        
        db.commit()
        
        # Log
        log_admin_action(
            db=db,
            payment_id=str(payment_id),
            action="mark_paid",
            old_status=old_status,
            new_status=payment.status.value,
            admin_id=str(current_user.id),
            details={
                "bank_authentication": request.bank_authentication,
                "payment_receipt_url": request.payment_receipt_url,
                "notes": request.notes
            }
        )
        
        # Registrar taxas no accounting_entries (aparece em /admin/fees)
        fee_entry_id = register_bill_payment_fee(
            db=db,
            payment=payment,
            admin_id=str(current_user.id)
        )
        
        if fee_entry_id:
            logger.info(f"✅ Fee registrada com ID: {fee_entry_id}")
        
        return {
            "success": True,
            "message": "Boleto marcado como pago",
            "payment": payment_to_admin_response(payment, db)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao marcar como pago: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{payment_id}/reject")
async def reject_payment(
    payment_id: str,
    request: RejectPaymentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Rejeita um pagamento e opcionalmente reembolsa a crypto
    
    Usado quando:
    - Boleto inválido/vencido
    - Dados incorretos
    - Problemas no pagamento
    """
    require_admin(current_user)
    
    try:
        payment = db.query(WolkPayBillPayment).filter(
            WolkPayBillPayment.id == payment_id
        ).first()
        
        if not payment:
            raise HTTPException(status_code=404, detail="Pagamento não encontrado")
        
        old_status = payment.status.value
        
        # Se crypto foi debitada e deve reembolsar
        refund_tx_id = None
        if request.refund_crypto and payment.status == BillPaymentStatus.CRYPTO_DEBITED:
            try:
                balance_key = f"{payment.crypto_network}_{payment.crypto_currency}".lower() if payment.crypto_network else payment.crypto_currency.upper()
                
                result = WalletBalanceService.credit_balance(
                    db=db,
                    user_id=str(payment.user_id),
                    cryptocurrency=balance_key,
                    amount=float(payment.crypto_amount),
                    reason=f"Refund Bill Payment: {payment.payment_number}",
                    reference_id=str(payment.id)
                )
                
                refund_tx_id = f"refund_{payment_id[:8]}"
                payment.refunded_at = datetime.now(timezone.utc)
                payment.refund_tx_id = refund_tx_id
                payment.status = BillPaymentStatus.REFUNDED
                
                logger.info(f"✅ Crypto reembolsada: {payment.crypto_amount} {balance_key}")
            except Exception as e:
                logger.error(f"❌ Erro ao reembolsar crypto: {e}")
                raise HTTPException(status_code=500, detail=f"Erro ao reembolsar crypto: {e}")
        else:
            payment.status = BillPaymentStatus.FAILED
        
        payment.failure_reason = request.reason
        db.commit()
        
        # Log
        log_admin_action(
            db=db,
            payment_id=str(payment_id),
            action="reject",
            old_status=old_status,
            new_status=payment.status.value,
            admin_id=str(current_user.id),
            details={
                "reason": request.reason,
                "refund_crypto": request.refund_crypto,
                "refund_tx_id": refund_tx_id
            }
        )
        
        return {
            "success": True,
            "message": "Pagamento rejeitado" + (" e crypto reembolsada" if refund_tx_id else ""),
            "payment": payment_to_admin_response(payment, db),
            "refund_tx_id": refund_tx_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao rejeitar pagamento: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{payment_id}/set-processing")
async def set_processing(
    payment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Marca como em processamento (operador está liquidando ativos)"""
    require_admin(current_user)
    
    payment = db.query(WolkPayBillPayment).filter(WolkPayBillPayment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Pagamento não encontrado")
    
    if payment.status == BillPaymentStatus.PAID:
        raise HTTPException(status_code=400, detail="Este pagamento já foi pago")
    
    old_status = payment.status.value
    payment.status = BillPaymentStatus.PROCESSING
    db.commit()
    
    log_admin_action(db, str(payment_id), "set_processing", old_status, payment.status.value, str(current_user.id))
    
    return {"success": True, "payment": payment_to_admin_response(payment, db)}


@router.post("/{payment_id}/set-paying")
async def set_paying(
    payment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Marca como pagando (operador está pagando o boleto)"""
    require_admin(current_user)
    
    payment = db.query(WolkPayBillPayment).filter(WolkPayBillPayment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Pagamento não encontrado")
    
    if payment.status == BillPaymentStatus.PAID:
        raise HTTPException(status_code=400, detail="Este pagamento já foi pago")
    
    old_status = payment.status.value
    payment.status = BillPaymentStatus.PAYING
    db.commit()
    
    log_admin_action(db, str(payment_id), "set_paying", old_status, payment.status.value, str(current_user.id))
    
    return {"success": True, "payment": payment_to_admin_response(payment, db)}


# ==========================================
# ENDPOINTS - ESTATÍSTICAS E RELATÓRIOS
# ==========================================

async def get_stats_internal(db: Session) -> dict:
    """Estatísticas internas"""
    today = date.today()
    month_start = today.replace(day=1)
    
    # Contadores por status
    status_counts = db.query(
        WolkPayBillPayment.status,
        func.count(WolkPayBillPayment.id)
    ).group_by(WolkPayBillPayment.status).all()
    
    counts = {s.value: 0 for s in BillPaymentStatus}
    for status, count in status_counts:
        counts[status.value] = count
    
    # Valores pendentes (crypto debitada mas não pago)
    pending_values = db.query(
        func.sum(WolkPayBillPayment.total_amount_brl),
        func.sum(WolkPayBillPayment.crypto_amount)
    ).filter(
        WolkPayBillPayment.status.in_([
            BillPaymentStatus.CRYPTO_DEBITED,
            BillPaymentStatus.PROCESSING,
            BillPaymentStatus.PAYING
        ])
    ).first()
    
    # Valores pagos
    paid_values = db.query(
        func.sum(WolkPayBillPayment.total_amount_brl),
        func.sum(WolkPayBillPayment.crypto_amount)
    ).filter(WolkPayBillPayment.status == BillPaymentStatus.PAID).first()
    
    # Hoje
    today_values = db.query(
        func.count(WolkPayBillPayment.id),
        func.sum(WolkPayBillPayment.total_amount_brl)
    ).filter(
        func.date(WolkPayBillPayment.created_at) == today
    ).first()
    
    # Este mês
    month_values = db.query(
        func.count(WolkPayBillPayment.id),
        func.sum(WolkPayBillPayment.total_amount_brl)
    ).filter(
        WolkPayBillPayment.created_at >= datetime.combine(month_start, datetime.min.time())
    ).first()
    
    return {
        "total_payments": sum(counts.values()),
        "pending_count": counts.get("PENDING", 0),
        "crypto_debited_count": counts.get("CRYPTO_DEBITED", 0),
        "processing_count": counts.get("PROCESSING", 0),
        "paying_count": counts.get("PAYING", 0),
        "paid_count": counts.get("PAID", 0),
        "failed_count": counts.get("FAILED", 0),
        "refunded_count": counts.get("REFUNDED", 0),
        "cancelled_count": counts.get("CANCELLED", 0),
        "expired_count": counts.get("EXPIRED", 0),
        
        "total_brl_pending": float(pending_values[0] or 0),
        "total_brl_paid": float(paid_values[0] or 0),
        "total_crypto_pending": float(pending_values[1] or 0),
        "total_crypto_paid": float(paid_values[1] or 0),
        
        "today_count": today_values[0] or 0,
        "today_brl": float(today_values[1] or 0),
        
        "month_count": month_values[0] or 0,
        "month_brl": float(month_values[1] or 0),
    }


@router.get("/stats/summary", response_model=StatsResponse)
async def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Estatísticas gerais de pagamentos de boleto"""
    require_admin(current_user)
    
    try:
        stats = await get_stats_internal(db)
        return StatsResponse(**stats)
    except Exception as e:
        logger.error(f"Erro ao buscar estatísticas: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reports/daily")
async def get_daily_report(
    date_from: date = Query(..., description="Data inicial"),
    date_to: date = Query(..., description="Data final"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Relatório diário de pagamentos"""
    require_admin(current_user)
    
    try:
        results = db.query(
            func.date(WolkPayBillPayment.created_at).label('date'),
            func.count(WolkPayBillPayment.id).label('count'),
            func.sum(WolkPayBillPayment.total_amount_brl).label('total_brl'),
            func.sum(WolkPayBillPayment.crypto_amount).label('total_crypto'),
            func.sum(WolkPayBillPayment.service_fee_brl).label('total_fees')
        ).filter(
            func.date(WolkPayBillPayment.created_at) >= date_from,
            func.date(WolkPayBillPayment.created_at) <= date_to
        ).group_by(
            func.date(WolkPayBillPayment.created_at)
        ).order_by(
            func.date(WolkPayBillPayment.created_at)
        ).all()
        
        return {
            "period": {"from": date_from.isoformat(), "to": date_to.isoformat()},
            "data": [
                {
                    "date": r.date.isoformat() if r.date else None,
                    "count": r.count,
                    "total_brl": float(r.total_brl or 0),
                    "total_crypto": float(r.total_crypto or 0),
                    "total_fees": float(r.total_fees or 0)
                }
                for r in results
            ]
        }
        
    except Exception as e:
        logger.error(f"Erro ao gerar relatório: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# ENDPOINTS - COTAÇÕES EXPIRADAS
# ==========================================

class ExpireQuotesRequest(BaseModel):
    """Request para expirar cotações"""
    dry_run: bool = Field(True, description="Se True, apenas simula sem alterar o banco")
    hours_threshold: int = Field(24, description="Expirar cotações mais antigas que X horas")


class ExpireQuotesResponse(BaseModel):
    """Response da expiração de cotações"""
    success: bool
    dry_run: bool
    expired_count: int
    expired_payments: List[dict]
    message: str


@router.get("/expired-quotes")
async def list_expired_quotes(
    hours_threshold: int = Query(24, description="Cotações mais antigas que X horas"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lista cotações PENDING que estão expiradas
    
    Cotações expiradas são aquelas que:
    - Status = PENDING (usuário não confirmou)
    - quote_expires_at < agora OU created_at < (agora - hours_threshold)
    
    Retorna lista de pagamentos que podem ser cancelados.
    """
    require_admin(current_user)
    
    try:
        now = datetime.now(timezone.utc)
        threshold_time = now - timedelta(hours=hours_threshold)
        
        # Buscar cotações PENDING expiradas
        expired_payments = db.query(WolkPayBillPayment).filter(
            WolkPayBillPayment.status == BillPaymentStatus.PENDING,
            or_(
                # Quote expirou explicitamente
                and_(
                    WolkPayBillPayment.quote_expires_at.isnot(None),
                    WolkPayBillPayment.quote_expires_at < now
                ),
                # Ou criada há mais de X horas
                WolkPayBillPayment.created_at < threshold_time
            )
        ).order_by(WolkPayBillPayment.created_at.asc()).all()
        
        payments_data = []
        for p in expired_payments:
            user = db.query(User).filter(User.id == p.user_id).first()
            
            # Calcular há quanto tempo expirou
            if p.quote_expires_at:
                expired_since = now - p.quote_expires_at.replace(tzinfo=timezone.utc) if p.quote_expires_at.tzinfo is None else now - p.quote_expires_at
            else:
                expired_since = now - p.created_at.replace(tzinfo=timezone.utc) if p.created_at.tzinfo is None else now - p.created_at
            
            payments_data.append({
                "id": str(p.id),
                "payment_number": p.payment_number,
                "user_name": user.username if user else "N/A",
                "user_email": user.email if user else "N/A",
                "bill_amount_brl": float(p.bill_amount_brl),
                "crypto_amount": float(p.crypto_amount),
                "crypto_currency": p.crypto_currency,
                "created_at": p.created_at.isoformat() if p.created_at else None,
                "quote_expires_at": p.quote_expires_at.isoformat() if p.quote_expires_at else None,
                "hours_since_creation": (now - (p.created_at.replace(tzinfo=timezone.utc) if p.created_at.tzinfo is None else p.created_at)).total_seconds() / 3600,
                "expired_since_hours": expired_since.total_seconds() / 3600 if expired_since else 0
            })
        
        return {
            "expired_count": len(payments_data),
            "hours_threshold": hours_threshold,
            "current_time": now.isoformat(),
            "expired_payments": payments_data
        }
        
    except Exception as e:
        logger.error(f"Erro ao listar cotações expiradas: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/expire-quotes", response_model=ExpireQuotesResponse)
async def expire_pending_quotes(
    request: ExpireQuotesRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Expira/cancela cotações PENDING antigas automaticamente
    
    Fluxo:
    1. Busca todos os pagamentos PENDING com cotação expirada
    2. Marca cada um como EXPIRED
    3. Registra log de cada alteração
    
    Parâmetros:
    - dry_run: Se True, apenas simula a operação sem alterar dados
    - hours_threshold: Expirar cotações criadas há mais de X horas (padrão: 24)
    
    Use dry_run=True primeiro para ver o que será afetado!
    """
    require_admin(current_user)
    
    try:
        now = datetime.now(timezone.utc)
        threshold_time = now - timedelta(hours=request.hours_threshold)
        
        # Buscar cotações PENDING expiradas
        expired_payments = db.query(WolkPayBillPayment).filter(
            WolkPayBillPayment.status == BillPaymentStatus.PENDING,
            or_(
                # Quote expirou explicitamente
                and_(
                    WolkPayBillPayment.quote_expires_at.isnot(None),
                    WolkPayBillPayment.quote_expires_at < now
                ),
                # Ou criada há mais de X horas
                WolkPayBillPayment.created_at < threshold_time
            )
        ).all()
        
        expired_list = []
        
        for payment in expired_payments:
            user = db.query(User).filter(User.id == payment.user_id).first()
            
            payment_info = {
                "id": str(payment.id),
                "payment_number": payment.payment_number,
                "user_name": user.username if user else "N/A",
                "bill_amount_brl": float(payment.bill_amount_brl),
                "crypto_amount": float(payment.crypto_amount),
                "crypto_currency": payment.crypto_currency,
                "created_at": payment.created_at.isoformat() if payment.created_at else None
            }
            
            if not request.dry_run:
                # Atualizar status para EXPIRED
                old_status = payment.status.value
                payment.status = BillPaymentStatus.EXPIRED
                payment.failure_reason = f"Cotação expirada automaticamente após {request.hours_threshold} horas"
                
                # Log da ação
                log_admin_action(
                    db=db,
                    payment_id=str(payment.id),
                    action="auto_expire",
                    old_status=old_status,
                    new_status=payment.status.value,
                    admin_id=str(current_user.id),
                    details={
                        "hours_threshold": request.hours_threshold,
                        "original_quote_expires_at": payment.quote_expires_at.isoformat() if payment.quote_expires_at else None,
                        "reason": "Cotação expirada - usuário não confirmou"
                    }
                )
                
                payment_info["new_status"] = "EXPIRED"
            else:
                payment_info["would_be_status"] = "EXPIRED"
            
            expired_list.append(payment_info)
        
        # Commit apenas se não for dry_run
        if not request.dry_run and expired_list:
            db.commit()
            logger.info(f"✅ {len(expired_list)} cotações expiradas por {current_user.username}")
        
        return ExpireQuotesResponse(
            success=True,
            dry_run=request.dry_run,
            expired_count=len(expired_list),
            expired_payments=expired_list,
            message=f"{'[DRY RUN] ' if request.dry_run else ''}{len(expired_list)} cotações {'seriam' if request.dry_run else 'foram'} marcadas como expiradas"
        )
        
    except Exception as e:
        logger.error(f"Erro ao expirar cotações: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{payment_id}/expire")
async def expire_single_quote(
    payment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Expira/cancela uma cotação específica
    
    Usado para:
    - Cancelar manualmente uma cotação PENDING
    - Limpar cotações que o usuário abandonou
    
    Só funciona para pagamentos com status PENDING.
    """
    require_admin(current_user)
    
    try:
        payment = db.query(WolkPayBillPayment).filter(
            WolkPayBillPayment.id == payment_id
        ).first()
        
        if not payment:
            raise HTTPException(status_code=404, detail="Pagamento não encontrado")
        
        # Verificar se está PENDING
        if payment.status != BillPaymentStatus.PENDING:
            raise HTTPException(
                status_code=400,
                detail=f"Apenas cotações PENDING podem ser expiradas. Status atual: {payment.status.value}"
            )
        
        old_status = payment.status.value
        
        # Atualizar para EXPIRED
        payment.status = BillPaymentStatus.EXPIRED
        payment.failure_reason = f"Cotação expirada manualmente por {current_user.username}"
        
        db.commit()
        
        # Log
        log_admin_action(
            db=db,
            payment_id=str(payment_id),
            action="manual_expire",
            old_status=old_status,
            new_status=payment.status.value,
            admin_id=str(current_user.id),
            details={
                "reason": "Cotação expirada manualmente pelo admin"
            }
        )
        
        user = db.query(User).filter(User.id == payment.user_id).first()
        
        return {
            "success": True,
            "message": "Cotação expirada com sucesso",
            "payment": {
                "id": str(payment.id),
                "payment_number": payment.payment_number,
                "user_name": user.username if user else "N/A",
                "old_status": old_status,
                "new_status": payment.status.value,
                "bill_amount_brl": float(payment.bill_amount_brl)
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao expirar cotação: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
