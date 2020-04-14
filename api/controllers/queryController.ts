import {Request, Response} from "express";
import * as queries from './queries';
import * as dbUtil from "../utils/postgres_connector";

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

    dbUtil.queryDB({
        query: query,
        params: params,
        callback: (data: any) => {
            let result = data.rows;
            res.status(200).send({message: 'success', response: result});
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
    let mediatype = '';
    if (req.params['mediatype'].toLowerCase() === 'audio' || req.params['mediatype'].toLowerCase() === 'a') {
        queryparams['mediatype'] = 'A';
        audioQueryExecute(res, queryparams);
    } else if (req.params['mediatype'] === 'video') {
        mediatype = 'V';
        const generatortype = queryparams['generatortype'];
        const model_name = queryparams['model_name'];
        const classnum = queryparams['classnum'];
        const jobID = req.params['jobID'];
        // @ts-ignore
        videoQueryExecute(res, mediatype, jobID, generatortype, model_name,
            classnum);
    }
};


export async function queryController(req: Request, res: Response) {
    await queryHandler(req, res)
}