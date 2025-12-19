import Stripe from 'stripe';
import { redirect } from 'next/navigation';
import { db } from '../db/drizzle';
import { teams, teamMembers } from '../db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUserFullDetails } from '../auth/users';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

/**
 * Create a checkout session for subscription
 */
export async function createCheckoutSession(priceId: string) {
  const user = await getCurrentUserFullDetails();
  if (!user) {
    redirect(`/pricing?priceId=${priceId}`);
  }

  // Get user's team
  const userTeam = await db
    .select({
      teamId: teamMembers.teamId,
    })
    .from(teamMembers)
    .where(eq(teamMembers.userId, Number(user.id)))
    .limit(1);

  let team = null;
  if (userTeam.length > 0) {
    const teamResult = await db
      .select()
      .from(teams)
      .where(eq(teams.id, userTeam[0].teamId))
      .limit(1);
    if (teamResult.length > 0) {
      team = teamResult[0];
    }
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${process.env.BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/stripe/checkout?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/pricing`,
    customer: team?.stripeCustomerId || undefined,
    client_reference_id: user.id?.toString() || user.email || '',
    allow_promotion_codes: true,
    subscription_data: {
      trial_period_days: 14,
    },
  });

  redirect(session.url!);
}

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

    // Get user's team
    const userTeam = await db
      .select({
        teamId: teamMembers.teamId,
      })
      .from(teamMembers)
      .where(eq(teamMembers.userId, Number(userId)))
      .limit(1);

    if (userTeam.length === 0) {
      throw new Error('User is not associated with any team.');
    }

    await db
      .update(teams)
      .set({
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        stripeProductId: productId,
        planName: (plan.product as Stripe.Product).name,
        subscriptionStatus: subscription.status,
        updatedAt: new Date(),
      })
      .where(eq(teams.id, userTeam[0].teamId));

    redirect('/dashboard');
  } catch (error) {
    console.error('Error handling successful checkout:', error);
    redirect('/error');
  }
}

/**
 * Create a customer portal session for managing subscription
 */
export async function createCustomerPortalSession() {
  const user = await getCurrentUserFullDetails();
  if (!user) {
    redirect('/pricing');
  }

  // Get user's team
  const userTeam = await db
    .select({
      teamId: teamMembers.teamId,
    })
    .from(teamMembers)
    .where(eq(teamMembers.userId, Number(user.id)))
    .limit(1);

  if (userTeam.length === 0) {
    redirect('/pricing');
  }

  const team = await db
    .select()
    .from(teams)
    .where(eq(teams.id, userTeam[0].teamId))
    .limit(1);

  if (team.length === 0 || !team[0].stripeCustomerId) {
    redirect('/pricing');
  }

  let configuration: Stripe.BillingPortal.Configuration;
  const configurations = await stripe.billingPortal.configurations.list();

  if (configurations.data.length > 0) {
    configuration = configurations.data[0];
  } else {
    if (!team[0].stripeProductId) {
      throw new Error("Team's product ID is not set");
    }

    const product = await stripe.products.retrieve(team[0].stripeProductId);
    if (!product.active) {
      throw new Error("Team's product is not active in Stripe");
    }

    const prices = await stripe.prices.list({
      product: product.id,
      active: true,
    });
    if (prices.data.length === 0) {
      throw new Error("No active prices found for the team's product");
    }

    configuration = await stripe.billingPortal.configurations.create({
      business_profile: {
        headline: 'Manage your subscription',
      },
      features: {
        subscription_update: {
          enabled: true,
          default_allowed_updates: ['price', 'quantity', 'promotion_code'],
          proration_behavior: 'create_prorations',
          products: [
            {
              product: product.id,
              prices: prices.data.map(price => price.id),
            },
          ],
        },
        subscription_cancel: {
          enabled: true,
          mode: 'at_period_end',
          cancellation_reason: {
            enabled: true,
            options: ['too_expensive', 'missing_features', 'switched_service', 'unused', 'other'],
          },
        },
        payment_method_update: {
          enabled: true,
        },
      },
    });
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: team[0].stripeCustomerId,
    return_url: `${process.env.BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard`,
    configuration: configuration.id,
  });

  redirect(portalSession.url);
}

/**
 * Handle subscription changes from Stripe webhooks
 */
export async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const subscriptionId = subscription.id;
  const status = subscription.status;

  // Find team by Stripe customer ID
  const team = await db
    .select()
    .from(teams)
    .where(eq(teams.stripeCustomerId, customerId))
    .limit(1);

  if (team.length === 0) {
    console.error('Team not found for Stripe customer:', customerId);
    return;
  }

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

    await db
      .update(teams)
      .set({
        stripeSubscriptionId: subscriptionId,
        stripeProductId: productId,
        planName: product.name || team[0].planName,
        subscriptionStatus: status,
        updatedAt: new Date(),
      })
      .where(eq(teams.id, team[0].id));
  } else if (status === 'canceled' || status === 'unpaid') {
    await db
      .update(teams)
      .set({
        stripeSubscriptionId: null,
        stripeProductId: null,
        planName: null,
        subscriptionStatus: status,
        updatedAt: new Date(),
      })
      .where(eq(teams.id, team[0].id));
  }
}


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
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(subscription);
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
