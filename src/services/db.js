import { createPool } from 'mysql2/promise';
import {
    DB_HOST,
    DB_PORT,
    DB_USER,
    DB_PASSWORD,
    DB_DATABASE,
    DB_SSL_CA,
    NODE_ENV
} from '../config/index.config.js';

const pool = createPool({
    port: DB_PORT,
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_DATABASE,
    ssl: NODE_ENV === 'production' ? { ca: DB_SSL_CA } : undefined,
    // connectionLimit: 10
});

pool.on('connection', (connection) => {
    console.log('MySQL connected');
});

pool.on('enqueue', () => {
    console.log('Waiting for available connection slot');
});

pool.on('release', (connection) => {
    console.log('Connection %d released', connection.threadId);
});

pool.on('acquire', (connection) => {
    console.log('Connection %d acquired', connection.threadId);
});

export default pool;
