import { broadcastNewsletter, broadcastNoNews } from '../services/broadcast.service.js';
import { reportError, ErrorSeverity } from '../services/error.service.js';

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1e6) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

export async function handleRequest(req, res, bot) {
  const { method, url } = req;

  if (method === 'GET' && url === '/health') {
    return sendJson(res, 200, { status: 'ok' });
  }

  if (method === 'POST' && url === '/internal/broadcast') {
    try {
      const body = await readJsonBody(req);
      const newsletterId = Number(body.newsletter_id);

      if (!newsletterId || Number.isNaN(newsletterId)) {
        return sendJson(res, 400, { error: 'newsletter_id is required and must be a number' });
      }

      const stats = await broadcastNewsletter(bot, newsletterId);
      return sendJson(res, 200, { success: true, stats });
    } catch (err) {
      await reportError({
        context: 'api.internal.broadcast',
        error: err,
        severity: ErrorSeverity.CRITICAL,
      });
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  if (method === 'POST' && url === '/internal/no-news') {
    try {
      const result = await broadcastNoNews(bot);
      return sendJson(res, 200, { success: true, result });
    } catch (err) {
      await reportError({
        context: 'api.internal.no-news',
        error: err,
        severity: ErrorSeverity.ERROR,
      });
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  return sendJson(res, 404, { error: 'Not Found' });
}