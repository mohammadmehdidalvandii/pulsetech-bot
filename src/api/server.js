import http from 'node:http';
import { webhookCallback } from 'grammy';
import { env } from '../config/env.js';
import { isAuthorized } from './auth.middleware.js';
import { handleRequest } from './routes.js';

export function startInternalApiServer(bot) {
  const handleWebhook = env.webhook.url
    ? webhookCallback(bot, 'http', {
        secretToken: env.webhook.secret || undefined,
      })
    : null;

  const server = http.createServer(async (req, res) => {
    const pathname = req.url?.split('?')[0];

    if (handleWebhook && req.method === 'POST' && pathname === '/webhook') {
      try {
        await handleWebhook(req, res);
      } catch (err) {
        console.error('❌ Webhook handler error:', err.message);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'Webhook processing failed' }));
        }
      }
      return;
    }

    if (pathname !== '/health' && !isAuthorized(req)) {
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