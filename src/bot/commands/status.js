import * as userRepo from '../../repositories/user.repo.js';
import { logEvent } from '../../repositories/event.repo.js';
import { MESSAGES, formatStatusMessage } from '../messages.js';

export function registerStatusCommand(bot) {
  bot.command('status', async (ctx) => {
    const telegramId = ctx.from.id;

    try {
      const existingUser = await userRepo.findByTelegramId(telegramId);

      if (!existingUser) {
        return ctx.reply(MESSAGES.STATUS_NOT_FOUND, { parse_mode: 'HTML' });
      }

      return ctx.reply(formatStatusMessage(existingUser), { parse_mode: 'HTML' });
    } catch (err) {
      console.error('❌ Error in /status:', err.message);
      await logEvent('db_error', { command: '/status', error: err.message });
      return ctx.reply('⚠️ خطایی در دریافت وضعیت رخ داد. لطفاً دوباره تلاش کنید.');
    }
  });
}
