import {
  pgTable,
  bigint,
  timestamp,
  text,
  doublePrecision,
  integer,
  real,
  numeric,
  smallint,
  unique,
  foreignKey,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export const customers = pgTable('Customers', {
  id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity({
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

export const equipmentSupply = pgTable('Equipment Supply', {
  id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity({
    name: 'Equipment Supply_id_seq',
    startWith: 1,
    increment: 1,
    minValue: 1,
    maxValue: 9223372036854775807,
  }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  submissionId: text('submission_id').notNull().unique(),
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
  geocodeId: bigint('geocode_id', { mode: 'number' }),
  geocodeLon: doublePrecision('geocode_lon'),
  geocodeLat: doublePrecision('geocode_lat'),
});

export const equipmentBookings = pgTable(
  'Equipment Bookings',
  {
    id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity({
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
    supplierId: bigint('supplier_id', { mode: 'number' }).notNull(),
    location: text().notNull(),
    locationLongitude: doublePrecision('location_longitude'),
    locationLatitude: doublePrecision('location_latitude'),
    numberEquipment: integer('number_equipment').notNull(),
    customerRate: real('customer_rate').notNull(),
    hours: real(),
    supplierRate: real('supplier_rate').notNull(),
    sourcerRate: real('sourcer_rate').notNull(),
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

// Relations
export const equipmentSupplyRelations = relations(equipmentSupply, ({ many }) => ({
  bookings: many(equipmentBookings),
}));

export const equipmentBookingsRelations = relations(equipmentBookings, ({ one }) => ({
  supplier: one(equipmentSupply, {
    fields: [equipmentBookings.supplierId],
    references: [equipmentSupply.id],
  }),
  customer: one(customers, {
    fields: [equipmentBookings.customerId],
    references: [customers.id],
  }),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  bookings: many(equipmentBookings),
}));

// Types
export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export type EquipmentSupply = typeof equipmentSupply.$inferSelect;
export type NewEquipmentSupply = typeof equipmentSupply.$inferInsert;
export type EquipmentBooking = typeof equipmentBookings.$inferSelect;
export type NewEquipmentBooking = typeof equipmentBookings.$inferInsert;
