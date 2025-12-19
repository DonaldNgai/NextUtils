import Stripe from 'stripe';
import { redirect } from 'next/navigation';
import { getCurrentUserFullDetails } from '../auth/users';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

/**
 * Helper function to find or get the Stripe customer ID for a user
 * First checks app_metadata, then searches Stripe by Auth0 user ID in metadata
 */
async function getOrFindStripeCustomerId(
  userId: string,
  appMetadata?: Record<string, any> | null
): Promise<string | undefined> {
  // First, check if user already has a stripeCustomerId in app_metadata
  const existingCustomerId = appMetadata?.stripeCustomerId as string | undefined;
  
  if (existingCustomerId) {
    // Verify the customer still exists in Stripe
    try {
      const customer = await stripe.customers.retrieve(existingCustomerId);
      if (typeof customer === 'object' && !customer.deleted) {
        return existingCustomerId;
      }
    } catch (error) {
      // Customer doesn't exist, continue to search
      console.log(`Customer ${existingCustomerId} not found in Stripe, searching for existing customer`);
    }
  }

  // Search for existing customer by Auth0 user ID in metadata
  try {
    const customers = await stripe.customers.search({
      query: `metadata["auth0UserId"]:"${userId}"`,
    });

    if (customers.data.length > 0) {
      const customerId = customers.data[0].id;
      // Update user's app_metadata with the found customer ID
      const { ensureStripeCustomerId } = await import('./webhooks/helpers');
      await ensureStripeCustomerId(userId, customerId);
      return customerId;
    }
  } catch (error) {
    console.error(`Error searching for Stripe customer by Auth0 user ID:`, error);
  }

  return undefined;
}

/**
 * Create a checkout session for subscription (redirects to Stripe hosted checkout)
 */
export async function createCheckoutSession(priceId: string) {
  const user = await getCurrentUserFullDetails();
  if (!user) {
    redirect(`/pricing?priceId=${priceId}`);
  }

  // Get or find Stripe customer ID (checks app_metadata first, then searches Stripe)
  const stripeCustomerId = await getOrFindStripeCustomerId(user.id, user.app_metadata || null);

  // Fetch the price to get trial period days
  const price = await stripe.prices.retrieve(priceId);
  const trialPeriodDays = price.recurring?.trial_period_days;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/stripe/checkout?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/pricing`,
    customer: stripeCustomerId || undefined,
    customer_email: stripeCustomerId ? undefined : (user.email || undefined), // Only set email if no customer ID exists
    client_reference_id: user.id?.toString() || user.email || '',
    allow_promotion_codes: true,
    subscription_data: trialPeriodDays
      ? {
          trial_period_days: trialPeriodDays,
        }
      : undefined,
  });

  redirect(session.url!);
}

/**
 * Create an embedded checkout session for subscription
 * Returns the client secret for use with Stripe Elements
 */
export async function createEmbeddedCheckoutSession(priceId: string) {
  const user = await getCurrentUserFullDetails();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Get or find Stripe customer ID (checks app_metadata first, then searches Stripe)
  const stripeCustomerId = await getOrFindStripeCustomerId(user.id, user.app_metadata || null);

  // Check if user already has an active or trialing subscription
  if (stripeCustomerId) {
    try {
      const subscriptions = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: 'all',
        limit: 10,
      });

      // Check for active or trialing subscriptions
      const activeSubscription = subscriptions.data.find(
        (sub) => sub.status === 'active' || sub.status === 'trialing'
      );

      if (activeSubscription) {
        throw new Error(`You already have an active subscription (${activeSubscription.status}). Please manage your existing subscription instead.`);
      }
    } catch (error) {
      // If it's our custom error, re-throw it
      if (error instanceof Error && error.message.includes('already have an active subscription')) {
        throw error;
      }
      // Otherwise, log and continue (might be a network error, etc.)
      console.warn('Error checking existing subscriptions:', error);
    }
  }

  // Fetch the price to get trial period days
  const price = await stripe.prices.retrieve(priceId);
  const trialPeriodDays = price.recurring?.trial_period_days;

  const session = await stripe.checkout.sessions.create({
    ui_mode: 'embedded',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    return_url: `${process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/checkout/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    customer: stripeCustomerId || undefined,
    customer_email: stripeCustomerId ? undefined : (user.email || undefined), // Only set email if no customer ID exists
    client_reference_id: user.id?.toString() || user.email || '',
    allow_promotion_codes: true,
    subscription_data: trialPeriodDays
      ? {
          trial_period_days: trialPeriodDays,
        }
      : undefined,
  });

  return { clientSecret: session.client_secret };
}

/**
 * Create an embedded checkout session for rental booking
 * Returns the client secret for use with Stripe Elements
 */
export async function createRentalCheckoutSession(
  amount: number,
  bookingData: {
    equipment: string;
    quantity: number;
    hours: number;
    location: string;
    bookingDate: string;
    operatorFirstName: string;
    operatorLastName?: string;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
  }
) {
  // Rental checkout doesn't require authentication - guests can book
  // We'll offer account creation on the success page
  const user = await getCurrentUserFullDetails();

  const session = await stripe.checkout.sessions.create({
    ui_mode: 'embedded',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Equipment Rental: ${bookingData.equipment}`,
            description: `${bookingData.quantity} unit(s) for ${bookingData.hours} hour(s) at ${bookingData.location}`,
          },
          unit_amount: amount, // amount in cents
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    return_url: `${process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/checkout/rental/success?session_id={CHECKOUT_SESSION_ID}`,
    metadata: {
      type: 'rental',
      equipment: bookingData.equipment,
      quantity: bookingData.quantity.toString(),
      hours: bookingData.hours.toString(),
      location: bookingData.location,
      bookingDate: bookingData.bookingDate,
      operatorFirstName: bookingData.operatorFirstName,
      operatorLastName: bookingData.operatorLastName || '',
      customerName: bookingData.customerName,
      customerEmail: bookingData.customerEmail,
      customerPhone: bookingData.customerPhone || '',
    },
    customer_email: bookingData.customerEmail,
  });

  return { clientSecret: session.client_secret };
}

// Re-export handleCheckoutSession from webhooks
export { handleCheckoutSession } from './webhooks/checkout';

/**
 * Get or create the Stripe Customer Portal configuration
 * Supports using a configuration ID from environment variable STRIPE_PORTAL_CONFIGURATION_ID
 */
async function getOrCreatePortalConfiguration(): Promise<Stripe.BillingPortal.Configuration> {
  // Check if a specific configuration ID is provided via environment variable
  const configIdFromEnv = process.env.STRIPE_PORTAL_CONFIGURATION_ID;
  if (configIdFromEnv) {
    try {
      const configuration = await stripe.billingPortal.configurations.retrieve(configIdFromEnv);
      return configuration;
    } catch (error) {
      console.warn(`Portal configuration ${configIdFromEnv} not found, falling back to default`);
    }
  }

  // List existing configurations
  const configurations = await stripe.billingPortal.configurations.list();

  if (configurations.data.length > 0) {
    // Use the first available configuration
    return configurations.data[0];
  }

  // If no configuration exists, create a default one with all features enabled
  // Note: This requires at least one product/price to exist in Stripe
  const products = await stripe.products.list({ active: true, limit: 100 });
  const allPrices: string[] = [];

  for (const product of products.data) {
    const prices = await stripe.prices.list({
      product: product.id,
      active: true,
      limit: 100,
    });
    allPrices.push(...prices.data.map(p => p.id));
  }

  const configuration = await stripe.billingPortal.configurations.create({
    business_profile: {
      headline: 'Manage your subscription',
    },
    features: {
      subscription_update: {
        enabled: true,
        default_allowed_updates: ['price', 'quantity', 'promotion_code'],
        proration_behavior: 'create_prorations',
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
      invoice_history: {
        enabled: true,
      },
      customer_update: {
        enabled: true,
        allowed_updates: ['email', 'address', 'phone', 'tax_id'],
      },
    },
  });

  return configuration;
}

/**
 * Create a customer portal session for managing subscription
 * Uses Stripe's Customer Portal to handle all subscription and payment management
 */
export async function createCustomerPortalSession() {
  const user = await getCurrentUserFullDetails();
  if (!user) {
    redirect('/pricing');
  }

  // Get customer ID from user's app_metadata
  const stripeCustomerId = user.app_metadata?.stripeCustomerId as string | undefined;
  if (!stripeCustomerId) {
    redirect('/pricing');
  }

  // Get the portal configuration
  const configuration = await getOrCreatePortalConfiguration();

  // Create a portal session
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/admin/payments`,
    configuration: configuration.id,
  });

  // Redirect to Stripe's hosted Customer Portal
  redirect(portalSession.url);
}

/**
 * Get customer portal session URL for payment method updates (returns URL without redirecting)
 * Uses Stripe's Customer Portal to handle payment method management
 */
export async function getPaymentMethodUpdateLink(): Promise<string | null> {
  const user = await getCurrentUserFullDetails();
  if (!user) {
    return null;
  }

  // Get customer ID from user's app_metadata
  const stripeCustomerId = user.app_metadata?.stripeCustomerId as string | undefined;
  if (!stripeCustomerId) {
    return null;
  }

  try {
    // Get the portal configuration
    const configuration = await getOrCreatePortalConfiguration();

    // Create a portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/admin/payments`,
      configuration: configuration.id,
    });

    return portalSession.url;
  } catch (error) {
    console.error('Error creating customer portal session:', error);
    return null;
  }
}

/**
 * Get customer portal session URL for subscription management (returns URL without redirecting)
 */
export async function getSubscriptionManagementLink(): Promise<string | null> {
  // Same as payment method update link - both use the customer portal
  return getPaymentMethodUpdateLink();
}

/**
 * Get Stripe prices for display on pricing page
 */
export async function getStripePrices() {
  const prices = await stripe.prices.list({
    expand: ['data.product'],
    active: true,
    type: 'recurring',
  });

  return prices.data.map(price => ({
    id: price.id,
    productId: typeof price.product === 'string' ? price.product : price.product.id,
    unitAmount: price.unit_amount || 0,
    currency: price.currency,
    interval: price.recurring?.interval,
    trialPeriodDays: price.recurring?.trial_period_days,
  }));
}

/**
 * Get Stripe products for display on pricing page
 */
export async function getStripeProducts() {
  const products = await stripe.products.list({
    active: true,
    expand: ['data.default_price'],
  });

  return products.data.map(product => ({
    id: product.id,
    name: product.name,
    description: product.description,
    defaultPriceId:
      typeof product.default_price === 'string' ? product.default_price : product.default_price?.id,
  }));
}

// Re-export webhook handlers from webhooks folder
export { handleStripeWebhook } from './webhooks';
