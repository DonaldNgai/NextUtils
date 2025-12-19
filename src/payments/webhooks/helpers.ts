import { getAuth0ManagementClient } from '../../auth/getAuth0ManagementClient';

/**
 * Helper function to ensure a user has a stripeCustomerId in their app_metadata
 * If it doesn't exist or is different, it will be updated
 * Also updates the Stripe customer metadata with the Auth0 user ID
 */
export async function ensureStripeCustomerId(userId: string, customerId: string) {
  const managementClient = await getAuth0ManagementClient();
  const { stripe } = await import('../stripe');
  
  try {
    const userResponse = await managementClient.users.get({ id: userId });
    const user = userResponse.data;
    const currentAppMetadata = user.app_metadata || {};
    const currentCustomerId = currentAppMetadata.stripeCustomerId as string | undefined;

    // If customer ID doesn't exist or is different, update it
    if (!currentCustomerId || currentCustomerId !== customerId) {
      await managementClient.users.update(
        { id: userId },
        {
          app_metadata: {
            ...currentAppMetadata,
            stripeCustomerId: customerId,
          },
        }
      );
      
      if (currentCustomerId && currentCustomerId !== customerId) {
        console.log(`Updated stripeCustomerId for user ${userId}: ${currentCustomerId} -> ${customerId}`);
      } else {
        console.log(`Set stripeCustomerId for user ${userId}: ${customerId}`);
      }
    }

    // Update Stripe customer metadata with Auth0 user ID
    try {
      await stripe.customers.update(customerId, {
        metadata: {
          auth0UserId: userId,
        },
      });
    } catch (error) {
      console.error(`Error updating Stripe customer ${customerId} metadata:`, error);
      // Don't throw - this is not critical if it fails
    }
  } catch (error) {
    console.error(`Error ensuring stripeCustomerId for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Helper function to find a user by Stripe customer ID
 * Retrieves the Auth0 user ID from the Stripe customer's metadata
 */
export async function findUserByStripeCustomerId(customerId: string): Promise<any | null> {
  if (!customerId) return null;
  
  const { stripe } = await import('../stripe');
  const { getAuth0ManagementClient } = await import('../../auth/getAuth0ManagementClient');
  
  try {
    // Retrieve the customer from Stripe to get the Auth0 user ID from metadata
    const customer = await stripe.customers.retrieve(customerId);
    
    if (typeof customer === 'object' && !customer.deleted) {
      const auth0UserId = customer.metadata?.auth0UserId || customer.metadata?.auth0_user_id;
      
      if (auth0UserId) {
        // Get the user from Auth0 using the stored user ID
        const managementClient = await getAuth0ManagementClient();
        const userResponse = await managementClient.users.get({ id: auth0UserId });
        return userResponse.data;
      }
    }
  } catch (error) {
    console.error(`Error retrieving customer ${customerId} or user:`, error);
  }

  return null;
}
