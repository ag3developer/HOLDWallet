<?php

declare(strict_types=1);

namespace WolkPay\Exceptions;

/**
 * API error (5xx)
 */
class ApiException extends WolkPayException
{
    public function __construct(string $message = 'API error', int $statusCode = 500)
    {
        parent::__construct($message, $statusCode, 'api_error');
    }
}
