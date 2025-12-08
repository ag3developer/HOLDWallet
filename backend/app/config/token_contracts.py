"""
Token Contracts Configuration - Endereços e ABIs de tokens
"""

# USDT (Tether) - Endereços em diferentes blockchains
USDT_CONTRACTS = {
    'ethereum': {
        'address': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        'decimals': 6,
        'name': 'Tether USD'
    },
    'polygon': {
        'address': '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
        'decimals': 6,
        'name': 'Tether USD (PoS)'
    },
    'bsc': {
        'address': '0x55d398326f99059fF775485246999027B3197955',
        'decimals': 18,
        'name': 'Tether USD (BSC)'
    },
    'arbitrum': {
        'address': '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
        'decimals': 6,
        'name': 'Tether USD (Arbitrum)'
    },
    'optimism': {
        'address': '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
        'decimals': 6,
        'name': 'Tether USD (Optimism)'
    },
    'base': {
        'address': '0xd9aAEc860b8A647Ac0d7fc6e6e8E5AB5D29CEBda',
        'decimals': 6,
        'name': 'Tether USD (Base)'
    },
    'tron': {
        'address': 'TR7NHqjeKQxGTCi8q282JCZT1ijw8hQp2E',
        'decimals': 6,
        'name': 'Tether USD (Tron TRC-20)'
    },
    'avalanche': {
        'address': '0x9702230A8657203E2F72AE0e001Cab3f1995937b',
        'decimals': 6,
        'name': 'Tether USD (Avalanche)'
    },
    'fantom': {
        'address': '0x049d68029b510645dab0ac87207b0c2a85b9122e',
        'decimals': 6,
        'name': 'Tether USD (Fantom)'
    }
}

# USDC (USD Coin) - Endereços em diferentes blockchains
USDC_CONTRACTS = {
    'ethereum': {
        'address': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        'decimals': 6,
        'name': 'USD Coin'
    },
    'polygon': {
        'address': '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
        'decimals': 6,
        'name': 'USD Coin (PoS)'
    },
    'bsc': {
        'address': '0x8AC76a51cc950d9822D68b83FE1Ad97B32Cd580d',
        'decimals': 18,
        'name': 'USD Coin (BSC)'
    },
    'arbitrum': {
        'address': '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5F8F',
        'decimals': 6,
        'name': 'USD Coin (Arbitrum)'
    },
    'optimism': {
        'address': '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
        'decimals': 6,
        'name': 'USD Coin (Optimism)'
    },
    'base': {
        'address': '0x833589fC3F5dA236344f6d5f6644b87cfc8CC28c',
        'decimals': 6,
        'name': 'USD Coin (Base)'
    },
    'solana': {
        'address': 'EPjFWaJy47gIdKjrWw68SWwuScqokQNuSoS16RJSpFj',
        'decimals': 6,
        'name': 'USD Coin (Solana)'
    },
    'avalanche': {
        'address': '0xA7D8d9ef8D56B57FEB1A3c3d08293C1d8BD2a501',
        'decimals': 6,
        'name': 'USD Coin (Avalanche)'
    }
}

# DAI (Multi-collateral DAI) - Endereços em diferentes blockchains
DAI_CONTRACTS = {
    'ethereum': {
        'address': '0x6B175474E89094C44Da98b954EedeAC495271d0F',
        'decimals': 18,
        'name': 'Dai Stablecoin'
    },
    'polygon': {
        'address': '0x8f3Cf7ad23Cd3CaDbD9735AFF958023D60d76ee6',
        'decimals': 18,
        'name': 'Dai Stablecoin (PoS)'
    },
    'bsc': {
        'address': '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3',
        'decimals': 18,
        'name': 'Dai Stablecoin (BSC)'
    }
}

# ERC-20 ABI - Interface padrão para tokens ERC-20
ERC20_ABI = [
    {
        "constant": True,
        "inputs": [],
        "name": "name",
        "outputs": [{"name": "", "type": "string"}],
        "type": "function"
    },
    {
        "constant": True,
        "inputs": [],
        "name": "decimals",
        "outputs": [{"name": "", "type": "uint8"}],
        "type": "function"
    },
    {
        "constant": True,
        "inputs": [{"name": "_owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "balance", "type": "uint256"}],
        "type": "function"
    },
    {
        "constant": False,
        "inputs": [
            {"name": "_to", "type": "address"},
            {"name": "_value", "type": "uint256"}
        ],
        "name": "transfer",
        "outputs": [{"name": "", "type": "bool"}],
        "type": "function"
    },
    {
        "constant": False,
        "inputs": [
            {"name": "_spender", "type": "address"},
            {"name": "_value", "type": "uint256"}
        ],
        "name": "approve",
        "outputs": [{"name": "", "type": "bool"}],
        "type": "function"
    },
    {
        "constant": True,
        "inputs": [
            {"name": "_owner", "type": "address"},
            {"name": "_spender", "type": "address"}
        ],
        "name": "allowance",
        "outputs": [{"name": "", "type": "uint256"}],
        "type": "function"
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "name": "from", "type": "address"},
            {"indexed": True, "name": "to", "type": "address"},
            {"indexed": False, "name": "value", "type": "uint256"}
        ],
        "name": "Transfer",
        "type": "event"
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "name": "owner", "type": "address"},
            {"indexed": True, "name": "spender", "type": "address"},
            {"indexed": False, "name": "value", "type": "uint256"}
        ],
        "name": "Approval",
        "type": "event"
    }
]

# TRON TRC-20 ABI (similar ao ERC-20 mas com suporte a TRON)
TRON_TRC20_ABI = [
    {
        "constant": True,
        "inputs": [],
        "name": "name",
        "outputs": [{"name": "", "type": "string"}],
        "type": "function"
    },
    {
        "constant": True,
        "inputs": [],
        "name": "decimals",
        "outputs": [{"name": "", "type": "uint8"}],
        "type": "function"
    },
    {
        "constant": True,
        "inputs": [{"name": "who", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "", "type": "uint256"}],
        "type": "function"
    },
    {
        "constant": False,
        "inputs": [
            {"name": "to", "type": "address"},
            {"name": "amount", "type": "uint256"}
        ],
        "name": "transfer",
        "outputs": [{"name": "", "type": "bool"}],
        "type": "function"
    }
]

# Mapeamento de token symbol para contratos
TOKEN_CONTRACTS = {
    'USDT': USDT_CONTRACTS,
    'USDC': USDC_CONTRACTS,
    'DAI': DAI_CONTRACTS
}

# Mapeamento de redes para ABI
NETWORK_ABI_MAP = {
    'ethereum': ERC20_ABI,
    'polygon': ERC20_ABI,
    'bsc': ERC20_ABI,
    'arbitrum': ERC20_ABI,
    'optimism': ERC20_ABI,
    'base': ERC20_ABI,
    'avalanche': ERC20_ABI,
    'fantom': ERC20_ABI,
    'tron': TRON_TRC20_ABI
}

def get_token_contract(token_symbol: str, network: str) -> dict:
    """
    Obtém informações do contrato para um token em uma rede específica
    
    Args:
        token_symbol: 'USDT', 'USDC', 'DAI', etc
        network: 'ethereum', 'polygon', 'bsc', etc
        
    Returns:
        dict com address, decimals, name
        
    Raises:
        ValueError: Se token ou rede não suportados
    """
    if token_symbol not in TOKEN_CONTRACTS:
        raise ValueError(f"Token não suportado: {token_symbol}")
    
    contracts = TOKEN_CONTRACTS[token_symbol]
    
    if network not in contracts:
        raise ValueError(f"Token {token_symbol} não disponível em {network}")
    
    return contracts[network]

def get_token_decimals(token_symbol: str, network: str) -> int:
    """
    Obtém o número de decimals para um token em uma rede
    
    Args:
        token_symbol: 'USDT', 'USDC', etc
        network: 'ethereum', 'polygon', etc
        
    Returns:
        int: número de decimals (ex: 6 para USDT, 18 para padrão ERC-20)
    """
    contract = get_token_contract(token_symbol, network)
    return contract['decimals']

def get_token_address(token_symbol: str, network: str) -> str:
    """
    Obtém o endereço do contrato para um token em uma rede
    
    Args:
        token_symbol: 'USDT', 'USDC', etc
        network: 'ethereum', 'polygon', etc
        
    Returns:
        str: Endereço do contrato (0x...)
    """
    contract = get_token_contract(token_symbol, network)
    return contract['address']

def get_abi_for_network(network: str) -> list:
    """
    Obtém o ABI apropriado para uma rede
    
    Args:
        network: 'ethereum', 'polygon', 'tron', etc
        
    Returns:
        list: ABI JSON
    """
    if network not in NETWORK_ABI_MAP:
        # Usar ABI padrão para redes desconhecidas
        return ERC20_ABI
    
    return NETWORK_ABI_MAP[network]

def is_stablecoin(token_symbol: str) -> bool:
    """
    Verifica se um token é uma stablecoin
    
    Args:
        token_symbol: 'USDT', 'USDC', etc
        
    Returns:
        bool: True se é stablecoin
    """
    stablecoins = ['USDT', 'USDC', 'DAI', 'BUSD', 'USDD']
    return token_symbol in stablecoins

def get_supported_tokens() -> list:
    """
    Retorna lista de tokens suportados
    
    Returns:
        list: ['USDT', 'USDC', 'DAI']
    """
    return list(TOKEN_CONTRACTS.keys())

def get_supported_networks_for_token(token_symbol: str) -> list:
    """
    Retorna lista de redes onde um token está disponível
    
    Args:
        token_symbol: 'USDT', 'USDC', etc
        
    Returns:
        list: ['ethereum', 'polygon', 'bsc', ...]
    """
    if token_symbol not in TOKEN_CONTRACTS:
        return []
    
    return list(TOKEN_CONTRACTS[token_symbol].keys())
