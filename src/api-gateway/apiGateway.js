import axios from 'axios';
import { HOST, API_GATEWAY_URL } from '../config/index.config.js';

export default async function () {
    try {
        const response = await axios({
            method: 'post',
            url: API_GATEWAY_URL + '/register',
            headers: { 'Content-Type': 'application/json' },
            data: {
                service: 'payment',
                url: HOST,
            },
            timeout: 10000,
        });
        return { message: response.data.message };
    } catch(err) {
        // if error is 409, it means that the service is already registered, so it may not be a problem
        if (err.response && err.response.status === 409) {
            return { message: err.response.data.message };
        }
        return { message: 'API Gateway is not responding' };
    }
}
