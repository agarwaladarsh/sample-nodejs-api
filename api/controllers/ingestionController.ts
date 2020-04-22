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
 * Update Class Frequencies
 * @param blob
 * @param mediatype
 * @param jobdetails
 */
const updateClassFrequencies = function (blob: any, mediatype: string, jobdetails: any) {
    let count: any = {};
    for (let nodeid of Object.keys(blob)) {
        for (let timestamp of Object.keys(blob[nodeid])) {
            let classes = JSON.parse(blob[nodeid][timestamp])["classes"];
            for (let i = 0; i < classes.length; i++) {
                classes[i].forEach((c: number) => {
                    count[c] = count[c] ? count[c] + 1 : 1;
                });
            }
        }
    }
    dbUtil.queryDB({
        query: queries.updateClassFrequencies,
        params: [mediatype, jobdetails['jobID'], JSON.stringify(count)],
        callback: () => console.log("Updated Class Frequency")
    });
};

/**
 * Initialization: Create psql function jsonb_deep_merge() for use in mergejsonblob()
 * */
dbUtil.queryDB({
    query: queries.psql_init_functions
});

/**
 * Ingestion File Resolver Class for file names and actions
 */
class IngestionResolve {
    public filename: string;
    public file_action: string;

    constructor(filename: string, file_action: string) {
        this.filename = filename;
        this.file_action = file_action;
    }

}

/**
 * Ingestion Execution Function - takes in json blob, checks if already present, updates if already present, adds if needed
 * @param data - json blob
 * @param mediatype - audio/video
 * @param generatortype
 */
const ingestionExecute = function (data: any,
    mediatype: string,
    generatortype: string = ''): Promise<IngestionResolve> {

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

    let version = data['version'] || '1.0';

    let query = queries.queryjsonblob;
    let params = [inputfilename, mediatype, generatortype, version];

    if (mediatype === 'V') {
        query += 'and jobdetails->>\'jobID\' like $5';
        params.push(jobdetails['jobID']);
        console.log(data);
    }

    // Check for existing metadata for filename
    return new Promise<IngestionResolve>((resolve, reject) => {
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
                            callback: () => {
                                resolve({filename: inputfilename, file_action: 'updated'});
                                console.log(inputfilename, 'Audio Updated');
                            }
                        });
                    } else if (mediatype === 'V') {
                        // Update/Append (merge) JSON blob
                        dbUtil.queryDB({
                            query: queries.mergeJsonBlob,
                            params: [inputfilename, 'V', generatortype,
                                version, JSON.stringify(blob)],
                            callback: () => {
                                console.log(inputfilename, 'Video Merged');
                                updateClassFrequencies(blob, mediatype, jobdetails);
                                resolve({filename: inputfilename, file_action: 'class frequency updated'});
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
                                updateClassFrequencies(blob, mediatype, jobdetails);
                            }
                            resolve({filename: inputfilename, file_action: 'ingested'});
                        }
                    });
                }
            }
        });
    });

};

/**
 * Ingestion Handler function - decides the kind of ingestion based on request type
 * @param req - request object
 * @param res - response object
 */
const ingestionHandler = async function (req: Request, res: Response) {
    // Check for content type of request
    const headers = req.headers;

    if (headers['content-type'].includes('json')) {
        // Validation: require mediatype and generatortype for all input JSON
        let reqbody = req.body;
        if (!reqbody['mediatype']) {
            return res.status(400).send({message: 'Missing Key \'mediatype\''});
        }
        if (!reqbody['generatortype']) {
            return res.status(400).send({message: 'Missing Key \'generatortype\''});
        }
        let {mediatype, generatortype} = reqbody;
        if (mediatype.toLowerCase() === 'a' || mediatype.toLowerCase() === 'audio') {
            mediatype = 'A';
        } else if (mediatype.toLowerCase() === 'v' || mediatype.toLowerCase() === 'video') {
            mediatype = 'V'
        } else {
            return res.status(400).send({message: 'Invalid Media Type'});
        }

        // Ingestion
        if (Object.keys(reqbody).indexOf('presignedURLs') >= 0) {
            // List of Pre-signed URLs
            let fileresponselist: IngestionResolve[] = [];
            if (reqbody['presignedURLs'].length > 0) {
                for (const url of reqbody['presignedURLs']) {
                    request(url, {json: true}, async (err, resp, body) => {
                        if (err) return res.status(400).send({message: err});
                        if (!body['metadata']) {
                            return res.status(200).send({
                                message: 'JSON must have a key named \'metadata\' which will contain' +
                                    ' the actual metadata to be ingested'
                            })
                        }
                        const fileResponse = await ingestionExecute(body['metadata'], mediatype,
                            generatortype.toLowerCase());
                        fileresponselist.push(fileResponse);
                        reqbody['presignedURLs'].splice(reqbody['presignedURLs'].indexOf(url), 1);
                        if (reqbody['presignedURLs'].length === 0) {
                            return res.status(200).send({message: 'success', response: fileresponselist});
                        }
                    });
                }
            } else {
                return res.status(200).send({message: 'Empty List of Pre-signed URLs'})
            }
        } else {
            // Pure JSON
            if (!reqbody['metadata']) {
                return res.status(200).send({
                    message: 'JSON must have a key named \'metadata\' which will contain' +
                        ' the actual metadata to be ingested'
                })
            }
            const fileresponse = await ingestionExecute(reqbody['metadata'], mediatype, generatortype.toLowerCase());
            return res.status(200).send({message: 'success', response: fileresponse});
        }
    } else {
        return res.status(400).send({message: 'Invalid Request Body Format'});
    }
};

export async function ingestionController(req: Request, res: Response) {
    await ingestionHandler(req, res);
}