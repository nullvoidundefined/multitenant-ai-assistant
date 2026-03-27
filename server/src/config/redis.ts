import Redis from "ioredis";

import { logger } from "app/utils/logs/logger.js";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

export const redis = new (Redis as unknown as typeof Redis.default)(redisUrl, {
    maxRetriesPerRequest: null,
});

redis.on("connect", () => logger.info("Redis connected"));
redis.on("error", (err: unknown) => logger.error({ err }, "Redis connection error"));
