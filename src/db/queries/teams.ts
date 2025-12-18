import { db } from '../drizzle';
import { teams, teamMembers } from '../schema';
import { eq } from 'drizzle-orm';
import { getTeamIdForUser } from '../../auth/teams';

export async function getTeamByStripeCustomerId(customerId: string) {
  const result = await db
    .select()
    .from(teams)
    .where(eq(teams.stripeCustomerId, customerId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function updateTeamSubscription(
  teamId: number,
  subscriptionData: {
    stripeSubscriptionId: string | null;
    stripeProductId: string | null;
    planName: string | null;
    subscriptionStatus: string;
  }
) {
  await db
    .update(teams)
    .set({
      ...subscriptionData,
      updatedAt: new Date(),
    })
    .where(eq(teams.id, teamId));
}

export async function getTeamForUser() {
  // Get teamId from Auth0 user metadata
  const teamId = await getTeamIdForUser();
  if (!teamId) {
    return null;
  }

  // Fetch full team data from Postgres using the teamId from Auth0
  const result = await db.query.teams.findFirst({
    where: eq(teams.id, teamId),
    with: {
      teamMembers: {
        with: {
          user: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  return result || null;
}
