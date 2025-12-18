'use server';

import { redirect } from 'next/navigation';
import { createCustomerPortalSession } from './stripe';
import { getTeamForCurrentUser } from './subscription';

export async function customerPortalAction() {
  const team = await getTeamForCurrentUser();

  if (!team?.stripeCustomerId) {
    redirect('/pricing');
  }

  const portalSession = await createCustomerPortalSession(team.stripeCustomerId);
  redirect(portalSession.url);
}
