import {query} from '../config/db.js';

export async function findByTelegramId(telegramId) {
    const { rows } = await query(
        'SELECT id, telegram_id, username, email, status, consent_given, consent_at, created_at FROM users WHERE telegram_id = $1',
        [telegramId]
    );
    return rows[0] || null
};

export async function existsByEmail(email) {
    const { rows } = await query(
        'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
        [email]
    );
    return rows.length > 0
};

export async function createUser({telegramId, username, email}) {
    const { rows } = await query(
        `INSERT INTO users (telegram_id, username, email, status, consent_given, consent_at)
     VALUES ($1, $2, LOWER($3), 'active', TRUE, NOW())
     RETURNING id, telegram_id, email, status, consent_at`,
     [telegramId, username || null, email]
    );
    return rows[0]
};

export async function updateStatus(userId, status) {
  const { rows } = await query(
    `UPDATE users
     SET status = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING id, telegram_id, status`,
    [status, userId]
  );
  return rows[0] || null;
}

export async function findAllActive() {
  const { rows } = await query(
    `SELECT id, telegram_id
     FROM users
     WHERE status = 'active'
     ORDER BY id ASC`
  );
  return rows;
}