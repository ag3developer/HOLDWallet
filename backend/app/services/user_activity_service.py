"""
User Activity Service
Serviço para registrar e gerenciar atividades dos usuários
"""
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone

from app.models.user_activity import UserActivity
from app.models.user import User


class UserActivityService:
    """Serviço para gerenciar atividades de usuários"""
    
    @staticmethod
    def log_activity(
        db: Session,
        user_id: str,
        activity_type: str,
        description: str,
        status: str = "success",
        extra_data: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> UserActivity:
        """
        Registra uma nova atividade do usuário
        
        Args:
            db: Sessão do banco de dados
            user_id: ID do usuário (UUID como string)
            activity_type: Tipo de atividade (login, trade, security, etc)
            description: Descrição da atividade
            status: Status da atividade (success, failed, pending)
            extra_data: Dados adicionais em JSON
            ip_address: IP do usuário
            user_agent: User agent do navegador
        
        Returns:
            UserActivity: Atividade criada
        """
        activity = UserActivity(
            user_id=user_id,
            activity_type=activity_type,
            description=description,
            status=status,
            extra_data=extra_data,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        db.add(activity)
        db.commit()
        db.refresh(activity)
        
        return activity
    
    @staticmethod
    def get_user_activities(
        db: Session,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
        activity_type: Optional[str] = None
    ) -> tuple[List[UserActivity], int]:
        """
        Busca atividades do usuário com paginação
        
        Args:
            db: Sessão do banco de dados
            user_id: ID do usuário
            limit: Limite de resultados
            offset: Offset para paginação
            activity_type: Filtrar por tipo de atividade (opcional)
        
        Returns:
            Tupla com (lista de atividades, total de registros)
        """
        query = db.query(UserActivity).filter(UserActivity.user_id == user_id)
        
        if activity_type:
            query = query.filter(UserActivity.activity_type == activity_type)
        
        total = query.count()
        activities = query.order_by(UserActivity.timestamp.desc()).offset(offset).limit(limit).all()
        
        return activities, total
    
    @staticmethod
    def log_login(
        db: Session,
        user_id: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        success: bool = True
    ) -> UserActivity:
        """
        Registra um login do usuário
        """
        status = "success" if success else "failed"
        description = "Login realizado com sucesso" if success else "Tentativa de login falhou"
        
        extra_data = {}
        if user_agent:
            # Parse user agent para extrair browser e OS
            extra_data["device"] = user_agent[:100]  # Simplificado, pode usar lib user-agents
        
        return UserActivityService.log_activity(
            db=db,
            user_id=user_id,
            activity_type="login",
            description=description,
            status=status,
            extra_data=extra_data,
            ip_address=ip_address,
            user_agent=user_agent
        )
    
    @staticmethod
    def log_trade(
        db: Session,
        user_id: str,
        trade_type: str,
        amount: float,
        currency: str,
        status: str = "success"
    ) -> UserActivity:
        """
        Registra uma transação/trade do usuário
        """
        description = f"Transação {trade_type} - {amount} {currency}"
        
        extra_data = {
            "trade_type": trade_type,
            "amount": amount,
            "currency": currency
        }
        
        return UserActivityService.log_activity(
            db=db,
            user_id=user_id,
            activity_type="trade",
            description=description,
            status=status,
            extra_data=extra_data
        )
    
    @staticmethod
    def log_security_change(
        db: Session,
        user_id: str,
        change_type: str,
        description: str,
        ip_address: Optional[str] = None
    ) -> UserActivity:
        """
        Registra uma mudança de segurança (senha, 2FA, etc)
        """
        extra_data = {
            "change_type": change_type
        }
        
        return UserActivityService.log_activity(
            db=db,
            user_id=user_id,
            activity_type="security",
            description=description,
            status="success",
            extra_data=extra_data,
            ip_address=ip_address
        )
