# Schemas package for HOLD Wallet API
# Import individual schemas as needed

# ============================================
# GATEWAY SCHEMAS (WolkPay Gateway)
# ============================================
from app.schemas.gateway import (
    # Enums
    PaymentMethodEnum,
    CryptoCurrencyEnum,
    CryptoNetworkEnum,
    
    # Base
    GatewayBaseSchema,
    PaginationParams,
    PaginatedResponse,
    
    # Merchant
    MerchantCreate,
    MerchantUpdate,
    MerchantResponse,
    MerchantPublicResponse,
    MerchantStatsResponse,
    
    # API Key
    ApiKeyCreate,
    ApiKeyResponse,
    ApiKeyCreatedResponse,
    ApiKeyRevokeRequest,
    
    # Payment
    PaymentCreate,
    PaymentCreatePix,
    PaymentCreateCrypto,
    PaymentResponse,
    PaymentPublicResponse,
    PaymentListResponse,
    PaymentFilterParams,
    PaymentStatusUpdate,
    
    # Webhook
    WebhookConfigUpdate,
    WebhookPayload,
    WebhookEventResponse,
    WebhookResendRequest,
    
    # Checkout
    CheckoutSessionCreate,
    CheckoutSessionResponse,
    
    # Settings
    GatewaySettingResponse,
    GatewaySettingUpdate,
    GatewayFeesResponse,
    
    # Errors
    GatewayErrorResponse,
    ValidationErrorResponse,
    ValidationErrorDetail,
    
    # Callbacks
    BBPixWebhookPayload,
    CryptoWebhookPayload,
    
    # Admin
    AdminMerchantUpdate,
    AdminMerchantApprove,
    AdminSettlementProcess,
    
    # Reports
    DailyReportResponse,
    MerchantReportResponse,
)
