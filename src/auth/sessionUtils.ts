import { auth0 } from './getAuth0Client';

export async function requireSession(auth0Client: { getSession: () => Promise<any> } = auth0) {
    const session = await auth0Client.getSession();

    if (!session) {
        throw new Error('No session found');
    }

    return session;
}

/**
 * Get the current Auth0 user from session
 * Returns the Auth0 user object or null if not authenticated
 */
export async function getAuth0User() {
    try {
        const session = await auth0.getSession();
        return session?.user || null;
    } catch (error) {
        console.warn('Error getting Auth0 user:', error);
        return null;
    }
}

/**
 * Get the current Auth0 user email from session
 * Returns the email string or null if not authenticated
 */
export async function getAuth0UserEmail(): Promise<string | null> {
    const user = await getAuth0User();
    return user?.email || null;
}

