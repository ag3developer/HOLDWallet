#!/usr/bin/env python3
"""
Script para desbloquear um IP específico do banco de dados
Uso: python scripts/unblock_ip.py <ip_address>
"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy.orm import Session
from app.core.db import SessionLocal
from app.models.security import BlockedIP


def unblock_ip(ip_address: str):
    """Desbloqueia um IP específico"""
    db: Session = SessionLocal()
    try:
        # Find blocked IP
        blocked = db.query(BlockedIP).filter(
            BlockedIP.ip_address == ip_address
        ).all()
        
        if not blocked:
            print(f"❌ IP {ip_address} não encontrado na lista de bloqueio")
            return False
        
        # Deactivate all entries for this IP
        for entry in blocked:
            entry.is_active = False
            print(f"✅ Desbloqueado: {entry.ip_address}")
            print(f"   - Razão original: {entry.reason}")
            print(f"   - Bloqueado em: {entry.blocked_at}")
        
        db.commit()
        print(f"\n✅ IP {ip_address} desbloqueado com sucesso!")
        return True
        
    except Exception as e:
        db.rollback()
        print(f"❌ Erro ao desbloquear IP: {e}")
        return False
    finally:
        db.close()


def list_blocked_ips():
    """Lista todos os IPs bloqueados ativos"""
    db: Session = SessionLocal()
    try:
        blocked = db.query(BlockedIP).filter(
            BlockedIP.is_active == True
        ).all()
        
        if not blocked:
            print("✅ Nenhum IP bloqueado no momento")
            return
        
        print(f"\n🚫 {len(blocked)} IP(s) bloqueado(s):\n")
        for entry in blocked:
            print(f"  • {entry.ip_address}")
            print(f"    Razão: {entry.reason}")
            print(f"    Bloqueado em: {entry.blocked_at}")
            print(f"    Expira em: {entry.expires_at or 'Permanente'}")
            print()
            
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python scripts/unblock_ip.py <ip_address>")
        print("     python scripts/unblock_ip.py --list")
        sys.exit(1)
    
    if sys.argv[1] == "--list":
        list_blocked_ips()
    else:
        ip_to_unblock = sys.argv[1]
        unblock_ip(ip_to_unblock)
