/**
 * WolkPay Node.js SDK
 *
 * Official SDK for WolkPay Gateway - Accept PIX and Crypto payments.
 *
 * @example
 * ```typescript
 * import WolkPay from 'wolkpay';
 *
 * const client = new WolkPay('sk_live_xxx');
 *
 * const payment = await client.payments.create({
 *   amount: 100.00,
 *   currency: 'BRL',
 *   description: 'Order #123'
 * });
 *
 * console.log(payment.checkoutUrl);
 * ```
 */

export { WolkPay, WolkPay as default } from "./client";
export * from "./types";
export * from "./errors";
export * from "./resources/payments";
export * from "./resources/webhooks";
