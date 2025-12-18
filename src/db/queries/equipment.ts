import { db } from '../drizzle';
import { equipmentBookings, equipmentSupply, customers } from '../schema';
import { eq, desc } from 'drizzle-orm';
import { getCurrentUserFullDetails } from '../../auth/users';

/**
 * Get equipment bookings for a specific user (by email match)
 * Assumes the user's email is stored in equipment supply records
 */
export async function getEquipmentBookingsForUser(userEmail: string) {
  const result = await db
    .select({
      booking: equipmentBookings,
      supply: equipmentSupply,
    })
    .from(equipmentBookings)
    .innerJoin(equipmentSupply, eq(equipmentBookings.supplierId, equipmentSupply.id))
    .where(eq(equipmentSupply.email, userEmail))
    .orderBy(desc(equipmentBookings.bookingDate));

  return result;
}

/**
 * Get equipment bookings for the currently logged-in user
 */
export async function getEquipmentBookingsForCurrentUser() {
  const user = await getCurrentUserFullDetails();
  if (!user || !user.email) {
    return [];
  }

  return await getEquipmentBookingsForUser(user.email);
}

/**
 * Get all equipment bookings with supplier and customer details
 */
export async function getAllEquipmentBookings() {
  const result = await db
    .select({
      booking: equipmentBookings,
      supply: equipmentSupply,
      customer: customers,
    })
    .from(equipmentBookings)
    .leftJoin(equipmentSupply, eq(equipmentBookings.supplierId, equipmentSupply.id))
    .leftJoin(customers, eq(equipmentBookings.customerId, customers.id))
    .orderBy(desc(equipmentBookings.bookingDate));

  return result;
}

/**
 * Get equipment bookings by company/customer ID
 */
export async function getEquipmentBookingsByCompanyId(companyId: number) {
  const result = await db
    .select({
      booking: equipmentBookings,
      supply: equipmentSupply,
    })
    .from(equipmentBookings)
    .leftJoin(equipmentSupply, eq(equipmentBookings.supplierId, equipmentSupply.id))
    .where(eq(equipmentBookings.customerId, companyId))
    .orderBy(desc(equipmentBookings.bookingDate));

  return result;
}

/**
 * Get equipment supply listings
 */
export async function getEquipmentSupplyListings(filters?: { status?: string; category?: string }) {
  let query = db.select().from(equipmentSupply);

  if (filters?.status) {
    query = query.where(eq(equipmentSupply.status, filters.status)) as any;
  }

  return await query.orderBy(desc(equipmentSupply.createdAt));
}

/**
 * Get equipment supply by submission ID
 */
export async function getEquipmentSupplyBySubmissionId(submissionId: string) {
  const result = await db
    .select()
    .from(equipmentSupply)
    .where(eq(equipmentSupply.submissionId, submissionId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}
