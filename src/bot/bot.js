import { Bot } from 'grammy';
import { env } from '../config/env.js';
import { reportError, ErrorSeverity } from '../services/error.service.js';
import { registerStartCommand } from './commands/start.js';
import { registerStopCommand } from './commands/stop.js';
import { registerStatusCommand } from './commands/status.js';
import { registerHelpCommand } from './commands/help.js';
import { registerTestErrorCommand } from './commands/testError.js';
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
  registerTestErrorCommand(bot);
  registerRegistrationHandler(bot, pendingRegistrations);

  bot.catch(async (err) => {
    await reportError({
      context: 'telegram.bot.catch',
      error: err.error || err,
      severity: ErrorSeverity.ERROR,
      meta: {
        update_id: err.ctx?.update?.update_id,
        chat_id: err.ctx?.chat?.id,
      },
    });
  });

  return bot;
}
