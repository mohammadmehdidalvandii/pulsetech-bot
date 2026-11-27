import { query } from '../config/db';

export async function findById(id) {
    const { rows } = await query(
        'SELECT id, title, content_blocks, items_count, created_at FROM newsletters WHERE id = $1',
        [id]
    );
    return rows[0] || null;
};


export async function findLatest() {
    const { rows } = await query(
        'SELECT id, title, content_block, items_count, created_at FROM newsletters ORDER BY created_at DESC, id'
    );
    return rows[0] || null
}