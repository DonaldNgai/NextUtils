import { getAuth0User } from './sessionUtils';
import { getAuth0ManagementClient } from './getAuth0ManagementClient';

/**
 * Get the current Auth0 user with full details from Management API
 */
export async function getUser() {
  const auth0User = await getAuth0User();
  if (!auth0User?.sub) {
    return null;
  }

  try {
    const managementClient = getAuth0ManagementClient();
    const user = await managementClient.users.get({ id: auth0User.sub });
    
    return {
      id: user.user_id,
      user_id: user.user_id,
      email: user.email || auth0User.email || null,
      name: user.name || user.nickname || auth0User.name || null,
      app_metadata: user.app_metadata,
      user_metadata: user.user_metadata,
    } as any;
  } catch (error) {
    console.warn('Error getting user from Auth0 Management API:', error);
    return null;
  }
}

export async function getUserById(userId: string) {
  return [];
}

export async function getUserByEmail(email: string) {
  return [];
}

export async function getUserWithTeam() {
  return [];
}
