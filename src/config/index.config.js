import { config } from 'dotenv';

config();

// app
export const HOST = process.env.HOST || 'http://localhost:3001';
export const PORT = process.env.PORT || 3000;
export const NODE_ENV = process.env.NODE_ENV || 'development';

// api gateway
export const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:3000';

// db
export const DB_HOST = process.env.DB_HOST || 'localhost';
export const DB_PORT = process.env.DB_PORT || 3306;
export const DB_SSL_CA = NODE_ENV === 'production' ? Buffer.from(process.env.DB_SSL_CA, 'base64').toString('ascii') : undefined;
export const DB_USER = process.env.DB_USER || 'api';
export const DB_PASSWORD = process.env.DB_PASSWORD || 'secret';
export const DB_PAIDIFY_SCHEMA = process.env.DB_PAIDIFY_SCHEMA || 'paidify';
export const DB_UNIV_SCHEMA = process.env.DB_UNIV_SCHEMA || 'univ';

// banks endpoints
export const WESTERN_BANK_API_ENDPOINT = process.env.WESTERN_BANK_API_ENDPOINT || 'https://api.westernbank.com/makepay';
export const EAST_BANK_API_ENDPOINT = process.env.EAST_BANK_API_ENDPOINT || 'https://api.eastbank.com/makepay';

// mail
export const MAIL_HOST = process.env.MAIL_HOST || 'smtp.mailtrap.io';
export const MAIL_PORT = process.env.MAIL_PORT || 2525;
export const MAIL_USER = process.env.MAIL_USER || 'user';
export const MAIL_PASSWORD = process.env.MAIL_PASSWORD || 'password';
