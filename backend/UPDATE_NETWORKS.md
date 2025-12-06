# Atualização de Redes - Backend

## Redes a Adicionar

### 1. Tron (TRX)
- **Network ID**: `tron`
- **Symbol**: `TRX`
- **Padrão**: TRC-20
- **Derivation Path**: `m/44'/195'/0'/0/0`
- **Address Format**: Base58 (começa com T)

### 2. Base (Ethereum L2)
- **Network ID**: `base`
- **Symbol**: `BASE` ou `ETH`
- **Padrão**: ERC-20 compatível
- **Derivation Path**: `m/44'/60'/0'/0/0` (mesmo que Ethereum)
- **Address Format**: 0x... (EVM compatible)

## Arquivos a Modificar

### 1. `app/services/crypto_service.py`
```python
# Adicionar coin types
COIN_TYPES = {
    'bitcoin': 0,
    'ethereum': 60,
    'polygon': 60,  # Polygon usa o mesmo coin_type que Ethereum
    'bsc': 60,      # BSC usa o mesmo coin_type que Ethereum
    'tron': 195,    # Tron tem seu próprio coin_type
    'base': 60      # Base usa o mesmo coin_type que Ethereum (L2)
}
```

### 2. `app/services/wallet_service.py`
- Atualizar método `_generate_network_address()` para incluir 'tron' e 'base'
- Adicionar lógica de geração de endereço Tron (Base58)
- Base usa mesmo formato que Ethereum

### 3. `backend/populate_multi_addresses.py`
```python
networks = ["bitcoin", "ethereum", "polygon", "bsc", "tron", "base"]
```

## Implementação

### Tron Address Generation
```python
import base58

def generate_tron_address(public_key_bytes):
    # Tron usa KECCAK256 do public key + prefixo 0x41
    # Depois converte para Base58Check
    keccak_hash = sha3.keccak_256(public_key_bytes).digest()
    address_bytes = b'\x41' + keccak_hash[-20:]  # 0x41 = Tron mainnet
    checksum = hashlib.sha256(hashlib.sha256(address_bytes).digest()).digest()[:4]
    return base58.b58encode(address_bytes + checksum).decode('utf-8')
```

### Base Address Generation
```python
# Base usa o mesmo formato de endereço que Ethereum
# Apenas usar o mesmo método de geração EVM
```

## Próximos Comandos

1. Atualizar backend com as novas redes
2. Executar script de população: `python populate_multi_addresses.py`
3. Reiniciar backend
4. Testar no frontend

## Notas Importantes

- **Ethereum, Polygon, BSC e Base** compartilham o mesmo endereço (EVM compatible)
- **Bitcoin** tem endereço único
- **Tron** tem endereço único (formato diferente, Base58)
- Frontend já está preparado para mostrar todas as 6 redes
- Configurações de usuário funcionam com localStorage
