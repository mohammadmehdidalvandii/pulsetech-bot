import { env } from '../../config/env.js';
import { broadcastAdminMessage } from '../../services/adminMessage.service.js';

function isAdmin(ctx) {
  const senderId = String(ctx.from?.id || '');
  const adminId = String(env.adminTelegramId || '').trim();
  return Boolean(adminId && senderId === adminId);
}

export function registerBroadcastCommand(bot) {
  bot.hears(/^\/broadcast(?:@\w+)?(?:\s+([\s\S]+))?$/i, async (ctx) => {
    if (!isAdmin(ctx)) return;

    const messageText = (ctx.match?.[1] || '').trim();
    if (!messageText) {
      await ctx.reply(
        '⚠️ متن پیام همگانی را بعد از دستور بنویسید.\n\nنمونه:\n<code>/broadcast سلام به همه همراهان پالس‌تک!</code>',
        { parse_mode: 'HTML' }
      );
      return;
    }

    await ctx.reply('⏳ در حال ارسال پیام همگانی به کاربران فعال...');

    const stats = await broadcastAdminMessage(bot, messageText, ctx.from.id);

    await ctx.reply(
      `📢 <b>گزارش ارسال همگانی:</b>\n\n` +
        `👥 کل کاربران فعال: <b>${stats.total}</b>\n` +
        `✅ ارسال موفق: <b>${stats.sent}</b>\n` +
        `🚫 بلاک کرده: <b>${stats.blocked}</b>\n` +
        `⚠️ خطای ارسال: <b>${stats.failed}</b>`,
      { parse_mode: 'HTML' }
    );
  });
}
