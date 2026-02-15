"""
🎁 Referral Jobs - WOLK FRIENDS
===============================
Jobs agendados para o programa de indicação

@version 1.0.0
"""

import logging
from datetime import datetime
from sqlalchemy.orm import Session
from app.core.db import get_db

logger = logging.getLogger(__name__)


def mark_inactive_referrals():
    """
    Job para marcar indicações inativas (sem transação há 30+ dias)
    
    Deve ser executado diariamente via cron ou APScheduler
    
    Returns:
        Número de indicações marcadas como inativas
    """
    from app.services.referral_service import ReferralService
    
    logger.info("🔄 [REFERRAL JOB] Iniciando verificação de indicações inativas...")
    
    try:
        # Cria sessão do banco
        db = next(get_db())
        
        try:
            referral_service = ReferralService(db)
            count = referral_service.check_and_update_inactive_referrals()
            
            logger.info(f"✅ [REFERRAL JOB] Concluído: {count} indicações marcadas como inativas")
            
            return count
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"❌ [REFERRAL JOB] Erro ao marcar indicações inativas: {e}")
        return 0


def process_pending_commissions():
    """
    Job para processar comissões pendentes de pagamento
    
    Deve ser executado periodicamente para processar pagamentos em lote
    
    Returns:
        Número de comissões processadas
    """
    from app.services.referral_service import ReferralService
    
    logger.info("🔄 [REFERRAL JOB] Iniciando processamento de comissões pendentes...")
    
    try:
        db = next(get_db())
        
        try:
            referral_service = ReferralService(db)
            count = referral_service.process_pending_payouts()
            
            logger.info(f"✅ [REFERRAL JOB] Concluído: {count} comissões processadas")
            
            return count
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"❌ [REFERRAL JOB] Erro ao processar comissões: {e}")
        return 0


def update_referrer_tiers():
    """
    Job para atualizar tiers dos indicadores
    
    Recalcula os tiers baseado no número de indicados ativos
    
    Returns:
        Número de tiers atualizados
    """
    from app.services.referral_service import ReferralService
    from app.models.referral import ReferralCode
    
    logger.info("🔄 [REFERRAL JOB] Iniciando atualização de tiers...")
    
    try:
        db = next(get_db())
        
        try:
            referral_service = ReferralService(db)
            
            # Busca todos os códigos de indicação ativos
            referral_codes = db.query(ReferralCode).filter(
                ReferralCode.is_active == True
            ).all()
            
            count = 0
            for code in referral_codes:
                old_tier = code.current_tier
                referral_service._update_referrer_tier(str(code.user_id))
                db.refresh(code)
                if code.current_tier != old_tier:
                    count += 1
                    logger.info(f"📈 Tier atualizado: {code.code} {old_tier} -> {code.current_tier}")
            
            logger.info(f"✅ [REFERRAL JOB] Concluído: {count} tiers atualizados")
            
            return count
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"❌ [REFERRAL JOB] Erro ao atualizar tiers: {e}")
        return 0


def generate_daily_referral_report():
    """
    Job para gerar relatório diário do programa de indicação
    
    Returns:
        Dicionário com métricas do dia
    """
    from app.services.referral_service import ReferralService
    from app.models.referral import ReferralCode, Referral, ReferralEarning, ReferralStatus
    from datetime import timedelta
    from sqlalchemy import func
    
    logger.info("🔄 [REFERRAL JOB] Gerando relatório diário...")
    
    try:
        db = next(get_db())
        
        try:
            today = datetime.utcnow().date()
            yesterday = today - timedelta(days=1)
            
            # Métricas do dia anterior
            new_referrals = db.query(func.count(Referral.id)).filter(
                func.date(Referral.created_at) == yesterday
            ).scalar() or 0
            
            qualified_referrals = db.query(func.count(Referral.id)).filter(
                func.date(Referral.qualified_at) == yesterday
            ).scalar() or 0
            
            commissions_generated = db.query(func.sum(ReferralEarning.commission_amount)).filter(
                func.date(ReferralEarning.created_at) == yesterday
            ).scalar() or 0
            
            active_referrers = db.query(func.count(ReferralCode.id)).filter(
                ReferralCode.is_active == True,
                ReferralCode.total_referrals > 0
            ).scalar() or 0
            
            report = {
                "date": yesterday.isoformat(),
                "new_referrals": new_referrals,
                "qualified_referrals": qualified_referrals,
                "commissions_generated_usd": float(commissions_generated),
                "active_referrers": active_referrers,
                "generated_at": datetime.utcnow().isoformat()
            }
            
            logger.info(f"✅ [REFERRAL JOB] Relatório gerado: {report}")
            
            return report
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"❌ [REFERRAL JOB] Erro ao gerar relatório: {e}")
        return {}


# ============================================================================
# Configuração do APScheduler (se usando)
# ============================================================================

def setup_referral_jobs(scheduler):
    """
    Configura os jobs de indicação no APScheduler
    
    Args:
        scheduler: Instância do APScheduler
    """
    # Marcar inativos - diariamente às 3:00 AM
    scheduler.add_job(
        mark_inactive_referrals,
        'cron',
        hour=3,
        minute=0,
        id='referral_mark_inactive',
        name='Mark Inactive Referrals',
        replace_existing=True
    )
    
    # Atualizar tiers - diariamente às 4:00 AM
    scheduler.add_job(
        update_referrer_tiers,
        'cron',
        hour=4,
        minute=0,
        id='referral_update_tiers',
        name='Update Referrer Tiers',
        replace_existing=True
    )
    
    # Relatório diário - às 6:00 AM
    scheduler.add_job(
        generate_daily_referral_report,
        'cron',
        hour=6,
        minute=0,
        id='referral_daily_report',
        name='Generate Daily Referral Report',
        replace_existing=True
    )
    
    logger.info("✅ Referral jobs configurados no scheduler")
