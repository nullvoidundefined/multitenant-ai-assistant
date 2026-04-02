import pool from 'app/db/pool/pool.js';
import 'dotenv/config';
import { afterAll, beforeAll } from 'vitest';

beforeAll(async () => {
  if (!process.env.DATABASE_URL) {
    console.warn('DATABASE_URL not set — skipping integration tests');
    return;
  }

  // Clean test data from previous runs
  await pool.query(
    "DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@integration-test.invalid'))",
  );
  await pool.query(
    "DELETE FROM conversations WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@integration-test.invalid')",
  );
  await pool.query(
    "DELETE FROM assistant_configs WHERE org_id IN (SELECT id FROM organizations WHERE id IN (SELECT org_id FROM org_members WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@integration-test.invalid')))",
  );
  await pool.query(
    "DELETE FROM org_members WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@integration-test.invalid')",
  );
  await pool.query(
    "DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@integration-test.invalid')",
  );
  await pool.query(
    "DELETE FROM users WHERE email LIKE '%@integration-test.invalid'",
  );
});

afterAll(async () => {
  // Clean up test data
  await pool.query(
    "DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@integration-test.invalid'))",
  );
  await pool.query(
    "DELETE FROM conversations WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@integration-test.invalid')",
  );
  await pool.query(
    "DELETE FROM assistant_configs WHERE org_id IN (SELECT id FROM organizations WHERE id IN (SELECT org_id FROM org_members WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@integration-test.invalid')))",
  );
  await pool.query(
    "DELETE FROM org_members WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@integration-test.invalid')",
  );
  await pool.query(
    "DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@integration-test.invalid')",
  );
  await pool.query(
    "DELETE FROM users WHERE email LIKE '%@integration-test.invalid'",
  );
  await pool.end();
});
