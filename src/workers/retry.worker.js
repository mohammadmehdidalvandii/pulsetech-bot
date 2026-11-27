import * as deliveryRepo from '../repositories/delivery.repo.js';
import * as newsletterRepo from '../repositories/newsletter.repo.js';
import { deliverNewsletterToUser } from '../services/delivery.service.js';

const POLL_INTERVAL_MS = 30 * 1000; // بررسی صف هر ۳۰ ثانیه

export function startRetryWorker(bot) {
  let isProcessing = false;

  const timer = setInterval(async () => {
    if (isProcessing) return;
    isProcessing = true;

    try {
      const dueDeliveries = await deliveryRepo.findDueRetries(50);

      for (const item of dueDeliveries) {
        if (item.user_status !== 'active') {
          await deliveryRepo.scheduleRetryOrFail(
            item.id,
            99,
            `Skipped retry: user status is ${item.user_status}`
          );
          continue;
        }

        const newsletter = await newsletterRepo.findById(item.newsletter_id);
        if (!newsletter) continue;

        await deliverNewsletterToUser(
          bot,
          { id: item.user_id, telegram_id: item.telegram_id },
          newsletter
        );
      }
    } catch (err) {
      console.error('⚠️ Retry worker error:', err.message);
    } finally {
      isProcessing = false;
    }
  }, POLL_INTERVAL_MS);

  console.log('⏱️ Retry worker started (polling every 30s)');
  return timer;
}