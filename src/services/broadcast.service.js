import { query } from '../config/db.js';
import * as userRepo from '../repositories/user.repo.js';
import * as newsletterRepo from '../repositories/newsletter.repo.js';
import { logEvent } from '../repositories/event.repo.js';
import { deliverNewsletterToUser } from './delivery.service.js';

const NO_NEWS_MESSAGE = '📰 امروز خبر جدیدی تا این لحظه منتشر نشد.';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isBlockedError(err) {
  const description = err?.description || err?.message || '';
  return (
    err?.error_code === 403 ||
    description.includes('bot was blocked by the user') ||
    description.includes('user is deactivated')
  );
}

export async function broadcastNewsletter(bot, newsletterId) {
  const newsletter = await newsletterRepo.findById(newsletterId);
  if (!newsletter) {
    throw new Error(`Newsletter with ID ${newsletterId} not found`);
  }

  const activeUsers = await userRepo.findAllActive();

  await logEvent('broadcast_started', {
    newsletter_id: newsletter.id,
    target_users: activeUsers.length,
  });

  const stats = {
    newsletter_id: newsletter.id,
    newsletter_title: newsletter.title,
    published_news_items: newsletter.items_count,
    active_subscribers: activeUsers.length,
    new_subscribers_today: 0,
    successful_deliveries: 0,
    failed_deliveries: 0,
    retry_scheduled: 0,
    blocked_subscribers: 0,
  };

  for (const user of activeUsers) {
    const { outcome } = await deliverNewsletterToUser(bot, user, newsletter);

    if (outcome === 'sent') stats.successful_deliveries++;
    else if (outcome === 'blocked') stats.blocked_subscribers++;
    else if (outcome === 'pending') stats.retry_scheduled++;
    else if (outcome === 'failed') stats.failed_deliveries++;

    await sleep(40);
  }

  const summaryRes = await query(`
    SELECT
      (SELECT COUNT(*)::int FROM users WHERE status = 'active') AS total_active,
      (SELECT COUNT(*)::int FROM users WHERE created_at >= NOW() - INTERVAL '24 hours') AS new_today,
      (SELECT COUNT(*)::int FROM users WHERE status = 'blocked') AS total_blocked
  `);

  if (summaryRes.rows[0]) {
    stats.active_subscribers = summaryRes.rows[0].total_active;
    stats.new_subscribers_today = summaryRes.rows[0].new_today;
    stats.total_blocked_subscribers = summaryRes.rows[0].total_blocked;
  }

  await logEvent('broadcast_completed', stats);
  return stats;
}

export async function broadcastNoNews(bot) {
  const activeUsers = await userRepo.findAllActive();

  let sentCount = 0;
  let blockedCount = 0;
  let failedCount = 0;

  for (const user of activeUsers) {
    try {
      await bot.api.sendMessage(user.telegram_id, NO_NEWS_MESSAGE);
      sentCount++;
    } catch (err) {
      if (isBlockedError(err)) {
        await userRepo.updateStatus(user.id, 'blocked');
        blockedCount++;
        await logEvent('user_blocked', {
          user_id: user.id,
          telegram_id: user.telegram_id,
        });
      } else {
        failedCount++;
      }
    }
    await sleep(40);
  }

  const result = {
    sent: sentCount,
    blocked: blockedCount,
    failed: failedCount,
  };

  await logEvent('no_news_notification_sent', result);
  return result;
}