/**
 * @type {import("node-pg-migrate").ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * Requires users and organizations tables to exist
 * @param pgm {import("node-pg-migrate").MigrationBuilder}
 */
export const up = (pgm) => {
    pgm.createType("org_role", ["admin", "member", "viewer"]);

    pgm.createTable("org_members", {
        org_id: { type: "uuid", notNull: true, references: "organizations", onDelete: "CASCADE" },
        user_id: { type: "uuid", notNull: true, references: "users", onDelete: "CASCADE" },
        role: { type: "org_role", notNull: true, default: "member" },
        joined_at: { type: "timestamptz", default: pgm.func("NOW()") },
    });

    pgm.addConstraint("org_members", "org_members_org_id_user_id_unique", {
        unique: ["org_id", "user_id"],
    });

    pgm.createIndex("org_members", "org_id");
    pgm.createIndex("org_members", "user_id");
};

/**
 * @param pgm {import("node-pg-migrate").MigrationBuilder}
 */
export const down = (pgm) => {
    pgm.dropTable("org_members");
    pgm.dropType("org_role");
};
