import {Request, Response} from "express";
import * as queries from './queries';
import * as dbUtil from "../utils/postgres_connector";

/**
 * Query Function for audio metadata
 * @param res - Response Object
 * @param queryParams
 */
const audioQueryExecute = async function (res: Response, queryParams: any = {}) {

    let keysList = Object.keys(queryParams);
    let query = '';
    if (Object.keys(queryParams).indexOf('return_raw_metadata') >= 0) {
        keysList.splice(keysList.indexOf('return_raw_metadata'), 1);
        try {
            if (Boolean(queryParams['return_raw_metadata'])) {
                query = queries.genericAudioFileQuery;
            } else {
                query = queries.genericAudioMetadataQuery;
            }
        } catch (e) {
            res.status(400).send({message: 'Incorrect value for boolean parameter \'return_raw_metadata\''});
        }
    } else {
        query = queries.genericAudioMetadataQuery;
    }

    if (!queryParams['generatortype']) {
        return res.status(400).send({message: 'Missing required key \'generatortype\''});
    } else {
        keysList.splice(keysList.indexOf('generatortype'), 1);
        query += ' and am.generatortype like \'%' + queryParams['generatortype'] + '%\'';
    }

    if (queryParams['filename']) {
        let filenames = queryParams['filename'].split(',');
        keysList.splice(keysList.indexOf('filename'), 1);
        query += ' and am.inputfilename similar to \'(%' + filenames.join('%|%') + '%)\'';
    }

    if (queryParams['version']) {
        keysList.splice(keysList.indexOf('version'), 1);
        query += ' and am.version like \'%' + queryParams['version'] + '%\'';
    }

    if (keysList.length > 0) {
        for (const key of keysList) {
            query = await queryFilterTypes(queryParams, key, query);
            if (query.toLowerCase().indexOf('miss') >= 0) {
                return res.status(400).send({message: query});
            }
        }
    }
    // console.log(query);
    dbUtil.queryDB({
        query: query,
        params: [],
        callback: (data: any) => {
            let result = data.rows;
            return res.status(200).send({message: 'success', response: result});
        }
    });
};

const queryFilterTypes = function (queryParams: any, key: string, query: string) {
    return new Promise<string>((resolve, reject) => {
        dbUtil.queryDB({
            query: queries.genericAudioJSONFieldTypeCheck,
            params: [queryParams['generatortype'], key],
            callback: (data: any) => {
                if (data.rows[0]['jsonb_typeof'] === 'boolean') {
                    query +=
                        ' and (obj -> \'' + queryParams['generatortype'] + '\' -> \'' + key + '\')::boolean is ' + queryParams[key];
                } else if (data.rows[0]['jsonb_typeof'] === 'string') {
                    query +=
                        ' and (obj -> \'' + queryParams['generatortype'] + '\' -> \'' + key + '\') like \'%' + queryParams[key] + '%\''
                } else if (data.rows[0]['jsonb_typeof'] === 'number') {
                    let op = '<';
                    if (!queryParams['operator']) {
                        resolve('Missing Operator Key for numeric key filtering')
                    } else if (queryParams['operator'] === 'lt') {
                        op = '<';
                    } else if (queryParams['operator'] === 'gt') {
                        op = '>';
                    } else if (queryParams['operator'] === 'eq') {
                        op = '=';
                    }
                    query +=
                        ' and (obj -> \'' + queryParams['generatortype'] + '\' -> \'' + key + '\')::float ' + op + ' ' + queryParams[key];
                }
                resolve(query);
            }
        });
    });
}

/**
 * Query Function for video metadata
 * @param res - Response Object
 * @param mediatype - mediatype - 'V'
 * @param jobID - E.g. - '4326d86'
 * @param generatortype - E.g. - 'squeezenet'
 * @param model_name - E.g. - 'squeezeNet_deeperDSSD_face_TFv1.8_296x296_01162019'
 * @param classnum - E.g. - 1
 */
const videoQueryExecute = function (res: Response, mediatype: string,
    jobID: string = undefined,
    generatortype: string = '', model_name: string = '', classnum: number = -1) {
    let query = [queries.videoQueryForJobID, queries.videoQueryByJobID, queries.videoQueryByClass];
    let params = [mediatype];
    let queryIdx = 0;
    console.log(`jobID: ${jobID}`, `generatortype: ${generatortype}`, `model_name: ${model_name}`,
        `class: ${classnum}`);
    if (jobID !== undefined) {
        queryIdx = 1;
        params.push(jobID);
    } else if (generatortype !== '') {
        query[queryIdx] += 'and generatortype like $2';
        params.push(generatortype);
    } else if (classnum != -1) {
        queryIdx = 2;
        params.push(classnum.toString());
    } else if (model_name !== '') {
        query[queryIdx] += 'and jobdetails->>\'model_name\' like $2';
        params.push(model_name);
    }

    dbUtil.queryDB({
        query: query[queryIdx],
        params: params,
        callback: (data: any) => {
            let result = data.rows;
            res.status(200).send({message: 'success', response: result});
        }
    });
};

/**
 * Query Handler - Decides the query execute function to call based on mediatype
 * @param req - request object
 * @param res - response object
 */
const queryHandler = async function (req: Request, res: Response) {
    console.log(req.url);
    let queryparams = req.query;
    let mediatype = req.params['mediatype'].toLowerCase();

    if (mediatype === 'audio' || mediatype === 'a') {
        await audioQueryExecute(res, queryparams);
    } else if (mediatype === 'video' || mediatype === 'v') {
        mediatype = 'V';
        const generatortype = queryparams['generatortype'];
        const model_name = queryparams['model_name'];
        const classnum = queryparams['classnum'];
        const jobID = req.params['jobID'];
        // @ts-ignore
        videoQueryExecute(res, mediatype, jobID, generatortype, model_name, classnum);
    }
};


export async function queryController(req: Request, res: Response) {
    await queryHandler(req, res)
}