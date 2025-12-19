import Stripe from 'stripe';
import { findUserByStripeCustomerId, ensureStripeCustomerId } from './helpers';

/**
 * Handle invoice payment events from Stripe webhooks
 */
export async function handleInvoicePayment(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
  if (!customerId) {
    console.error('No customer ID found in invoice:', invoice.id);
    return;
  }

  // Find user by Stripe customer ID (uses Auth0 user ID from customer metadata)
  const user = await findUserByStripeCustomerId(customerId);

  if (!user) {
    console.log(`No user found for Stripe customer: ${customerId}`);
    return;
  }

  // Ensure stripeCustomerId is set (handles case where it doesn't exist or is different)
  await ensureStripeCustomerId(user.user_id, customerId);

  // Log successful payment for tracking
  console.log('Invoice payment succeeded:', {
    invoiceId: invoice.id,
    amount: invoice.amount_paid,
    currency: invoice.currency,
    customerId,
    userId: user.user_id,
  });
}
