import models from "./models.js";

export function selectClause(select) {
    const inserted = [];
    return `SELECT ${Object.keys(select).map(table => {
        if(select[table] === '*') select[table] = models[table];
        return select[table].map(field => {
            const sel = `${table}.${field}${inserted.includes(field) ? ` AS ${table}_${field}` : ''}`;
            inserted.push(field);
            return sel;
        }).join(', ');
    }).join(', ')}`;
}

export function joinClauses(joins) {
    return joins.join('\n');
}

export function whereClause(query) {
    const formatValue = value => isNaN(value) ? `'${value}'` : value;

    let where = '';
    let i = 0;
    
    for (const key in query) {
        where += i === 0 ? `WHERE` : ` AND`;
        
        if(typeof query[key] === 'object') { //if it's an array
            const conds = query[key].map(op => `${key} = ${formatValue(op)}`).join(' OR ');
            where += ` (${conds})`;
        } else {
            where += ` ${key} = ${formatValue(query[key])}`;
        }
        i++;
    }
    return where;
}

export function limitClause(query) {
    if(!query) return '';
    const { $offset, $limit } = query;
    return `LIMIT ${$offset ? $offset : 0}, ${$limit}`;
}

export function orderClause(query) {
    if(!query) return '';
    const { by, order } = query;
    return `ORDER BY ${by} ${order}`;
}
