export function genReferenceNumber() {
    return +new Date() + '' + Math.floor(Math.random() * 1000000);
}
