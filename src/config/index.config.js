import { config } from 'dotenv';

config();

// app
export const PORT = process.env.PORT || 3000;
export const NODE_ENV = process.env.NODE_ENV || 'development';

// db
export const DB_HOST = process.env.DB_HOST || 'localhost';
export const DB_PORT = process.env.DB_PORT || 3306;
export const DB_USER = process.env.DB_USER || 'payment_gateway';
export const DB_PASSWORD = process.env.DB_PASSWORD || 'secret';
export const DB_DATABASE = process.env.DB_DATABASE || 'paidify';
export const DB_SSL_CA = NODE_ENV === 'production' ? Buffer.from(process.env.DB_SSL_CA, 'base64').toString('ascii') : undefined;

// bank api
export const BANK_API_URL = process.env.BANK_API_URL || 'https://sandbox.api.visa.com';
export const BANK_API_KEY = process.env.BANK_API_KEY || 'key';
