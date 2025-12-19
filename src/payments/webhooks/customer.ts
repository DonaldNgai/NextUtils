import Stripe from 'stripe';
import { ensureStripeCustomerId } from './helpers';

/**
 * Handle customer created/updated events from Stripe webhooks
 * Updates user's app_metadata with stripeCustomerId if Auth0 user ID is in customer metadata
 */
export async function handleCustomerChange(customer: Stripe.Customer) {
  const customerId = customer.id;
  const auth0UserId = customer.metadata?.auth0UserId || customer.metadata?.auth0_user_id;

  if (!auth0UserId) {
    console.log(`No Auth0 user ID found in Stripe customer ${customerId} metadata`);
    return;
  }

  try {
    await ensureStripeCustomerId(auth0UserId, customerId);
    console.log(`Linked Stripe customer ${customerId} to user ${auth0UserId}`);
  } catch (error) {
    console.error(`Error handling customer change for ${customerId}:`, error);
  }
}
