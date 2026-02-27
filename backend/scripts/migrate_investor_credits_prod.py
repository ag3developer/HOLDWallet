#!/usr/bin/env python3
"""
Script para migrar créditos de investidores para produção (PostgreSQL DigitalOcean)

Usa credenciais do .env para conectar ao banco de produção e:
1. Cria as tabelas EarnPoolVirtualCredit e EarnPoolPerformanceFee
2. Insere dados dos investidores manualmente creditados
3. Valida integridade dos dados

Uso:
    python migrate_investor_credits_prod.py --investor-uuid <uuid> --amount <usdt> --performance <pct>
    python migrate_investor_credits_prod.py --setup  # Criar tabelas
    python migrate_investor_credits_prod.py --test   # Teste de conexão
"""

import os
import sys
import argparse
import logging
from decimal import Decimal
from datetime import datetime
from typing import Optional
from uuid import UUID
from pathlib import Path

# Load environment variables
from dotenv import load_dotenv

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('migrate_investor_credits.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Load .env from backend directory
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

# Get database URL from environment
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    logger.error('DATABASE_URL not found in .env')
    sys.exit(1)

logger.info(f'Conectando ao banco: {DATABASE_URL.split("@")[1][:50]}...')


class InvestorCreditsManager:
    """Gerenciador de créditos de investidores para produção"""
    
    def __init__(self, db_url: str):
        """Inicializa conexão com banco de dados"""
        self.engine = create_engine(
            db_url,
            echo=False,
            poolclass=QueuePool,
            pool_size=5,
            max_overflow=10,
            pool_pre_ping=True,
            pool_recycle=3600,
        )
        self.SessionLocal = sessionmaker(bind=self.engine, expire_on_commit=False)
    
    def test_connection(self) -> bool:
        """Testa conexão com o banco de dados"""
        try:
            with self.engine.connect() as conn:
                result = conn.execute(text('SELECT 1'))
                logger.info('✅ Conexão com banco de dados estabelecida')
                return True
        except Exception as e:
            logger.error(f'❌ Erro ao conectar ao banco: {e}')
            return False
    
    def table_exists(self, table_name: str) -> bool:
        """Verifica se uma tabela existe"""
        inspector = inspect(self.engine)
        return table_name in inspector.get_table_names()
    
    def create_tables(self) -> bool:
        """Cria as tabelas de créditos de investidores"""
        try:
            with self.engine.connect() as conn:
                # Criar tabela EarnPoolVirtualCredit
                conn.execute(text('''
                    CREATE TABLE IF NOT EXISTS earnpool_virtual_credits (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        user_id UUID NOT NULL,
                        usdt_amount NUMERIC(18,2) NOT NULL CHECK (usdt_amount > 0),
                        reason VARCHAR(50) NOT NULL DEFAULT 'INVESTOR_CORRECTION',
                        reason_details TEXT,
                        total_yield_earned NUMERIC(18,2) DEFAULT 0,
                        is_active BOOLEAN DEFAULT true,
                        credited_by_admin_id UUID NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                        FOREIGN KEY (credited_by_admin_id) REFERENCES users(id)
                    )
                '''))
                
                # Criar índices
                conn.execute(text('''
                    CREATE INDEX IF NOT EXISTS idx_earnpool_vc_user_id 
                    ON earnpool_virtual_credits(user_id)
                '''))
                conn.execute(text('''
                    CREATE INDEX IF NOT EXISTS idx_earnpool_vc_created_at 
                    ON earnpool_virtual_credits(created_at)
                '''))
                
                # Criar tabela EarnPoolPerformanceFee
                conn.execute(text('''
                    CREATE TABLE IF NOT EXISTS earnpool_performance_fees (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        user_id UUID NOT NULL,
                        base_amount_usdt NUMERIC(18,2) NOT NULL CHECK (base_amount_usdt > 0),
                        performance_percentage NUMERIC(5,2) NOT NULL 
                            CHECK (performance_percentage >= 0 AND performance_percentage <= 100),
                        fee_amount_usdt NUMERIC(18,2) NOT NULL CHECK (fee_amount_usdt > 0),
                        virtual_credit_id UUID REFERENCES earnpool_virtual_credits(id),
                        period_description VARCHAR(255),
                        status VARCHAR(50) DEFAULT 'CALCULATED',
                        created_by_admin_id UUID NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                        FOREIGN KEY (created_by_admin_id) REFERENCES users(id)
                    )
                '''))
                
                # Criar índices
                conn.execute(text('''
                    CREATE INDEX IF NOT EXISTS idx_earnpool_pf_user_id 
                    ON earnpool_performance_fees(user_id)
                '''))
                conn.execute(text('''
                    CREATE INDEX IF NOT EXISTS idx_earnpool_pf_created_at 
                    ON earnpool_performance_fees(created_at)
                '''))
                
                conn.commit()
                logger.info('✅ Tabelas de créditos de investidores criadas com sucesso')
                return True
        except Exception as e:
            logger.error(f'❌ Erro ao criar tabelas: {e}')
            return False
    
    def add_investor_credit(
        self,
        user_id: str,
        usdt_amount: Decimal,
        reason: str = 'INVESTOR_CORRECTION',
        reason_details: Optional[str] = None,
        admin_id: Optional[str] = None,
    ) -> bool:
        """Adiciona crédito virtual para investidor"""
        try:
            session = self.SessionLocal()
            
            # Validar UUID
            try:
                UUID(user_id)
                if admin_id:
                    UUID(admin_id)
            except ValueError:
                logger.error(f'UUID inválido: user_id={user_id}, admin_id={admin_id}')
                return False
            
            # Usar admin_id fornecido ou primeiro admin do banco
            if not admin_id:
                result = session.execute(
                    text("SELECT id FROM users WHERE role = 'admin' LIMIT 1")
                )
                admin_row = result.first()
                if not admin_row:
                    logger.error('Nenhum admin encontrado no banco')
                    return False
                admin_id = str(admin_row[0])
            
            # Inserir crédito virtual
            session.execute(text('''
                INSERT INTO earnpool_virtual_credits 
                (user_id, usdt_amount, reason, reason_details, credited_by_admin_id)
                VALUES (:user_id, :usdt_amount, :reason, :reason_details, :admin_id)
            '''), {
                'user_id': user_id,
                'usdt_amount': usdt_amount,
                'reason': reason,
                'reason_details': reason_details or reason,
                'admin_id': admin_id
            })
            
            session.commit()
            logger.info(f'✅ Crédito virtual criado: {usdt_amount} USDT para {user_id}')
            return True
        except Exception as e:
            logger.error(f'❌ Erro ao adicionar crédito virtual: {e}')
            return False
        finally:
            session.close()
    
    def add_performance_fee(
        self,
        user_id: str,
        base_amount_usdt: Decimal,
        performance_percentage: Decimal,
        period_description: str = 'Operações Passadas',
        admin_id: Optional[str] = None,
        auto_create_credit: bool = True,
    ) -> bool:
        """Adiciona taxa de performance (e opcionalmente cria crédito virtual associado)"""
        try:
            session = self.SessionLocal()
            
            # Validar UUID
            try:
                UUID(user_id)
                if admin_id:
                    UUID(admin_id)
            except ValueError:
                logger.error(f'UUID inválido: user_id={user_id}, admin_id={admin_id}')
                return False
            
            # Usar admin_id fornecido ou primeiro admin do banco
            if not admin_id:
                result = session.execute(
                    text("SELECT id FROM users WHERE role = 'admin' LIMIT 1")
                )
                admin_row = result.first()
                if not admin_row:
                    logger.error('Nenhum admin encontrado no banco')
                    return False
                admin_id = str(admin_row[0])
            
            # Calcular fee
            fee_amount = base_amount_usdt * (performance_percentage / Decimal('100'))
            
            # Inserir performance fee
            result = session.execute(text('''
                INSERT INTO earnpool_performance_fees 
                (user_id, base_amount_usdt, performance_percentage, fee_amount_usdt, 
                 period_description, created_by_admin_id)
                VALUES (:user_id, :base_amount, :perf_pct, :fee_amount, :period, :admin_id)
                RETURNING id
            '''), {
                'user_id': user_id,
                'base_amount': base_amount_usdt,
                'perf_pct': performance_percentage,
                'fee_amount': fee_amount,
                'period': period_description,
                'admin_id': admin_id
            })
            
            fee_id = result.scalar()
            
            # Criar crédito virtual associado
            if auto_create_credit:
                session.execute(text('''
                    INSERT INTO earnpool_virtual_credits 
                    (user_id, usdt_amount, reason, reason_details, credited_by_admin_id)
                    VALUES (:user_id, :fee_amount, 'PERFORMANCE_FEE', 
                            'Performance fee ' || :period, :admin_id)
                '''), {
                    'user_id': user_id,
                    'fee_amount': fee_amount,
                    'period': period_description,
                    'admin_id': admin_id
                })
            
            session.commit()
            logger.info(
                f'✅ Taxa de performance criada: {fee_amount} USDT ({performance_percentage}%) '
                f'para {user_id}'
            )
            return True
        except Exception as e:
            logger.error(f'❌ Erro ao adicionar taxa de performance: {e}')
            return False
        finally:
            session.close()
    
    def get_investor_totals(self, user_id: str) -> Optional[dict]:
        """Obtém totais de créditos para um investidor"""
        try:
            session = self.SessionLocal()
            
            result = session.execute(text('''
                SELECT 
                    COALESCE(SUM(vc.usdt_amount), 0) as total_virtual_credits,
                    COALESCE(SUM(pf.fee_amount_usdt), 0) as total_performance_fees,
                    COALESCE(SUM(vc.usdt_amount) + SUM(pf.fee_amount_usdt), 0) as total_balance
                FROM users u
                LEFT JOIN earnpool_virtual_credits vc ON u.id = vc.user_id
                LEFT JOIN earnpool_performance_fees pf ON u.id = pf.user_id
                WHERE u.id = :user_id
            '''), {'user_id': user_id})
            
            row = result.first()
            if row:
                return {
                    'total_virtual_credits_usdt': float(row[0]),
                    'total_performance_fees_usdt': float(row[1]),
                    'total_investor_balance_usdt': float(row[2]),
                }
            return None
        except Exception as e:
            logger.error(f'❌ Erro ao obter totais: {e}')
            return None
        finally:
            session.close()


def main():
    parser = argparse.ArgumentParser(
        description='Migrar créditos de investidores para produção'
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Comando a executar')
    
    # Comando: test
    subparsers.add_parser('test', help='Testar conexão com banco')
    
    # Comando: setup
    subparsers.add_parser('setup', help='Criar tabelas de créditos')
    
    # Comando: add-credit
    add_credit_parser = subparsers.add_parser('add-credit', help='Adicionar crédito virtual')
    add_credit_parser.add_argument('--user-id', required=True, help='UUID do usuário')
    add_credit_parser.add_argument('--amount', type=Decimal, required=True, help='Montante em USDT')
    add_credit_parser.add_argument('--reason', default='INVESTOR_CORRECTION', help='Motivo')
    add_credit_parser.add_argument('--notes', help='Observações')
    add_credit_parser.add_argument('--admin-id', help='UUID do admin')
    
    # Comando: add-fee
    add_fee_parser = subparsers.add_parser('add-fee', help='Adicionar taxa de performance')
    add_fee_parser.add_argument('--user-id', required=True, help='UUID do usuário')
    add_fee_parser.add_argument('--base-amount', type=Decimal, required=True, help='Base em USDT')
    add_fee_parser.add_argument('--performance', type=Decimal, required=True, help='Percentual (%)')
    add_fee_parser.add_argument('--period', default='Operações Passadas', help='Período')
    add_fee_parser.add_argument('--admin-id', help='UUID do admin')
    
    # Comando: get-totals
    get_totals_parser = subparsers.add_parser('get-totals', help='Obter totais de um investidor')
    get_totals_parser.add_argument('--user-id', required=True, help='UUID do usuário')
    
    args = parser.parse_args()
    
    manager = InvestorCreditsManager(DATABASE_URL)
    
    if args.command == 'test':
        manager.test_connection()
    
    elif args.command == 'setup':
        logger.info('Criando tabelas...')
        if manager.create_tables():
            logger.info('✅ Setup concluído com sucesso')
        else:
            logger.error('❌ Setup falhou')
            sys.exit(1)
    
    elif args.command == 'add-credit':
        if manager.add_investor_credit(
            user_id=args.user_id,
            usdt_amount=args.amount,
            reason=args.reason,
            reason_details=args.notes,
            admin_id=args.admin_id
        ):
            totals = manager.get_investor_totals(args.user_id)
            if totals:
                logger.info(f'Totais atualizados: {totals}')
        else:
            sys.exit(1)
    
    elif args.command == 'add-fee':
        if manager.add_performance_fee(
            user_id=args.user_id,
            base_amount_usdt=args.base_amount,
            performance_percentage=args.performance,
            period_description=args.period,
            admin_id=args.admin_id
        ):
            totals = manager.get_investor_totals(args.user_id)
            if totals:
                logger.info(f'Totais atualizados: {totals}')
        else:
            sys.exit(1)
    
    elif args.command == 'get-totals':
        totals = manager.get_investor_totals(args.user_id)
        if totals:
            logger.info(f'Totais para {args.user_id}:')
            for key, value in totals.items():
                logger.info(f'  {key}: ${value:.2f}')
        else:
            logger.error('Usuário não encontrado')
            sys.exit(1)
    
    else:
        parser.print_help()


if __name__ == '__main__':
    main()
