import { relations } from "drizzle-orm/relations";
import { equipmentSupply, equipmentBookings, users, invitations, teams, teamMembers, activityLogs } from "./schema";

export const equipmentBookingsRelations = relations(equipmentBookings, ({one}) => ({
	equipmentSupply: one(equipmentSupply, {
		fields: [equipmentBookings.supplierId],
		references: [equipmentSupply.id]
	}),
}));

export const equipmentSupplyRelations = relations(equipmentSupply, ({many}) => ({
	equipmentBookings: many(equipmentBookings),
}));

export const invitationsRelations = relations(invitations, ({one}) => ({
	user: one(users, {
		fields: [invitations.invitedBy],
		references: [users.id]
	}),
	team: one(teams, {
		fields: [invitations.teamId],
		references: [teams.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	invitations: many(invitations),
	teamMembers: many(teamMembers),
	activityLogs: many(activityLogs),
}));

export const teamsRelations = relations(teams, ({many}) => ({
	invitations: many(invitations),
	teamMembers: many(teamMembers),
	activityLogs: many(activityLogs),
}));

export const teamMembersRelations = relations(teamMembers, ({one}) => ({
	team: one(teams, {
		fields: [teamMembers.teamId],
		references: [teams.id]
	}),
	user: one(users, {
		fields: [teamMembers.userId],
		references: [users.id]
	}),
}));

export const activityLogsRelations = relations(activityLogs, ({one}) => ({
	team: one(teams, {
		fields: [activityLogs.teamId],
		references: [teams.id]
	}),
	user: one(users, {
		fields: [activityLogs.userId],
		references: [users.id]
	}),
}));