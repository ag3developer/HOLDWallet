<?php

declare(strict_types=1);

namespace WolkPay\Exceptions;

use Exception;

/**
 * Base exception for all WolkPay errors
 */
class WolkPayException extends Exception
{
    protected int $statusCode;
    protected string $errorCode;

    public function __construct(
        string $message = 'An error occurred',
        int $statusCode = 0,
        string $errorCode = 'unknown_error'
    ) {
        parent::__construct($message);
        $this->statusCode = $statusCode;
        $this->errorCode = $errorCode;
    }

    public function getStatusCode(): int
    {
        return $this->statusCode;
    }

    public function getErrorCode(): string
    {
        return $this->errorCode;
    }
}
