import re
from typing import Optional, Dict, Any
from decimal import Decimal, InvalidOperation
from app.clients.btc_client import btc_client
from app.clients.evm_client import evm_client

def validate_address(address: str, network: str) -> bool:
    """
    Validate address format for a specific network.
    
    Args:
        address: Address to validate
        network: Network name (bitcoin, ethereum, polygon, bsc)
        
    Returns:
        True if valid, False otherwise
    """
    if not address or not network:
        return False
    
    network = network.lower().strip()
    address = address.strip()
    
    if network == "bitcoin":
        return btc_client.validate_address(address)
    elif network in ["ethereum", "polygon", "bsc"]:
        return evm_client.validate_address(address)
    else:
        return False

def normalize_address(address: str, network: str) -> Optional[str]:
    """
    Normalize address format for a specific network.
    
    Args:
        address: Address to normalize
        network: Network name
        
    Returns:
        Normalized address or None if invalid
    """
    if not validate_address(address, network):
        return None
    
    network = network.lower().strip()
    address = address.strip()
    
    if network == "bitcoin":
        return address  # Bitcoin addresses are case-sensitive
    elif network in ["ethereum", "polygon", "bsc"]:
        try:
            return evm_client.to_checksum_address(address)
        except Exception:
            return None
    else:
        return None

def format_balance(balance: str, decimals: int = 18, precision: int = 6) -> str:
    """
    Format balance for display.
    
    Args:
        balance: Balance as string
        decimals: Token decimals
        precision: Display precision
        
    Returns:
        Formatted balance string
    """
    try:
        if not balance or balance == "0":
            return "0"
        
        decimal_balance = Decimal(balance)
        
        # If balance is very small, show more precision
        if decimal_balance < Decimal("0.001"):
            precision = min(decimals, 8)
        elif decimal_balance < Decimal("1"):
            precision = min(decimals, 6)
        elif decimal_balance < Decimal("1000"):
            precision = 4
        else:
            precision = 2
        
        # Format with specified precision
        formatted = f"{decimal_balance:.{precision}f}"
        
        # Remove trailing zeros
        if "." in formatted:
            formatted = formatted.rstrip("0").rstrip(".")
        
        return formatted
        
    except (InvalidOperation, ValueError):
        return "0"

def format_currency(amount: float, currency: str = "USD", precision: int = 2) -> str:
    """
    Format currency amount for display.
    
    Args:
        amount: Amount to format
        currency: Currency code
        precision: Decimal precision
        
    Returns:
        Formatted currency string
    """
    try:
        if amount == 0:
            return f"0 {currency.upper()}"
        
        currency = currency.upper()
        
        # Use appropriate precision based on amount
        if amount < 0.01:
            precision = 6
        elif amount < 1:
            precision = 4
        elif amount < 1000:
            precision = 2
        else:
            precision = 0
        
        formatted = f"{amount:,.{precision}f}"
        
        # Add currency symbol/code
        if currency == "USD":
            return f"${formatted}"
        elif currency == "BRL":
            return f"R$ {formatted}"
        elif currency == "EUR":
            return f"€{formatted}"
        else:
            return f"{formatted} {currency}"
            
    except (ValueError, TypeError):
        return f"0 {currency.upper()}"

def abbreviate_hash(hash_str: str, start_chars: int = 6, end_chars: int = 4) -> str:
    """
    Abbreviate a hash for display.
    
    Args:
        hash_str: Full hash string
        start_chars: Number of characters to show at start
        end_chars: Number of characters to show at end
        
    Returns:
        Abbreviated hash (e.g., "0x1234...5678")
    """
    if not hash_str:
        return ""
    
    if len(hash_str) <= start_chars + end_chars + 3:
        return hash_str
    
    return f"{hash_str[:start_chars]}...{hash_str[-end_chars:]}"

def parse_amount(amount_str: str, decimals: int = 18) -> Optional[Decimal]:
    """
    Parse amount string to Decimal.
    
    Args:
        amount_str: Amount as string
        decimals: Token decimals for validation
        
    Returns:
        Decimal amount or None if invalid
    """
    try:
        if not amount_str:
            return None
        
        # Clean input
        amount_str = amount_str.strip().replace(",", "")
        
        # Parse to decimal
        amount = Decimal(amount_str)
        
        # Validate positive
        if amount < 0:
            return None
        
        # Check precision (don't allow more precision than token supports)
        exponent = amount.as_tuple().exponent
        if isinstance(exponent, int) and exponent < -decimals:
            return None
        
        return amount
        
    except (InvalidOperation, ValueError):
        return None

def wei_to_ether(wei_amount: int) -> Decimal:
    """
    Convert Wei to Ether.
    
    Args:
        wei_amount: Amount in Wei
        
    Returns:
        Amount in Ether
    """
    return Decimal(wei_amount) / Decimal(10**18)

def ether_to_wei(ether_amount: Decimal) -> int:
    """
    Convert Ether to Wei.
    
    Args:
        ether_amount: Amount in Ether
        
    Returns:
        Amount in Wei
    """
    return int(ether_amount * Decimal(10**18))

def satoshi_to_btc(satoshi_amount: int) -> Decimal:
    """
    Convert Satoshis to BTC.
    
    Args:
        satoshi_amount: Amount in Satoshis
        
    Returns:
        Amount in BTC
    """
    return Decimal(satoshi_amount) / Decimal(100_000_000)

def btc_to_satoshi(btc_amount: Decimal) -> int:
    """
    Convert BTC to Satoshis.
    
    Args:
        btc_amount: Amount in BTC
        
    Returns:
        Amount in Satoshis
    """
    return int(btc_amount * Decimal(100_000_000))

def is_zero_address(address: str) -> bool:
    """
    Check if address is zero address (0x000...000).
    
    Args:
        address: Address to check
        
    Returns:
        True if zero address
    """
    if not address:
        return True
    
    # Remove 0x prefix if present
    clean_address = address.lower().replace("0x", "")
    
    # Check if all zeros
    return clean_address == "0" * len(clean_address)

def get_network_info(network: str) -> Optional[Dict[str, Any]]:
    """
    Get network information.
    
    Args:
        network: Network name
        
    Returns:
        Network info dict or None if unknown
    """
    networks = {
        "bitcoin": {
            "name": "Bitcoin",
            "symbol": "BTC",
            "decimals": 8,
            "type": "utxo",
            "explorer": "https://blockstream.info"
        },
        "ethereum": {
            "name": "Ethereum",
            "symbol": "ETH", 
            "decimals": 18,
            "type": "evm",
            "chain_id": 1,
            "explorer": "https://etherscan.io"
        },
        "polygon": {
            "name": "Polygon",
            "symbol": "MATIC",
            "decimals": 18,
            "type": "evm",
            "chain_id": 137,
            "explorer": "https://polygonscan.com"
        },
        "bsc": {
            "name": "Binance Smart Chain",
            "symbol": "BNB",
            "decimals": 18,
            "type": "evm",
            "chain_id": 56,
            "explorer": "https://bscscan.com"
        }
    }
    
    return networks.get(network.lower())

def validate_transaction_amount(
    amount: str, 
    balance: str, 
    decimals: int = 18,
    min_amount: str = "0"
) -> Dict[str, Any]:
    """
    Validate transaction amount against balance and constraints.
    
    Args:
        amount: Amount to validate
        balance: Available balance
        decimals: Token decimals
        min_amount: Minimum allowed amount
        
    Returns:
        Validation result with is_valid and error message
    """
    result = {"is_valid": False, "error": None}
    
    try:
        # Parse amounts
        parsed_amount = parse_amount(amount, decimals)
        parsed_balance = parse_amount(balance, decimals) or Decimal("0")
        parsed_min = parse_amount(min_amount, decimals) or Decimal("0")
        
        if parsed_amount is None:
            result["error"] = "Invalid amount format"
            return result
        
        if parsed_amount <= 0:
            result["error"] = "Amount must be greater than zero"
            return result
        
        if parsed_amount < parsed_min:
            result["error"] = f"Amount must be at least {min_amount}"
            return result
        
        if parsed_amount > parsed_balance:
            result["error"] = "Insufficient balance"
            return result
        
        result["is_valid"] = True
        return result
        
    except Exception as e:
        result["error"] = f"Validation error: {str(e)}"
        return result
