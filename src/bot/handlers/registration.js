import { InlineKeyboard } from 'grammy';
import * as userRepo from '../../repositories/user.repo.js';
import * as newsletterRepo from '../../repositories/newsletter.repo.js';
import { logEvent } from '../../repositories/event.repo.js';
import { deliverNewsletterToUser } from '../../services/delivery.service.js';
import { MESSAGES, getConsentMessage } from '../messages.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function safeAnswerCallback(ctx, options = {}) {
  try {
    await ctx.answerCallbackQuery(options);
  } catch (err) {
    if (!err.message?.includes('query is too old')) {
      console.warn('⚠️ answerCallbackQuery warning:', err.message);
    }
  }
}

export function registerRegistrationHandler(bot, pendingRegistrations) {
  bot.on('message:text', async (ctx, next) => {
    const telegramId = ctx.from.id;
    const text = ctx.message.text.trim();

    if (text.startsWith('/')) {
      return next();
    }

    const state = pendingRegistrations.get(telegramId);
    if (!state || state.step !== 'AWAITING_EMAIL') {
      return next();
    }

    const normalizedEmail = text.toLowerCase();

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return ctx.reply(MESSAGES.INVALID_EMAIL, { parse_mode: 'HTML' });
    }

    try {
      const emailTaken = await userRepo.existsByEmail(normalizedEmail);
      if (emailTaken) {
        return ctx.reply(MESSAGES.EMAIL_ALREADY_EXISTS, { parse_mode: 'HTML' });
      }

      pendingRegistrations.set(telegramId, {
        step: 'AWAITING_CONSENT',
        email: normalizedEmail,
      });

      const keyboard = new InlineKeyboard()
        .text('✅ موافقم و تایید می‌کنم', 'consent:accept')
        .row()
        .text('❌ انصراف و رد کردن', 'consent:decline');

      return ctx.reply(getConsentMessage(normalizedEmail), {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
    } catch (err) {
      console.error('❌ Error validating email:', err.message);
      await logEvent('db_error', { step: 'email_validation', error: err.message });
      return ctx.reply('⚠️ خطایی در بررسی ایمیل رخ داد. لطفاً دوباره تلاش کنید.');
    }
  });

  bot.callbackQuery('consent:accept', async (ctx) => {
    const telegramId = ctx.from.id;
    const state = pendingRegistrations.get(telegramId);

    if (!state || state.step !== 'AWAITING_CONSENT') {
      await safeAnswerCallback(ctx, {
        text: 'این درخواست منقضی شده است. لطفاً /start را بزنید.',
        show_alert: true,
      });
      return;
    }

    await safeAnswerCallback(ctx, { text: 'در حال تکمیل ثبت‌نام...' });

    try {
      const newUser = await userRepo.createUser({
        telegramId,
        username: ctx.from.username,
        email: state.email,
      });

      pendingRegistrations.delete(telegramId);

      await logEvent('user_registered', {
        user_id: newUser.id,
        telegram_id: telegramId,
      });

      await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => {});

      const latestNewsletter = await newsletterRepo.findLatest();

      if (!latestNewsletter) {
        await ctx.reply(MESSAGES.REGISTRATION_SUCCESS_NO_NEWS, { parse_mode: 'HTML' });
        return;
      }

      await ctx.reply(MESSAGES.REGISTRATION_SUCCESS_WITH_NEWS, { parse_mode: 'HTML' });
      await deliverNewsletterToUser(bot, newUser, latestNewsletter);
    } catch (err) {
      console.error('❌ Error completing registration:', err.message);
      await logEvent('db_error', { step: 'consent_accept', error: err.message });
      await ctx.reply('⚠️ خطایی در ثبت اطلاعات رخ داد. لطفاً دوباره تلاش کنید.');
    }
  });

  bot.callbackQuery('consent:decline', async (ctx) => {
    const telegramId = ctx.from.id;
    pendingRegistrations.delete(telegramId);

    await safeAnswerCallback(ctx, { text: 'ثبت‌نام لغو شد.' });
    await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => {});
    return ctx.reply(MESSAGES.CONSENT_DECLINED, { parse_mode: 'HTML' });
  });
}
