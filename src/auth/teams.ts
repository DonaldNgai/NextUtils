import { getCurrentUserFullDetails } from './users';

/**
 * Get team ID for the current user from Auth0 app_metadata
 */
export async function getTeamIdForCurrentUser(): Promise<number | null> {
  const user = await getCurrentUserFullDetails();
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
export async function isUserAssociatedWithTeam(teamId: number): Promise<boolean> {
  const userTeamId = await getTeamIdForCurrentUser();
  return userTeamId === teamId;
}

/**
 * Get all users in a team by querying Auth0 users with matching teamId in app_metadata
 * Note: This requires searching all users, which may be slow for large user bases
 * Consider using a more efficient approach if you have many users
 */
export async function getTeamMembers(teamId: number) {
  // try {
  //   const managementClient = getAuth0ManagementClient();
    
  //   // Get all users (this is a limitation - Auth0 doesn't support filtering by app_metadata)
  //   // For better performance, consider maintaining a separate index or using a different approach
  //   const users = await managementClient.users.getAll({
  //     per_page: 100,
  //     include_totals: true,
  //   });

  //   // Filter users by teamId in app_metadata
  //   const teamMembers = users.data.filter(
  //     (user) => (user.app_metadata?.teamId as number) === teamId
  //   );

  //   return teamMembers;
  // } catch (error) {
  //   console.warn('Error getting team members from Auth0:', error);
  //   return [];
  // }
  return [];
}