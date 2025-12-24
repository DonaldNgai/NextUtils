import { ManagementClient } from 'auth0';

/**
 * Get Auth0 Management API client using Client Credentials Flow
 * Required for app_metadata updates
 * 
 * Required env vars (for Management API Machine-to-Machine app):
 * - AUTH0_DOMAIN: Your Auth0 domain (e.g., 'your-tenant.auth0.com')
 * - AUTH0_CLIENT_ID: Management API M2M application client ID
 * - AUTH0_CLIENT_SECRET: Management API M2M application client secret
 */
export async function getAuth0ManagementClient(): Promise<ManagementClient> {

  if (!process.env.AUTH0_DOMAIN) {
    throw new Error('AUTH0_DOMAIN environment variable is required');
  }
  if (!process.env.AUTH0_CLIENT_ID) {
    throw new Error('AUTH0_CLIENT_ID environment variable is required');
  }
  if (!process.env.AUTH0_CLIENT_SECRET) {
    throw new Error('AUTH0_CLIENT_SECRET environment variable is required');
  }

  return new ManagementClient({
    domain: process.env.AUTH0_DOMAIN,
    clientId: process.env.AUTH0_CLIENT_ID,
    clientSecret: process.env.AUTH0_CLIENT_SECRET,
  });
}
