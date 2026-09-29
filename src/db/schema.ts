import {
  doublePrecision,
  index,
  pgEnum,
  integer,
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
} from 'drizzle-orm/pg-core';

export const rolesEnum = pgEnum('role', ['resident', 'gov_official', 'admin']);

export const ideaStatusEnum = pgEnum('idea_status', [
  'received',
  'in_review',
  'in_progress',
  'done',
  'rejected',
  'needs_clarification',
]);

export const usersTable = pgTable('users', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  fullname: varchar('name', { length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: rolesEnum().default('resident').notNull(),
  avatar: varchar({ length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const categoriesTable = pgTable('categories', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 100 }).notNull(),
  slug: varchar({ length: 100 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const ideasTable = pgTable(
  'ideas',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    authorId: integer('author_id')
      .notNull()
      .references(() => usersTable.id),
    title: varchar({ length: 255 }).notNull(),
    description: text().notNull(),
    categoryId: integer('category_id').references(() => categoriesTable.id, {
      onDelete: 'set null',
    }),
    status: ideaStatusEnum().default('received').notNull(),
    lat: doublePrecision().notNull(),
    lng: doublePrecision().notNull(),
    addressDistrict: varchar('address_district', { length: 255 }).notNull(),
    photoUrl: text('photo_url').notNull(),
    assigneeId: integer('assignee_id').references(() => usersTable.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('ideas_author_id_idx').on(table.authorId),
    index('ideas_status_idx').on(table.status),
    index('ideas_category_id_idx').on(table.categoryId),
    index('ideas_address_district_idx').on(table.addressDistrict),
    index('ideas_assignee_id_idx').on(table.assigneeId),
  ],
);

export const ideaStatusHistoryTable = pgTable(
  'idea_status_history',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    ideaId: integer('idea_id')
      .notNull()
      .references(() => ideasTable.id, { onDelete: 'cascade' }),
    status: ideaStatusEnum().notNull(),
    comment: text(),
    changedBy: integer('changed_by')
      .notNull()
      .references(() => usersTable.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index('idea_status_history_idea_id_idx').on(table.ideaId)],
);

export const passwordResetTokensTable = pgTable('password_reset_tokens', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  token: varchar({ length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  used: boolean().default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
