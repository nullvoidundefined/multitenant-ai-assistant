import type { Request, Response, NextFunction } from "express";

import * as orgsRepo from "app/repositories/orgs/orgs.js";
import type { OrgRole } from "multitenant-common";

/**
 * Validates the authenticated user is a member of the org specified by :orgId.
 * Sets req.orgMembership with { orgId, role } on success.
 */
export function orgMembership(req: Request, res: Response, next: NextFunction): void {
    if (!req.user) {
        res.status(401).json({ error: { message: "Authentication required" } });
        return;
    }

    const orgId = req.params.orgId as string | undefined;
    if (!orgId) {
        res.status(400).json({ error: { message: "Missing orgId parameter" } });
        return;
    }

    orgsRepo
        .getMembership(orgId, req.user.id)
        .then((membership) => {
            if (!membership) {
                res.status(403).json({ error: { message: "Not a member of this organization" } });
                return;
            }
            req.orgMembership = { orgId, role: membership.role };
            next();
        })
        .catch(next);
}

/**
 * Factory for role-checking middleware. Requires orgMembership to run first.
 */
export function requireRole(...roles: OrgRole[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.orgMembership) {
            res.status(403).json({ error: { message: "Organization membership required" } });
            return;
        }
        if (!roles.includes(req.orgMembership.role)) {
            res.status(403).json({
                error: { message: `Requires one of: ${roles.join(", ")}` },
            });
            return;
        }
        next();
    };
}
