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

/**
 * Update user metadata (user-editable data like name, preferences, etc.)
 * This safely merges with existing user_metadata
 */
export async function updateUserMetadata(metadata: Record<string, any>): Promise<boolean> {
  const auth0User = await getAuth0User();
  if (!auth0User?.sub) {
    throw new Error('User not authenticated');
  }

  try {
    const managementClient = await getAuth0ManagementClient();
    
    // Get existing metadata first to preserve other data
    const response = await managementClient.users.get({ id: auth0User.sub });
    const user = response.data;
    const existingMetadata = user.user_metadata || {};
    
    // Merge new metadata with existing
    await managementClient.users.update(
      { id: auth0User.sub },
      { user_metadata: { ...existingMetadata, ...metadata } }
    );
    
    return true;
  } catch (error) {
    console.error('Error updating user metadata:', error);
    throw error;
  }
}

/**
 * Upsert user metadata - updates or creates user_metadata fields
 * This is an alias for updateUserMetadata for clarity
 */
export async function upsertUserMetadata(metadata: Record<string, any>): Promise<boolean> {
  return updateUserMetadata(metadata);
}

/**
 * Update user password using Auth0 Management API
 * This is the recommended method for Auth0 with Next.js
 */
export async function updateUserPassword(newPassword: string): Promise<void> {
  const auth0User = await getAuth0User();
  if (!auth0User?.sub) {
    throw new Error('User not authenticated');
  }

  if (!newPassword || newPassword.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  try {
    // Get Management API client
    const managementClient = await getAuth0ManagementClient();

    // Get user details to find the connection name
    const userResponse = await managementClient.users.get({ id: auth0User.sub });
    const user = userResponse.data;
    
    // Get connection name from user's primary identity
    // Auth0 users have identities array, the primary one is usually at index 0
    const connection = user.identities?.[0]?.connection || 'Username-Password-Authentication';

    // Update password using Auth0 Management API
    // Auth0 Management API requires the connection name
    await managementClient.users.update(
      { id: auth0User.sub },
      { 
        password: newPassword,
        connection: connection,
      }
    );
  } catch (error) {
    console.error('Error updating password:', error);
    throw error;
  }
}
