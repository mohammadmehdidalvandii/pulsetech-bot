import * as userRepo from '../repositories/user.repo.js';
import { logEvent } from '../repositories/event.repo.js';

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

/**
 * Broadcast an admin announcement to all active subscribers
 */
export async function broadcastAdminMessage(bot, text, adminId) {
  const activeUsers = await userRepo.findAllActive();

  await logEvent('admin_broadcast_started', {
    admin_id: String(adminId),
    target_count: activeUsers.length,
  });

  let sent = 0;
  let blocked = 0;
  let failed = 0;

  for (const user of activeUsers) {
    try {
      await bot.api.sendMessage(user.telegram_id, text);
      sent++;
    } catch (err) {
      if (isBlockedError(err)) {
        await userRepo.updateStatus(user.id, 'blocked');
        blocked++;
        await logEvent('user_blocked', {
          user_id: user.id,
          telegram_id: user.telegram_id,
          source: 'admin_broadcast',
        });
      } else {
        failed++;
      }
    }
    await sleep(40);
  }

  const stats = {
    total: activeUsers.length,
    sent,
    blocked,
    failed,
  };

  await logEvent('admin_broadcast_completed', {
    admin_id: String(adminId),
    ...stats,
  });

  return stats;
}
