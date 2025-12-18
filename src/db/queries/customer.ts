import { db } from '../drizzle';
import { customers } from '../schema';
import { eq, sql, desc } from 'drizzle-orm';
import { getCurrentUserFullDetails } from '../../auth/users';

/**
 * Get customer information for the currently logged-in user by matching email
 */
export async function getCustomerForCurrentUser() {
  const user = await getCurrentUserFullDetails();
  if (!user || !user.email) {
    return null;
  }

  const result = await db.select().from(customers).where(eq(customers.email, user.email)).limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Get customer by email
 */
export async function getCustomerByEmail(email: string) {
  const result = await db.select().from(customers).where(eq(customers.email, email)).limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Get a customer by ID
 */
export async function getCustomerById(customerId: number) {
  const result = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Get all customers
 */
export async function getAllCustomers() {
  return await db.select().from(customers).orderBy(desc(customers.createdAt));
}

/**
 * Search customers by company name
 */
export async function searchCustomersByName(searchTerm: string) {
  return await db
    .select()
    .from(customers)
    .where(sql`${customers.companyName} ILIKE ${`%${searchTerm}%`}`)
    .orderBy(customers.companyName);
}
