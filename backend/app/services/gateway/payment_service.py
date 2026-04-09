"""
💳 WolkPay Gateway - Payment Service
=====================================

Criação e processamento de pagamentos PIX e Crypto.

Features:
- Criação de pagamentos PIX (via BB API)
- Criação de pagamentos Crypto (derivação HD)
- Verificação de status
- Processamento de confirmações
- Expiração automática

Author: HOLD Wallet Team
Date: January 2026
"""

import logging
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

from app.models.gateway import (
    GatewayPayment,
    GatewayPaymentStatus,
    GatewayPaymentMethod,
    GatewayMerchant,
    MerchantStatus,
    GatewayApiKey,
    GatewaySettings,
    GatewayAuditLog,
    GatewayAuditAction
)
from app.schemas.gateway import PaymentCreate, PaymentFilterParams

logger = logging.getLogger(__name__)


class GatewayPaymentService:
    """
    Serviço para criação e gerenciamento de pagamentos no Gateway
    """
    
    # Taxas padrão (podem ser sobrescritas por GatewaySettings)
    DEFAULT_PIX_FEE_PERCENT = Decimal('3.50')
    DEFAULT_CRYPTO_FEE_PERCENT = Decimal('2.50')
    DEFAULT_NETWORK_FEE_PERCENT = Decimal('0.50')
    
    # Confirmações mínimas por rede
    REQUIRED_CONFIRMATIONS = {
        "bitcoin": 2,
        "ethereum": 12,
        "polygon": 30,
        "bsc": 15,
        "litecoin": 6,
        "solana": 32
    }
    
    def __init__(self, db: Session):
        self.db = db
        self._settings_cache: Dict[str, Any] = {}
    
    # ===================================
    # SETTINGS
    # ===================================
    
    def _get_setting(self, key: str, default: Any = None) -> Any:
        """Obtém configuração do gateway"""
        if key in self._settings_cache:
            return self._settings_cache[key]
        
        setting = self.db.query(GatewaySettings).filter(
            GatewaySettings.key == key
        ).first()
        
        if setting:
            self._settings_cache[key] = setting.value
            return setting.value
        
        return default
    
    def _get_fee_percent(self, method: GatewayPaymentMethod, merchant: GatewayMerchant) -> Decimal:
        """Calcula taxa aplicável"""
        # Taxa customizada do merchant tem prioridade
        if merchant.custom_fee_percent:
            return merchant.custom_fee_percent
        
        # Taxa padrão do sistema
        if method == GatewayPaymentMethod.PIX:
            return Decimal(self._get_setting(
                'gateway.pix_fee_percent',
                str(self.DEFAULT_PIX_FEE_PERCENT)
            ))
        else:
            return Decimal(self._get_setting(
                'gateway.crypto_fee_percent',
                str(self.DEFAULT_CRYPTO_FEE_PERCENT)
            ))
    
    # ===================================
    # PAYMENT CREATION
    # ===================================
    
    async def create_payment(
        self,
        merchant_id: str,
        data: PaymentCreate,
        api_key_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> GatewayPayment:
        """
        Cria um novo pagamento
        
        Para PIX: Cria cobrança no Banco do Brasil
        Para Crypto: Deriva endereço único HD
        """
        # Validar merchant
        merchant = self.db.query(GatewayMerchant).filter(
            GatewayMerchant.id == merchant_id
        ).first()
        
        if not merchant:
            raise ValueError("Merchant não encontrado")
        
        if merchant.status != MerchantStatus.ACTIVE:
            raise ValueError("Merchant não está ativo")
        
        # Validar limites
        if data.amount < merchant.min_payment_brl:
            raise ValueError(f"Valor mínimo: R$ {merchant.min_payment_brl}")
        
        if data.amount > merchant.max_payment_brl:
            raise ValueError(f"Valor máximo: R$ {merchant.max_payment_brl}")
        
        # Verificar limite diário
        can_process, remaining = await self._check_daily_limit(merchant_id, data.amount)
        if not can_process:
            raise ValueError(f"Limite diário excedido. Disponível: R$ {remaining}")
        
        # Calcular taxas
        fee_percent = self._get_fee_percent(
            GatewayPaymentMethod(data.payment_method.value.upper()),
            merchant
        )
        fee_amount = data.amount * fee_percent / 100
        settlement_amount = data.amount - fee_amount
        
        # Gerar IDs
        payment_id = GatewayPayment.generate_payment_id()
        checkout_token = GatewayPayment.generate_checkout_token()
        
        # Data de expiração
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=data.expiration_minutes)
        
        # Obter índices HD
        hd_merchant_index = merchant.hd_index
        hd_payment_index = merchant.get_next_payment_index()
        
        # Criar payment
        payment = GatewayPayment(
            payment_id=payment_id,
            external_id=data.external_id,
            merchant_id=merchant_id,
            api_key_id=api_key_id,
            payment_method=GatewayPaymentMethod(data.payment_method.value.upper()),
            amount_requested=data.amount,
            currency_requested=data.currency,
            fee_percent=fee_percent,
            fee_amount=fee_amount,
            settlement_amount=settlement_amount,
            settlement_currency=merchant.settlement_currency.value,
            expires_at=expires_at,
            customer_email=data.customer_email,
            customer_name=data.customer_name,
            customer_phone=data.customer_phone,
            customer_document=data.customer_document,
            success_url=data.success_url,
            cancel_url=data.cancel_url,
            checkout_token=checkout_token,
            checkout_url=f"https://gateway.wolknow.com/pay/{checkout_token}",
            description=data.description,
            extra_data=data.extra_data,
            ip_address=ip_address,
            user_agent=user_agent,
            hd_merchant_index=hd_merchant_index,
            hd_payment_index=hd_payment_index,
            status=GatewayPaymentStatus.PENDING
        )
        
        self.db.add(payment)
        self.db.flush()
        
        # Processar método específico
        if payment.payment_method == GatewayPaymentMethod.PIX:
            await self._process_pix_payment(payment, merchant, data)
        else:
            await self._process_crypto_payment(payment, merchant, data)
        
        # Auditoria
        audit_log = GatewayAuditLog(
            merchant_id=merchant_id,
            payment_id=payment.id,
            api_key_id=api_key_id,
            actor_type="api",
            action=GatewayAuditAction.PAYMENT_CREATED,
            description=f"Pagamento {payment_id} criado - {payment.payment_method.value}",
            new_data={
                "payment_id": payment_id,
                "method": payment.payment_method.value,
                "amount": str(data.amount),
                "currency": data.currency
            },
            ip_address=ip_address
        )
        self.db.add(audit_log)
        
        self.db.commit()
        self.db.refresh(payment)
        
        logger.info(f"💳 Pagamento criado: {payment_id} - {payment.payment_method.value} - R$ {data.amount}")
        
        return payment
    
    async def _process_pix_payment(
        self,
        payment: GatewayPayment,
        merchant: GatewayMerchant,
        data: PaymentCreate
    ):
        """Processa pagamento PIX via Banco do Brasil"""
        from app.services.banco_brasil_service import BancoBrasilAPIService
        from app.core.config import settings
        
        # TXID para o BB (máx 35 chars alfanumérico)
        txid = f"WKGW{payment.payment_id.replace('-', '')}"
        
        payment.pix_txid = txid
        
        try:
            bb_service = BancoBrasilAPIService()
            
            # Dados do devedor (se disponíveis)
            devedor_cpf = None
            devedor_nome = None
            
            if data.customer_document:
                doc_clean = ''.join(c for c in data.customer_document if c.isdigit())
                if len(doc_clean) == 11:
                    devedor_cpf = doc_clean
                    devedor_nome = data.customer_name or "Cliente"
            
            # Criar cobrança no BB
            bb_response = await bb_service.criar_cobranca_pix(
                txid=txid,
                valor=payment.amount_requested,
                descricao=data.description or f"Pagamento {payment.payment_id}",
                expiracao_segundos=data.expiration_minutes * 60,
                devedor_cpf=devedor_cpf,
                devedor_nome=devedor_nome,
                info_adicionais={
                    "merchant": merchant.merchant_code,
                    "payment": payment.payment_id
                }
            )
            
            # Salvar dados do PIX
            payment.pix_txid = bb_response.get('txid', txid)
            payment.pix_qrcode = bb_response.get('qrcode', '')
            payment.pix_qrcode_image = bb_response.get('qrcode_base64', '')
            payment.pix_emv = bb_response.get('location', '')
            payment.pix_key = settings.BB_PIX_KEY
            
            logger.info(f"✅ PIX criado no BB: {payment.pix_txid}")
            
        except Exception as e:
            logger.error(f"❌ Erro ao criar PIX no BB: {str(e)}")
            # Não falha o pagamento, mas registra o erro
            payment.extra_data = payment.extra_data or {}
            payment.extra_data['bb_error'] = str(e)
    
    async def _process_crypto_payment(
        self,
        payment: GatewayPayment,
        merchant: GatewayMerchant,
        data: PaymentCreate
    ):
        """Processa pagamento Crypto com derivação HD"""
        from app.services.price_service import PriceService
        
        payment.crypto_currency = data.crypto_currency
        payment.crypto_network = data.crypto_network or self._get_default_network(data.crypto_currency)
        
        # Derivation path: m/44'/coin'/1000'/merchant_index/payment_index
        coin_type = self._get_coin_type(payment.crypto_currency)
        payment.hd_derivation_path = f"m/44'/{coin_type}'/1000'/{merchant.hd_index}/{payment.hd_payment_index}"
        
        # Derivar endereço único via HD wallet
        payment.crypto_address = await self._derive_payment_address(
            currency=payment.crypto_currency,
            network=payment.crypto_network,
            derivation_path=payment.hd_derivation_path,
            merchant_hd_index=merchant.hd_index,
            payment_hd_index=payment.hd_payment_index
        )
        
        # Calcular quantidade em crypto
        try:
            price_service = PriceService(self.db)
            crypto_price = await price_service.get_price(payment.crypto_currency)
            
            if crypto_price and crypto_price > 0:
                # Converter BRL para crypto
                payment.usd_rate = Decimal(str(crypto_price))
                payment.brl_rate = Decimal(self._get_setting('gateway.brl_usd_rate', '5.00'))
                
                amount_usd = payment.amount_requested / payment.brl_rate
                payment.crypto_amount = amount_usd / payment.usd_rate
                payment.exchange_rate = payment.usd_rate * payment.brl_rate
        except Exception as e:
            logger.error(f"❌ Erro ao obter cotação: {str(e)}")
        
        # Confirmações necessárias
        payment.crypto_required_confirmations = self.REQUIRED_CONFIRMATIONS.get(
            payment.crypto_network.lower() if payment.crypto_network else "ethereum",
            12
        )
        
        logger.info(f"✅ Crypto address: {payment.crypto_address} ({payment.crypto_currency})")
    
    def _get_default_network(self, currency: str) -> str:
        """Retorna rede padrão para a moeda"""
        networks = {
            "BTC": "bitcoin",
            "ETH": "ethereum",
            "USDT": "polygon",  # USDT mais barato na Polygon
            "USDC": "polygon",
            "MATIC": "polygon",
            "BNB": "bsc",
            "SOL": "solana",
            "DOGE": "bitcoin",
            "LTC": "litecoin"
        }
        return networks.get(currency.upper(), "ethereum")
    
    def _get_coin_type(self, currency: str) -> int:
        """Retorna coin type BIP44 para a moeda"""
        coin_types = {
            "BTC": 0,
            "LTC": 2,
            "DOGE": 3,
            "ETH": 60,
            "SOL": 501,
            "MATIC": 60,  # EVM compatible
            "USDT": 60,
            "USDC": 60,
            "BNB": 60
        }
        return coin_types.get(currency.upper(), 60)
    
    async def _derive_payment_address(
        self,
        currency: str,
        network: str,
        derivation_path: str,
        merchant_hd_index: int = 0,
        payment_hd_index: int = 0
    ) -> str:
        """
        Deriva endereço único para o pagamento usando HD wallet.
        
        Se GATEWAY_MASTER_MNEMONIC estiver configurada, gera endereço único
        via derivação BIP32/BIP44. Caso contrário, usa endereços fixos da plataforma.
        
        Args:
            currency: Moeda (BTC, ETH, etc)
            network: Rede (bitcoin, ethereum, polygon, etc)
            derivation_path: Path HD completo
            merchant_hd_index: Índice HD do merchant
            payment_hd_index: Índice HD do pagamento
            
        Returns:
            Endereço crypto para recebimento
        """
        from app.core.config import settings
        from app.services.gateway.hd_wallet_service import get_gateway_hd_wallet
        
        # Tentar derivação HD
        hd_wallet = get_gateway_hd_wallet()
        
        if hd_wallet.is_initialized:
            address, _ = hd_wallet.derive_address(
                currency=currency,
                network=network,
                merchant_index=merchant_hd_index,
                payment_index=payment_hd_index
            )
            
            if address:
                logger.info(f"✅ Endereço HD derivado: {address[:10]}...{address[-6:]} (path: {derivation_path})")
                return address
            
            logger.warning("⚠️ Falha na derivação HD, usando endereço fixo")
        
        # Fallback: usar endereços fixos da plataforma
        logger.info("ℹ️ Usando endereço fixo da plataforma (GATEWAY_MASTER_MNEMONIC não configurada)")
        
        if currency.upper() == "BTC":
            return getattr(settings, 'PLATFORM_BTC_ADDRESS', 
                          '1JnwPXAtGHDJxNbd3QwrhSCqWYpqq4Lmcb')
        else:
            return getattr(settings, 'PLATFORM_WALLET_ADDRESS',
                          '0xc3F6487656E9D7BD1148D997A9EeDD703435A1B7')
    
    # ===================================
    # PAYMENT STATUS
    # ===================================
    
    async def get_payment_by_id(self, payment_id: str) -> Optional[GatewayPayment]:
        """Busca pagamento por ID"""
        return self.db.query(GatewayPayment).filter(
            GatewayPayment.payment_id == payment_id
        ).first()
    
    async def get_payment_by_checkout_token(self, token: str) -> Optional[GatewayPayment]:
        """Busca pagamento por checkout token"""
        return self.db.query(GatewayPayment).filter(
            GatewayPayment.checkout_token == token
        ).first()
    
    async def get_payment_by_pix_txid(self, txid: str) -> Optional[GatewayPayment]:
        """Busca pagamento por PIX TXID"""
        return self.db.query(GatewayPayment).filter(
            GatewayPayment.pix_txid == txid
        ).first()
    
    async def get_payment_by_crypto_address(self, address: str) -> Optional[GatewayPayment]:
        """Busca pagamento por endereço crypto"""
        return self.db.query(GatewayPayment).filter(
            and_(
                GatewayPayment.crypto_address == address,
                GatewayPayment.status.in_([
                    GatewayPaymentStatus.PENDING,
                    GatewayPaymentStatus.PROCESSING
                ])
            )
        ).first()
    
    # ===================================
    # PAYMENT CONFIRMATION
    # ===================================
    
    async def confirm_pix_payment(
        self,
        txid: str,
        valor_recebido: Decimal,
        horario: datetime,
        end_to_end_id: Optional[str] = None
    ) -> Optional[GatewayPayment]:
        """
        Confirma pagamento PIX recebido
        
        Chamado quando webhook do BB notifica pagamento
        """
        payment = await self.get_payment_by_pix_txid(txid)
        
        if not payment:
            logger.warning(f"❌ Pagamento não encontrado para TXID: {txid}")
            return None
        
        if payment.status not in [GatewayPaymentStatus.PENDING, GatewayPaymentStatus.PROCESSING]:
            logger.warning(f"⚠️ Pagamento {payment.payment_id} já processado: {payment.status}")
            return payment
        
        # Atualizar
        payment.amount_received = valor_recebido
        payment.status = GatewayPaymentStatus.CONFIRMED
        payment.confirmed_at = horario or datetime.now(timezone.utc)
        
        if end_to_end_id:
            payment.extra_data = payment.extra_data or {}
            payment.extra_data['pix_end_to_end_id'] = end_to_end_id
        
        # Auditoria
        audit_log = GatewayAuditLog(
            merchant_id=payment.merchant_id,
            payment_id=payment.id,
            actor_type="system",
            action=GatewayAuditAction.PAYMENT_CONFIRMED,
            description=f"Pagamento PIX confirmado: R$ {valor_recebido}",
            new_data={
                "valor_recebido": str(valor_recebido),
                "txid": txid,
                "end_to_end_id": end_to_end_id
            }
        )
        self.db.add(audit_log)
        
        self.db.commit()
        self.db.refresh(payment)
        
        logger.info(f"✅ PIX confirmado: {payment.payment_id} - R$ {valor_recebido}")
        
        # Disparar webhook
        await self._trigger_webhook(payment, "payment.confirmed")
        
        # Auto-completar se settlement imediato
        await self._auto_complete_payment(payment)
        
        return payment
    
    async def confirm_crypto_payment(
        self,
        address: str,
        amount: Decimal,
        tx_hash: str,
        confirmations: int
    ) -> Optional[GatewayPayment]:
        """
        Confirma/atualiza pagamento crypto
        
        Chamado quando blockchain watcher detecta transação
        """
        payment = await self.get_payment_by_crypto_address(address)
        
        if not payment:
            logger.warning(f"❌ Pagamento não encontrado para address: {address}")
            return None
        
        # Atualizar confirmações
        payment.crypto_tx_hash = tx_hash
        payment.crypto_confirmations = confirmations
        payment.crypto_amount_received = amount
        
        # Verificar se tem confirmações suficientes
        if confirmations >= payment.crypto_required_confirmations:
            if payment.status == GatewayPaymentStatus.PENDING:
                payment.status = GatewayPaymentStatus.PROCESSING
            
            if payment.status == GatewayPaymentStatus.PROCESSING:
                # Verificar se valor está correto (tolerância de 1%)
                expected = payment.crypto_amount or Decimal('0')
                tolerance = expected * Decimal('0.01')
                
                if amount >= (expected - tolerance):
                    payment.status = GatewayPaymentStatus.CONFIRMED
                    payment.confirmed_at = datetime.now(timezone.utc)
                    payment.amount_received = self._convert_crypto_to_brl(
                        amount, payment.usd_rate, payment.brl_rate
                    )
                    
                    logger.info(f"✅ Crypto confirmado: {payment.payment_id} - {amount} {payment.crypto_currency}")
                    
                    # Disparar webhook
                    await self._trigger_webhook(payment, "payment.confirmed")
                    
                    # Auto-completar
                    await self._auto_complete_payment(payment)
                else:
                    logger.warning(f"⚠️ Valor insuficiente: esperado {expected}, recebido {amount}")
        
        self.db.commit()
        self.db.refresh(payment)
        
        return payment
    
    async def _auto_complete_payment(self, payment: GatewayPayment):
        """Auto-completa pagamento após confirmação"""
        if payment.status != GatewayPaymentStatus.CONFIRMED:
            return
        
        # Se settlement é em BRL (PIX), marcar como pending
        # Se settlement é em crypto, pode ser automático
        
        payment.status = GatewayPaymentStatus.COMPLETED
        payment.completed_at = datetime.now(timezone.utc)
        payment.settlement_status = "pending"
        
        # Auditoria
        audit_log = GatewayAuditLog(
            merchant_id=payment.merchant_id,
            payment_id=payment.id,
            actor_type="system",
            action=GatewayAuditAction.PAYMENT_COMPLETED,
            description=f"Pagamento completado automaticamente",
            new_data={
                "settlement_amount": str(payment.settlement_amount),
                "settlement_currency": payment.settlement_currency
            }
        )
        self.db.add(audit_log)
        
        self.db.commit()
        
        logger.info(f"✅ Pagamento completado: {payment.payment_id}")
        
        # Disparar webhook
        await self._trigger_webhook(payment, "payment.completed")
    
    def _convert_crypto_to_brl(
        self,
        amount: Decimal,
        usd_rate: Optional[Decimal],
        brl_rate: Optional[Decimal]
    ) -> Decimal:
        """Converte valor crypto para BRL"""
        if not usd_rate or not brl_rate:
            return Decimal('0')
        
        amount_usd = amount * usd_rate
        amount_brl = amount_usd * brl_rate
        return amount_brl
    
    # ===================================
    # EXPIRATION
    # ===================================
    
    async def expire_pending_payments(self) -> int:
        """
        Expira pagamentos pendentes que passaram do prazo
        
        Deve ser chamado periodicamente (cron/celery)
        
        Returns:
            int: Número de pagamentos expirados
        """
        now = datetime.now(timezone.utc)
        
        expired_payments = self.db.query(GatewayPayment).filter(
            and_(
                GatewayPayment.status == GatewayPaymentStatus.PENDING,
                GatewayPayment.expires_at < now
            )
        ).all()
        
        count = 0
        for payment in expired_payments:
            payment.status = GatewayPaymentStatus.EXPIRED
            count += 1
            
            # Disparar webhook
            await self._trigger_webhook(payment, "payment.expired")
            
            logger.info(f"⏰ Pagamento expirado: {payment.payment_id}")
        
        if count > 0:
            self.db.commit()
            logger.info(f"⏰ {count} pagamentos expirados")
        
        return count
    
    # ===================================
    # LISTING & SEARCH
    # ===================================
    
    async def list_payments(
        self,
        merchant_id: str,
        filters: Optional[PaymentFilterParams] = None,
        search: Optional[str] = None,
        page: int = 1,
        per_page: int = 20
    ) -> Tuple[List[GatewayPayment], int]:
        """
        Lista pagamentos do merchant com filtros
        """
        query = self.db.query(GatewayPayment).filter(
            GatewayPayment.merchant_id == merchant_id
        )
        
        # Busca textual
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    GatewayPayment.payment_id.ilike(search_term),
                    GatewayPayment.payment_code.ilike(search_term),
                    GatewayPayment.description.ilike(search_term),
                    GatewayPayment.customer_email.ilike(search_term),
                    GatewayPayment.customer_name.ilike(search_term),
                    GatewayPayment.external_id.ilike(search_term)
                )
            )
        
        if filters:
            if filters.status:
                query = query.filter(GatewayPayment.status == filters.status)
            if filters.payment_method:
                query = query.filter(GatewayPayment.payment_method == filters.payment_method)
            if filters.external_id:
                query = query.filter(GatewayPayment.external_id == filters.external_id)
            if filters.customer_email:
                query = query.filter(GatewayPayment.customer_email.ilike(f"%{filters.customer_email}%"))
            if filters.date_from:
                query = query.filter(GatewayPayment.created_at >= filters.date_from)
            if filters.date_to:
                query = query.filter(GatewayPayment.created_at <= filters.date_to)
            if filters.min_amount:
                query = query.filter(GatewayPayment.amount_requested >= filters.min_amount)
            if filters.max_amount:
                query = query.filter(GatewayPayment.amount_requested <= filters.max_amount)
        
        total = query.count()
        
        offset = (page - 1) * per_page
        payments = query.order_by(
            GatewayPayment.created_at.desc()
        ).offset(offset).limit(per_page).all()
        
        return payments, total
    
    # ===================================
    # HELPERS
    # ===================================
    
    async def _check_daily_limit(
        self,
        merchant_id: str,
        amount: Decimal
    ) -> Tuple[bool, Decimal]:
        """Verifica limite diário do merchant"""
        merchant = self.db.query(GatewayMerchant).filter(
            GatewayMerchant.id == merchant_id
        ).first()
        
        if not merchant:
            return False, Decimal('0')
        
        today_start = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        
        today_volume = self.db.query(
            func.sum(GatewayPayment.amount_requested)
        ).filter(
            and_(
                GatewayPayment.merchant_id == merchant_id,
                GatewayPayment.created_at >= today_start,
                GatewayPayment.status.in_([
                    GatewayPaymentStatus.PENDING,
                    GatewayPaymentStatus.PROCESSING,
                    GatewayPaymentStatus.CONFIRMED,
                    GatewayPaymentStatus.COMPLETED
                ])
            )
        ).scalar() or Decimal('0')
        
        remaining = merchant.daily_limit_brl - today_volume
        can_process = (today_volume + amount) <= merchant.daily_limit_brl
        
        return can_process, remaining
    
    async def _trigger_webhook(self, payment: GatewayPayment, event: str):
        """Dispara webhook para o merchant"""
        from app.services.gateway.webhook_service import WebhookService
        
        try:
            webhook_service = WebhookService(self.db)
            await webhook_service.create_webhook(
                payment_id=payment.id,
                merchant_id=payment.merchant_id,
                event=event
            )
        except Exception as e:
            logger.error(f"❌ Erro ao criar webhook: {str(e)}")
