'use server';

import { redirect } from 'next/navigation';
import { createCheckoutSession, createCustomerPortalSession } from './stripe';
import { getUser, getTeamForUser } from '../db/queries';

export async function checkoutAction(formData: FormData) {
  const priceId = formData.get('priceId') as string;
  
  if (!priceId) {
    redirect('/pricing');
  }

  const user = await getUser();
  const team = await getTeamForUser();

  await createCheckoutSession({ team, priceId });
}

export async function customerPortalAction() {
  const team = await getTeamForUser();

  if (!team) {
    redirect('/pricing');
  }

  const portalSession = await createCustomerPortalSession(team);
  redirect(portalSession.url);
}
