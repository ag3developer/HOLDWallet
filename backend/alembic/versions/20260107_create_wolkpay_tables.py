"""
🚀 WolkPay - Create Tables Migration
====================================

Cria as tabelas do sistema WolkPay para pagamento por terceiros.

Tabelas:
- wolkpay_invoices: Faturas/cobranças
- wolkpay_payers: Dados do pagador (PF/PJ)
- wolkpay_payments: Registro de pagamentos PIX
- wolkpay_approvals: Aprovações/rejeições de admin
- wolkpay_terms_versions: Versões dos termos de uso
- wolkpay_payer_limits: Limites mensais por pagador
- wolkpay_audit_logs: Logs de auditoria

Revision ID: 20260107_wolkpay
Revises: e934ca4e1d1d
Create Date: 2026-01-07
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers
revision = '20260107_wolkpay'
down_revision = 'e934ca4e1d1d'  # merge_push_notifications
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Cria todas as tabelas do WolkPay
    """
    
    # ==========================================
    # Enum Types
    # ==========================================
    
    # Check if enum types already exist
    conn = op.get_bind()
    
    # InvoiceStatus enum
    invoice_status_check = conn.execute(
        sa.text("SELECT 1 FROM pg_type WHERE typname = 'invoicestatus'")
    ).fetchone()
    if not invoice_status_check:
        invoice_status = postgresql.ENUM(
            'PENDING', 'AWAITING_PAYMENT', 'PAID', 'APPROVED', 'COMPLETED', 
            'EXPIRED', 'CANCELLED', 'REJECTED',
            name='invoicestatus'
        )
        invoice_status.create(op.get_bind())
    
    # PersonType enum
    person_type_check = conn.execute(
        sa.text("SELECT 1 FROM pg_type WHERE typname = 'persontype'")
    ).fetchone()
    if not person_type_check:
        person_type = postgresql.ENUM('PF', 'PJ', name='persontype')
        person_type.create(op.get_bind())
    
    # DocumentType enum
    doc_type_check = conn.execute(
        sa.text("SELECT 1 FROM pg_type WHERE typname = 'documenttype'")
    ).fetchone()
    if not doc_type_check:
        document_type = postgresql.ENUM('CPF', 'CNPJ', name='documenttype')
        document_type.create(op.get_bind())
    
    # PaymentStatus enum
    payment_status_check = conn.execute(
        sa.text("SELECT 1 FROM pg_type WHERE typname = 'paymentstatus'")
    ).fetchone()
    if not payment_status_check:
        payment_status = postgresql.ENUM(
            'PENDING', 'PAID', 'FAILED', 'REFUNDED',
            name='paymentstatus'
        )
        payment_status.create(op.get_bind())
    
    # ApprovalAction enum
    approval_action_check = conn.execute(
        sa.text("SELECT 1 FROM pg_type WHERE typname = 'approvalaction'")
    ).fetchone()
    if not approval_action_check:
        approval_action = postgresql.ENUM('APPROVED', 'REJECTED', name='approvalaction')
        approval_action.create(op.get_bind())
    
    # ==========================================
    # TABELA 1: wolkpay_invoices
    # ==========================================
    op.create_table(
        'wolkpay_invoices',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('invoice_number', sa.String(20), unique=True, nullable=False, index=True),
        sa.Column('beneficiary_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('status', postgresql.ENUM('PENDING', 'AWAITING_PAYMENT', 'PAID', 'APPROVED', 
                                            'COMPLETED', 'EXPIRED', 'CANCELLED', 'REJECTED',
                                            name='invoicestatus', create_type=False), 
                  default='PENDING', nullable=False),
        
        # Valores de crypto
        sa.Column('crypto_currency', sa.String(20), nullable=False),
        sa.Column('crypto_amount', sa.Numeric(28, 18), nullable=False),
        sa.Column('crypto_network', sa.String(50), nullable=True),
        
        # Cotações
        sa.Column('usd_rate', sa.Numeric(18, 8), nullable=False),
        sa.Column('brl_rate', sa.Numeric(18, 8), nullable=False),
        
        # Valores em BRL
        sa.Column('base_amount_brl', sa.Numeric(18, 2), nullable=False),
        sa.Column('service_fee_percent', sa.Numeric(5, 2), default=3.65, nullable=False),
        sa.Column('service_fee_brl', sa.Numeric(18, 2), nullable=False),
        sa.Column('network_fee_percent', sa.Numeric(5, 2), default=0.15, nullable=False),
        sa.Column('network_fee_brl', sa.Numeric(18, 2), nullable=False),
        sa.Column('total_amount_brl', sa.Numeric(18, 2), nullable=False),
        
        # Checkout
        sa.Column('checkout_token', sa.String(64), unique=True, nullable=False, index=True),
        sa.Column('checkout_url', sa.String(500), nullable=True),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        
        # Índices e constraints
        sa.Index('ix_wolkpay_invoices_beneficiary', 'beneficiary_id'),
        sa.Index('ix_wolkpay_invoices_status', 'status'),
        sa.Index('ix_wolkpay_invoices_created', 'created_at'),
    )
    
    # ==========================================
    # TABELA 2: wolkpay_payers
    # ==========================================
    op.create_table(
        'wolkpay_payers',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('invoice_id', UUID(as_uuid=True), sa.ForeignKey('wolkpay_invoices.id'), nullable=False),
        sa.Column('person_type', postgresql.ENUM('PF', 'PJ', name='persontype', create_type=False), nullable=False),
        
        # Pessoa Física (PF)
        sa.Column('full_name', sa.String(200), nullable=True),
        sa.Column('cpf', sa.String(14), nullable=True),
        sa.Column('birth_date', sa.Date, nullable=True),
        sa.Column('phone', sa.String(20), nullable=True),
        sa.Column('email', sa.String(200), nullable=True),
        
        # Pessoa Jurídica (PJ)
        sa.Column('company_name', sa.String(200), nullable=True),
        sa.Column('cnpj', sa.String(18), nullable=True),
        sa.Column('trade_name', sa.String(200), nullable=True),
        sa.Column('state_registration', sa.String(50), nullable=True),
        sa.Column('business_phone', sa.String(20), nullable=True),
        sa.Column('business_email', sa.String(200), nullable=True),
        sa.Column('responsible_name', sa.String(200), nullable=True),
        sa.Column('responsible_cpf', sa.String(14), nullable=True),
        
        # Endereço
        sa.Column('zip_code', sa.String(9), nullable=True),
        sa.Column('street', sa.String(200), nullable=True),
        sa.Column('number', sa.String(20), nullable=True),
        sa.Column('complement', sa.String(100), nullable=True),
        sa.Column('neighborhood', sa.String(100), nullable=True),
        sa.Column('city', sa.String(100), nullable=True),
        sa.Column('state', sa.String(2), nullable=True),
        
        # Compliance
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.String(500), nullable=True),
        sa.Column('terms_accepted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('terms_version', sa.String(20), nullable=True),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        
        # Índices
        sa.Index('ix_wolkpay_payers_invoice', 'invoice_id'),
        sa.Index('ix_wolkpay_payers_cpf', 'cpf'),
        sa.Index('ix_wolkpay_payers_cnpj', 'cnpj'),
    )
    
    # ==========================================
    # TABELA 3: wolkpay_payments
    # ==========================================
    op.create_table(
        'wolkpay_payments',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('invoice_id', UUID(as_uuid=True), sa.ForeignKey('wolkpay_invoices.id'), nullable=False),
        sa.Column('payer_id', UUID(as_uuid=True), sa.ForeignKey('wolkpay_payers.id'), nullable=True),
        
        # PIX
        sa.Column('pix_key', sa.String(100), nullable=False),
        sa.Column('pix_key_type', sa.String(20), default='CNPJ', nullable=False),
        sa.Column('pix_txid', sa.String(100), nullable=True),
        sa.Column('pix_emv', sa.Text, nullable=True),
        sa.Column('pix_qrcode_base64', sa.Text, nullable=True),
        
        # Valores
        sa.Column('amount_brl', sa.Numeric(18, 2), nullable=False),
        
        # Status
        sa.Column('status', postgresql.ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED',
                                            name='paymentstatus', create_type=False),
                  default='PENDING', nullable=False),
        sa.Column('paid_at', sa.DateTime(timezone=True), nullable=True),
        
        # Dados do banco
        sa.Column('bank_transaction_id', sa.String(100), nullable=True),
        sa.Column('bank_response', sa.JSON, nullable=True),
        sa.Column('payer_bank', sa.String(100), nullable=True),
        sa.Column('payer_name_from_bank', sa.String(200), nullable=True),
        sa.Column('payer_document_from_bank', sa.String(20), nullable=True),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        
        # Índices
        sa.Index('ix_wolkpay_payments_invoice', 'invoice_id'),
        sa.Index('ix_wolkpay_payments_status', 'status'),
        sa.Index('ix_wolkpay_payments_txid', 'pix_txid'),
    )
    
    # ==========================================
    # TABELA 4: wolkpay_approvals
    # ==========================================
    op.create_table(
        'wolkpay_approvals',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('invoice_id', UUID(as_uuid=True), sa.ForeignKey('wolkpay_invoices.id'), nullable=False),
        
        # Decisão
        sa.Column('action', postgresql.ENUM('APPROVED', 'REJECTED', name='approvalaction', create_type=False),
                  nullable=False),
        sa.Column('approved_by', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('rejection_reason', sa.String(500), nullable=True),
        
        # Transação crypto (se aprovado)
        sa.Column('crypto_tx_hash', sa.String(100), nullable=True),
        sa.Column('crypto_network', sa.String(50), nullable=True),
        sa.Column('wallet_address', sa.String(200), nullable=True),
        sa.Column('crypto_amount_sent', sa.Numeric(28, 18), nullable=True),
        
        # Notas
        sa.Column('notes', sa.Text, nullable=True),
        
        # Timestamp
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        
        # Índices
        sa.Index('ix_wolkpay_approvals_invoice', 'invoice_id'),
        sa.Index('ix_wolkpay_approvals_admin', 'approved_by'),
    )
    
    # ==========================================
    # TABELA 5: wolkpay_terms_versions
    # ==========================================
    op.create_table(
        'wolkpay_terms_versions',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('version', sa.String(20), unique=True, nullable=False),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('content', sa.Text, nullable=False),
        sa.Column('is_active', sa.Boolean, default=False, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('activated_at', sa.DateTime(timezone=True), nullable=True),
        
        sa.Index('ix_wolkpay_terms_active', 'is_active'),
    )
    
    # ==========================================
    # TABELA 6: wolkpay_payer_limits
    # ==========================================
    op.create_table(
        'wolkpay_payer_limits',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('document_type', postgresql.ENUM('CPF', 'CNPJ', name='documenttype', create_type=False),
                  nullable=False),
        sa.Column('document_number', sa.String(20), nullable=False),
        sa.Column('document_hash', sa.String(64), nullable=False, index=True),
        sa.Column('month_year', sa.String(7), nullable=False),
        
        # Limites
        sa.Column('total_amount_brl', sa.Numeric(18, 2), default=0, nullable=False),
        sa.Column('transaction_count', sa.Integer, default=0, nullable=False),
        
        # Bloqueio
        sa.Column('blocked', sa.Boolean, default=False, nullable=False),
        sa.Column('blocked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('blocked_reason', sa.String(500), nullable=True),
        sa.Column('blocked_by', UUID(as_uuid=True), nullable=True),
        
        # Timestamp
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        
        # Índices
        sa.Index('ix_wolkpay_payer_limits_month', 'month_year'),
        sa.UniqueConstraint('document_hash', 'month_year', name='uq_wolkpay_payer_limit_month'),
    )
    
    # ==========================================
    # TABELA 7: wolkpay_audit_logs
    # ==========================================
    op.create_table(
        'wolkpay_audit_logs',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('invoice_id', UUID(as_uuid=True), sa.ForeignKey('wolkpay_invoices.id'), nullable=True),
        
        # Ator
        sa.Column('actor_type', sa.String(20), nullable=False),
        sa.Column('actor_id', UUID(as_uuid=True), nullable=True),
        
        # Ação
        sa.Column('action', sa.String(50), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        
        # Metadados
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.String(500), nullable=True),
        sa.Column('metadata', sa.JSON, nullable=True),
        
        # Timestamp
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        
        # Índices
        sa.Index('ix_wolkpay_audit_invoice', 'invoice_id'),
        sa.Index('ix_wolkpay_audit_action', 'action'),
        sa.Index('ix_wolkpay_audit_created', 'created_at'),
    )
    
    # ==========================================
    # Inserir versão inicial dos termos
    # ==========================================
    import uuid
    from datetime import datetime
    
    op.execute(
        f"""
        INSERT INTO wolkpay_terms_versions (id, version, title, content, is_active, created_at, activated_at)
        VALUES (
            '{str(uuid.uuid4())}',
            '1.0.0',
            'Termos de Uso WolkPay - Pagamento por Terceiros',
            '## TERMOS DE USO - WOLKPAY

### 1. OBJETO
O WolkPay é um serviço que permite pagamentos por terceiros para aquisição de criptoativos na plataforma WolkNow.

### 2. DECLARAÇÕES DO PAGADOR
Ao efetuar pagamento através do WolkPay, o PAGADOR declara:

a) Ter plena capacidade civil e/ou poderes para realizar transações em nome da empresa representada;
b) Que os recursos utilizados são de origem lícita;
c) Que está ciente de que está realizando pagamento para aquisição de criptoativos;
d) Que foi informado sobre os riscos de volatilidade do mercado de criptomoedas;
e) Que concorda com a coleta de seus dados pessoais para fins de compliance e prevenção à lavagem de dinheiro.

### 3. TAXAS
- Taxa de serviço: 3,65%
- Taxa de rede: 0,15%
- Total: 3,80% sobre o valor da operação

### 4. LIMITES
- Limite por operação: R$ 15.000,00
- Limite mensal por pagador: R$ 300.000,00

### 5. VALIDADE DA COTAÇÃO
A cotação é válida por 15 (quinze) minutos devido à volatilidade do mercado de criptomoedas.

### 6. POLÍTICA DE CANCELAMENTO
Após confirmação do pagamento, a operação não poderá ser cancelada.

### 7. RESPONSABILIDADE
A HOLD DIGITAL ASSETS LTDA não se responsabiliza por:
- Oscilações de preço após a confirmação da cotação;
- Erros de preenchimento de dados pelo pagador;
- Atrasos causados por instituições financeiras.

Data de vigência: Janeiro/2026',
            true,
            NOW(),
            NOW()
        )
        """
    )
    
    print("✅ WolkPay tables created successfully!")


def downgrade() -> None:
    """
    Remove todas as tabelas do WolkPay
    """
    # Drop tables in reverse order (respecting foreign keys)
    op.drop_table('wolkpay_audit_logs')
    op.drop_table('wolkpay_payer_limits')
    op.drop_table('wolkpay_terms_versions')
    op.drop_table('wolkpay_approvals')
    op.drop_table('wolkpay_payments')
    op.drop_table('wolkpay_payers')
    op.drop_table('wolkpay_invoices')
    
    # Drop enum types
    op.execute("DROP TYPE IF EXISTS invoicestatus")
    op.execute("DROP TYPE IF EXISTS persontype")
    op.execute("DROP TYPE IF EXISTS documenttype")
    op.execute("DROP TYPE IF EXISTS paymentstatus")
    op.execute("DROP TYPE IF EXISTS approvalaction")
    
    print("✅ WolkPay tables dropped successfully!")
