from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
import pyotp
from pydantic import BaseModel, EmailStr
import logging

from app.core.db import get_db
from app.core.config import settings
from app.core.security import verify_password, create_access_token, get_current_user, get_password_hash
from app.core.exceptions import AuthenticationError, ValidationError
from app.models.user import User
from app.models.two_factor import TwoFactorAuth
from app.schemas.auth import LoginRequest, LoginResponse, RegisterRequest, UserResponse, TokenData
from app.services.user_activity_service import UserActivityService
from app.services.security_service import SecurityService
from app.services.two_factor_service import TwoFactorService
from app.services.crypto_service import crypto_service
from app.services.email_service import email_service

logger = logging.getLogger(__name__)

router = APIRouter()
security = HTTPBearer()

# IPs locais que ignoram verificação de bloqueio
LOCAL_IPS = ["127.0.0.1", "localhost", "::1", "0.0.0.0"]

def is_dev_local_ip(ip_address: str) -> bool:
    """Verifica se é IP local em ambiente de desenvolvimento"""
    is_dev = getattr(settings, 'ENVIRONMENT', 'production') in ['development', 'dev', 'local']
    return is_dev and ip_address in LOCAL_IPS

@router.post("/login", response_model=LoginResponse)
async def login(
    login_data: LoginRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Authenticate user and return access token.
    """
    ip_address = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent")
    
    # Check if IP is blocked (skip for local IPs in development)
    if not is_dev_local_ip(ip_address) and SecurityService.is_ip_blocked(db, ip_address):
        # Record blocked attempt
        SecurityService.record_login_attempt(
            db=db,
            email=login_data.email,
            ip_address=ip_address,
            user_agent=user_agent,
            success=False,
            failure_reason="ip_blocked"
        )
        raise AuthenticationError("Access denied. Please contact support.")
    
    # Find user by email
    user = db.query(User).filter(User.email == login_data.email).first()
    
    if not user:
        # Record failed attempt - user not found
        SecurityService.record_login_attempt(
            db=db,
            email=login_data.email,
            ip_address=ip_address,
            user_agent=user_agent,
            success=False,
            failure_reason="user_not_found"
        )
        raise AuthenticationError("Invalid email or password")
    
    if not verify_password(login_data.password, user.password_hash):
        # Record failed attempt - wrong password
        SecurityService.record_login_attempt(
            db=db,
            email=login_data.email,
            ip_address=ip_address,
            user_agent=user_agent,
            success=False,
            failure_reason="invalid_password",
            user_id=str(user.id)
        )
        raise AuthenticationError("Invalid email or password")
    
    if not user.is_active:
        # Record failed attempt - inactive account
        SecurityService.record_login_attempt(
            db=db,
            email=login_data.email,
            ip_address=ip_address,
            user_agent=user_agent,
            success=False,
            failure_reason="account_inactive",
            user_id=str(user.id)
        )
        raise AuthenticationError("Account is inactive")
    
    # 🔐 VERIFICAÇÃO DE 2FA OBRIGATÓRIO PARA ADMIN
    if user.is_admin:
        # Buscar configuração 2FA do admin
        two_factor = db.query(TwoFactorAuth).filter(
            TwoFactorAuth.user_id == user.id,
            TwoFactorAuth.is_enabled == True
        ).first()
        
        if not two_factor:
            # Admin sem 2FA configurado - BLOQUEAR
            SecurityService.record_login_attempt(
                db=db,
                email=login_data.email,
                ip_address=ip_address,
                user_agent=user_agent,
                success=False,
                failure_reason="admin_2fa_not_configured",
                user_id=str(user.id)
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "ADMIN_2FA_REQUIRED",
                    "message": "Administradores devem configurar 2FA antes de acessar. Entre em contato com o suporte."
                }
            )
        
        # Admin com 2FA - verificar se código foi fornecido
        if not login_data.two_factor_code:
            # Retornar indicação de que 2FA é necessário
            return JSONResponse(
                status_code=200,
                content={
                    "requires_2fa": True,
                    "is_admin": True,
                    "message": "Código 2FA obrigatório para administradores",
                    "user_email": str(user.email)
                }
            )
        
        # Verificar código 2FA
        try:
            # Descriptografar secret
            secret = crypto_service.decrypt_data(two_factor.secret)
            totp = pyotp.TOTP(secret)
            
            if not totp.verify(login_data.two_factor_code, valid_window=1):
                SecurityService.record_login_attempt(
                    db=db,
                    email=login_data.email,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    success=False,
                    failure_reason="invalid_2fa_code",
                    user_id=str(user.id)
                )
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Código 2FA inválido"
                )
        except HTTPException:
            raise
        except Exception as e:
            print(f"Erro ao verificar 2FA: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro ao verificar código 2FA"
            )
    
    # Create access token
    access_token = create_access_token(
        data={"sub": user.email, "user_id": str(user.id)},
        expires_delta=timedelta(hours=24)
    )
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    # Record successful login
    SecurityService.record_login_attempt(
        db=db,
        email=str(user.email),
        ip_address=ip_address,
        user_agent=user_agent,
        success=True,
        user_id=str(user.id)
    )
    
    # Create user session
    try:
        SecurityService.create_session(
            db=db,
            user_id=str(user.id),
            ip_address=ip_address,
            user_agent=user_agent
        )
    except Exception as e:
        # Don't fail login if session creation fails
        print(f"Failed to create session: {e}")
    
    # Log audit
    try:
        SecurityService.log_audit(
            db=db,
            action="login",
            user_id=str(user.id),
            user_email=str(user.email),
            description=f"User logged in from {ip_address}",
            ip_address=ip_address,
            user_agent=user_agent
        )
    except Exception as e:
        print(f"Failed to log audit: {e}")
    
    # Log login activity (legacy)
    try:
        UserActivityService.log_login(
            db=db,
            user_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            success=True
        )
    except Exception as e:
        print(f"Failed to log login activity: {e}")
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=86400,  # 24 hours
        user=UserResponse.model_validate(user)
    )

@router.post("/register", response_model=LoginResponse)
async def register(
    register_data: RegisterRequest,
    db: Session = Depends(get_db)
):
    """
    Register a new user and automatically log them in.
    Supports optional referral code (WOLK FRIENDS program).
    Returns access token for immediate login.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    # Check if user already exists
    existing_user = db.query(User).filter(
        (User.email == register_data.email) | 
        (User.username == register_data.username)
    ).first()
    
    if existing_user:
        if existing_user.email == register_data.email:
            raise ValidationError("Email already registered")
        else:
            raise ValidationError("Username already taken")
    
    # Create new user
    user = User(
        email=register_data.email,
        username=register_data.username,
        password_hash=""  # Will be set below
    )
    
    # Set password with proper hashing
    user.set_password(register_data.password)
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    logger.info(f"✅ Novo usuário registrado: {user.email}")
    
    # Process referral code if provided (WOLK FRIENDS)
    if register_data.referral_code:
        try:
            from app.services.referral_service import ReferralService
            referral_service = ReferralService(db)
            referral = referral_service.register_referral(
                referred_user_id=str(user.id),
                referral_code=register_data.referral_code
            )
            if referral:
                logger.info(f"✅ Usuário {user.email} registrado com código de indicação: {register_data.referral_code}")
            else:
                logger.warning(f"⚠️ Código de indicação inválido ou já usado: {register_data.referral_code}")
        except Exception as e:
            # Não falha o registro se houver erro no referral
            logger.error(f"❌ Erro ao processar indicação: {e}")
    
    # Create access token for auto-login after registration
    access_token = create_access_token(
        data={"sub": user.email, "user_id": str(user.id)},
        expires_delta=timedelta(hours=24)
    )
    
    # Return LoginResponse with token (same as login endpoint)
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=86400,  # 24 hours
        user=UserResponse.model_validate(user)
    )

@router.post("/refresh")
async def refresh_token(
    current_user: User = Depends(get_current_user)
):
    """
    Refresh access token for authenticated user.
    """
    access_token = create_access_token(
        data={"sub": current_user.email, "user_id": str(current_user.id)},
        expires_delta=timedelta(hours=24)
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": 86400
    }

@router.post("/logout")
async def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Logout user (mainly for client-side token cleanup).
    """
    ip_address = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent")
    
    # Invalidate all sessions for this user (or just current one in production)
    try:
        SecurityService.invalidate_all_user_sessions(
            db=db,
            user_id=str(current_user.id),
            reason="user_logout"
        )
    except Exception as e:
        print(f"Failed to invalidate sessions: {e}")
    
    # Log audit
    try:
        SecurityService.log_audit(
            db=db,
            action="logout",
            user_id=str(current_user.id),
            user_email=str(current_user.email),
            description="User logged out",
            ip_address=ip_address,
            user_agent=user_agent
        )
    except Exception as e:
        print(f"Failed to log audit: {e}")
    
    return {"message": "Successfully logged out"}

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """
    Get current authenticated user information.
    """
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        created_at=current_user.created_at,
        last_login=current_user.last_login
    )

@router.post("/verify-token")
async def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """
    Verify if the provided token is valid.
    """
    try:
        user = await get_current_user(credentials.credentials, db)
        return {
            "valid": True,
            "user_id": str(user.id),
            "email": user.email
        }
    except Exception:
        return {"valid": False}


# ============================================
# CHANGE PASSWORD ENDPOINT
# ============================================

class ChangePasswordRequest(BaseModel):
    currentPassword: str
    newPassword: str

class ChangePasswordResponse(BaseModel):
    success: bool
    message: str

@router.post("/change-password", response_model=ChangePasswordResponse)
async def change_password(
    password_data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Change current user's password.
    Requires current password verification.
    """
    try:
        # Verify current password
        if not verify_password(password_data.currentPassword, current_user.password_hash):
            # Log failed attempt
            try:
                UserActivityService.log_activity(
                    db=db,
                    user_id=str(current_user.id),
                    activity_type="security",
                    description="Tentativa de alteração de senha com senha incorreta",
                    status="failed"
                )
            except Exception:
                pass
            
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Senha atual incorreta"
            )
        
        # Check if new password is different from current
        if verify_password(password_data.newPassword, current_user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A nova senha deve ser diferente da senha atual"
            )
        
        # Validate new password strength
        if len(password_data.newPassword) < 8:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A nova senha deve ter pelo menos 8 caracteres"
            )
        
        # Update password
        current_user.password_hash = get_password_hash(password_data.newPassword)
        current_user.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        
        # Log successful password change
        try:
            UserActivityService.log_activity(
                db=db,
                user_id=str(current_user.id),
                activity_type="security",
                description="Senha alterada com sucesso",
                status="success"
            )
        except Exception:
            pass
        
        return ChangePasswordResponse(
            success=True,
            message="Senha alterada com sucesso"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao alterar senha: {str(e)}"
        )


# ============================================
# FORGOT PASSWORD ENDPOINT
# ============================================

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    success: bool
    message: str


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
async def forgot_password(
    request_data: ForgotPasswordRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Solicita recuperação de senha.
    
    Envia um email com link para redefinir a senha.
    Por segurança, sempre retorna sucesso (não revela se email existe).
    """
    from app.models.password_reset import PasswordResetToken
    from app.models.user_settings import UserSettings
    
    ip_address = request.client.host if request.client else "unknown"
    
    try:
        # Buscar usuário pelo email
        user = db.query(User).filter(User.email == request_data.email).first()
        
        if user:
            # Buscar idioma do usuário
            user_settings = db.query(UserSettings).filter(UserSettings.user_id == str(user.id)).first()
            user_language = user_settings.language if user_settings else "en"
            
            # Invalidar tokens anteriores
            db.query(PasswordResetToken).filter(
                PasswordResetToken.user_id == user.id,
                PasswordResetToken.used == False
            ).update({"used": True})
            
            # Criar novo token
            reset_token = PasswordResetToken.create_for_user(
                user_id=str(user.id),
                expires_in_hours=1,
                ip_address=ip_address
            )
            db.add(reset_token)
            db.commit()
            
            # Enviar email no idioma do usuário
            try:
                await email_service.send_password_reset(
                    to_email=user.email,
                    username=user.username,
                    reset_token=reset_token.token,
                    expires_in_hours=1,
                    language=user_language
                )
                logger.info(f"Email de reset enviado para {user.email} (idioma: {user_language})")
            except Exception as email_error:
                logger.error(f"❌ Erro ao enviar email de reset: {email_error}")
            
            # Log da atividade
            try:
                UserActivityService.log_activity(
                    db=db,
                    user_id=str(user.id),
                    activity_type="security",
                    description="Solicitação de recuperação de senha",
                    ip_address=ip_address,
                    status="success"
                )
            except Exception:
                pass
        else:
            # Mesmo se usuário não existe, não revelamos isso
            logger.info(f"⚠️ Tentativa de reset para email inexistente: {request_data.email}")
        
        # Sempre retorna sucesso por segurança
        return ForgotPasswordResponse(
            success=True,
            message="Se o email estiver cadastrado, você receberá instruções para redefinir sua senha."
        )
        
    except Exception as e:
        logger.error(f"❌ Erro no forgot-password: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao processar solicitação"
        )


# ============================================
# RESET PASSWORD ENDPOINT
# ============================================

class ResetPasswordRequest(BaseModel):
    token: str
    newPassword: str


class ResetPasswordResponse(BaseModel):
    success: bool
    message: str


@router.post("/reset-password", response_model=ResetPasswordResponse)
async def reset_password(
    request_data: ResetPasswordRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Redefine a senha usando o token de recuperação.
    
    Valida o token e atualiza a senha do usuário.
    """
    from app.models.password_reset import PasswordResetToken
    from app.models.user_settings import UserSettings
    
    ip_address = request.client.host if request.client else "unknown"
    
    try:
        # Buscar token
        reset_token = db.query(PasswordResetToken).filter(
            PasswordResetToken.token == request_data.token
        ).first()
        
        if not reset_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token inválido ou expirado"
            )
        
        if not reset_token.is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token inválido ou expirado"
            )
        
        # Buscar usuário
        user = db.query(User).filter(User.id == reset_token.user_id).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Usuário não encontrado"
            )
        
        # Buscar idioma do usuário
        user_settings = db.query(UserSettings).filter(UserSettings.user_id == str(user.id)).first()
        user_language = user_settings.language if user_settings else "en"
        
        # Validar nova senha
        if len(request_data.newPassword) < 8:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A senha deve ter pelo menos 8 caracteres"
            )
        
        # Atualizar senha
        user.password_hash = get_password_hash(request_data.newPassword)
        user.updated_at = datetime.now(timezone.utc)
        
        # Marcar token como usado
        reset_token.mark_as_used()
        
        db.commit()
        
        # Enviar notificação de senha alterada no idioma do usuário
        try:
            await email_service.send_password_changed(
                to_email=user.email,
                username=user.username,
                ip_address=ip_address,
                language=user_language
            )
        except Exception:
            pass
        
        # Log da atividade
        try:
            UserActivityService.log_activity(
                db=db,
                user_id=str(user.id),
                activity_type="security",
                description="Senha redefinida via token de recuperação",
                ip_address=ip_address,
                status="success"
            )
        except Exception:
            pass
        
        logger.info(f"✅ Senha redefinida com sucesso para {user.email}")
        
        return ResetPasswordResponse(
            success=True,
            message="Senha redefinida com sucesso! Você já pode fazer login."
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erro no reset-password: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao redefinir senha"
        )


# ============================================
# RESEND VERIFICATION EMAIL
# ============================================

class ResendVerificationRequest(BaseModel):
    email: EmailStr


class ResendVerificationResponse(BaseModel):
    success: bool
    message: str


@router.post("/resend-verification", response_model=ResendVerificationResponse)
async def resend_verification(
    request_data: ResendVerificationRequest,
    db: Session = Depends(get_db)
):
    """
    Reenvia email de verificação de conta.
    """
    from app.models.password_reset import EmailVerificationToken
    from app.models.user_settings import UserSettings
    
    try:
        user = db.query(User).filter(User.email == request_data.email).first()
        
        if user and not user.is_email_verified:
            # Buscar idioma do usuário
            user_settings = db.query(UserSettings).filter(UserSettings.user_id == str(user.id)).first()
            user_language = user_settings.language if user_settings else "en"
            
            # Criar novo token de verificação
            verification_token = EmailVerificationToken.create_for_user(
                user_id=str(user.id),
                email=user.email,
                expires_in_hours=24
            )
            db.add(verification_token)
            db.commit()
            
            # Enviar email no idioma do usuário
            try:
                await email_service.send_email_verification(
                    to_email=user.email,
                    username=user.username,
                    verification_token=verification_token.token,
                    language=user_language
                )
                logger.info(f"Email de verificacao reenviado para {user.email} (idioma: {user_language})")
            except Exception as email_error:
                logger.error(f"❌ Erro ao reenviar email de verificação: {email_error}")
        
        # Sempre retorna sucesso por segurança
        return ResendVerificationResponse(
            success=True,
            message="Se o email estiver cadastrado e não verificado, você receberá um novo link."
        )
        
    except Exception as e:
        logger.error(f"❌ Erro no resend-verification: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao processar solicitação"
        )


# ============================================
# VERIFY EMAIL ENDPOINT
# ============================================

class VerifyEmailRequest(BaseModel):
    token: str


class VerifyEmailResponse(BaseModel):
    success: bool
    message: str


@router.post("/verify-email", response_model=VerifyEmailResponse)
async def verify_email(
    request_data: VerifyEmailRequest,
    db: Session = Depends(get_db)
):
    """
    Verifica o email do usuário usando o token.
    """
    from app.models.password_reset import EmailVerificationToken
    
    try:
        # Buscar token
        verification_token = db.query(EmailVerificationToken).filter(
            EmailVerificationToken.token == request_data.token
        ).first()
        
        if not verification_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token inválido ou expirado"
            )
        
        if not verification_token.is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token inválido ou expirado"
            )
        
        # Buscar usuário
        user = db.query(User).filter(User.id == verification_token.user_id).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Usuário não encontrado"
            )
        
        # Verificar email
        user.is_email_verified = True
        user.updated_at = datetime.now(timezone.utc)
        
        # Marcar token como usado
        verification_token.mark_as_verified()
        
        db.commit()
        
        logger.info(f"✅ Email verificado com sucesso: {user.email}")
        
        return VerifyEmailResponse(
            success=True,
            message="Email verificado com sucesso!"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erro no verify-email: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao verificar email"
        )
