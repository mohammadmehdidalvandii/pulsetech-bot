import { MESSAGES } from '../messages.js';

export function registerHelpCommand(bot) {
  bot.command('help', async (ctx) => {
    return ctx.reply(MESSAGES.HELP, { parse_mode: 'HTML' });
  });
}