import {Request, Response} from "express";
import * as endpoints from './endpoints';
import * as dbUtil from "../utils/postgres_connector";
import * as queries from './queries';
import * as formidable from 'formidable';
import * as fs from 'fs';
import path = require("path");
import request = require("request");

const appDir = path.dirname(require.main.filename);

const ingestJSONFile = function (req: Request, res: Response) {
    var form = new formidable.IncomingForm();
    // form.uploadDir = this.directory;
    form.keepExtensions = true;
    form.type = 'multipart';

    form.parse(req);

    form.on('fileBegin', function (name, file) {
        file.path = appDir + '/uploads/' + file.name;
    });

    form.on('file', function (name, file) {
        console.log('Uploaded ' + file.name);

        // @ts-ignore
        const data = JSON.parse(fs.readFileSync(appDir + '/uploads/' + file.name));

        const inputfilename = data['input_filename'];
        const blob = data['result'];

        let params = [inputfilename, 'A', '', JSON.stringify(blob), 1.0];
        dbUtil.sqlToDB(queries.ingestjsonblob, params).then(data => {
            console.log('Done ', file.name);
        }).catch(err => {
            throw new Error(err)
        });
    });
};

export default [
    {
        path: "/",
        method: "get",
        handler: async (req: Request, res: Response) => {
            res.send("Hello world !");
        }
    },
    {
        path: endpoints.getaccount,
        method: 'get',
        handler: async (req: Request, res: Response) => {
            dbUtil.sqlToDB(queries.getaccounts, []).then(data => {
                let result = data.rows;
                res.status(200).json({message: result});
            }).catch(err => {
                throw new Error(err)
            });
        }
    },
    {
        path: endpoints.addaccount,
        method: 'post',
        handler: async (req: Request, res: Response) => {
            let reqbody = req.body;
            let params = [reqbody['username'], reqbody['password'], reqbody['email']];
            dbUtil.sqlToDB(queries.addaccount, params).then(data => {
                let result = data.rows;
                res.status(200).json({message: result});
            }).catch(err => {
                throw new Error(err)
            });
        }
    },
    {
        path: endpoints.updateaccount,
        method: 'post',
        handler: async (req: Request, res: Response) => {
            let reqbody = req.body;
            console.log(reqbody);
            let params = [reqbody['user_id'], reqbody['username'], reqbody['password'], reqbody['email']];
            dbUtil.sqlToDB(queries.updateaccount, params).then(data => {
                let result = data.rows;
                res.status(200).json({message: result});
            }).catch(err => {
                throw new Error(err)
            });
        }
    },
    {
        path: endpoints.ingestmetadata,
        method: 'post',
        handler: async (req: Request, res: Response) => {
            let reqbody = req.body;
            let listURLs = reqbody['blobs'];

            for (const b of listURLs) {
                request(b, {json: true}, (err, resp, body) => {
                    if (err) {
                        return console.log(err);
                    }
                    const data = body;
                    const inputfilename = data['input_filename'];
                    const blob = data['result'];

                    let params = [inputfilename, 'A', 'ch', JSON.stringify(blob), 1.0];
                    dbUtil.sqlToDB(queries.ingestjsonblob, params).then(data => {
                        console.log('Ingested');
                    }).catch(err => {
                        throw new Error(err)
                    });
                });
            }
            res.status(200).json({message: 'success'});
        }
    }
];