import PG from "pg";
import {env} from './env.js';

const {Pool} = PG;

export const pool = new Pool({
    host: env.db.host,
    port: env.db.port,
    database: env.db.database,
    user: env.db.user,
    password: env.db.password
});


pool.on('error', (err)=>{
    console.error(`❌ Unexpected PostgresSQL pool error`, err.message);
});

export async function query(text , params){
    return pool.query(text , params);
}