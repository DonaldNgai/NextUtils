import { getAuth0User } from './sessionUtils';
import { getAuth0ManagementClient } from './getAuth0ManagementClient';
/**
 * Standard User type returned by all user functions
 */
export interface User {
  id: string;
  user_id: string;
  email: string | null;
  name: string | null;
  app_metadata: Record<string, any> | null;
  user_metadata: Record<string, any> | null;
  teamIds?: number[];
}

/**
 * Convert Auth0 user object to standard User type
 */
function convertAuth0UserToUser(
  auth0User: any,
  fallbackUser?: { email?: string; name?: string } | null
): User {
  return {
    id: auth0User.user_id,
    user_id: auth0User.user_id,
    email: auth0User.email || fallbackUser?.email || null,
    name: auth0User.name || auth0User.nickname || fallbackUser?.name || null,
    app_metadata: auth0User.app_metadata || null,
    user_metadata: auth0User.user_metadata || null,
  };
}

/**
 * Get the current Auth0 user with full details from Management API
 */
export async function getCurrentUserFullDetails(): Promise<User | null> {
  const auth0User = await getAuth0User();
  if (!auth0User?.sub) {
    return null;
  }

  try {
    const managementClient = getAuth0ManagementClient();
    const user = await managementClient.users.get({ id: auth0User.sub });
    
    return {
      ...convertAuth0UserToUser(user, auth0User),
    };
  } catch (error) {
    console.warn('Error getting user from Auth0 Management API:', error);
    return null;
  }
}

/**
 * Get user by Auth0 user ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  console.log('getUserById Server called');
  console.log('userId:', userId);
  if (!userId) {
    return null;
  }

  try {
    const managementClient = getAuth0ManagementClient();
    const user = await managementClient.users.get({ id: userId });
    console.log('user:', user);
    return {
      ...convertAuth0UserToUser(user),
    };
  } catch (error) {
    console.warn('Error getting user by ID from Auth0 Management API:', error);
    return null;
  }
}

/**
 * Get user by email from Auth0
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  if (!email) {
    return null;
  }

  try {
    const managementClient = getAuth0ManagementClient();
    const users = await managementClient.users.getByEmail(email);
    
    if (!users || users.length === 0) {
      return null;
    }

    const user = users[0];
    
    return {
      ...convertAuth0UserToUser(user),
    };
  } catch (error) {
    console.warn('Error getting user by email from Auth0 Management API:', error);
    return null;
  }
}
