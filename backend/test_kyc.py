#!/usr/bin/env python3
"""Teste dos endpoints KYC"""
import asyncio
from app.services.kyc_service import KYCService
from app.core.db import SessionLocal
import uuid

async def test():
    db = SessionLocal()
    try:
        service = KYCService(db)
        user_id = uuid.UUID('caac82a2-d892-4b8d-aa3f-8f1255a84d23')
        
        print('1. GET /kyc/status - Testando get_user_status...')
        status = await service.get_user_status(user_id)
        print(f'   OK: has_kyc={status.has_kyc}, status={status.status}, level={status.level}')
        
        if not status.has_kyc:
            print('2. POST /kyc/start - Iniciando verificacao...')
            from app.models.kyc import KYCLevel
            result = await service.create_verification(
                user_id=user_id, 
                level=KYCLevel.BASIC,
                consent=True,
                ip_address='127.0.0.1',
                user_agent='test-agent'
            )
            print(f'   OK: ID={result.id}')
        else:
            print('2. POST /kyc/start - SKIP (ja existe verificacao)')
        
        print('3. GET /kyc/verification - Obtendo verificacao ativa...')
        verification = await service.get_active_verification(user_id)
        if verification:
            print(f'   OK: ID={verification.id}, status={verification.status}, level={verification.level}')
        else:
            print('   OK: Nenhuma verificacao ativa')
        
        print('\n=== TODOS OS TESTES PASSARAM! ===')
        
    except Exception as e:
        print(f'ERRO: {type(e).__name__}: {e}')
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == '__main__':
    asyncio.run(test())
