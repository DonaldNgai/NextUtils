import { Auth0Client } from "@auth0/nextjs-auth0/server";

type TokenResult = { token: string; expiresAt: number; scope?: string };

export async function getAuthenticatedAccessToken(
    auth0: Auth0Client,
): Promise<{ isValid: boolean; token: TokenResult | null }> {
    try {
        // In Auth0 SDK v4, audience is configured at Auth0Client initialization, not here
        const tokenResult = await auth0.getAccessToken();

        if (!tokenResult || !tokenResult.token || !tokenResult.expiresAt) {
            return {
                isValid: false,
                token: null,
            };
        }

        return {
            isValid: true,
            token: tokenResult
        };
    } catch (err) {
        return {
            isValid: false,
            token: null,
        };
    }
}

