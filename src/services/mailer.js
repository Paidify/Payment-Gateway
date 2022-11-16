import nodemailer from 'nodemailer';
import { MAIL_HOST, MAIL_PASSWORD, MAIL_PORT, MAIL_USER } from '../config/index.config.js';

export const transporter = nodemailer.createTransport({
    host: MAIL_HOST,
    port: MAIL_PORT,
    auth: {
        user: MAIL_USER,
        pass: MAIL_PASSWORD,
    },
    secure: true,
});

transporter.verify().then(() => {
    console.log('Ready to send emails');
}).catch(err => {
    console.log(err);
});
