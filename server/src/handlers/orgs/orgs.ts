import * as orgsRepo from 'app/repositories/orgs/orgs.js';
import { createOrgSchema } from 'app/schemas/org.js';
import type { Request, Response } from 'express';

export async function createOrg(req: Request, res: Response): Promise<void> {
  const parsed = createOrgSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.issues.map((e) => e.message).join('; ');
    res.status(400).json({ error: { message } });
    return;
  }

  const org = await orgsRepo.createOrg(parsed.data.name, req.user!.id);
  res.status(201).json({ data: org });
}

export async function listOrgs(req: Request, res: Response): Promise<void> {
  const orgs = await orgsRepo.getUserOrgs(req.user!.id);
  res.json({ data: orgs });
}

export async function getOrg(req: Request, res: Response): Promise<void> {
  const orgId = req.orgMembership!.orgId;
  const org = await orgsRepo.getOrgById(orgId);
  if (!org) {
    res.status(404).json({ error: { message: 'Organization not found' } });
    return;
  }
  res.json({ data: org });
}

export async function listMembers(req: Request, res: Response): Promise<void> {
  const orgId = req.orgMembership!.orgId;
  const members = await orgsRepo.listMembers(orgId);
  res.json({ data: members });
}
