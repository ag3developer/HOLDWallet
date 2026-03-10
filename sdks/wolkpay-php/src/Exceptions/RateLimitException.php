<?php

declare(strict_types=1);

namespace WolkPay\Exceptions;

/**
 * Rate limit exceeded
 */
class RateLimitException extends WolkPayException
{
    public function __construct(string $message = 'Rate limit exceeded')
    {
        parent::__construct($message, 429, 'rate_limit_error');
    }
}
