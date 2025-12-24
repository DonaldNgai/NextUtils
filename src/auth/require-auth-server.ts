import { redirect } from 'next/navigation';
import { Auth0Client } from '@auth0/nextjs-auth0/server';
import { getCurrentUserFullDetails } from './users';

/**
 * Server-side function to require authentication
 * Redirects to login if user is not authenticated
 * 
 * @param returnTo - The URL to return to after login (should include pathname and search params)
 * @param auth0Client - Optional Auth0Client instance. If not provided, will create one internally.
 *                      Recommended: Pass the auth0 instance from your app's lib/auth0.ts
 * @returns The authenticated user
 * @throws Redirects to login if not authenticated
 */
export async function requireAuthServer(returnTo: string, auth0Client?: Auth0Client) {
  const user = await getCurrentUserFullDetails(auth0Client);

  if (!user) {
    // Encode the return URL and redirect to Auth0 login
    const encodedReturnTo = encodeURIComponent(returnTo);
    redirect(`/auth/login?returnTo=${encodedReturnTo}`);
  }

  return user;
}

/**
 * Server-side function to check authentication without redirecting
 * Useful for conditional rendering
 * 
 * @param auth0Client - Optional Auth0Client instance. If not provided, will create one internally.
 *                      Recommended: Pass the auth0 instance from your app's lib/auth0.ts
 * @returns Object with user and isAuthenticated flag
 */
export async function checkAuthServer(auth0Client?: Auth0Client) {
  const user = await getCurrentUserFullDetails(auth0Client);
  return {
    user,
    isAuthenticated: !!user,
  };
}
