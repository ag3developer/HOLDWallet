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
from sqlalchemy import and_, func, or_

from app.models.wolkpay import (
    WolkPayInvoice, WolkPayPayer, WolkPayPayment, WolkPayApproval,
    WolkPayPayerLimit, WolkPayAuditLog, WolkPayTermsVersion,
    InvoiceStatus, PersonType, DocumentType, PaymentStatus, ApprovalAction, FeePayer
)
from app.models.user import User
from app.schemas.wolkpay import (
    CreateInvoiceRequest, SavePayerDataRequest,
    InvoiceResponse, CheckoutDataResponse, PixPaymentResponse
)
from app.services.price_aggregator import price_aggregator
from app.services.wallet_service import WalletService
from app.services.platform_settings_service import platform_settings_service
from app.services.kyc_service import KYCService
from app.services.notifications import notify_invoice_created, notify_invoice_paid, fire_and_forget
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
    # Taxas agora vêm do platform_settings_service (valores abaixo são fallback)
    DEFAULT_SERVICE_FEE_PERCENT = Decimal('3.65')  # Taxa de serviço padrão
    DEFAULT_NETWORK_FEE_PERCENT = Decimal('0.15')  # Taxa de rede padrão
    # Limites padrão (fallback caso não haja configuração no banco)
    DEFAULT_LIMIT_PER_OPERATION = Decimal('15000.00')  # Limite por operação padrão
    DEFAULT_LIMIT_PER_MONTH = Decimal('300000.00')  # Limite mensal por pagador padrão
    
    # Dados da conta para PIX - usa configuração do settings
    # IMPORTANTE: Esta chave PIX DEVE estar cadastrada no banco da HOLD!
    PIX_KEY = getattr(settings, 'BB_PIX_KEY', "24275355000151")  # Chave PIX (CNPJ)
    PIX_RECIPIENT_NAME = "HOLD DIGITAL ASSETS LTDA"
    PIX_RECIPIENT_DOCUMENT = "24.275.355/0001-51"
    
    def __init__(self, db: Session):
        self.db = db
        self._kyc_service = None
    
    @property
    def kyc_service(self) -> KYCService:
        """Lazy loading do KYCService"""
        if self._kyc_service is None:
            self._kyc_service = KYCService(self.db)
        return self._kyc_service
    
    async def _get_user_operation_limit(self, user_id: str) -> Decimal:
        """
        Obtém o limite por operação do usuário baseado no KYC.
        Consulta limites personalizados e limites do banco.
        
        Args:
            user_id: ID do usuário
            
        Returns:
            Limite por operação em BRL
        """
        try:
            import uuid
            user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
            limits = await self.kyc_service.get_service_limit(user_uuid, "wolkpay")
            
            per_op = limits.get("transaction_limit_brl")
            if per_op is None:
                # None = sem limite (ilimitado)
                return Decimal('999999999.99')
            
            return Decimal(str(per_op)) if per_op else self.DEFAULT_LIMIT_PER_OPERATION
        except Exception as e:
            logger.warning(f"Erro ao obter limite KYC do usuário {user_id}: {e}")
            return self.DEFAULT_LIMIT_PER_OPERATION
    
    async def _check_user_service_access(self, user_id: str, amount_brl: Decimal) -> tuple:
        """
        Verifica se o usuário pode usar o WolkPay.
        
        Returns:
            Tuple[allowed: bool, message: str, limits: dict]
        """
        try:
            import uuid
            user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
            return await self.kyc_service.check_service_access(user_uuid, "wolkpay", amount_brl)
        except Exception as e:
            logger.warning(f"Erro ao verificar acesso KYC: {e}")
            # Em caso de erro, usa limite padrão
            if amount_brl > self.DEFAULT_LIMIT_PER_OPERATION:
                return False, f"Valor excede limite padrão de R$ {self.DEFAULT_LIMIT_PER_OPERATION:,.2f}", {}
            return True, "OK", {}
    
    def _get_service_fee_percent(self) -> Decimal:
        """Obtém taxa de serviço do platform_settings (com fallback)"""
        try:
            fee = platform_settings_service.get_wolkpay_service_fee(self.db)
            return Decimal(str(fee))
        except Exception:
            return self.DEFAULT_SERVICE_FEE_PERCENT
    
    def _get_network_fee_percent(self) -> Decimal:
        """Obtém taxa de rede do platform_settings (com fallback)"""
        try:
            fee = platform_settings_service.get_wolkpay_network_fee(self.db)
            return Decimal(str(fee))
        except Exception:
            return self.DEFAULT_NETWORK_FEE_PERCENT
    
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
            
            # 3. Obter taxas do platform_settings
            service_fee_percent = self._get_service_fee_percent()
            network_fee_percent = self._get_network_fee_percent()
            
            # 4. Calcular valores base
            base_amount_brl = request.crypto_amount * crypto_price_usd * usd_brl_rate
            service_fee_brl = base_amount_brl * (service_fee_percent / 100)
            network_fee_brl = base_amount_brl * (network_fee_percent / 100)
            total_fees_brl = service_fee_brl + network_fee_brl
            
            # 5. Determinar quem paga as taxas e calcular valores finais
            fee_payer = FeePayer(request.fee_payer.value)
            
            if fee_payer == FeePayer.PAYER:
                # Pagador paga as taxas: total = base + taxas, beneficiário recebe valor cheio
                total_amount_brl = base_amount_brl + total_fees_brl
                beneficiary_receives_brl = base_amount_brl
                beneficiary_receives_crypto = request.crypto_amount  # Recebe o valor cheio
            else:
                # Beneficiário paga as taxas (padrão): total = base, beneficiário recebe menos
                total_amount_brl = base_amount_brl
                beneficiary_receives_brl = base_amount_brl - total_fees_brl
                # Calcula crypto líquida: crypto_amount * (1 - taxa_total%)
                total_fee_percent = service_fee_percent + network_fee_percent
                beneficiary_receives_crypto = request.crypto_amount * (1 - total_fee_percent / 100)
            
            logger.info(f"💰 WolkPay: Criando fatura - Bruto: {request.crypto_amount}, Líquido: {beneficiary_receives_crypto}, Fee Payer: {fee_payer.value}")
            
            # 6. Verificar limite por operação baseado no KYC do usuário
            allowed, message, limits_info = await self._check_user_service_access(user_id, total_amount_brl)
            if not allowed:
                raise ValueError(message)
            
            # 7. Gerar identificadores
            invoice_number = WolkPayInvoice.generate_invoice_number()
            checkout_token = WolkPayInvoice.generate_checkout_token()
            
            # 8. Calcular expiração (15 minutos)
            expires_at = datetime.now(timezone.utc) + timedelta(minutes=self.INVOICE_VALIDITY_MINUTES)
            
            # 9. Determinar rede (usar padrão se não especificada)
            crypto_network = request.crypto_network or self._get_default_network(request.crypto_currency)
            
            # 10. Criar fatura
            invoice = WolkPayInvoice(
                invoice_number=invoice_number,
                beneficiary_id=user_id,
                crypto_currency=request.crypto_currency.upper(),
                crypto_amount=request.crypto_amount,
                crypto_network=crypto_network,
                usd_rate=crypto_price_usd,
                brl_rate=usd_brl_rate,
                base_amount_brl=base_amount_brl,
                service_fee_percent=service_fee_percent,
                service_fee_brl=service_fee_brl,
                network_fee_percent=network_fee_percent,
                network_fee_brl=network_fee_brl,
                total_amount_brl=total_amount_brl,
                fee_payer=fee_payer,
                beneficiary_receives_brl=beneficiary_receives_brl,
                beneficiary_receives_crypto=beneficiary_receives_crypto,  # NOVO: valor líquido em crypto
                checkout_token=checkout_token,
                status=InvoiceStatus.PENDING,
                expires_at=expires_at
            )
            
            self.db.add(invoice)
            self.db.commit()
            self.db.refresh(invoice)
            
            # 10. Gerar URL de checkout (usar FRONTEND_URL do settings)
            frontend_url = settings.FRONTEND_URL.rstrip('/')
            checkout_url = f"{frontend_url}/wolkpay/checkout/{checkout_token}"
            invoice.checkout_url = checkout_url
            self.db.commit()
            
            # 11. Log de auditoria
            fee_payer_label = "pagador" if fee_payer == FeePayer.PAYER else "beneficiário"
            self._log_audit(
                invoice_id=invoice.id,
                actor_type="user",
                actor_id=user_id,
                action="create_invoice",
                description=f"Fatura {invoice_number} criada: {request.crypto_amount} {request.crypto_currency} (taxas: {fee_payer_label})"
            )
            
            # 📧 SEND NOTIFICATION: Invoice created
            try:
                fire_and_forget(notify_invoice_created(
                    db=self.db,
                    user_id=user_id,
                    invoice_id=str(invoice.id),
                    amount=float(total_amount_brl),
                    cryptocurrency=request.crypto_currency,
                    description=f"Fatura {invoice_number}"
                ))
            except Exception as notif_error:
                logger.warning(f"Failed to send invoice notification: {notif_error}")
            
            logger.info(f"WolkPay: Fatura {invoice_number} criada por {user_id} (fee_payer={fee_payer.value})")
            
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
        
        # Determinar label de quem paga as taxas
        fee_payer_value = invoice.fee_payer.value if invoice.fee_payer else "BENEFICIARY"
        if fee_payer_value == "PAYER":
            fee_payer_label = "Taxas incluídas no valor (pagas pelo pagador)"
        else:
            fee_payer_label = "Taxas pagas pelo beneficiário"
        
        # Calcular total de taxas
        total_fees_brl = (invoice.service_fee_brl or Decimal('0')) + (invoice.network_fee_brl or Decimal('0'))
        
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
            fee_payer=fee_payer_value,
            service_fee_brl=invoice.service_fee_brl,
            network_fee_brl=invoice.network_fee_brl,
            total_fees_brl=total_fees_brl,
            fee_payer_label=fee_payer_label,
            expires_at=invoice.expires_at,
            expires_in_seconds=expires_in_seconds,
            is_expired=is_expired,
            terms_version="v1.0"
        )
    
    async def lookup_payer_by_document(
        self,
        checkout_token: str,
        document: str
    ) -> Optional[dict]:
        """
        Busca dados de pagador existente por CPF/CNPJ (checkout inteligente)
        
        Permite auto-preenchimento se o pagador já realizou pagamentos anteriores.
        
        Args:
            checkout_token: Token do checkout (para validar fatura existe)
            document: CPF ou CNPJ (apenas números)
            
        Returns:
            Dict com dados do pagador ou None se não encontrado
        """
        # 1. Validar que fatura existe e não expirou
        invoice = self.db.query(WolkPayInvoice).filter(
            WolkPayInvoice.checkout_token == checkout_token
        ).first()
        
        if not invoice:
            raise ValueError("Fatura não encontrada")
        
        if invoice.is_expired():
            raise ValueError("Fatura expirada")
        
        # 2. Limpar documento (apenas números)
        doc_clean = ''.join(filter(str.isdigit, document))
        
        if len(doc_clean) < 11:
            return None  # Documento muito curto, ainda não completo
        
        # 3. Buscar pagador mais recente com este documento
        # O banco pode ter CPF/CNPJ com ou sem formatação, então buscar ambos
        payer = None
        
        if len(doc_clean) == 11:
            # CPF - formatar para busca
            cpf_formatted = f"{doc_clean[:3]}.{doc_clean[3:6]}.{doc_clean[6:9]}-{doc_clean[9:]}"
            
            # Buscar por CPF (com ou sem formatação)
            payer = self.db.query(WolkPayPayer).filter(
                or_(WolkPayPayer.cpf == doc_clean, WolkPayPayer.cpf == cpf_formatted)
            ).order_by(WolkPayPayer.created_at.desc()).first()
            
        elif len(doc_clean) == 14:
            # CNPJ - formatar para busca
            cnpj_formatted = f"{doc_clean[:2]}.{doc_clean[2:5]}.{doc_clean[5:8]}/{doc_clean[8:12]}-{doc_clean[12:]}"
            
            # Buscar por CNPJ (com ou sem formatação)
            payer = self.db.query(WolkPayPayer).filter(
                or_(WolkPayPayer.cnpj == doc_clean, WolkPayPayer.cnpj == cnpj_formatted)
            ).order_by(WolkPayPayer.created_at.desc()).first()
        
        if not payer:
            return None
        
        # 4. Montar resposta com dados para auto-preenchimento
        # (não retorna dados sensíveis completos, apenas para preview)
        
        if payer.person_type == PersonType.PF:
            return {
                "person_type": "PF",
                "pf_data": {
                    "full_name": payer.full_name,
                    "cpf": payer.cpf,
                    "birth_date": payer.birth_date.isoformat() if payer.birth_date else None,
                    "phone": payer.phone,
                    "email": payer.email
                },
                "address": {
                    "zip_code": payer.zip_code,
                    "street": payer.street,
                    "number": payer.number,
                    "complement": payer.complement,
                    "neighborhood": payer.neighborhood,
                    "city": payer.city,
                    "state": payer.state
                }
            }
        else:
            return {
                "person_type": "PJ",
                "pj_data": {
                    "company_name": payer.company_name,
                    "cnpj": payer.cnpj,
                    "trade_name": payer.trade_name,
                    "state_registration": payer.state_registration,
                    "business_phone": payer.business_phone,
                    "business_email": payer.business_email,
                    "responsible_name": payer.responsible_name,
                    "responsible_cpf": payer.responsible_cpf
                },
                "address": {
                    "zip_code": payer.zip_code,
                    "street": payer.street,
                    "number": payer.number,
                    "complement": payer.complement,
                    "neighborhood": payer.neighborhood,
                    "city": payer.city,
                    "state": payer.state
                }
            }

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
        Gera PIX para pagamento via API Banco do Brasil (cobrança automática)
        
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
        
        # 3. Verificar se já existe pagamento com TXID (já gerou PIX antes)
        payment = self.db.query(WolkPayPayment).filter(
            WolkPayPayment.invoice_id == invoice.id
        ).first()
        
        pix_txid = None
        pix_code = None
        pix_location = None
        qr_image_base64 = None
        
        # Se já existe payment com txid E qrcode válidos, retorna os dados existentes
        # Validação: pix_qrcode deve ter pelo menos 100 caracteres (payload EMV mínimo)
        existing_qrcode = str(payment.pix_qrcode) if payment and payment.pix_qrcode else ""
        if payment and payment.pix_txid and existing_qrcode and len(existing_qrcode) > 100:
            pix_txid = payment.pix_txid
            pix_code = existing_qrcode
            qr_image_base64 = payment.pix_qrcode_image
            
            # Limpar prefixo data:image se presente nos dados salvos
            if qr_image_base64 and qr_image_base64.startswith('data:image'):
                qr_image_base64 = qr_image_base64.split(',', 1)[-1]
            
            logger.info(f"WolkPay: Reutilizando PIX existente TXID: {pix_txid} (QRCode: {len(pix_code)} chars)")
            
            # Se não temos a imagem, gera agora
            if not qr_image_base64 and pix_code:
                logger.info("WolkPay: Gerando imagem QR Code para PIX existente...")
                qr_image_base64 = self._generate_qr_code_base64(pix_code)
                payment.pix_qrcode_image = qr_image_base64
                self.db.commit()
        else:
            # Se payment existe mas com dados inválidos, limpar para recriar
            if payment and (not existing_qrcode or len(existing_qrcode) < 100):
                logger.warning("WolkPay: Payment existente com dados inválidos, recriando PIX...")
            
            # 4. Criar cobrança PIX via API Banco do Brasil
            try:
                from app.services.banco_brasil_service import get_banco_brasil_service
                bb_service = get_banco_brasil_service(self.db)
                
                # Calcular expiração em segundos (tempo restante da fatura)
                now = datetime.now(timezone.utc)
                if invoice.expires_at.tzinfo is None:
                    expires_at = invoice.expires_at.replace(tzinfo=timezone.utc)
                else:
                    expires_at = invoice.expires_at
                expiracao_segundos = max(300, int((expires_at - now).total_seconds()))  # Mínimo 5 min
                
                # Obter documento do pagador
                if payer.person_type == PersonType.PF:
                    devedor_doc = ''.join(filter(str.isdigit, payer.cpf or ''))
                    devedor_nome = payer.full_name or 'Cliente'
                else:
                    devedor_doc = ''.join(filter(str.isdigit, payer.cnpj or ''))
                    devedor_nome = payer.company_name or payer.full_name or 'Empresa'
                
                # Gerar TXID único para a cobrança (baseado no invoice_number)
                # Formato: WKPAY + número da fatura sem hífen
                txid = f"WKPAY{invoice.invoice_number.replace('-', '').replace('_', '')}"
                
                # Criar cobrança via BB
                pix_data = await bb_service.criar_cobranca_pix(
                    txid=txid,
                    valor=invoice.total_amount_brl,
                    devedor_cpf=devedor_doc if payer.person_type == PersonType.PF else None,
                    devedor_nome=devedor_nome,
                    descricao=f"WolkPay {invoice.invoice_number}",
                    expiracao_segundos=expiracao_segundos
                )
                
                pix_txid = pix_data.get('txid')
                # O campo pode vir como 'qrcode' ou 'pix_copia_cola' dependendo da versão do BB service
                pix_code = pix_data.get('qrcode') or pix_data.get('pix_copia_cola')
                pix_location = pix_data.get('location')
                # O BB service já pode retornar a imagem base64 pronta
                bb_qr_image = pix_data.get('qrcode_base64')
                if bb_qr_image:
                    # Remove prefixo data:image se presente (frontend adiciona)
                    if bb_qr_image.startswith('data:image'):
                        qr_image_base64 = bb_qr_image.split(',', 1)[-1]
                    else:
                        qr_image_base64 = bb_qr_image
                
                # Log detalhado para debug
                logger.info(f"✅ WolkPay: Cobrança PIX BB criada!")
                logger.info(f"   TXID: {pix_txid}")
                logger.info(f"   PIX Code presente: {bool(pix_code)} ({len(pix_code) if pix_code else 0} chars)")
                logger.info(f"   QR Image presente: {bool(qr_image_base64)}")
                logger.info(f"   Location: {pix_location}")
                
                # Validação extra: se não temos pix_code, algo deu errado
                if not pix_code:
                    logger.error(f"❌ WolkPay: BB retornou sem PIX copia-e-cola! Data: {pix_data}")
                    raise Exception("API do BB não retornou o código PIX copia-e-cola")
                
            except Exception as e:
                logger.error(f"❌ WolkPay: Erro ao criar PIX via BB: {e}")
                # Fallback para PIX estático se BB falhar
                logger.warning("⚠️ WolkPay: Usando fallback PIX estático")
                pix_code = self._generate_pix_static_code(
                    amount=invoice.total_amount_brl,
                    description=invoice.invoice_number
                )
                pix_txid = f"STATIC_{invoice.invoice_number}"
            
            # 5. Gerar QR Code da imagem (se ainda não temos)
            if pix_code and not qr_image_base64:
                qr_image_base64 = self._generate_qr_code_base64(pix_code)
            
            # 6. Criar ou atualizar registro de pagamento
            if not payment:
                payment = WolkPayPayment(
                    invoice_id=invoice.id,
                    payer_id=payer.id,
                    pix_key=self.PIX_KEY,
                    pix_txid=pix_txid,
                    pix_qrcode=pix_code,
                    pix_qrcode_image=qr_image_base64,
                    amount_brl=invoice.total_amount_brl,
                    status=PaymentStatus.PENDING
                )
                self.db.add(payment)
            else:
                payment.pix_txid = pix_txid
                payment.pix_qrcode = pix_code
                payment.pix_qrcode_image = qr_image_base64
            
            self.db.commit()
        
        # 7. Calcular tempo restante
        now = datetime.now(timezone.utc)
        if invoice.expires_at.tzinfo is None:
            expires_at = invoice.expires_at.replace(tzinfo=timezone.utc)
        else:
            expires_at = invoice.expires_at
        expires_in_seconds = max(0, int((expires_at - now).total_seconds()))
        
        # 8. Log de auditoria
        self._log_audit(
            invoice_id=invoice.id,
            actor_type="system",
            action="generate_pix",
            description=f"PIX BB gerado: R$ {invoice.total_amount_brl} TXID: {pix_txid}"
        )
        
        # Determinar se é automático ou estático
        is_automatic = pix_txid and not pix_txid.startswith("STATIC_")
        
        return PixPaymentResponse(
            invoice_id=str(invoice.id),
            invoice_number=invoice.invoice_number,
            pix_key=self.PIX_KEY,
            pix_qrcode=pix_code or '',
            pix_qrcode_image=qr_image_base64,
            pix_txid=pix_txid,
            amount_brl=invoice.total_amount_brl,
            recipient_name=self.PIX_RECIPIENT_NAME,
            recipient_document=self.PIX_RECIPIENT_DOCUMENT,
            expires_at=invoice.expires_at,
            expires_in_seconds=expires_in_seconds,
            is_automatic=is_automatic
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
        if amount > self.DEFAULT_LIMIT_PER_OPERATION:
            return False, f"Valor excede limite por operação de R$ {self.DEFAULT_LIMIT_PER_OPERATION:,.2f}"
        
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
            if new_total > self.DEFAULT_LIMIT_PER_MONTH:
                remaining = self.DEFAULT_LIMIT_PER_MONTH - limit_record.total_amount_brl
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
        network: Optional[str] = None,
        notes: Optional[str] = None
    ) -> WolkPayApproval:
        """
        Aprova uma fatura e envia crypto para o beneficiário
        
        Args:
            invoice_id: ID da fatura
            admin_id: ID do admin
            network: Rede blockchain para envio (polygon, ethereum, bitcoin, etc)
            notes: Observações
            
        Returns:
            WolkPayApproval criado
        """
        from app.models.wallet import Wallet
        from app.models.address import Address
        # InstantTrade imports removidos - usando WolkPayTradeAdapter local
        
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
        
        # 3. Buscar dados do beneficiário
        beneficiary = self.db.query(User).filter(User.id == invoice.beneficiary_id).first()
        if not beneficiary:
            raise ValueError("Beneficiário não encontrado")
        
        # 4. Buscar wallet e endereço do beneficiário
        beneficiary_wallet = self.db.query(Wallet).filter(
            Wallet.user_id == invoice.beneficiary_id
        ).first()
        
        if not beneficiary_wallet:
            raise ValueError("Carteira do beneficiário não encontrada")
        
        # Redes suportadas pelo sistema (onde temos gas para envio)
        SUPPORTED_NETWORKS = ['polygon', 'ethereum', 'bsc', 'base', 'bitcoin', 'litecoin', 'dogecoin']
        
        # Determinar a rede a ser usada
        symbol = invoice.crypto_currency.upper()
        selected_network = network or invoice.crypto_network or self._get_default_network(symbol)
        
        # Validar se a rede é suportada
        if selected_network.lower() not in SUPPORTED_NETWORKS:
            logger.warning(f"⚠️ WolkPay: Rede {selected_network} não suportada, usando rede padrão para {symbol}")
            selected_network = self._get_default_network(symbol)
        
        # Buscar endereço do beneficiário para a rede
        beneficiary_address = self.db.query(Address).filter(
            Address.wallet_id == beneficiary_wallet.id,
            Address.network.ilike(f"%{selected_network}%")
        ).first()
        
        if not beneficiary_address:
            raise ValueError(f"Endereço do beneficiário não encontrado para a rede {selected_network}")
        
        wallet_address = beneficiary_address.address
        crypto_tx_hash = None
        explorer_url = None
        
        # 5. Calcular valor LÍQUIDO de crypto a enviar (descontando taxas se fee_payer=BENEFICIARY)
        # IMPORTANTE: Sempre enviamos o valor líquido, não o bruto!
        from app.models.wolkpay import FeePayer
        
        if invoice.fee_payer == FeePayer.PAYER:
            # Pagador paga as taxas: beneficiário recebe o valor cheio de crypto
            crypto_to_send = invoice.crypto_amount
            logger.info(f"💰 WolkPay: Fee payer = PAYER, beneficiário recebe valor cheio: {crypto_to_send}")
        else:
            # Beneficiário paga as taxas (padrão): precisamos descontar
            # PRIORIDADE 1: Usar campo beneficiary_receives_crypto se disponível (mais preciso)
            if invoice.beneficiary_receives_crypto:
                crypto_to_send = invoice.beneficiary_receives_crypto
                logger.info(f"💰 WolkPay: Fee payer = BENEFICIARY, usando beneficiary_receives_crypto: {crypto_to_send} (bruto era {invoice.crypto_amount})")
            # PRIORIDADE 2: Calcular a partir de beneficiary_receives_brl
            elif invoice.beneficiary_receives_brl and invoice.usd_rate and invoice.brl_rate:
                # beneficiary_receives_brl = crypto_to_send * usd_rate * brl_rate
                # crypto_to_send = beneficiary_receives_brl / (usd_rate * brl_rate)
                crypto_to_send = invoice.beneficiary_receives_brl / (invoice.usd_rate * invoice.brl_rate)
                logger.info(f"💰 WolkPay: Fee payer = BENEFICIARY, valor líquido calculado de BRL: {crypto_to_send} (bruto era {invoice.crypto_amount})")
            else:
                # FALLBACK: calcula usando percentuais de taxa
                total_fee_percent = (invoice.service_fee_percent or Decimal('3.65')) + (invoice.network_fee_percent or Decimal('0.15'))
                crypto_to_send = invoice.crypto_amount * (1 - total_fee_percent / 100)
                logger.info(f"💰 WolkPay: Fee payer = BENEFICIARY (fallback), desconto de {total_fee_percent}%: {crypto_to_send}")
        
        # 6. Enviar crypto usando multi_chain_service
        try:
            from app.services.multi_chain_service import multi_chain_service
            from app.models.instant_trade import TradeStatus
            
            # Criar um objeto similar ao InstantTrade para compatibilidade
            # O multi_chain_service espera um trade, então criamos uma estrutura compatível
            class WolkPayTradeAdapter:
                """Adapter para compatibilidade com multi_chain_service"""
                def __init__(self, invoice, wallet_addr, network, crypto_amount_to_send):
                    self.id = invoice.id
                    self.user_id = invoice.beneficiary_id
                    self.symbol = invoice.crypto_currency.upper()
                    # CORRIGIDO: Usar o valor líquido calculado, não o bruto!
                    self.crypto_amount = crypto_amount_to_send
                    self.wallet_address = wallet_addr
                    self.network = network
                    self.reference_code = invoice.invoice_number
                    # Atributos necessários para blockchain_deposit_service
                    self.status = TradeStatus.PAYMENT_CONFIRMED  # Simula status confirmado
                    self.tx_hash = None  # Será preenchido após envio
            
            trade_adapter = WolkPayTradeAdapter(invoice, wallet_address, selected_network, crypto_to_send)
            
            logger.info(f"🚀 WolkPay: Enviando {crypto_to_send} {symbol} (líquido) para {wallet_address} via {selected_network}")
            
            try:
                result = await multi_chain_service.send_crypto(
                    db=self.db,
                    trade=trade_adapter,
                    network=selected_network
                )
                
                if result.success:
                    crypto_tx_hash = result.tx_hash
                    explorer_url = result.explorer_url
                    logger.info(f"✅ WolkPay: Crypto enviada! TX: {crypto_tx_hash}")
                else:
                    error_msg = result.error or "Erro desconhecido no envio"
                    logger.error(f"❌ WolkPay: Erro ao enviar crypto: {error_msg}")
                    raise ValueError(f"Erro ao enviar crypto: {error_msg}")
            except Exception as send_error:
                # Verifica se a transação foi enviada mesmo com erro de commit
                # O blockchain_deposit_service atualiza trade_adapter.tx_hash após envio bem-sucedido
                if trade_adapter.tx_hash and trade_adapter.tx_hash.startswith('0x'):
                    crypto_tx_hash = trade_adapter.tx_hash
                    logger.info(f"✅ WolkPay: Crypto enviada (recuperado do adapter)! TX: {crypto_tx_hash}")
                else:
                    raise send_error
                
        except ImportError:
            # Fallback se multi_chain_service não estiver disponível
            logger.warning(f"⚠️ WolkPay: multi_chain_service não disponível, marcando para envio manual")
            crypto_tx_hash = f"pending_manual_send_{invoice.invoice_number}"
            
        except Exception as e:
            logger.error(f"WolkPay: Erro ao enviar crypto: {e}")
            raise ValueError(f"Erro ao enviar crypto: {e}")
        
        # 6. Criar registro de aprovação
        approval = WolkPayApproval(
            invoice_id=invoice_id,
            approved_by=admin_id,
            action=ApprovalAction.APPROVED,
            crypto_tx_hash=crypto_tx_hash,
            crypto_network=selected_network,
            wallet_address=wallet_address,
            notes=notes
        )
        self.db.add(approval)
        
        # 7. Atualizar status E salvar dados da transação na invoice
        invoice.status = InvoiceStatus.COMPLETED
        invoice.crypto_tx_hash = crypto_tx_hash
        invoice.crypto_tx_network = selected_network
        invoice.crypto_wallet_address = wallet_address
        invoice.crypto_sent_at = datetime.now(timezone.utc)
        invoice.crypto_explorer_url = explorer_url
        
        # 8. Registrar taxas na contabilidade (para aparecer em /admin/fees)
        await self._register_accounting_entries(invoice, admin_id)
        
        # 9. Atualizar limite do pagador
        doc_type = "CPF" if payer.person_type == PersonType.PF else "CNPJ"
        doc_number = ''.join(filter(str.isdigit, payer.cpf if payer.person_type == PersonType.PF else payer.cnpj))
        await self.update_payer_limit(doc_type, doc_number, invoice.total_amount_brl)
        
        self.db.commit()
        self.db.refresh(approval)
        
        # 10. Log de auditoria
        self._log_audit(
            invoice_id=invoice_id,
            actor_type="admin",
            actor_id=admin_id,
            action="approve_invoice",
            description=f"Fatura aprovada. TX: {crypto_tx_hash}, Rede: {selected_network}, Destino: {wallet_address}"
        )
        
        # 📧 SEND NOTIFICATION: Invoice paid/completed
        try:
            fire_and_forget(notify_invoice_paid(
                db=self.db,
                merchant_user_id=str(invoice.beneficiary_id),
                invoice_id=str(invoice.id),
                amount=float(invoice.total_amount_brl),
                cryptocurrency=invoice.crypto_currency,
                payer_name=payer.name if payer else "Cliente"
            ))
        except Exception as notif_error:
            logger.warning(f"Failed to send invoice paid notification: {notif_error}")
        
        # TODO: Enviar e-mail para beneficiário e pagador
        
        logger.info(f"WolkPay: Fatura {invoice.invoice_number} aprovada por admin {admin_id}")
        
        return approval
    
    async def _register_accounting_entries(self, invoice: WolkPayInvoice, admin_id: str):
        """
        Registra as taxas da fatura WolkPay na contabilidade.
        Isso faz com que apareçam em /admin/fees
        """
        from app.models.accounting import AccountingEntry
        
        try:
            now = datetime.now(timezone.utc)
            
            # Registrar taxa de serviço (3.65%)
            if invoice.service_fee_brl and float(invoice.service_fee_brl) > 0:
                service_entry = AccountingEntry(
                    trade_id=None,  # WolkPay não tem trade_id direto
                    reference_code=invoice.invoice_number,
                    entry_type="platform_fee",  # Tipo genérico de taxa da plataforma
                    amount=invoice.service_fee_brl,
                    currency="BRL",
                    percentage=invoice.service_fee_percent,
                    base_amount=invoice.base_amount_brl,
                    description=f"Taxa de serviço WolkPay ({invoice.service_fee_percent}%) - Fatura {invoice.invoice_number}",
                    status="processed",
                    user_id=invoice.beneficiary_id,
                    created_by=admin_id,
                    created_at=now
                )
                self.db.add(service_entry)
                logger.info(f"💰 WolkPay: Taxa de serviço registrada: R$ {invoice.service_fee_brl}")
            
            # Registrar taxa de rede (0.15%)
            if invoice.network_fee_brl and float(invoice.network_fee_brl) > 0:
                network_entry = AccountingEntry(
                    trade_id=None,
                    reference_code=invoice.invoice_number,
                    entry_type="network_fee",
                    amount=invoice.network_fee_brl,
                    currency="BRL",
                    percentage=invoice.network_fee_percent,
                    base_amount=invoice.base_amount_brl,
                    description=f"Taxa de rede WolkPay ({invoice.network_fee_percent}%) - Fatura {invoice.invoice_number}",
                    status="processed",
                    user_id=invoice.beneficiary_id,
                    created_by=admin_id,
                    created_at=now
                )
                self.db.add(network_entry)
                logger.info(f"💰 WolkPay: Taxa de rede registrada: R$ {invoice.network_fee_brl}")
            
            logger.info(f"✅ WolkPay: Taxas registradas na contabilidade para fatura {invoice.invoice_number}")
            
        except Exception as e:
            logger.error(f"❌ WolkPay: Erro ao registrar taxas na contabilidade: {e}")
            # Não lança exceção para não impedir a aprovação
    
    def _get_default_network(self, symbol: str) -> str:
        """
        Retorna a rede padrão para um símbolo
        
        IMPORTANTE: Apenas redes onde o sistema tem funds para gas
        """
        symbol_networks = {
            # Redes nativas
            'BTC': 'bitcoin',
            'LTC': 'litecoin', 
            'DOGE': 'dogecoin',
            # EVM
            'ETH': 'ethereum',
            'MATIC': 'polygon',
            'POL': 'polygon',
            'BNB': 'bsc',
            # Stablecoins - Polygon como default (gas mais barato)
            'USDT': 'polygon',
            'USDC': 'polygon',
        }
        return symbol_networks.get(symbol.upper(), 'polygon')
    
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
        Lista faturas do beneficiário.
        Verifica e atualiza faturas expiradas automaticamente.
        Suporta múltiplos status separados por vírgula (ex: "PENDING,AWAITING_PAYMENT")
        """
        query = self.db.query(WolkPayInvoice).filter(
            WolkPayInvoice.beneficiary_id == user_id
        )
        
        if status:
            # Suporta múltiplos status separados por vírgula
            status_list = [s.strip() for s in status.split(',')]
            if len(status_list) == 1:
                query = query.filter(WolkPayInvoice.status == status_list[0])
            else:
                query = query.filter(WolkPayInvoice.status.in_(status_list))
        
        total = query.count()
        
        invoices = query.order_by(
            WolkPayInvoice.created_at.desc()
        ).offset((page - 1) * per_page).limit(per_page).all()
        
        # Verificar e marcar faturas expiradas
        for invoice in invoices:
            if invoice.is_expired() and invoice.status in [InvoiceStatus.PENDING, InvoiceStatus.AWAITING_PAYMENT]:
                invoice.status = InvoiceStatus.EXPIRED
                self.db.add(invoice)
        
        self.db.commit()
        
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
        Gera código PIX estático (copia e cola) no padrão EMV do Banco Central
        
        Estrutura EMV PIX (BR Code):
        - 00: Payload Format Indicator (fixo "01")
        - 26: Merchant Account Information (PIX)
          - 00: GUI (br.gov.bcb.pix) - MINÚSCULAS conforme padrão BACEN
          - 01: Chave PIX (CNPJ)
        - 52: Merchant Category Code (0000 = não informado)
        - 53: Transaction Currency (986 = BRL)
        - 54: Transaction Amount
        - 58: Country Code (BR)
        - 59: Merchant Name
        - 60: Merchant City
        - 62: Additional Data Field Template
          - 05: Reference Label (txid)
        - 63: CRC16
        """
        import re
        import unicodedata
        
        def _normalize_text(text: str) -> str:
            """Remove acentos e caracteres especiais"""
            nfkd = unicodedata.normalize('NFKD', text)
            ascii_text = nfkd.encode('ASCII', 'ignore').decode('ASCII')
            clean_text = re.sub(r'[^A-Za-z0-9 ]', '', ascii_text)
            return clean_text.upper()[:25]
        
        def _format_tlv(tag: str, value: str) -> str:
            """Formata um campo TLV (Tag-Length-Value)"""
            length = str(len(value)).zfill(2)
            return f"{tag}{length}{value}"
        
        def _calculate_crc16(payload: str) -> str:
            """
            Calcula CRC16-CCITT-FALSE (padrão EMV/BR Code)
            Polinômio: 0x1021
            Valor inicial: 0xFFFF
            """
            crc = 0xFFFF
            
            for char in payload:
                crc ^= ord(char) << 8
                for _ in range(8):
                    if crc & 0x8000:
                        crc = (crc << 1) ^ 0x1021
                    else:
                        crc = crc << 1
                    crc &= 0xFFFF
            
            return format(crc, '04X')
        
        # 1. Payload Format Indicator (fixo "01")
        pfi = _format_tlv("00", "01")
        
        # 2. Merchant Account Information (PIX) - ID 26
        # GUI do PIX - MINÚSCULAS conforme padrão oficial BACEN
        gui = _format_tlv("00", "br.gov.bcb.pix")
        # Chave PIX (CNPJ sem pontuação - apenas números)
        pix_key_clean = re.sub(r'\D', '', self.PIX_KEY)
        pix_key = _format_tlv("01", pix_key_clean)
        # Merchant Account completo
        mai_content = gui + pix_key
        mai = _format_tlv("26", mai_content)
        
        # 3. Merchant Category Code (0000 = não informado)
        mcc = _format_tlv("52", "0000")
        
        # 4. Transaction Currency (986 = BRL)
        currency = _format_tlv("53", "986")
        
        # 5. Transaction Amount (com 2 casas decimais)
        amount_str = f"{float(amount):.2f}"
        transaction_amount = _format_tlv("54", amount_str)
        
        # 6. Country Code (BR)
        country = _format_tlv("58", "BR")
        
        # 7. Merchant Name (máx 25 caracteres, sem acentos, uppercase)
        # Este nome aparece nos apps de banco como beneficiário
        merchant_name = _normalize_text("HOLD DIGITAL WOLKPAY")[:25]
        name_field = _format_tlv("59", merchant_name)
        
        # 8. Merchant City (máx 15 caracteres, sem acentos, uppercase)
        city = _normalize_text("BRASILIA")[:15]
        city_field = _format_tlv("60", city)
        
        # 9. Additional Data Field Template - ID 62
        # Reference Label (txid) - este é o identificador que alguns bancos mostram
        # Formato: Número da fatura (ex: WP2026011100001)
        txid = re.sub(r'[^A-Za-z0-9]', '', description)[:25].upper()
        if not txid:
            txid = "***"  # Placeholder se vazio
        reference = _format_tlv("05", txid)
        additional_data = _format_tlv("62", reference)
        
        # 10. Montar payload sem CRC
        payload_without_crc = (
            pfi + mai + mcc + currency + transaction_amount + 
            country + name_field + city_field + additional_data
        )
        
        # 11. Adicionar tag do CRC (63) com tamanho 04
        payload_for_crc = payload_without_crc + "6304"
        
        # 12. Calcular CRC16
        crc = _calculate_crc16(payload_for_crc)
        
        # 13. Payload final
        final_payload = payload_for_crc + crc
        
        logger.info("PIX EMV gerado com sucesso - Chave: %s", pix_key_clean)
        logger.debug("PIX EMV payload: %s", final_payload)
        
        return final_payload
    
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
            raise ValueError(eligibility.get("reason", "Não elegível para conversão"))
        
        # 2. Buscar dados do pagador
        invoice = self.db.query(WolkPayInvoice).filter(
            WolkPayInvoice.checkout_token == checkout_token
        ).first()
        
        if not invoice:
            raise ValueError("Fatura não encontrada")
        
        payer = self.db.query(WolkPayPayer).filter(
            WolkPayPayer.invoice_id == invoice.id
        ).first()
        
        if not payer:
            raise ValueError("Dados do pagador não encontrados. Complete o formulário de checkout primeiro.")
        
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
