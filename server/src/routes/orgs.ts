import express from "express";

import * as chatHandlers from "app/handlers/chat/chat.js";
import * as orgHandlers from "app/handlers/orgs/orgs.js";
import { orgMembership } from "app/middleware/orgMembership/orgMembership.js";
import { requireAuth } from "app/middleware/requireAuth/requireAuth.js";

const orgsRouter = express.Router();

// All org routes require auth
orgsRouter.use(requireAuth);

// Org CRUD (not org-scoped)
orgsRouter.post("/", orgHandlers.createOrg);
orgsRouter.get("/", orgHandlers.listOrgs);

// Org-scoped routes — require membership
orgsRouter.get("/:orgId", orgMembership, orgHandlers.getOrg);
orgsRouter.get("/:orgId/members", orgMembership, orgHandlers.listMembers);

// Chat
orgsRouter.post("/:orgId/chat", orgMembership, chatHandlers.chat);
orgsRouter.get("/:orgId/conversations", orgMembership, chatHandlers.listConversations);
orgsRouter.get(
    "/:orgId/conversations/:conversationId/messages",
    orgMembership,
    chatHandlers.getMessages,
);

export { orgsRouter };
