import {Request, Response} from "express";
import * as queries from './queries';
import * as dbUtil from '../utils/postgres_connector';
import request = require("request");

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
dbUtil.queryDB({
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
    dbUtil.queryDB({
        query: query,
        params: params,
        callback: (result: any) => {
            if (result['rows'].length > 0) {
                if (mediatype === 'A') {
                    // Update existing row
                    dbUtil.queryDB({
                        query: queries.updatejsonblob,
                        params: [inputfilename, mediatype, generatortype,
                            version, JSON.stringify(blob)],
                        callback: () => console.log(inputfilename, 'Audio Updated')
                    });
                } else if (mediatype === 'V') {
                    // Update/Append (merge) JSON blob
                    dbUtil.queryDB({
                        query: queries.mergeJsonBlob,
                        params: [inputfilename, mediatype, generatortype,
                            version, JSON.stringify(blob)],
                        callback: () => {
                            console.log(inputfilename, 'Video Merged');
                            dbUtil.queryDB({
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
                dbUtil.queryDB({
                    query: queries.ingestjsonblob,
                    params: [inputfilename, mediatype, generatortype,
                        JSON.stringify(blob), version,
                        jobdetails],
                    callback: () => {
                        console.log(inputfilename, 'Ingested');
                        if (mediatype === 'V') {
                            dbUtil.queryDB({
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
    res.status(200).send({message: 'success'});
};

export async function ingestionController(req: Request, res: Response) {

    await ingestionHandler(req, res);
}