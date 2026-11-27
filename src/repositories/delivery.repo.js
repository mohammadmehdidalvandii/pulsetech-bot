import { query } from '../config/db.js';

const RETRY_DELAYS_MINUTES = [1, 5, 15];

export async function createPendingIfNotExists(userId, newsletterId) {
  const { rows } = await query(
    `INSERT INTO deliveries (user_id, newsletter_id, status, attempts)
     VALUES ($1, $2, 'pending', 0)
     ON CONFLICT (user_id, newsletter_id) DO NOTHING
     RETURNING id, user_id, newsletter_id, status, attempts`,
    [userId, newsletterId]
  );

  if (rows.length > 0) {
    return { record: rows[0], alreadyExists: false };
  }

  const existing = await query(
    'SELECT id, user_id, newsletter_id, status, attempts FROM deliveries WHERE user_id = $1 AND newsletter_id = $2',
    [userId, newsletterId]
  );
  return { record: existing.rows[0], alreadyExists: true };
}

export async function markAsSent(deliveryId, attempts) {
  await query(
    `UPDATE deliveries
     SET status = 'sent',
         attempts = $1,
         sent_at = NOW(),
         next_retry_at = NULL,
         last_error = NULL
     WHERE id = $2`,
    [attempts, deliveryId]
  );
}

export async function scheduleRetryOrFail(deliveryId, currentAttempts, errorMessage) {
  const nextAttemptNumber = currentAttempts + 1;

  if (nextAttemptNumber <= RETRY_DELAYS_MINUTES.length) {
    const delayMinutes = RETRY_DELAYS_MINUTES[nextAttemptNumber - 1];
    await query(
      `UPDATE deliveries
       SET status = 'pending',
           attempts = $1,
           next_retry_at = NOW() + ($2 || ' minutes')::INTERVAL,
           last_error = $3
       WHERE id = $4`,
      [nextAttemptNumber, delayMinutes, errorMessage, deliveryId]
    );
    return { status: 'pending', nextAttemptNumber, delayMinutes };
  }

  await query(
    `UPDATE deliveries
     SET status = 'failed',
         attempts = $1,
         next_retry_at = NULL,
         last_error = $2
     WHERE id = $3`,
    [nextAttemptNumber, errorMessage, deliveryId]
  );
  return { status: 'failed', nextAttemptNumber };
}

export async function findDueRetries(limit = 50) {
  const { rows } = await query(
    `SELECT d.id, d.user_id, d.newsletter_id, d.attempts, u.telegram_id, u.status AS user_status
     FROM deliveries d
     JOIN users u ON u.id = d.user_id
     WHERE d.status = 'pending'
       AND d.next_retry_at IS NOT NULL
       AND d.next_retry_at <= NOW()
     ORDER BY d.next_retry_at ASC
     LIMIT $1`,
    [limit]
  );
  return rows;
}