import Stripe from 'stripe';
import { stripe, getPaymentMethodUpdateLink, getSubscriptionManagementLink } from './stripe';
import { getCurrentUserFullDetails } from '../auth/users';
import type { Auth0Client } from '@auth0/nextjs-auth0/server';

/**
 * All interfaces preserved as before.
 */
export interface SubscriptionDetails {
  id: string;
  status: string;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  nextPaymentDate: number;
  cancelAtPeriodEnd: boolean;
  planName: string;
  amount: number;
  currency: string;
  interval: string;
  trialEnd?: number;
  paymentMethodUpdateLink?: string | null;
  subscriptionManagementLink?: string | null;
}

export interface PaymentHistoryItem {
  id: string;
  amount: number;
  currency: string;
  status: string;
  date: number;
  description: string;
  invoiceUrl?: string;
}

export interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  isDefault: boolean;
}

export interface UpcomingPayment {
  id: string;
  amount: number;
  currency: string;
  dueDate: number;
  description: string;
  status: string;
  invoiceUrl?: string;
}

/**
 * Get subscription details for the current user
 */
export async function getSubscriptionDetails(auth0: Auth0Client): Promise<SubscriptionDetails | null> {
  const user = await getCurrentUserFullDetails(auth0);
  if (!user?.email) {
    return null;
  }

  // Get customer ID from user's app_metadata
  const stripeCustomerId = user.app_metadata?.stripeCustomerId as string | undefined;
  if (!stripeCustomerId) {
    return null;
  }

  try {
    // First try to get subscription from app_metadata
    const stripeSubscriptionId = user.app_metadata?.stripeSubscriptionId as string | undefined;
    
    let subscription: Stripe.Subscription | null = null;
    
    if (stripeSubscriptionId) {
      try {
        subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId, {
          expand: ['items.data.price.product'],
        });
        // Verify it's still active and belongs to this customer
        if (subscription.customer !== stripeCustomerId || 
            (subscription.status !== 'active' && subscription.status !== 'trialing')) {
          subscription = null; // Subscription ID is stale, search by customer
        }
      } catch (error) {
        // Subscription ID might be invalid, search by customer
        console.log('Subscription ID from metadata not found, searching by customer ID');
        subscription = null;
      }
    }

    // If no subscription found from metadata, search by customer ID
    if (!subscription) {
      const subscriptions = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: 'all',
        limit: 10,
      });

      // Find the most recent active or trialing subscription
      subscription = subscriptions.data.find(
        (sub) => sub.status === 'active' || sub.status === 'trialing'
      ) || null;

      // If no active subscription, get the most recent one
      if (!subscription && subscriptions.data.length > 0) {
        subscription = subscriptions.data[0];
      }
    }

    if (!subscription) {
      // No subscription found, return free tier
      return {
        id: 'free',
        status: 'free',
        currentPeriodStart: Date.now(),
        currentPeriodEnd: Date.now(),
        nextPaymentDate: Date.now(),
        cancelAtPeriodEnd: false,
        planName: 'Free',
        amount: 0,
        currency: 'usd',
        interval: 'month',
        paymentMethodUpdateLink: null,
        subscriptionManagementLink: null,
      };
    }

    // Check if subscription is cancelled
    const subStatus = subscription.status as string;
    if (subStatus === 'canceled' || subStatus === 'cancelled') {
      // Subscription is cancelled, return free tier
      return {
        id: 'free',
        status: 'free',
        currentPeriodStart: Date.now(),
        currentPeriodEnd: Date.now(),
        nextPaymentDate: Date.now(),
        cancelAtPeriodEnd: false,
        planName: 'Free',
        amount: 0,
        currency: 'usd',
        interval: 'month',
        paymentMethodUpdateLink: null,
        subscriptionManagementLink: null,
      };
    }

    // Retrieve subscription with expanded product data if not already expanded
    if (!subscription.items.data[0]?.price?.product || typeof subscription.items.data[0]?.price?.product === 'string') {
      subscription = await stripe.subscriptions.retrieve(subscription.id, {
        expand: ['items.data.price.product'],
      });
    }

    const price = subscription.items.data[0]?.price;
    if (!price) {
      return null;
    }

    const product = typeof price.product === 'string' 
      ? await stripe.products.retrieve(price.product)
      : price.product as Stripe.Product;

    // Access subscription period properties safely
    const sub = subscription as any; // Type assertion for subscription properties
    const currentPeriodStart = sub.current_period_start 
      ? sub.current_period_start * 1000 
      : Date.now();
    const currentPeriodEnd = sub.current_period_end 
      ? sub.current_period_end * 1000 
      : Date.now();
    
    // Get the next payment date directly from the subscription
    // The next payment is calculated as: current_period_end + recurring interval
    const interval = price.recurring?.interval || 'month';
    const intervalCount = price.recurring?.interval_count || 1;
    
    // Calculate next payment date by adding the interval to current period end
    const nextDate = new Date(currentPeriodEnd);
    if (interval === 'month') {
      nextDate.setMonth(nextDate.getMonth() + intervalCount);
    } else if (interval === 'year') {
      nextDate.setFullYear(nextDate.getFullYear() + intervalCount);
    } else if (interval === 'day') {
      nextDate.setDate(nextDate.getDate() + intervalCount);
    } else if (interval === 'week') {
      nextDate.setDate(nextDate.getDate() + (intervalCount * 7));
    }
    const nextPaymentDate = nextDate.getTime();
    
    // Get payment method update and subscription management links
    const [paymentMethodUpdateLink, subscriptionManagementLink] = await Promise.all([
      getPaymentMethodUpdateLink(auth0),
      getSubscriptionManagementLink(auth0),
    ]);
    
    return {
      id: subscription.id,
      status: subscription.status,
      currentPeriodStart: currentPeriodStart,
      currentPeriodEnd: currentPeriodEnd,
      nextPaymentDate: nextPaymentDate, // Next payment date from actual Stripe subscription
      cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
      planName: product.name || (user.app_metadata?.planName as string | undefined) || 'Unknown Plan',
      amount: price.unit_amount || 0,
      currency: price.currency || 'usd',
      interval: price.recurring?.interval || 'month',
      trialEnd: subscription.trial_end ? subscription.trial_end * 1000 : undefined,
      paymentMethodUpdateLink,
      subscriptionManagementLink,
    };
  } catch (error) {
    console.error('Error fetching subscription details:', error);
    return null;
  }
}

/**
 * Get payment history for the current user
 */
export async function getPaymentHistory(limit: number = 20, auth0: Auth0Client): Promise<PaymentHistoryItem[]> {
  const user = await getCurrentUserFullDetails(auth0);
  if (!user?.email) {
    return [];
  }

  // Get customer ID from user's app_metadata
  const stripeCustomerId = user.app_metadata?.stripeCustomerId as string | undefined;
  if (!stripeCustomerId) {
    return [];
  }

  try {
    // Get payment intents and invoices for the customer
    const [paymentIntents, invoices] = await Promise.all([
      stripe.paymentIntents.list({
        customer: stripeCustomerId,
        limit,
      }),
      stripe.invoices.list({
        customer: stripeCustomerId,
        limit,
      }),
    ]);

    const paymentHistory: PaymentHistoryItem[] = [];

    // Add invoices
    for (const invoice of invoices.data) {
      if (invoice.status === 'paid' && invoice.amount_paid > 0 && invoice.id) {
        paymentHistory.push({
          id: invoice.id as string,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          status: invoice.status,
          date: invoice.created * 1000, // Convert to milliseconds
          description: invoice.description || `Invoice ${invoice.number || invoice.id}`,
          invoiceUrl: invoice.hosted_invoice_url || undefined,
        });
      }
    }

    // Add payment intents that aren't already covered by invoices
    for (const paymentIntent of paymentIntents.data) {
      if (paymentIntent.status === 'succeeded' && paymentIntent.amount > 0 && paymentIntent.id) {
        // Check if this payment intent is already in the history
        // (PaymentIntents used for subscriptions are typically covered by invoices)
        const alreadyIncluded = paymentHistory.some(
          item => item.id === paymentIntent.id
        );

        if (!alreadyIncluded) {
          paymentHistory.push({
            id: paymentIntent.id,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            status: paymentIntent.status,
            date: paymentIntent.created * 1000, // Convert to milliseconds
            description: paymentIntent.description || 'Payment',
          });
        }
      }
    }

    // Sort by date, most recent first
    paymentHistory.sort((a, b) => b.date - a.date);

    return paymentHistory.slice(0, limit);
  } catch (error) {
    console.error('Error fetching payment history:', error);
    return [];
  }
}

/**
 * Get saved payment methods (cards) for the current user
 */
export async function getPaymentMethods(auth0: Auth0Client): Promise<PaymentMethod[]> {
  const user = await getCurrentUserFullDetails(auth0);
  if (!user?.email) {
    return [];
  }

  // Get customer ID from user's app_metadata
  const stripeCustomerId = user.app_metadata?.stripeCustomerId as string | undefined;
  if (!stripeCustomerId) {
    return [];
  }

  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: stripeCustomerId,
      type: 'card',
    });

    // Get default payment method from customer
    const customer = await stripe.customers.retrieve(stripeCustomerId);
    const defaultPaymentMethodId = typeof customer === 'object' && !customer.deleted
      ? customer.invoice_settings?.default_payment_method
      : null;

    return paymentMethods.data.map((pm) => ({
      id: pm.id,
      type: pm.type,
      card: pm.card
        ? {
            brand: pm.card.brand,
            last4: pm.card.last4,
            expMonth: pm.card.exp_month,
            expYear: pm.card.exp_year,
          }
        : undefined,
      isDefault: pm.id === defaultPaymentMethodId || (typeof defaultPaymentMethodId === 'string' && pm.id === defaultPaymentMethodId),
    }));
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return [];
  }
}

/**
 * Get upcoming payments/invoices for the current user
 */
export async function getUpcomingPayments(auth0: Auth0Client): Promise<UpcomingPayment[]> {
  const user = await getCurrentUserFullDetails(auth0);
  if (!user?.email) {
    return [];
  }

  // Get customer ID from user's app_metadata
  const stripeCustomerId = user.app_metadata?.stripeCustomerId as string | undefined;
  if (!stripeCustomerId) {
    return [];
  }

  try {
    // Get upcoming invoices
    const invoices = await stripe.invoices.list({
      customer: stripeCustomerId,
      status: 'open',
      limit: 10,
    });

    const upcomingPayments: UpcomingPayment[] = invoices.data
      .filter((invoice): invoice is Stripe.Invoice & { id: string } => 
        invoice.id !== null && invoice.id !== undefined && typeof invoice.id === 'string'
      )
      .map((invoice) => ({
        id: invoice.id,
        amount: invoice.amount_due,
        currency: invoice.currency,
        dueDate: invoice.due_date ? invoice.due_date * 1000 : invoice.created * 1000,
        description: invoice.description || `Invoice ${invoice.number || invoice.id}`,
        status: invoice.status || 'open',
        invoiceUrl: invoice.hosted_invoice_url || undefined,
      }));

    // Sort by due date
    upcomingPayments.sort((a, b) => a.dueDate - b.dueDate);

    return upcomingPayments;
  } catch (error) {
    console.error('Error fetching upcoming payments:', error);
    return [];
  }
}
