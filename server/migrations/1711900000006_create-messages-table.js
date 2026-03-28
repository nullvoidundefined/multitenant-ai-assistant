/**
 * @type {import("node-pg-migrate").ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * Requires conversations table to exist
 * @param pgm {import("node-pg-migrate").MigrationBuilder}
 */
export const up = (pgm) => {
    pgm.createTable("messages", {
        id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
        conversation_id: { type: "uuid", notNull: true, references: "conversations", onDelete: "CASCADE" },
        role: { type: "varchar(20)", notNull: true, check: "role IN ('user', 'assistant', 'system')" },
        content: { type: "text", notNull: true },
        token_count: { type: "integer" },
        is_summary: { type: "boolean", notNull: true, default: false },
        created_at: { type: "timestamptz", default: pgm.func("NOW()") },
    });

    pgm.createIndex("messages", "conversation_id");
    pgm.createIndex("messages", ["conversation_id", "created_at"]);
};

/**
 * @param pgm {import("node-pg-migrate").MigrationBuilder}
 */
export const down = (pgm) => {
    pgm.dropTable("messages");
};
