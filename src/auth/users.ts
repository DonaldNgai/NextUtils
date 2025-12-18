'use server';

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
  // Extract teamIds from app_metadata, cast to number array or default to empty array
  const teamIds = auth0User.app_metadata?.teamIds 
    ? (Array.isArray(auth0User.app_metadata.teamIds) 
        ? auth0User.app_metadata.teamIds.map((id: any) => Number(id)).filter((id: number) => !isNaN(id))
        : [])
    : [];

  return {
    id: auth0User.user_id,
    user_id: auth0User.user_id,
    email: auth0User.email || fallbackUser?.email || null,
    name: auth0User.name || auth0User.nickname || fallbackUser?.name || null,
    app_metadata: auth0User.app_metadata || null,
    user_metadata: auth0User.user_metadata || null,
    teamIds,
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
    const managementClient = await getAuth0ManagementClient();
    const response = await managementClient.users.get({ id: auth0User.sub });
    const user = response.data;
    
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
    console.log('getUserById Server try block');
    const managementClient = await getAuth0ManagementClient();

    const response = await managementClient.users.get({ id: userId });
    const user = response.data;
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
    const managementClient = await getAuth0ManagementClient();
    const response = await managementClient.users.getByEmail(email);
    
    // getByEmail returns an array directly, not a JSONApiResponse
    const users = Array.isArray(response) ? response : response.data || [];
    
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
