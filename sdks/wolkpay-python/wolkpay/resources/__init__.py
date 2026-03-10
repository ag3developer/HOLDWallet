"""
WolkPay API Resources
"""

from .payments import PaymentsResource
from .webhooks import WebhooksResource

__all__ = ["PaymentsResource", "WebhooksResource"]
