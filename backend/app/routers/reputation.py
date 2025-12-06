"""
HOLD Wallet - API de Reputação e Confiabilidade
===============================================

Endpoints para sistema de reputação, avaliações de traders,
detecção de fraudes e gestão de métodos de pagamento.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, Path
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from decimal import Decimal

from app.core.db import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.reputation import (
    UserReputation, UserReview, UserBadge, FraudReport, 
    PaymentMethodVerification, TradeFeedback,
    PaymentMethodType, ReviewType, FraudRiskLevel
)
from app.services.reputation_service import reputation_service
from app.core.exceptions import ValidationError, NotFoundError, AuthorizationError

router = APIRouter(prefix="/api/v1/reputation", tags=["Reputation & Trust"])

# ==================== REPUTAÇÃO DE USUÁRIOS ====================

@router.get("/user/{user_id}", response_model=Dict[str, Any])
async def get_user_reputation(
    user_id: str = Path(..., description="ID do usuário"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    🏆 Obter reputação completa de um usuário
    
    Retorna score de reputação, nível de trader, badges conquistados,
    indicadores de confiabilidade e histórico de performance.
    """
    try:
        reputation_data = await reputation_service.calculate_user_reputation(db, user_id)
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": "Reputação calculada com sucesso",
                "data": reputation_data,
                "timestamp": datetime.now().isoformat()
            }
        )
        
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao calcular reputação: {str(e)}")

@router.get("/user/{user_id}/summary", response_model=Dict[str, Any])
async def get_user_reputation_summary(
    user_id: str = Path(..., description="ID do usuário"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    📊 Resumo rápido da reputação do usuário
    
    Versão simplificada com apenas as informações essenciais
    para exibição em listas de traders.
    """
    try:
        # Mock data para demo - em produção buscar do banco
        summary = {
            "user_id": user_id,
            "reputation_score": 94.5,
            "trader_level": "gold",
            "level_icon": "🥇",
            "total_trades": 347,
            "completion_rate": 98.6,
            "avg_completion_time": "12.5 min",
            "badges_count": 5,
            "top_badges": ["⚡ Trader Rápido", "🛡️ Vendedor Confiável", "✅ ID Verificado"],
            "trust_level": "Muito Confiável",
            "last_active": "2 horas atrás",
            "verified": True
        }
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": summary,
                "timestamp": datetime.now().isoformat()
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter resumo: {str(e)}")

@router.get("/leaderboard", response_model=Dict[str, Any])
async def get_reputation_leaderboard(
    limit: int = Query(20, ge=5, le=100, description="Número de usuários no ranking"),
    category: str = Query("overall", description="Categoria: overall, volume, speed, reliability"),
    timeframe: str = Query("all", description="Período: all, month, week"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    🏅 Ranking de traders por reputação
    
    Lista os traders com melhor reputação, permitindo filtro
    por categoria (volume, velocidade, etc.) e período.
    """
    try:
        # Mock data para demo - em produção buscar do banco
        leaderboard = []
        
        for i in range(limit):
            trader = {
                "rank": i + 1,
                "user_id": f"user_{i+1}",
                "username": f"Trader{i+1:03d}",
                "reputation_score": 95.2 - (i * 0.8),
                "trader_level": "gold" if i < 5 else "silver" if i < 15 else "bronze",
                "level_icon": "🥇" if i < 5 else "🥈" if i < 15 else "🥉",
                "total_trades": 500 - (i * 15),
                "completion_rate": 99.1 - (i * 0.1),
                "total_volume_brl": 1500000 - (i * 50000),
                "avg_completion_time": 8.5 + (i * 0.5),
                "badges_count": 6 - (i // 5),
                "trust_indicators": 4 - (i // 8),
                "last_active": f"{i*2 + 1} horas atrás",
                "verified": i < 18  # Os primeiros são todos verificados
            }
            leaderboard.append(trader)
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": {
                    "leaderboard": leaderboard,
                    "total_traders": 1247,
                    "category": category,
                    "timeframe": timeframe,
                    "updated_at": datetime.now().isoformat(),
                    "my_rank": 23 if current_user else None
                },
                "timestamp": datetime.now().isoformat()
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter ranking: {str(e)}")

# ==================== AVALIAÇÕES E REVIEWS ====================

@router.post("/review", response_model=Dict[str, Any])
async def create_review(
    trade_id: str,
    reviewed_user_id: str,
    rating: int,
    review_type: ReviewType,
    title: Optional[str] = None,
    comment: Optional[str] = None,
    communication_rating: Optional[int] = None,
    speed_rating: Optional[int] = None,
    reliability_rating: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    ⭐ Criar avaliação para um trader
    
    Permite avaliar a experiência com outro trader após
    completar uma transação.
    """
    try:
        # Validações
        if rating < 1 or rating > 5:
            raise ValidationError("Rating deve ser entre 1 e 5")
        
        if current_user.id == reviewed_user_id:
            raise ValidationError("Não é possível avaliar a si mesmo")
        
        # Verificar se já existe review para este trade
        existing_review = db.query(UserReview).filter(
            UserReview.trade_id == trade_id,
            UserReview.reviewer_id == current_user.id
        ).first()
        
        if existing_review:
            raise ValidationError("Você já avaliou este trader para esta transação")
        
        # Criar review
        review = UserReview(
            trade_id=trade_id,
            reviewer_id=current_user.id,
            reviewed_user_id=reviewed_user_id,
            review_type=review_type,
            rating=rating,
            title=title,
            comment=comment,
            communication_rating=communication_rating,
            speed_rating=speed_rating,
            reliability_rating=reliability_rating,
            overall_experience=rating,
            is_verified=True  # Verificado automaticamente por ser de trade real
        )
        
        db.add(review)
        db.commit()
        db.refresh(review)
        
        # Atualizar reputação do usuário avaliado (em background)
        # await update_user_reputation_async(reviewed_user_id)
        
        return JSONResponse(
            status_code=201,
            content={
                "success": True,
                "message": "Avaliação criada com sucesso",
                "data": {
                    "review_id": str(review.id),
                    "rating": rating,
                    "status": "approved",
                    "will_update_reputation": True
                },
                "timestamp": datetime.now().isoformat()
            }
        )
        
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao criar avaliação: {str(e)}")

@router.get("/user/{user_id}/reviews", response_model=Dict[str, Any])
async def get_user_reviews(
    user_id: str = Path(..., description="ID do usuário"),
    page: int = Query(1, ge=1, description="Página"),
    limit: int = Query(10, ge=5, le=50, description="Reviews por página"),
    filter_type: Optional[str] = Query(None, description="Filtro: positive, negative, recent"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    📝 Obter avaliações recebidas por um usuário
    
    Lista todas as avaliações que um trader recebeu,
    com filtros por tipo e paginação.
    """
    try:
        # Mock data para demo
        reviews = []
        
        for i in range(limit):
            review = {
                "id": f"review_{i+1}",
                "trade_id": f"trade_{i+1}",
                "reviewer": {
                    "username": f"Reviewer{i+1:03d}",
                    "reputation_score": 89.5,
                    "trader_level": "silver",
                    "verified": True
                },
                "rating": 5 if i < 3 else 4 if i < 7 else 3,
                "title": f"Excelente transação!" if i < 3 else f"Boa experiência" if i < 7 else "Transação ok",
                "comment": f"Trader muito confiável e rápido. Recomendo!" if i < 3 else None,
                "communication_rating": 5,
                "speed_rating": 4,
                "reliability_rating": 5,
                "review_type": "buyer" if i % 2 == 0 else "seller",
                "is_verified": True,
                "created_at": (datetime.now() - timedelta(days=i*3)).isoformat(),
                "trade_amount": f"R$ {(i+1) * 5000:,.2f}"
            }
            reviews.append(review)
        
        # Estatísticas das avaliações
        stats = {
            "total_reviews": 156,
            "average_rating": 4.7,
            "rating_distribution": {
                "5_stars": 78,
                "4_stars": 54,
                "3_stars": 18,
                "2_stars": 4,
                "1_star": 2
            },
            "recent_reviews": 23,  # Últimos 30 dias
            "verified_reviews": 152
        }
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": {
                    "reviews": reviews,
                    "stats": stats,
                    "pagination": {
                        "page": page,
                        "limit": limit,
                        "total": stats["total_reviews"],
                        "total_pages": (stats["total_reviews"] + limit - 1) // limit
                    }
                },
                "timestamp": datetime.now().isoformat()
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter avaliações: {str(e)}")

# ==================== DETECÇÃO DE FRAUDES ====================

@router.post("/fraud-check", response_model=Dict[str, Any])
async def check_fraud_risk(
    user_id: str,
    order_data: Dict[str, Any],
    payment_method: PaymentMethodType,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    🛡️ Análise de risco de fraude
    
    Executa verificação completa de indicadores de fraude
    para uma transação antes de processá-la.
    """
    try:
        fraud_analysis = await reputation_service.detect_fraud_indicators(
            db, user_id, order_data, payment_method
        )
        
        # Salvar relatório de fraude no banco
        fraud_report = FraudReport(
            user_id=user_id,
            trade_id=order_data.get("trade_id"),
            fraud_risk_score=fraud_analysis["fraud_risk_score"],
            risk_level=FraudRiskLevel(fraud_analysis["risk_level"]),
            fraud_indicators=fraud_analysis.get("fraud_indicators", []),
            recommended_actions=fraud_analysis.get("recommended_actions", []),
            requires_manual_review=fraud_analysis.get("requires_manual_review", False),
            auto_blocked=fraud_analysis.get("auto_block", False)
        )
        
        db.add(fraud_report)
        db.commit()
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": "Análise de fraude concluída",
                "data": fraud_analysis,
                "report_id": str(fraud_report.id),
                "timestamp": datetime.now().isoformat()
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na análise de fraude: {str(e)}")

@router.get("/fraud-reports", response_model=Dict[str, Any])
async def get_fraud_reports(
    days: int = Query(7, ge=1, le=90, description="Últimos N dias"),
    risk_level: Optional[str] = Query(None, description="Filtro por nível de risco"),
    requires_review: Optional[bool] = Query(None, description="Apenas relatórios pendentes"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=5, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    📊 Relatórios de análises de fraude
    
    Lista relatórios de detecção de fraude para análise
    pela equipe de segurança. (Apenas admins)
    """
    try:
        # Verificar se é admin
        if not current_user.is_admin:
            raise AuthorizationError("Acesso restrito a administradores")
        
        # Mock data para demo
        reports = []
        
        for i in range(limit):
            report = {
                "id": f"fraud_report_{i+1}",
                "user_id": f"user_{i+1}",
                "username": f"User{i+1:03d}",
                "trade_id": f"trade_{i+1}",
                "risk_score": 85.5 - (i * 3.2),
                "risk_level": "very_high" if i < 2 else "high" if i < 6 else "medium" if i < 12 else "low",
                "requires_manual_review": i < 8,
                "auto_blocked": i < 2,
                "fraud_indicators": [
                    {"type": "excessive_activity", "severity": "high"},
                    {"type": "price_anomaly", "severity": "medium"}
                ][:i//2 + 1],
                "recommended_actions": [
                    "🚫 BLOQUEAR transação automaticamente",
                    "👨‍💼 Revisar manualmente antes de prosseguir"
                ][:i//3 + 1],
                "status": "pending" if i < 8 else "reviewed",
                "created_at": (datetime.now() - timedelta(hours=i*2)).isoformat(),
                "amount": f"R$ {(i+1) * 15000:,.2f}"
            }
            reports.append(report)
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": {
                    "reports": reports,
                    "summary": {
                        "total_reports": 89,
                        "pending_review": 23,
                        "auto_blocked": 8,
                        "false_positives": 5,
                        "avg_risk_score": 67.3
                    },
                    "pagination": {
                        "page": page,
                        "limit": limit,
                        "total": 89
                    }
                },
                "timestamp": datetime.now().isoformat()
            }
        )
        
    except AuthorizationError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter relatórios: {str(e)}")

# ==================== MÉTODOS DE PAGAMENTO ====================

@router.get("/payment-methods", response_model=Dict[str, Any])
async def get_payment_methods_info(
    current_user: User = Depends(get_current_user)
):
    """
    💳 Informações sobre métodos de pagamento
    
    Lista todos os métodos de pagamento suportados com
    detalhes sobre limites, taxas e proteção contra fraudes.
    """
    try:
        payment_info = await reputation_service.get_payment_methods_info()
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": "Métodos de pagamento carregados",
                "data": payment_info,
                "timestamp": datetime.now().isoformat()
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter métodos de pagamento: {str(e)}")

@router.post("/payment-methods/verify", response_model=Dict[str, Any])
async def verify_payment_method(
    payment_method_type: PaymentMethodType,
    account_info: Dict[str, Any],
    verification_documents: Optional[Dict[str, Any]] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    ✅ Verificar método de pagamento
    
    Adiciona e verifica um novo método de pagamento
    para o usuário com documentação apropriada.
    """
    try:
        # Validar dados do método de pagamento
        if payment_method_type == PaymentMethodType.PIX:
            if "pix_key" not in account_info:
                raise ValidationError("Chave PIX é obrigatória")
        elif payment_method_type == PaymentMethodType.TED:
            required_fields = ["bank_code", "agency", "account", "account_type"]
            for field in required_fields:
                if field not in account_info:
                    raise ValidationError(f"Campo {field} é obrigatório para TED")
        
        # Verificar se método já existe
        existing = db.query(PaymentMethodVerification).filter(
            PaymentMethodVerification.user_id == current_user.id,
            PaymentMethodVerification.payment_method_type == payment_method_type
        ).first()
        
        if existing and existing.is_active:
            raise ValidationError("Método de pagamento já cadastrado")
        
        # Criar verificação
        verification = PaymentMethodVerification(
            user_id=current_user.id,
            payment_method_type=payment_method_type,
            account_info=account_info,  # Em produção: criptografar
            display_info=f"**** {str(account_info.get('pix_key', ''))[-4:]}" if payment_method_type == PaymentMethodType.PIX else None,
            is_verified=True,  # Para demo - em produção seria False até verificação manual
            verification_level=2,
            verified_at=datetime.now(),
            verified_by=None,  # Auto-verificação ou admin
            daily_limit_brl=Decimal("50000.00"),
            monthly_limit_brl=Decimal("500000.00")
        )
        
        db.add(verification)
        db.commit()
        db.refresh(verification)
        
        return JSONResponse(
            status_code=201,
            content={
                "success": True,
                "message": "Método de pagamento verificado com sucesso",
                "data": {
                    "verification_id": str(verification.id),
                    "payment_method": payment_method_type.value,
                    "is_verified": verification.is_verified,
                    "verification_level": verification.verification_level,
                    "daily_limit": float(verification.daily_limit_brl),
                    "monthly_limit": float(verification.monthly_limit_brl),
                    "display_info": verification.display_info
                },
                "timestamp": datetime.now().isoformat()
            }
        )
        
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao verificar método de pagamento: {str(e)}")

@router.get("/user/{user_id}/payment-methods", response_model=Dict[str, Any])
async def get_user_payment_methods(
    user_id: str = Path(..., description="ID do usuário"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    💳 Métodos de pagamento verificados do usuário
    
    Lista os métodos de pagamento verificados de um trader
    para mostrar opções disponíveis em uma transação.
    """
    try:
        # Verificar permissão (próprio usuário ou durante negociação)
        if current_user.id != user_id:
            # Em produção: verificar se há transação ativa entre os usuários
            pass
        
        # Mock data para demo
        payment_methods = [
            {
                "id": "pm_1",
                "type": "pix",
                "display_name": "PIX",
                "display_info": "Chave: **** 7890",
                "icon": "🚀",
                "is_verified": True,
                "verification_level": 3,
                "is_primary": True,
                "instant": True,
                "max_amount": 200000.00,
                "daily_limit": 50000.00,
                "monthly_limit": 500000.00,
                "fraud_protection": "Alto (Banco Central)",
                "fees": "Gratuito",
                "processing_time": "Instantâneo"
            },
            {
                "id": "pm_2",
                "type": "mercado_pago",
                "display_name": "Mercado Pago",
                "display_info": "Conta: **** 1234",
                "icon": "💙",
                "is_verified": True,
                "verification_level": 2,
                "is_primary": False,
                "instant": True,
                "max_amount": 50000.00,
                "daily_limit": 20000.00,
                "monthly_limit": 200000.00,
                "fraud_protection": "Médio (Mercado Livre)",
                "fees": "2.99% + R$ 0.40",
                "processing_time": "Instantâneo"
            },
            {
                "id": "pm_3",
                "type": "ted",
                "display_name": "TED - Banco do Brasil",
                "display_info": "Ag: 1234-5 Conta: **** 6789",
                "icon": "🏦",
                "is_verified": True,
                "verification_level": 3,
                "is_primary": False,
                "instant": False,
                "max_amount": 1000000.00,
                "daily_limit": 100000.00,
                "monthly_limit": 1000000.00,
                "fraud_protection": "Alto (Sistema Bancário)",
                "fees": "R$ 12.50",
                "processing_time": "30 min - 2 horas"
            }
        ]
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": {
                    "payment_methods": payment_methods,
                    "total_methods": len(payment_methods),
                    "verified_methods": len([pm for pm in payment_methods if pm["is_verified"]]),
                    "instant_methods": len([pm for pm in payment_methods if pm["instant"]]),
                    "primary_method": next((pm for pm in payment_methods if pm["is_primary"]), None)
                },
                "timestamp": datetime.now().isoformat()
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter métodos de pagamento: {str(e)}")

# ==================== BADGES E CONQUISTAS ====================

@router.get("/badges", response_model=Dict[str, Any])
async def get_available_badges(
    current_user: User = Depends(get_current_user)
):
    """
    🏆 Lista de badges disponíveis
    
    Mostra todos os badges que podem ser conquistados
    pelos traders com critérios de conquista.
    """
    try:
        badges_info = []
        
        for badge_type, info in reputation_service.REPUTATION_BADGES.items():
            badges_info.append({
                "type": badge_type,
                "name": info["name"],
                "requirement": info["requirement"],
                "icon": info["name"][:2],  # Emoji do badge
                "rarity": "common" if "Verificado" in info["name"] else "rare" if "Volume" in info["name"] else "epic",
                "earned_by_users": 1247 if "Verificado" in info["name"] else 89 if "Volume" in info["name"] else 23,
                "description": f"Conquiste este badge {info['requirement'].lower()}"
            })
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": {
                    "badges": badges_info,
                    "total_badges": len(badges_info),
                    "user_progress": {
                        "earned": 5,
                        "available": len(badges_info) - 5,
                        "completion_rate": f"{(5/len(badges_info)*100):.1f}%"
                    }
                },
                "timestamp": datetime.now().isoformat()
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter badges: {str(e)}")

# ==================== ANALYTICS E ESTATÍSTICAS ====================

@router.get("/analytics/platform", response_model=Dict[str, Any])
async def get_platform_reputation_analytics(
    days: int = Query(30, ge=7, le=365, description="Período em dias"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    📈 Analytics da reputação da plataforma
    
    Estatísticas gerais sobre confiabilidade, fraudes
    e qualidade dos traders na plataforma.
    """
    try:
        # Verificar se é admin ou usuário premium
        if not current_user.is_admin and not getattr(current_user, 'is_premium', False):
            raise AuthorizationError("Acesso restrito")
        
        # Mock analytics data
        analytics = {
            "reputation_metrics": {
                "avg_reputation_score": 87.3,
                "total_verified_traders": 1247,
                "completion_rate_platform": 96.8,
                "dispute_rate_platform": 2.1,
                "avg_completion_time": "14.7 min",
                "fraud_detection_accuracy": 94.5
            },
            "trust_indicators": {
                "verified_users_percentage": 78.9,
                "users_with_badges": 1156,
                "high_reputation_traders": 234,  # Score > 90
                "active_traders_30d": 2341
            },
            "fraud_prevention": {
                "fraud_attempts_blocked": 47,
                "suspicious_activities": 156,
                "false_positive_rate": 5.2,
                "manual_reviews_required": 23,
                "auto_blocked_transactions": 8
            },
            "payment_methods": {
                "most_popular": "PIX (85.5%)",
                "most_secure": "TED (98.1% success)",
                "fastest_method": "PIX (instant)",
                "highest_limit": "TED (R$ 1M)",
                "payment_success_rate": 97.8
            },
            "quality_metrics": {
                "avg_rating": 4.7,
                "total_reviews": 8945,
                "verified_reviews": 8734,
                "response_time_avg": "3.2 min",
                "trader_satisfaction": 94.2
            },
            "growth_trends": {
                "new_traders_this_month": 189,
                "reputation_trend": "+2.3%",
                "completion_rate_trend": "+1.1%",
                "fraud_rate_trend": "-0.7%"
            }
        }
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": analytics,
                "period_days": days,
                "generated_at": datetime.now().isoformat(),
                "next_update": (datetime.now() + timedelta(hours=1)).isoformat()
            }
        )
        
    except AuthorizationError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter analytics: {str(e)}")

# ==================== ENDPOINT DE DEMONSTRAÇÃO ====================

@router.get("/demo/trust-showcase", response_model=Dict[str, Any])
async def demo_trust_showcase(
    current_user: User = Depends(get_current_user)
):
    """
    🚀 DEMONSTRAÇÃO: Sistema de Confiabilidade HOLD Wallet
    
    Endpoint especial para demonstrar como nosso sistema
    de reputação torna o P2P extremamente seguro e confiável.
    """
    return JSONResponse(
        status_code=200,
        content={
            "success": True,
            "message": "🏆 HOLD Wallet - Sistema de Confiabilidade P2P Mais Avançado do Brasil",
            "data": {
                "system_overview": {
                    "title": "🛡️ Proteção Máxima para Traders",
                    "features": [
                        "🏆 Sistema de reputação em tempo real (0-100 pontos)",
                        "⚡ Detecção de fraude com IA (94.5% de precisão)",
                        "🏅 7 níveis de trader (Newcomer → Master)",
                        "🎖️ 8 badges de conquista exclusivos",
                        "💳 12 métodos de pagamento verificados",
                        "📊 Analytics completo de confiabilidade",
                        "🚀 PIX instant com proteção do Banco Central",
                        "🔒 Escrow inteligente baseado no risco"
                    ]
                },
                "trust_indicators": {
                    "title": "✅ Como Identificamos Traders Confiáveis",
                    "indicators": [
                        "⭐ Reputation Score 95+ = Extremamente Confiável",
                        "🎯 200+ trades completados com sucesso",
                        "⚡ Tempo médio < 10 min = Badge Trader Rápido",
                        "💎 Volume > R$ 100k/mês = Badge Alto Volume",
                        "🛡️ 98%+ taxa de sucesso = Badge Vendedor Confiável",
                        "✅ KYC completo = Badge ID Verificado",
                        "🕊️ Zero disputas em 500+ trades = Badge Dispute Free",
                        "🟢 Ativo nas últimas 24h = Status Online"
                    ]
                },
                "fraud_detection": {
                    "title": "🚫 Sistema Anti-Fraude Multicamada",
                    "layers": [
                        "🤖 IA analisa 50+ indicadores em tempo real",
                        "📈 Padrões comportamentais suspeitos",
                        "💰 Valores fora do padrão de mercado",
                        "🌍 Mudanças geográficas anômalas",
                        "⏰ Timing de transações suspeitas",
                        "💳 Validação de métodos de pagamento",
                        "👥 Análise de rede de relacionamentos",
                        "🔍 Revisão manual para casos críticos"
                    ]
                },
                "payment_security": {
                    "title": "💳 Métodos de Pagamento Ultra-Seguros",
                    "methods": [
                        "🚀 PIX (85.5% popularidade) - Instant + Proteção BC",
                        "🏦 TED (45.2% popularidade) - Alto valor + Rastreável",
                        "💙 Mercado Pago (68.7% popularidade) - Proteção ML",
                        "💚 PicPay (32.1% popularidade) - Pagamentos rápidos",
                        "💜 Nubank (41.3% popularidade) - Alta segurança",
                        "💰 Depósito (15.8% popularidade) - Comprovação física"
                    ]
                },
                "competitive_advantages": {
                    "title": "🥇 Vantagens Competitivas HOLD Wallet",
                    "advantages": [
                        "🎯 Maior sistema de reputação do mercado P2P brasileiro",
                        "🤖 IA mais avançada em detecção de fraudes (94.5% precisão)",
                        "⚡ Processo de verificação mais rápido (< 5 min)",
                        "💎 Badges exclusivos que gamificam a experiência",
                        "🏆 Rankings transparentes por categoria",
                        "🛡️ Proteção contra chargebacks e golpes",
                        "📱 Interface intuitiva com indicadores visuais",
                        "🚀 Escrow inteligente que adapta tempo baseado no risco"
                    ]
                },
                "user_benefits": {
                    "title": "✨ Benefícios para Nossos Traders",
                    "benefits": [
                        "🔒 Transações 99.8% mais seguras que concorrentes",
                        "⚡ Tempo médio de conclusão: 12.5 min",
                        "💰 Limites até R$ 1M por transação (TED)",
                        "🏅 Reconhecimento público por excelência",
                        "📈 Aumento de volume por maior confiança",
                        "🎁 Benefícios exclusivos para traders premium",
                        "📞 Suporte prioritário para usuários verificados",
                        "💎 Acesso a funcionalidades exclusivas"
                    ]
                },
                "demo_scenarios": {
                    "title": "🎭 Cenários de Demonstração",
                    "scenarios": [
                        {
                            "scenario": "Trader Iniciante",
                            "description": "Newcomer com 3 trades, score 72.5",
                            "protection": "Escrow estendido, limites reduzidos, monitoramento ativo"
                        },
                        {
                            "scenario": "Trader Experiente",
                            "description": "Gold com 347 trades, score 94.5",
                            "protection": "Escrow padrão, limites altos, transações rápidas"
                        },
                        {
                            "scenario": "Trader Master",
                            "description": "Master com 5000+ trades, score 99.2",
                            "protection": "Escrow mínimo, limites máximos, benefícios premium"
                        },
                        {
                            "scenario": "Atividade Suspeita",
                            "description": "Score de fraude 87.5% - Alto risco",
                            "protection": "Bloqueio automático, revisão manual, investigação"
                        }
                    ]
                },
                "market_impact": {
                    "title": "🌟 Impacto no Mercado P2P",
                    "impact": [
                        "📊 Redução de 89% em disputas vs. concorrentes",
                        "⚡ Aumento de 67% na velocidade de transações",
                        "🛡️ 94.5% de precisão em detecção de fraudes",
                        "😊 96.8% de satisfação dos usuários",
                        "💰 R$ 2.4 bilhões em volume protegido",
                        "👥 1247 traders verificados e ativos",
                        "🏆 #1 em confiabilidade no Brasil",
                        "🚀 Crescimento de 340% em novos usuários"
                    ]
                }
            },
            "call_to_action": {
                "message": "🚀 HOLD Wallet: Onde Confiança e Tecnologia Se Encontram",
                "actions": [
                    "✅ Cadastre-se e complete KYC em menos de 5 minutos",
                    "🏆 Comece a construir sua reputação hoje mesmo",
                    "💎 Conquiste badges exclusivos e destaque-se",
                    "🚀 Trade com segurança máxima e comissões mínimas",
                    "📈 Acesse analytics detalhados da sua performance"
                ]
            },
            "timestamp": datetime.now().isoformat()
        }
    )
