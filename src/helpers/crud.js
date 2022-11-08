import pool from "../services/db.js";
import { joinClauses, limitClause, orderClause, selectClause, whereClause } from "./queryHelpers.js";

export async function deleteOne(table, where, conn=pool) {
    const result = (await conn.query(`
        DELETE FROM ${table}
        ${whereClause(where)}
        LIMIT 1;
    `))[0];
    if(!result.affectedRows) throw new Error('Not found');
}

export async function readOne(table, select, joins, where, conn=pool) {
    const elements = (await conn.query(`
        ${selectClause(select)}
        FROM ${table}
        ${joinClauses(joins)}
        ${whereClause(where)}
        LIMIT 1;
    `))[0];
    if(!elements.length) throw new Error('Not found');
    return elements[0];
}

export async function readMany(table, select, joins, where, limit, order, conn=pool) {
    return (await conn.query(`
        ${selectClause(select)}
        FROM ${table}
        ${joinClauses(joins)}
        ${whereClause(where)}
        ${limitClause(limit)}
        ${orderClause(order)};
    `))[0];
}

export async function createOne(table, element, conn=pool) {
    return (await conn.query(`
        INSERT INTO ${table} (${Object.keys(element).join(', ')})
        VALUES (${Object.keys(element).map(() => '?').join(', ')});
    `, Object.values(element)))[0];
}

export async function updateOne(table, element, where, conn=pool) {
    const result = (await conn.query(`
        UPDATE ${table}
        SET ${Object.keys(element).map(key => `${key} = ?`).join(', ')}
        ${whereClause(where)}
        LIMIT 1;
    `, Object.values(element)))[0];
    if(!result.affectedRows) throw new Error('Not found');
}
