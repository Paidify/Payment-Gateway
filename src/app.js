import express from 'express';
import morgan from 'morgan';
import payment from './gateway/payment.js';
import pool from "./services/db.js";
import pkg from '../package.json' assert { type: "json" };

const app = express();

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((_, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, x-auth-token');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    next();
});
app.use('/pay', payment);
app.get('/', (_, res) => res.status(200).json({
    message: 'Welcome to the Paidify Payment Gateway',
    version: pkg.version,
}));
app.get('/ping', async (_, res) => {
    try {
        const [rows] = await pool.query('SELECT "Pong!" AS result');
        res.status(200).json({ message: rows[0].result });
    } catch (error) {
        return res.status(500).json({ message: 'Cannot connect to database' });
    }
});
app.use((_, res) => res.status(404).send('Not Found'));

export default app;
