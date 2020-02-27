/**
 * Add your queries in this file
 * */

export const getaccounts = 'select * from account';
export const addaccount = 'insert into account values (default, $1, $2, $3, current_timestamp, null);';