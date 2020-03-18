/**
 * Add your queries in this file
 * */

export const getaccounts = `select * from account`;

export const addaccount = `insert into account values (default, $1, $2, $3, current_timestamp, null);`;

export const updateaccount = `update account
                              set username = $2, password = $3, email = $4
                              where user_id = $1;`;

export const ingestjsonblob = `insert into aggregated_metadata values (default, $1, $2, $3, $4, $5, current_timestamp)`;

export const queryjsonblob = `select * from aggregated_metadata where inputfilename like $1 and inputtype like $2 and generatortype like $3 and version = $4`;

export const updatejsonblob = `update aggregated_metadata set metadata = $5 where inputfilename like $1 and inputtype like $2 and generatortype like $3 and version = $4`;

export const genericAudioMetadataQuery = `select * from aggregated_metadata where inputtype like 'A'`;