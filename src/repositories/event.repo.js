import {query} from '../config/db.js';

export async function logEvent(eventType , details = {}) {
    try{
        await query(
            'INSERT INTO system_events (event_type,details) VALUES($1, $2)',
            [eventType , JSON.stringify(details)]
        );
    }catch (err) {
        console.error(`⚠️ Failed to write system event [${eventType}]:`,err.message);
    }
}