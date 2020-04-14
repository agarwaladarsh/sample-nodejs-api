import * as pg from 'pg';
import {dbconfig} from '../config/db_config'

const pool = new pg.Pool(dbconfig);
console.log(`DB Connection Settings: ${JSON.stringify(dbconfig)}`);


/**
 * Interface and function for calls to dbUtil.sqlToDB()
 * */
interface sqlToDBParams {
    query: string;
    params?: string[];
    callback?: Function;
}

/**
 * common function for executing queries on the database
 * @param input - parameters for postgres utility function
 */
export const queryDB = function (input: sqlToDBParams) {
    sqlToDB(input.query, input.params).then(
        result => {
            if (input.callback) input.callback(result);
        }
    ).catch(err => {
        throw new Error(err)
    });
};

/**
 * Single Query to Postgres
 * @param sql: the query for store data
 * @param data: the data to be stored
 * @return result
 */
export const sqlToDB = async (sql: string, data: string[]) => {
    try {
        return pool.query(sql, data)

    } catch (error) {
        throw new Error(error.message);
    }
};

/**
 * Retrieve a SQL client with transaction from connection pool. If the client is valid, either
 * COMMIT or ROLLBACK needs to be called at the end before releasing the connection back to pool.
 */
export const getTransaction = async () => {
    // @ts-ignore
    const client: pg.Client = await pool.connect();
    try {
        await client.query('BEGIN');
        return client;
    } catch (error) {
        throw new Error(error.message);
    }
};

/**
 * Rollback transaction
 */
export const rollback = async (client: pg.Client) => {
    if (typeof client !== 'undefined' && client) {
        try {
            console.log(`sql transaction rollback`);
            await client.query('ROLLBACK');
        } catch (error) {
            throw new Error(error.message);
        } finally {
            await client.end();
        }
    } else {
        console.log(`rollback() not excuted. client is not set`);
    }
};

/**
 * Commit transaction
 */
export const commit = async (client: pg.Client) => {
    console.log(`sql transaction committed`);
    try {
        await client.query('COMMIT');
    } catch (error) {
        throw new Error(error.message);
    } finally {
        await client.end();
    }
};