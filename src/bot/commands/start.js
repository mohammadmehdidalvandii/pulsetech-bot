import * as userRepo from '../../repositories/user.repo.js';
import { logEvent } from '../../repositories/event.repo.js';
import { MESSAGES } from '../messages.js';

export function registerStartCommand(bot, pendingRegistrations) {
  bot.command('start', async (ctx) => {
    const telegramId = ctx.from.id;

    try {
      const existingUser = await userRepo.findByTelegramId(telegramId);

      if (existingUser) {
        pendingRegistrations.delete(telegramId);

        if (existingUser.status === 'active') {
          return ctx.reply(MESSAGES.ALREADY_ACTIVE, { parse_mode: 'HTML' });
        }

        await userRepo.updateStatus(existingUser.id, 'active');
        await logEvent('subscription_reactivated', {
          user_id: existingUser.id,
          telegram_id: telegramId,
          previous_status: existingUser.status,
        });

        return ctx.reply(MESSAGES.REACTIVATED, { parse_mode: 'HTML' });
      }

      pendingRegistrations.set(telegramId, { step: 'AWAITING_EMAIL' });
      return ctx.reply(MESSAGES.WELCOME_NEW, { parse_mode: 'HTML' });
    } catch (err) {
      console.error('❌ Error in /start:', err.message);
      await logEvent('db_error', { command: '/start', error: err.message });
      return ctx.reply('⚠️ خطایی در پردازش درخواست رخ داد. لطفاً کمی بعد دوباره تلاش کنید.');
    }
  });
}