import {Request, Response} from "express";
import * as endpoints from './endpoints';
import * as dbUtil from "../utils/postgres_connector";

export default [
    {
        path: "/",
        method: "get",
        handler: async (req: Request, res: Response) => {
            res.send("Hello world!");
        }
    },
    {
        path: endpoints.getaccount,
        method: 'get',
        handler: async (req: Request, res: Response) => {
            dbUtil.sqlToDB('select * from account', []).then(data => {
                let result = data.rows;
                res.status(200).json({message: result});
            }).catch(err => {
                throw new Error(err)
            });
        }
    }
];