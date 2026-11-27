import { Bot } from 'grammy';
import { env } from '../config/env.js';
import { logEvent } from '../repositories/event.repo.js';
import { registerStartCommand } from './commands/start.js';
import { registerStopCommand } from './commands/stop.js';
import { registerStatusCommand } from './commands/status.js';
import { registerHelpCommand } from './commands/help.js';
import { registerRegistrationHandler } from './handlers/registration.js';

export function createBot() {
  const bot = new Bot(env.botToken, {
    client: {
      apiRoot: env.telegramApiRoot,
    },
  });
  const pendingRegistrations = new Map();

  registerStartCommand(bot, pendingRegistrations);
  registerStopCommand(bot, pendingRegistrations);
  registerStatusCommand(bot);
  registerHelpCommand(bot);
  registerRegistrationHandler(bot, pendingRegistrations);

  bot.catch(async (err) => {
    console.error('❌ Telegram Bot Error:', err.message);
    await logEvent('telegram_bot_error', { error: err.message });
  });

  return bot;
}