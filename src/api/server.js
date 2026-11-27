import http from 'node:http';
import { env } from '../config/env.js';
import { isAuthorized } from './auth.middleware.js';
import { handleRequest } from './routes.js';

export function startInternalApiServer(bot) {
  const server = http.createServer(async (req, res) => {
    if (req.url !== '/health' && !isAuthorized(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    await handleRequest(req, res, bot);
  });

  server.listen(env.api.port, () => {
    console.log(`🔌 Internal API server listening on port ${env.api.port}`);
  });

  return server;
}