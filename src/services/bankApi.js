import axios from 'axios'
import { BANK_API_URL } from '../config/index.config.js';

const service = axios.create({
    baseURL: BANK_API_URL,
    // withCredentials: true, // send cookies when cross-domain requests
    timeout: 5000
});

service.interceptors.request.use(
    config => {
        return config;
    },
    error => {
        console.log(error);
        return Promise.reject(error)
    }
);

service.interceptors.response.use(
    response => {
        const res = response.data
        if (res.code !== 20000) {
            return Promise.reject(new Error(res.message || 'Error'))
        }
        return res;
    },
    error => {
        console.log(error);
        return Promise.reject(error);
    }
);

export default service;
