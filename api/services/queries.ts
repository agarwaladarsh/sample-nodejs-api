/**
 * Add your queries in this file
 * */

export const getaccounts = `select * from account`;

export const addaccount = `insert into account values (default, $1, $2, $3, current_timestamp, null);`;

export const updateaccount = `update account
                              set username = $2, password = $3, email = $4
                              where user_id = $1;`;

export const ingestjsonblob = `insert into aggregated_metadata values (default, $1, $2, $3, $4, $5, current_timestamp)`;