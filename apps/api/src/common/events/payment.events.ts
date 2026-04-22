/**
 * Payment domain events.
 *
 * These event classes decouple the PaymentsModule from downstream consumers
 * (e.g., SubscriptionsModule, BonusesModule, NotificationsModule) by using
 * EventEmitter2's pub/sub pattern instead of direct service injection.
 *
 * SETUP REQUIRED:
 *   1. Install: `npm install @nestjs/event-emitter`
 *   2. In AppModule imports: `EventEmitterModule.forRoot()`
 *   3. Emit events from PaymentsService:
 *        this.eventEmitter.emit('payment.completed', new PaymentCompletedEvent(...))
 *   4. Listen in consumers with `@OnEvent('payment.completed')`
 */

export class PaymentCompletedEvent {
  constructor(
    public readonly transactionId: string,
    public readonly userId: string,
    public readonly amount: number,
    public readonly type: string,
    public readonly metadata?: Record<string, unknown>,
  ) {}
}

export class PaymentRefundedEvent {
  constructor(
    public readonly transactionId: string,
    public readonly userId: string,
    public readonly amount: number,
  ) {}
}
