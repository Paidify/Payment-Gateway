import fetch, { AbortError } from 'node-fetch';

export default async function(url, options) {
    // timeout
    const timeout = options.timeout;
    delete options.timeout;
    const controller = new AbortController();
    let id;
    if(timeout) id = setTimeout(() => controller.abort(), timeout);

    // body
    if(options.body) {
        if(options.body instanceof Object) options.body = JSON.stringify(options.body);
        options.body = new TextEncoder().encode(options.body);
    }

    try {
        const res = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        if(res.headers.get('content-type').includes('application/json')) {
            return res.json();
        }
        return res.text();
    } catch(err) {
        if(err instanceof AbortError) throw new Error('Timeout');
        throw err;
    } finally {
        if(id) clearTimeout(id);
    }
} 
