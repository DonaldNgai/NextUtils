import { db } from '../drizzle';
import { activityLogs, users } from '../schema';
import { eq, desc } from 'drizzle-orm';
import { getCurrentUserFullDetails } from '../../auth/users';

export async function getActivityLogs() {
  const user = await getCurrentUserFullDetails();
  if (!user) {
    throw new Error('User not authenticated');
  }

  return await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      timestamp: activityLogs.timestamp,
      ipAddress: activityLogs.ipAddress,
      userName: users.name,
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.userId, users.id))
    .where(eq(activityLogs.userId, user.id))
    .orderBy(desc(activityLogs.timestamp))
    .limit(10);
}
