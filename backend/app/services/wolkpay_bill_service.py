"""
🚀 WolkPay Bill Payment Service
================================

Serviço para pagamento de boletos usando crypto.

Fluxo:
1. Usuário escaneia/digita código de barras
2. Sistema valida boleto (aceita vencidos até 60 dias com multa/juros)
3. Sistema faz cotação (valor + taxas 5%)
4. Usuário confirma pagamento
5. Crypto é DEBITADA IMEDIATAMENTE da carteira
6. Empresa liquida os ativos (crypto → BRL)
7. Operador WolkNow paga o boleto
8. Comprovante enviado ao usuário

Taxas:
- Serviço: 4.75%
- Rede: 0.25%
- Total: 5.00%

Author: WOLK NOW Team
Date: Janeiro 2026
"""

import logging
import uuid
import json
from datetime import datetime, timezone, timedelta, date
from decimal import Decimal, ROUND_UP, ROUND_DOWN
from typing import Optional, Tuple, Dict, Any
from dataclasses import dataclass

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

from app.models.wolkpay import (
    WolkPayBillPayment, 
    WolkPayBillPaymentLog,
    BillPaymentStatus,
    BillType
)
from app.models.user import User
from app.schemas.wolkpay import (
    ValidateBillRequest,
    BillInfoResponse,
    QuoteBillPaymentRequest,
    BillPaymentQuoteResponse,
    ConfirmBillPaymentRequest,
    BillPaymentResponse,
    BillPaymentListResponse,
    BillTypeEnum,
    BillPaymentStatusEnum
)

# Importar serviços de preço e carteira
from app.services.price_aggregator import price_aggregator
from app.services.wallet_balance_service import WalletBalanceService
from app.services.bill_validation_service import bill_validation_service
from app.services.blockchain_withdraw_service import blockchain_withdraw_service
from app.services.platform_settings_service import platform_settings_service
from app.services.notifications import (
    notify_bill_payment_processing,
    notify_bill_payment_completed,
    notify_bill_payment_failed,
    fire_and_forget
)

logger = logging.getLogger(__name__)


# ============================================
# CONSTANTES (valores padrão - serão sobrescritos pelo banco)
# ============================================

# Taxas (padrão - carregadas do banco de dados em runtime)
SERVICE_FEE_PERCENT = Decimal('3.65')  # wolkpay_service_fee_percentage
NETWORK_FEE_PERCENT = Decimal('0.35')  # wolkpay_network_fee_percentage
TOTAL_FEE_PERCENT = Decimal('4.00')    # Calculado dinamicamente

# Validade da cotação (minutos) - wolkpay_expiry_minutes
QUOTE_VALIDITY_MINUTES = 15

# Mínimo de dias antes do vencimento
MIN_DAYS_BEFORE_DUE = 1

# Limites - wolkpay_min_brl e wolkpay_max_brl
MIN_BILL_AMOUNT = Decimal('100.00')
MAX_BILL_AMOUNT = Decimal('15000.00')

# Mapeamento de bancos pelo código
BANK_CODES = {
    '001': 'Banco do Brasil',
    '033': 'Santander',
    '104': 'Caixa Econômica Federal',
    '237': 'Bradesco',
    '341': 'Itaú',
    '356': 'Banco Real',
    '389': 'Mercantil do Brasil',
    '399': 'HSBC',
    '422': 'Safra',
    '453': 'Rural',
    '633': 'Rendimento',
    '652': 'Itaú Unibanco',
    '745': 'Citibank',
    '756': 'Sicoob',
}


@dataclass
class RequestContext:
    """
    Contexto da requisicao para auditoria
    
    Usado para capturar informacoes do cliente em todas as operacoes
    """
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    request_id: Optional[str] = None
    
    @classmethod
    def from_request(cls, request) -> 'RequestContext':
        """
        Cria contexto a partir de um objeto Request do FastAPI
        
        Args:
            request: FastAPI Request object
            
        Returns:
            RequestContext com dados extraidos
        """
        if request is None:
            return cls()
        
        # Obter IP (considera proxies)
        ip = None
        if hasattr(request, 'headers'):
            # X-Forwarded-For para proxies/load balancers
            forwarded_for = request.headers.get('x-forwarded-for')
            if forwarded_for:
                ip = forwarded_for.split(',')[0].strip()
            else:
                # X-Real-IP para nginx
                ip = request.headers.get('x-real-ip')
        
        if not ip and hasattr(request, 'client') and request.client:
            ip = request.client.host
        
        # User-Agent
        user_agent = None
        if hasattr(request, 'headers'):
            user_agent = request.headers.get('user-agent')
        
        # Request ID (pode vir do header ou gerar novo)
        request_id = None
        if hasattr(request, 'headers'):
            request_id = request.headers.get('x-request-id')
        if not request_id:
            request_id = str(uuid.uuid4())
        
        return cls(
            ip_address=ip,
            user_agent=user_agent,
            request_id=request_id
        )


class WolkPayBillService:
    """Serviço para pagamento de boletos com crypto"""
    
    def __init__(self, db: Session):
        self.db = db
    
    # ============================================
    # CONFIGURAÇÕES DO BANCO DE DADOS
    # ============================================
    
    def _get_bill_payment_settings(self) -> dict:
        """
        Busca configurações de Bill Payment do banco de dados.
        Retorna valores do platform_settings ou usa padrões.
        """
        return {
            "service_fee_percent": Decimal(str(platform_settings_service.get(
                self.db, "wolkpay_service_fee_percentage", 3.65
            ))),
            "network_fee_percent": Decimal(str(platform_settings_service.get(
                self.db, "wolkpay_network_fee_percentage", 0.35
            ))),
            "min_brl": Decimal(str(platform_settings_service.get(
                self.db, "wolkpay_min_brl", 100.0
            ))),
            "max_brl": Decimal(str(platform_settings_service.get(
                self.db, "wolkpay_max_brl", 15000.0
            ))),
            "expiry_minutes": int(platform_settings_service.get(
                self.db, "wolkpay_expiry_minutes", 15
            ))
        }
    
    # ============================================
    # 1. VALIDAR BOLETO
    # ============================================
    
    async def validate_bill(self, barcode: str) -> BillInfoResponse:
        """
        Valida um boleto pelo código de barras usando API externa
        
        Obtém informações REAIS:
        - Beneficiário (nome, CNPJ/CPF)
        - Valor original + multas/juros
        - Data de vencimento
        - Se pode ser liquidado pelo financeiro
        
        Regras:
        - Boleto vencido até 60 dias: PODE pagar (com multa/juros)
        - Boleto vencido há mais de 60 dias: consultar emissor
        """
        try:
            # Limpa código de barras
            clean_barcode = ''.join(filter(str.isdigit, barcode))
            
            # Valida tamanho
            if len(clean_barcode) < 44 or len(clean_barcode) > 48:
                return BillInfoResponse(
                    valid=False,
                    error_message="Código de barras inválido. Deve ter entre 44 e 48 dígitos.",
                    barcode=barcode,
                    bill_type=BillTypeEnum.BANK_SLIP,
                    original_amount_brl=Decimal('0'),
                    amount_brl=Decimal('0'),
                    due_date=date.today(),
                    days_until_due=0,
                    due_date_valid=False
                )
            
            # ========================================
            # CONSULTA API EXTERNA PARA VALIDAR BOLETO
            # ========================================
            logger.info(f"🔍 Validando boleto: {clean_barcode[:20]}...")
            
            validation_result = await bill_validation_service.validate_bill(clean_barcode)
            
            logger.info(
                f"📋 Resultado validação: valid={validation_result.valid}, "
                f"can_be_paid={validation_result.can_be_paid}, "
                f"beneficiary={validation_result.beneficiary_name}, "
                f"provider={validation_result.provider}"
            )
            
            # Verifica se houve erro na consulta
            if validation_result.error_message and not validation_result.valid:
                return BillInfoResponse(
                    valid=False,
                    error_message=validation_result.error_message,
                    barcode=clean_barcode,
                    bill_type=BillTypeEnum.BANK_SLIP,
                    original_amount_brl=Decimal('0'),
                    amount_brl=Decimal('0'),
                    due_date=date.today(),
                    days_until_due=0,
                    due_date_valid=False
                )
            
            # Identifica tipo de boleto
            bill_type = self._identify_bill_type(clean_barcode)
            
            # Usa valor final (com multas/juros se houver)
            amount = validation_result.final_amount if validation_result.final_amount > 0 else validation_result.original_amount
            
            # Valida valor mínimo (muito baixo pode indicar erro de leitura)
            if amount < MIN_BILL_AMOUNT:
                return BillInfoResponse(
                    valid=False,
                    error_message="Não foi possível ler o boleto. Tente novamente.",
                    barcode=clean_barcode,
                    bill_type=bill_type,
                    original_amount_brl=validation_result.original_amount,
                    amount_brl=amount,
                    due_date=validation_result.due_date or date.today(),
                    days_until_due=0,
                    due_date_valid=False,
                    beneficiary_name=validation_result.beneficiary_name,
                    beneficiary_document=validation_result.beneficiary_document
                )
            
            # Calcula dias até vencimento
            today = date.today()
            due_date = validation_result.due_date or (today + timedelta(days=30))
            days_until_due = (due_date - today).days
            
            # Calcula se está vencido e quantos dias
            is_overdue = days_until_due < 0
            days_overdue = abs(days_until_due) if is_overdue else 0
            
            # Valida se pode ser pago
            due_date_valid = validation_result.can_be_paid
            due_date_warning = validation_result.status_message
            
            # Verifica regra de 1 dia de antecedência
            if days_until_due >= 0 and days_until_due < MIN_DAYS_BEFORE_DUE:
                due_date_valid = False
                due_date_warning = f"Boleto vence em {days_until_due} dia(s). Mínimo necessário: {MIN_DAYS_BEFORE_DUE} dia(s) de antecedência."
            
            # Gera linha digitável
            digitable_line = validation_result.digitable_line or self._generate_digitable_line(clean_barcode)
            
            # Monta mensagem detalhada de status
            status = validation_result.status
            status_message = validation_result.status_message
            
            # Adiciona informação de multas/juros se houver
            if is_overdue and (validation_result.fine_amount > 0 or validation_result.interest_amount > 0):
                fees_detail = []
                if validation_result.fine_amount > 0:
                    fees_detail.append(f"Multa: R$ {validation_result.fine_amount:.2f}")
                if validation_result.interest_amount > 0:
                    fees_detail.append(f"Juros: R$ {validation_result.interest_amount:.2f}")
                
                if status_message:
                    status_message = f"{status_message} ({', '.join(fees_detail)})"
                else:
                    status_message = f"Boleto vencido há {days_overdue} dias. {', '.join(fees_detail)}"
                
                due_date_warning = status_message
            
            # Disclaimer sobre multas/juros
            fees_disclaimer = None
            if validation_result.fine_amount > 0 or validation_result.interest_amount > 0:
                fees_disclaimer = "Multas e juros são cobrados pelo emissor do boleto (banco/empresa), não pela WOLK NOW."
            
            return BillInfoResponse(
                valid=due_date_valid,
                error_message=due_date_warning if not due_date_valid else None,
                barcode=clean_barcode,
                digitable_line=digitable_line,
                bill_type=bill_type,
                # Valores detalhados
                original_amount_brl=validation_result.original_amount,
                fine_amount_brl=validation_result.fine_amount,
                interest_amount_brl=validation_result.interest_amount,
                amount_brl=amount,
                # Vencimento
                due_date=due_date,
                days_until_due=days_until_due,  # Pode ser negativo se vencido
                is_overdue=is_overdue,
                days_overdue=days_overdue,
                due_date_valid=due_date_valid,
                due_date_warning=due_date_warning,
                # Status
                status=status,
                status_message=status_message,
                # Beneficiário
                beneficiary_name=validation_result.beneficiary_name,
                beneficiary_document=validation_result.beneficiary_document,
                bank_code=None,  # Já incluído no bank_name
                bank_name=validation_result.beneficiary_bank,
                # Disclaimer
                fees_disclaimer=fees_disclaimer
            )
            
        except Exception as e:
            logger.error(f"Erro ao validar boleto: {e}")
            return BillInfoResponse(
                valid=False,
                error_message=f"Erro ao processar código de barras: {str(e)}",
                barcode=barcode,
                bill_type=BillTypeEnum.OTHER,
                # Valores zerados
                original_amount_brl=Decimal('0'),
                fine_amount_brl=Decimal('0'),
                interest_amount_brl=Decimal('0'),
                amount_brl=Decimal('0'),
                # Vencimento
                due_date=date.today(),
                days_until_due=0,
                is_overdue=False,
                days_overdue=0,
                due_date_valid=False,
                # Status de erro
                status="error",
                status_message=f"Erro ao processar: {str(e)}"
            )
    
    def _identify_bill_type(self, barcode: str) -> BillTypeEnum:
        """Identifica o tipo de boleto pelo código de barras"""
        # Boleto bancário começa com código do banco (3 dígitos)
        # Contas de consumo começam com 8
        if barcode[0] == '8':
            # Segundo dígito indica o segmento
            segment = barcode[1]
            if segment in ['1', '2']:  # Prefeituras, saneamento
                return BillTypeEnum.UTILITY
            elif segment in ['3', '4']:  # Energia, gás
                return BillTypeEnum.UTILITY
            elif segment in ['5', '6', '7']:  # Telecomunicações
                return BillTypeEnum.UTILITY
            elif segment == '9':  # Outros
                return BillTypeEnum.TAX
            return BillTypeEnum.OTHER
        
        return BillTypeEnum.BANK_SLIP
    
    def _parse_bank_slip(self, barcode: str) -> Dict[str, Any]:
        """
        Extrai informações de boleto bancário
        
        Formato do código de barras (44 dígitos):
        - Posição 1-3: Código do banco
        - Posição 4: Código da moeda (9 = Real)
        - Posição 5: Dígito verificador geral
        - Posição 6-9: Fator de vencimento
        - Posição 10-19: Valor (10 dígitos, 2 decimais)
        - Posição 20-44: Campo livre (depende do banco)
        """
        try:
            # Código do banco
            bank_code = barcode[0:3]
            bank_name = BANK_CODES.get(bank_code, f"Banco {bank_code}")
            
            # Fator de vencimento (dias desde 07/10/1997)
            due_factor = int(barcode[5:9])
            base_date = date(1997, 10, 7)
            
            if due_factor > 0:
                due_date = base_date + timedelta(days=due_factor)
            else:
                # Sem vencimento definido, assume 30 dias
                due_date = date.today() + timedelta(days=30)
            
            # Valor
            value_str = barcode[9:19]
            amount = Decimal(value_str) / Decimal('100')
            
            return {
                'bank_code': bank_code,
                'bank_name': bank_name,
                'due_date': due_date,
                'amount': amount,
                'beneficiary_name': None,  # Não disponível no código de barras
                'beneficiary_document': None
            }
            
        except Exception as e:
            logger.error(f"Erro ao parsear boleto bancário: {e}")
            raise ValueError(f"Código de barras inválido: {e}")
    
    def _parse_utility_bill(self, barcode: str) -> Dict[str, Any]:
        """
        Extrai informações de conta de consumo/concessionária
        
        Formato (44 ou 48 dígitos):
        - Posição 1: Identificador (8)
        - Posição 2: Segmento
        - Posição 3: Identificador valor real/referência
        - Posição 4: Dígito verificador
        - Posição 5-15: Valor
        """
        try:
            # Segmento
            segment = barcode[1]
            segment_names = {
                '1': 'Prefeitura',
                '2': 'Saneamento',
                '3': 'Energia/Gás',
                '4': 'Telecomunicações',
                '5': 'Órgãos Governamentais',
                '6': 'Outros',
                '7': 'Taxas de Trânsito',
                '9': 'Outros'
            }
            
            # Valor
            value_str = barcode[4:15]
            amount = Decimal(value_str) / Decimal('100')
            
            # Data de vencimento (geralmente nos campos seguintes)
            # Como varia muito, assumimos 30 dias
            due_date = date.today() + timedelta(days=30)
            
            return {
                'bank_code': None,
                'bank_name': segment_names.get(segment, 'Concessionária'),
                'due_date': due_date,
                'amount': amount,
                'beneficiary_name': segment_names.get(segment, 'Concessionária'),
                'beneficiary_document': None
            }
            
        except Exception as e:
            logger.error(f"Erro ao parsear conta de consumo: {e}")
            raise ValueError(f"Código de barras inválido: {e}")
    
    def _generate_digitable_line(self, barcode: str) -> str:
        """Gera linha digitável a partir do código de barras"""
        if len(barcode) == 44:
            # Formato: AAABC.CCCCX DDDDD.DDDDDY EEEEE.EEEEEZ K UUUUVVVVVVVVVV
            # Simplificado para exibição
            return f"{barcode[0:5]}.{barcode[5:10]} {barcode[10:15]}.{barcode[15:21]} {barcode[21:26]}.{barcode[26:32]} {barcode[32]} {barcode[33:44]}"
        return barcode
    
    # ============================================
    # 2. COTAR PAGAMENTO
    # ============================================
    
    async def quote_bill_payment(
        self,
        user_id: str,
        request: QuoteBillPaymentRequest,
        context: Optional[RequestContext] = None
    ) -> BillPaymentQuoteResponse:
        """
        Gera cotação para pagamento de boleto
        
        Calcula:
        - Valor do boleto
        - Taxas (4.75% + 0.25% = 5%)
        - Quantidade de crypto necessária
        - Verifica saldo do usuário
        
        Cotação válida conforme configuração do admin (padrão: 15 minutos)
        """
        try:
            # ========================================
            # CARREGA CONFIGURAÇÕES DO BANCO DE DADOS
            # ========================================
            settings = self._get_bill_payment_settings()
            service_fee_percent = settings["service_fee_percent"]
            network_fee_percent = settings["network_fee_percent"]
            min_brl = settings["min_brl"]
            max_brl = settings["max_brl"]
            expiry_minutes = settings["expiry_minutes"]
            
            logger.info(f"📋 Configurações Bill Payment: service={service_fee_percent}%, network={network_fee_percent}%, min=R${min_brl}, max=R${max_brl}, expiry={expiry_minutes}min")
            
            # Valida boleto primeiro
            bill_info = await self.validate_bill(request.barcode)
            
            if not bill_info.valid:
                raise ValueError(bill_info.error_message or "Boleto inválido")
            
            # Verifica limites de valor
            bill_amount = bill_info.amount_brl
            if bill_amount < min_brl:
                raise ValueError(f"Valor mínimo permitido é R$ {min_brl:,.2f}. Valor do boleto: R$ {bill_amount:,.2f}")
            if bill_amount > max_brl:
                raise ValueError(f"Valor máximo permitido é R$ {max_brl:,.2f}. Valor do boleto: R$ {bill_amount:,.2f}")
            
            # Busca usuário
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user:
                raise ValueError("Usuário não encontrado")
            
            # Obtém cotações
            crypto_usd_rate, brl_usd_rate = await self._get_rates(request.crypto_currency)
            
            # Calcula valores com taxas do banco de dados
            # Taxas
            service_fee = (bill_amount * service_fee_percent / Decimal('100')).quantize(Decimal('0.01'), rounding=ROUND_UP)
            network_fee = (bill_amount * network_fee_percent / Decimal('100')).quantize(Decimal('0.01'), rounding=ROUND_UP)
            total_fees = service_fee + network_fee
            total_fee_percent = service_fee_percent + network_fee_percent
            
            # Total em BRL
            total_brl = bill_amount + total_fees
            
            # Converte para crypto
            # BRL → USD → Crypto
            total_usd = total_brl / brl_usd_rate
            crypto_amount = (total_usd / crypto_usd_rate).quantize(Decimal('0.00000001'), rounding=ROUND_UP)
            
            # Verifica saldo do usuário (passa a rede selecionada)
            user_balance = await self._get_user_crypto_balance(
                user_id, 
                request.crypto_currency,
                request.crypto_network
            )
            has_sufficient_balance = user_balance >= crypto_amount
            
            # Gera ID da cotação
            quote_id = f"qt_{uuid.uuid4().hex[:16]}"
            
            # Validade conforme configuração do admin
            expires_at = datetime.now(timezone.utc) + timedelta(minutes=expiry_minutes)
            
            # Cria registro pendente (para guardar a cotação)
            bill_payment = WolkPayBillPayment(
                id=str(uuid.uuid4()),
                payment_number=WolkPayBillPayment.generate_payment_number(),
                user_id=user_id,
                bill_type=BillType[bill_info.bill_type.value],
                barcode=request.barcode,
                digitable_line=bill_info.digitable_line,
                bill_amount_brl=bill_amount,
                bill_due_date=bill_info.due_date,
                bill_beneficiary_name=bill_info.beneficiary_name,
                bill_beneficiary_document=bill_info.beneficiary_document,
                bill_bank_code=bill_info.bank_code,
                bill_bank_name=bill_info.bank_name,
                crypto_currency=request.crypto_currency.upper(),
                crypto_amount=crypto_amount,
                crypto_network=request.crypto_network,
                crypto_usd_rate=crypto_usd_rate,
                brl_usd_rate=brl_usd_rate,
                base_amount_brl=bill_amount,
                service_fee_percent=service_fee_percent,
                service_fee_brl=service_fee,
                network_fee_percent=network_fee_percent,
                network_fee_brl=network_fee,
                total_amount_brl=total_brl,
                status=BillPaymentStatus.PENDING,
                quote_expires_at=expires_at
            )
            
            self.db.add(bill_payment)
            self.db.commit()
            
            # Log com contexto de auditoria
            await self._log_event(
                bill_payment.id,
                "quote_created",
                None,
                BillPaymentStatus.PENDING.value,
                {"quote_id": quote_id, "crypto_amount": str(crypto_amount)},
                "user",
                user_id,
                ip_address=context.ip_address if context else None,
                user_agent=context.user_agent if context else None,
                request_id=context.request_id if context else None
            )
            
            # Monta resumo para UI
            total_fee_percent = service_fee_percent + network_fee_percent
            summary = {
                "bill": f"R$ {bill_amount:,.2f}",
                "fees": f"R$ {total_fees:,.2f} ({total_fee_percent}%)",
                "total_brl": f"R$ {total_brl:,.2f}",
                "crypto": f"{crypto_amount} {request.crypto_currency.upper()}",
                "rate": f"1 {request.crypto_currency.upper()} = R$ {(crypto_usd_rate * brl_usd_rate):,.2f}"
            }
            
            return BillPaymentQuoteResponse(
                quote_id=bill_payment.id,  # Usamos o ID do pagamento como quote_id
                barcode=request.barcode,
                bill_amount_brl=bill_amount,
                due_date=bill_info.due_date,
                beneficiary_name=bill_info.beneficiary_name,
                crypto_currency=request.crypto_currency.upper(),
                crypto_network=request.crypto_network,
                crypto_amount=crypto_amount,
                crypto_usd_rate=crypto_usd_rate,
                brl_usd_rate=brl_usd_rate,
                service_fee_percent=service_fee_percent,
                service_fee_brl=service_fee,
                network_fee_percent=network_fee_percent,
                network_fee_brl=network_fee,
                total_fees_brl=total_fees,
                total_amount_brl=total_brl,
                total_crypto_amount=crypto_amount,
                quote_expires_at=expires_at,
                quote_valid_seconds=expiry_minutes * 60,
                user_crypto_balance=user_balance,
                has_sufficient_balance=has_sufficient_balance,
                summary=summary
            )
            
        except Exception as e:
            logger.error(f"Erro ao cotar pagamento de boleto: {e}")
            raise
    
    # ============================================
    # 3. CONFIRMAR PAGAMENTO (DEBITAR CRYPTO)
    # ============================================
    
    async def confirm_bill_payment(
        self,
        user_id: str,
        request: ConfirmBillPaymentRequest,
        context: Optional[RequestContext] = None
    ) -> BillPaymentResponse:
        """
        Confirma pagamento e DEBITA CRYPTO IMEDIATAMENTE
        
        ⚠️ IMPORTANTE: Após esta chamada, a crypto SAI da carteira do usuário
        
        Fluxo:
        1. Verifica se cotação ainda é válida
        2. Verifica saldo do usuário
        3. DEBITA crypto da carteira
        4. Atualiza status para CRYPTO_DEBITED
        5. Envia para fila de pagamento
        """
        try:
            # Busca o pagamento pela cotação
            bill_payment = self.db.query(WolkPayBillPayment).filter(
                WolkPayBillPayment.id == request.quote_id,
                WolkPayBillPayment.user_id == user_id,
                WolkPayBillPayment.status == BillPaymentStatus.PENDING
            ).first()
            
            if not bill_payment:
                raise ValueError("Cotação não encontrada ou já utilizada")
            
            # Verifica se cotação expirou
            if datetime.now(timezone.utc) > bill_payment.quote_expires_at:
                bill_payment.status = BillPaymentStatus.EXPIRED
                self.db.commit()
                raise ValueError("Cotação expirada. Por favor, faça uma nova cotação.")
            
            # Verifica vencimento do boleto novamente
            # NOTA: Boletos vencidos PODEM ser pagos (com multa/juros) até 60 dias após vencimento
            today = date.today()
            days_overdue = (today - bill_payment.bill_due_date).days
            
            # Só bloqueia se venceu há mais de 60 dias
            if days_overdue > 60:
                raise ValueError("Boleto vencido há mais de 60 dias. Consulte o emissor para nova via.")
            
            # Verifica saldo do usuário (passa a rede selecionada)
            user_balance = await self._get_user_crypto_balance(
                user_id, 
                bill_payment.crypto_currency,
                bill_payment.crypto_network
            )
            
            if user_balance < bill_payment.crypto_amount:
                raise ValueError(
                    f"Saldo insuficiente. Necessário: {bill_payment.crypto_amount} {bill_payment.crypto_currency}. "
                    f"Disponível: {user_balance} {bill_payment.crypto_currency}"
                )
            
            # ⚠️ DEBITA CRYPTO DA CARTEIRA DO USUÁRIO
            # Transfere na blockchain + debita do saldo interno
            blockchain_tx_id = await self._debit_user_crypto(
                user_id=user_id,
                crypto_currency=bill_payment.crypto_currency,
                amount=bill_payment.crypto_amount,
                description=f"Pagamento de boleto {bill_payment.payment_number}",
                crypto_network=bill_payment.crypto_network
            )
            
            # Atualiza status
            old_status = bill_payment.status.value
            bill_payment.status = BillPaymentStatus.CRYPTO_DEBITED
            bill_payment.crypto_debited_at = datetime.now(timezone.utc)
            bill_payment.internal_tx_id = blockchain_tx_id
            
            # Se retornou um tx_hash da blockchain (começa com 0x), salva também
            if blockchain_tx_id and blockchain_tx_id.startswith("0x"):
                bill_payment.crypto_tx_hash = blockchain_tx_id
                logger.info(f"📝 TX Hash blockchain salvo: {blockchain_tx_id}")
            
            self.db.commit()
            
            # Log com contexto de auditoria
            await self._log_event(
                bill_payment.id,
                "crypto_debited",
                old_status,
                BillPaymentStatus.CRYPTO_DEBITED.value,
                {
                    "internal_tx_id": blockchain_tx_id,
                    "blockchain_tx_hash": blockchain_tx_id if blockchain_tx_id and blockchain_tx_id.startswith("0x") else None,
                    "crypto_amount": str(bill_payment.crypto_amount),
                    "crypto_currency": bill_payment.crypto_currency
                },
                "system",
                None,
                ip_address=context.ip_address if context else None,
                user_agent=context.user_agent if context else None,
                request_id=context.request_id if context else None
            )
            
            logger.info(
                f"✅ Crypto debitada: {bill_payment.crypto_amount} {bill_payment.crypto_currency} "
                f"do usuário {user_id} para pagamento {bill_payment.payment_number}"
            )
            
            # 📧 SEND NOTIFICATION: Bill payment processing
            try:
                fire_and_forget(notify_bill_payment_processing(
                    db=self.db,
                    user_id=user_id,
                    bill_type=bill_payment.bill_type.value if bill_payment.bill_type else "boleto",
                    amount=float(bill_payment.bill_amount_brl),
                    barcode=bill_payment.barcode
                ))
            except Exception as notif_error:
                logger.warning(f"Failed to send bill processing notification: {notif_error}")
            
            return BillPaymentResponse(
                id=bill_payment.id,
                payment_number=bill_payment.payment_number,
                status=BillPaymentStatusEnum.CRYPTO_DEBITED,
                barcode=bill_payment.barcode,
                bill_amount_brl=bill_payment.bill_amount_brl,
                due_date=bill_payment.bill_due_date,
                beneficiary_name=bill_payment.bill_beneficiary_name,
                bank_name=bill_payment.bill_bank_name,
                crypto_currency=bill_payment.crypto_currency,
                crypto_amount=bill_payment.crypto_amount,
                crypto_network=bill_payment.crypto_network,
                total_amount_brl=bill_payment.total_amount_brl,
                service_fee_brl=bill_payment.service_fee_brl,
                network_fee_brl=bill_payment.network_fee_brl,
                created_at=bill_payment.created_at,
                crypto_debited_at=bill_payment.crypto_debited_at,
                paid_at=None,
                payment_receipt_url=None,
                bank_authentication=None,
                status_message="Crypto debitada com sucesso! Seu pagamento está sendo processado. O boleto será pago em até 24 horas úteis."
            )
            
        except Exception as e:
            logger.error(f"Erro ao confirmar pagamento de boleto: {e}")
            raise
    
    # ============================================
    # 4. OPERADOR PAGA BOLETO
    # ============================================
    
    async def operator_pay_bill(
        self,
        operator_id: str,
        payment_id: str,
        bank_authentication: str,
        payment_receipt_url: Optional[str] = None,
        notes: Optional[str] = None,
        context: Optional[RequestContext] = None
    ) -> BillPaymentResponse:
        """
        Operador marca boleto como pago
        
        Chamado após o operador efetivamente pagar o boleto
        via internet banking ou outro meio.
        """
        try:
            bill_payment = self.db.query(WolkPayBillPayment).filter(
                WolkPayBillPayment.id == payment_id
            ).first()
            
            if not bill_payment:
                raise ValueError("Pagamento não encontrado")
            
            if bill_payment.status not in [BillPaymentStatus.CRYPTO_DEBITED, BillPaymentStatus.PROCESSING, BillPaymentStatus.PAYING]:
                raise ValueError(f"Pagamento não pode ser marcado como pago. Status atual: {bill_payment.status.value}")
            
            # Atualiza
            old_status = bill_payment.status.value
            bill_payment.status = BillPaymentStatus.PAID
            bill_payment.paid_at = datetime.now(timezone.utc)
            bill_payment.paid_by_operator_id = operator_id
            bill_payment.bank_authentication = bank_authentication
            bill_payment.payment_receipt_url = payment_receipt_url
            
            self.db.commit()
            
            # Log com contexto de auditoria
            await self._log_event(
                bill_payment.id,
                "bill_paid",
                old_status,
                BillPaymentStatus.PAID.value,
                {
                    "operator_id": operator_id,
                    "bank_authentication": bank_authentication,
                    "notes": notes
                },
                "operator",
                operator_id,
                ip_address=context.ip_address if context else None,
                user_agent=context.user_agent if context else None,
                request_id=context.request_id if context else None
            )
            
            logger.info(f"✅ Boleto pago: {bill_payment.payment_number} por operador {operator_id}")
            
            # 📧 SEND NOTIFICATION: Bill payment completed
            try:
                fire_and_forget(notify_bill_payment_completed(
                    db=self.db,
                    user_id=str(bill_payment.user_id),
                    bill_type=bill_payment.bill_type.value if bill_payment.bill_type else "boleto",
                    amount=float(bill_payment.bill_amount_brl),
                    transaction_id=bill_payment.payment_number
                ))
            except Exception as notif_error:
                logger.warning(f"Failed to send bill completed notification: {notif_error}")
            
            return self._build_response(bill_payment, "🎉 Boleto pago com sucesso! Comprovante disponível.")
            
        except Exception as e:
            logger.error(f"Erro ao marcar boleto como pago: {e}")
            raise
    
    # ============================================
    # 5. REEMBOLSAR (EM CASO DE FALHA)
    # ============================================
    
    async def refund_bill_payment(
        self,
        operator_id: str,
        payment_id: str,
        reason: str,
        context: Optional[RequestContext] = None
    ) -> BillPaymentResponse:
        """
        Reembolsa crypto ao usuário em caso de falha
        
        Usado quando:
        - Boleto já estava pago
        - Erro no sistema bancário
        - Outros problemas
        """
        try:
            bill_payment = self.db.query(WolkPayBillPayment).filter(
                WolkPayBillPayment.id == payment_id
            ).first()
            
            if not bill_payment:
                raise ValueError("Pagamento não encontrado")
            
            if bill_payment.status not in [BillPaymentStatus.CRYPTO_DEBITED, BillPaymentStatus.PROCESSING, BillPaymentStatus.PAYING, BillPaymentStatus.FAILED]:
                raise ValueError(f"Pagamento não pode ser reembolsado. Status atual: {bill_payment.status.value}")
            
            # Credita crypto de volta ao usuário
            refund_tx_id = await self._credit_user_crypto(
                user_id=bill_payment.user_id,
                crypto_currency=bill_payment.crypto_currency,
                amount=bill_payment.crypto_amount,
                description=f"Reembolso - Pagamento de boleto {bill_payment.payment_number}: {reason}"
            )
            
            # Atualiza
            old_status = bill_payment.status.value
            bill_payment.status = BillPaymentStatus.REFUNDED
            bill_payment.refunded_at = datetime.now(timezone.utc)
            bill_payment.refund_tx_id = refund_tx_id
            bill_payment.failure_reason = reason
            
            self.db.commit()
            
            # Log com contexto de auditoria
            await self._log_event(
                bill_payment.id,
                "refunded",
                old_status,
                BillPaymentStatus.REFUNDED.value,
                {
                    "operator_id": operator_id,
                    "reason": reason,
                    "refund_tx_id": refund_tx_id
                },
                "operator",
                operator_id,
                ip_address=context.ip_address if context else None,
                user_agent=context.user_agent if context else None,
                request_id=context.request_id if context else None
            )
            
            logger.info(f"💰 Reembolso: {bill_payment.crypto_amount} {bill_payment.crypto_currency} devolvido ao usuário {bill_payment.user_id}")
            
            return self._build_response(bill_payment, f"💰 Reembolso processado: {bill_payment.crypto_amount} {bill_payment.crypto_currency} devolvido à sua carteira.")
            
        except Exception as e:
            logger.error(f"Erro ao reembolsar pagamento: {e}")
            raise
    
    # ============================================
    # 6. LISTAR PAGAMENTOS DO USUÁRIO
    # ============================================
    
    async def get_user_bill_payments(
        self,
        user_id: str,
        status: Optional[str] = None,
        page: int = 1,
        per_page: int = 20
    ) -> BillPaymentListResponse:
        """Lista pagamentos de boletos do usuário"""
        try:
            query = self.db.query(WolkPayBillPayment).filter(
                WolkPayBillPayment.user_id == user_id
            )
            
            if status:
                statuses = [s.strip() for s in status.split(',')]
                query = query.filter(WolkPayBillPayment.status.in_(statuses))
            
            total = query.count()
            
            payments = query.order_by(
                WolkPayBillPayment.created_at.desc()
            ).offset((page - 1) * per_page).limit(per_page).all()
            
            return BillPaymentListResponse(
                payments=[self._build_response(p) for p in payments],
                total=total,
                page=page,
                per_page=per_page
            )
            
        except Exception as e:
            logger.error(f"Erro ao listar pagamentos: {e}")
            raise
    
    # ============================================
    # MÉTODOS AUXILIARES
    # ============================================
    
    async def _get_rates(self, crypto_currency: str) -> Tuple[Decimal, Decimal]:
        """
        Obtém cotações atuais usando o price_aggregator do sistema
        
        Returns:
            Tuple[crypto_usd_rate, brl_usd_rate]
        """
        symbol_upper = crypto_currency.upper()
        
        # Stablecoins sempre valem ~1 USD
        if symbol_upper in ['USDT', 'USDC', 'DAI', 'BUSD']:
            crypto_usd_rate = Decimal('1.00')
        else:
            try:
                # Usar o price_aggregator existente no projeto
                prices = await price_aggregator.get_prices([symbol_upper], "usd")
                if symbol_upper in prices:
                    price_data = prices[symbol_upper]
                    if isinstance(price_data, dict) and 'price' in price_data:
                        crypto_usd_rate = Decimal(str(price_data['price']))
                    elif hasattr(price_data, 'price'):
                        crypto_usd_rate = Decimal(str(price_data.price))
                    else:
                        raise ValueError(f"Formato de preço inválido para {symbol_upper}")
                else:
                    raise ValueError(f"Preço não encontrado para {symbol_upper}")
            except Exception as e:
                logger.warning(f"Erro ao obter preço de {symbol_upper}: {e}")
                raise ValueError(f"Não foi possível obter cotação de {symbol_upper}")
        
        # Taxa USD/BRL usando USDT em BRL como referência
        try:
            prices = await price_aggregator.get_prices(['USDT'], "brl")
            if 'USDT' in prices:
                price_data = prices['USDT']
                if isinstance(price_data, dict) and 'price' in price_data:
                    brl_usd_rate = Decimal(str(price_data['price']))
                elif hasattr(price_data, 'price'):
                    brl_usd_rate = Decimal(str(price_data.price))
                else:
                    brl_usd_rate = Decimal('6.00')
            else:
                brl_usd_rate = Decimal('6.00')
        except Exception as e:
            logger.warning(f"Erro ao obter taxa USD/BRL, usando fallback: {e}")
            brl_usd_rate = Decimal('6.00')
        
        logger.info(f"💱 Cotações: {symbol_upper}={crypto_usd_rate} USD, USD/BRL={brl_usd_rate}")
        return crypto_usd_rate, brl_usd_rate
    
    def _build_balance_key(self, crypto_currency: str, crypto_network: Optional[str] = None) -> str:
        """
        Constrói a chave de saldo baseada no token e rede.
        
        O banco armazena em lowercase: polygon_usdt, bsc_usdt, etc.
        
        ⚠️ IMPORTANTE: Tokens genéricos (USDT, USDC sem rede) NÃO SÃO PERMITIDOS!
        Sempre deve-se especificar a rede para stablecoins e tokens.
        
        Exemplos:
        - USDT + polygon -> polygon_usdt
        - USDT + bsc -> bsc_usdt  
        - USDT + None -> ERRO! (não permitido)
        
        Exceções (moedas nativas):
        - BTC, ETH, BNB, MATIC podem existir sem rede específica
        """
        crypto_upper = crypto_currency.upper()
        crypto_lower = crypto_currency.lower()
        
        # Moedas nativas que podem existir sem rede específica
        native_coins = {'BTC', 'ETH', 'BNB', 'MATIC', 'SOL', 'TRX', 'AVAX', 'DOT'}
        
        # Stablecoins e tokens que SEMPRE precisam de rede
        tokens_requiring_network = {'USDT', 'USDC', 'DAI', 'BUSD', 'TUSD', 'USDP'}
        
        if crypto_network:
            network_lower = crypto_network.lower()
            # Padroniza nomes de rede
            network_map = {
                'polygon': 'polygon',
                'matic': 'polygon',
                'bsc': 'bsc',
                'bnb': 'bsc',
                'binance': 'bsc',
                'ethereum': 'ethereum',
                'eth': 'ethereum',
                'base': 'base',
                'tron': 'tron',
                'trx': 'tron',
            }
            normalized_network = network_map.get(network_lower, network_lower)
            # Formato: polygon_usdt
            return f"{normalized_network}_{crypto_lower}"
        
        # Sem rede especificada
        if crypto_upper in tokens_requiring_network:
            # Stablecoins/tokens SEMPRE precisam de rede - isso é um erro!
            raise ValueError(
                f"Rede não especificada para {crypto_upper}. "
                f"Stablecoins e tokens requerem rede (polygon, bsc, ethereum, etc). "
                f"Use o formato: {crypto_upper.lower()}_polygon ou {crypto_upper.lower()}_bsc"
            )
        
        # Moedas nativas podem existir sem rede (mas é recomendado especificar)
        if crypto_upper in native_coins:
            logger.warning(
                f"⚠️ Usando moeda nativa {crypto_upper} sem rede específica. "
                f"Recomendado especificar a rede para evitar ambiguidade."
            )
            return crypto_upper
        
        # Outras moedas desconhecidas - retorna uppercase mas loga warning
        logger.warning(f"⚠️ Moeda {crypto_upper} não reconhecida, usando formato genérico.")
        return crypto_upper
    
    async def _sync_blockchain_balance(
        self,
        user_id: str,
        crypto_currency: str,
        crypto_network: str
    ) -> Optional[Decimal]:
        """
        Sincroniza saldo da blockchain para a tabela wallet_balances.
        
        Consulta a blockchain e atualiza o saldo interno se necessário.
        Usado como fallback quando o saldo interno é zero mas pode haver
        saldo na blockchain.
        
        Returns:
            Novo saldo disponível após sincronização, ou None se falhou
        """
        try:
            from app.services.blockchain_balance_service import blockchain_balance_service
            from app.models.address import Address
            from app.models.wallet import Wallet
            
            # Busca o endereço do usuário para a rede
            address = self.db.query(Address).join(
                Wallet, Address.wallet_id == Wallet.id
            ).filter(
                Wallet.user_id == user_id,
                Wallet.is_active == True
            ).first()
            
            if not address:
                logger.warning(f"⚠️ Nenhum endereço encontrado para usuário {user_id}")
                return None
            
            # Consulta saldo na blockchain
            network_lower = crypto_network.lower()
            token_lower = crypto_currency.lower()
            
            logger.info(f"🔍 Consultando blockchain: {network_lower} {token_lower} para {address.address[:10]}...")
            
            # Se for USDT/USDC, consulta saldo de token
            if token_lower in ['usdt', 'usdc']:
                result = await blockchain_balance_service.get_token_balance(
                    network=network_lower,
                    address=address.address,
                    token=token_lower
                )
            else:
                # Token nativo
                result = await blockchain_balance_service.get_native_balance(
                    network=network_lower,
                    address=address.address
                )
            
            if result and result.get('success') and result.get('balance', 0) > 0:
                blockchain_balance = Decimal(str(result['balance']))
                logger.info(f"📡 Saldo blockchain {network_lower}_{token_lower}: {blockchain_balance}")
                
                # Atualiza a tabela wallet_balances
                balance_key = self._build_balance_key(crypto_currency, crypto_network)
                
                # Deposita o saldo (cria ou atualiza)
                WalletBalanceService.deposit_balance(
                    db=self.db,
                    user_id=user_id,
                    cryptocurrency=balance_key,
                    amount=float(blockchain_balance),
                    reason=f"Sync from blockchain ({network_lower})"
                )
                
                logger.info(f"✅ Saldo sincronizado: {balance_key} = {blockchain_balance}")
                return blockchain_balance
            else:
                logger.info(f"ℹ️ Saldo blockchain = 0 ou erro na consulta")
                return None
                
        except Exception as e:
            logger.error(f"❌ Erro sincronizando saldo blockchain: {e}")
            return None
    
    async def _get_user_crypto_balance(
        self, 
        user_id: str, 
        crypto_currency: str, 
        crypto_network: Optional[str] = None
    ) -> Decimal:
        """
        Obtém saldo de crypto do usuário usando WalletBalanceService.
        
        Busca pela chave composta REDE_TOKEN (ex: polygon_usdt) se rede informada.
        Se o saldo interno for zero, tenta sincronizar com a blockchain.
        Se não encontrar na rede específica, tenta o token genérico (ex: USDT).
        """
        try:
            # Primeiro tenta com a rede específica
            if crypto_network:
                balance_key = self._build_balance_key(crypto_currency, crypto_network)
                balance_data = WalletBalanceService.get_balance(
                    db=self.db,
                    user_id=user_id,
                    cryptocurrency=balance_key
                )
                
                if balance_data:
                    available = Decimal(str(balance_data.get('available_balance', 0)))
                    if available > 0:
                        logger.info(f"💰 Saldo {balance_key} do usuário {user_id}: {available}")
                        return available
                
                # Saldo interno é zero - tenta sincronizar com blockchain
                logger.info(f"⚡ Saldo interno {balance_key} = 0, tentando sincronizar com blockchain...")
                synced_balance = await self._sync_blockchain_balance(
                    user_id=user_id,
                    crypto_currency=crypto_currency,
                    crypto_network=crypto_network
                )
                
                if synced_balance and synced_balance > 0:
                    logger.info(f"✅ Sincronizado: {balance_key} = {synced_balance}")
                    return synced_balance
            
            # Fallback: tenta o token genérico (sem prefixo de rede)
            crypto_upper = crypto_currency.upper()
            balance_data = WalletBalanceService.get_balance(
                db=self.db,
                user_id=user_id,
                cryptocurrency=crypto_upper
            )
            
            if balance_data:
                available = Decimal(str(balance_data.get('available_balance', 0)))
                if available > 0:
                    logger.info(f"💰 Saldo {crypto_upper} (genérico) do usuário {user_id}: {available}")
                    return available
            
            return Decimal('0')
        except Exception as e:
            logger.error(f"Erro ao obter saldo do usuário: {e}")
            return Decimal('0')
    
    async def _debit_user_crypto(
        self,
        user_id: str,
        crypto_currency: str,
        amount: Decimal,
        description: str,
        crypto_network: Optional[str] = None
    ) -> str:
        """
        Debita crypto da carteira do usuário para pagamento de boleto.
        
        FLUXO COMPLETO:
        1. Transfere crypto na BLOCKCHAIN (User Wallet → Platform Wallet)
        2. Debita do saldo interno (wallet_balances)
        
        Isso garante que a crypto vai para a carteira da plataforma
        imediatamente para liquidação.
        
        Args:
            user_id: ID do usuário
            crypto_currency: Token (USDT, USDC, BTC, etc)
            amount: Quantidade a debitar
            description: Descrição do pagamento
            crypto_network: Rede selecionada (polygon, bsc, ethereum, etc)
        
        Returns:
            tx_hash da transação blockchain
        """
        tx_id = f"billpay_debit_{uuid.uuid4().hex[:16]}"
        
        try:
            logger.info(f"💸 Debitando {amount} {crypto_currency} (rede: {crypto_network}) do usuário {user_id}...")
            
            # ============================================
            # PASSO 1: TRANSFERÊNCIA NA BLOCKCHAIN
            # ============================================
            # Transfere crypto do usuário para a carteira da plataforma
            # Similar ao fluxo de Instant Trade SELL
            
            if crypto_network:
                logger.info(f"🔗 Iniciando transferência na blockchain...")
                logger.info(f"   User: {user_id}")
                logger.info(f"   Token: {crypto_currency}")
                logger.info(f"   Amount: {amount}")
                logger.info(f"   Network: {crypto_network}")
                
                blockchain_result = blockchain_withdraw_service.transfer_to_platform(
                    db=self.db,
                    user_id=user_id,
                    symbol=crypto_currency.upper(),
                    amount=amount,
                    network=crypto_network.lower(),
                    reference_id=tx_id
                )
                
                if not blockchain_result.get("success"):
                    error_msg = blockchain_result.get("error", "Erro desconhecido na blockchain")
                    logger.error(f"❌ Falha na transferência blockchain: {error_msg}")
                    raise ValueError(f"Falha na transferência blockchain: {error_msg}")
                
                tx_hash = blockchain_result.get("tx_hash")
                logger.info(f"✅ Transferência blockchain concluída!")
                logger.info(f"   TX Hash: {tx_hash}")
                logger.info(f"   From: {blockchain_result.get('from_address')}")
                logger.info(f"   To: {blockchain_result.get('to_address')}")
                
                # Usa o tx_hash como ID da transação
                tx_id = tx_hash or tx_id
            else:
                logger.warning(f"⚠️ Rede não especificada - apenas débito interno será feito")
            
            # ============================================
            # PASSO 2: DÉBITO DO SALDO INTERNO
            # ============================================
            # Atualiza a tabela wallet_balances para refletir o saldo
            
            balance_key = self._build_balance_key(crypto_currency, crypto_network)
            
            # IMPORTANTE: Não usar fallback para token genérico!
            # Sempre debitar da rede específica (polygon_usdt, bsc_usdt, etc)
            # Token genérico (USDT, USDC) não existe na blockchain e não deve ser usado
            
            if not crypto_network:
                raise ValueError(
                    f"Rede não especificada para {crypto_currency}. "
                    f"É obrigatório especificar a rede (polygon, bsc, ethereum, etc) para débito."
                )
            
            debit_result = WalletBalanceService.debit_available_balance(
                db=self.db,
                user_id=user_id,
                cryptocurrency=balance_key,
                amount=float(amount),
                reason=f"Bill Payment: {description}",
                reference_id=tx_id
            )
            
            logger.info(
                f"✅ Saldo interno debitado: {amount} {balance_key}. "
                f"Novo saldo: {debit_result.get('available_balance', 0)}"
            )
            
            logger.info(f"✅ Débito completo! TX: {tx_id}")
            return tx_id
            
        except ValueError as e:
            logger.error(f"❌ Falha ao debitar crypto: {e}")
            raise
        except Exception as e:
            logger.error(f"❌ Erro inesperado ao debitar crypto: {e}")
            import traceback
            traceback.print_exc()
            raise ValueError(f"Erro ao processar débito: {str(e)}")

    async def _credit_user_crypto(
        self,
        user_id: str,
        crypto_currency: str,
        amount: Decimal,
        description: str
    ) -> str:
        """
        Credita crypto na carteira do usuário (reembolso)
        
        Adiciona saldo diretamente na carteira do usuário.
        Usado para reembolsos de pagamentos de boleto.
        
        Returns:
            ID da transação interna
        """
        tx_id = f"billpay_refund_{uuid.uuid4().hex[:16]}"
        
        try:
            logger.info(f"� Creditando reembolso de {amount} {crypto_currency} ao usuário {user_id}...")
            
            result = WalletBalanceService.credit_balance(
                db=self.db,
                user_id=user_id,
                cryptocurrency=crypto_currency.upper(),
                amount=float(amount),
                reason=f"Bill Payment Refund: {description}",
                reference_id=tx_id
            )
            
            logger.info(
                f"💰 Crypto reembolsada: {amount} {crypto_currency} ao usuário {user_id}. "
                f"TX: {tx_id}. Novo saldo disponível: {result.get('available_balance', 0)}"
            )
            
            return tx_id
            
        except ValueError as e:
            logger.error(f"❌ Falha ao creditar crypto (reembolso): {e}")
            raise
        except Exception as e:
            logger.error(f"❌ Erro inesperado ao creditar crypto: {e}")
            raise ValueError(f"Erro ao processar reembolso: {str(e)}")
    
    async def _log_event(
        self,
        bill_payment_id: str,
        event: str,
        old_status: Optional[str],
        new_status: str,
        details: Dict[str, Any],
        actor_type: str,
        actor_id: Optional[str],
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_id: Optional[str] = None
    ):
        """
        Registra evento no log com informacoes de auditoria
        
        Args:
            bill_payment_id: ID do pagamento
            event: Tipo do evento (created, quoted, confirmed, etc)
            old_status: Status anterior
            new_status: Novo status
            details: Detalhes adicionais em JSON
            actor_type: Tipo do ator (user, system, operator, admin)
            actor_id: ID do ator
            ip_address: Endereco IP do cliente
            user_agent: User-Agent do navegador/app
            request_id: ID unico da requisicao para rastreamento
        """
        try:
            log = WolkPayBillPaymentLog(
                id=str(uuid.uuid4()),
                bill_payment_id=bill_payment_id,
                event=event,
                old_status=old_status,
                new_status=new_status,
                details=json.dumps(details) if details else None,
                actor_type=actor_type,
                actor_id=actor_id,
                ip_address=ip_address,
                user_agent=user_agent[:500] if user_agent and len(user_agent) > 500 else user_agent,
                request_id=request_id
            )
            self.db.add(log)
            self.db.commit()
            logger.debug(f"Log registrado: {event} - {bill_payment_id} - IP: {ip_address}")
        except Exception as e:
            logger.error(f"Erro ao registrar log: {e}")
    
    def _get_explorer_url(self, tx_hash: str, network: Optional[str]) -> Optional[str]:
        """Retorna URL do explorer para a transação"""
        if not tx_hash or not network:
            return None
        
        network_lower = network.lower()
        
        # Mapear network para URL do explorer
        explorers = {
            'polygon': f'https://polygonscan.com/tx/{tx_hash}',
            'polygon_mainnet': f'https://polygonscan.com/tx/{tx_hash}',
            'bsc': f'https://bscscan.com/tx/{tx_hash}',
            'bsc_mainnet': f'https://bscscan.com/tx/{tx_hash}',
            'binance': f'https://bscscan.com/tx/{tx_hash}',
            'ethereum': f'https://etherscan.io/tx/{tx_hash}',
            'eth': f'https://etherscan.io/tx/{tx_hash}',
            'erc20': f'https://etherscan.io/tx/{tx_hash}',
            'tron': f'https://tronscan.org/#/transaction/{tx_hash}',
            'trc20': f'https://tronscan.org/#/transaction/{tx_hash}',
        }
        
        return explorers.get(network_lower)
    
    async def get_payment_timeline(self, payment_id: str) -> list:
        """
        Retorna timeline completa do pagamento para o cliente
        
        Args:
            payment_id: ID do pagamento
            
        Returns:
            Lista de passos da timeline
        """
        bill_payment = self.db.query(WolkPayBillPayment).filter(
            WolkPayBillPayment.id == payment_id
        ).first()
        
        if not bill_payment:
            raise ValueError("Pagamento nao encontrado")
        
        return self._build_timeline(bill_payment)
    
    def _build_timeline(self, bill_payment: WolkPayBillPayment) -> list:
        """Constrói timeline do pagamento"""
        from app.schemas.wolkpay import BillPaymentTimelineStep
        
        status = bill_payment.status
        
        # Definir os passos da timeline
        steps = []
        
        # 1. Pedido Criado
        steps.append(BillPaymentTimelineStep(
            step="created",
            title="Pedido Criado",
            description=f"Boleto de R$ {bill_payment.bill_amount_brl:.2f} registrado",
            timestamp=bill_payment.created_at,
            completed=True,
            current=status == BillPaymentStatus.PENDING,
            failed=False
        ))
        
        # 2. Crypto Debitada
        crypto_tx_hash = bill_payment.internal_tx_id
        explorer_url = self._get_explorer_url(crypto_tx_hash, bill_payment.crypto_network) if crypto_tx_hash else None
        
        crypto_debited_completed = status in [
            BillPaymentStatus.CRYPTO_DEBITED,
            BillPaymentStatus.PROCESSING,
            BillPaymentStatus.PAYING,
            BillPaymentStatus.PAID,
            BillPaymentStatus.REFUNDED
        ]
        
        steps.append(BillPaymentTimelineStep(
            step="crypto_debited",
            title="Crypto Debitada",
            description=f"{bill_payment.crypto_amount:.6f} {bill_payment.crypto_currency} transferido",
            timestamp=bill_payment.crypto_debited_at,
            completed=crypto_debited_completed,
            current=status == BillPaymentStatus.CRYPTO_DEBITED,
            failed=False,
            tx_hash=crypto_tx_hash if crypto_debited_completed else None,
            explorer_url=explorer_url if crypto_debited_completed else None
        ))
        
        # 3. Processando
        processing_completed = status in [
            BillPaymentStatus.PROCESSING,
            BillPaymentStatus.PAYING,
            BillPaymentStatus.PAID
        ]
        
        steps.append(BillPaymentTimelineStep(
            step="processing",
            title="Em Processamento",
            description="Liquidando ativos para pagamento",
            timestamp=None,
            completed=processing_completed,
            current=status == BillPaymentStatus.PROCESSING,
            failed=False
        ))
        
        # 4. Pagando Boleto
        paying_completed = status in [BillPaymentStatus.PAYING, BillPaymentStatus.PAID]
        
        steps.append(BillPaymentTimelineStep(
            step="paying",
            title="Pagando Boleto",
            description="Realizando transferência bancária",
            timestamp=None,
            completed=paying_completed,
            current=status == BillPaymentStatus.PAYING,
            failed=False
        ))
        
        # 5. Pago / Falhou / Reembolsado
        if status == BillPaymentStatus.PAID:
            steps.append(BillPaymentTimelineStep(
                step="paid",
                title="✅ Boleto Pago",
                description=f"Autenticação: {bill_payment.bank_authentication}" if bill_payment.bank_authentication else "Pagamento confirmado",
                timestamp=bill_payment.paid_at,
                completed=True,
                current=True,
                failed=False
            ))
        elif status == BillPaymentStatus.FAILED:
            steps.append(BillPaymentTimelineStep(
                step="failed",
                title="❌ Falha no Pagamento",
                description=bill_payment.failure_reason or "Erro no processamento",
                timestamp=None,
                completed=True,
                current=True,
                failed=True
            ))
        elif status == BillPaymentStatus.REFUNDED:
            refund_explorer_url = self._get_explorer_url(bill_payment.refund_tx_id, bill_payment.crypto_network)
            steps.append(BillPaymentTimelineStep(
                step="refunded",
                title="↩️ Reembolsado",
                description=f"{bill_payment.crypto_amount:.6f} {bill_payment.crypto_currency} devolvido",
                timestamp=bill_payment.refunded_at,
                completed=True,
                current=True,
                failed=False,
                tx_hash=bill_payment.refund_tx_id,
                explorer_url=refund_explorer_url
            ))
        elif status == BillPaymentStatus.CANCELLED:
            steps.append(BillPaymentTimelineStep(
                step="cancelled",
                title="🚫 Cancelado",
                description="Pagamento cancelado pelo usuário ou sistema",
                timestamp=None,
                completed=True,
                current=True,
                failed=True
            ))
        elif status == BillPaymentStatus.EXPIRED:
            steps.append(BillPaymentTimelineStep(
                step="expired",
                title="⏰ Expirado",
                description="Cotação expirou antes da confirmação",
                timestamp=None,
                completed=True,
                current=True,
                failed=True
            ))
        else:
            # Status intermediários - mostrar passo "Pago" como pendente
            steps.append(BillPaymentTimelineStep(
                step="paid",
                title="Boleto Pago",
                description="Aguardando confirmação do pagamento",
                timestamp=None,
                completed=False,
                current=False,
                failed=False
            ))
        
        return steps
    
    def _build_response(
        self, 
        bill_payment: WolkPayBillPayment,
        status_message: Optional[str] = None
    ) -> BillPaymentResponse:
        """Constrói response do pagamento"""
        
        # Mensagem de status padrão
        if not status_message:
            status_messages = {
                BillPaymentStatus.PENDING: "Aguardando confirmação do pagamento",
                BillPaymentStatus.CRYPTO_DEBITED: "Crypto debitada! Processando pagamento do boleto...",
                BillPaymentStatus.PROCESSING: "Processando pagamento...",
                BillPaymentStatus.PAYING: "Realizando pagamento do boleto...",
                BillPaymentStatus.PAID: "Boleto pago com sucesso!",
                BillPaymentStatus.FAILED: "Falha no pagamento. Reembolso em processamento.",
                BillPaymentStatus.REFUNDED: "Reembolso processado.",
                BillPaymentStatus.CANCELLED: "Pagamento cancelado.",
                BillPaymentStatus.EXPIRED: "Cotação expirada.",
            }
            status_message = status_messages.get(bill_payment.status, "Status desconhecido")
        
        # URLs do explorer
        crypto_tx_hash = bill_payment.internal_tx_id
        crypto_explorer_url = self._get_explorer_url(crypto_tx_hash, bill_payment.crypto_network)
        refund_explorer_url = self._get_explorer_url(bill_payment.refund_tx_id, bill_payment.crypto_network) if bill_payment.refund_tx_id else None
        
        # Construir timeline
        timeline = self._build_timeline(bill_payment)
        
        return BillPaymentResponse(
            id=str(bill_payment.id),
            payment_number=bill_payment.payment_number,
            status=BillPaymentStatusEnum(bill_payment.status.value),
            barcode=bill_payment.barcode,
            bill_amount_brl=bill_payment.bill_amount_brl,
            due_date=bill_payment.bill_due_date,
            beneficiary_name=bill_payment.bill_beneficiary_name,
            bank_name=bill_payment.bill_bank_name,
            crypto_currency=bill_payment.crypto_currency,
            crypto_amount=bill_payment.crypto_amount,
            crypto_network=bill_payment.crypto_network,
            total_amount_brl=bill_payment.total_amount_brl,
            service_fee_brl=bill_payment.service_fee_brl,
            network_fee_brl=bill_payment.network_fee_brl,
            created_at=bill_payment.created_at,
            crypto_debited_at=bill_payment.crypto_debited_at,
            paid_at=bill_payment.paid_at,
            payment_receipt_url=bill_payment.payment_receipt_url,
            bank_authentication=bill_payment.bank_authentication,
            crypto_tx_hash=crypto_tx_hash,
            crypto_explorer_url=crypto_explorer_url,
            refund_tx_id=bill_payment.refund_tx_id,
            refund_explorer_url=refund_explorer_url,
            timeline=timeline,
            status_message=status_message
        )
