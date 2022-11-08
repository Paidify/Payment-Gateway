export function removeUndefined(obj) {
    return Object.keys(obj).reduce((acc, key) => {
        if (obj[key] !== undefined) {
            acc[key] = obj[key];
        }
        return acc;
    }, {});
}

export function hasUndefined(obj) {
    return Object.keys(obj).some(key => obj[key] === undefined);
}

export function genReferenceNumber() {
    return +new Date() + '' + Math.floor(Math.random() * 1000000);
}
