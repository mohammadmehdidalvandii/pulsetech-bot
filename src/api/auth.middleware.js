import { env } from '../config/env.js';

export function isAuthorized(req) {
  const apiKey = req.headers['x-api-key'];
  return Boolean(apiKey && apiKey === env.api.key);
}