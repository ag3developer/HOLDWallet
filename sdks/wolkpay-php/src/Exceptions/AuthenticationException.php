<?php

declare(strict_types=1);

namespace WolkPay\Exceptions;

/**
 * Authentication failed
 */
class AuthenticationException extends WolkPayException
{
    public function __construct(string $message = 'Authentication failed')
    {
        parent::__construct($message, 401, 'authentication_error');
    }
}
