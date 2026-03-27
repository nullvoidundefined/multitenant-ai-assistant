/**
 * @type {import("node-pg-migrate").ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import("node-pg-migrate").MigrationBuilder}
 */
exports.up = (pgm) => {
    pgm.createTable("organizations", {
        id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
        name: { type: "varchar(100)", notNull: true },
        slug: { type: "varchar(100)", notNull: true, unique: true },
        created_at: { type: "timestamptz", default: pgm.func("NOW()") },
        updated_at: { type: "timestamptz", default: pgm.func("NOW()") },
    });

    pgm.createIndex("organizations", "slug");

    pgm.sql(`
        CREATE TRIGGER set_organizations_updated_at
        BEFORE UPDATE ON organizations
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    `);
};

/**
 * @param pgm {import("node-pg-migrate").MigrationBuilder}
 */
exports.down = (pgm) => {
    pgm.sql("DROP TRIGGER IF EXISTS set_organizations_updated_at ON organizations;");
    pgm.dropTable("organizations");
};
