/**
 * @type {import("node-pg-migrate").ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import("node-pg-migrate").MigrationBuilder}
 */
exports.up = (pgm) => {
    // Create updated_at trigger function (reused by all tables)
    pgm.sql(`
        CREATE OR REPLACE FUNCTION set_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    `);

    pgm.createTable("users", {
        id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
        email: { type: "varchar(255)", notNull: true, unique: true },
        password_hash: { type: "varchar(255)", notNull: true },
        first_name: { type: "varchar(100)" },
        last_name: { type: "varchar(100)" },
        created_at: { type: "timestamptz", default: pgm.func("NOW()") },
        updated_at: { type: "timestamptz", default: pgm.func("NOW()") },
    });

    pgm.createIndex("users", "email");

    pgm.sql(`
        CREATE TRIGGER set_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    `);
};

/**
 * @param pgm {import("node-pg-migrate").MigrationBuilder}
 */
exports.down = (pgm) => {
    pgm.sql("DROP TRIGGER IF EXISTS set_users_updated_at ON users;");
    pgm.dropTable("users");
    pgm.sql("DROP FUNCTION IF EXISTS set_updated_at();");
};
