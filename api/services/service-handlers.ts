import {Request, Response} from "express";
import * as endpoints from './endpoints';
import * as dbUtil from "../utils/postgres_connector";
import * as queries from './queries';
import request = require("request");

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
const sqlToDB = function (input: sqlToDBParams) {
    dbUtil.sqlToDB(input.query, input.params).then(
        result => {
            if (input.callback) input.callback(result);
        }
    ).catch(err => {
        throw new Error(err)
    });
};

/**
 * JSON cleanup function
 * @param json - JSON object as a string
 */
const cleanUpJSON = function (json = "") {
    let outputjson = json;
    outputjson = outputjson.replace(/'/g, '"');
    outputjson = outputjson.replace(/True/g, 'true');
    outputjson = outputjson.replace(/None/g, 'false');
    outputjson = outputjson.replace(/False/g, 'false');

    return outputjson;
};

/**
 * Initialization: Create psql function jsonb_deep_merge() for use in mergejsonblob()
 * */
sqlToDB({
    query: queries.psql_init_functions
});

/**
 * Ingestion Execution Function - takes in json blob, checks if already present, updates if already present, adds if needed
 * @param data - json blob
 * @param mediatype - audio/video
 * @param generatortype
 */
const ingestionExecute = function (data: any,
    mediatype: string,
    generatortype: string = '') {

    // Initializing parameters for queries
    // Audio Defaults
    let inputfilename = data['input_filename'] || data['filename'];
    // Video Defaults
    let jobdetails = {
        'model_name': '',
        'signedUrls': [''],
        'jobID': ''
    };
    let blob = data;
    if (mediatype === 'A') {
        if (Object.keys(data).indexOf('result') >= 0) {
            if (Object.keys(blob['result'][0]).indexOf('predictions') < 0) {
                generatortype = 'characterization';
                for (let obj of blob['result']) {
                    obj['characterization'] =
                        JSON.parse(cleanUpJSON(obj['characterization']));
                }
            } else {
                generatortype = 'classification';
            }
        } else {
            generatortype = 'transcription';
        }


    } else if (mediatype === 'V') {
        inputfilename = '';
        blob = data['output']; // Vulcan output
        jobdetails = {
            'model_name': data['model_name'],
            'signedUrls': data['signedUrls'],
            'jobID': data['jobID']
        };
    }

    let version = '1.0';
    if (Object.keys(data).indexOf('version') > 0) {
        version = data['version'];
    }

    let query = queries.queryjsonblob;
    let params = [inputfilename, mediatype, generatortype, version];

    if (mediatype == 'V') {
        query += 'and jobdetails->>\'jobID\' like $5';
        params.push(jobdetails['jobID']);
    }
    // Check for existing metadata for filename
    sqlToDB({
        query: query,
        params: params,
        callback: (result: any) => {
            if (result['rows'].length > 0) {
                if (mediatype === 'A') {
                    // Update existing row
                    sqlToDB({
                        query: queries.updatejsonblob,
                        params: [inputfilename, mediatype, generatortype,
                            version, JSON.stringify(blob)],
                        callback: () => console.log(inputfilename, 'Audio Updated')
                    });
                } else if (mediatype === 'V') {
                    // Update/Append (merge) JSON blob
                    sqlToDB({
                        query: queries.mergeJsonBlob,
                        params: [inputfilename, mediatype, generatortype,
                            version, JSON.stringify(blob)],
                        callback: () => {
                            console.log(inputfilename, 'Video Merged');
                            sqlToDB({
                                query: queries.updateMetaDetails,
                                params: [mediatype, jobdetails['jobID'],
                                    JSON.stringify(blob)],
                                callback: () => console.log(inputfilename,
                                    "Updated Class Frequency")
                            });
                        }
                    });
                }
            } else {
                // Add new row
                sqlToDB({
                    query: queries.ingestjsonblob,
                    params: [inputfilename, mediatype, generatortype,
                        JSON.stringify(blob), version,
                        jobdetails],
                    callback: () => {
                        console.log(inputfilename, 'Ingested');
                        if (mediatype === 'V') {
                            sqlToDB({
                                query: queries.updateMetaDetails,
                                params: [mediatype, jobdetails['jobID'],
                                    JSON.stringify(blob)],
                                callback: () => console.log(inputfilename,
                                    "Updated Class Frequency")
                            });
                        }
                    }
                });
            }
        }
    });
};

/**
 * Ingestion Handler function - decides the kind of ingestion based on request type
 * @param req - request object
 * @param res - response object
 */
const ingestionHandler = async function (req: Request, res: Response) {
    console.log(req.url);
    // Check for content type of request
    const headers = req.headers;
    let reqbody = req.body;
    let mediatype = reqbody['mediatype'];
    let generatortype = reqbody['generatortype'];
    if (mediatype == 'A') {
        // Presigned URLs
        if (headers['content-type'].includes('json') && Object.keys(reqbody)
            .indexOf('blobs') >= 0) {

            // List of Pre-signed URLs
            let listURLs = reqbody['blobs'];
            for (const b of listURLs) {
                request(b, {json: true}, (err, resp, body) => {
                    if (err) return console.log(err);
                    ingestionExecute(body, mediatype, generatortype);
                });
            }
        } else {
            // Pure JSON
            ingestionExecute(reqbody, mediatype, generatortype);
        }
        // else if (headers['content-type'].includes('form')) {
        //     let files = req.files;
        //     Object.keys(files).forEach(key => {
        //         let file = files[key];
        //         // @ts-ignore
        //         const data = JSON.parse(file['data']);
        //         ingestionExecute(data, mediatype, generatortype);
        //     });
        // }
    } else if (mediatype == 'V') {
        // Pure JSON
        if (headers['content-type'].includes('json')) {
            ingestionExecute(reqbody, mediatype, generatortype);
        }
    }
    res.status(200).json({message: 'success'});
};

/**
 * Query Function for audio metadata
 * @param res - Response Object
 * @param queryParams
 */
const audioQueryExecute = function (res: Response, queryParams: any = {}) {

    let query = queries.genericAudioMetadataQuery;
    let params = [queryParams['mediatype'], queryParams['generatortype'],
        queryParams['version'] || '1.0'];
    if (Object.keys(queryParams).indexOf('filename') >= 0) {
        query += 'and inputfilename like concat(\'%\',$4::text, \'%\')';
        params.push(queryParams['filename']);
    }

    sqlToDB({
        query: query,
        params: params,
        callback: (data: any) => {
            let result = data.rows;
            res.status(200).json({message: result});
        }
    });
};

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
    let query = [queries.videoQueryForJobID, queries.videoQueryByJobID];
    let params = [mediatype];
    let queryIdx = 0;
    console.log(jobID, generatortype, model_name, classnum);
    if (jobID !== undefined) {
        queryIdx = 1;
        params.push(jobID);
    } else if (generatortype !== '') {
        query[queryIdx] += 'and generatortype like $2';
        params.push(generatortype);
    } else if (classnum != -1) {
        query[queryIdx] += `and metadatadetails->$2 is not null`;
        params.push(classnum.toString());
    } else if (model_name !== '') {
        query[queryIdx] += 'and jobdetails->>\'model_name\' like $2';
        params.push(model_name);
    }

    sqlToDB({
        query: query[queryIdx],
        params: params,
        callback: (data: any) => {
            let result = data.rows;
            res.status(200).json({message: result});
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
    let mediatype = '';
    if (req.params['mediatype'] === 'audio') {
        queryparams['mediatype'] = 'A';
        audioQueryExecute(res, queryparams);
    } else if (req.params['mediatype'] === 'video') {
        mediatype = 'V';
        const generatortype = queryparams['generatortype'];
        const model_name = queryparams['model_name'];
        const classnum = queryparams['classnum'];
        const jobID = req.params['jobID'];
        videoQueryExecute(res, mediatype, jobID, generatortype, model_name,
            classnum);
    }
};

export default [
    {
        path: "/",
        method: "get",
        handler: async (req: Request, res: Response) => {
            res.send("Blank Sample URL");
        }
    },
    {
        path: endpoints.ingestmetadata,
        method: 'post',
        handler: ingestionHandler
    },
    {
        path: endpoints.querymetadata,
        method: 'get',
        handler: queryHandler
    },
    {
        path: endpoints.queryjobid,
        method: 'get',
        handler: queryHandler
    }
];