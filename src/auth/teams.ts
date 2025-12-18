import { getAuth0User } from './sessionUtils';
import { getAuth0ManagementClient } from './getAuth0ManagementClient';

/**
 * Get team IDs array for the current user from Auth0 app_metadata
 */
export async function getTeamIdsForUser(): Promise<number[]> {
  const auth0User = await getAuth0User();
  if (!auth0User?.sub) {
    return [];
  }

  try {
    const managementClient = getAuth0ManagementClient();
    const user = await managementClient.users.get({ id: auth0User.sub });
    const teamIds = user.app_metadata?.teamIds as number[] | undefined;
    return Array.isArray(teamIds) ? teamIds : [];
  } catch (error) {
    console.warn('Error getting teamIds from Auth0:', error);
    return [];
  }
}

/**
 * Set team IDs array for the current user in app_metadata
 */
export async function setTeamIdsForUser(teamIds: number[]): Promise<boolean> {
  const auth0User = await getAuth0User();
  if (!auth0User?.sub) {
    throw new Error('User not authenticated');
  }

  try {
    const managementClient = getAuth0ManagementClient();
    const user = await managementClient.users.get({ id: auth0User.sub });
    const existingMetadata = user.app_metadata || {};
    
    await managementClient.users.update(
      { id: auth0User.sub },
      { app_metadata: { ...existingMetadata, teamIds } }
    );
    
    return true;
  } catch (error) {
    console.error('Error setting teamIds:', error);
    throw error;
  }
}

/**
 * Add a team ID to the current user's teamIds array
 */
export async function addTeamIdForUser(teamId: number): Promise<boolean> {
  const currentTeamIds = await getTeamIdsForUser();
  if (currentTeamIds.includes(teamId)) {
    return true; // Already in the array
  }
  
  const updatedTeamIds = [...currentTeamIds, teamId];
  return setTeamIdsForUser(updatedTeamIds);
}

/**
 * Remove a team ID from the current user's teamIds array
 */
export async function removeTeamIdForUser(teamId: number): Promise<boolean> {
  const currentTeamIds = await getTeamIdsForUser();
  const updatedTeamIds = currentTeamIds.filter(id => id !== teamId);
  return setTeamIdsForUser(updatedTeamIds);
}

/**
 * Get team ID for the current user from Auth0 app_metadata
 * @deprecated Use getTeamIdsForUser() instead - returns array of team IDs
 */
export async function getTeamIdForUser(): Promise<number | null> {
  const teamIds = await getTeamIdsForUser();
  return teamIds.length > 0 ? teamIds[0] : null;
}

/**
 * Check if a user is associated with a team
 */
export async function isUserAssociatedWithTeam(teamId: number): Promise<boolean> {
  const userTeamId = await getTeamIdForUser();
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

/**
 * Get team information for the current user
 * Returns the teamId from Auth0 user metadata
 * Note: Full team details (name, subscription, etc.) should be fetched from Postgres using the teamId
 * This function can optionally accept a function to fetch full team data from Postgres
 */
export async function getTeamForUser<T = { id: number }>(
  fetchTeamData?: (teamId: number) => Promise<T | null>
): Promise<T | { id: number } | null> {
  const teamId = await getTeamIdForUser();
  if (!teamId) {
    return null;
  }

  // If a function to fetch team data is provided, use it
  if (fetchTeamData) {
    return fetchTeamData(teamId);
  }

  // Otherwise, return just the teamId
  return { id: teamId } as T;
}
