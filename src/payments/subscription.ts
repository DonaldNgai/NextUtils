'use server';

import Stripe from 'stripe';
import { stripe } from './stripe';
import { getCurrentUserFullDetails } from '../auth/users';
import { db } from '../db/drizzle';
import { teams, teamMembers } from '../db/schema';
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
 * Get subscription details for the current user
 */
export async function getSubscriptionDetails(): Promise<SubscriptionDetails | null> {
  const user = await getCurrentUserFullDetails();
  if (!user?.email) {
    return null;
  }

  try {
    // Get user's team
    const userTeam = await db
      .select({
        teamId: teamMembers.teamId,
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teams.id, teamMembers.teamId))
      .where(eq(teamMembers.userId, Number(user.id)))
      .limit(1);

    if (userTeam.length === 0 || !userTeam[0].teamId) {
      return null;
    }

    const team = await db
      .select()
      .from(teams)
      .where(eq(teams.id, userTeam[0].teamId))
      .limit(1);

    if (team.length === 0 || !team[0].stripeSubscriptionId) {
      return null;
    }

    const subscription = await stripe.subscriptions.retrieve(team[0].stripeSubscriptionId, {
      expand: ['items.data.price.product'],
    });

    const price = subscription.items.data[0]?.price;
    if (!price) {
      return null;
    }

    const product = typeof price.product === 'string' 
      ? await stripe.products.retrieve(price.product)
      : price.product as Stripe.Product;

    return {
      id: subscription.id,
      status: subscription.status,
      currentPeriodStart: subscription.current_period_start,
      currentPeriodEnd: subscription.current_period_end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      planName: product.name || team[0].planName || 'Unknown Plan',
      amount: price.unit_amount || 0,
      currency: price.currency || 'usd',
      interval: price.recurring?.interval || 'month',
      trialEnd: subscription.trial_end || undefined,
    };
  } catch (error) {
    console.error('Error fetching subscription details:', error);
    return null;
  }
}

/**
 * Get payment history for the current user
 */
export async function getPaymentHistory(limit: number = 20): Promise<PaymentHistoryItem[]> {
  const user = await getCurrentUserFullDetails();
  if (!user?.email) {
    return [];
  }

  try {
    // Get user's team
    const userTeam = await db
      .select({
        teamId: teamMembers.teamId,
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teams.id, teamMembers.teamId))
      .where(eq(teamMembers.userId, Number(user.id)))
      .limit(1);

    if (userTeam.length === 0 || !userTeam[0].teamId) {
      return [];
    }

    const team = await db
      .select()
      .from(teams)
      .where(eq(teams.id, userTeam[0].teamId))
      .limit(1);

    if (team.length === 0 || !team[0].stripeCustomerId) {
      return [];
    }

    // Get payment intents and invoices for the customer
    const [paymentIntents, invoices] = await Promise.all([
      stripe.paymentIntents.list({
        customer: team[0].stripeCustomerId,
        limit,
      }),
      stripe.invoices.list({
        customer: team[0].stripeCustomerId,
        limit,
      }),
    ]);

    const paymentHistory: PaymentHistoryItem[] = [];

    // Add invoices
    for (const invoice of invoices.data) {
      if (invoice.status === 'paid' && invoice.amount_paid > 0) {
        paymentHistory.push({
          id: invoice.id,
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
      if (paymentIntent.status === 'succeeded' && paymentIntent.amount > 0) {
        // Check if this payment intent is already in the history via invoice
        const alreadyIncluded = paymentHistory.some(
          item => item.id === paymentIntent.id || 
          (paymentIntent.invoice && item.id === String(paymentIntent.invoice))
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
