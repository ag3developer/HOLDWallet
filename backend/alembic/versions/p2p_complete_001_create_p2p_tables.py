"""create p2p tables

Revision ID: p2p_complete_001
Revises: 
Create Date: 2025-11-25 17:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'p2p_complete_001'
down_revision = None  # Altere para a última revisão existente
branch_labels = None
depends_on = None


def upgrade():
    # 1. payment_methods
    op.create_table(
        'payment_methods',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('type', sa.String(length=100), nullable=False),
        sa.Column('details', sa.Text(), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='1', nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_payment_methods_user_id', 'payment_methods', ['user_id'])
    op.create_index('idx_payment_methods_type', 'payment_methods', ['type'])

    # 2. p2p_orders
    op.create_table(
        'p2p_orders',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('order_type', sa.String(length=10), nullable=False),
        sa.Column('cryptocurrency', sa.String(length=20), nullable=False),
        sa.Column('fiat_currency', sa.String(length=10), server_default='BRL', nullable=False),
        sa.Column('price', sa.Numeric(precision=20, scale=8), nullable=False),
        sa.Column('total_amount', sa.Numeric(precision=20, scale=8), nullable=False),
        sa.Column('available_amount', sa.Numeric(precision=20, scale=8), nullable=False),
        sa.Column('min_order_limit', sa.Numeric(precision=20, scale=8), nullable=False),
        sa.Column('max_order_limit', sa.Numeric(precision=20, scale=8), nullable=False),
        sa.Column('time_limit', sa.Integer(), server_default='30', nullable=True),
        sa.Column('payment_methods', sa.Text(), nullable=True),
        sa.Column('terms', sa.Text(), nullable=True),
        sa.Column('auto_reply', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=20), server_default='active', nullable=True),
        sa.Column('completed_trades', sa.Integer(), server_default='0', nullable=True),
        sa.Column('total_volume', sa.Numeric(precision=20, scale=8), server_default='0', nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.CheckConstraint("order_type IN ('buy', 'sell')", name='check_p2p_orders_order_type'),
        sa.CheckConstraint("status IN ('active', 'paused', 'completed', 'cancelled')", name='check_p2p_orders_status'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_p2p_orders_user_id', 'p2p_orders', ['user_id'])
    op.create_index('idx_p2p_orders_type', 'p2p_orders', ['order_type'])
    op.create_index('idx_p2p_orders_status', 'p2p_orders', ['status'])
    op.create_index('idx_p2p_orders_crypto', 'p2p_orders', ['cryptocurrency'])
    op.create_index('idx_p2p_orders_fiat', 'p2p_orders', ['fiat_currency'])
    op.create_index('idx_p2p_orders_created', 'p2p_orders', [sa.text('created_at DESC')])

    # 3. p2p_trades
    op.create_table(
        'p2p_trades',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('order_id', sa.Integer(), nullable=False),
        sa.Column('buyer_id', sa.Integer(), nullable=False),
        sa.Column('seller_id', sa.Integer(), nullable=False),
        sa.Column('cryptocurrency', sa.String(length=20), nullable=False),
        sa.Column('fiat_currency', sa.String(length=10), nullable=False),
        sa.Column('amount', sa.Numeric(precision=20, scale=8), nullable=False),
        sa.Column('price', sa.Numeric(precision=20, scale=8), nullable=False),
        sa.Column('total_fiat', sa.Numeric(precision=20, scale=8), nullable=False),
        sa.Column('payment_method_id', sa.Integer(), nullable=True),
        sa.Column('payment_proof', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=20), server_default='pending', nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('payment_sent_at', sa.DateTime(), nullable=True),
        sa.Column('payment_confirmed_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('cancelled_at', sa.DateTime(), nullable=True),
        sa.Column('escrow_transaction_id', sa.Integer(), nullable=True),
        sa.Column('escrow_released', sa.Boolean(), server_default='false', nullable=True),
        sa.Column('cancellation_reason', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.CheckConstraint(
            "status IN ('pending', 'payment_sent', 'payment_confirmed', 'releasing', 'completed', 'cancelled', 'disputed')", 
            name='check_p2p_trades_status'
        ),
        sa.ForeignKeyConstraint(['order_id'], ['p2p_orders.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['buyer_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['seller_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['payment_method_id'], ['payment_methods.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_p2p_trades_order_id', 'p2p_trades', ['order_id'])
    op.create_index('idx_p2p_trades_buyer_id', 'p2p_trades', ['buyer_id'])
    op.create_index('idx_p2p_trades_seller_id', 'p2p_trades', ['seller_id'])
    op.create_index('idx_p2p_trades_status', 'p2p_trades', ['status'])
    op.create_index('idx_p2p_trades_created', 'p2p_trades', [sa.text('created_at DESC')])
    op.create_index('idx_p2p_trades_expires', 'p2p_trades', ['expires_at'])

    # 4. p2p_messages
    op.create_table(
        'p2p_messages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('trade_id', sa.Integer(), nullable=False),
        sa.Column('sender_id', sa.Integer(), nullable=False),
        sa.Column('message_type', sa.String(length=20), server_default='text', nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('is_read', sa.Boolean(), server_default='false', nullable=True),
        sa.Column('read_at', sa.DateTime(), nullable=True),
        sa.Column('attachment_url', sa.Text(), nullable=True),
        sa.Column('attachment_type', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.CheckConstraint("message_type IN ('text', 'image', 'file', 'system')", name='check_p2p_messages_type'),
        sa.ForeignKeyConstraint(['trade_id'], ['p2p_trades.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['sender_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_p2p_messages_trade_id', 'p2p_messages', ['trade_id'])
    op.create_index('idx_p2p_messages_sender_id', 'p2p_messages', ['sender_id'])
    op.create_index('idx_p2p_messages_created', 'p2p_messages', [sa.text('created_at DESC')])

    # 5. p2p_disputes
    op.create_table(
        'p2p_disputes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('trade_id', sa.Integer(), nullable=False),
        sa.Column('opened_by_user_id', sa.Integer(), nullable=False),
        sa.Column('reason', sa.String(length=50), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('evidence', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=20), server_default='open', nullable=True),
        sa.Column('resolution', sa.Text(), nullable=True),
        sa.Column('resolved_by_admin_id', sa.Integer(), nullable=True),
        sa.Column('resolved_at', sa.DateTime(), nullable=True),
        sa.Column('winner_user_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.CheckConstraint("status IN ('open', 'investigating', 'resolved', 'closed')", name='check_p2p_disputes_status'),
        sa.ForeignKeyConstraint(['trade_id'], ['p2p_trades.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['opened_by_user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['resolved_by_admin_id'], ['users.id']),
        sa.ForeignKeyConstraint(['winner_user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_p2p_disputes_trade_id', 'p2p_disputes', ['trade_id'])
    op.create_index('idx_p2p_disputes_opened_by', 'p2p_disputes', ['opened_by_user_id'])
    op.create_index('idx_p2p_disputes_status', 'p2p_disputes', ['status'])

    # 6. p2p_feedbacks
    op.create_table(
        'p2p_feedbacks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('trade_id', sa.Integer(), nullable=False),
        sa.Column('from_user_id', sa.Integer(), nullable=False),
        sa.Column('to_user_id', sa.Integer(), nullable=False),
        sa.Column('rating', sa.Integer(), nullable=False),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('feedback_type', sa.String(length=20), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.CheckConstraint('rating >= 1 AND rating <= 5', name='check_p2p_feedbacks_rating'),
        sa.CheckConstraint("feedback_type IN ('positive', 'neutral', 'negative')", name='check_p2p_feedbacks_type'),
        sa.ForeignKeyConstraint(['trade_id'], ['p2p_trades.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['from_user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['to_user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('trade_id', 'from_user_id', name='unique_feedback_per_trade')
    )
    op.create_index('idx_p2p_feedbacks_trade_id', 'p2p_feedbacks', ['trade_id'])
    op.create_index('idx_p2p_feedbacks_from_user', 'p2p_feedbacks', ['from_user_id'])
    op.create_index('idx_p2p_feedbacks_to_user', 'p2p_feedbacks', ['to_user_id'])
    op.create_index('idx_p2p_feedbacks_rating', 'p2p_feedbacks', ['rating'])

    # 7. user_p2p_stats
    op.create_table(
        'user_p2p_stats',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('total_trades', sa.Integer(), server_default='0', nullable=True),
        sa.Column('completed_trades', sa.Integer(), server_default='0', nullable=True),
        sa.Column('cancelled_trades', sa.Integer(), server_default='0', nullable=True),
        sa.Column('total_volume_btc', sa.Numeric(precision=20, scale=8), server_default='0', nullable=True),
        sa.Column('total_volume_usd', sa.Numeric(precision=20, scale=8), server_default='0', nullable=True),
        sa.Column('total_rating', sa.Numeric(precision=3, scale=2), server_default='0', nullable=True),
        sa.Column('total_feedbacks', sa.Integer(), server_default='0', nullable=True),
        sa.Column('positive_feedbacks', sa.Integer(), server_default='0', nullable=True),
        sa.Column('neutral_feedbacks', sa.Integer(), server_default='0', nullable=True),
        sa.Column('negative_feedbacks', sa.Integer(), server_default='0', nullable=True),
        sa.Column('completion_rate', sa.Numeric(precision=5, scale=2), server_default='0', nullable=True),
        sa.Column('average_payment_time', sa.Integer(), server_default='0', nullable=True),
        sa.Column('average_release_time', sa.Integer(), server_default='0', nullable=True),
        sa.Column('badges', sa.Text(), nullable=True),
        sa.Column('first_trade_at', sa.DateTime(), nullable=True),
        sa.Column('last_trade_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', name='unique_user_p2p_stats')
    )
    op.create_index('idx_user_p2p_stats_user_id', 'user_p2p_stats', ['user_id'])
    op.create_index('idx_user_p2p_stats_rating', 'user_p2p_stats', [sa.text('total_rating DESC')])
    op.create_index('idx_user_p2p_stats_trades', 'user_p2p_stats', [sa.text('completed_trades DESC')])

    # 8. p2p_escrow_transactions
    op.create_table(
        'p2p_escrow_transactions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('trade_id', sa.Integer(), nullable=False),
        sa.Column('cryptocurrency', sa.String(length=20), nullable=False),
        sa.Column('amount', sa.Numeric(precision=20, scale=8), nullable=False),
        sa.Column('transaction_type', sa.String(length=20), nullable=False),
        sa.Column('status', sa.String(length=20), server_default='pending', nullable=True),
        sa.Column('tx_hash', sa.String(length=200), nullable=True),
        sa.Column('block_number', sa.Integer(), nullable=True),
        sa.Column('from_user_id', sa.Integer(), nullable=True),
        sa.Column('to_user_id', sa.Integer(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('confirmed_at', sa.DateTime(), nullable=True),
        sa.CheckConstraint("transaction_type IN ('lock', 'release', 'refund')", name='check_p2p_escrow_tx_type'),
        sa.CheckConstraint("status IN ('pending', 'confirmed', 'failed')", name='check_p2p_escrow_status'),
        sa.ForeignKeyConstraint(['trade_id'], ['p2p_trades.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['from_user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['to_user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_p2p_escrow_trade_id', 'p2p_escrow_transactions', ['trade_id'])
    op.create_index('idx_p2p_escrow_type', 'p2p_escrow_transactions', ['transaction_type'])
    op.create_index('idx_p2p_escrow_status', 'p2p_escrow_transactions', ['status'])


def downgrade():
    # Drop tables in reverse order (respecting foreign keys)
    op.drop_table('p2p_escrow_transactions')
    op.drop_table('user_p2p_stats')
    op.drop_table('p2p_feedbacks')
    op.drop_table('p2p_disputes')
    op.drop_table('p2p_messages')
    op.drop_table('p2p_trades')
    op.drop_table('p2p_orders')
    op.drop_table('payment_methods')
