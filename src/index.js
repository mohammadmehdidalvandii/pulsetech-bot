import { pool } from './config/db.js';
import { createBot } from './bot/bot.js';
import { startInternalApiServer } from './api/server.js';
import { startRetryWorker } from './workers/retry.worker.js';
import { initErrorNotifier, reportError, ErrorSeverity } from './services/error.service.js';

async function bootstrap() {
  await pool.query('SELECT 1');
  console.log('✅ Connected to PostgreSQL');

  const bot = createBot();
  initErrorNotifier(bot);

  const apiServer = startInternalApiServer(bot);
  const retryTimer = startRetryWorker(bot);

  await bot.api.setMyCommands([
    { command: 'start', description: 'ثبت‌نام یا فعال‌سازی مجدد اشتراک' },
    { command: 'status', description: 'مشاهده وضعیت اشتراک' },
    { command: 'stop', description: 'توقف دریافت خبرنامه' },
    { command: 'help', description: 'راهنمای استفاده از ربات' },
  ]);

  process.on('unhandledRejection', async (reason) => {
    await reportError({
      context: 'process.unhandledRejection',
      error: reason instanceof Error ? reason : new Error(String(reason)),
      severity: ErrorSeverity.CRITICAL,
    });
  });

  process.on('uncaughtException', async (err) => {
    await reportError({
      context: 'process.uncaughtException',
      error: err,
      severity: ErrorSeverity.CRITICAL,
    });
    process.exit(1);
  });

  const shutdown = async () => {
    console.log('\n🛑 Shutting down PulseTech Bot...');
    clearInterval(retryTimer);
    apiServer.close();
    await bot.stop();
    await pool.end();
    process.exit(0);
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  await bot.start({
    onStart: (botInfo) => {
      console.log(`🚀 PulseTech Bot (@${botInfo.username}) is running...`);
    },
  });
}

bootstrap().catch((err) => {
  console.error('❌ Fatal startup error:', err.message);
  process.exit(1);
});