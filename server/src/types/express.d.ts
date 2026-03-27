import type { User } from "app/schemas/auth.js";
import type { OrgRole } from "multitenant-common";

declare global {
    namespace Express {
        interface Request {
            user?: User;
            orgMembership?: {
                orgId: string;
                role: OrgRole;
            };
        }
    }
}

export {};
