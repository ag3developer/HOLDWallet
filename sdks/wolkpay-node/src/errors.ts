/**
 * WolkPay Error Classes
 */

export class WolkPayError extends Error {
  public readonly statusCode?: number;
  public readonly code?: string;

  constructor(message: string, statusCode?: number, code?: string) {
    super(message);
    this.name = "WolkPayError";
    this.statusCode = statusCode;
    this.code = code;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, WolkPayError);
    }
  }
}

export class AuthenticationError extends WolkPayError {
  constructor(message = "Authentication failed") {
    super(message, 401, "authentication_error");
    this.name = "AuthenticationError";
  }
}

export interface ValidationFieldError {
  field: string;
  message: string;
  code?: string;
}

export class ValidationError extends WolkPayError {
  public readonly errors: ValidationFieldError[];

  constructor(
    message = "Validation failed",
    errors: ValidationFieldError[] = [],
  ) {
    super(message, 422, "validation_error");
    this.name = "ValidationError";
    this.errors = errors;
  }
}

export class RateLimitError extends WolkPayError {
  public readonly retryAfter: number;

  constructor(message = "Rate limit exceeded", retryAfter = 60) {
    super(message, 429, "rate_limit_error");
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

export class APIError extends WolkPayError {
  constructor(message = "API error", statusCode = 500) {
    super(message, statusCode, "api_error");
    this.name = "APIError";
  }
}

export class WebhookError extends WolkPayError {
  constructor(message = "Webhook verification failed") {
    super(message, 400, "webhook_error");
    this.name = "WebhookError";
  }
}
