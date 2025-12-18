import bcrypt from 'bcryptjs';

/**
 * Hash a password using bcrypt
 * @param password - The plain text password to hash
 * @returns A promise that resolves to the hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verify a password against a hash
 * @param password - The plain text password to verify
 * @param hash - The hashed password to compare against
 * @returns A promise that resolves to true if the password matches, false otherwise
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Set session for a user after successful authentication
 * Note: This function is used in the Stripe checkout flow to establish a session
 * after payment. Since Auth0 handles session management, this may need to be
 * adjusted based on your Auth0 configuration.
 * 
 * @param user - The user object from the database (with id, email, etc.)
 */
export async function setSession(user: { id: number; email: string; [key: string]: any }): Promise<void> {
  // Since Auth0 handles session management through its middleware,
  // this function may be a no-op or may need to redirect to Auth0 login
  // depending on your authentication flow.
  // 
  // If you need to create an Auth0 session for a database user, you may need to:
  // 1. Ensure the user exists in Auth0
  // 2. Use Auth0's session creation APIs
  // 3. Or redirect to Auth0 login with appropriate parameters
  
  // For now, this is a placeholder that can be implemented based on your needs
  console.log('Setting session for user:', user.email);
  
  // If you're using Auth0, you might need to:
  // - Check if user exists in Auth0
  // - Create/update Auth0 user if needed
  // - Redirect to Auth0 login or use Auth0's session APIs
  
  // Example: If you need to ensure the user is logged in via Auth0,
  // you might redirect to the Auth0 login page or use Auth0's Management API
  // to create a session token.
}
