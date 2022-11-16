import fetch from '../helpers/fetch.js';
import { HOST, API_GATEWAY_URL } from '../config/index.config.js';

export default async function () {
    try {
        const { status, data } = await fetch(API_GATEWAY_URL + '/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: {
                service: 'payment',
                url: HOST,
            },
            timeout: 10000,
        });
        return { status, message: data.message };
    } catch(err) {
        return { status: 500, message: 'API Gateway not responding', error: err.message };
    }
}
