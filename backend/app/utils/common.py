from typing import Any, Optional, Dict, List
from datetime import datetime, timezone
import uuid
import hashlib
import secrets

def generate_uuid() -> str:
    """Generate a UUID4 string."""
    return str(uuid.uuid4())

def generate_secure_token(length: int = 32) -> str:
    """Generate a secure random token."""
    return secrets.token_urlsafe(length)

def hash_string(text: str, salt: str = "") -> str:
    """Hash a string with optional salt."""
    combined = f"{text}{salt}".encode("utf-8")
    return hashlib.sha256(combined).hexdigest()

def get_utc_timestamp() -> datetime:
    """Get current UTC timestamp."""
    return datetime.now(timezone.utc)

def format_timestamp(dt: datetime, format_str: str = "%Y-%m-%d %H:%M:%S UTC") -> str:
    """Format datetime to string."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.strftime(format_str)

def safe_get(data: Dict[str, Any], key: str, default: Any = None) -> Any:
    """Safely get value from dict with default."""
    return data.get(key, default) if isinstance(data, dict) else default

def clean_dict(data: Dict[str, Any], remove_none: bool = True) -> Dict[str, Any]:
    """Clean dictionary by removing None values or empty strings."""
    if not isinstance(data, dict):
        return {}
    
    cleaned = {}
    for key, value in data.items():
        if remove_none and value is None:
            continue
        if isinstance(value, str) and value.strip() == "":
            continue
        cleaned[key] = value
    
    return cleaned

def paginate_list(
    items: List[Any], 
    page: int = 1, 
    page_size: int = 20
) -> Dict[str, Any]:
    """
    Paginate a list of items.
    
    Args:
        items: List to paginate
        page: Page number (1-based)
        page_size: Items per page
        
    Returns:
        Dict with pagination info and items
    """
    if page < 1:
        page = 1
    
    total_items = len(items)
    total_pages = max(1, (total_items + page_size - 1) // page_size)
    
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    
    page_items = items[start_idx:end_idx]
    
    return {
        "items": page_items,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total_items": total_items,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1,
            "next_page": page + 1 if page < total_pages else None,
            "prev_page": page - 1 if page > 1 else None
        }
    }

def merge_dicts(*dicts: Dict[str, Any]) -> Dict[str, Any]:
    """Merge multiple dictionaries."""
    result = {}
    for d in dicts:
        if isinstance(d, dict):
            result.update(d)
    return result

def flatten_dict(
    d: Dict[str, Any], 
    parent_key: str = "", 
    sep: str = "."
) -> Dict[str, Any]:
    """
    Flatten a nested dictionary.
    
    Args:
        d: Dictionary to flatten
        parent_key: Parent key prefix
        sep: Separator for nested keys
        
    Returns:
        Flattened dictionary
    """
    items = []
    
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        
        if isinstance(v, dict):
            items.extend(flatten_dict(v, new_key, sep=sep).items())
        else:
            items.append((new_key, v))
    
    return dict(items)

def unflatten_dict(
    d: Dict[str, Any], 
    sep: str = "."
) -> Dict[str, Any]:
    """
    Unflatten a dictionary with dotted keys.
    
    Args:
        d: Dictionary to unflatten
        sep: Separator used in keys
        
    Returns:
        Unflattened nested dictionary
    """
    result = {}
    
    for key, value in d.items():
        keys = key.split(sep)
        current = result
        
        for k in keys[:-1]:
            if k not in current:
                current[k] = {}
            current = current[k]
        
        current[keys[-1]] = value
    
    return result

def validate_email(email: str) -> bool:
    """Validate email format."""
    import re
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email.strip())) if email else False

def validate_username(username: str) -> bool:
    """Validate username format."""
    import re
    if not username:
        return False
    
    username = username.strip()
    
    # Username rules: 3-30 chars, alphanumeric + underscore, no spaces
    pattern = r'^[a-zA-Z0-9_]{3,30}$'
    return bool(re.match(pattern, username))

def sanitize_string(text: str, max_length: int = 255) -> str:
    """Sanitize string input."""
    if not text:
        return ""
    
    # Remove excessive whitespace
    sanitized = " ".join(text.split())
    
    # Truncate if too long
    if len(sanitized) > max_length:
        sanitized = sanitized[:max_length].strip()
    
    return sanitized

def format_file_size(size_bytes: int) -> str:
    """Format file size in human readable format."""
    if size_bytes == 0:
        return "0 B"
    
    size_names = ["B", "KB", "MB", "GB", "TB", "PB"]
    i = 0
    
    while size_bytes >= 1024.0 and i < len(size_names) - 1:
        size_bytes /= 1024.0
        i += 1
    
    return f"{size_bytes:.1f} {size_names[i]}"

def truncate_string(text: str, max_length: int, suffix: str = "...") -> str:
    """Truncate string with suffix."""
    if not text or len(text) <= max_length:
        return text
    
    return text[:max_length - len(suffix)] + suffix

def is_valid_json_string(text: str) -> bool:
    """Check if string is valid JSON."""
    import json
    try:
        json.loads(text)
        return True
    except (ValueError, TypeError):
        return False

def safe_json_loads(text: str, default: Any = None) -> Any:
    """Safely load JSON with default fallback."""
    import json
    try:
        return json.loads(text)
    except (ValueError, TypeError):
        return default

def get_client_ip(request) -> str:
    """Get client IP from request (considering proxies)."""
    # Check for forwarded headers
    forwarded_ips = request.headers.get("X-Forwarded-For")
    if forwarded_ips:
        return forwarded_ips.split(",")[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    
    # Fallback to direct connection
    if hasattr(request, "client") and request.client:
        return request.client.host
    
    return "unknown"

def rate_limit_key(identifier: str, action: str = "api") -> str:
    """Generate rate limit key."""
    return f"rate_limit:{action}:{identifier}"

def cache_key(*parts: str) -> str:
    """Generate cache key from parts."""
    clean_parts = [str(part).strip().lower() for part in parts if part]
    return ":".join(clean_parts)

def parse_user_agent(user_agent: str) -> Dict[str, str]:
    """Parse user agent string (basic parsing)."""
    if not user_agent:
        return {"browser": "unknown", "os": "unknown", "device": "unknown"}
    
    ua = user_agent.lower()
    
    # Basic browser detection
    if "chrome" in ua:
        browser = "Chrome"
    elif "firefox" in ua:
        browser = "Firefox"
    elif "safari" in ua and "chrome" not in ua:
        browser = "Safari"
    elif "edge" in ua:
        browser = "Edge"
    else:
        browser = "Unknown"
    
    # Basic OS detection
    if "windows" in ua:
        os_name = "Windows"
    elif "mac" in ua:
        os_name = "macOS"
    elif "linux" in ua:
        os_name = "Linux"
    elif "android" in ua:
        os_name = "Android"
    elif "ios" in ua:
        os_name = "iOS"
    else:
        os_name = "Unknown"
    
    # Basic device detection
    if "mobile" in ua or "android" in ua:
        device = "Mobile"
    elif "tablet" in ua or "ipad" in ua:
        device = "Tablet"
    else:
        device = "Desktop"
    
    return {
        "browser": browser,
        "os": os_name,
        "device": device
    }
