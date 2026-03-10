<?php

declare(strict_types=1);

namespace WolkPay\Exceptions;

/**
 * Request validation failed
 */
class ValidationException extends WolkPayException
{
    private array $errors;

    public function __construct(string $message = 'Validation failed', array $errors = [])
    {
        parent::__construct($message, 422, 'validation_error');
        $this->errors = $errors;
    }

    public function getErrors(): array
    {
        return $this->errors;
    }
}
