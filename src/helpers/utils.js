import { CARD_FIRST_DIGIT_ALLOWED } from "../config/constants.js";
import { EAST_BANK_API_ENDPOINT, WESTERN_BANK_API_ENDPOINT } from "../config/index.config.js";

export function genReferenceNumber() {
    return String(+new Date() + '' + Math.floor(Math.random() * 1000000));
}

export function genInvoiceNumber() {
    return 'INV-' + genReferenceNumber();
}

export function date2Mysql(date) {
    return date.toISOString().slice(0, 19).replace('T', ' ');
}

export function validateCardNumber(cardNumber) {
    if(!cardNumber) return false;
    cardNumber = String(cardNumber);
    return /^\d{16}$/.test(cardNumber) && CARD_FIRST_DIGIT_ALLOWED.includes(Number(cardNumber[0]));
}

export function validateCvv(cvv) {
    if(!cvv) return false;
    cvv = String(cvv);
    return /^\d{3}$/.test(cvv);
}

export function validateExpMonth(month) {
    if(!month) return false;
    month = String(month);
    const monthNumber = Number(month);
    return /^\d{1,2}$/.test(month) && monthNumber >= 1 && monthNumber <= 12;
}

export function validateExpYear(year) {
    if(!year) return false;
    year = String(year);
    return /^\d{4}$/.test(year) && Number(year) >= new Date().getFullYear();
}

export function validateDate(date) {
    if(!date) return false;
    return new Date(date) instanceof Date && !isNaN(new Date(date));
}

export function validateNumInstallments(numInstallments) {
    if(!numInstallments) return false;
    numInstallments = String(numInstallments);
    const numInstallmentsNumber = Number(numInstallments);
    return /^\d{1,2}$/.test(numInstallments) && numInstallmentsNumber >= 1 && numInstallmentsNumber <= 36;
}

export function getBankInfo(cardNumber) {
    return String(cardNumber)[1] <= 4 ? {
        url: WESTERN_BANK_API_ENDPOINT,
        bank: 'Western Bank',
    } : {
        url: EAST_BANK_API_ENDPOINT,
        bank: 'East Bank',
    };
}

export function getCardCategory(cardNumber) {
    return cardNumber[0];
}
