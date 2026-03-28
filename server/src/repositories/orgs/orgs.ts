import { query, withTransaction } from 'app/db/pool/pool.js';
import { DEFAULT_SYSTEM_PROMPT } from 'app/prompts/default-system-prompt.js';
import type { OrgMember, OrgRole, Organization } from 'multitenant-common';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export async function createOrg(
  name: string,
  userId: string,
): Promise<Organization> {
  return withTransaction(async (client) => {
    const baseSlug = slugify(name);
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    const orgResult = await query<Organization>(
      `INSERT INTO organizations (name, slug)
             VALUES ($1, $2)
             RETURNING *`,
      [name.trim(), slug],
      client,
    );
    const org = orgResult.rows[0];
    if (!org) throw new Error('Insert returned no row');

    // Add creator as admin
    await query(
      `INSERT INTO org_members (org_id, user_id, role)
             VALUES ($1, $2, 'admin')`,
      [org.id, userId],
      client,
    );

    // Create default assistant config
    await query(
      `INSERT INTO assistant_configs (org_id, system_prompt, model, max_tokens, temperature)
             VALUES ($1, $2, 'claude-sonnet-4-20250514', 4096, 0.7)`,
      [org.id, DEFAULT_SYSTEM_PROMPT],
      client,
    );

    return org;
  });
}

export async function getOrgById(orgId: string): Promise<Organization | null> {
  const result = await query<Organization>(
    `SELECT * FROM organizations WHERE id = $1`,
    [orgId],
  );
  return result.rows[0] ?? null;
}

export async function getUserOrgs(
  userId: string,
): Promise<(Organization & { role: OrgRole })[]> {
  const result = await query<Organization & { role: OrgRole }>(
    `SELECT o.*, om.role
         FROM organizations o
         INNER JOIN org_members om ON om.org_id = o.id
         WHERE om.user_id = $1
         ORDER BY o.created_at DESC`,
    [userId],
  );
  return result.rows;
}

export async function getMembership(
  orgId: string,
  userId: string,
): Promise<OrgMember | null> {
  const result = await query<OrgMember>(
    `SELECT * FROM org_members
         WHERE org_id = $1 AND user_id = $2`,
    [orgId, userId],
  );
  return result.rows[0] ?? null;
}

export async function listMembers(
  orgId: string,
): Promise<
  Array<{ user_id: string; email: string; role: string; joined_at: string }>
> {
  const result = await query<{
    user_id: string;
    email: string;
    role: string;
    joined_at: string;
  }>(
    `SELECT om.user_id, u.email, om.role, om.joined_at
         FROM org_members om
         JOIN users u ON u.id = om.user_id
         WHERE om.org_id = $1
         ORDER BY om.joined_at ASC`,
    [orgId],
  );
  return result.rows;
}

export async function getAssistantConfig(
  orgId: string,
): Promise<{
  system_prompt: string;
  model: string;
  max_tokens: number;
  temperature: number;
} | null> {
  const result = await query<{
    system_prompt: string;
    model: string;
    max_tokens: number;
    temperature: number;
  }>(
    `SELECT system_prompt, model, max_tokens, temperature
         FROM assistant_configs
         WHERE org_id = $1`,
    [orgId],
  );
  return result.rows[0] ?? null;
}
