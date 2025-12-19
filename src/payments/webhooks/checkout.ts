import Stripe from 'stripe';
import { redirect } from 'next/navigation';
import { getAuth0ManagementClient } from '../../auth/getAuth0ManagementClient';
import { ensureStripeCustomerId } from './helpers';
import { stripe } from '../stripe';

/**
 * Handle successful checkout session callback
 */
export async function handleCheckoutSession(sessionId: string) {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'subscription'],
    });

    if (!session.customer || typeof session.customer === 'string') {
      throw new Error('Invalid customer data from Stripe.');
    }

    const customerId = session.customer.id;
    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;

    if (!subscriptionId) {
      throw new Error('No subscription found for this session.');
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['items.data.price.product'],
    });

    const plan = subscription.items.data[0]?.price;

    if (!plan) {
      throw new Error('No plan found for this subscription.');
    }

    const productId = (plan.product as Stripe.Product).id;

    if (!productId) {
      throw new Error('No product ID found for this subscription.');
    }

    const userId = session.client_reference_id;
    if (!userId) {
      throw new Error("No user ID found in session's client_reference_id.");
    }

    // Ensure stripeCustomerId is set (handles case where it doesn't exist or is different)
    await ensureStripeCustomerId(userId, customerId);

    // Update Stripe customer metadata with Auth0 user ID
    await stripe.customers.update(customerId, {
      metadata: {
        auth0UserId: userId,
      },
    });

    // Update user's app_metadata with subscription info
    const managementClient = await getAuth0ManagementClient();
    const userResponse = await managementClient.users.get({ id: userId });
    const currentAppMetadata = userResponse.data.app_metadata || {};

    await managementClient.users.update(
      { id: userId },
      {
        app_metadata: {
          ...currentAppMetadata,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          stripeProductId: productId,
          planName: (plan.product as Stripe.Product).name,
          subscriptionStatus: subscription.status,
        },
      }
    );

    redirect('/dashboard');
  } catch (error) {
    console.error('Error handling successful checkout:', error);
    redirect('/error');
  }
}

/**
 * Handle checkout session completed events from Stripe webhooks
 * This ensures customer ID is set for both subscription and rental purchases
 */
export async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const customerId = typeof session.customer === 'string' 
    ? session.customer 
    : session.customer?.id;
  
  if (!customerId) {
    console.log('No customer ID in checkout session:', session.id);
    return;
  }

  const managementClient = await getAuth0ManagementClient();
  
  // Try to find user by client_reference_id first (for authenticated users)
  if (session.client_reference_id) {
    try {
      const userResponse = await managementClient.users.get({ id: session.client_reference_id });
      await ensureStripeCustomerId(session.client_reference_id, customerId);
      
      // Update Stripe customer metadata with Auth0 user ID
      await stripe.customers.update(customerId, {
        metadata: {
          auth0UserId: session.client_reference_id,
        },
      });
      
      console.log(`Set stripeCustomerId for user ${session.client_reference_id} from checkout session ${session.id}`);
      return;
    } catch (error) {
      console.log('User not found by client_reference_id:', error);
    }
  }

  // If no client_reference_id, check if customer already has Auth0 user ID in metadata
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (typeof customer === 'object' && !customer.deleted) {
      const auth0UserId = customer.metadata?.auth0UserId || customer.metadata?.auth0_user_id;
      if (auth0UserId) {
        await ensureStripeCustomerId(auth0UserId, customerId);
        console.log(`Set stripeCustomerId for user ${auth0UserId} from checkout session ${session.id} (from customer metadata)`);
        return;
      }
    }
  } catch (error) {
    console.error(`Error retrieving customer ${customerId}:`, error);
  }

  console.log(`No Auth0 user ID found for checkout session ${session.id}`);
}
