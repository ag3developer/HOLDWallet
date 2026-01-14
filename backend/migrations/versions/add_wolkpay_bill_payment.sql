-- ============================================
-- WolkPay Bill Payment - Migration
-- Pagamento de boletos usando crypto
-- Data: Janeiro 2026
-- ============================================

-- Criar tabela de pagamentos de boletos
CREATE TABLE IF NOT EXISTS wolkpay_bill_payments (
    id VARCHAR(36) PRIMARY KEY,
    payment_number VARCHAR(25) UNIQUE NOT NULL,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id),
    
    -- Dados do boleto
    bill_type VARCHAR(20) NOT NULL DEFAULT 'BANK_SLIP',
    barcode VARCHAR(60) NOT NULL,
    digitable_line VARCHAR(60),
    bill_amount_brl NUMERIC(18, 2) NOT NULL,
    bill_due_date DATE NOT NULL,
    bill_beneficiary_name VARCHAR(200),
    bill_beneficiary_document VARCHAR(20),
    bill_payer_name VARCHAR(200),
    bill_payer_document VARCHAR(20),
    bill_bank_code VARCHAR(10),
    bill_bank_name VARCHAR(100),
    
    -- Crypto
    crypto_currency VARCHAR(20) NOT NULL,
    crypto_amount NUMERIC(28, 18) NOT NULL,
    crypto_network VARCHAR(50),
    crypto_usd_rate NUMERIC(18, 8) NOT NULL,
    brl_usd_rate NUMERIC(18, 4) NOT NULL,
    
    -- Valores e taxas
    base_amount_brl NUMERIC(18, 2) NOT NULL,
    service_fee_percent NUMERIC(5, 2) DEFAULT 4.75,
    service_fee_brl NUMERIC(18, 2) NOT NULL,
    network_fee_percent NUMERIC(5, 2) DEFAULT 0.25,
    network_fee_brl NUMERIC(18, 2) NOT NULL,
    total_amount_brl NUMERIC(18, 2) NOT NULL,
    
    -- Status e controle
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    quote_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    crypto_debited_at TIMESTAMP WITH TIME ZONE,
    internal_tx_id VARCHAR(36),
    
    -- Pagamento
    paid_by_operator_id VARCHAR(36) REFERENCES users(id),
    payment_receipt_url VARCHAR(500),
    payment_receipt_data TEXT,
    bank_authentication VARCHAR(100),
    paid_at TIMESTAMP WITH TIME ZONE,
    
    -- Falha/Reembolso
    failure_reason TEXT,
    refunded_at TIMESTAMP WITH TIME ZONE,
    refund_tx_id VARCHAR(36),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Índices
CREATE INDEX IF NOT EXISTS ix_wolkpay_bill_payments_payment_number ON wolkpay_bill_payments(payment_number);
CREATE INDEX IF NOT EXISTS ix_wolkpay_bill_payments_user_id ON wolkpay_bill_payments(user_id);
CREATE INDEX IF NOT EXISTS ix_wolkpay_bill_payments_status ON wolkpay_bill_payments(status);
CREATE INDEX IF NOT EXISTS ix_wolkpay_bill_user_status ON wolkpay_bill_payments(user_id, status);
CREATE INDEX IF NOT EXISTS ix_wolkpay_bill_created_at ON wolkpay_bill_payments(created_at);
CREATE INDEX IF NOT EXISTS ix_wolkpay_bill_barcode ON wolkpay_bill_payments(barcode);

-- Criar tabela de logs
CREATE TABLE IF NOT EXISTS wolkpay_bill_payment_logs (
    id VARCHAR(36) PRIMARY KEY,
    bill_payment_id VARCHAR(36) NOT NULL REFERENCES wolkpay_bill_payments(id),
    event VARCHAR(50) NOT NULL,
    old_status VARCHAR(30),
    new_status VARCHAR(30),
    details TEXT,
    actor_type VARCHAR(20) NOT NULL,
    actor_id VARCHAR(36),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_wolkpay_bill_log_payment_id ON wolkpay_bill_payment_logs(bill_payment_id);

-- Comentários
COMMENT ON TABLE wolkpay_bill_payments IS 'Pagamentos de boletos usando crypto - WolkPay';
COMMENT ON TABLE wolkpay_bill_payment_logs IS 'Log de eventos dos pagamentos de boletos';
COMMENT ON COLUMN wolkpay_bill_payments.status IS 'PENDING, CRYPTO_DEBITED, PROCESSING, PAYING, PAID, FAILED, REFUNDED, CANCELLED, EXPIRED';
