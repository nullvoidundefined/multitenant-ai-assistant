/**
 * @type {import("node-pg-migrate").ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * Requires organizations and users tables to exist
 * @param pgm {import("node-pg-migrate").MigrationBuilder}
 */
exports.up = (pgm) => {
    pgm.createTable("conversations", {
        id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
        org_id: { type: "uuid", notNull: true, references: "organizations", onDelete: "CASCADE" },
        user_id: { type: "uuid", notNull: true, references: "users", onDelete: "CASCADE" },
        title: { type: "varchar(255)" },
        created_at: { type: "timestamptz", default: pgm.func("NOW()") },
        updated_at: { type: "timestamptz", default: pgm.func("NOW()") },
    });

    pgm.createIndex("conversations", "org_id");
    pgm.createIndex("conversations", "user_id");
    pgm.createIndex("conversations", ["org_id", "user_id"]);
    pgm.createIndex("conversations", "created_at");

    pgm.sql(`
        CREATE TRIGGER set_conversations_updated_at
        BEFORE UPDATE ON conversations
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    `);
};

/**
 * @param pgm {import("node-pg-migrate").MigrationBuilder}
 */
exports.down = (pgm) => {
    pgm.sql("DROP TRIGGER IF EXISTS set_conversations_updated_at ON conversations;");
    pgm.dropTable("conversations");
};
