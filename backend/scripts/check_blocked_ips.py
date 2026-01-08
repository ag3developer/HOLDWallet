#!/usr/bin/env python3
"""
Script para verificar e limpar IPs bloqueados
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timezone

# Database URL
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/holdwallet')

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

def check_blocked_ips():
    """Lista todos os IPs bloqueados"""
    db = SessionLocal()
    try:
        # Import here after path is set
        from app.models.security import BlockedIP
        
        blocked_ips = db.query(BlockedIP).filter(BlockedIP.is_active == True).all()
        
        print("\n" + "=" * 60)
        print("📋 IPs BLOQUEADOS ATIVOS")
        print("=" * 60)
        
        if not blocked_ips:
            print("✅ Nenhum IP bloqueado encontrado!")
        else:
            for ip in blocked_ips:
                print(f"\n🚫 IP: {ip.ip_address}")
                print(f"   Razão: {ip.reason}")
                print(f"   Bloqueado em: {ip.blocked_at}")
                print(f"   Expira em: {ip.expires_at}")
                print(f"   Permanente: {ip.is_permanent}")
                print(f"   Bloqueado por: {ip.blocked_by}")
        
        return blocked_ips
        
    finally:
        db.close()


def unblock_localhost():
    """Remove bloqueio do localhost"""
    db = SessionLocal()
    try:
        from app.models.security import BlockedIP
        
        # IPs locais comuns
        local_ips = ['127.0.0.1', '::1', 'localhost', '0.0.0.0']
        
        count = 0
        for ip in local_ips:
            blocked = db.query(BlockedIP).filter(
                BlockedIP.ip_address == ip,
                BlockedIP.is_active == True
            ).all()
            
            for b in blocked:
                b.is_active = False
                count += 1
                print(f"✅ Desbloqueando {ip}")
        
        db.commit()
        
        if count == 0:
            print("ℹ️  Nenhum IP local estava bloqueado")
        else:
            print(f"\n🎉 {count} IPs locais desbloqueados!")
        
    finally:
        db.close()


def clear_all_blocks():
    """Remove TODOS os bloqueios (use com cuidado!)"""
    db = SessionLocal()
    try:
        from app.models.security import BlockedIP
        
        result = db.query(BlockedIP).filter(BlockedIP.is_active == True).update(
            {"is_active": False}
        )
        db.commit()
        
        print(f"✅ {result} IPs desbloqueados!")
        
    finally:
        db.close()


if __name__ == "__main__":
    print("\n🔍 Verificando IPs bloqueados...\n")
    
    blocked = check_blocked_ips()
    
    if blocked:
        print("\n" + "-" * 60)
        response = input("\n❓ Deseja desbloquear TODOS os IPs? (s/n): ").strip().lower()
        
        if response == 's':
            clear_all_blocks()
            print("\n✅ Todos os IPs foram desbloqueados!")
        else:
            response2 = input("❓ Deseja desbloquear apenas IPs locais (127.0.0.1, etc)? (s/n): ").strip().lower()
            if response2 == 's':
                unblock_localhost()
    
    print("\n" + "=" * 60)
    print("🏁 Concluído!")
    print("=" * 60 + "\n")
