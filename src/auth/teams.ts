import { getCurrentUserFullDetails } from './users';
import type { Auth0Client } from '@auth0/nextjs-auth0/server';
/**
 * Get team ID for the current user from Auth0 app_metadata
 */
export async function getTeamIdForCurrentUser(auth0: Auth0Client): Promise<number | null> {
  const user = await getCurrentUserFullDetails(auth0);
  if (!user) {
    return null;
  }

  // Get team ID from app_metadata
  const teamId = user.app_metadata?.teamId as number | undefined;
  return teamId || null;
}

/**
 * Check if a user is associated with a team
 */
export async function isUserAssociatedWithTeam(
  teamId: number,
  auth0: Auth0Client
): Promise<boolean> {
  const userTeamId = await getTeamIdForCurrentUser(auth0);
  return userTeamId === teamId;
}

/**
 * Get all users in a team by querying Auth0 users with matching teamId in app_metadata
 * Note: This requires searching all users, which may be slow for large user bases
 * Consider using a more efficient approach if you have many users
 */
export async function getTeamMembers(teamId: number, auth0: Auth0Client) {
  // Placeholder: You would need to implement fetching users using Auth0 Management API, passing auth0
  // For now, this returns an empty array as before.
  return [];
}