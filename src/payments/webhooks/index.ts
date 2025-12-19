import Stripe from 'stripe';
import { stripe } from '../stripe';
import { handleCustomerChange } from './customer';
import { handleCheckoutSessionCompleted } from './checkout';
import { handleInvoicePayment } from './invoice';
import { handleSubscriptionChange } from './subscription';

/**
 * Verify and handle Stripe webhook events
 */
export async function handleStripeWebhook(
  payload: string,
  signature: string,
  webhookSecret: string
): Promise<{ success: boolean; event?: Stripe.Event; error?: string }> {
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed.', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Webhook signature verification failed',
    };
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(subscription);
        break;
      
      case 'customer.created':
      case 'customer.updated':
        const customer = event.data.object as Stripe.Customer;
        await handleCustomerChange(customer);
        break;
      
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      
      case 'invoice.payment_succeeded':
      case 'invoice.paid':
      case 'invoice_payment.paid':
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePayment(invoice);
        break;
      
      case 'invoice.created':
      case 'invoice.finalized':
      case 'invoice.upcoming':
        // These are informational events, we can log them but don't need to take action
        console.log(`Invoice event: ${event.type}`, {
          invoiceId: (event.data.object as Stripe.Invoice).id,
          customerId: (event.data.object as Stripe.Invoice).customer,
        });
        break;
      
      case 'charge.succeeded':
        // Charge succeeded - informational only, invoice payment handler covers this
        const charge = event.data.object as Stripe.Charge;
        console.log(`Charge succeeded:`, {
          chargeId: charge.id,
          customerId: charge.customer,
          amount: charge.amount,
        });
        break;
      
      case 'payment_intent.succeeded':
      case 'payment_intent.created':
        // Payment intent events - informational only
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`Payment intent ${event.type}:`, {
          paymentIntentId: paymentIntent.id,
          customerId: paymentIntent.customer,
          amount: paymentIntent.amount,
        });
        break;
      
      case 'payment_method.attached':
        // Payment method attached to customer - informational only
        const paymentMethod = event.data.object as Stripe.PaymentMethod;
        console.log(`Payment method attached:`, {
          paymentMethodId: paymentMethod.id,
          customerId: paymentMethod.customer,
        });
        break;
      
      case 'setup_intent.succeeded':
        // Payment method setup succeeded - informational only
        console.log(`Setup intent succeeded:`, {
          setupIntentId: (event.data.object as Stripe.SetupIntent).id,
          customerId: (event.data.object as Stripe.SetupIntent).customer,
        });
        break;
      
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return { success: true, event };
  } catch (error) {
    console.error('Error handling webhook event:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
