import * as userRepo from '../../repositories/user.repo.js';
import { logEvent } from '../../repositories/event.repo.js';
import { MESSAGES } from '../messages.js';

export function registerStopCommand(bot, pendingRegistrations) {
  bot.command('stop', async (ctx) => {
    const telegramId = ctx.from.id;
    pendingRegistrations.delete(telegramId);

    try {
      const existingUser = await userRepo.findByTelegramId(telegramId);

      if (!existingUser) {
        return ctx.reply(MESSAGES.STATUS_NOT_FOUND, { parse_mode: 'HTML' });
      }

      if (existingUser.status === 'unsubscribed') {
        return ctx.reply(MESSAGES.ALREADY_UNSUBSCRIBED, { parse_mode: 'HTML' });
      }

      await userRepo.updateStatus(existingUser.id, 'unsubscribed');
      await logEvent('subscription_unsubscribed', {
        user_id: existingUser.id,
        telegram_id: telegramId,
      });

      return ctx.reply(MESSAGES.UNSUBSCRIBED, { parse_mode: 'HTML' });
    } catch (err) {
      console.error('❌ Error in /stop:', err.message);
      await logEvent('db_error', { command: '/stop', error: err.message });
      return ctx.reply('⚠️ خطایی در لغو اشتراک رخ داد. لطفاً دوباره تلاش کنید.');
    }
  });
}