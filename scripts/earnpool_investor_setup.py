#!/usr/bin/env python3
"""
🌐 Setup de Investidor - EarnPool
==================================

Script para criar créditos virtuais e taxas de performance para investidores
que não foram processados automaticamente pelo sistema.

Uso:
python scripts/earnpool_investor_setup.py \
  --user-id <UUID> \
  --initial-amount <USDT> \
  --performance-percentage <PERCENT> \
  --reason <INVESTOR_CORRECTION|MISSING_DEPOSIT|OTHER> \
  --period-description "Operações Passadas 2024" \
  --admin-id <UUID>

Exemplo:
python scripts/earnpool_investor_setup.py \
  --user-id "550e8400-e29b-41d4-a716-446655440000" \
  --initial-amount 2779.00 \
  --performance-percentage 0.35 \
  --reason INVESTOR_CORRECTION \
  --period-description "Operações Passadas - Investidor externo" \
  --admin-id "550e8400-e29b-41d4-a716-446655440001"

Resultado esperado:
- Crédito Virtual: 2.779,00 USDT
- Taxa Performance (0.35%): 9,73 USDT
- Total Creditado: 2.788,73 USDT

O investidor passa a gerar rendimentos imediatamente sobre ambos os valores.
"""

import sys
import os
import uuid
from decimal import Decimal
from datetime import datetime, timezone
import argparse
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('earnpool_investor_setup')

# Add backend to path
backend_path = os.path.join(os.path.dirname(__file__), '..', 'backend')
sys.path.insert(0, backend_path)

from app.core.db import SessionLocal, Base, engine
from app.models.earnpool import EarnPoolVirtualCredit, EarnPoolPerformanceFee
from app.models.user import User


def setup_investor(
    user_id: str,
    initial_amount: Decimal,
    performance_percentage: Decimal,
    reason: str,
    period_description: str,
    admin_id: str,
    reason_details: str = None,
    notes: str = None
) -> dict:
    """
    Setup completo de um investidor no EarnPool.
    
    1. Cria Virtual Credit com o montante inicial
    2. Cria Performance Fee com taxa sobre operações passadas
    3. Cria Virtual Credit adicional creditando a taxa
    
    Returns:
        Dict com os dados criados
    """
    db = SessionLocal()
    
    try:
        # Verificar se usuário existe
        user = db.query(User).filter(User.id == uuid.UUID(user_id)).first()
        if not user:
            raise ValueError(f"❌ Usuário {user_id} não encontrado")
        
        # Verificar se admin existe
        admin = db.query(User).filter(User.id == uuid.UUID(admin_id)).first()
        if not admin:
            raise ValueError(f"❌ Admin {admin_id} não encontrado")
        
        logger.info(f"📊 Iniciando setup do investidor {user.email}")
        logger.info(f"   Montante: ${initial_amount} USDT")
        logger.info(f"   Performance: {performance_percentage}%")
        
        # 1. Criar Virtual Credit inicial
        vc_id = uuid.uuid4()
        virtual_credit = EarnPoolVirtualCredit(
            id=vc_id,
            user_id=uuid.UUID(user_id),
            usdt_amount=initial_amount,
            reason=reason,
            reason_details=reason_details or f"Investidor - {period_description}",
            credited_by_admin_id=uuid.UUID(admin_id),
            notes=notes,
            credited_at=datetime.now(timezone.utc)
        )
        db.add(virtual_credit)
        logger.info(f"✅ Virtual Credit criado: ${initial_amount} USDT (ID: {vc_id})")
        
        # 2. Criar Performance Fee
        fee_amount = initial_amount * (performance_percentage / Decimal("100"))
        pf_id = uuid.uuid4()
        
        performance_fee = EarnPoolPerformanceFee(
            id=pf_id,
            user_id=uuid.UUID(user_id),
            base_amount_usdt=initial_amount,
            performance_percentage=performance_percentage,
            fee_amount_usdt=fee_amount,
            period_description=period_description,
            created_by_admin_id=uuid.UUID(admin_id),
            notes=f"Taxa de performance {performance_percentage}% - {notes or ''}",
            status="CALCULATED",
            created_at=datetime.now(timezone.utc)
        )
        db.add(performance_fee)
        logger.info(f"✅ Performance Fee criado: ${fee_amount} ({performance_percentage}% de ${initial_amount})")
        
        # 3. Criar Virtual Credit para a taxa de performance
        pf_vc_id = uuid.uuid4()
        performance_vc = EarnPoolVirtualCredit(
            id=pf_vc_id,
            user_id=uuid.UUID(user_id),
            usdt_amount=fee_amount,
            reason="PERFORMANCE_FEE",
            reason_details=f"Taxa de performance {performance_percentage}% - {period_description}",
            credited_by_admin_id=uuid.UUID(admin_id),
            notes=f"Crédito automático da taxa de performance (ID: {pf_id})",
            credited_at=datetime.now(timezone.utc)
        )
        db.add(performance_vc)
        
        # Atualizar status da performance fee
        performance_fee.virtual_credit_id = pf_vc_id
        performance_fee.status = "CREDITED"
        performance_fee.credited_at = datetime.now(timezone.utc)
        
        logger.info(f"✅ Virtual Credit (Taxa) criado: ${fee_amount} USDT (ID: {pf_vc_id})")
        
        # Commit
        db.commit()
        
        # Refresh para obter dados atualizados
        db.refresh(virtual_credit)
        db.refresh(performance_fee)
        db.refresh(performance_vc)
        
        total_credited = initial_amount + fee_amount
        
        logger.info("")
        logger.info("=" * 60)
        logger.info("✨ SETUP COMPLETO DO INVESTIDOR ✨")
        logger.info("=" * 60)
        logger.info(f"Usuário: {user.email}")
        logger.info(f"Crédito Inicial: ${initial_amount} USDT")
        logger.info(f"Taxa de Performance: ${fee_amount} USDT ({performance_percentage}%)")
        logger.info(f"TOTAL CREDITADO: ${total_credited} USDT")
        logger.info("")
        logger.info("Próximas etapas:")
        logger.info("1. Investidor passa a gerar rendimentos sobre AMBOS os créditos")
        logger.info("2. Saques funcionam normalmente após período mínimo")
        logger.info("3. Histórico completo de auditoria disponível no banco")
        logger.info("=" * 60)
        
        return {
            "success": True,
            "user_id": user_id,
            "user_email": user.email,
            "virtual_credit": {
                "id": str(vc_id),
                "amount_usdt": float(initial_amount),
                "reason": reason
            },
            "performance_fee": {
                "id": str(pf_id),
                "base_amount_usdt": float(initial_amount),
                "percentage": float(performance_percentage),
                "fee_amount_usdt": float(fee_amount),
                "virtual_credit_id": str(pf_vc_id)
            },
            "summary": {
                "total_credited_usdt": float(total_credited),
                "period": period_description
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Erro no setup: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(
        description="Setup de Investidor no EarnPool",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemplos:

1. Setup básico (apenas crédito, sem taxa):
   python earnpool_investor_setup.py \\
     --user-id "550e8400-e29b-41d4-a716-446655440000" \\
     --initial-amount 2779.00 \\
     --admin-id "550e8400-e29b-41d4-a716-446655440001"

2. Setup completo (com taxa de performance):
   python earnpool_investor_setup.py \\
     --user-id "550e8400-e29b-41d4-a716-446655440000" \\
     --initial-amount 2779.00 \\
     --performance-percentage 0.35 \\
     --reason INVESTOR_CORRECTION \\
     --period-description "Operações Passadas 2024" \\
     --admin-id "550e8400-e29b-41d4-a716-446655440001"
        """
    )
    
    parser.add_argument('--user-id', required=True, help='ID do usuário (UUID)')
    parser.add_argument('--initial-amount', type=float, required=True, help='Montante em USDT')
    parser.add_argument('--performance-percentage', type=float, default=0, help='Percentual de taxa de performance')
    parser.add_argument('--reason', default='INVESTOR_CORRECTION', help='Motivo do crédito')
    parser.add_argument('--reason-details', help='Detalhes do motivo')
    parser.add_argument('--period-description', default='Operações Passadas', help='Descrição do período')
    parser.add_argument('--admin-id', required=True, help='ID do admin (UUID)')
    parser.add_argument('--notes', help='Notas internas')
    
    args = parser.parse_args()
    
    try:
        result = setup_investor(
            user_id=args.user_id,
            initial_amount=Decimal(str(args.initial_amount)),
            performance_percentage=Decimal(str(args.performance_percentage)),
            reason=args.reason,
            period_description=args.period_description,
            admin_id=args.admin_id,
            reason_details=args.reason_details,
            notes=args.notes
        )
        
        print("\n")
        print("📊 RESULTADO DO SETUP:")
        print(f"   Crédito Inicial: ${result['virtual_credit']['amount_usdt']}")
        print(f"   Taxa de Performance: ${result['performance_fee']['fee_amount_usdt']}")
        print(f"   TOTAL: ${result['summary']['total_credited_usdt']}")
        
        return 0
        
    except Exception as e:
        print(f"Erro: {str(e)}", file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
