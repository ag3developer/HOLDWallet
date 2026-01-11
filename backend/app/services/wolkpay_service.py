"""
🚀 WolkPay - Service Layer
===========================

Lógica de negócio para o sistema WolkPay.

Author: HOLD Wallet Team
Date: January 2026
"""

import logging
import hashlib
import secrets
import qrcode
import io
import base64
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import Optional, Tuple, List
from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from app.models.wolkpay import (
    WolkPayInvoice, WolkPayPayer, WolkPayPayment, WolkPayApproval,
    WolkPayPayerLimit, WolkPayAuditLog, WolkPayTermsVersion,
    InvoiceStatus, PersonType, DocumentType, PaymentStatus, ApprovalAction
)
from app.models.user import User
from app.schemas.wolkpay import (
    CreateInvoiceRequest, SavePayerDataRequest,
    InvoiceResponse, CheckoutDataResponse, PixPaymentResponse
)
from app.services.price_aggregator import price_aggregator
from app.services.wallet_service import WalletService
from app.core.config import settings

logger = logging.getLogger(__name__)


class WolkPayService:
    """
    Serviço principal do WolkPay
    
    Responsabilidades:
    - Criar e gerenciar faturas
    - Processar dados do pagador
    - Gerar PIX (conta estática)
    - Verificar limites anti-lavagem
    - Aprovar/rejeitar operações
    - Gerar relatórios
    """
    
    # Configurações
    INVOICE_VALIDITY_MINUTES = 15  # Validade da fatura
    SERVICE_FEE_PERCENT = Decimal('3.65')  # Taxa de serviço
    NETWORK_FEE_PERCENT = Decimal('0.15')  # Taxa de rede
    LIMIT_PER_OPERATION = Decimal('15000.00')  # Limite por operação
    LIMIT_PER_MONTH = Decimal('300000.00')  # Limite mensal por pagador
    
    # Dados da conta para PIX
    PIX_KEY = "24275355000151"  # CNPJ da HOLD
    PIX_RECIPIENT_NAME = "HOLD DIGITAL ASSETS LTDA"
    PIX_RECIPIENT_DOCUMENT = "24.275.355/0001-51"
    
    def __init__(self, db: Session):
        self.db = db
        # Usa o price_aggregator já existente no projeto
    
    # ==========================================
    # CRIAÇÃO DE FATURA
    # ==========================================
    
    async def create_invoice(
        self,
        user_id: str,
        request: CreateInvoiceRequest
    ) -> Tuple[WolkPayInvoice, str]:
        """
        Cria uma nova fatura WolkPay
        
        Args:
            user_id: ID do beneficiário (usuário logado)
            request: Dados da fatura
            
        Returns:
            Tuple[WolkPayInvoice, checkout_url]
        """
        try:
            # 1. Buscar usuário beneficiário
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user:
                raise ValueError("Usuário não encontrado")
            
            # 2. Obter cotações atuais
            crypto_price_usd = await self._get_crypto_price_usd(request.crypto_currency)
            usd_brl_rate = await self._get_usd_brl_rate()
            
            # 3. Calcular valores
            base_amount_brl = request.crypto_amount * crypto_price_usd * usd_brl_rate
            service_fee_brl = base_amount_brl * (self.SERVICE_FEE_PERCENT / 100)
            network_fee_brl = base_amount_brl * (self.NETWORK_FEE_PERCENT / 100)
            total_amount_brl = base_amount_brl + service_fee_brl + network_fee_brl
            
            # 4. Verificar limite por operação
            if total_amount_brl > self.LIMIT_PER_OPERATION:
                raise ValueError(f"Valor excede limite por operação de R$ {self.LIMIT_PER_OPERATION:,.2f}")
            
            # 5. Gerar identificadores
            invoice_number = WolkPayInvoice.generate_invoice_number()
            checkout_token = WolkPayInvoice.generate_checkout_token()
            
            # 6. Calcular expiração (15 minutos)
            expires_at = datetime.now(timezone.utc) + timedelta(minutes=self.INVOICE_VALIDITY_MINUTES)
            
            # 7. Criar fatura
            invoice = WolkPayInvoice(
                invoice_number=invoice_number,
                beneficiary_id=user_id,
                crypto_currency=request.crypto_currency.upper(),
                crypto_amount=request.crypto_amount,
                crypto_network=request.crypto_network,
                usd_rate=crypto_price_usd,
                brl_rate=usd_brl_rate,
                base_amount_brl=base_amount_brl,
                service_fee_percent=self.SERVICE_FEE_PERCENT,
                service_fee_brl=service_fee_brl,
                network_fee_percent=self.NETWORK_FEE_PERCENT,
                network_fee_brl=network_fee_brl,
                total_amount_brl=total_amount_brl,
                checkout_token=checkout_token,
                status=InvoiceStatus.PENDING,
                expires_at=expires_at
            )
            
            self.db.add(invoice)
            self.db.commit()
            self.db.refresh(invoice)
            
            # 8. Gerar URL de checkout (usar FRONTEND_URL do settings)
            frontend_url = settings.FRONTEND_URL.rstrip('/')
            checkout_url = f"{frontend_url}/wolkpay/checkout/{checkout_token}"
            invoice.checkout_url = checkout_url
            self.db.commit()
            
            # 9. Log de auditoria
            self._log_audit(
                invoice_id=invoice.id,
                actor_type="user",
                actor_id=user_id,
                action="create_invoice",
                description=f"Fatura {invoice_number} criada: {request.crypto_amount} {request.crypto_currency}"
            )
            
            logger.info(f"WolkPay: Fatura {invoice_number} criada por {user_id}")
            
            return invoice, checkout_url
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"WolkPay: Erro ao criar fatura: {e}")
            raise
    
    # ==========================================
    # CHECKOUT (PAGADOR)
    # ==========================================
    
    async def get_checkout_data(self, checkout_token: str) -> Optional[CheckoutDataResponse]:
        """
        Obtém dados do checkout para exibir ao pagador
        
        Args:
            checkout_token: Token do checkout
            
        Returns:
            CheckoutDataResponse ou None se não encontrado
        """
        invoice = self.db.query(WolkPayInvoice).filter(
            WolkPayInvoice.checkout_token == checkout_token
        ).first()
        
        if not invoice:
            return None
        
        # Verificar expiração
        is_expired = invoice.is_expired()
        if is_expired and invoice.status == InvoiceStatus.PENDING:
            invoice.status = InvoiceStatus.EXPIRED
            self.db.commit()
        
        # Buscar dados do beneficiário
        user = self.db.query(User).filter(User.id == invoice.beneficiary_id).first()
        
        # Nome mascarado (parcial por privacidade)
        beneficiary_name = self._mask_name(user.username if user else "Usuário")
        
        # Gerar UID a partir do ID do usuário (primeiros 8 chars)
        user_id_str = str(user.id) if user else "00000000"
        beneficiary_uid = f"WK-{user_id_str[:8].upper()}"
        
        # Calcular tempo restante
        now = datetime.now(timezone.utc)
        if invoice.expires_at.tzinfo is None:
            expires_at = invoice.expires_at.replace(tzinfo=timezone.utc)
        else:
            expires_at = invoice.expires_at
        expires_in_seconds = max(0, int((expires_at - now).total_seconds()))
        
        return CheckoutDataResponse(
            invoice_id=str(invoice.id),
            invoice_number=invoice.invoice_number,
            status=invoice.status.value,
            beneficiary_name=beneficiary_name,
            beneficiary_uid=beneficiary_uid,
            beneficiary_verified=True,
            crypto_currency=invoice.crypto_currency,
            crypto_amount=invoice.crypto_amount,
            total_amount_brl=invoice.total_amount_brl,
            expires_at=invoice.expires_at,
            expires_in_seconds=expires_in_seconds,
            is_expired=is_expired,
            terms_version="v1.0"
        )
    
    async def save_payer_data(
        self,
        checkout_token: str,
        request: SavePayerDataRequest,
        ip_address: str,
        user_agent: str
    ) -> WolkPayPayer:
        """
        Salva dados do pagador no checkout
        
        Args:
            checkout_token: Token do checkout
            request: Dados do pagador
            ip_address: IP do pagador
            user_agent: Browser/Device
            
        Returns:
            WolkPayPayer criado
        """
        # 1. Buscar fatura
        invoice = self.db.query(WolkPayInvoice).filter(
            WolkPayInvoice.checkout_token == checkout_token
        ).first()
        
        if not invoice:
            raise ValueError("Fatura não encontrada")
        
        if invoice.is_expired():
            raise ValueError("Fatura expirada")
        
        if invoice.status not in [InvoiceStatus.PENDING, InvoiceStatus.AWAITING_PAYMENT]:
            raise ValueError(f"Fatura não pode receber dados no status {invoice.status}")
        
        # 2. Extrair documento para verificação de limites
        if request.person_type == "PF":
            document_type = DocumentType.CPF
            document_number = ''.join(filter(str.isdigit, request.pf_data.cpf))
        else:
            document_type = DocumentType.CNPJ
            document_number = ''.join(filter(str.isdigit, request.pj_data.cnpj))
        
        # 3. Verificar limites
        can_pay, message = await self.check_payer_limits(
            document_type=document_type.value,
            document_number=document_number,
            amount=invoice.total_amount_brl
        )
        
        if not can_pay:
            raise ValueError(message)
        
        # 4. Verificar se já existe pagador
        existing_payer = self.db.query(WolkPayPayer).filter(
            WolkPayPayer.invoice_id == invoice.id
        ).first()
        
        if existing_payer:
            # Atualizar dados existentes
            payer = existing_payer
        else:
            # Criar novo pagador
            payer = WolkPayPayer(invoice_id=invoice.id)
        
        # 5. Preencher dados comuns
        payer.person_type = PersonType.PF if request.person_type == "PF" else PersonType.PJ
        payer.ip_address = ip_address
        payer.user_agent = user_agent
        payer.terms_accepted_at = datetime.now(timezone.utc)
        payer.terms_version = request.terms_version
        
        # 6. Preencher endereço
        payer.zip_code = request.address.zip_code
        payer.street = request.address.street
        payer.number = request.address.number
        payer.complement = request.address.complement
        payer.neighborhood = request.address.neighborhood
        payer.city = request.address.city
        payer.state = request.address.state
        
        # 7. Preencher dados específicos PF/PJ
        if request.person_type == "PF":
            payer.full_name = request.pf_data.full_name
            payer.cpf = request.pf_data.cpf
            payer.birth_date = request.pf_data.birth_date
            payer.phone = request.pf_data.phone
            payer.email = request.pf_data.email
        else:
            payer.company_name = request.pj_data.company_name
            payer.cnpj = request.pj_data.cnpj
            payer.trade_name = request.pj_data.trade_name
            payer.state_registration = request.pj_data.state_registration
            payer.business_phone = request.pj_data.business_phone
            payer.business_email = request.pj_data.business_email
            payer.responsible_name = request.pj_data.responsible_name
            payer.responsible_cpf = request.pj_data.responsible_cpf
        
        # 8. Salvar
        if not existing_payer:
            self.db.add(payer)
        
        # 9. Atualizar status da fatura
        invoice.status = InvoiceStatus.AWAITING_PAYMENT
        
        self.db.commit()
        self.db.refresh(payer)
        
        # 10. Log de auditoria
        self._log_audit(
            invoice_id=invoice.id,
            actor_type="payer",
            actor_ip=ip_address,
            action="save_payer_data",
            description=f"Dados do pagador preenchidos: {payer.get_name()}"
        )
        
        logger.info(f"WolkPay: Dados do pagador salvos para fatura {invoice.invoice_number}")
        
        return payer
    
    async def generate_pix_payment(self, checkout_token: str) -> PixPaymentResponse:
        """
        Gera PIX para pagamento (conta estática)
        
        Args:
            checkout_token: Token do checkout
            
        Returns:
            PixPaymentResponse com QR Code
        """
        # 1. Buscar fatura
        invoice = self.db.query(WolkPayInvoice).filter(
            WolkPayInvoice.checkout_token == checkout_token
        ).first()
        
        if not invoice:
            raise ValueError("Fatura não encontrada")
        
        if invoice.is_expired():
            raise ValueError("Fatura expirada")
        
        if invoice.status != InvoiceStatus.AWAITING_PAYMENT:
            raise ValueError("Preencha os dados do pagador primeiro")
        
        # 2. Verificar se já existe pagador
        payer = self.db.query(WolkPayPayer).filter(
            WolkPayPayer.invoice_id == invoice.id
        ).first()
        
        if not payer:
            raise ValueError("Dados do pagador não encontrados")
        
        # 3. Gerar código PIX (conta estática)
        pix_code = self._generate_pix_static_code(
            amount=invoice.total_amount_brl,
            description=f"WolkPay {invoice.invoice_number}"
        )
        
        # 4. Gerar QR Code
        qr_image_base64 = self._generate_qr_code_base64(pix_code)
        
        # 5. Criar ou atualizar registro de pagamento
        payment = self.db.query(WolkPayPayment).filter(
            WolkPayPayment.invoice_id == invoice.id
        ).first()
        
        if not payment:
            payment = WolkPayPayment(
                invoice_id=invoice.id,
                payer_id=payer.id,
                pix_key=self.PIX_KEY,
                pix_qrcode=pix_code,
                pix_qrcode_image=qr_image_base64,
                amount_brl=invoice.total_amount_brl,
                status=PaymentStatus.PENDING
            )
            self.db.add(payment)
        else:
            payment.pix_qrcode = pix_code
            payment.pix_qrcode_image = qr_image_base64
        
        self.db.commit()
        
        # 6. Calcular tempo restante
        now = datetime.now(timezone.utc)
        if invoice.expires_at.tzinfo is None:
            expires_at = invoice.expires_at.replace(tzinfo=timezone.utc)
        else:
            expires_at = invoice.expires_at
        expires_in_seconds = max(0, int((expires_at - now).total_seconds()))
        
        # 7. Log de auditoria
        self._log_audit(
            invoice_id=invoice.id,
            actor_type="system",
            action="generate_pix",
            description=f"PIX gerado: R$ {invoice.total_amount_brl}"
        )
        
        return PixPaymentResponse(
            invoice_id=str(invoice.id),
            invoice_number=invoice.invoice_number,
            pix_key=self.PIX_KEY,
            pix_qrcode=pix_code,
            pix_qrcode_image=qr_image_base64,
            amount_brl=invoice.total_amount_brl,
            recipient_name=self.PIX_RECIPIENT_NAME,
            recipient_document=self.PIX_RECIPIENT_DOCUMENT,
            expires_at=invoice.expires_at,
            expires_in_seconds=expires_in_seconds
        )
    
    # ==========================================
    # VERIFICAÇÃO DE LIMITES
    # ==========================================
    
    async def check_payer_limits(
        self,
        document_type: str,
        document_number: str,
        amount: Decimal
    ) -> Tuple[bool, str]:
        """
        Verifica se o pagador pode realizar a transação
        
        Args:
            document_type: CPF ou CNPJ
            document_number: Número do documento (apenas dígitos)
            amount: Valor da transação
            
        Returns:
            Tuple[pode_pagar, mensagem]
        """
        # Verificar limite por operação
        if amount > self.LIMIT_PER_OPERATION:
            return False, f"Valor excede limite por operação de R$ {self.LIMIT_PER_OPERATION:,.2f}"
        
        # Gerar hash do documento para busca
        doc_hash = hashlib.sha256(document_number.encode()).hexdigest()
        month_year = datetime.now().strftime("%Y-%m")
        
        # Buscar registro de limite
        limit_record = self.db.query(WolkPayPayerLimit).filter(
            and_(
                WolkPayPayerLimit.document_hash == doc_hash,
                WolkPayPayerLimit.month_year == month_year
            )
        ).first()
        
        if limit_record:
            # Verificar bloqueio
            if limit_record.blocked:
                return False, f"Pagador bloqueado: {limit_record.blocked_reason}"
            
            # Verificar limite mensal
            new_total = limit_record.total_amount_brl + amount
            if new_total > self.LIMIT_PER_MONTH:
                remaining = self.LIMIT_PER_MONTH - limit_record.total_amount_brl
                return False, f"Limite mensal excedido. Disponível: R$ {remaining:,.2f}"
        
        return True, "OK"
    
    async def update_payer_limit(
        self,
        document_type: str,
        document_number: str,
        amount: Decimal
    ):
        """
        Atualiza o limite usado pelo pagador após pagamento confirmado
        """
        doc_hash = hashlib.sha256(document_number.encode()).hexdigest()
        month_year = datetime.now().strftime("%Y-%m")
        
        limit_record = self.db.query(WolkPayPayerLimit).filter(
            and_(
                WolkPayPayerLimit.document_hash == doc_hash,
                WolkPayPayerLimit.month_year == month_year
            )
        ).first()
        
        if limit_record:
            limit_record.total_amount_brl += amount
            limit_record.transaction_count += 1
            limit_record.last_transaction_at = datetime.now(timezone.utc)
        else:
            limit_record = WolkPayPayerLimit(
                document_type=DocumentType[document_type],
                document_number=document_number,
                document_hash=doc_hash,
                month_year=month_year,
                total_amount_brl=amount,
                transaction_count=1,
                last_transaction_at=datetime.now(timezone.utc)
            )
            self.db.add(limit_record)
        
        self.db.commit()
    
    # ==========================================
    # ADMIN - APROVAÇÃO
    # ==========================================
    
    async def approve_invoice(
        self,
        invoice_id: str,
        admin_id: str,
        notes: Optional[str] = None
    ) -> WolkPayApproval:
        """
        Aprova uma fatura e envia crypto para o beneficiário
        
        Args:
            invoice_id: ID da fatura
            admin_id: ID do admin
            notes: Observações
            
        Returns:
            WolkPayApproval criado
        """
        # 1. Buscar fatura
        invoice = self.db.query(WolkPayInvoice).filter(
            WolkPayInvoice.id == invoice_id
        ).first()
        
        if not invoice:
            raise ValueError("Fatura não encontrada")
        
        if invoice.status != InvoiceStatus.PAID:
            raise ValueError(f"Fatura não pode ser aprovada no status {invoice.status}")
        
        # 2. Buscar pagador e payment
        payer = self.db.query(WolkPayPayer).filter(
            WolkPayPayer.invoice_id == invoice_id
        ).first()
        
        payment = self.db.query(WolkPayPayment).filter(
            WolkPayPayment.invoice_id == invoice_id
        ).first()
        
        if not payer or not payment:
            raise ValueError("Dados incompletos para aprovação")
        
        # 3. Enviar crypto para o beneficiário
        # TODO: Integrar com WalletService para enviar crypto
        crypto_tx_hash = None
        wallet_address = None
        
        try:
            # wallet_service = WalletService(self.db)
            # result = await wallet_service.send_crypto(
            #     user_id=invoice.beneficiary_id,
            #     currency=invoice.crypto_currency,
            #     amount=invoice.crypto_amount,
            #     network=invoice.crypto_network
            # )
            # crypto_tx_hash = result.tx_hash
            # wallet_address = result.wallet_address
            
            # Placeholder até integrar
            crypto_tx_hash = f"pending_manual_send_{invoice.invoice_number}"
            logger.warning(f"WolkPay: Envio de crypto pendente de implementação para {invoice.invoice_number}")
            
        except Exception as e:
            logger.error(f"WolkPay: Erro ao enviar crypto: {e}")
            raise ValueError(f"Erro ao enviar crypto: {e}")
        
        # 4. Criar registro de aprovação
        approval = WolkPayApproval(
            invoice_id=invoice_id,
            approved_by=admin_id,
            action=ApprovalAction.APPROVED,
            crypto_tx_hash=crypto_tx_hash,
            crypto_network=invoice.crypto_network,
            wallet_address=wallet_address,
            notes=notes
        )
        self.db.add(approval)
        
        # 5. Atualizar status
        invoice.status = InvoiceStatus.COMPLETED
        
        # 6. Atualizar limite do pagador
        doc_type = "CPF" if payer.person_type == PersonType.PF else "CNPJ"
        doc_number = ''.join(filter(str.isdigit, payer.cpf if payer.person_type == PersonType.PF else payer.cnpj))
        await self.update_payer_limit(doc_type, doc_number, invoice.total_amount_brl)
        
        self.db.commit()
        self.db.refresh(approval)
        
        # 7. Log de auditoria
        self._log_audit(
            invoice_id=invoice_id,
            actor_type="admin",
            actor_id=admin_id,
            action="approve_invoice",
            description=f"Fatura aprovada. TX: {crypto_tx_hash}"
        )
        
        # TODO: Enviar e-mail para beneficiário e pagador
        
        logger.info(f"WolkPay: Fatura {invoice.invoice_number} aprovada por admin {admin_id}")
        
        return approval
    
    async def reject_invoice(
        self,
        invoice_id: str,
        admin_id: str,
        rejection_reason: str,
        notes: Optional[str] = None
    ) -> WolkPayApproval:
        """
        Rejeita uma fatura
        
        Args:
            invoice_id: ID da fatura
            admin_id: ID do admin
            rejection_reason: Motivo da rejeição
            notes: Observações adicionais
            
        Returns:
            WolkPayApproval criado
        """
        # 1. Buscar fatura
        invoice = self.db.query(WolkPayInvoice).filter(
            WolkPayInvoice.id == invoice_id
        ).first()
        
        if not invoice:
            raise ValueError("Fatura não encontrada")
        
        if invoice.status not in [InvoiceStatus.PAID, InvoiceStatus.AWAITING_PAYMENT]:
            raise ValueError(f"Fatura não pode ser rejeitada no status {invoice.status}")
        
        # 2. Criar registro de rejeição
        approval = WolkPayApproval(
            invoice_id=invoice_id,
            approved_by=admin_id,
            action=ApprovalAction.REJECTED,
            rejection_reason=rejection_reason,
            notes=notes
        )
        self.db.add(approval)
        
        # 3. Atualizar status
        invoice.status = InvoiceStatus.REJECTED
        
        self.db.commit()
        self.db.refresh(approval)
        
        # 4. Log de auditoria
        self._log_audit(
            invoice_id=invoice_id,
            actor_type="admin",
            actor_id=admin_id,
            action="reject_invoice",
            description=f"Fatura rejeitada: {rejection_reason}"
        )
        
        # TODO: Enviar e-mail informando rejeição + processo de estorno
        
        logger.info(f"WolkPay: Fatura {invoice.invoice_number} rejeitada por admin {admin_id}")
        
        return approval
    
    # ==========================================
    # LISTAGEM E CONSULTAS
    # ==========================================
    
    async def get_user_invoices(
        self,
        user_id: str,
        status: Optional[str] = None,
        page: int = 1,
        per_page: int = 20
    ) -> Tuple[List[WolkPayInvoice], int]:
        """
        Lista faturas do beneficiário
        """
        query = self.db.query(WolkPayInvoice).filter(
            WolkPayInvoice.beneficiary_id == user_id
        )
        
        if status:
            query = query.filter(WolkPayInvoice.status == status)
        
        total = query.count()
        
        invoices = query.order_by(
            WolkPayInvoice.created_at.desc()
        ).offset((page - 1) * per_page).limit(per_page).all()
        
        return invoices, total
    
    async def get_pending_invoices_for_admin(
        self,
        page: int = 1,
        per_page: int = 20
    ) -> Tuple[List[WolkPayInvoice], int]:
        """
        Lista faturas pendentes de aprovação para admin
        """
        query = self.db.query(WolkPayInvoice).filter(
            WolkPayInvoice.status == InvoiceStatus.PAID
        )
        
        total = query.count()
        
        invoices = query.order_by(
            WolkPayInvoice.created_at.asc()  # Mais antigos primeiro
        ).offset((page - 1) * per_page).limit(per_page).all()
        
        return invoices, total
    
    # ==========================================
    # HELPERS
    # ==========================================
    
    async def _get_crypto_price_usd(self, symbol: str) -> Decimal:
        """Obtém preço da crypto em USD usando o price_aggregator do projeto"""
        symbol_upper = symbol.upper()
        
        # Stablecoins sempre valem ~1 USD
        if symbol_upper in ['USDT', 'USDC', 'DAI', 'BUSD']:
            return Decimal('1.00')
        
        try:
            # Usar o price_aggregator existente no projeto
            prices = await price_aggregator.get_prices([symbol_upper], "usd")
            if symbol_upper in prices:
                price_data = prices[symbol_upper]
                if isinstance(price_data, dict) and 'price' in price_data:
                    return Decimal(str(price_data['price']))
                elif hasattr(price_data, 'price'):
                    return Decimal(str(price_data.price))
            
            raise ValueError(f"Preço não encontrado para {symbol}")
        except Exception as e:
            logger.warning(f"Erro ao obter preço de {symbol} da API: {e}")
            raise ValueError(f"Não foi possível obter cotação de {symbol}")
    
    async def _get_usd_brl_rate(self) -> Decimal:
        """Obtém taxa USD/BRL usando o price_aggregator do projeto"""
        try:
            # Usar USDT em BRL como referência para taxa USD/BRL
            prices = await price_aggregator.get_prices(['USDT'], "brl")
            if 'USDT' in prices:
                price_data = prices['USDT']
                if isinstance(price_data, dict) and 'price' in price_data:
                    return Decimal(str(price_data['price']))
                elif hasattr(price_data, 'price'):
                    return Decimal(str(price_data.price))
            # Fallback
            return Decimal('6.00')
        except Exception as e:
            logger.warning(f"Erro ao obter taxa USD/BRL, usando fallback: {e}")
            return Decimal('6.00')
    
    def _mask_name(self, name: str) -> str:
        """Mascara nome para privacidade (ex: Jânio Martins -> J***o M***s)"""
        if not name:
            return "U***o"
        
        parts = name.split()
        masked_parts = []
        
        for part in parts:
            if len(part) <= 2:
                masked_parts.append(part)
            else:
                masked_parts.append(f"{part[0]}***{part[-1]}")
        
        return " ".join(masked_parts)
    
    def _generate_pix_static_code(self, amount: Decimal, description: str) -> str:
        """
        Gera código PIX estático (copia e cola)
        
        Formato simplificado - em produção usar biblioteca pix-python
        """
        # Formato EMV simplificado
        # Em produção, usar biblioteca como python-pix
        
        pix_data = f"""
00020126580014br.gov.bcb.pix0136{self.PIX_KEY}
52040000530398654{float(amount):.2f}5802BR
5913HOLD DIGITAL6008BRASILIA62070503***6304
""".replace("\n", "").strip()
        
        # Calcular CRC16 (simplificado)
        # Em produção, calcular CRC16-CCITT corretamente
        
        return pix_data
    
    def _generate_qr_code_base64(self, data: str) -> str:
        """Gera QR Code em base64"""
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=10,
            border=4,
        )
        qr.add_data(data)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        
        return base64.b64encode(buffer.getvalue()).decode('utf-8')
    
    def _log_audit(
        self,
        invoice_id: Optional[str],
        actor_type: str,
        action: str,
        description: str,
        actor_id: Optional[str] = None,
        actor_ip: Optional[str] = None,
        old_data: Optional[str] = None,
        new_data: Optional[str] = None
    ):
        """Registra log de auditoria"""
        audit = WolkPayAuditLog(
            invoice_id=invoice_id,
            actor_type=actor_type,
            actor_id=actor_id,
            actor_ip=actor_ip,
            action=action,
            description=description,
            old_data=old_data,
            new_data=new_data
        )
        self.db.add(audit)
        # Não faz commit aqui, será feito junto com a operação principal

    # ==========================================
    # CONVERSÃO PAGADOR -> USUÁRIO
    # ==========================================
    
    async def check_payer_conversion_eligibility(
        self,
        checkout_token: str
    ) -> dict:
        """
        Verifica se o pagador pode criar uma conta WolkNow
        
        Retorna:
            - can_convert: bool
            - reason: motivo se não puder
            - dados do pagador para preview
        """
        # Buscar invoice e pagador
        invoice = self.db.query(WolkPayInvoice).filter(
            WolkPayInvoice.checkout_token == checkout_token
        ).first()
        
        if not invoice:
            return {
                "can_convert": False,
                "reason": "Fatura não encontrada",
                "email": "",
                "name": "",
                "document_type": "",
                "document_masked": ""
            }
        
        # Permitir conversão mesmo que pagamento não esteja confirmado pelo admin
        # O pagador pode criar conta após informar que pagou
        # (status AWAITING_PAYMENT também é válido)
        if invoice.status in [InvoiceStatus.EXPIRED, InvoiceStatus.CANCELLED, InvoiceStatus.REJECTED]:
            return {
                "can_convert": False,
                "reason": "Fatura não está disponível",
                "email": "",
                "name": "",
                "document_type": "",
                "document_masked": ""
            }
        
        payer = self.db.query(WolkPayPayer).filter(
            WolkPayPayer.invoice_id == invoice.id
        ).first()
        
        if not payer:
            return {
                "can_convert": False,
                "reason": "Dados do pagador não encontrados",
                "email": "",
                "name": "",
                "document_type": "",
                "document_masked": ""
            }
        
        # Obter email e nome
        if payer.person_type == PersonType.PF:
            email = payer.email
            name = payer.full_name
            doc_type = "CPF"
            doc = payer.cpf or ""
        else:
            email = payer.business_email
            name = payer.company_name
            doc_type = "CNPJ"
            doc = payer.cnpj or ""
        
        # Mascarar documento
        clean_doc = ''.join(filter(str.isdigit, doc))
        if len(clean_doc) == 11:  # CPF
            doc_masked = f"***.{clean_doc[3:6]}.***-{clean_doc[-2:]}"
        elif len(clean_doc) == 14:  # CNPJ
            doc_masked = f"**.{clean_doc[2:5]}.***/****-{clean_doc[-2:]}"
        else:
            doc_masked = "***"
        
        # Verificar se email já está em uso
        existing_user = self.db.query(User).filter(User.email == email).first()
        if existing_user:
            return {
                "can_convert": False,
                "reason": "Este e-mail já possui uma conta WolkNow. Faça login!",
                "email": email,
                "name": name,
                "document_type": doc_type,
                "document_masked": doc_masked,
                "existing_user": True
            }
        
        # Pode converter!
        return {
            "can_convert": True,
            "reason": None,
            "email": email,
            "name": name,
            "document_type": doc_type,
            "document_masked": doc_masked,
            "welcome_bonus": "R$ 10,00 em BTC",
            "promo_message": "Crie sua conta agora e ganhe bônus de boas-vindas!"
        }
    
    async def convert_payer_to_user(
        self,
        checkout_token: str,
        password: str,
        accept_marketing: bool = False,
        ip_address: Optional[str] = None
    ) -> Tuple[User, str]:
        """
        Converte um pagador em usuário WolkNow
        
        Args:
            checkout_token: Token do checkout
            password: Senha escolhida
            accept_marketing: Aceitar comunicações de marketing
            ip_address: IP do cliente
            
        Returns:
            Tuple[User, message]
        """
        from app.core.security import get_password_hash
        import uuid
        
        # 1. Verificar elegibilidade
        eligibility = await self.check_payer_conversion_eligibility(checkout_token)
        if not eligibility["can_convert"]:
            raise ValueError(eligibility["reason"])
        
        # 2. Buscar dados do pagador
        invoice = self.db.query(WolkPayInvoice).filter(
            WolkPayInvoice.checkout_token == checkout_token
        ).first()
        
        payer = self.db.query(WolkPayPayer).filter(
            WolkPayPayer.invoice_id == invoice.id
        ).first()
        
        # 3. Preparar dados do usuário
        if payer.person_type == PersonType.PF:
            user_data = {
                "email": payer.email,
                "name": payer.full_name,
                "cpf": payer.cpf,
                "phone": payer.phone,
                "birth_date": payer.birth_date,
            }
        else:
            # Para PJ, usar dados do responsável
            user_data = {
                "email": payer.business_email,
                "name": payer.responsible_name or payer.company_name,
                "cpf": payer.responsible_cpf,
                "phone": payer.business_phone,
                "company_name": payer.company_name,
                "cnpj": payer.cnpj,
            }
        
        # Adicionar endereço
        user_data.update({
            "zip_code": payer.zip_code,
            "street": payer.street,
            "number": payer.number,
            "complement": payer.complement,
            "neighborhood": payer.neighborhood,
            "city": payer.city,
            "state": payer.state,
        })
        
        # 4. Verificar se já existe usuário com esse email
        existing_user = self.db.query(User).filter(
            User.email == user_data["email"]
        ).first()
        
        if existing_user:
            raise ValueError("Já existe uma conta com este e-mail. Faça login para continuar.")
        
        # Gerar username único a partir do nome
        name_str = str(user_data.get("name") or "user")
        base_username = name_str.lower().split()[0] if name_str else "user"
        base_username = ''.join(c for c in base_username if c.isalnum())[:20]
        if not base_username:
            base_username = "user"
        username = base_username
        
        # Se username já existe, adicionar número
        counter = 1
        while self.db.query(User).filter(User.username == username).first():
            username = f"{base_username}{counter}"
            counter += 1
        
        # 5. Criar usuário com campos corretos do modelo
        new_user = User(
            id=uuid.uuid4(),
            email=user_data["email"],
            username=username,
            password_hash=get_password_hash(password),
            is_active=True,
            is_email_verified=False,  # Precisará verificar email
            is_admin=False,
            created_at=datetime.now(timezone.utc),
        )
        
        self.db.add(new_user)
        
        # 6. Log de auditoria
        if invoice:
            self._log_audit(
                invoice_id=str(invoice.id),
                actor_type="system",
                action="payer_converted_to_user",
                description=f"Pagador convertido em usuário {new_user.id}",
                actor_ip=ip_address
            )
        
        self.db.commit()
        
        # 7. TODO: Enviar email de boas-vindas
        # await send_welcome_email(new_user.email, username)
        
        # 8. TODO: Adicionar bônus de boas-vindas
        # await add_welcome_bonus(new_user.id)
        
        logger.info(f"✅ Pagador convertido em usuário: {new_user.email} ({username})")
        
        return new_user, "Conta criada com sucesso! Verifique seu e-mail para confirmar."
    
    def get_payer_benefits_info(self) -> dict:
        """
        Retorna informações sobre benefícios para exibir no checkout
        após o pagamento ser confirmado
        """
        return {
            "show_conversion_offer": True,
            "headline": "Pagamento Confirmado! Crie sua conta WolkNow",
            "subheadline": "Seus dados já estão preenchidos - é só criar uma senha!",
            "benefits": [
                {
                    "icon": "Gift",
                    "title": "Bônus de Boas-vindas",
                    "description": "Ganhe R$ 10,00 em BTC ao criar sua conta"
                },
                {
                    "icon": "Percent",
                    "title": "Taxas Reduzidas",
                    "description": "Pague apenas 2,9% em futuras operações (você pagou 3,8%)"
                },
                {
                    "icon": "Zap",
                    "title": "Compra Instantânea",
                    "description": "Próximas compras em segundos, sem precisar preencher dados"
                },
                {
                    "icon": "LineChart",
                    "title": "Painel de Investimentos",
                    "description": "Acompanhe seus ganhos em tempo real"
                },
                {
                    "icon": "ShieldCheck",
                    "title": "Carteira Segura",
                    "description": "Guarde suas cryptos com segurança e backup"
                },
                {
                    "icon": "Smartphone",
                    "title": "App Mobile",
                    "description": "Acesse de qualquer lugar pelo celular"
                }
            ],
            "cta_text": "Criar Minha Conta Grátis",
            "cta_subtitle": "Leva menos de 30 segundos!",
            "footer_text": "Ao criar sua conta, você concorda com nossos Termos de Uso e Política de Privacidade"
        }
