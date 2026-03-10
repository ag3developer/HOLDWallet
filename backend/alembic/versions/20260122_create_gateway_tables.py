"""Create gateway tables for WolkPay Gateway

Revision ID: 20260122_create_gateway_tables
Revises: ad21bac2d921
Create Date: 2026-01-22 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20260122_create_gateway_tables'
down_revision = 'ad21bac2d921'  # merge_all_heads
branch_labels = None
depends_on = None


def upgrade():
    """Create all gateway tables for WolkPay Gateway E-commerce"""
    
    # Create enums
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE merchantstatus AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'BLOCKED');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE gatewaypaymentstatus AS ENUM (
                'PENDING', 'PROCESSING', 'CONFIRMED', 'COMPLETED', 
                'EXPIRED', 'CANCELLED', 'REFUNDED', 'FAILED'
            );
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE gatewaypaymentmethod AS ENUM ('PIX', 'CRYPTO');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE gatewaywebhookevent AS ENUM (
                'payment.created', 'payment.pending', 'payment.processing',
                'payment.confirmed', 'payment.completed', 'payment.expired',
                'payment.failed', 'payment.refunded'
            );
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE gatewaywebhookstatus AS ENUM ('PENDING', 'SENT', 'FAILED', 'EXHAUSTED');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE gatewayauditaction AS ENUM (
                'MERCHANT_CREATED', 'MERCHANT_UPDATED', 'MERCHANT_ACTIVATED',
                'MERCHANT_SUSPENDED', 'MERCHANT_BLOCKED', 'API_KEY_CREATED',
                'API_KEY_REVOKED', 'PAYMENT_CREATED', 'PAYMENT_CONFIRMED',
                'PAYMENT_COMPLETED', 'PAYMENT_REFUNDED', 'WEBHOOK_CONFIGURED',
                'SETTLEMENT_PROCESSED'
            );
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE settlementcurrency AS ENUM ('BRL', 'USDT', 'ORIGINAL');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    # ==================================================
    # Table: gateway_merchants
    # ==================================================
    op.create_table(
        'gateway_merchants',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('merchant_code', sa.String(20), unique=True, nullable=False, index=True),
        
        # Company data
        sa.Column('company_name', sa.String(300), nullable=False),
        sa.Column('trade_name', sa.String(200), nullable=True),
        sa.Column('cnpj', sa.String(18), unique=True, nullable=False, index=True),
        sa.Column('cnpj_encrypted', sa.Text, nullable=True),
        
        # Contact
        sa.Column('email', sa.String(200), nullable=False),
        sa.Column('phone', sa.String(20), nullable=True),
        sa.Column('website', sa.String(500), nullable=True),
        
        # Owner
        sa.Column('owner_name', sa.String(200), nullable=False),
        sa.Column('owner_cpf', sa.String(14), nullable=True),
        sa.Column('owner_cpf_encrypted', sa.Text, nullable=True),
        sa.Column('owner_email', sa.String(200), nullable=True),
        sa.Column('owner_phone', sa.String(20), nullable=True),
        
        # Address
        sa.Column('zip_code', sa.String(10), nullable=True),
        sa.Column('street', sa.String(300), nullable=True),
        sa.Column('number', sa.String(20), nullable=True),
        sa.Column('complement', sa.String(100), nullable=True),
        sa.Column('neighborhood', sa.String(100), nullable=True),
        sa.Column('city', sa.String(100), nullable=True),
        sa.Column('state', sa.String(2), nullable=True),
        
        # Configuration
        sa.Column('status', postgresql.ENUM('PENDING', 'ACTIVE', 'SUSPENDED', 'BLOCKED', 
                                            name='merchantstatus', create_type=False), 
                  nullable=False, server_default='PENDING'),
        sa.Column('settlement_currency', postgresql.ENUM('BRL', 'USDT', 'ORIGINAL',
                                                         name='settlementcurrency', create_type=False),
                  nullable=False, server_default='BRL'),
        
        # Custom fees
        sa.Column('custom_fee_percent', sa.Numeric(5, 2), nullable=True),
        sa.Column('custom_network_fee_percent', sa.Numeric(5, 2), nullable=True),
        
        # Limits
        sa.Column('daily_limit_brl', sa.Numeric(18, 2), server_default='100000'),
        sa.Column('monthly_limit_brl', sa.Numeric(18, 2), server_default='1000000'),
        sa.Column('min_payment_brl', sa.Numeric(18, 2), server_default='10'),
        sa.Column('max_payment_brl', sa.Numeric(18, 2), server_default='50000'),
        
        # Settlement wallet
        sa.Column('settlement_wallet_address', sa.String(100), nullable=True),
        sa.Column('settlement_wallet_network', sa.String(50), nullable=True),
        
        # Bank (PIX)
        sa.Column('bank_pix_key', sa.String(100), nullable=True),
        sa.Column('bank_pix_key_type', sa.String(20), nullable=True),
        sa.Column('bank_name', sa.String(100), nullable=True),
        sa.Column('bank_account_holder', sa.String(200), nullable=True),
        
        # Branding
        sa.Column('logo_url', sa.String(500), nullable=True),
        sa.Column('primary_color', sa.String(7), nullable=True),
        
        # Extra data
        sa.Column('extra_data', postgresql.JSON, nullable=True),
        
        # HD Wallet
        sa.Column('hd_index', sa.Integer, nullable=False, unique=True, server_default='0'),
        sa.Column('next_payment_index', sa.Integer, nullable=False, server_default='0'),
        
        # Webhook
        sa.Column('webhook_url', sa.String(500), nullable=True),
        sa.Column('webhook_secret', sa.String(64), nullable=True),
        sa.Column('webhook_events', postgresql.JSON, nullable=True),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.Column('activated_at', sa.DateTime(timezone=True), nullable=True),
    )
    
    op.create_index('ix_gateway_merchants_status_created', 'gateway_merchants', ['status', 'created_at'])
    op.create_index('ix_gateway_merchants_email', 'gateway_merchants', ['email'])
    
    # ==================================================
    # Table: gateway_api_keys
    # ==================================================
    op.create_table(
        'gateway_api_keys',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('merchant_id', sa.String(36), sa.ForeignKey('gateway_merchants.id'), nullable=False, index=True),
        
        # Identification
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        
        # Key
        sa.Column('key_prefix', sa.String(12), nullable=False, index=True),
        sa.Column('key_hash', sa.String(64), nullable=False, unique=True),
        
        # Type
        sa.Column('is_test', sa.Boolean, server_default='false', nullable=False),
        
        # Permissions
        sa.Column('permissions', postgresql.JSON, nullable=True),
        sa.Column('allowed_ips', postgresql.JSON, nullable=True),
        
        # Rate limiting
        sa.Column('rate_limit_per_minute', sa.Integer, server_default='60'),
        sa.Column('rate_limit_per_hour', sa.Integer, server_default='1000'),
        
        # Status
        sa.Column('is_active', sa.Boolean, server_default='true', nullable=False),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('revoked_reason', sa.String(200), nullable=True),
        
        # Usage
        sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_used_ip', sa.String(45), nullable=True),
        sa.Column('total_requests', sa.Integer, server_default='0'),
        
        # Expiration
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )
    
    op.create_index('ix_gateway_api_keys_merchant_active', 'gateway_api_keys', ['merchant_id', 'is_active'])
    
    # ==================================================
    # Table: gateway_payments
    # ==================================================
    op.create_table(
        'gateway_payments',
        sa.Column('id', sa.String(36), primary_key=True),
        
        # Identifiers
        sa.Column('payment_id', sa.String(30), unique=True, nullable=False, index=True),
        sa.Column('external_id', sa.String(100), nullable=True, index=True),
        
        # Merchant
        sa.Column('merchant_id', sa.String(36), sa.ForeignKey('gateway_merchants.id'), nullable=False, index=True),
        sa.Column('api_key_id', sa.String(36), sa.ForeignKey('gateway_api_keys.id'), nullable=True),
        
        # Payment method
        sa.Column('payment_method', postgresql.ENUM('PIX', 'CRYPTO', 
                                                     name='gatewaypaymentmethod', create_type=False),
                  nullable=False, index=True),
        
        # PIX
        sa.Column('pix_key', sa.String(100), nullable=True),
        sa.Column('pix_txid', sa.String(100), nullable=True, index=True),
        sa.Column('pix_qrcode', sa.Text, nullable=True),
        sa.Column('pix_qrcode_image', sa.Text, nullable=True),
        sa.Column('pix_emv', sa.Text, nullable=True),
        
        # Crypto
        sa.Column('crypto_currency', sa.String(20), nullable=True),
        sa.Column('crypto_network', sa.String(50), nullable=True),
        sa.Column('crypto_address', sa.String(100), nullable=True, index=True),
        sa.Column('crypto_amount', sa.Numeric(28, 18), nullable=True),
        sa.Column('crypto_amount_received', sa.Numeric(28, 18), nullable=True),
        sa.Column('crypto_tx_hash', sa.String(128), nullable=True, index=True),
        sa.Column('crypto_confirmations', sa.Integer, server_default='0'),
        sa.Column('crypto_required_confirmations', sa.Integer, server_default='1'),
        
        # HD Derivation
        sa.Column('hd_derivation_path', sa.String(100), nullable=True),
        sa.Column('hd_merchant_index', sa.Integer, nullable=True),
        sa.Column('hd_payment_index', sa.Integer, nullable=True),
        
        # Values
        sa.Column('amount_requested', sa.Numeric(18, 8), nullable=False),
        sa.Column('currency_requested', sa.String(10), nullable=False),
        sa.Column('amount_received', sa.Numeric(18, 8), nullable=True),
        
        # Exchange rates
        sa.Column('exchange_rate', sa.Numeric(18, 8), nullable=True),
        sa.Column('usd_rate', sa.Numeric(18, 8), nullable=True),
        sa.Column('brl_rate', sa.Numeric(18, 4), nullable=True),
        
        # Fees
        sa.Column('fee_percent', sa.Numeric(5, 2), nullable=False),
        sa.Column('fee_amount', sa.Numeric(18, 8), nullable=True),
        sa.Column('network_fee', sa.Numeric(18, 8), nullable=True),
        
        # Settlement
        sa.Column('settlement_amount', sa.Numeric(18, 8), nullable=True),
        sa.Column('settlement_currency', sa.String(10), nullable=True),
        sa.Column('settlement_status', sa.String(20), nullable=True),
        sa.Column('settlement_tx_hash', sa.String(128), nullable=True),
        sa.Column('settled_at', sa.DateTime(timezone=True), nullable=True),
        
        # Status
        sa.Column('status', postgresql.ENUM('PENDING', 'PROCESSING', 'CONFIRMED', 'COMPLETED',
                                            'EXPIRED', 'CANCELLED', 'REFUNDED', 'FAILED',
                                            name='gatewaypaymentstatus', create_type=False),
                  nullable=False, server_default='PENDING', index=True),
        
        # Expiration
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        
        # Customer
        sa.Column('customer_email', sa.String(200), nullable=True),
        sa.Column('customer_name', sa.String(200), nullable=True),
        sa.Column('customer_phone', sa.String(20), nullable=True),
        sa.Column('customer_document', sa.String(20), nullable=True),
        
        # URLs
        sa.Column('success_url', sa.String(500), nullable=True),
        sa.Column('cancel_url', sa.String(500), nullable=True),
        
        # Checkout
        sa.Column('checkout_token', sa.String(64), unique=True, nullable=True, index=True),
        sa.Column('checkout_url', sa.String(500), nullable=True),
        
        # Extra data
        sa.Column('extra_data', postgresql.JSON, nullable=True),
        sa.Column('description', sa.String(500), nullable=True),
        
        # Tracking
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.Text, nullable=True),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.Column('confirmed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
    )
    
    op.create_index('ix_gateway_payments_merchant_status', 'gateway_payments', ['merchant_id', 'status'])
    op.create_index('ix_gateway_payments_merchant_created', 'gateway_payments', ['merchant_id', 'created_at'])
    op.create_index('ix_gateway_payments_status_expires', 'gateway_payments', ['status', 'expires_at'])
    
    # ==================================================
    # Table: gateway_webhooks
    # ==================================================
    op.create_table(
        'gateway_webhooks',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('payment_id', sa.String(36), sa.ForeignKey('gateway_payments.id'), nullable=False, index=True),
        sa.Column('merchant_id', sa.String(36), sa.ForeignKey('gateway_merchants.id'), nullable=False, index=True),
        
        # Event
        sa.Column('event', postgresql.ENUM('payment.created', 'payment.pending', 'payment.processing',
                                           'payment.confirmed', 'payment.completed', 'payment.expired',
                                           'payment.failed', 'payment.refunded',
                                           name='gatewaywebhookevent', create_type=False),
                  nullable=False, index=True),
        
        # Payload
        sa.Column('payload', postgresql.JSON, nullable=False),
        sa.Column('signature', sa.String(128), nullable=True),
        
        # Destination
        sa.Column('url', sa.String(500), nullable=False),
        
        # Status
        sa.Column('status', postgresql.ENUM('PENDING', 'SENT', 'FAILED', 'EXHAUSTED',
                                            name='gatewaywebhookstatus', create_type=False),
                  nullable=False, server_default='PENDING', index=True),
        
        # Attempts
        sa.Column('attempts', sa.Integer, server_default='0'),
        sa.Column('max_attempts', sa.Integer, server_default='5'),
        sa.Column('next_attempt_at', sa.DateTime(timezone=True), nullable=True),
        
        # Response
        sa.Column('last_response_code', sa.Integer, nullable=True),
        sa.Column('last_response_body', sa.Text, nullable=True),
        sa.Column('last_error', sa.Text, nullable=True),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
    )
    
    op.create_index('ix_gateway_webhooks_status_next', 'gateway_webhooks', ['status', 'next_attempt_at'])
    
    # ==================================================
    # Table: gateway_audit_logs
    # ==================================================
    op.create_table(
        'gateway_audit_logs',
        sa.Column('id', sa.String(36), primary_key=True),
        
        # References
        sa.Column('merchant_id', sa.String(36), sa.ForeignKey('gateway_merchants.id'), nullable=True, index=True),
        sa.Column('payment_id', sa.String(36), sa.ForeignKey('gateway_payments.id'), nullable=True, index=True),
        sa.Column('api_key_id', sa.String(36), sa.ForeignKey('gateway_api_keys.id'), nullable=True),
        
        # Actor
        sa.Column('actor_type', sa.String(20), nullable=False),
        sa.Column('actor_id', sa.String(36), nullable=True),
        sa.Column('actor_email', sa.String(200), nullable=True),
        
        # Action
        sa.Column('action', postgresql.ENUM('MERCHANT_CREATED', 'MERCHANT_UPDATED', 'MERCHANT_ACTIVATED',
                                            'MERCHANT_SUSPENDED', 'MERCHANT_BLOCKED', 'API_KEY_CREATED',
                                            'API_KEY_REVOKED', 'PAYMENT_CREATED', 'PAYMENT_CONFIRMED',
                                            'PAYMENT_COMPLETED', 'PAYMENT_REFUNDED', 'WEBHOOK_CONFIGURED',
                                            'SETTLEMENT_PROCESSED',
                                            name='gatewayauditaction', create_type=False),
                  nullable=False, index=True),
        sa.Column('description', sa.Text, nullable=True),
        
        # Data
        sa.Column('old_data', postgresql.JSON, nullable=True),
        sa.Column('new_data', postgresql.JSON, nullable=True),
        
        # Request info
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.Text, nullable=True),
        sa.Column('request_id', sa.String(36), nullable=True),
        
        # Timestamp
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    
    op.create_index('ix_gateway_audit_logs_merchant_action', 'gateway_audit_logs', ['merchant_id', 'action'])
    op.create_index('ix_gateway_audit_logs_created_at', 'gateway_audit_logs', ['created_at'])
    
    # ==================================================
    # Table: gateway_settings
    # ==================================================
    op.create_table(
        'gateway_settings',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('key', sa.String(100), unique=True, nullable=False, index=True),
        sa.Column('value', postgresql.JSON, nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('updated_by', sa.String(36), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )
    
    # Insert default settings
    op.execute("""
        INSERT INTO gateway_settings (id, key, value, description) VALUES
        (gen_random_uuid()::text, 'default_fee_percent', '3.5', 'Taxa padrão por transação (%)'),
        (gen_random_uuid()::text, 'default_network_fee_percent', '0.15', 'Taxa padrão de rede (%)'),
        (gen_random_uuid()::text, 'payment_expiration_minutes', '30', 'Tempo de expiração do pagamento em minutos'),
        (gen_random_uuid()::text, 'crypto_confirmations', '{"BTC": 3, "ETH": 12, "USDT": 12, "MATIC": 30}', 'Confirmações necessárias por crypto'),
        (gen_random_uuid()::text, 'supported_cryptos', '["BTC", "ETH", "USDT", "USDC", "MATIC", "BNB", "SOL"]', 'Criptomoedas suportadas'),
        (gen_random_uuid()::text, 'min_payment_brl', '10', 'Pagamento mínimo em BRL'),
        (gen_random_uuid()::text, 'max_payment_brl', '100000', 'Pagamento máximo em BRL')
    """)


def downgrade():
    """Drop all gateway tables"""
    op.drop_table('gateway_settings')
    op.drop_table('gateway_audit_logs')
    op.drop_table('gateway_webhooks')
    op.drop_table('gateway_payments')
    op.drop_table('gateway_api_keys')
    op.drop_table('gateway_merchants')
    
    # Drop enums
    op.execute("DROP TYPE IF EXISTS settlementcurrency")
    op.execute("DROP TYPE IF EXISTS gatewayauditaction")
    op.execute("DROP TYPE IF EXISTS gatewaywebhookstatus")
    op.execute("DROP TYPE IF EXISTS gatewaywebhookevent")
    op.execute("DROP TYPE IF EXISTS gatewaypaymentmethod")
    op.execute("DROP TYPE IF EXISTS gatewaypaymentstatus")
    op.execute("DROP TYPE IF EXISTS merchantstatus")
