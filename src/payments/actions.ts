'use server';

import { redirect } from 'next/navigation';
import { createCheckoutSession, createCustomerPortalSession } from './stripe';
import { getCurrentUserFullDetails } from '../auth/users';

export async function checkoutAction(formData: FormData) {
  const priceId = formData.get('priceId') as string;
  
  if (!priceId) {
    redirect('/pricing');
  }

  const user = await getCurrentUserFullDetails();

  // await createCheckoutSession({ team, priceId });
}

export async function customerPortalAction() {
  // const team = await getTeamForUser();

  // if (!team) {
  //   redirect('/pricing');
  // }

  // const portalSession = await createCustomerPortalSession(team);
  // redirect(portalSession.url);
}
