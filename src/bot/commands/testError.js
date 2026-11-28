import { env } from '../../config/env.js';
import { reportError, ErrorSeverity } from '../../services/error.service.js';

export function registerTestErrorCommand(bot) {
  bot.hears(/^\/testerror$/i, async (ctx) => {
    const senderId = String(ctx.from?.id || '');
    const adminId = String(env.adminTelegramId || '').trim();

    if (!adminId || senderId !== adminId) {
      console.warn(`⚠️ Unauthorized /testerror attempt from senderId=${senderId}, expected=${adminId}`);
      return;
    }

    await ctx.reply('🧪 در حال شبیه‌سازی یک خطای تستی...');

    await reportError({
      context: 'admin.test_command',
      error: new Error('Simulated test error triggered by admin'),
      severity: ErrorSeverity.ERROR,
      meta: {
        triggered_by: senderId,
        environment: process.env.NODE_ENV || 'development',
      },
    });
  });
}
