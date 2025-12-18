import {
  pgTable,
  foreignKey,
  unique,
  bigint,
  timestamp,
  text,
  doublePrecision,
  integer,
  real,
  numeric,
  smallint,
  serial,
  varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const equipmentBookings = pgTable(
  'Equipment Bookings',
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: 'number' })
      .primaryKey()
      .generatedByDefaultAsIdentity({
        name: 'Equipment Bookings_id_seq',
        startWith: 1,
        increment: 1,
        minValue: 1,
        maxValue: 9223372036854775807,
      }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    bookingDate: timestamp('booking_date', { withTimezone: true, mode: 'string' }).notNull(),
    customer: text().notNull(),
    supplier: text(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    supplierId: bigint('supplier_id', { mode: 'number' }).notNull(),
    location: text().notNull(),
    locationLongitude: doublePrecision('location_longitude'),
    locationLatitude: doublePrecision('location_latitude'),
    numberEquipment: integer('number_equipment').notNull(),
    customerRate: real('customer_rate').notNull(),
    hours: real(),
    supplierRate: real('supplier_rate').notNull(),
    sourcerRate: real('sourcer_rate').notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    customerId: bigint('customer_id', { mode: 'number' }),
    operatorFirstName: text('operator_first_name').notNull(),
    operatorLastName: text('operator_last_name'),
    bookingGroupId: text('booking_group_id').notNull(),
    supplierStatus: text('supplier_status').default('active').notNull(),
    cancellationReason: text('cancellation_reason'),
    customerStatus: text('customer_status').default('active').notNull(),
    equipment: text(),
    totalCustomerCharges: numeric('total_customer_charges').generatedAlwaysAs(
      sql`((COALESCE(customer_rate, (0)::real) * COALESCE(hours, (0)::real)) * (COALESCE(number_equipment, 0))::double precision)`
    ),
    sourcerTotalEarnings: numeric('sourcer_total_earnings').generatedAlwaysAs(
      sql`((COALESCE(sourcer_rate, (0)::real) * COALESCE(hours, (0)::real)) * (COALESCE(number_equipment, 0))::double precision)`
    ),
    totalSupplierEarnings: numeric('total_supplier_earnings').generatedAlwaysAs(
      sql`((COALESCE(supplier_rate, (0)::real) * COALESCE(hours, (0)::real)) * (COALESCE(number_equipment, 0))::double precision)`
    ),
  },
  table => [
    foreignKey({
      columns: [table.supplierId],
      foreignColumns: [equipmentSupply.id],
      name: 'Equipment Bookings_supplier_id_fkey',
    }),
    unique('Equipment Bookings_id_key').on(table.id),
  ]
);

export const equipmentSupply = pgTable(
  'Equipment Supply',
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: 'number' })
      .primaryKey()
      .generatedByDefaultAsIdentity({
        name: 'Equipment Supply_id_seq',
        startWith: 1,
        increment: 1,
        minValue: 1,
        maxValue: 9223372036854775807,
      }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    submissionId: text('submission_id').notNull(),
    status: text().default('Listed').notNull(),
    company: text().notNull(),
    phoneNumber: text('phone_number'),
    email: text(),
    distanceRadius: integer('distance_radius').notNull(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name'),
    location: text().notNull(),
    listingPrice: integer('listing_price').notNull(),
    minimumPrice: integer('minimum_price').notNull(),
    quantity: smallint().notNull(),
    availability: text().notNull(),
    category: text().notNull(),
    fromDatetime: timestamp('from_datetime', { withTimezone: true, mode: 'string' }),
    toDatetime: timestamp('to_datetime', { withTimezone: true, mode: 'string' }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    geocodeId: bigint('geocode_id', { mode: 'number' }),
    geocodeLon: doublePrecision('geocode_lon'),
    geocodeLat: doublePrecision('geocode_lat'),
  },
  table => [unique('Equipment Supply_submission_id_key').on(table.submissionId)]
);

export const teams = pgTable(
  'teams',
  {
    id: serial().primaryKey().notNull(),
    name: varchar({ length: 100 }).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
    stripeCustomerId: text('stripe_customer_id'),
    stripeSubscriptionId: text('stripe_subscription_id'),
    stripeProductId: text('stripe_product_id'),
    planName: varchar('plan_name', { length: 50 }),
    subscriptionStatus: varchar('subscription_status', { length: 20 }),
  },
  table => [
    unique('teams_stripe_customer_id_unique').on(table.stripeCustomerId),
    unique('teams_stripe_subscription_id_unique').on(table.stripeSubscriptionId),
  ]
);

export const invitations = pgTable(
  'invitations',
  {
    id: serial().primaryKey().notNull(),
    teamId: integer('team_id').notNull(),
    email: varchar({ length: 255 }).notNull(),
    role: varchar({ length: 50 }).notNull(),
    invitedBy: integer('invited_by').notNull(),
    invitedAt: timestamp('invited_at', { mode: 'string' }).defaultNow().notNull(),
    status: varchar({ length: 20 }).default('pending').notNull(),
  },
  table => [
    foreignKey({
      columns: [table.invitedBy],
      foreignColumns: [users.id],
      name: 'invitations_invited_by_users_id_fk',
    }),
    foreignKey({
      columns: [table.teamId],
      foreignColumns: [teams.id],
      name: 'invitations_team_id_teams_id_fk',
    }),
  ]
);

export const teamMembers = pgTable(
  'team_members',
  {
    id: serial().primaryKey().notNull(),
    userId: integer('user_id').notNull(),
    teamId: integer('team_id').notNull(),
    role: varchar({ length: 50 }).notNull(),
    joinedAt: timestamp('joined_at', { mode: 'string' }).defaultNow().notNull(),
  },
  table => [
    foreignKey({
      columns: [table.teamId],
      foreignColumns: [teams.id],
      name: 'team_members_team_id_teams_id_fk',
    }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'team_members_user_id_users_id_fk',
    }),
  ]
);

export const users = pgTable(
  'users',
  {
    id: serial().primaryKey().notNull(),
    name: varchar({ length: 100 }),
    email: varchar({ length: 255 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    role: varchar({ length: 20 }).default('member').notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { mode: 'string' }),
  },
  table => [unique('users_email_unique').on(table.email)]
);

export const activityLogs = pgTable(
  'activity_logs',
  {
    id: serial().primaryKey().notNull(),
    teamId: integer('team_id').notNull(),
    userId: integer('user_id'),
    action: text().notNull(),
    timestamp: timestamp({ mode: 'string' }).defaultNow().notNull(),
    ipAddress: varchar('ip_address', { length: 45 }),
  },
  table => [
    foreignKey({
      columns: [table.teamId],
      foreignColumns: [teams.id],
      name: 'activity_logs_team_id_teams_id_fk',
    }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'activity_logs_user_id_users_id_fk',
    }),
  ]
);

export const customers = pgTable('Customers', {
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  id: bigint({ mode: 'number' })
    .primaryKey()
    .generatedByDefaultAsIdentity({
      name: 'Customers_id_seq',
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 9223372036854775807,
    }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  companyName: text('company_name').notNull(),
  contactFirstName: text('contact_first_name').notNull(),
  contactLastName: text('contact_last_name'),
  phone: text().notNull(),
  email: text().notNull(),
});
