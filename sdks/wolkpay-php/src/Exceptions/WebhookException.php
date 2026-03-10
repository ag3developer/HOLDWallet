<?php

declare(strict_types=1);

namespace WolkPay\Exceptions;

/**
 * Webhook verification error
 */
class WebhookException extends WolkPayException
{
    public function __construct(string $message = 'Webhook verification failed')
    {
        parent::__construct($message, 400, 'webhook_error');
    }
}
