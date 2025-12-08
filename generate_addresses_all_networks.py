#!/usr/bin/env python3
"""
Script para gerar registros do mesmo endereço em todas as 15 redes
Para uma carteira multi-rede EVM-compatível
"""
import sys
import os
from datetime import datetime

# Adicionar o diretório pai ao path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.address import Address
from app.models.wallet import Wallet
from dotenv import load_dotenv
import uuid

# Carregar variáveis de ambiente
load_dotenv()

# Usar SQLite
SQLITE_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend", "holdwallet.db")
DATABASE_URL = f"sqlite:///{SQLITE_PATH}"

# Criar engine e session
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Configuração das 15 redes
NETWORKS_CONFIG = {
    "bitcoin": "1",
    "ethereum": "1",
    "polygon": "1",
    "bsc": "1",
    "base": "1",
    "tron": "1",
    "solana": "1",
    "litecoin": "1",
    "dogecoin": "1",
    "cardano": "1",
    "avalanche": "1",
    "polkadot": "1",
    "chainlink": "1",
    "shiba": "1",
    "xrp": "1"
}

def generate_addresses():
    """Gera endereços para todas as redes"""
    db = SessionLocal()
    
    try:
        # Dados da carteira e endereço
        wallet_id = "ada6ce2a-9a69-4328-860c-e918d37f23bb"
        address_str = "0xa1aaacff9902bdaaebfbba53214bdce5d6f442e6"
        
        # Verificar se wallet existe
        wallet = db.query(Wallet).filter(Wallet.id == wallet_id).first()
        if not wallet:
            print(f"❌ Carteira não encontrada: {wallet_id}")
            return False
        
        print(f"\n{'='*80}")
        print(f"🔄 GERANDO ENDEREÇOS PARA TODAS AS 15 REDES")
        print(f"{'='*80}\n")
        print(f"Carteira:  {wallet.name} ({wallet_id})")
        print(f"Endereço:  {address_str}\n")
        
        # Contar endereços já existentes
        existing_count = db.query(Address).filter(
            Address.wallet_id == wallet_id
        ).count()
        
        print(f"Endereços atuais: {existing_count}\n")
        print(f"{'Rede':<20} {'Status':<30} {'ID'}")
        print("-" * 80)
        
        created_count = 0
        
        # Criar endereço para cada rede
        for network, derivation_index in NETWORKS_CONFIG.items():
            try:
                # Verificar se já existe
                existing = db.query(Address).filter(
                    Address.wallet_id == wallet_id,
                    Address.network == network
                ).first()
                
                if existing:
                    print(f"{network:<20} {'✅ Já existe':<30} {existing.id}")
                else:
                    # Criar novo
                    new_address = Address(
                        id=str(uuid.uuid4()),
                        wallet_id=wallet_id,
                        address=address_str,
                        network=network,
                        address_type="receive",
                        derivation_index=int(derivation_index),
                        is_active=True,
                        created_at=datetime.utcnow()
                    )
                    db.add(new_address)
                    db.flush()
                    print(f"{network:<20} {'✅ Criado':<30} {new_address.id}")
                    created_count += 1
                    
            except Exception as e:
                print(f"{network:<20} {'❌ Erro':<30} {str(e)}")
        
        # Confirmar mudanças
        if created_count > 0:
            db.commit()
            print(f"\n{'='*80}")
            print(f"✅ SUCESSO!")
            print(f"{'='*80}")
            print(f"Total de endereços criados: {created_count}")
            print(f"Total de endereços agora: {existing_count + created_count}")
            print(f"\nO mesmo endereço {address_str}")
            print(f"foi registrado em TODAS as 15 redes!")
            print(f"{'='*80}\n")
            return True
        else:
            print(f"\n✅ Todos os endereços já existem!")
            total = db.query(Address).filter(
                Address.wallet_id == wallet_id
            ).count()
            print(f"Total de endereços: {total}\n")
            return True
        
    except Exception as e:
        print(f"\n❌ Erro: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = generate_addresses()
    sys.exit(0 if success else 1)
