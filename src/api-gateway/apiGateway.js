// import axios from 'axios';
import fetch from '../helpers/fetch.js';
import { HOST, API_GATEWAY_URL } from '../config/index.config.js';

export default async function () {
    try {
        const response = await fetch(API_GATEWAY_URL + '/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: {
                service: 'payment',
                url: HOST,
            },
            timeout: 10000,
        });
        return { message: response.message };
    } catch(err) {
        return { message: 'API Gateway is not responding', error: err };
    }
}
