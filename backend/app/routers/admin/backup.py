"""
💾 Admin Backup Router
======================

Endpoints para gerenciamento de backups do sistema.

ENDPOINTS:
- POST /admin/backup/database - Backup do banco de dados
- POST /admin/backup/keys - Backup das chaves criptografadas
- POST /admin/backup/full - Backup completo
- GET /admin/backup/list - Listar backups
- DELETE /admin/backup/cleanup - Limpar backups antigos
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional
import logging
from datetime import datetime

from app.core.db import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services.backup_service import backup_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/backup", tags=["Admin - Backup"])


def require_admin(user: User = Depends(get_current_user)) -> User:
    """Verifica se o usuário é admin."""
    if not user.is_admin:
        raise HTTPException(
            status_code=403,
            detail="Acesso negado. Apenas administradores podem acessar."
        )
    return user


@router.post("/database")
async def backup_database(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_admin)
):
    """
    💾 Criar backup do banco de dados PostgreSQL.
    
    O backup é criado em formato SQL comprimido (gzip).
    """
    try:
        logger.info(f"📦 Admin {current_user.email} iniciou backup do banco")
        result = backup_service.backup_database()
        
        if result["success"]:
            return {
                "success": True,
                "message": "Backup do banco de dados criado com sucesso",
                "data": result
            }
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Falha no backup: {result.get('error')}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro no backup do banco: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao criar backup: {str(e)}"
        )


@router.post("/keys")
async def backup_keys(
    current_user: User = Depends(require_admin)
):
    """
    🔐 Criar backup das chaves privadas criptografadas.
    
    IMPORTANTE: As chaves são armazenadas já criptografadas.
    Este backup cria uma cópia adicional de segurança.
    """
    try:
        logger.info(f"🔑 Admin {current_user.email} iniciou backup de chaves")
        result = backup_service.backup_encrypted_keys()
        
        if result["success"]:
            return {
                "success": True,
                "message": "Backup de chaves criado com sucesso",
                "data": result
            }
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Falha no backup: {result.get('error')}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro no backup de chaves: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao criar backup: {str(e)}"
        )


@router.post("/full")
async def backup_full(
    current_user: User = Depends(require_admin)
):
    """
    📦 Criar backup completo (banco + chaves).
    
    Recomendado para backup diário agendado.
    """
    try:
        logger.info(f"📦 Admin {current_user.email} iniciou backup completo")
        result = backup_service.full_backup()
        
        return {
            "success": result["success"],
            "message": "Backup completo finalizado" if result["success"] else "Backup com erros",
            "data": result
        }
            
    except Exception as e:
        logger.error(f"Erro no backup completo: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao criar backup: {str(e)}"
        )


@router.get("/list")
async def list_backups(
    current_user: User = Depends(require_admin)
):
    """
    📋 Listar todos os backups disponíveis.
    """
    try:
        backups = backup_service.list_backups()
        
        # Calcular estatísticas
        total_size = sum(b["size_bytes"] for b in backups)
        db_backups = [b for b in backups if b["type"] == "database"]
        key_backups = [b for b in backups if b["type"] == "keys"]
        
        return {
            "success": True,
            "data": {
                "backups": backups,
                "total_count": len(backups),
                "database_backups": len(db_backups),
                "key_backups": len(key_backups),
                "total_size_mb": round(total_size / (1024 * 1024), 2),
                "backup_directory": str(backup_service.backup_dir)
            }
        }
            
    except Exception as e:
        logger.error(f"Erro ao listar backups: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao listar backups: {str(e)}"
        )


@router.delete("/cleanup")
async def cleanup_old_backups(
    current_user: User = Depends(require_admin)
):
    """
    🗑️ Remover backups mais antigos que o período de retenção.
    
    O período padrão é 30 dias (configurável via BACKUP_RETENTION_DAYS).
    """
    try:
        logger.info(f"🗑️ Admin {current_user.email} iniciou limpeza de backups")
        result = backup_service.cleanup_old_backups()
        
        return {
            "success": True,
            "message": f"Limpeza concluída. {result['deleted_count']} arquivos removidos.",
            "data": result
        }
            
    except Exception as e:
        logger.error(f"Erro na limpeza de backups: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro na limpeza: {str(e)}"
        )


@router.get("/status")
async def backup_status(
    current_user: User = Depends(require_admin)
):
    """
    📊 Status do sistema de backup.
    """
    try:
        backups = backup_service.list_backups()
        
        # Encontrar último backup de cada tipo
        last_db_backup = next((b for b in backups if b["type"] == "database"), None)
        last_key_backup = next((b for b in backups if b["type"] == "keys"), None)
        
        return {
            "success": True,
            "data": {
                "backup_enabled": True,
                "backup_directory": str(backup_service.backup_dir),
                "retention_days": backup_service.retention_days,
                "last_database_backup": last_db_backup,
                "last_keys_backup": last_key_backup,
                "total_backups": len(backups),
                "recommendations": [
                    "Configure um cron job para backup diário",
                    "Copie backups para storage externo (S3, GCS)",
                    "Teste restauração periodicamente"
                ]
            }
        }
            
    except Exception as e:
        logger.error(f"Erro ao obter status: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao obter status: {str(e)}"
        )
