import * as userRepo from '../repositories/user.repo.js';
import * as deliveryRepo from '../repositories/delivery.repo.js';
import { logEvent } from '../repositories/event.repo.js';
import { buildTelegramMessages } from './splitter.service.js';

function isBlockedError(err) {
  const description = err?.description || err?.message || '';
  return (
    err?.error_code === 403 ||
    description.includes('bot was blocked by the user') ||
    description.includes('user is deactivated')
  );
}

export async function deliverNewsletterToUser(bot, user, newsletter) {
  const { record, alreadyExists } = await deliveryRepo.createPendingIfNotExists(
    user.id,
    newsletter.id
  );

  if (alreadyExists && record.status === 'sent') {
    return { outcome: 'skipped_duplicate' };
  }

  const messages = buildTelegramMessages(newsletter);
  const currentAttempt = record.attempts + 1;

  try {
    for (const text of messages) {
      await bot.api.sendMessage(user.telegram_id, text, {
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
      });
    }

    await deliveryRepo.markAsSent(record.id, currentAttempt);
    return { outcome: 'sent' };
  } catch (err) {
    const errorMessage = err?.description || err?.message || 'Unknown Telegram error';

    if (isBlockedError(err)) {
      await userRepo.updateStatus(user.id, 'blocked');
      await deliveryRepo.scheduleRetryOrFail(record.id, 99, 'User blocked the bot');
      await logEvent('user_blocked', {
        user_id: user.id,
        telegram_id: user.telegram_id,
      });
      return { outcome: 'blocked' };
    }

    const retryResult = await deliveryRepo.scheduleRetryOrFail(
      record.id,
      record.attempts,
      errorMessage
    );

    await logEvent(
      retryResult.status === 'pending' ? 'delivery_retry_scheduled' : 'delivery_failed',
      {
        user_id: user.id,
        newsletter_id: newsletter.id,
        attempt: currentAttempt,
        error: errorMessage,
      }
    );

    return { outcome: retryResult.status };
  }
}