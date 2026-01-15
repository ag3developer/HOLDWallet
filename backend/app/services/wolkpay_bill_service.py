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

logger = logging.getLogger(__name__)


# ============================================
# CONSTANTES
# ============================================

# Taxas
SERVICE_FEE_PERCENT = Decimal('4.75')
NETWORK_FEE_PERCENT = Decimal('0.25')
TOTAL_FEE_PERCENT = Decimal('5.00')

# Validade da cotação (5 minutos)
QUOTE_VALIDITY_MINUTES = 5

# Mínimo de dias antes do vencimento
MIN_DAYS_BEFORE_DUE = 1

# Limites
MIN_BILL_AMOUNT = Decimal('10.00')  # Mínimo R$ 10
MAX_BILL_AMOUNT = Decimal('500000.00')  # Máximo R$ 500.000

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


class WolkPayBillService:
    """Serviço para pagamento de boletos com crypto"""
    
    def __init__(self, db: Session):
        self.db = db
    
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
        request: QuoteBillPaymentRequest
    ) -> BillPaymentQuoteResponse:
        """
        Gera cotação para pagamento de boleto
        
        Calcula:
        - Valor do boleto
        - Taxas (4.75% + 0.25% = 5%)
        - Quantidade de crypto necessária
        - Verifica saldo do usuário
        
        Cotação válida por 5 minutos
        """
        try:
            # Valida boleto primeiro
            bill_info = await self.validate_bill(request.barcode)
            
            if not bill_info.valid:
                raise ValueError(bill_info.error_message or "Boleto inválido")
            
            # Busca usuário
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user:
                raise ValueError("Usuário não encontrado")
            
            # Obtém cotações
            crypto_usd_rate, brl_usd_rate = await self._get_rates(request.crypto_currency)
            
            # Calcula valores
            bill_amount = bill_info.amount_brl
            
            # Taxas
            service_fee = (bill_amount * SERVICE_FEE_PERCENT / Decimal('100')).quantize(Decimal('0.01'), rounding=ROUND_UP)
            network_fee = (bill_amount * NETWORK_FEE_PERCENT / Decimal('100')).quantize(Decimal('0.01'), rounding=ROUND_UP)
            total_fees = service_fee + network_fee
            
            # Total em BRL
            total_brl = bill_amount + total_fees
            
            # Converte para crypto
            # BRL → USD → Crypto
            total_usd = total_brl / brl_usd_rate
            crypto_amount = (total_usd / crypto_usd_rate).quantize(Decimal('0.00000001'), rounding=ROUND_UP)
            
            # Verifica saldo do usuário
            user_balance = await self._get_user_crypto_balance(user_id, request.crypto_currency)
            has_sufficient_balance = user_balance >= crypto_amount
            
            # Gera ID da cotação
            quote_id = f"qt_{uuid.uuid4().hex[:16]}"
            
            # Validade (5 minutos)
            expires_at = datetime.now(timezone.utc) + timedelta(minutes=QUOTE_VALIDITY_MINUTES)
            
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
                service_fee_percent=SERVICE_FEE_PERCENT,
                service_fee_brl=service_fee,
                network_fee_percent=NETWORK_FEE_PERCENT,
                network_fee_brl=network_fee,
                total_amount_brl=total_brl,
                status=BillPaymentStatus.PENDING,
                quote_expires_at=expires_at
            )
            
            self.db.add(bill_payment)
            self.db.commit()
            
            # Log
            await self._log_event(
                bill_payment.id,
                "quote_created",
                None,
                BillPaymentStatus.PENDING.value,
                {"quote_id": quote_id, "crypto_amount": str(crypto_amount)},
                "user",
                user_id
            )
            
            # Monta resumo para UI
            summary = {
                "bill": f"R$ {bill_amount:,.2f}",
                "fees": f"R$ {total_fees:,.2f} (5%)",
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
                service_fee_percent=SERVICE_FEE_PERCENT,
                service_fee_brl=service_fee,
                network_fee_percent=NETWORK_FEE_PERCENT,
                network_fee_brl=network_fee,
                total_fees_brl=total_fees,
                total_amount_brl=total_brl,
                total_crypto_amount=crypto_amount,
                quote_expires_at=expires_at,
                quote_valid_seconds=QUOTE_VALIDITY_MINUTES * 60,
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
        request: ConfirmBillPaymentRequest
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
            
            # Verifica saldo do usuário
            user_balance = await self._get_user_crypto_balance(
                user_id, 
                bill_payment.crypto_currency
            )
            
            if user_balance < bill_payment.crypto_amount:
                raise ValueError(
                    f"Saldo insuficiente. Necessário: {bill_payment.crypto_amount} {bill_payment.crypto_currency}. "
                    f"Disponível: {user_balance} {bill_payment.crypto_currency}"
                )
            
            # ⚠️ DEBITA CRYPTO DA CARTEIRA DO USUÁRIO
            internal_tx_id = await self._debit_user_crypto(
                user_id=user_id,
                crypto_currency=bill_payment.crypto_currency,
                amount=bill_payment.crypto_amount,
                description=f"Pagamento de boleto {bill_payment.payment_number}"
            )
            
            # Atualiza status
            old_status = bill_payment.status.value
            bill_payment.status = BillPaymentStatus.CRYPTO_DEBITED
            bill_payment.crypto_debited_at = datetime.now(timezone.utc)
            bill_payment.internal_tx_id = internal_tx_id
            
            self.db.commit()
            
            # Log
            await self._log_event(
                bill_payment.id,
                "crypto_debited",
                old_status,
                BillPaymentStatus.CRYPTO_DEBITED.value,
                {
                    "internal_tx_id": internal_tx_id,
                    "crypto_amount": str(bill_payment.crypto_amount),
                    "crypto_currency": bill_payment.crypto_currency
                },
                "system",
                None
            )
            
            logger.info(
                f"✅ Crypto debitada: {bill_payment.crypto_amount} {bill_payment.crypto_currency} "
                f"do usuário {user_id} para pagamento {bill_payment.payment_number}"
            )
            
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
        notes: Optional[str] = None
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
            
            # Log
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
                operator_id
            )
            
            logger.info(f"✅ Boleto pago: {bill_payment.payment_number} por operador {operator_id}")
            
            # TODO: Enviar notificação ao usuário
            
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
        reason: str
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
            
            # Log
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
                operator_id
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
    
    async def _get_user_crypto_balance(self, user_id: str, crypto_currency: str) -> Decimal:
        """
        Obtém saldo de crypto do usuário usando WalletBalanceService
        """
        try:
            balance_data = WalletBalanceService.get_balance(
                db=self.db,
                user_id=user_id,
                cryptocurrency=crypto_currency.upper()
            )
            
            if balance_data:
                available = Decimal(str(balance_data.get('available_balance', 0)))
                logger.info(f"💰 Saldo {crypto_currency} do usuário {user_id}: {available}")
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
        description: str
    ) -> str:
        """
        Debita crypto da carteira do usuário e TRANSFERE para carteira do sistema
        
        Fluxo:
        1. Congela (freeze) o valor na carteira do usuário
        2. Transfere IMEDIATAMENTE para carteira do sistema (SYSTEM_BLOCKCHAIN_WALLET_ID)
        
        A crypto sai da carteira do usuário no momento da confirmação!
        
        Returns:
            ID da transação interna
        """
        from app.core.config import settings
        
        tx_id = f"billpay_debit_{uuid.uuid4().hex[:16]}"
        system_wallet_id = settings.SYSTEM_BLOCKCHAIN_WALLET_ID
        
        try:
            # 1. Congela o valor na carteira do usuário
            logger.info(f"🔒 Congelando {amount} {crypto_currency} do usuário {user_id}...")
            
            freeze_result = WalletBalanceService.freeze_balance(
                db=self.db,
                user_id=user_id,
                cryptocurrency=crypto_currency.upper(),
                amount=float(amount),
                reason=f"Bill Payment: {description}",
                reference_id=tx_id
            )
            
            logger.info(
                f"✅ Crypto congelada: {amount} {crypto_currency}. "
                f"Saldo disponível: {freeze_result.get('available_balance', 0)}"
            )
            
            # 2. Transfere IMEDIATAMENTE para carteira do sistema
            logger.info(f"💸 Transferindo {amount} {crypto_currency} para carteira do sistema...")
            
            transfer_result = WalletBalanceService.transfer_balance(
                db=self.db,
                from_user_id=user_id,
                to_user_id=system_wallet_id,
                cryptocurrency=crypto_currency.upper(),
                amount=float(amount),
                reason=f"Bill Payment Transfer: {description}",
                reference_id=tx_id
            )
            
            logger.info(
                f"✅ Crypto transferida para sistema: {amount} {crypto_currency}. "
                f"TX: {tx_id}. Sistema recebeu: {transfer_result.get('available_balance', amount)}"
            )
            
            return tx_id
            
        except ValueError as e:
            logger.error(f"❌ Falha ao debitar crypto: {e}")
            # Se falhou no transfer, tenta descongelar
            try:
                WalletBalanceService.unfreeze_balance(
                    db=self.db,
                    user_id=user_id,
                    cryptocurrency=crypto_currency.upper(),
                    amount=float(amount),
                    reason=f"Rollback: {str(e)}",
                    reference_id=f"{tx_id}_rollback"
                )
            except Exception:
                pass  # Se não conseguir descongelar, log já foi feito
            raise
        except Exception as e:
            logger.error(f"❌ Erro inesperado ao debitar crypto: {e}")
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
        
        Transfere da carteira do sistema de volta para o usuário
        
        Returns:
            ID da transação interna
        """
        from app.core.config import settings
        
        tx_id = f"billpay_refund_{uuid.uuid4().hex[:16]}"
        system_wallet_id = settings.SYSTEM_BLOCKCHAIN_WALLET_ID
        
        try:
            # 1. Primeiro congela na carteira do sistema (para poder transferir)
            logger.info(f"🔒 Preparando reembolso de {amount} {crypto_currency} para usuário {user_id}...")
            
            WalletBalanceService.freeze_balance(
                db=self.db,
                user_id=system_wallet_id,
                cryptocurrency=crypto_currency.upper(),
                amount=float(amount),
                reason=f"Bill Payment Refund Preparation: {description}",
                reference_id=f"{tx_id}_prep"
            )
            
            # 2. Transfere do sistema para o usuário
            logger.info(f"💸 Transferindo {amount} {crypto_currency} de volta para usuário {user_id}...")
            
            result = WalletBalanceService.transfer_balance(
                db=self.db,
                from_user_id=system_wallet_id,
                to_user_id=user_id,
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
        actor_id: Optional[str]
    ):
        """Registra evento no log"""
        try:
            log = WolkPayBillPaymentLog(
                id=str(uuid.uuid4()),
                bill_payment_id=bill_payment_id,
                event=event,
                old_status=old_status,
                new_status=new_status,
                details=json.dumps(details) if details else None,
                actor_type=actor_type,
                actor_id=actor_id
            )
            self.db.add(log)
            self.db.commit()
        except Exception as e:
            logger.error(f"Erro ao registrar log: {e}")
    
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
        
        return BillPaymentResponse(
            id=bill_payment.id,
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
            status_message=status_message
        )
