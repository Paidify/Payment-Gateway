export function selectClause(select) {
    if(!select) return 'SELECT *';

    const inserted = [];
    return `SELECT ${Object.keys(select).map(table => {
        return select[table].map(field => {
            const sel = `${table}.${field}${inserted.includes(field) ? ` AS ${table}_${field}` : ''}`;
            inserted.push(field);
            return sel;
        }).join(', ');
    }).join(', ')}`;
}

export function joinClauses(joins) {
    return joins ? joins.join('\n') : '';
}

export function whereClause(query) {
    if(!query) return '';
    
    const formatValue = value => isNaN(value) ? `'${value}'` : value;

    const logicOp = query.$or ? ' OR' : ' AND';
    delete query.$or;
    let where = '';
    let i = 0;
    
    for (const key in query) {
        where += i === 0 ? `WHERE` : logicOp;
        
        const field = query[key];
        if(typeof field === 'object') { //if it's an array
            const conds = field.map(op => `${key} = ${formatValue(op)}`).join(' OR ');
            where += ` (${conds})`;
        } else {
            where += ` ${key} = ${formatValue(field)}`;
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
