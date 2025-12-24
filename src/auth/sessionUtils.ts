import { Auth0Client } from '@auth0/nextjs-auth0/server';
import { getAuth0Client } from './getAuth0Client';

export async function requireSession(
    auth0Client?: { getSession: () => Promise<any> }
) {
    const client = auth0Client || (await getAuth0Client());
    const session = await client.getSession();

    if (!session) {
        throw new Error('No session found');
    }

    return session;
}

/**
 * Get the current Auth0 user from session
 * Returns the Auth0 user object or null if not authenticated
 * 
 * @param auth0Client - Optional Auth0Client instance. If not provided, will create one internally.
 *                      Recommended: Pass the auth0 instance from your app's lib/auth0.ts
 */
export async function getAuth0User(auth0Client?: Auth0Client) {
    try {
        const client = auth0Client || (await getAuth0Client());
        const session = await client.getSession();
        return session?.user || null;
    } catch (error) {
        console.warn('Error getting Auth0 user:', error);
        return null;
    }
}

/**
 * Get the current Auth0 user email from session
 * Returns the email string or null if not authenticated
 * 
 * @param auth0Client - Optional Auth0Client instance. If not provided, will create one internally.
 *                      Recommended: Pass the auth0 instance from your app's lib/auth0.ts
 */
export async function getAuth0UserEmail(auth0Client?: Auth0Client): Promise<string | null> {
    const user = await getAuth0User(auth0Client);
    return user?.email || null;
}

