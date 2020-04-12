require('dotenv').config();
export const dbconfig = {
    user: process.env.API_USER,
    database: process.env.API_DATABASE,
    password: process.env.API_DB_PASSWORD,
    host: process.env.API_HOST,
    port: parseInt(process.env.API_PORT)
};