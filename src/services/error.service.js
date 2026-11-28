// src/services/error.service.js
import { env } from '../config/env.js';
import { logEvent } from '../repositories/event.repo.js';

let botInstance = null;
const alertCooldowns = new Map();
const COOLDOWN_MS = 60 * 1000; 

export const ErrorSeverity = {
  WARN: 'WARN',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL',
};

export function initErrorNotifier(bot) {
  botInstance = bot;
}

function escapeHtml(text = '') {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function shouldSendTelegramAlert(dedupeKey) {
  const now = Date.now();
  const lastSent = alertCooldowns.get(dedupeKey);
  if (lastSent && now - lastSent < COOLDOWN_MS) {
    return false;
  }
  alertCooldowns.set(dedupeKey, now);
  return true;
}

export async function reportError({
  context,
  error,
  severity = ErrorSeverity.ERROR,
  meta = {},
  notifyAdmin = true,
}) {
  const message = error?.description || error?.message || String(error || 'Unknown error');
  const stack = error?.stack ? error.stack.split('\n').slice(0, 4).join('\n') : null;

  const icon =
    severity === ErrorSeverity.CRITICAL
      ? '🚨'
      : severity === ErrorSeverity.ERROR
      ? '❌'
      : '⚠️';

  console.error(`${icon} [${severity}] [${context}] ${message}`, Object.keys(meta).length ? meta : '');

  await logEvent(`error_${severity.toLowerCase()}`, {
    context,
    severity,
    message,
    meta,
    stack,
  });

  const isAlertable =
    notifyAdmin &&
    (severity === ErrorSeverity.ERROR || severity === ErrorSeverity.CRITICAL) &&
    botInstance &&
    env.adminTelegramId;

  if (!isAlertable) return;

  const dedupeKey = `${context}:${message}`;
  if (!shouldSendTelegramAlert(dedupeKey)) return;

  const metaLines = Object.entries(meta)
    .map(([k, v]) => `• <b>${escapeHtml(k)}:</b> <code>${escapeHtml(JSON.stringify(v))}</code>`)
    .join('\n');

  const alertText = [
    `${icon} <b>PulseTech System Alert (${severity})</b>`,
    `📍 <b>بخش:</b> <code>${escapeHtml(context)}</code>`,
    `💬 <b>خطا:</b> <code>${escapeHtml(message)}</code>`,
    metaLines ? `\n📋 <b>جزئیات:</b>\n${metaLines}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  try {
    await botInstance.api.sendMessage(env.adminTelegramId, alertText, {
      parse_mode: 'HTML',
    });
  } catch (telegramErr) {
    console.error('⚠️ Failed to send admin Telegram alert:', telegramErr.message);
  }
}