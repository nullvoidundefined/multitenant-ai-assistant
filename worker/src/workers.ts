import { logger } from 'app/utils/logs/logger.js';
import http from 'node:http';

logger.info('Worker starting (no processors registered yet for POC)');

// Worker processors will be added in Week 2 (knowledge-process, conversation-summary)
// For now, this is a placeholder so the workspace builds.

const healthServer = http.createServer((_req, res) => {
  res.writeHead(200);
  res.end('ok');
});
healthServer.listen(
  Number(process.env.PORT || process.env.WORKER_PORT) || 3002,
);

process.on('SIGTERM', () => {
  logger.info('Worker shutting down');
  healthServer.close();
  process.exit(0);
});
process.on('SIGINT', () => {
  logger.info('Worker shutting down');
  healthServer.close();
  process.exit(0);
});
