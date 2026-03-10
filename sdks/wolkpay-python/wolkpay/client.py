"""
WolkPay Client - Main SDK entry point
"""

import hashlib
import hmac
import json
from typing import Optional, Dict, Any
from urllib.parse import urljoin

import requests

from .exceptions import (
    WolkPayError,
    AuthenticationError,
    ValidationError,
    APIError,
    RateLimitError
)
from .resources.payments import PaymentsResource
from .resources.webhooks import WebhooksResource


class WolkPay:
    """
    WolkPay API Client
    
    Main entry point for interacting with the WolkPay Gateway API.
    
    Args:
        api_key: Your WolkPay API key (sk_live_... or sk_test_...)
        base_url: API base URL (default: https://api.wolknow.com)
        timeout: Request timeout in seconds (default: 30)
        max_retries: Maximum number of retry attempts (default: 3)
    
    Example:
        >>> from wolkpay import WolkPay
        >>> client = WolkPay(api_key="sk_live_xxx")
        >>> payment = client.payments.create(
        ...     amount=100.00,
        ...     currency="BRL",
        ...     description="Order #123"
        ... )
    """
    
    DEFAULT_BASE_URL = "https://api.wolknow.com"
    API_VERSION = "v1"
    
    def __init__(
        self,
        api_key: str,
        base_url: Optional[str] = None,
        timeout: int = 30,
        max_retries: int = 3
    ):
        if not api_key:
            raise AuthenticationError("API key is required")
        
        if not api_key.startswith(("sk_live_", "sk_test_")):
            raise AuthenticationError(
                "Invalid API key format. Must start with 'sk_live_' or 'sk_test_'"
            )
        
        self.api_key = api_key
        self.base_url = base_url or self.DEFAULT_BASE_URL
        self.timeout = timeout
        self.max_retries = max_retries
        
        # Initialize session with default headers
        self.session = requests.Session()
        self.session.headers.update({
            "X-API-Key": self.api_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": f"WolkPay-Python/1.0.0"
        })
        
        # Initialize resources
        self.payments = PaymentsResource(self)
        self.webhooks = WebhooksResource(self)
    
    @property
    def is_test_mode(self) -> bool:
        """Check if using test API key"""
        return self.api_key.startswith("sk_test_")
    
    def _get_url(self, endpoint: str) -> str:
        """Build full URL for endpoint"""
        return urljoin(self.base_url, f"/gateway/{endpoint.lstrip('/')}")
    
    def _request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Make HTTP request to WolkPay API
        
        Args:
            method: HTTP method (GET, POST, PUT, DELETE)
            endpoint: API endpoint
            data: Request body data
            params: Query parameters
            
        Returns:
            API response as dictionary
            
        Raises:
            WolkPayError: Base exception for all errors
            AuthenticationError: Invalid or missing API key
            ValidationError: Invalid request parameters
            APIError: Server-side error
            RateLimitError: Too many requests
        """
        url = self._get_url(endpoint)
        
        last_error = None
        for attempt in range(self.max_retries):
            try:
                response = self.session.request(
                    method=method,
                    url=url,
                    json=data,
                    params=params,
                    timeout=self.timeout
                )
                
                return self._handle_response(response)
                
            except requests.exceptions.Timeout:
                last_error = APIError("Request timeout", status_code=408)
            except requests.exceptions.ConnectionError:
                last_error = APIError("Connection error", status_code=503)
            except requests.exceptions.RequestException as e:
                last_error = APIError(str(e))
        
        raise last_error
    
    def _handle_response(self, response: requests.Response) -> Dict[str, Any]:
        """Handle API response and raise appropriate exceptions"""
        
        # Try to parse JSON response
        try:
            data = response.json()
        except json.JSONDecodeError:
            data = {"message": response.text}
        
        # Success responses
        if response.status_code in (200, 201):
            return data
        
        # Handle errors
        error_message = data.get("detail") or data.get("message") or "Unknown error"
        
        if response.status_code == 401:
            raise AuthenticationError(error_message)
        elif response.status_code == 403:
            raise AuthenticationError("Access forbidden - check API key permissions")
        elif response.status_code == 422:
            raise ValidationError(error_message, errors=data.get("errors"))
        elif response.status_code == 429:
            retry_after = response.headers.get("Retry-After", 60)
            raise RateLimitError(error_message, retry_after=int(retry_after))
        elif response.status_code >= 500:
            raise APIError(error_message, status_code=response.status_code)
        else:
            raise WolkPayError(error_message, status_code=response.status_code)
    
    def get(self, endpoint: str, params: Optional[Dict] = None) -> Dict[str, Any]:
        """Make GET request"""
        return self._request("GET", endpoint, params=params)
    
    def post(self, endpoint: str, data: Optional[Dict] = None) -> Dict[str, Any]:
        """Make POST request"""
        return self._request("POST", endpoint, data=data)
    
    def put(self, endpoint: str, data: Optional[Dict] = None) -> Dict[str, Any]:
        """Make PUT request"""
        return self._request("PUT", endpoint, data=data)
    
    def delete(self, endpoint: str) -> Dict[str, Any]:
        """Make DELETE request"""
        return self._request("DELETE", endpoint)
    
    @staticmethod
    def verify_webhook_signature(
        payload: bytes,
        signature: str,
        secret: str
    ) -> bool:
        """
        Verify webhook signature
        
        Args:
            payload: Raw request body bytes
            signature: X-WolkPay-Signature header value
            secret: Your webhook secret
            
        Returns:
            True if signature is valid
            
        Example:
            >>> is_valid = WolkPay.verify_webhook_signature(
            ...     payload=request.body,
            ...     signature=request.headers["X-WolkPay-Signature"],
            ...     secret="whsec_..."
            ... )
        """
        expected = hmac.new(
            secret.encode(),
            payload,
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(f"sha256={expected}", signature)
