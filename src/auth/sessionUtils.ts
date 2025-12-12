import { auth0 } from './getAuth0Client';

export async function requireSession() {
    const session = await auth0.getSession();

    if (!session) {
        throw new Error('No session found');
    }

    return session;
}

