"""
User Profile Router
===================

API endpoints for user profile management.
Uses KYC personal data when available.

Endpoints:
- GET /users/me/profile - Get current user's full profile
- PUT /users/me/profile - Update current user's profile (limited fields)
- GET /users/me/notifications - Get notification settings
- PUT /users/me/notifications - Update notification settings
- POST /users/me/password - Change password
- GET /users/me/security - Get security settings

Author: HOLD Wallet Team
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import Optional
from datetime import datetime, timezone
import json
import logging

from app.core.db import get_db
from app.core.security import get_current_user, verify_password, get_password_hash
from app.models.user import User
from app.models.kyc import KYCVerification, KYCPersonalData, KYCStatus
from app.models.two_factor import TwoFactorAuth
from app.models.user_settings import UserSettings
from app.schemas.user_profile import (
    UserProfileUpdate,
    UserProfileResponse,
    UserFullProfileResponse,
    NotificationSettingsUpdate,
    NotificationSettingsResponse,
    PasswordChangeRequest,
    PasswordChangeResponse,
    SecuritySettingsResponse,
    TwoFactorStatusResponse
)
from app.services.user_activity_service import UserActivityService

logger = logging.getLogger(__name__)

router = APIRouter()


# ============================================
# PROFILE ENDPOINTS
# ============================================

@router.get("/me/profile", response_model=UserFullProfileResponse)
async def get_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's full profile information.
    Includes user data and KYC personal data when available.
    """
    try:
        print(f"[PROFILE DEBUG] Getting profile for user: {current_user.id}")
        
        # Get the latest approved KYC verification with personal data
        kyc_verification = db.query(KYCVerification).options(
            joinedload(KYCVerification.personal_data)
        ).filter(
            KYCVerification.user_id == current_user.id,
            KYCVerification.status == KYCStatus.APPROVED.value
        ).order_by(KYCVerification.approved_at.desc()).first()
        
        print(f"[PROFILE DEBUG] Approved KYC found: {kyc_verification is not None}")
        if kyc_verification:
            print(f"[PROFILE DEBUG] KYC ID: {kyc_verification.id}, Status: {kyc_verification.status}")
        
        # If no approved KYC, try to get the latest one (any status)
        if not kyc_verification:
            kyc_verification = db.query(KYCVerification).options(
                joinedload(KYCVerification.personal_data)
            ).filter(
                KYCVerification.user_id == current_user.id
            ).order_by(KYCVerification.created_at.desc()).first()
            print(f"[PROFILE DEBUG] Any KYC found: {kyc_verification is not None}")
            if kyc_verification:
                print(f"[PROFILE DEBUG] KYC ID: {kyc_verification.id}, Status: {kyc_verification.status}")
        
        # Get personal data from KYC if available
        personal_data = kyc_verification.personal_data if kyc_verification else None
        
        if personal_data:
            print(f"[PROFILE DEBUG] Personal data found: name={personal_data.full_name}, phone={personal_data.phone}, city={personal_data.city}")
        else:
            print("[PROFILE DEBUG] No personal data found for user")
        
        # Build response with KYC data
        return UserFullProfileResponse(
            # User data
            id=current_user.id,
            email=current_user.email,
            username=current_user.username,
            is_active=current_user.is_active,
            is_admin=current_user.is_admin,
            created_at=current_user.created_at,
            last_login=current_user.last_login,
            # Profile data from KYC
            full_name=personal_data.full_name if personal_data else None,
            phone=personal_data.phone if personal_data else None,
            bio=None,  # Bio is not in KYC
            city=personal_data.city if personal_data else None,
            state=personal_data.state if personal_data else None,
            country=personal_data.country if personal_data else None,
            birth_date=personal_data.birth_date if personal_data else None,
            website=None,  # Website is not in KYC
            avatar_url=None,  # Avatar is not in KYC
            social_links=None,  # Social links not in KYC
            # KYC specific fields
            kyc_status=kyc_verification.status if kyc_verification else None,
            kyc_level=kyc_verification.level if kyc_verification else None,
            occupation=personal_data.occupation if personal_data else None,
            document_type=personal_data.document_type if personal_data else None,
            nationality=personal_data.nationality if personal_data else None
        )
    except Exception as e:
        logger.error(f"Error getting user profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting profile: {str(e)}"
        )


@router.put("/me/profile", response_model=UserFullProfileResponse)
async def update_user_profile(
    profile_update: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update current user's profile information.
    Note: KYC data cannot be modified here. Only bio, website, avatar_url, social_links.
    """
    try:
        # Log activity
        try:
            UserActivityService.log_activity(
                db=db,
                user_id=str(current_user.id),
                activity_type="profile",
                description="Tentativa de atualização de perfil",
                status="success"
            )
        except Exception as e:
            logger.warning(f"Failed to log activity: {e}")
        
        # Get profile data again to return
        kyc_verification = db.query(KYCVerification).options(
            joinedload(KYCVerification.personal_data)
        ).filter(
            KYCVerification.user_id == current_user.id
        ).order_by(KYCVerification.created_at.desc()).first()
        
        personal_data = kyc_verification.personal_data if kyc_verification else None
        
        return UserFullProfileResponse(
            id=current_user.id,
            email=current_user.email,
            username=current_user.username,
            is_active=current_user.is_active,
            is_admin=current_user.is_admin,
            created_at=current_user.created_at,
            last_login=current_user.last_login,
            full_name=personal_data.full_name if personal_data else None,
            phone=personal_data.phone if personal_data else None,
            bio=None,
            city=personal_data.city if personal_data else None,
            state=personal_data.state if personal_data else None,
            country=personal_data.country if personal_data else None,
            birth_date=personal_data.birth_date if personal_data else None,
            website=None,
            avatar_url=None,
            social_links=None,
            kyc_status=kyc_verification.status if kyc_verification else None,
            kyc_level=kyc_verification.level if kyc_verification else None,
            occupation=personal_data.occupation if personal_data else None,
            document_type=personal_data.document_type if personal_data else None,
            nationality=personal_data.nationality if personal_data else None
        )
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating profile: {str(e)}"
        )


# ============================================
# NOTIFICATION SETTINGS ENDPOINTS
# ============================================

@router.get("/me/notifications", response_model=NotificationSettingsResponse)
async def get_notification_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's notification settings from UserSettings.
    Creates default settings if they don't exist.
    """
    try:
        settings = db.query(UserSettings).filter(
            UserSettings.user_id == current_user.id
        ).first()
        
        if not settings:
            # Create default settings
            settings = UserSettings(user_id=current_user.id)
            db.add(settings)
            db.commit()
            db.refresh(settings)
        
        return NotificationSettingsResponse(
            id=settings.id,
            user_id=settings.user_id,
            trade_alerts=settings.trade_notifications if hasattr(settings, 'trade_notifications') else True,
            price_alerts=settings.price_alerts if hasattr(settings, 'price_alerts') else True,
            security_alerts=settings.security_alerts if hasattr(settings, 'security_alerts') else True,
            marketing_emails=settings.marketing_emails if hasattr(settings, 'marketing_emails') else False,
            weekly_report=settings.weekly_report if hasattr(settings, 'weekly_report') else True,
            push_enabled=settings.push_notifications if hasattr(settings, 'push_notifications') else True,
            push_trade_alerts=settings.push_trade_alerts if hasattr(settings, 'push_trade_alerts') else True,
            push_price_alerts=settings.push_price_alerts if hasattr(settings, 'push_price_alerts') else False,
            push_security_alerts=settings.push_security_alerts if hasattr(settings, 'push_security_alerts') else True,
            email_enabled=settings.email_notifications if hasattr(settings, 'email_notifications') else True,
            created_at=settings.created_at,
            updated_at=settings.updated_at if hasattr(settings, 'updated_at') else None
        )
    except Exception as e:
        logger.error(f"Error getting notification settings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting notification settings: {str(e)}"
        )


@router.put("/me/notifications", response_model=NotificationSettingsResponse)
async def update_notification_settings(
    settings_update: NotificationSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update current user's notification settings.
    Creates settings if they don't exist.
    """
    try:
        settings = db.query(UserSettings).filter(
            UserSettings.user_id == current_user.id
        ).first()
        
        if not settings:
            settings = UserSettings(user_id=current_user.id)
            db.add(settings)
        
        # Map update fields to UserSettings fields
        update_data = settings_update.model_dump(exclude_unset=True)
        
        field_mapping = {
            'trade_alerts': 'trade_notifications',
            'push_enabled': 'push_notifications',
            'email_enabled': 'email_notifications',
        }
        
        for field, value in update_data.items():
            if value is not None:
                # Map field name if needed
                db_field = field_mapping.get(field, field)
                if hasattr(settings, db_field):
                    setattr(settings, db_field, value)
        
        db.commit()
        db.refresh(settings)
        
        # Log activity
        try:
            UserActivityService.log_activity(
                db=db,
                user_id=str(current_user.id),
                activity_type="settings",
                description="Configurações de notificação atualizadas",
                status="success"
            )
        except Exception as e:
            logger.warning(f"Failed to log activity: {e}")
        
        return NotificationSettingsResponse(
            id=settings.id,
            user_id=settings.user_id,
            trade_alerts=settings.trade_notifications if hasattr(settings, 'trade_notifications') else True,
            price_alerts=settings.price_alerts if hasattr(settings, 'price_alerts') else True,
            security_alerts=settings.security_alerts if hasattr(settings, 'security_alerts') else True,
            marketing_emails=settings.marketing_emails if hasattr(settings, 'marketing_emails') else False,
            weekly_report=settings.weekly_report if hasattr(settings, 'weekly_report') else True,
            push_enabled=settings.push_notifications if hasattr(settings, 'push_notifications') else True,
            push_trade_alerts=settings.push_trade_alerts if hasattr(settings, 'push_trade_alerts') else True,
            push_price_alerts=settings.push_price_alerts if hasattr(settings, 'push_price_alerts') else False,
            push_security_alerts=settings.push_security_alerts if hasattr(settings, 'push_security_alerts') else True,
            email_enabled=settings.email_notifications if hasattr(settings, 'email_notifications') else True,
            created_at=settings.created_at,
            updated_at=settings.updated_at if hasattr(settings, 'updated_at') else None
        )
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating notification settings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating settings: {str(e)}"
        )


# ============================================
# PASSWORD CHANGE ENDPOINT
# ============================================

@router.post("/me/password", response_model=PasswordChangeResponse)
async def change_password(
    password_data: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Change current user's password.
    Requires current password verification.
    """
    try:
        # Verify current password
        if not verify_password(password_data.current_password, current_user.password_hash):
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
        if verify_password(password_data.new_password, current_user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A nova senha deve ser diferente da senha atual"
            )
        
        # Update password
        current_user.password_hash = get_password_hash(password_data.new_password)
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
        except Exception as e:
            logger.warning(f"Failed to log activity: {e}")
        
        return PasswordChangeResponse(
            success=True,
            message="Senha alterada com sucesso"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error changing password: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao alterar senha: {str(e)}"
        )


# ============================================
# SECURITY SETTINGS ENDPOINTS
# ============================================

@router.get("/me/security", response_model=SecuritySettingsResponse)
async def get_security_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's security settings.
    """
    try:
        # Check 2FA status
        two_factor = db.query(TwoFactorAuth).filter(
            TwoFactorAuth.user_id == current_user.id,
            TwoFactorAuth.is_enabled == True
        ).first()
        
        # Count active sessions (placeholder - implement if session tracking exists)
        active_sessions = 1  # Current session
        
        two_factor_enabled = bool(two_factor is not None and two_factor.is_enabled)
        
        return SecuritySettingsResponse(
            two_factor_enabled=two_factor_enabled,
            two_factor_method="totp" if two_factor else None,
            last_password_change=current_user.updated_at,
            active_sessions=active_sessions,
            login_notifications=True
        )
    except Exception as e:
        logger.error(f"Error getting security settings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting security settings: {str(e)}"
        )


@router.get("/me/2fa/status", response_model=TwoFactorStatusResponse)
async def get_2fa_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's 2FA status.
    """
    try:
        two_factor = db.query(TwoFactorAuth).filter(
            TwoFactorAuth.user_id == current_user.id
        ).first()
        
        if not two_factor:
            return TwoFactorStatusResponse(
                enabled=False,
                method=None,
                verified=False,
                backup_codes_remaining=0
            )
        
        # Count remaining backup codes
        backup_codes_remaining = 0
        backup_codes_str = str(two_factor.backup_codes) if two_factor.backup_codes else None
        if backup_codes_str:
            try:
                codes = json.loads(backup_codes_str)
                backup_codes_remaining = len([c for c in codes if not c.get('used', False)])
            except (json.JSONDecodeError, TypeError):
                backup_codes_remaining = 0
        
        return TwoFactorStatusResponse(
            enabled=bool(two_factor.is_enabled),
            method="totp",
            verified=bool(two_factor.is_verified),
            backup_codes_remaining=backup_codes_remaining
        )
    except Exception as e:
        logger.error(f"Error getting 2FA status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting 2FA status: {str(e)}"
        )
