import dotenv from 'dotenv';

dotenv.config();

const requiredEnvVars = [
    'BOT_TOKEN',
    'DB_HOST',
    'DB_PORT',
    'POSTGRES_DB',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
    'INTERNAL_API_KEY'
];

for (const key of requiredEnvVars){
    if(!process.env[key]){
        console.error(`❌ Missing required environment variable: ${key}`)
        process.exit(1)
    }
};

export const env = {
    botToken: process.env.BOT_TOKEN,
    telegramApiRoot: process.env.TELEGRAM_API_ROOT || 'https://api.telegram.org',
    db:{
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT) || 5432,
        database: process.env.POSTGRES_DB,
        user: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
    },
    api:{
        port: Number(process.env.INTERNAL_API_PORT) || 3000,
        key: process.env.INTERNAL_API_KEY,
    }
}