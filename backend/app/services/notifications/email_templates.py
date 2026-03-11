"""
WOLK NOW - Email Templates
===========================

Templates HTML centralizados para todos os emails da plataforma.
Traduções em PT, EN, ES.

Author: WOLK NOW LLC
"""

from datetime import datetime
from typing import Optional, Dict, Any


# ============================================
# TRADUÇÕES
# ============================================

TRANSLATIONS = {
    "pt": {
        # Geral
        "company_name": "WOLK NOW",
        "all_rights_reserved": "Todos os direitos reservados",
        "auto_email": "Este e um email automatico. Responda se precisar de ajuda.",
        "website": "Website",
        "support": "Suporte",
        "terms": "Termos",
        "view_details": "Ver Detalhes",
        "transaction_id": "ID da Transacao",
        "date_time": "Data/Hora",
        "amount": "Valor",
        "status": "Status",
        "completed": "Concluido",
        "pending": "Pendente",
        "failed": "Falhou",
        "cancelled": "Cancelado",
        "processing": "Processando",
        
        # Trading/P2P
        "trade_created_subject": "Nova ordem P2P criada - WOLK NOW",
        "trade_created_title": "Ordem P2P Criada",
        "trade_created_message": "Sua ordem P2P foi criada com sucesso.",
        "trade_type": "Tipo",
        "trade_buy": "Compra",
        "trade_sell": "Venda",
        "crypto_amount": "Quantidade Crypto",
        "fiat_amount": "Valor em {currency}",
        "price_per_unit": "Preco por unidade",
        "payment_method": "Metodo de Pagamento",
        "order_expires": "A ordem expira em {hours} horas.",
        
        "trade_match_subject": "Novo match na sua ordem P2P - WOLK NOW",
        "trade_match_title": "Voce tem um Match!",
        "trade_match_message": "Alguem quer negociar com voce.",
        "counterparty": "Contraparte",
        "trade_match_action": "Acesse a plataforma para continuar a negociacao.",
        
        "payment_sent_subject": "Pagamento marcado como enviado - WOLK NOW",
        "payment_sent_title": "Pagamento Enviado",
        "payment_sent_message": "O comprador marcou o pagamento como enviado.",
        "payment_sent_seller_action": "Verifique sua conta bancaria e confirme o recebimento.",
        "payment_sent_buyer_message": "Voce marcou o pagamento como enviado. Aguarde a confirmacao do vendedor.",
        
        "payment_confirmed_subject": "Pagamento confirmado - WOLK NOW",
        "payment_confirmed_title": "Pagamento Confirmado!",
        "payment_confirmed_message": "O vendedor confirmou o recebimento do pagamento.",
        "crypto_released": "As criptomoedas foram liberadas para sua carteira.",
        
        "trade_completed_subject": "Trade concluido com sucesso - WOLK NOW",
        "trade_completed_title": "Trade Concluido!",
        "trade_completed_message": "Sua negociacao P2P foi finalizada com sucesso.",
        "trade_summary": "Resumo da Operacao",
        "trade_completed_thanks": "Obrigado por usar a WOLK NOW!",
        
        "trade_cancelled_subject": "Trade cancelado - WOLK NOW",
        "trade_cancelled_title": "Trade Cancelado",
        "trade_cancelled_message": "A negociacao P2P foi cancelada.",
        "cancellation_reason": "Motivo",
        "trade_cancelled_refund": "Se houve valores envolvidos, serao reembolsados.",
        
        "dispute_opened_subject": "Disputa aberta no trade - WOLK NOW",
        "dispute_opened_title": "Disputa Aberta",
        "dispute_opened_message": "Uma disputa foi aberta nesta negociacao.",
        "dispute_id": "ID da Disputa",
        "dispute_reason": "Motivo da Disputa",
        "dispute_action": "Nossa equipe ira analisar o caso em ate 24 horas.",
        
        "dispute_resolved_subject": "Disputa resolvida - WOLK NOW",
        "dispute_resolved_title": "Disputa Resolvida",
        "dispute_resolved_message": "A disputa foi analisada e resolvida.",
        "dispute_resolution": "Resolucao",
        
        # Instant Trade
        "instant_buy_subject": "Compra instantanea concluida - WOLK NOW",
        "instant_buy_title": "Compra Concluida!",
        "instant_buy_message": "Sua compra instantanea foi processada com sucesso.",
        "you_bought": "Voce comprou",
        "you_paid": "Voce pagou",
        "crypto_credited": "As criptomoedas foram creditadas na sua carteira.",
        
        "instant_sell_subject": "Venda instantanea concluida - WOLK NOW",
        "instant_sell_title": "Venda Concluida!",
        "instant_sell_message": "Sua venda instantanea foi processada com sucesso.",
        "you_sold": "Voce vendeu",
        "you_received": "Voce recebeu",
        "pix_credited": "O valor foi enviado para sua conta via PIX.",
        
        # WolkPay
        "invoice_created_subject": "Fatura WolkPay criada - WOLK NOW",
        "invoice_created_title": "Fatura Criada",
        "invoice_created_message": "Sua fatura WolkPay foi criada com sucesso.",
        "invoice_id": "ID da Fatura",
        "invoice_amount": "Valor",
        "invoice_description": "Descricao",
        "payment_link": "Link de Pagamento",
        "invoice_expires": "Esta fatura expira em {hours} horas.",
        "share_link": "Compartilhe o link com seu cliente para receber o pagamento.",
        
        "invoice_paid_subject": "Fatura WolkPay paga - WOLK NOW",
        "invoice_paid_title": "Pagamento Recebido!",
        "invoice_paid_message": "Sua fatura WolkPay foi paga.",
        "payer_info": "Informacoes do Pagador",
        "payer_email": "Email",
        "crypto_received": "Crypto Recebido",
        "invoice_paid_credited": "O valor foi creditado na sua carteira WOLK NOW.",
        
        "invoice_expired_subject": "Fatura WolkPay expirada - WOLK NOW",
        "invoice_expired_title": "Fatura Expirada",
        "invoice_expired_message": "Sua fatura WolkPay expirou sem receber pagamento.",
        "invoice_expired_tip": "Voce pode criar uma nova fatura se ainda precisar receber o pagamento.",
        
        # Bill Payment (Boletos)
        "bill_processing_subject": "Pagamento de boleto em processamento - WOLK NOW",
        "bill_processing_title": "Boleto em Processamento",
        "bill_processing_message": "Seu pagamento de boleto esta sendo processado.",
        "bill_barcode": "Codigo de Barras",
        "bill_beneficiary": "Beneficiario",
        "bill_due_date": "Vencimento",
        "crypto_deducted": "Crypto Debitado",
        "bill_processing_time": "O pagamento sera confirmado em ate 3 dias uteis.",
        
        "bill_paid_subject": "Boleto pago com sucesso - WOLK NOW",
        "bill_paid_title": "Boleto Pago!",
        "bill_paid_message": "Seu boleto foi pago com sucesso.",
        "bill_paid_confirmation": "Confirmacao do Pagamento",
        "authentication_code": "Codigo de Autenticacao",
        "bill_paid_receipt": "Guarde este email como comprovante.",
        
        "bill_failed_subject": "Falha no pagamento do boleto - WOLK NOW",
        "bill_failed_title": "Pagamento Falhou",
        "bill_failed_message": "Nao foi possivel processar o pagamento do seu boleto.",
        "failure_reason": "Motivo",
        "bill_failed_refund": "Se houve debito de crypto, o valor sera estornado em ate 24h.",
        "bill_failed_retry": "Voce pode tentar novamente ou entrar em contato com o suporte.",
        
        # Wallet
        "deposit_received_subject": "Deposito recebido - WOLK NOW",
        "deposit_received_title": "Deposito Confirmado!",
        "deposit_received_message": "Seu deposito de criptomoeda foi confirmado.",
        "deposit_amount": "Valor Depositado",
        "deposit_network": "Rede",
        "deposit_txhash": "Hash da Transacao",
        "deposit_confirmations": "Confirmacoes",
        "new_balance": "Novo Saldo",
        
        "withdrawal_requested_subject": "Saque solicitado - WOLK NOW",
        "withdrawal_requested_title": "Saque Solicitado",
        "withdrawal_requested_message": "Sua solicitacao de saque foi recebida.",
        "withdrawal_amount": "Valor do Saque",
        "withdrawal_address": "Endereco de Destino",
        "withdrawal_fee": "Taxa de Rede",
        "withdrawal_processing": "O saque sera processado em breve.",
        "withdrawal_not_you": "Se voce nao solicitou este saque, entre em contato imediatamente.",
        
        "withdrawal_completed_subject": "Saque concluido - WOLK NOW",
        "withdrawal_completed_title": "Saque Enviado!",
        "withdrawal_completed_message": "Seu saque foi processado e enviado.",
        "withdrawal_txhash": "Hash da Transacao",
        "withdrawal_completed_check": "Verifique sua carteira de destino.",
        
        "withdrawal_failed_subject": "Saque falhou - WOLK NOW",
        "withdrawal_failed_title": "Saque Falhou",
        "withdrawal_failed_message": "Nao foi possivel processar seu saque.",
        "withdrawal_failed_refund": "O valor foi estornado para sua carteira WOLK NOW.",
        
        # Account
        "welcome_subject": "Bem-vindo a WOLK NOW!",
        "welcome_title": "Bem-vindo!",
        "welcome_message": "Sua conta foi criada com sucesso.",
        "welcome_intro": "Estamos felizes em te-lo conosco!",
        "welcome_features": "Com a WOLK NOW voce pode:",
        "welcome_feature_1": "Comprar e vender criptomoedas",
        "welcome_feature_2": "Negociar P2P com seguranca",
        "welcome_feature_3": "Pagar boletos com crypto",
        "welcome_feature_4": "Receber pagamentos via WolkPay",
        "welcome_verify": "Para aproveitar todos os recursos, verifique seu email.",
        "welcome_button": "Acessar Minha Conta",
        
        "kyc_approved_subject": "Verificacao KYC aprovada - WOLK NOW",
        "kyc_approved_title": "KYC Aprovado!",
        "kyc_approved_message": "Sua verificacao de identidade foi aprovada.",
        "kyc_level": "Nivel de Verificacao",
        "kyc_approved_limits": "Agora voce tem acesso a limites maiores de transacao.",
        
        "kyc_rejected_subject": "Verificacao KYC nao aprovada - WOLK NOW",
        "kyc_rejected_title": "KYC Nao Aprovado",
        "kyc_rejected_message": "Sua verificacao de identidade nao foi aprovada.",
        "kyc_rejection_reason": "Motivo",
        "kyc_rejected_retry": "Voce pode enviar novos documentos para uma nova analise.",
    },
    
    "en": {
        # General
        "company_name": "WOLK NOW",
        "all_rights_reserved": "All rights reserved",
        "auto_email": "This is an automated email. Reply if you need help.",
        "website": "Website",
        "support": "Support",
        "terms": "Terms",
        "view_details": "View Details",
        "transaction_id": "Transaction ID",
        "date_time": "Date/Time",
        "amount": "Amount",
        "status": "Status",
        "completed": "Completed",
        "pending": "Pending",
        "failed": "Failed",
        "cancelled": "Cancelled",
        "processing": "Processing",
        
        # Trading/P2P
        "trade_created_subject": "New P2P order created - WOLK NOW",
        "trade_created_title": "P2P Order Created",
        "trade_created_message": "Your P2P order was created successfully.",
        "trade_type": "Type",
        "trade_buy": "Buy",
        "trade_sell": "Sell",
        "crypto_amount": "Crypto Amount",
        "fiat_amount": "Amount in {currency}",
        "price_per_unit": "Price per unit",
        "payment_method": "Payment Method",
        "order_expires": "The order expires in {hours} hours.",
        
        "trade_match_subject": "New match on your P2P order - WOLK NOW",
        "trade_match_title": "You have a Match!",
        "trade_match_message": "Someone wants to trade with you.",
        "counterparty": "Counterparty",
        "trade_match_action": "Access the platform to continue the negotiation.",
        
        "payment_sent_subject": "Payment marked as sent - WOLK NOW",
        "payment_sent_title": "Payment Sent",
        "payment_sent_message": "The buyer marked the payment as sent.",
        "payment_sent_seller_action": "Check your bank account and confirm receipt.",
        "payment_sent_buyer_message": "You marked the payment as sent. Wait for the seller's confirmation.",
        
        "payment_confirmed_subject": "Payment confirmed - WOLK NOW",
        "payment_confirmed_title": "Payment Confirmed!",
        "payment_confirmed_message": "The seller confirmed receipt of payment.",
        "crypto_released": "The cryptocurrencies have been released to your wallet.",
        
        "trade_completed_subject": "Trade completed successfully - WOLK NOW",
        "trade_completed_title": "Trade Completed!",
        "trade_completed_message": "Your P2P trade was successfully completed.",
        "trade_summary": "Trade Summary",
        "trade_completed_thanks": "Thank you for using WOLK NOW!",
        
        "trade_cancelled_subject": "Trade cancelled - WOLK NOW",
        "trade_cancelled_title": "Trade Cancelled",
        "trade_cancelled_message": "The P2P trade was cancelled.",
        "cancellation_reason": "Reason",
        "trade_cancelled_refund": "If there were values involved, they will be refunded.",
        
        "dispute_opened_subject": "Dispute opened on trade - WOLK NOW",
        "dispute_opened_title": "Dispute Opened",
        "dispute_opened_message": "A dispute has been opened on this trade.",
        "dispute_id": "Dispute ID",
        "dispute_reason": "Dispute Reason",
        "dispute_action": "Our team will analyze the case within 24 hours.",
        
        "dispute_resolved_subject": "Dispute resolved - WOLK NOW",
        "dispute_resolved_title": "Dispute Resolved",
        "dispute_resolved_message": "The dispute has been analyzed and resolved.",
        "dispute_resolution": "Resolution",
        
        # Instant Trade
        "instant_buy_subject": "Instant purchase completed - WOLK NOW",
        "instant_buy_title": "Purchase Completed!",
        "instant_buy_message": "Your instant purchase was processed successfully.",
        "you_bought": "You bought",
        "you_paid": "You paid",
        "crypto_credited": "The cryptocurrencies have been credited to your wallet.",
        
        "instant_sell_subject": "Instant sale completed - WOLK NOW",
        "instant_sell_title": "Sale Completed!",
        "instant_sell_message": "Your instant sale was processed successfully.",
        "you_sold": "You sold",
        "you_received": "You received",
        "pix_credited": "The amount was sent to your account via PIX.",
        
        # WolkPay
        "invoice_created_subject": "WolkPay invoice created - WOLK NOW",
        "invoice_created_title": "Invoice Created",
        "invoice_created_message": "Your WolkPay invoice was created successfully.",
        "invoice_id": "Invoice ID",
        "invoice_amount": "Amount",
        "invoice_description": "Description",
        "payment_link": "Payment Link",
        "invoice_expires": "This invoice expires in {hours} hours.",
        "share_link": "Share the link with your customer to receive payment.",
        
        "invoice_paid_subject": "WolkPay invoice paid - WOLK NOW",
        "invoice_paid_title": "Payment Received!",
        "invoice_paid_message": "Your WolkPay invoice has been paid.",
        "payer_info": "Payer Information",
        "payer_email": "Email",
        "crypto_received": "Crypto Received",
        "invoice_paid_credited": "The amount has been credited to your WOLK NOW wallet.",
        
        "invoice_expired_subject": "WolkPay invoice expired - WOLK NOW",
        "invoice_expired_title": "Invoice Expired",
        "invoice_expired_message": "Your WolkPay invoice expired without receiving payment.",
        "invoice_expired_tip": "You can create a new invoice if you still need to receive payment.",
        
        # Bill Payment
        "bill_processing_subject": "Bill payment processing - WOLK NOW",
        "bill_processing_title": "Bill Processing",
        "bill_processing_message": "Your bill payment is being processed.",
        "bill_barcode": "Barcode",
        "bill_beneficiary": "Beneficiary",
        "bill_due_date": "Due Date",
        "crypto_deducted": "Crypto Deducted",
        "bill_processing_time": "Payment will be confirmed within 3 business days.",
        
        "bill_paid_subject": "Bill paid successfully - WOLK NOW",
        "bill_paid_title": "Bill Paid!",
        "bill_paid_message": "Your bill was paid successfully.",
        "bill_paid_confirmation": "Payment Confirmation",
        "authentication_code": "Authentication Code",
        "bill_paid_receipt": "Keep this email as your receipt.",
        
        "bill_failed_subject": "Bill payment failed - WOLK NOW",
        "bill_failed_title": "Payment Failed",
        "bill_failed_message": "We were unable to process your bill payment.",
        "failure_reason": "Reason",
        "bill_failed_refund": "If crypto was debited, it will be refunded within 24h.",
        "bill_failed_retry": "You can try again or contact support.",
        
        # Wallet
        "deposit_received_subject": "Deposit received - WOLK NOW",
        "deposit_received_title": "Deposit Confirmed!",
        "deposit_received_message": "Your cryptocurrency deposit has been confirmed.",
        "deposit_amount": "Deposited Amount",
        "deposit_network": "Network",
        "deposit_txhash": "Transaction Hash",
        "deposit_confirmations": "Confirmations",
        "new_balance": "New Balance",
        
        "withdrawal_requested_subject": "Withdrawal requested - WOLK NOW",
        "withdrawal_requested_title": "Withdrawal Requested",
        "withdrawal_requested_message": "Your withdrawal request has been received.",
        "withdrawal_amount": "Withdrawal Amount",
        "withdrawal_address": "Destination Address",
        "withdrawal_fee": "Network Fee",
        "withdrawal_processing": "The withdrawal will be processed shortly.",
        "withdrawal_not_you": "If you did not request this withdrawal, contact us immediately.",
        
        "withdrawal_completed_subject": "Withdrawal completed - WOLK NOW",
        "withdrawal_completed_title": "Withdrawal Sent!",
        "withdrawal_completed_message": "Your withdrawal has been processed and sent.",
        "withdrawal_txhash": "Transaction Hash",
        "withdrawal_completed_check": "Check your destination wallet.",
        
        "withdrawal_failed_subject": "Withdrawal failed - WOLK NOW",
        "withdrawal_failed_title": "Withdrawal Failed",
        "withdrawal_failed_message": "We were unable to process your withdrawal.",
        "withdrawal_failed_refund": "The amount has been refunded to your WOLK NOW wallet.",
        
        # Account
        "welcome_subject": "Welcome to WOLK NOW!",
        "welcome_title": "Welcome!",
        "welcome_message": "Your account was created successfully.",
        "welcome_intro": "We're happy to have you with us!",
        "welcome_features": "With WOLK NOW you can:",
        "welcome_feature_1": "Buy and sell cryptocurrencies",
        "welcome_feature_2": "Trade P2P securely",
        "welcome_feature_3": "Pay bills with crypto",
        "welcome_feature_4": "Receive payments via WolkPay",
        "welcome_verify": "To enjoy all features, verify your email.",
        "welcome_button": "Access My Account",
        
        "kyc_approved_subject": "KYC verification approved - WOLK NOW",
        "kyc_approved_title": "KYC Approved!",
        "kyc_approved_message": "Your identity verification has been approved.",
        "kyc_level": "Verification Level",
        "kyc_approved_limits": "You now have access to higher transaction limits.",
        
        "kyc_rejected_subject": "KYC verification not approved - WOLK NOW",
        "kyc_rejected_title": "KYC Not Approved",
        "kyc_rejected_message": "Your identity verification was not approved.",
        "kyc_rejection_reason": "Reason",
        "kyc_rejected_retry": "You can submit new documents for a new review.",
    },
    
    "es": {
        # General
        "company_name": "WOLK NOW",
        "all_rights_reserved": "Todos los derechos reservados",
        "auto_email": "Este es un correo automatico. Responde si necesitas ayuda.",
        "website": "Sitio Web",
        "support": "Soporte",
        "terms": "Terminos",
        "view_details": "Ver Detalles",
        "transaction_id": "ID de Transaccion",
        "date_time": "Fecha/Hora",
        "amount": "Monto",
        "status": "Estado",
        "completed": "Completado",
        "pending": "Pendiente",
        "failed": "Fallido",
        "cancelled": "Cancelado",
        "processing": "Procesando",
        
        # Trading/P2P
        "trade_created_subject": "Nueva orden P2P creada - WOLK NOW",
        "trade_created_title": "Orden P2P Creada",
        "trade_created_message": "Tu orden P2P fue creada exitosamente.",
        "trade_type": "Tipo",
        "trade_buy": "Compra",
        "trade_sell": "Venta",
        "crypto_amount": "Cantidad Crypto",
        "fiat_amount": "Monto en {currency}",
        "price_per_unit": "Precio por unidad",
        "payment_method": "Metodo de Pago",
        "order_expires": "La orden expira en {hours} horas.",
        
        "trade_match_subject": "Nuevo match en tu orden P2P - WOLK NOW",
        "trade_match_title": "Tienes un Match!",
        "trade_match_message": "Alguien quiere negociar contigo.",
        "counterparty": "Contraparte",
        "trade_match_action": "Accede a la plataforma para continuar la negociacion.",
        
        "payment_sent_subject": "Pago marcado como enviado - WOLK NOW",
        "payment_sent_title": "Pago Enviado",
        "payment_sent_message": "El comprador marco el pago como enviado.",
        "payment_sent_seller_action": "Verifica tu cuenta bancaria y confirma la recepcion.",
        "payment_sent_buyer_message": "Marcaste el pago como enviado. Espera la confirmacion del vendedor.",
        
        "payment_confirmed_subject": "Pago confirmado - WOLK NOW",
        "payment_confirmed_title": "Pago Confirmado!",
        "payment_confirmed_message": "El vendedor confirmo la recepcion del pago.",
        "crypto_released": "Las criptomonedas fueron liberadas a tu billetera.",
        
        "trade_completed_subject": "Trade completado exitosamente - WOLK NOW",
        "trade_completed_title": "Trade Completado!",
        "trade_completed_message": "Tu negociacion P2P fue completada exitosamente.",
        "trade_summary": "Resumen de la Operacion",
        "trade_completed_thanks": "Gracias por usar WOLK NOW!",
        
        "trade_cancelled_subject": "Trade cancelado - WOLK NOW",
        "trade_cancelled_title": "Trade Cancelado",
        "trade_cancelled_message": "La negociacion P2P fue cancelada.",
        "cancellation_reason": "Motivo",
        "trade_cancelled_refund": "Si hubo valores involucrados, seran reembolsados.",
        
        "dispute_opened_subject": "Disputa abierta en el trade - WOLK NOW",
        "dispute_opened_title": "Disputa Abierta",
        "dispute_opened_message": "Una disputa fue abierta en esta negociacion.",
        "dispute_id": "ID de la Disputa",
        "dispute_reason": "Motivo de la Disputa",
        "dispute_action": "Nuestro equipo analizara el caso en hasta 24 horas.",
        
        "dispute_resolved_subject": "Disputa resuelta - WOLK NOW",
        "dispute_resolved_title": "Disputa Resuelta",
        "dispute_resolved_message": "La disputa fue analizada y resuelta.",
        "dispute_resolution": "Resolucion",
        
        # Instant Trade
        "instant_buy_subject": "Compra instantanea completada - WOLK NOW",
        "instant_buy_title": "Compra Completada!",
        "instant_buy_message": "Tu compra instantanea fue procesada exitosamente.",
        "you_bought": "Compraste",
        "you_paid": "Pagaste",
        "crypto_credited": "Las criptomonedas fueron acreditadas en tu billetera.",
        
        "instant_sell_subject": "Venta instantanea completada - WOLK NOW",
        "instant_sell_title": "Venta Completada!",
        "instant_sell_message": "Tu venta instantanea fue procesada exitosamente.",
        "you_sold": "Vendiste",
        "you_received": "Recibiste",
        "pix_credited": "El monto fue enviado a tu cuenta via PIX.",
        
        # WolkPay
        "invoice_created_subject": "Factura WolkPay creada - WOLK NOW",
        "invoice_created_title": "Factura Creada",
        "invoice_created_message": "Tu factura WolkPay fue creada exitosamente.",
        "invoice_id": "ID de la Factura",
        "invoice_amount": "Monto",
        "invoice_description": "Descripcion",
        "payment_link": "Link de Pago",
        "invoice_expires": "Esta factura expira en {hours} horas.",
        "share_link": "Comparte el link con tu cliente para recibir el pago.",
        
        "invoice_paid_subject": "Factura WolkPay pagada - WOLK NOW",
        "invoice_paid_title": "Pago Recibido!",
        "invoice_paid_message": "Tu factura WolkPay fue pagada.",
        "payer_info": "Informacion del Pagador",
        "payer_email": "Email",
        "crypto_received": "Crypto Recibido",
        "invoice_paid_credited": "El monto fue acreditado en tu billetera WOLK NOW.",
        
        "invoice_expired_subject": "Factura WolkPay expirada - WOLK NOW",
        "invoice_expired_title": "Factura Expirada",
        "invoice_expired_message": "Tu factura WolkPay expiro sin recibir pago.",
        "invoice_expired_tip": "Puedes crear una nueva factura si aun necesitas recibir el pago.",
        
        # Bill Payment
        "bill_processing_subject": "Pago de boleto en procesamiento - WOLK NOW",
        "bill_processing_title": "Boleto en Procesamiento",
        "bill_processing_message": "Tu pago de boleto esta siendo procesado.",
        "bill_barcode": "Codigo de Barras",
        "bill_beneficiary": "Beneficiario",
        "bill_due_date": "Vencimiento",
        "crypto_deducted": "Crypto Debitado",
        "bill_processing_time": "El pago sera confirmado en hasta 3 dias habiles.",
        
        "bill_paid_subject": "Boleto pagado exitosamente - WOLK NOW",
        "bill_paid_title": "Boleto Pagado!",
        "bill_paid_message": "Tu boleto fue pagado exitosamente.",
        "bill_paid_confirmation": "Confirmacion del Pago",
        "authentication_code": "Codigo de Autenticacion",
        "bill_paid_receipt": "Guarda este email como comprobante.",
        
        "bill_failed_subject": "Fallo en el pago del boleto - WOLK NOW",
        "bill_failed_title": "Pago Fallido",
        "bill_failed_message": "No fue posible procesar el pago de tu boleto.",
        "failure_reason": "Motivo",
        "bill_failed_refund": "Si hubo debito de crypto, el valor sera devuelto en hasta 24h.",
        "bill_failed_retry": "Puedes intentar nuevamente o contactar al soporte.",
        
        # Wallet
        "deposit_received_subject": "Deposito recibido - WOLK NOW",
        "deposit_received_title": "Deposito Confirmado!",
        "deposit_received_message": "Tu deposito de criptomoneda fue confirmado.",
        "deposit_amount": "Monto Depositado",
        "deposit_network": "Red",
        "deposit_txhash": "Hash de la Transaccion",
        "deposit_confirmations": "Confirmaciones",
        "new_balance": "Nuevo Saldo",
        
        "withdrawal_requested_subject": "Retiro solicitado - WOLK NOW",
        "withdrawal_requested_title": "Retiro Solicitado",
        "withdrawal_requested_message": "Tu solicitud de retiro fue recibida.",
        "withdrawal_amount": "Monto del Retiro",
        "withdrawal_address": "Direccion de Destino",
        "withdrawal_fee": "Tarifa de Red",
        "withdrawal_processing": "El retiro sera procesado en breve.",
        "withdrawal_not_you": "Si no solicitaste este retiro, contactanos inmediatamente.",
        
        "withdrawal_completed_subject": "Retiro completado - WOLK NOW",
        "withdrawal_completed_title": "Retiro Enviado!",
        "withdrawal_completed_message": "Tu retiro fue procesado y enviado.",
        "withdrawal_txhash": "Hash de la Transaccion",
        "withdrawal_completed_check": "Verifica tu billetera de destino.",
        
        "withdrawal_failed_subject": "Retiro fallido - WOLK NOW",
        "withdrawal_failed_title": "Retiro Fallido",
        "withdrawal_failed_message": "No fue posible procesar tu retiro.",
        "withdrawal_failed_refund": "El monto fue devuelto a tu billetera WOLK NOW.",
        
        # Account
        "welcome_subject": "Bienvenido a WOLK NOW!",
        "welcome_title": "Bienvenido!",
        "welcome_message": "Tu cuenta fue creada exitosamente.",
        "welcome_intro": "Estamos felices de tenerte con nosotros!",
        "welcome_features": "Con WOLK NOW puedes:",
        "welcome_feature_1": "Comprar y vender criptomonedas",
        "welcome_feature_2": "Negociar P2P con seguridad",
        "welcome_feature_3": "Pagar boletos con crypto",
        "welcome_feature_4": "Recibir pagos via WolkPay",
        "welcome_verify": "Para disfrutar todas las funciones, verifica tu email.",
        "welcome_button": "Acceder a Mi Cuenta",
        
        "kyc_approved_subject": "Verificacion KYC aprobada - WOLK NOW",
        "kyc_approved_title": "KYC Aprobado!",
        "kyc_approved_message": "Tu verificacion de identidad fue aprobada.",
        "kyc_level": "Nivel de Verificacion",
        "kyc_approved_limits": "Ahora tienes acceso a limites de transaccion mayores.",
        
        "kyc_rejected_subject": "Verificacion KYC no aprobada - WOLK NOW",
        "kyc_rejected_title": "KYC No Aprobado",
        "kyc_rejected_message": "Tu verificacion de identidad no fue aprobada.",
        "kyc_rejection_reason": "Motivo",
        "kyc_rejected_retry": "Puedes enviar nuevos documentos para una nueva revision.",
    }
}


class EmailTemplates:
    """
    Classe para gerar templates HTML de email.
    """
    
    SUPPORTED_LANGUAGES = ["pt", "en", "es"]
    DEFAULT_LANGUAGE = "pt"
    
    # Estilos inline para compatibilidade com clientes de email
    BUTTON_STYLE = "display: inline-block; background-color: #6366f1; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 20px 0; font-size: 14px;"
    SUCCESS_BOX_STYLE = "background-color: #ecfdf5; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;"
    SUCCESS_TEXT_STYLE = "color: #065f46; font-weight: 600; margin: 0; font-size: 18px;"
    WARNING_BOX_STYLE = "background-color: #fef3c7; border: 1px solid #fde68a; padding: 16px; margin: 20px 0; border-radius: 8px;"
    WARNING_TEXT_STYLE = "color: #92400e; margin: 0;"
    INFO_BOX_STYLE = "background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 16px; margin: 20px 0; border-radius: 8px;"
    INFO_TEXT_STYLE = "color: #1e40af; margin: 0;"
    ERROR_BOX_STYLE = "background-color: #fef2f2; border: 1px solid #fecaca; padding: 16px; margin: 20px 0; border-radius: 8px;"
    ERROR_TEXT_STYLE = "color: #991b1b; margin: 0;"
    DATA_TABLE_STYLE = "background-color: #f9fafb; border-radius: 8px; padding: 16px; margin: 20px 0;"
    DATA_ROW_STYLE = "padding: 10px 0; border-bottom: 1px solid #e5e7eb;"
    DATA_LABEL_STYLE = "color: #6b7280; font-size: 13px; display: inline-block; min-width: 140px;"
    DATA_VALUE_STYLE = "color: #1f2937; font-weight: 500; font-size: 14px;"
    
    @classmethod
    def get_translation(cls, key: str, language: str = "pt", **kwargs) -> str:
        """Obtem traducao com fallback para portugues."""
        lang = language if language in cls.SUPPORTED_LANGUAGES else cls.DEFAULT_LANGUAGE
        translations = TRANSLATIONS.get(lang, TRANSLATIONS["pt"])
        text = translations.get(key, TRANSLATIONS["pt"].get(key, key))
        
        if kwargs:
            try:
                text = text.format(**kwargs)
            except KeyError:
                pass
        
        return text
    
    @classmethod
    def t(cls, key: str, language: str = "pt", **kwargs) -> str:
        """Atalho para get_translation."""
        return cls.get_translation(key, language, **kwargs)
    
    @classmethod
    def get_base_template(cls, title: str, content: str, language: str = "pt") -> str:
        """Gera template HTML base."""
        year = datetime.now().year
        t = lambda key, **kw: cls.t(key, language, **kw)
        
        return f"""<!DOCTYPE html>
<html lang="{language}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }}
        .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }}
        .header {{ background-color: #6366f1; padding: 30px; text-align: center; }}
        .header h1 {{ color: white; margin: 0; font-size: 24px; font-weight: 600; }}
        .content {{ padding: 32px; }}
        .content h2 {{ color: #1f2937; margin-top: 0; font-size: 20px; font-weight: 600; }}
        .content p {{ color: #4b5563; line-height: 1.7; margin: 12px 0; }}
        .footer {{ background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb; }}
        .footer p {{ color: #9ca3af; font-size: 12px; margin: 4px 0; }}
        .footer-links {{ margin: 12px 0; }}
        .footer-links a {{ margin: 0 12px; color: #6b7280; text-decoration: none; font-size: 13px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{t("company_name")}</h1>
        </div>
        <div class="content">
            {content}
        </div>
        <div class="footer">
            <div class="footer-links">
                <a href="https://wolknow.com">{t("website")}</a>
                <a href="https://wolknow.com/support">{t("support")}</a>
                <a href="https://wolknow.com/terms">{t("terms")}</a>
            </div>
            <p>&copy; {year} WOLK NOW LLC. {t("all_rights_reserved")}.</p>
            <p>{t("auto_email")}</p>
        </div>
    </div>
</body>
</html>"""
    
    @classmethod
    def format_currency(cls, amount: float, currency: str = "BRL") -> str:
        """Formata valor monetario."""
        if currency == "BRL":
            return f"R$ {amount:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        elif currency == "USD":
            return f"$ {amount:,.2f}"
        else:
            return f"{amount:,.8f} {currency}"
    
    @classmethod
    def format_crypto(cls, amount: float, symbol: str) -> str:
        """Formata valor de crypto."""
        if amount >= 1:
            return f"{amount:,.4f} {symbol}"
        else:
            return f"{amount:,.8f} {symbol}"
    
    @classmethod
    def format_datetime(cls, dt: datetime, language: str = "pt") -> str:
        """Formata data/hora por idioma."""
        if language == "en":
            return dt.strftime('%m/%d/%Y at %H:%M')
        elif language == "es":
            return dt.strftime('%d/%m/%Y a las %H:%M')
        else:
            return dt.strftime('%d/%m/%Y as %H:%M')
    
    @classmethod
    def data_row(cls, label: str, value: str) -> str:
        """Gera uma linha de dados."""
        return f'''<div style="{cls.DATA_ROW_STYLE}">
            <span style="{cls.DATA_LABEL_STYLE}">{label}:</span>
            <span style="{cls.DATA_VALUE_STYLE}">{value}</span>
        </div>'''
    
    @classmethod
    def data_table(cls, rows: list) -> str:
        """Gera tabela de dados."""
        content = "".join(rows)
        return f'<div style="{cls.DATA_TABLE_STYLE}">{content}</div>'
    
    @classmethod
    def success_box(cls, text: str) -> str:
        """Gera caixa de sucesso."""
        return f'<div style="{cls.SUCCESS_BOX_STYLE}"><p style="{cls.SUCCESS_TEXT_STYLE}">{text}</p></div>'
    
    @classmethod
    def warning_box(cls, text: str) -> str:
        """Gera caixa de aviso."""
        return f'<div style="{cls.WARNING_BOX_STYLE}"><p style="{cls.WARNING_TEXT_STYLE}">{text}</p></div>'
    
    @classmethod
    def info_box(cls, text: str) -> str:
        """Gera caixa de informacao."""
        return f'<div style="{cls.INFO_BOX_STYLE}"><p style="{cls.INFO_TEXT_STYLE}">{text}</p></div>'
    
    @classmethod
    def error_box(cls, text: str) -> str:
        """Gera caixa de erro."""
        return f'<div style="{cls.ERROR_BOX_STYLE}"><p style="{cls.ERROR_TEXT_STYLE}">{text}</p></div>'
    
    @classmethod
    def button(cls, text: str, url: str) -> str:
        """Gera botao."""
        return f'<div style="text-align: center; margin: 24px 0;"><a href="{url}" style="{cls.BUTTON_STYLE}">{text}</a></div>'
