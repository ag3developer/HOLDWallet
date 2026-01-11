"""Create KYC tables

Revision ID: 20260615_create_kyc_tables
Revises: e934ca4e1d1d
Create Date: 2026-06-15 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid

# revision identifiers, used by Alembic.
revision = '20260615_create_kyc_tables'
down_revision = 'e934ca4e1d1d'  # Último merge head
branch_labels = None
depends_on = None


def upgrade():
    """Create KYC tables."""
    
    # 1. KYC Verifications - tabela principal
    op.create_table(
        'kyc_verifications',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('status', sa.Enum('pending', 'submitted', 'under_review', 'approved', 'rejected', 'expired', name='kycstatus'), default='pending', nullable=False),
        sa.Column('level', sa.Enum('none', 'basic', 'intermediate', 'advanced', name='kyclevel'), default='none', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.Column('submitted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('rejected_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expiration_date', sa.Date, nullable=True),
        sa.Column('reviewed_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('auto_approved', sa.Boolean, default=False),
        sa.Column('auto_analysis_result', postgresql.JSONB, nullable=True),
        sa.Column('risk_score', sa.Numeric(5, 2), nullable=True),
        sa.Column('risk_factors', postgresql.JSONB, nullable=True),
        sa.Column('rejection_reason', sa.Text, nullable=True),
        sa.Column('rejection_details', postgresql.JSONB, nullable=True),
        sa.Column('requested_documents', postgresql.JSONB, nullable=True),
        sa.Column('admin_notes', sa.Text, nullable=True),
        sa.Column('consent_given', sa.Boolean, default=False),
        sa.Column('consent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('consent_ip', sa.String(45), nullable=True),
        sa.Column('consent_user_agent', sa.Text, nullable=True),
    )
    
    # Índices para kyc_verifications
    op.create_index('ix_kyc_verifications_user_id', 'kyc_verifications', ['user_id'])
    op.create_index('ix_kyc_verifications_status', 'kyc_verifications', ['status'])
    op.create_index('ix_kyc_verifications_level', 'kyc_verifications', ['level'])
    op.create_index('ix_kyc_verifications_created_at', 'kyc_verifications', ['created_at'])
    
    # 2. KYC Personal Data - dados sensíveis criptografados
    op.create_table(
        'kyc_personal_data',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('verification_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('kyc_verifications.id', ondelete='CASCADE'), nullable=False, unique=True),
        
        # Dados básicos
        sa.Column('full_name', sa.String(200), nullable=True),
        sa.Column('social_name', sa.String(200), nullable=True),
        sa.Column('birth_date', sa.Date, nullable=True),
        sa.Column('nationality', sa.String(50), default='BR'),
        sa.Column('gender', sa.String(20), nullable=True),
        sa.Column('mother_name', sa.String(200), nullable=True),
        
        # Documentos (criptografados)
        sa.Column('document_type', sa.String(20), nullable=True),
        sa.Column('document_number', sa.Text, nullable=True),  # Encrypted
        sa.Column('document_number_hash', sa.String(64), nullable=True, unique=True),
        sa.Column('rg_number', sa.Text, nullable=True),  # Encrypted
        sa.Column('rg_issuer', sa.String(20), nullable=True),
        sa.Column('rg_state', sa.String(2), nullable=True),
        
        # Endereço (criptografados)
        sa.Column('zip_code', sa.Text, nullable=True),  # Encrypted
        sa.Column('street', sa.Text, nullable=True),  # Encrypted
        sa.Column('number', sa.Text, nullable=True),  # Encrypted
        sa.Column('complement', sa.String(100), nullable=True),
        sa.Column('neighborhood', sa.String(100), nullable=True),
        sa.Column('city', sa.String(100), nullable=True),
        sa.Column('state', sa.String(2), nullable=True),
        sa.Column('country', sa.String(50), default='BR'),
        
        # Contato (criptografados)
        sa.Column('phone', sa.Text, nullable=True),  # Encrypted
        sa.Column('phone_hash', sa.String(64), nullable=True),
        sa.Column('email', sa.String(254), nullable=True),
        
        # Dados financeiros
        sa.Column('occupation', sa.String(100), nullable=True),
        sa.Column('employer', sa.String(200), nullable=True),
        sa.Column('monthly_income', sa.String(50), nullable=True),
        sa.Column('source_of_funds', sa.String(200), nullable=True),
        
        # Compliance
        sa.Column('pep', sa.Boolean, default=False),
        sa.Column('pep_relationship', sa.String(200), nullable=True),
        sa.Column('fatca', sa.Boolean, default=False),
        
        # Validação automática
        sa.Column('cpf_validated', sa.Boolean, default=False),
        sa.Column('cpf_validation_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('cpf_validation_source', sa.String(50), nullable=True),
        sa.Column('cpf_validation_response', postgresql.JSONB, nullable=True),
        sa.Column('name_similarity_score', sa.Numeric(5, 2), nullable=True),
        sa.Column('birth_date_matches', sa.Boolean, nullable=True),
        sa.Column('cpf_situation', sa.String(50), nullable=True),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )
    
    # Índices
    op.create_index('ix_kyc_personal_data_verification_id', 'kyc_personal_data', ['verification_id'])
    op.create_index('ix_kyc_personal_data_document_hash', 'kyc_personal_data', ['document_number_hash'])
    
    # 3. KYC Documents - arquivos enviados
    op.create_table(
        'kyc_documents',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('verification_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('kyc_verifications.id', ondelete='CASCADE'), nullable=False),
        sa.Column('document_type', sa.Enum('cpf_photo', 'rg_front', 'rg_back', 'cnh_front', 'cnh_back', 'passport', 'selfie_with_document', 'selfie_liveness', 'proof_of_address', 'proof_of_income', 'other', name='kycdocumenttype'), nullable=False),
        sa.Column('status', sa.Enum('pending', 'analyzing', 'approved', 'rejected', 'expired', name='kycdocstatus'), default='pending'),
        
        # Arquivo
        sa.Column('original_name', sa.String(255), nullable=False),
        sa.Column('s3_key', sa.String(500), nullable=False),
        sa.Column('s3_bucket', sa.String(100), nullable=False),
        sa.Column('file_hash', sa.String(64), nullable=False),
        sa.Column('mime_type', sa.String(50), nullable=False),
        sa.Column('file_size', sa.Integer, nullable=False),
        
        # OCR/Extração
        sa.Column('ocr_processed', sa.Boolean, default=False),
        sa.Column('ocr_data', postgresql.JSONB, nullable=True),
        sa.Column('ocr_confidence', sa.Numeric(5, 2), nullable=True),
        sa.Column('extracted_name', sa.String(200), nullable=True),
        sa.Column('extracted_cpf', sa.String(20), nullable=True),
        sa.Column('extracted_birth_date', sa.Date, nullable=True),
        
        # Biometria facial
        sa.Column('face_detected', sa.Boolean, nullable=True),
        sa.Column('face_count', sa.Integer, nullable=True),
        sa.Column('face_match_score', sa.Numeric(5, 2), nullable=True),
        sa.Column('face_reference_doc_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('liveness_passed', sa.Boolean, nullable=True),
        sa.Column('liveness_score', sa.Numeric(5, 2), nullable=True),
        sa.Column('is_screenshot', sa.Boolean, nullable=True),
        sa.Column('is_photo_of_photo', sa.Boolean, nullable=True),
        
        # Análise de fraude
        sa.Column('fraud_indicators', postgresql.JSONB, nullable=True),
        
        # Revisão
        sa.Column('rejection_reason', sa.Text, nullable=True),
        sa.Column('reviewed_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        
        # Timestamps
        sa.Column('uploaded_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )
    
    # Índices
    op.create_index('ix_kyc_documents_verification_id', 'kyc_documents', ['verification_id'])
    op.create_index('ix_kyc_documents_document_type', 'kyc_documents', ['document_type'])
    op.create_index('ix_kyc_documents_status', 'kyc_documents', ['status'])
    op.create_index('ix_kyc_documents_file_hash', 'kyc_documents', ['file_hash'])
    
    # 4. KYC Audit Log - registro de todas as ações
    op.create_table(
        'kyc_audit_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('verification_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('kyc_verifications.id', ondelete='CASCADE'), nullable=False),
        sa.Column('action', sa.Enum('verification_started', 'personal_data_submitted', 'document_uploaded', 'document_deleted', 'document_analyzed', 'document_viewed', 'submitted_for_review', 'auto_analysis_completed', 'manual_review_started', 'approved', 'rejected', 'documents_requested', 'level_upgraded', 'data_exported', 'data_deleted', name='kycauditaction'), nullable=False),
        sa.Column('actor_type', sa.Enum('user', 'admin', 'system', name='kycactortype'), nullable=False),
        sa.Column('actor_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('old_status', sa.String(50), nullable=True),
        sa.Column('new_status', sa.String(50), nullable=True),
        sa.Column('details', postgresql.JSONB, nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    
    # Índices
    op.create_index('ix_kyc_audit_logs_verification_id', 'kyc_audit_logs', ['verification_id'])
    op.create_index('ix_kyc_audit_logs_action', 'kyc_audit_logs', ['action'])
    op.create_index('ix_kyc_audit_logs_actor_id', 'kyc_audit_logs', ['actor_id'])
    op.create_index('ix_kyc_audit_logs_created_at', 'kyc_audit_logs', ['created_at'])
    
    # 5. KYC Service Limits - limites por nível
    op.create_table(
        'kyc_service_limits',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('kyc_level', sa.Enum('none', 'basic', 'intermediate', 'advanced', name='kyclevel_limits'), nullable=False),
        sa.Column('service_type', sa.String(50), nullable=False),  # instant_trade, p2p, wolkpay, etc
        sa.Column('daily_limit_brl', sa.Numeric(18, 2), nullable=True),
        sa.Column('monthly_limit_brl', sa.Numeric(18, 2), nullable=True),
        sa.Column('transaction_limit_brl', sa.Numeric(18, 2), nullable=True),
        sa.Column('requires_approval', sa.Boolean, default=False),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )
    
    # Unique constraint
    op.create_unique_constraint('uq_kyc_service_limits_level_service', 'kyc_service_limits', ['kyc_level', 'service_type'])
    
    # Índices
    op.create_index('ix_kyc_service_limits_kyc_level', 'kyc_service_limits', ['kyc_level'])
    op.create_index('ix_kyc_service_limits_service_type', 'kyc_service_limits', ['service_type'])
    
    # Inserir limites padrão
    op.execute("""
        INSERT INTO kyc_service_limits (id, kyc_level, service_type, daily_limit_brl, monthly_limit_brl, transaction_limit_brl, requires_approval, is_active)
        VALUES 
            -- None Level
            (gen_random_uuid(), 'none', 'instant_trade', 0, 0, 0, false, true),
            (gen_random_uuid(), 'none', 'p2p', 0, 0, 0, false, true),
            (gen_random_uuid(), 'none', 'wolkpay', 0, 0, 0, false, true),
            (gen_random_uuid(), 'none', 'bank_transfer', 0, 0, 0, false, true),
            
            -- Basic Level
            (gen_random_uuid(), 'basic', 'instant_trade', 3000, 30000, 1000, false, true),
            (gen_random_uuid(), 'basic', 'p2p', 5000, 50000, 2000, false, true),
            (gen_random_uuid(), 'basic', 'wolkpay', 0, 0, 0, false, true),
            (gen_random_uuid(), 'basic', 'bank_transfer', 3000, 30000, 1000, false, true),
            
            -- Intermediate Level
            (gen_random_uuid(), 'intermediate', 'instant_trade', 100000, 500000, 50000, false, true),
            (gen_random_uuid(), 'intermediate', 'p2p', 100000, 500000, 50000, false, true),
            (gen_random_uuid(), 'intermediate', 'wolkpay', 50000, 200000, 10000, false, true),
            (gen_random_uuid(), 'intermediate', 'bank_transfer', 100000, 500000, 50000, false, true),
            
            -- Advanced Level
            (gen_random_uuid(), 'advanced', 'instant_trade', 999999999, 999999999, 999999999, false, true),
            (gen_random_uuid(), 'advanced', 'p2p', 999999999, 999999999, 999999999, false, true),
            (gen_random_uuid(), 'advanced', 'wolkpay', 999999999, 999999999, 999999999, false, true),
            (gen_random_uuid(), 'advanced', 'bank_transfer', 999999999, 999999999, 999999999, false, true);
    """)


def downgrade():
    """Remove KYC tables."""
    
    # Drop tables in reverse order
    op.drop_table('kyc_service_limits')
    op.drop_table('kyc_audit_logs')
    op.drop_table('kyc_documents')
    op.drop_table('kyc_personal_data')
    op.drop_table('kyc_verifications')
    
    # Drop enums
    op.execute("DROP TYPE IF EXISTS kyclevel_limits")
    op.execute("DROP TYPE IF EXISTS kycactortype")
    op.execute("DROP TYPE IF EXISTS kycauditaction")
    op.execute("DROP TYPE IF EXISTS kycdocstatus")
    op.execute("DROP TYPE IF EXISTS kycdocumenttype")
    op.execute("DROP TYPE IF EXISTS kyclevel")
    op.execute("DROP TYPE IF EXISTS kycstatus")
