import type { NextFunction, Request, Response } from "express";

import { logger } from "app/utils/logs/logger.js";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
    logger.error({ err, reqId: req.id }, "Unhandled error in request handler");

    res.status(500).json({
        error: {
            message:
                process.env.NODE_ENV === "production"
                    ? "Internal server error"
                    : err instanceof Error
                      ? err.message
                      : "Internal server error",
        },
    });
}
