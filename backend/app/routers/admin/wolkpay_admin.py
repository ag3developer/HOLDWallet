"""
🚀 WolkPay - Admin Router
==========================

Endpoints administrativos do WolkPay.

Routes:
- /admin/wolkpay/pending - Listar operações pendentes
- /admin/wolkpay/{id} - Detalhes da operação
- /admin/wolkpay/{id}/approve - Aprovar
- /admin/wolkpay/{id}/reject - Rejeitar
- /admin/wolkpay/reports - Relatórios

Author: HOLD Wallet Team
Date: January 2026
"""

import logging
from datetime import datetime, timezone, date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import Optional
from decimal import Decimal

from app.db.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.wolkpay import (
    WolkPayInvoice, WolkPayPayer, WolkPayPayment, WolkPayApproval,
    WolkPayPayerLimit, WolkPayAuditLog, InvoiceStatus
)
from app.services.wolkpay_service import WolkPayService
from app.schemas.wolkpay import (
    AdminInvoiceListResponse,
    AdminInvoiceResponse,
    InvoiceResponse,
    ApproveInvoiceRequest,
    RejectInvoiceRequest,
    ApprovalResponse,
    ReportPeriodRequest,
    ReportResponse,
    ReportSummary,
    ReportDetailItem,
    LimitCheckRequest,
    LimitCheckResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/wolkpay", tags=["WolkPay Admin"])


def require_admin(user: User):
    """Verifica se o usuário é admin"""
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Acesso negado. Requer privilégios de administrador.")
    return user


# ==========================================
# LISTAGEM
# ==========================================

@router.get("/pending")
async def get_pending_invoices(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lista faturas pendentes de aprovação (status = PAID)
    
    Apenas admins podem acessar.
    """
    require_admin(current_user)
    
    try:
        service = WolkPayService(db)
        invoices, total = await service.get_pending_invoices_for_admin(
            page=page,
            per_page=per_page
        )
        
        # Contar por status - Estatisticas gerais
        # pending_count = faturas aguardando pagador preencher dados ou pagar
        pending_count = db.query(WolkPayInvoice).filter(
            WolkPayInvoice.status.in_([InvoiceStatus.PENDING, InvoiceStatus.AWAITING_PAYMENT])
        ).count()
        
        # paid_count = faturas pagas aguardando aprovacao do admin
        paid_count = db.query(WolkPayInvoice).filter(
            WolkPayInvoice.status == InvoiceStatus.PAID
        ).count()
        
        # approved_count = faturas aprovadas/concluidas
        approved_count = db.query(WolkPayInvoice).filter(
            WolkPayInvoice.status.in_([InvoiceStatus.APPROVED, InvoiceStatus.COMPLETED])
        ).count()
        
        # total_count = todas as faturas
        total_count = db.query(WolkPayInvoice).count()
        
        result = []
        for invoice in invoices:
            # Buscar dados relacionados
            payer = db.query(WolkPayPayer).filter(
                WolkPayPayer.invoice_id == invoice.id
            ).first()
            
            payment = db.query(WolkPayPayment).filter(
                WolkPayPayment.invoice_id == invoice.id
            ).first()
            
            # Buscar nome do beneficiário
            beneficiary = db.query(User).filter(User.id == invoice.beneficiary_id).first()
            
            result.append({
                "invoice": {
                    "id": invoice.id,
                    "invoice_number": invoice.invoice_number,
                    "status": invoice.status.value,
                    "beneficiary_id": invoice.beneficiary_id,
                    "beneficiary_name": beneficiary.username if beneficiary else "N/A",
                    "crypto_currency": invoice.crypto_currency,
                    "crypto_amount": float(invoice.crypto_amount),
                    "total_amount_brl": float(invoice.total_amount_brl),
                    "service_fee_brl": float(invoice.service_fee_brl),
                    "network_fee_brl": float(invoice.network_fee_brl),
                    "created_at": invoice.created_at.isoformat() if invoice.created_at else None,
                    "expires_at": invoice.expires_at.isoformat() if invoice.expires_at else None
                },
                "payer": {
                    "id": payer.id if payer else None,
                    "person_type": payer.person_type.value if payer else None,
                    "name": payer.get_name() if payer else None,
                    "document": payer.get_document() if payer else None,
                    "email": payer.email or payer.business_email if payer else None,
                    "phone": payer.phone or payer.business_phone if payer else None,
                    "city": payer.city if payer else None,
                    "state": payer.state if payer else None,
                    "terms_accepted_at": payer.terms_accepted_at.isoformat() if payer and payer.terms_accepted_at else None,
                    "ip_address": payer.ip_address if payer else None
                } if payer else None,
                "payment": {
                    "id": payment.id if payment else None,
                    "status": payment.status.value if payment else None,
                    "amount_brl": float(payment.amount_brl) if payment else None,
                    "paid_at": payment.paid_at.isoformat() if payment and payment.paid_at else None,
                    "payer_confirmed_at": payment.payer_confirmed_at.isoformat() if payment and payment.payer_confirmed_at else None,
                    "bank_transaction_id": payment.bank_transaction_id if payment else None
                } if payment else None
            })
        
        # Contar faturas aguardando verificação (pagador confirmou mas admin não verificou)
        awaiting_verification_count = db.query(WolkPayInvoice).join(
            WolkPayPayment, WolkPayPayment.invoice_id == WolkPayInvoice.id
        ).filter(
            WolkPayInvoice.status == InvoiceStatus.AWAITING_PAYMENT,
            WolkPayPayment.payer_confirmed_at.isnot(None)
        ).count()
        
        return {
            "invoices": result,
            "total": total,
            "total_count": total_count,
            "pending_count": pending_count,
            "paid_count": paid_count,
            "approved_count": approved_count,
            "awaiting_verification_count": awaiting_verification_count,
            "page": page,
            "per_page": per_page
        }
        
    except Exception as e:
        logger.error(f"Erro ao listar faturas pendentes: {e}")
        raise HTTPException(status_code=500, detail="Erro ao listar faturas")


@router.get("/awaiting-verification")
async def get_awaiting_verification_invoices(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lista faturas AGUARDANDO VERIFICAÇÃO DO ADMIN
    
    Estas são faturas onde:
    - Status = AWAITING_PAYMENT (aguardando pagamento)
    - Pagador já confirmou que pagou (payer_confirmed_at preenchido)
    - Admin ainda não verificou se o PIX foi recebido
    
    🚨 URGENTE: Estas faturas precisam de ação imediata do admin!
    O admin deve verificar no banco se o PIX foi recebido e confirmar.
    """
    require_admin(current_user)
    
    try:
        # Buscar faturas aguardando pagamento onde o pagador já confirmou
        query = db.query(WolkPayInvoice).join(
            WolkPayPayment, WolkPayPayment.invoice_id == WolkPayInvoice.id
        ).filter(
            WolkPayInvoice.status == InvoiceStatus.AWAITING_PAYMENT,
            WolkPayPayment.payer_confirmed_at.isnot(None)
        )
        
        total = query.count()
        
        invoices = query.order_by(
            WolkPayPayment.payer_confirmed_at.asc()  # Mais antigos primeiro
        ).offset((page - 1) * per_page).limit(per_page).all()
        
        result = []
        for invoice in invoices:
            payer = db.query(WolkPayPayer).filter(
                WolkPayPayer.invoice_id == invoice.id
            ).first()
            
            payment = db.query(WolkPayPayment).filter(
                WolkPayPayment.invoice_id == invoice.id
            ).first()
            
            beneficiary = db.query(User).filter(User.id == invoice.beneficiary_id).first()
            
            result.append({
                "invoice": {
                    "id": invoice.id,
                    "invoice_number": invoice.invoice_number,
                    "status": invoice.status.value,
                    "beneficiary_id": invoice.beneficiary_id,
                    "beneficiary_name": beneficiary.username if beneficiary else "N/A",
                    "crypto_currency": invoice.crypto_currency,
                    "crypto_amount": float(invoice.crypto_amount),
                    "total_amount_brl": float(invoice.total_amount_brl),
                    "created_at": invoice.created_at.isoformat() if invoice.created_at else None,
                    "expires_at": invoice.expires_at.isoformat() if invoice.expires_at else None
                },
                "payer": {
                    "id": payer.id if payer else None,
                    "person_type": payer.person_type.value if payer else None,
                    "name": payer.get_name() if payer else None,
                    "document": payer.get_document() if payer else None,
                    "email": payer.email or payer.business_email if payer else None,
                    "phone": payer.phone or payer.business_phone if payer else None
                } if payer else None,
                "payment": {
                    "id": payment.id if payment else None,
                    "status": payment.status.value if payment else None,
                    "amount_brl": float(payment.amount_brl) if payment else None,
                    "payer_confirmed_at": payment.payer_confirmed_at.isoformat() if payment and payment.payer_confirmed_at else None
                } if payment else None,
                "urgency": "🚨 VERIFICAR PIX NO BANCO"
            })
        
        return {
            "invoices": result,
            "total": total,
            "page": page,
            "per_page": per_page,
            "message": "Faturas onde o pagador confirmou que pagou. Verifique no banco se o PIX foi recebido e confirme."
        }
        
    except Exception as e:
        logger.error(f"Erro ao listar faturas aguardando verificação: {e}")
        raise HTTPException(status_code=500, detail="Erro ao listar faturas")


@router.get("/all")
async def get_all_invoices(
    status: Optional[str] = Query(None, description="Filtrar por status"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lista todas as faturas (com filtros opcionais)
    """
    require_admin(current_user)
    
    try:
        query = db.query(WolkPayInvoice)
        
        if status:
            query = query.filter(WolkPayInvoice.status == status)
        
        total = query.count()
        
        invoices = query.order_by(
            WolkPayInvoice.created_at.desc()
        ).offset((page - 1) * per_page).limit(per_page).all()
        
        result = []
        for invoice in invoices:
            payer = db.query(WolkPayPayer).filter(
                WolkPayPayer.invoice_id == invoice.id
            ).first()
            
            beneficiary = db.query(User).filter(User.id == invoice.beneficiary_id).first()
            
            result.append({
                "id": invoice.id,
                "invoice_number": invoice.invoice_number,
                "status": invoice.status.value,
                "beneficiary_name": beneficiary.username if beneficiary else "N/A",
                "payer_name": payer.get_name() if payer else "N/A",
                "crypto_currency": invoice.crypto_currency,
                "crypto_amount": float(invoice.crypto_amount),
                "total_amount_brl": float(invoice.total_amount_brl),
                "created_at": invoice.created_at.isoformat() if invoice.created_at else None
            })
        
        return {
            "invoices": result,
            "total": total,
            "page": page,
            "per_page": per_page
        }
        
    except Exception as e:
        logger.error(f"Erro ao listar faturas: {e}")
        raise HTTPException(status_code=500, detail="Erro ao listar faturas")


# ==========================================
# TIMELINE / HISTÓRICO
# ==========================================

@router.get("/{invoice_id}/timeline")
async def get_invoice_timeline(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtém a timeline/histórico completo de uma fatura.
    
    Mostra todas as ações realizadas na fatura em ordem cronológica.
    """
    require_admin(current_user)
    
    invoice = db.query(WolkPayInvoice).filter(
        WolkPayInvoice.id == invoice_id
    ).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Fatura não encontrada")
    
    # Buscar logs de auditoria
    audit_logs = db.query(WolkPayAuditLog).filter(
        WolkPayAuditLog.invoice_id == invoice_id
    ).order_by(WolkPayAuditLog.created_at.asc()).all()
    
    # Buscar dados relacionados para enriquecer a timeline
    payer = db.query(WolkPayPayer).filter(
        WolkPayPayer.invoice_id == invoice_id
    ).first()
    
    payment = db.query(WolkPayPayment).filter(
        WolkPayPayment.invoice_id == invoice_id
    ).first()
    
    approval = db.query(WolkPayApproval).filter(
        WolkPayApproval.invoice_id == invoice_id
    ).first()
    
    # Mapear ações para ícones Lucide e descrições amigáveis
    ACTION_MAP = {
        "create_invoice": {"icon": "FileText", "label": "Fatura Criada", "color": "blue"},
        "fill_payer_data": {"icon": "User", "label": "Dados do Pagador Preenchidos", "color": "purple"},
        "generate_pix": {"icon": "QrCode", "label": "PIX Gerado", "color": "cyan"},
        "payer_confirmed": {"icon": "CheckCircle", "label": "Pagador Confirmou Pagamento", "color": "yellow"},
        "confirm_payment": {"icon": "Banknote", "label": "Pagamento Confirmado (Admin)", "color": "green"},
        "approve_invoice": {"icon": "Send", "label": "Fatura Aprovada - Crypto Enviada", "color": "emerald"},
        "mark_completed": {"icon": "Check", "label": "Marcado como Concluído", "color": "emerald"},
        "reject_invoice": {"icon": "XCircle", "label": "Fatura Rejeitada", "color": "red"},
        "cancel_invoice": {"icon": "Ban", "label": "Fatura Cancelada", "color": "gray"},
        "expire_invoice": {"icon": "Clock", "label": "Fatura Expirada", "color": "gray"},
    }
    
    timeline = []
    
    # Adicionar criação da fatura como primeiro evento
    timeline.append({
        "timestamp": invoice.created_at.isoformat() if invoice.created_at else None,
        "action": "create_invoice",
        "icon": "FileText",
        "label": "Fatura Criada",
        "color": "blue",
        "description": f"Fatura {invoice.invoice_number} criada para {float(invoice.crypto_amount)} {invoice.crypto_currency}",
        "actor_type": "system",
        "actor_id": invoice.beneficiary_id
    })
    
    # Adicionar dados do pagador se existir
    if payer and payer.created_at:
        timeline.append({
            "timestamp": payer.created_at.isoformat() if payer.created_at else None,
            "action": "fill_payer_data",
            "icon": "User",
            "label": "Dados do Pagador Preenchidos",
            "color": "purple",
            "description": f"Pagador: {payer.get_name() if hasattr(payer, 'get_name') else 'N/A'}",
            "actor_type": "payer",
            "actor_id": str(payer.id) if payer.id else None
        })
    
    # Adicionar PIX gerado se existir
    if payment and payment.created_at:
        timeline.append({
            "timestamp": payment.created_at.isoformat() if payment.created_at else None,
            "action": "generate_pix",
            "icon": "QrCode",
            "label": "PIX Gerado",
            "color": "cyan",
            "description": f"Valor: R$ {float(payment.amount_brl):,.2f}",
            "actor_type": "system",
            "actor_id": None
        })
    
    # Adicionar confirmação do pagador se existir
    if payment and payment.payer_confirmed_at:
        timeline.append({
            "timestamp": payment.payer_confirmed_at.isoformat() if payment.payer_confirmed_at else None,
            "action": "payer_confirmed",
            "icon": "CheckCircle",
            "label": "Pagador Confirmou Pagamento",
            "color": "yellow",
            "description": "Pagador informou que realizou o PIX. Aguardando verificação do admin.",
            "actor_type": "payer",
            "actor_id": str(payer.id) if payer else None
        })
    
    # Adicionar pagamento confirmado pelo admin
    if payment and payment.paid_at:
        timeline.append({
            "timestamp": payment.paid_at.isoformat() if payment.paid_at else None,
            "action": "confirm_payment",
            "icon": "Banknote",
            "label": "Pagamento Confirmado",
            "color": "green",
            "description": f"PIX confirmado no banco. ID Transação: {payment.bank_transaction_id or 'N/A'}",
            "actor_type": "admin",
            "actor_id": None
        })
    
    # Adicionar aprovação/rejeição se existir
    if approval:
        if approval.action.value == "APPROVED":
            timeline.append({
                "timestamp": approval.created_at.isoformat() if approval.created_at else None,
                "action": "approve_invoice",
                "icon": "Send",
                "label": "Fatura Aprovada - Crypto Enviada",
                "color": "emerald",
                "description": f"TX: {approval.crypto_tx_hash or 'N/A'} | Rede: {approval.crypto_network or 'N/A'}",
                "actor_type": "admin",
                "actor_id": approval.approved_by,
                "crypto_tx_hash": approval.crypto_tx_hash,
                "crypto_network": approval.crypto_network
            })
        else:
            timeline.append({
                "timestamp": approval.created_at.isoformat() if approval.created_at else None,
                "action": "reject_invoice",
                "icon": "XCircle",
                "label": "Fatura Rejeitada",
                "color": "red",
                "description": f"Motivo: {approval.rejection_reason or 'Não informado'}",
                "actor_type": "admin",
                "actor_id": approval.approved_by
            })
    
    # Adicionar logs de auditoria adicionais que não foram capturados
    for log in audit_logs:
        action_info = ACTION_MAP.get(log.action, {"icon": "📋", "label": log.action, "color": "gray"})
        
        # Verificar se já existe na timeline
        existing_timestamps = [t.get("timestamp") for t in timeline]
        log_ts = log.created_at.isoformat() if log.created_at else None
        
        # Evitar duplicatas
        if log_ts not in existing_timestamps or log.action not in ["create_invoice", "fill_payer_data", "generate_pix", "payer_confirmed", "confirm_payment", "approve_invoice", "reject_invoice"]:
            if log.action not in ["create_invoice", "fill_payer_data", "generate_pix"]:  # Estes já foram adicionados
                timeline.append({
                    "timestamp": log_ts,
                    "action": log.action,
                    "icon": action_info["icon"],
                    "label": action_info["label"],
                    "color": action_info["color"],
                    "description": log.description,
                    "actor_type": log.actor_type,
                    "actor_id": log.actor_id
                })
    
    # Ordenar por timestamp
    timeline.sort(key=lambda x: x.get("timestamp") or "")
    
    return {
        "invoice_id": invoice_id,
        "invoice_number": invoice.invoice_number,
        "current_status": invoice.status.value,
        "timeline": timeline,
        "total_events": len(timeline)
    }


# ==========================================
# DETALHES
# ==========================================

@router.get("/{invoice_id}")
async def get_invoice_details(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtém detalhes completos de uma fatura para análise do admin
    """
    require_admin(current_user)
    
    invoice = db.query(WolkPayInvoice).filter(
        WolkPayInvoice.id == invoice_id
    ).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Fatura não encontrada")
    
    # Buscar dados relacionados
    payer = db.query(WolkPayPayer).filter(
        WolkPayPayer.invoice_id == invoice_id
    ).first()
    
    payment = db.query(WolkPayPayment).filter(
        WolkPayPayment.invoice_id == invoice_id
    ).first()
    
    approval = db.query(WolkPayApproval).filter(
        WolkPayApproval.invoice_id == invoice_id
    ).first()
    
    beneficiary = db.query(User).filter(User.id == invoice.beneficiary_id).first()
    
    # Admin que aprovou (se existir)
    approved_by_user = None
    if approval:
        approved_by_user = db.query(User).filter(User.id == approval.approved_by).first()
    
    return {
        "invoice": {
            "id": invoice.id,
            "invoice_number": invoice.invoice_number,
            "status": invoice.status.value,
            "beneficiary_id": invoice.beneficiary_id,
            "beneficiary_name": beneficiary.username if beneficiary else "N/A",
            "beneficiary_email": beneficiary.email if beneficiary else "N/A",
            "crypto_currency": invoice.crypto_currency,
            "crypto_amount": float(invoice.crypto_amount),
            "crypto_network": invoice.crypto_network,
            "usd_rate": float(invoice.usd_rate),
            "brl_rate": float(invoice.brl_rate),
            "base_amount_brl": float(invoice.base_amount_brl),
            "service_fee_percent": float(invoice.service_fee_percent),
            "service_fee_brl": float(invoice.service_fee_brl),
            "network_fee_percent": float(invoice.network_fee_percent),
            "network_fee_brl": float(invoice.network_fee_brl),
            "total_amount_brl": float(invoice.total_amount_brl),
            "fee_payer": invoice.fee_payer.value if hasattr(invoice.fee_payer, 'value') else str(invoice.fee_payer) if invoice.fee_payer else "BENEFICIARY",
            "beneficiary_receives_brl": float(invoice.beneficiary_receives_brl) if invoice.beneficiary_receives_brl else None,
            "beneficiary_receives_crypto": float(invoice.beneficiary_receives_crypto) if invoice.beneficiary_receives_crypto else None,
            "checkout_token": invoice.checkout_token,
            "checkout_url": invoice.checkout_url,
            # Dados da transação blockchain (para auditoria e Receita Federal)
            "crypto_tx_hash": invoice.crypto_tx_hash,
            "crypto_tx_network": invoice.crypto_tx_network,
            "crypto_wallet_address": invoice.crypto_wallet_address,
            "crypto_sent_at": invoice.crypto_sent_at.isoformat() if invoice.crypto_sent_at else None,
            "crypto_explorer_url": invoice.crypto_explorer_url,
            # Timestamps
            "created_at": invoice.created_at.isoformat() if invoice.created_at else None,
            "expires_at": invoice.expires_at.isoformat() if invoice.expires_at else None,
            "updated_at": invoice.updated_at.isoformat() if invoice.updated_at else None
        },
        "payer": {
            "id": payer.id,
            "person_type": payer.person_type.value,
            # PF
            "full_name": payer.full_name,
            "cpf": payer.cpf,
            "birth_date": payer.birth_date.isoformat() if payer.birth_date else None,
            "phone": payer.phone,
            "email": payer.email,
            # PJ
            "company_name": payer.company_name,
            "cnpj": payer.cnpj,
            "trade_name": payer.trade_name,
            "state_registration": payer.state_registration,
            "business_phone": payer.business_phone,
            "business_email": payer.business_email,
            "responsible_name": payer.responsible_name,
            "responsible_cpf": payer.responsible_cpf,
            # Endereço
            "zip_code": payer.zip_code,
            "street": payer.street,
            "number": payer.number,
            "complement": payer.complement,
            "neighborhood": payer.neighborhood,
            "city": payer.city,
            "state": payer.state,
            # Compliance
            "ip_address": payer.ip_address,
            "user_agent": payer.user_agent,
            "terms_accepted_at": payer.terms_accepted_at.isoformat() if payer.terms_accepted_at else None,
            "terms_version": payer.terms_version,
            "created_at": payer.created_at.isoformat() if payer.created_at else None
        } if payer else None,
        "payment": {
            "id": payment.id,
            "pix_key": payment.pix_key,
            "pix_txid": payment.pix_txid,
            "pix_qrcode": payment.pix_qrcode,
            "pix_qrcode_image": payment.pix_qrcode_image,
            "amount_brl": float(payment.amount_brl),
            "status": payment.status.value,
            "paid_at": payment.paid_at.isoformat() if payment.paid_at else None,
            "payer_confirmed_at": payment.payer_confirmed_at.isoformat() if payment.payer_confirmed_at else None,
            "bank_transaction_id": payment.bank_transaction_id,
            "payer_bank": payment.payer_bank,
            "payer_name_from_bank": payment.payer_name_from_bank,
            "payer_document_from_bank": payment.payer_document_from_bank,
            "created_at": payment.created_at.isoformat() if payment.created_at else None
        } if payment else None,
        "approval": {
            "id": approval.id,
            "action": approval.action.value,
            "approved_by": approval.approved_by,
            "approved_by_name": approved_by_user.username if approved_by_user else "N/A",
            "rejection_reason": approval.rejection_reason,
            "crypto_tx_hash": approval.crypto_tx_hash,
            "crypto_network": approval.crypto_network,
            "wallet_address": approval.wallet_address,
            "notes": approval.notes,
            "created_at": approval.created_at.isoformat() if approval.created_at else None
        } if approval else None
    }


# ==========================================
# APROVAÇÃO / REJEIÇÃO
# ==========================================

@router.post("/{invoice_id}/approve", response_model=ApprovalResponse)
async def approve_invoice(
    invoice_id: str,
    request: ApproveInvoiceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Aprova uma fatura e envia crypto para o beneficiário
    
    Só pode aprovar faturas no status PAID (pagamento confirmado)
    
    Args:
        invoice_id: ID da fatura
        request.network: Rede blockchain para envio (polygon, ethereum, bitcoin, etc)
        request.notes: Observações do admin
    """
    require_admin(current_user)
    
    try:
        service = WolkPayService(db)
        approval = await service.approve_invoice(
            invoice_id=invoice_id,
            admin_id=str(current_user.id),
            network=request.network,
            notes=request.notes
        )
        
        invoice = db.query(WolkPayInvoice).filter(
            WolkPayInvoice.id == invoice_id
        ).first()
        
        return ApprovalResponse(
            invoice_id=invoice_id,
            invoice_number=invoice.invoice_number if invoice else "N/A",
            action="APPROVED",
            message=f"Fatura aprovada! Crypto enviada via {approval.crypto_network or 'blockchain'}.",
            crypto_tx_hash=approval.crypto_tx_hash
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Erro ao aprovar fatura: {e}")
        raise HTTPException(status_code=500, detail="Erro ao aprovar fatura")


@router.post("/{invoice_id}/reject", response_model=ApprovalResponse)
async def reject_invoice(
    invoice_id: str,
    request: RejectInvoiceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Rejeita uma fatura
    
    O pagador será notificado e deverá solicitar estorno ao seu banco.
    """
    require_admin(current_user)
    
    try:
        service = WolkPayService(db)
        approval = await service.reject_invoice(
            invoice_id=invoice_id,
            admin_id=str(current_user.id),
            rejection_reason=request.rejection_reason,
            notes=request.notes
        )
        
        invoice = db.query(WolkPayInvoice).filter(
            WolkPayInvoice.id == invoice_id
        ).first()
        
        return ApprovalResponse(
            invoice_id=invoice_id,
            invoice_number=invoice.invoice_number if invoice else "N/A",
            action="REJECTED",
            message=f"Fatura rejeitada. Motivo: {request.rejection_reason}"
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Erro ao rejeitar fatura: {e}")
        raise HTTPException(status_code=500, detail="Erro ao rejeitar fatura")


# ==========================================
# MARCAR COMO CONCLUÍDO (SEM ENVIAR CRYPTO)
# ==========================================

@router.post("/{invoice_id}/mark-completed")
async def mark_invoice_completed(
    invoice_id: str,
    crypto_tx_hash: str = Query(..., description="Hash da transação blockchain já enviada"),
    crypto_network: str = Query(..., description="Rede usada para o envio (polygon, ethereum, etc)"),
    notes: Optional[str] = Query(None, description="Observações do admin"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Marca uma fatura como CONCLUÍDA sem enviar crypto novamente.
    
    Use este endpoint quando:
    - A crypto já foi enviada manualmente ou automaticamente
    - Você só precisa atualizar o status no sistema
    
    Diferente de /approve, este endpoint NÃO envia crypto.
    Apenas registra o hash da transação já realizada e marca como concluído.
    """
    require_admin(current_user)
    
    invoice = db.query(WolkPayInvoice).filter(
        WolkPayInvoice.id == invoice_id
    ).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Fatura não encontrada")
    
    # Pode marcar como concluído de qualquer status exceto já concluído/cancelado/rejeitado
    if invoice.status in [InvoiceStatus.COMPLETED, InvoiceStatus.CANCELLED, InvoiceStatus.REJECTED]:
        raise HTTPException(
            status_code=400, 
            detail=f"Fatura já está no status {invoice.status.value}. Não pode ser alterada."
        )
    
    # Buscar pagador para atualizar limite
    payer = db.query(WolkPayPayer).filter(
        WolkPayPayer.invoice_id == invoice_id
    ).first()
    
    # Criar registro de aprovação
    from app.models.wolkpay import ApprovalAction
    
    approval = WolkPayApproval(
        invoice_id=invoice_id,
        approved_by=str(current_user.id),
        action=ApprovalAction.APPROVED,
        crypto_tx_hash=crypto_tx_hash,
        crypto_network=crypto_network,
        notes=notes or "Marcado como concluído manualmente (crypto já enviada)"
    )
    db.add(approval)
    
    # Atualizar status da fatura
    old_status = invoice.status.value
    invoice.status = InvoiceStatus.COMPLETED
    
    # Atualizar limite do pagador se existir
    if payer:
        service = WolkPayService(db)
        doc_type = "CPF" if payer.person_type.value == "PF" else "CNPJ"
        doc_number = ''.join(filter(str.isdigit, payer.cpf if payer.person_type.value == "PF" else payer.cnpj or ""))
        if doc_number:
            await service.update_payer_limit(doc_type, doc_number, invoice.total_amount_brl)
    
    db.commit()
    
    # Log de auditoria
    service = WolkPayService(db)
    service._log_audit(
        invoice_id=invoice_id,
        actor_type="admin",
        actor_id=str(current_user.id),
        action="mark_completed",
        description=f"Fatura marcada como concluída manualmente. Status anterior: {old_status}. TX: {crypto_tx_hash}, Rede: {crypto_network}"
    )
    db.commit()
    
    logger.info(f"WolkPay: Fatura {invoice.invoice_number} marcada como concluída por admin {current_user.id}")
    
    return {
        "success": True,
        "message": "Fatura marcada como concluída com sucesso!",
        "invoice_id": invoice_id,
        "invoice_number": invoice.invoice_number,
        "status": "COMPLETED",
        "crypto_tx_hash": crypto_tx_hash,
        "crypto_network": crypto_network,
        "previous_status": old_status
    }


# ==========================================
# CONFIRMAÇÃO MANUAL DE PAGAMENTO
# ==========================================

@router.post("/{invoice_id}/confirm-payment")
async def confirm_payment_manually(
    invoice_id: str,
    bank_transaction_id: str = Query(..., description="ID da transação bancária"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Confirma pagamento manualmente (Fase 1 - Conta Estática)
    
    O financeiro verifica o depósito no banco e confirma aqui.
    Após confirmar, a fatura vai para status PAID (aguardando aprovação).
    """
    require_admin(current_user)
    
    invoice = db.query(WolkPayInvoice).filter(
        WolkPayInvoice.id == invoice_id
    ).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Fatura não encontrada")
    
    if invoice.status != InvoiceStatus.AWAITING_PAYMENT:
        raise HTTPException(
            status_code=400, 
            detail=f"Fatura não está aguardando pagamento. Status: {invoice.status.value}"
        )
    
    payment = db.query(WolkPayPayment).filter(
        WolkPayPayment.invoice_id == invoice_id
    ).first()
    
    if payment:
        from app.models.wolkpay import PaymentStatus
        payment.status = PaymentStatus.PAID
        payment.paid_at = datetime.now(timezone.utc)
        payment.bank_transaction_id = bank_transaction_id
    
    invoice.status = InvoiceStatus.PAID
    
    db.commit()
    
    # Log de auditoria
    service = WolkPayService(db)
    service._log_audit(
        invoice_id=invoice_id,
        actor_type="admin",
        actor_id=str(current_user.id),
        action="confirm_payment",
        description=f"Pagamento confirmado manualmente. Transação: {bank_transaction_id}"
    )
    db.commit()
    
    return {
        "success": True,
        "message": "Pagamento confirmado! Fatura aguardando aprovação para envio de crypto.",
        "invoice_number": invoice.invoice_number,
        "status": "PAID"
    }


# ==========================================
# RELATÓRIOS
# ==========================================

@router.get("/reports/summary")
async def get_reports_summary(
    start_date: date = Query(..., description="Data inicial (YYYY-MM-DD)"),
    end_date: date = Query(..., description="Data final (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Gera relatório resumido do período
    """
    require_admin(current_user)
    
    try:
        # Query para totais
        start_datetime = datetime.combine(start_date, datetime.min.time())
        end_datetime = datetime.combine(end_date, datetime.max.time())
        
        base_query = db.query(WolkPayInvoice).filter(
            and_(
                WolkPayInvoice.created_at >= start_datetime,
                WolkPayInvoice.created_at <= end_datetime
            )
        )
        
        # Total de operações
        total_operations = base_query.count()
        
        # Apenas completadas
        completed_query = base_query.filter(WolkPayInvoice.status == InvoiceStatus.COMPLETED)
        
        completed_count = completed_query.count()
        
        # Somas
        totals = db.query(
            func.sum(WolkPayInvoice.total_amount_brl).label('volume'),
            func.sum(WolkPayInvoice.service_fee_brl).label('service_fee'),
            func.sum(WolkPayInvoice.network_fee_brl).label('network_fee')
        ).filter(
            and_(
                WolkPayInvoice.created_at >= start_datetime,
                WolkPayInvoice.created_at <= end_datetime,
                WolkPayInvoice.status == InvoiceStatus.COMPLETED
            )
        ).first()
        
        # Contagem por status
        pending_count = base_query.filter(
            WolkPayInvoice.status.in_([InvoiceStatus.PENDING, InvoiceStatus.AWAITING_PAYMENT, InvoiceStatus.PAID])
        ).count()
        
        expired_count = base_query.filter(WolkPayInvoice.status == InvoiceStatus.EXPIRED).count()
        rejected_count = base_query.filter(WolkPayInvoice.status == InvoiceStatus.REJECTED).count()
        
        total_volume = float(totals.volume or 0)
        total_service_fee = float(totals.service_fee or 0)
        total_network_fee = float(totals.network_fee or 0)
        
        return {
            "period_start": start_date.isoformat(),
            "period_end": end_date.isoformat(),
            "total_operations": total_operations,
            "total_volume_brl": total_volume,
            "total_service_fee_brl": total_service_fee,
            "total_network_fee_brl": total_network_fee,
            "net_revenue_brl": total_service_fee - total_network_fee,
            "completed_count": completed_count,
            "pending_count": pending_count,
            "expired_count": expired_count,
            "rejected_count": rejected_count
        }
        
    except Exception as e:
        logger.error(f"Erro ao gerar relatório: {e}")
        raise HTTPException(status_code=500, detail="Erro ao gerar relatório")


@router.get("/reports/detailed")
async def get_detailed_report(
    start_date: date = Query(..., description="Data inicial (YYYY-MM-DD)"),
    end_date: date = Query(..., description="Data final (YYYY-MM-DD)"),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Gera relatório detalhado com todas as operações do período
    """
    require_admin(current_user)
    
    try:
        start_datetime = datetime.combine(start_date, datetime.min.time())
        end_datetime = datetime.combine(end_date, datetime.max.time())
        
        query = db.query(WolkPayInvoice).filter(
            and_(
                WolkPayInvoice.created_at >= start_datetime,
                WolkPayInvoice.created_at <= end_datetime,
                WolkPayInvoice.status == InvoiceStatus.COMPLETED
            )
        ).order_by(WolkPayInvoice.created_at)
        
        total = query.count()
        invoices = query.offset((page - 1) * per_page).limit(per_page).all()
        
        details = []
        for invoice in invoices:
            beneficiary = db.query(User).filter(User.id == invoice.beneficiary_id).first()
            payer = db.query(WolkPayPayer).filter(WolkPayPayer.invoice_id == invoice.id).first()
            
            # Mascarar documento do pagador
            payer_doc = ""
            if payer:
                doc = payer.get_document()
                if doc:
                    # Mostrar apenas primeiros e últimos dígitos
                    clean_doc = ''.join(filter(str.isdigit, doc))
                    if len(clean_doc) == 11:  # CPF
                        payer_doc = f"{clean_doc[:3]}.***.***-{clean_doc[-2:]}"
                    elif len(clean_doc) == 14:  # CNPJ
                        payer_doc = f"{clean_doc[:2]}.***.***/****-{clean_doc[-2:]}"
            
            details.append({
                "date": invoice.created_at.date().isoformat() if invoice.created_at else None,
                "invoice_number": invoice.invoice_number,
                "beneficiary_name": beneficiary.username if beneficiary else "N/A",
                "payer_name": payer.get_name() if payer else "N/A",
                "payer_document": payer_doc,
                "crypto_currency": invoice.crypto_currency,
                "crypto_amount": float(invoice.crypto_amount),
                "total_amount_brl": float(invoice.total_amount_brl),
                "service_fee_brl": float(invoice.service_fee_brl),
                "network_fee_brl": float(invoice.network_fee_brl),
                "status": invoice.status.value
            })
        
        return {
            "period_start": start_date.isoformat(),
            "period_end": end_date.isoformat(),
            "details": details,
            "total": total,
            "page": page,
            "per_page": per_page,
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Erro ao gerar relatório detalhado: {e}")
        raise HTTPException(status_code=500, detail="Erro ao gerar relatório")


# ==========================================
# LIMITES
# ==========================================

@router.post("/check-limit", response_model=LimitCheckResponse)
async def check_payer_limit(
    request: LimitCheckRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Verifica limites de um pagador específico
    """
    require_admin(current_user)
    
    import hashlib
    
    doc_number = ''.join(filter(str.isdigit, request.document_number))
    doc_hash = hashlib.sha256(doc_number.encode()).hexdigest()
    month_year = datetime.now().strftime("%Y-%m")
    
    limit_record = db.query(WolkPayPayerLimit).filter(
        and_(
            WolkPayPayerLimit.document_hash == doc_hash,
            WolkPayPayerLimit.month_year == month_year
        )
    ).first()
    
    LIMIT_PER_OPERATION = Decimal('15000.00')
    LIMIT_PER_MONTH = Decimal('300000.00')
    
    used_this_month = Decimal('0')
    transaction_count = 0
    is_blocked = False
    blocked_reason = None
    
    if limit_record:
        used_this_month = limit_record.total_amount_brl
        transaction_count = limit_record.transaction_count
        is_blocked = limit_record.blocked
        blocked_reason = limit_record.blocked_reason
    
    available = LIMIT_PER_MONTH - used_this_month
    can_transact = (
        not is_blocked and 
        request.amount <= LIMIT_PER_OPERATION and 
        request.amount <= available
    )
    
    message = "OK - Pode realizar a transação"
    if is_blocked:
        message = f"BLOQUEADO: {blocked_reason}"
    elif request.amount > LIMIT_PER_OPERATION:
        message = f"Valor excede limite por operação de R$ {LIMIT_PER_OPERATION:,.2f}"
    elif request.amount > available:
        message = f"Limite mensal insuficiente. Disponível: R$ {available:,.2f}"
    
    return LimitCheckResponse(
        can_transact=can_transact,
        document_type=request.document_type,
        month_year=month_year,
        limit_per_operation=LIMIT_PER_OPERATION,
        limit_per_month=LIMIT_PER_MONTH,
        used_this_month=used_this_month,
        transaction_count=transaction_count,
        available=available,
        is_blocked=is_blocked,
        blocked_reason=blocked_reason,
        message=message
    )


@router.post("/block-payer")
async def block_payer(
    document_type: str = Query(..., description="CPF ou CNPJ"),
    document_number: str = Query(..., description="Número do documento"),
    reason: str = Query(..., description="Motivo do bloqueio"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Bloqueia um pagador (prevenção a fraude/lavagem)
    """
    require_admin(current_user)
    
    import hashlib
    
    doc_number = ''.join(filter(str.isdigit, document_number))
    doc_hash = hashlib.sha256(doc_number.encode()).hexdigest()
    month_year = datetime.now().strftime("%Y-%m")
    
    limit_record = db.query(WolkPayPayerLimit).filter(
        and_(
            WolkPayPayerLimit.document_hash == doc_hash,
            WolkPayPayerLimit.month_year == month_year
        )
    ).first()
    
    if not limit_record:
        from app.models.wolkpay import DocumentType
        limit_record = WolkPayPayerLimit(
            document_type=DocumentType[document_type],
            document_number=doc_number,
            document_hash=doc_hash,
            month_year=month_year
        )
        db.add(limit_record)
    
    limit_record.blocked = True
    limit_record.blocked_at = datetime.now(timezone.utc)
    limit_record.blocked_reason = reason
    limit_record.blocked_by = str(current_user.id)
    
    db.commit()
    
    return {
        "success": True,
        "message": f"Pagador bloqueado com sucesso",
        "document": f"{document_type}: ***{doc_number[-4:]}",
        "reason": reason
    }
