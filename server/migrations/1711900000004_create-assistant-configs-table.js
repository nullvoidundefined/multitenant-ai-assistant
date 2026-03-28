/**
 * @type {import("node-pg-migrate").ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * Requires organizations table to exist
 * @param pgm {import("node-pg-migrate").MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.createTable('assistant_configs', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    org_id: {
      type: 'uuid',
      notNull: true,
      references: 'organizations',
      onDelete: 'CASCADE',
      unique: true,
    },
    system_prompt: { type: 'text', notNull: true },
    model: {
      type: 'varchar(100)',
      notNull: true,
      default: 'claude-sonnet-4-20250514',
    },
    max_tokens: { type: 'integer', notNull: true, default: 4096 },
    temperature: { type: 'numeric(3,2)', notNull: true, default: 0.7 },
    created_at: { type: 'timestamptz', default: pgm.func('NOW()') },
    updated_at: { type: 'timestamptz', default: pgm.func('NOW()') },
  });

  pgm.createIndex('assistant_configs', 'org_id');

  pgm.sql(`
        CREATE TRIGGER set_assistant_configs_updated_at
        BEFORE UPDATE ON assistant_configs
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    `);
};

/**
 * @param pgm {import("node-pg-migrate").MigrationBuilder}
 */
export const down = (pgm) => {
  pgm.sql(
    'DROP TRIGGER IF EXISTS set_assistant_configs_updated_at ON assistant_configs;',
  );
  pgm.dropTable('assistant_configs');
};
