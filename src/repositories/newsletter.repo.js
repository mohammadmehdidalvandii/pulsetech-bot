import { query } from '../config/db.js';

export async function findById(id) {
  const { rows } = await query(
    'SELECT id, title, content_blocks, items_count, created_at FROM newsletters WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

export async function findLatest() {
  const { rows } = await query(
    'SELECT id, title, content_blocks, items_count, created_at FROM newsletters ORDER BY created_at DESC, id DESC LIMIT 1'
  );
  return rows[0] || null;
}