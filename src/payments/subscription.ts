'use server';

import Stripe from 'stripe';
import { stripe } from './stripe';
import { getCurrentUserFullDetails } from '../auth/users';
import { db } from '../db/drizzle';
import { teams } from '../db/schema';
import { eq } from 'drizzle-orm';

export interface SubscriptionDetails {
  id: string;
  status: string;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  planName: string;
  amount: number;
  currency: string;
  interval: string;
  trialEnd?: number;
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

/**
 * Get team for current user from database
 */
export async function getTeamForCurrentUser() {
  const user = await getCurrentUserFullDetails();
  if (!user || !user.teamIds || user.teamIds.length === 0) {
    return null;
  }

  // Get the first team ID
  const teamId = user.teamIds[0];
  
  const team = await db
    .select()
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);

  return team.length > 0 ? team[0] : null;
}

/**
 * Get subscription details from Stripe
 */
export async function getSubscriptionDetails(): Promise<SubscriptionDetails | null> {
  try {
    const team = await getTeamForCurrentUser();
    if (!team?.stripeCustomerId || !team.stripeSubscriptionId) {
      return null;
    }

    const subscription = await stripe.subscriptions.retrieve(team.stripeSubscriptionId, {
      expand: ['items.data.price.product'],
    });

    const price = subscription.items.data[0]?.price;
    const product = price?.product as Stripe.Product;

    return {
      id: subscription.id,
      status: subscription.status,
      currentPeriodStart: subscription.current_period_start,
      currentPeriodEnd: subscription.current_period_end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      planName: product?.name || team.planName || 'Unknown Plan',
      amount: price?.unit_amount || 0,
      currency: price?.currency || 'usd',
      interval: price?.recurring?.interval || 'month',
      trialEnd: subscription.trial_end || undefined,
    };
  } catch (error) {
    console.error('Error getting subscription details:', error);
    return null;
  }
}

/**
 * Get payment history from Stripe
 */
export async function getPaymentHistory(limit: number = 10): Promise<PaymentHistoryItem[]> {
  try {
    const team = await getTeamForCurrentUser();
    if (!team?.stripeCustomerId) {
      return [];
    }

    const charges = await stripe.charges.list({
      customer: team.stripeCustomerId,
      limit,
    });

    // Also get invoices for more complete payment history
    const invoices = await stripe.invoices.list({
      customer: team.stripeCustomerId,
      limit,
    });

    const paymentHistory: PaymentHistoryItem[] = [];

    // Add invoices (more detailed)
    for (const invoice of invoices.data) {
      if (invoice.status === 'paid' && invoice.amount_paid > 0) {
        paymentHistory.push({
          id: invoice.id,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          status: invoice.status,
          date: invoice.created * 1000, // Convert to milliseconds
          description: invoice.description || `Invoice for ${invoice.period_start ? new Date(invoice.period_start * 1000).toLocaleDateString() : 'subscription'}`,
          invoiceUrl: invoice.hosted_invoice_url || undefined,
        });
      }
    }

    // Sort by date (newest first)
    paymentHistory.sort((a, b) => b.date - a.date);

    return paymentHistory.slice(0, limit);
  } catch (error) {
    console.error('Error getting payment history:', error);
    return [];
  }
}
