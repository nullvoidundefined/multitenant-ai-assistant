import "dotenv/config";

import { logger } from "app/utils/logs/logger.js";

logger.info("Worker starting (no processors registered yet for POC)");

// Worker processors will be added in Week 2 (knowledge-process, conversation-summary)
// For now, this is a placeholder so the workspace builds.

process.on("SIGTERM", () => {
    logger.info("Worker shutting down");
    process.exit(0);
});
process.on("SIGINT", () => {
    logger.info("Worker shutting down");
    process.exit(0);
});
