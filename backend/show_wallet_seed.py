#!/usr/bin/env python3
"""
Script para mostrar a seed descriptografada de uma carteira
⚠️ ATENÇÃO: Use com cuidado! Nunca compartilhe sua seed com ninguém!
"""
import sys
import os

# Adicionar o diretório pai ao path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.wallet import Wallet
from app.services.crypto_service import CryptoService
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

# Usar SQLite
SQLITE_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "holdwallet.db")
DATABASE_URL = f"sqlite:///{SQLITE_PATH}"

# Criar engine e session
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def show_wallet_seed(wallet_name: str):
    """Mostra a seed descriptografada de uma carteira"""
    db = SessionLocal()
    
    try:
        # Buscar carteira pelo nome
        wallet = db.query(Wallet).filter(Wallet.name == wallet_name).first()
        
        if not wallet:
            print(f"❌ Carteira '{wallet_name}' não encontrada!")
            print("\n📋 Carteiras disponíveis:")
            wallets = db.query(Wallet).all()
            for w in wallets:
                print(f"  - {w.name} (ID: {w.id})")
            return False
        
        print("\n" + "="*80)
        print("🔐 INFORMAÇÕES DA CARTEIRA (CONFIDENCIAL)")
        print("="*80)
        print(f"Nome: {wallet.name}")
        print(f"ID: {wallet.id}")
        print(f"Rede: {wallet.network}")
        print(f"Caminho de Derivação: {wallet.derivation_path}")
        print(f"Ativa: {wallet.is_active}")
        print(f"Criada em: {wallet.created_at}")
        
        # Descriptografar a seed
        if wallet.encrypted_seed:
            try:
                crypto_service = CryptoService()
                mnemonic = crypto_service.decrypt_seed(wallet.encrypted_seed)
                
                print("\n" + "="*80)
                print("🔑 SEED PHRASE (MNEMONIC)")
                print("="*80)
                print(f"\n{mnemonic}\n")
                print("="*80)
                print("\n⚠️  ATENÇÃO:")
                print("   • Esta é sua frase de recuperação de 12/24 palavras")
                print("   • Guarde em local SEGURO e OFFLINE")
                print("   • NUNCA compartilhe com ninguém")
                print("   • Quem tiver acesso pode roubar seus fundos")
                print("   • Anote em papel e guarde em local seguro")
                print("="*80)
                
                return True
                
            except Exception as e:
                print(f"\n❌ Erro ao descriptografar seed: {e}")
                print("⚠️  Verifique se a ENCRYPTION_KEY está correta no .env")
                return False
        else:
            print("\n❌ Esta carteira não possui seed criptografada!")
            return False
        
    except Exception as e:
        print(f"\n❌ Erro: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    print("⚠️  AVISO DE SEGURANÇA")
    print("="*80)
    print("Este script mostrará sua seed phrase (frase de recuperação).")
    print("Certifique-se de que NINGUÉM está vendo sua tela!")
    print("="*80)
    
    # Nome da carteira
    wallet_name = sys.argv[1] if len(sys.argv) > 1 else "holdwallet"
    
    input("\nPressione ENTER para continuar ou Ctrl+C para cancelar...")
    
    success = show_wallet_seed(wallet_name)
    
    if success:
        print("\n✅ Seed recuperada com sucesso!")
        print("💡 Lembre-se de apagar o histórico do terminal depois!")
    else:
        print("\n❌ Falha ao recuperar seed!")
        sys.exit(1)
