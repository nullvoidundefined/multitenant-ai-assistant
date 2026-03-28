/**
 * @type {import("node-pg-migrate").ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * Requires users table to exist
 * @param pgm {import("node-pg-migrate").MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.createTable('sessions', {
    id: { type: 'varchar(64)', primaryKey: true },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    expires_at: { type: 'timestamptz', notNull: true },
    created_at: { type: 'timestamptz', default: pgm.func('NOW()') },
  });

  pgm.createIndex('sessions', 'user_id');
  pgm.createIndex('sessions', 'expires_at');
};

/**
 * @param pgm {import("node-pg-migrate").MigrationBuilder}
 */
export const down = (pgm) => {
  pgm.dropTable('sessions');
};
