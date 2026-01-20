"""
Security Service - Comprehensive security monitoring and management
"""
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime, timedelta, timezone
import logging
import secrets
import hashlib
import httpx
from user_agents import parse as parse_user_agent

from app.models.security import LoginAttempt, BlockedIP, SecurityAlert, UserSession, AuditLog
from app.models.user import User

logger = logging.getLogger(__name__)


def get_ip_geolocation(ip_address: str) -> Dict[str, Optional[str]]:
    """
    Obtém geolocalização de um IP usando API gratuita
    Returns: {"country": "Brasil", "city": "São Paulo", "country_code": "BR"}
    """
    result = {"country": None, "city": None, "country_code": None}
    
    # Skip for local IPs
    if ip_address in ["127.0.0.1", "localhost", "::1", "unknown"] or ip_address.startswith("192.168.") or ip_address.startswith("10."):
        result["country"] = "Local"
        result["city"] = "Local Network"
        return result
    
    try:
        # Use ip-api.com (free, 45 requests/min)
        response = httpx.get(f"http://ip-api.com/json/{ip_address}?fields=status,country,countryCode,city", timeout=3.0)
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "success":
                result["country"] = data.get("country")
                result["city"] = data.get("city")
                result["country_code"] = data.get("countryCode")
    except Exception as e:
        logger.debug(f"Failed to get geolocation for {ip_address}: {e}")
    
    return result


class SecurityService:
    """Serviço centralizado para segurança do sistema"""
    
    # ============== Login Attempts ==============
    
    @staticmethod
    def record_login_attempt(
        db: Session,
        email: str,
        ip_address: str,
        user_agent: Optional[str] = None,
        success: bool = False,
        failure_reason: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> LoginAttempt:
        """
        Registra uma tentativa de login
        """
        try:
            # Get geolocation
            geo = get_ip_geolocation(ip_address)
            country = geo.get("country")
            city = geo.get("city")
            
            attempt = LoginAttempt(
                email=email,
                user_id=user_id,
                ip_address=ip_address,
                user_agent=user_agent,
                success=success,
                failure_reason=failure_reason,
                country=country,
                city=city
            )
            
            db.add(attempt)
            db.commit()
            db.refresh(attempt)
            
            # Check for suspicious activity after failed login
            if not success:
                SecurityService._check_brute_force(db, email, ip_address)
            
            return attempt
            
        except Exception as e:
            logger.error(f"Error recording login attempt: {e}")
            db.rollback()
            raise
    
    @staticmethod
    def _check_brute_force(db: Session, email: str, ip_address: str):
        """
        Verifica se há tentativa de brute force e cria alerta se necessário
        """
        try:
            now = datetime.now(timezone.utc)
            window = now - timedelta(minutes=15)
            
            # Count failed attempts from same IP in last 15 minutes
            ip_failures = db.query(LoginAttempt).filter(
                LoginAttempt.ip_address == ip_address,
                LoginAttempt.success == False,
                LoginAttempt.created_at >= window
            ).count()
            
            # Count failed attempts for same email in last 15 minutes
            email_failures = db.query(LoginAttempt).filter(
                LoginAttempt.email == email,
                LoginAttempt.success == False,
                LoginAttempt.created_at >= window
            ).count()
            
            # Create alert if threshold exceeded
            if ip_failures >= 5:
                SecurityService.create_security_alert(
                    db=db,
                    alert_type="brute_force",
                    severity="high",
                    description=f"Multiple failed login attempts ({ip_failures}) from IP {ip_address}",
                    ip_address=ip_address,
                    extra_data={"failed_attempts": ip_failures, "window_minutes": 15}
                )
                
                # Auto-block IP after 10 failures
                if ip_failures >= 10:
                    SecurityService.auto_block_ip(
                        db=db,
                        ip_address=ip_address,
                        reason=f"Auto-blocked: {ip_failures} failed login attempts in 15 minutes",
                        duration_hours=24
                    )
            
            if email_failures >= 5:
                # Find user by email
                user = db.query(User).filter(User.email == email).first()
                
                SecurityService.create_security_alert(
                    db=db,
                    alert_type="multiple_failed_logins",
                    severity="medium",
                    description=f"Multiple failed login attempts ({email_failures}) for account {email}",
                    user_id=str(user.id) if user else None,
                    ip_address=ip_address,
                    extra_data={"failed_attempts": email_failures, "window_minutes": 15}
                )
                
        except Exception as e:
            logger.error(f"Error checking brute force: {e}")
    
    @staticmethod
    def get_failed_logins(
        db: Session,
        page: int = 1,
        limit: int = 20,
        hours: int = 24
    ) -> Tuple[List[LoginAttempt], int]:
        """
        Retorna tentativas de login falhadas
        """
        since = datetime.now(timezone.utc) - timedelta(hours=hours)
        
        query = db.query(LoginAttempt).filter(
            LoginAttempt.success == False,
            LoginAttempt.created_at >= since
        ).order_by(LoginAttempt.created_at.desc())
        
        total = query.count()
        attempts = query.offset((page - 1) * limit).limit(limit).all()
        
        return attempts, total
    
    # ============== IP Blocking ==============
    
    # IPs locais que nunca devem ser bloqueados em desenvolvimento
    LOCAL_IPS = ["127.0.0.1", "localhost", "::1", "0.0.0.0"]
    
    @staticmethod
    def is_ip_blocked(db: Session, ip_address: str) -> bool:
        """
        Verifica se um IP está bloqueado
        """
        # Em desenvolvimento, IPs locais nunca são bloqueados
        from app.core.config import settings
        is_dev = getattr(settings, 'ENVIRONMENT', 'production') in ['development', 'dev', 'local']
        if is_dev and ip_address in SecurityService.LOCAL_IPS:
            return False
        
        now = datetime.now(timezone.utc)
        
        blocked = db.query(BlockedIP).filter(
            BlockedIP.ip_address == ip_address,
            BlockedIP.is_active == True,
            or_(
                BlockedIP.is_permanent == True,
                BlockedIP.expires_at > now
            )
        ).first()
        
        return blocked is not None
    
    @staticmethod
    def auto_block_ip(
        db: Session,
        ip_address: str,
        reason: str,
        duration_hours: int = 24
    ) -> Optional[BlockedIP]:
        """
        Bloqueia automaticamente um IP
        """
        try:
            # Check if already blocked
            existing = db.query(BlockedIP).filter(
                BlockedIP.ip_address == ip_address,
                BlockedIP.is_active == True
            ).first()
            
            if existing:
                return existing
            
            expires_at = datetime.now(timezone.utc) + timedelta(hours=duration_hours)
            
            blocked = BlockedIP(
                ip_address=ip_address,
                reason=reason,
                blocked_by_name="System (Auto)",
                is_permanent=False,
                expires_at=expires_at,
                is_active=True
            )
            
            db.add(blocked)
            db.commit()
            db.refresh(blocked)
            
            logger.warning(f"Auto-blocked IP {ip_address}: {reason}")
            
            return blocked
            
        except Exception as e:
            logger.error(f"Error auto-blocking IP: {e}")
            db.rollback()
            return None
    
    # ============== Security Alerts ==============
    
    @staticmethod
    def create_security_alert(
        db: Session,
        alert_type: str,
        severity: str,
        description: str,
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        extra_data: Optional[Dict[str, Any]] = None
    ) -> SecurityAlert:
        """
        Cria um alerta de segurança
        """
        try:
            alert = SecurityAlert(
                alert_type=alert_type,
                severity=severity,
                description=description,
                user_id=user_id,
                ip_address=ip_address,
                extra_data=extra_data,
                status="open"
            )
            
            db.add(alert)
            db.commit()
            db.refresh(alert)
            
            logger.warning(f"Security alert created: [{severity.upper()}] {alert_type} - {description}")
            
            return alert
            
        except Exception as e:
            logger.error(f"Error creating security alert: {e}")
            db.rollback()
            raise
    
    @staticmethod
    def get_open_alerts(
        db: Session,
        page: int = 1,
        limit: int = 20
    ) -> Tuple[List[SecurityAlert], int]:
        """
        Retorna alertas de segurança abertos
        """
        query = db.query(SecurityAlert).filter(
            SecurityAlert.status == "open"
        ).order_by(SecurityAlert.created_at.desc())
        
        total = query.count()
        alerts = query.offset((page - 1) * limit).limit(limit).all()
        
        return alerts, total
    
    # ============== User Sessions ==============
    
    @staticmethod
    def create_session(
        db: Session,
        user_id: str,
        ip_address: str,
        user_agent: Optional[str] = None,
        expires_hours: int = 24
    ) -> UserSession:
        """
        Cria uma nova sessão para o usuário
        """
        try:
            # Generate secure session token
            session_token = secrets.token_urlsafe(64)
            
            # Parse user agent
            device_type = "unknown"
            browser = "unknown"
            os_info = "unknown"
            
            if user_agent:
                try:
                    ua = parse_user_agent(user_agent)
                    if ua.is_mobile:
                        device_type = "mobile"
                    elif ua.is_tablet:
                        device_type = "tablet"
                    else:
                        device_type = "desktop"
                    browser = f"{ua.browser.family} {ua.browser.version_string}"
                    os_info = f"{ua.os.family} {ua.os.version_string}"
                except Exception:
                    pass
            
            # Get geolocation
            geo = get_ip_geolocation(ip_address)
            country = geo.get("country")
            city = geo.get("city")
            
            session = UserSession(
                session_token=session_token,
                user_id=user_id,
                ip_address=ip_address,
                user_agent=user_agent,
                device_type=device_type,
                browser=browser,
                os=os_info,
                country=country,
                city=city,
                is_active=True,
                expires_at=datetime.now(timezone.utc) + timedelta(hours=expires_hours)
            )
            
            db.add(session)
            db.commit()
            db.refresh(session)
            
            logger.info(f"Session created for user {user_id} from {ip_address} ({city}, {country})")
            
            return session
            
        except Exception as e:
            logger.error(f"Error creating session: {e}")
            db.rollback()
            raise
    
    @staticmethod
    def update_session_activity(db: Session, session_id: int):
        """
        Atualiza última atividade da sessão
        """
        try:
            session = db.query(UserSession).filter(UserSession.id == session_id).first()
            if session:
                session.last_activity = datetime.now(timezone.utc)
                db.commit()
        except Exception as e:
            logger.error(f"Error updating session activity: {e}")
    
    @staticmethod
    def invalidate_session(
        db: Session,
        session_id: int,
        reason: str = "user_logout"
    ):
        """
        Invalida uma sessão
        """
        try:
            session = db.query(UserSession).filter(UserSession.id == session_id).first()
            if session:
                session.is_active = False
                session.logged_out_at = datetime.now(timezone.utc)
                session.logout_reason = reason
                db.commit()
        except Exception as e:
            logger.error(f"Error invalidating session: {e}")
    
    @staticmethod
    def invalidate_all_user_sessions(
        db: Session,
        user_id: str,
        reason: str = "password_change"
    ):
        """
        Invalida todas as sessões de um usuário
        """
        try:
            sessions = db.query(UserSession).filter(
                UserSession.user_id == user_id,
                UserSession.is_active == True
            ).all()
            
            now = datetime.now(timezone.utc)
            for session in sessions:
                session.is_active = False
                session.logged_out_at = now
                session.logout_reason = reason
            
            db.commit()
            
        except Exception as e:
            logger.error(f"Error invalidating user sessions: {e}")
    
    @staticmethod
    def get_active_sessions(
        db: Session,
        user_id: Optional[str] = None,
        page: int = 1,
        limit: int = 20
    ) -> Tuple[List[UserSession], int]:
        """
        Retorna sessões ativas
        """
        query = db.query(UserSession).filter(UserSession.is_active == True)
        
        if user_id:
            query = query.filter(UserSession.user_id == user_id)
        
        query = query.order_by(UserSession.last_activity.desc())
        
        total = query.count()
        sessions = query.offset((page - 1) * limit).limit(limit).all()
        
        return sessions, total
    
    # ============== Audit Logging ==============
    
    @staticmethod
    def log_audit(
        db: Session,
        action: str,
        user_id: Optional[str] = None,
        user_email: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        description: Optional[str] = None,
        old_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        status: str = "success",
        error_message: Optional[str] = None
    ) -> AuditLog:
        """
        Registra uma entrada no log de auditoria
        """
        try:
            log = AuditLog(
                user_id=user_id,
                user_email=user_email,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                description=description,
                old_values=old_values,
                new_values=new_values,
                ip_address=ip_address,
                user_agent=user_agent,
                status=status,
                error_message=error_message
            )
            
            db.add(log)
            db.commit()
            db.refresh(log)
            
            return log
            
        except Exception as e:
            logger.error(f"Error logging audit: {e}")
            db.rollback()
            raise
    
    # ============== Statistics ==============
    
    @staticmethod
    def get_security_stats(db: Session) -> Dict[str, Any]:
        """
        Retorna estatísticas de segurança
        """
        now = datetime.now(timezone.utc)
        last_24h = now - timedelta(hours=24)
        last_7d = now - timedelta(days=7)
        
        # Active sessions
        active_sessions = db.query(UserSession).filter(
            UserSession.is_active == True
        ).count()
        
        # Failed logins in last 24h
        failed_logins_24h = db.query(LoginAttempt).filter(
            LoginAttempt.success == False,
            LoginAttempt.created_at >= last_24h
        ).count()
        
        # Blocked IPs
        blocked_ips = db.query(BlockedIP).filter(
            BlockedIP.is_active == True
        ).count()
        
        # Open security alerts
        open_alerts = db.query(SecurityAlert).filter(
            SecurityAlert.status == "open"
        ).count()
        
        # 2FA stats
        users_with_2fa = db.query(User).filter(
            User.two_factor_enabled == True
        ).count()
        
        total_users = db.query(User).filter(User.is_active == True).count()
        
        return {
            "active_sessions": active_sessions,
            "failed_login_attempts_24h": failed_logins_24h,
            "blocked_ips": blocked_ips,
            "security_alerts_24h": open_alerts,
            "users_with_2fa": users_with_2fa,
            "users_without_2fa": total_users - users_with_2fa,
            "two_fa_adoption_rate": round((users_with_2fa / total_users * 100) if total_users > 0 else 0, 1)
        }
