import { redirect } from 'next/navigation';
import { getCurrentUserFullDetails } from './users';

/**
 * Server-side function to require authentication
 * Redirects to login if user is not authenticated
 * 
 * @param returnTo - The URL to return to after login (should include pathname and search params)
 * @returns The authenticated user
 * @throws Redirects to login if not authenticated
 */
export async function requireAuthServer(returnTo: string) {
  const user = await getCurrentUserFullDetails();

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
 * @returns Object with user and isAuthenticated flag
 */
export async function checkAuthServer() {
  const user = await getCurrentUserFullDetails();
  return {
    user,
    isAuthenticated: !!user,
  };
}
