import Stripe from 'stripe';
import { stripe } from '../stripe';
import { getAuth0ManagementClient } from '../../auth/getAuth0ManagementClient';
import { findUserByStripeCustomerId, ensureStripeCustomerId } from './helpers';

/**
 * Handle subscription changes from Stripe webhooks
 */
export async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const subscriptionId = subscription.id;
  const status = subscription.status;

  const managementClient = await getAuth0ManagementClient();
  
  // Find user by Stripe customer ID (uses Auth0 user ID from customer metadata)
  const user = await findUserByStripeCustomerId(customerId);

  if (!user) {
    console.log(`No user found for Stripe customer: ${customerId}`);
    return;
  }

  // Ensure stripeCustomerId is set (handles case where it doesn't exist or is different)
  await ensureStripeCustomerId(user.user_id, customerId);

  const currentAppMetadata = user.app_metadata || {};

  if (status === 'active' || status === 'trialing') {
    const price = subscription.items.data[0]?.price;
    if (!price) {
      console.error('No price found for subscription:', subscriptionId);
      return;
    }

    const productId = typeof price.product === 'string' ? price.product : price.product.id;
    const product = typeof price.product === 'string' 
      ? await stripe.products.retrieve(price.product)
      : price.product as Stripe.Product;

    // Update user's app_metadata
    await managementClient.users.update(
      { id: user.user_id },
      {
        app_metadata: {
          ...currentAppMetadata,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          stripeProductId: productId,
          planName: product.name || (currentAppMetadata.planName as string | undefined) || undefined,
          subscriptionStatus: status,
        },
      }
    );
  } else if (status === 'canceled' || status === 'unpaid') {
    // Update user's app_metadata - clear subscription info but keep customer ID
    await managementClient.users.update(
      { id: user.user_id },
      {
        app_metadata: {
          ...currentAppMetadata,
          stripeCustomerId: customerId,
          stripeSubscriptionId: null,
          stripeProductId: null,
          planName: null,
          subscriptionStatus: status,
        },
      }
    );
  }
}
