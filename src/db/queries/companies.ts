import { db } from '../drizzle';
import { customers } from '../schema';
import { eq, sql } from 'drizzle-orm';
import { desc } from 'drizzle-orm';
import { getUser } from './users';

/**
 * Get a company (customer) by ID
 */
export async function getCompanyById(companyId: number) {
  const result = await db.select().from(customers).where(eq(customers.id, companyId)).limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Get customer information by email
 */
export async function getCustomerByEmail(email: string) {
  const result = await db.select().from(customers).where(eq(customers.email, email)).limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Get customer information for the currently logged-in user
 */
export async function getCustomerForCurrentUser() {
  const user = await getUser();
  if (!user || !user.email) {
    return null;
  }

  return await getCustomerByEmail(user.email);
}

/**
 * Get all companies (customers)
 */
export async function getAllCompanies() {
  return await db.select().from(customers).orderBy(desc(customers.createdAt));
}

/**
 * Search companies by name
 */
export async function searchCompaniesByName(searchTerm: string) {
  return await db
    .select()
    .from(customers)
    .where(sql`${customers.companyName} ILIKE ${`%${searchTerm}%`}`)
    .orderBy(customers.companyName);
}
