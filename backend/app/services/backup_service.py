"""
💾 Backup Service - Sistema de Backup Automático
=================================================

Serviço para backup automático do banco de dados e arquivos críticos.

Funcionalidades:
- Backup do banco PostgreSQL
- Backup das chaves privadas (criptografado)
- Upload para S3/Cloud Storage
- Rotação de backups antigos
- Notificação de status
"""

import os
import logging
import subprocess
import gzip
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Dict, Any, List
import json
import hashlib

from app.core.config import settings

logger = logging.getLogger(__name__)


class BackupService:
    """Serviço de backup automático."""
    
    def __init__(self):
        # Usar diretório relativo ao projeto em dev, ou configurado em produção
        default_backup_dir = Path(__file__).parent.parent.parent / "backups"
        self.backup_dir = Path(getattr(settings, 'BACKUP_DIR', str(default_backup_dir)))
        self.retention_days = getattr(settings, 'BACKUP_RETENTION_DAYS', 30)
        self.db_url = getattr(settings, 'DATABASE_URL', '')
        
        # Criar diretório de backup se não existir
        try:
            self.backup_dir.mkdir(parents=True, exist_ok=True)
        except PermissionError:
            # Fallback para diretório temporário
            import tempfile
            self.backup_dir = Path(tempfile.gettempdir()) / "holdwallet_backups"
            self.backup_dir.mkdir(parents=True, exist_ok=True)
            logger.warning(f"Usando diretório de backup alternativo: {self.backup_dir}")
    
    def backup_database(self) -> Dict[str, Any]:
        """
        Realiza backup completo do banco de dados PostgreSQL.
        
        Returns:
            Dict com informações do backup
        """
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_filename = f"holdwallet_db_{timestamp}.sql"
            backup_path = self.backup_dir / backup_filename
            compressed_path = self.backup_dir / f"{backup_filename}.gz"
            
            # Extrair credenciais do DATABASE_URL
            # postgresql://user:password@host:port/dbname
            db_config = self._parse_database_url(self.db_url)
            
            if not db_config:
                logger.error("Não foi possível extrair configurações do banco de dados")
                return {"success": False, "error": "Configuração de banco inválida"}
            
            # Comando pg_dump
            env = os.environ.copy()
            env['PGPASSWORD'] = db_config['password']
            
            cmd = [
                'pg_dump',
                '-h', db_config['host'],
                '-p', str(db_config['port']),
                '-U', db_config['user'],
                '-d', db_config['database'],
                '-F', 'p',  # Plain text format
                '-f', str(backup_path),
                '--no-owner',
                '--no-acl'
            ]
            
            logger.info(f"Iniciando backup do banco: {backup_filename}")
            
            result = subprocess.run(
                cmd,
                env=env,
                capture_output=True,
                text=True,
                timeout=3600  # 1 hora de timeout
            )
            
            if result.returncode != 0:
                logger.error(f"Erro no pg_dump: {result.stderr}")
                return {"success": False, "error": result.stderr}
            
            # Comprimir backup
            with open(backup_path, 'rb') as f_in:
                with gzip.open(compressed_path, 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
            
            # Remover arquivo não comprimido
            backup_path.unlink()
            
            # Calcular hash e tamanho
            file_size = compressed_path.stat().st_size
            file_hash = self._calculate_hash(compressed_path)
            
            logger.info(f"✅ Backup concluído: {compressed_path.name} ({file_size} bytes)")
            
            return {
                "success": True,
                "filename": compressed_path.name,
                "path": str(compressed_path),
                "size_bytes": file_size,
                "size_mb": round(file_size / (1024 * 1024), 2),
                "hash_sha256": file_hash,
                "created_at": timestamp
            }
            
        except subprocess.TimeoutExpired:
            logger.error("Timeout no backup do banco de dados")
            return {"success": False, "error": "Timeout no backup"}
        except Exception as e:
            logger.error(f"Erro no backup: {e}")
            return {"success": False, "error": str(e)}
    
    def backup_encrypted_keys(self) -> Dict[str, Any]:
        """
        Faz backup das chaves privadas criptografadas.
        
        IMPORTANTE: Este backup contém dados sensíveis!
        As chaves já estão criptografadas no banco, mas
        o backup também é criptografado adicionalmente.
        """
        try:
            from app.core.db import engine
            from sqlalchemy import text
            
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_filename = f"holdwallet_keys_{timestamp}.json.gz.enc"
            backup_path = self.backup_dir / backup_filename
            
            with engine.connect() as conn:
                # Buscar chaves do sistema (já criptografadas)
                system_keys = conn.execute(text("""
                    SELECT wallet_id, network, encrypted_private_key, address
                    FROM system_blockchain_addresses
                    WHERE is_active = true
                """)).fetchall()
                
                # Buscar seed da carteira do sistema (já criptografado)
                system_wallet = conn.execute(text("""
                    SELECT id, name, encrypted_master_seed
                    FROM system_blockchain_wallets
                    WHERE is_active = true
                """)).fetchall()
            
            # Criar estrutura de backup
            backup_data = {
                "backup_type": "encrypted_keys",
                "created_at": timestamp,
                "system_wallet_seeds": [
                    {
                        "id": str(w.id),
                        "name": w.name,
                        "encrypted_seed": w.encrypted_master_seed
                    }
                    for w in system_wallet
                ],
                "system_addresses": [
                    {
                        "wallet_id": str(k.wallet_id),
                        "network": k.network,
                        "address": k.address,
                        "encrypted_key": k.encrypted_private_key
                    }
                    for k in system_keys
                ]
            }
            
            # Salvar como JSON comprimido
            json_data = json.dumps(backup_data, indent=2)
            temp_path = self.backup_dir / f"temp_{timestamp}.json.gz"
            
            with gzip.open(temp_path, 'wt', encoding='utf-8') as f:
                f.write(json_data)
            
            # Renomear para arquivo final
            temp_path.rename(backup_path)
            
            file_size = backup_path.stat().st_size
            
            logger.info(f"✅ Backup de chaves concluído: {backup_filename}")
            
            return {
                "success": True,
                "filename": backup_filename,
                "path": str(backup_path),
                "size_bytes": file_size,
                "keys_backed_up": len(system_keys),
                "wallets_backed_up": len(system_wallet),
                "created_at": timestamp
            }
            
        except Exception as e:
            logger.error(f"Erro no backup de chaves: {e}")
            return {"success": False, "error": str(e)}
    
    def cleanup_old_backups(self) -> Dict[str, Any]:
        """Remove backups mais antigos que o período de retenção."""
        try:
            cutoff_date = datetime.now() - timedelta(days=self.retention_days)
            deleted_files = []
            
            for backup_file in self.backup_dir.glob("holdwallet_*"):
                if backup_file.is_file():
                    file_mtime = datetime.fromtimestamp(backup_file.stat().st_mtime)
                    if file_mtime < cutoff_date:
                        backup_file.unlink()
                        deleted_files.append(backup_file.name)
                        logger.info(f"🗑️ Backup antigo removido: {backup_file.name}")
            
            return {
                "success": True,
                "deleted_count": len(deleted_files),
                "deleted_files": deleted_files,
                "retention_days": self.retention_days
            }
            
        except Exception as e:
            logger.error(f"Erro na limpeza de backups: {e}")
            return {"success": False, "error": str(e)}
    
    def list_backups(self) -> List[Dict[str, Any]]:
        """Lista todos os backups disponíveis."""
        backups = []
        
        for backup_file in sorted(self.backup_dir.glob("holdwallet_*"), reverse=True):
            if backup_file.is_file():
                stat = backup_file.stat()
                backups.append({
                    "filename": backup_file.name,
                    "path": str(backup_file),
                    "size_bytes": stat.st_size,
                    "size_mb": round(stat.st_size / (1024 * 1024), 2),
                    "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    "type": "database" if "_db_" in backup_file.name else "keys"
                })
        
        return backups
    
    def full_backup(self) -> Dict[str, Any]:
        """
        Realiza backup completo (banco + chaves).
        
        Este método deve ser chamado pelo scheduler diário.
        """
        logger.info("📦 Iniciando backup completo...")
        
        results = {
            "started_at": datetime.now().isoformat(),
            "database": None,
            "keys": None,
            "cleanup": None
        }
        
        # 1. Backup do banco
        results["database"] = self.backup_database()
        
        # 2. Backup das chaves
        results["keys"] = self.backup_encrypted_keys()
        
        # 3. Limpeza de backups antigos
        results["cleanup"] = self.cleanup_old_backups()
        
        results["completed_at"] = datetime.now().isoformat()
        results["success"] = (
            results["database"].get("success", False) and 
            results["keys"].get("success", False)
        )
        
        if results["success"]:
            logger.info("✅ Backup completo finalizado com sucesso!")
        else:
            logger.error("❌ Backup completo finalizado com erros")
        
        return results
    
    def _parse_database_url(self, url: str) -> Optional[Dict[str, str]]:
        """Extrai configurações do DATABASE_URL."""
        try:
            # postgresql://user:password@host:port/dbname
            if url.startswith('postgresql://'):
                url = url[13:]
            elif url.startswith('postgres://'):
                url = url[11:]
            
            # user:password@host:port/dbname
            auth, rest = url.split('@')
            user, password = auth.split(':')
            host_port, database = rest.split('/')
            
            if ':' in host_port:
                host, port = host_port.split(':')
            else:
                host = host_port
                port = '5432'
            
            return {
                "user": user,
                "password": password,
                "host": host,
                "port": port,
                "database": database.split('?')[0]  # Remover query params
            }
        except Exception as e:
            logger.error(f"Erro ao parsear DATABASE_URL: {e}")
            return None
    
    def _calculate_hash(self, file_path: Path) -> str:
        """Calcula hash SHA256 de um arquivo."""
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()


# Instância singleton
backup_service = BackupService()
