import * as http from "http";
import express = require("express");
import {applyMiddleware, applyRoutes} from './utils';
import middleware from './middleware';
import routes from './services';

process.on("uncaughtException", e => {
    console.log(e);
    process.exit(1);
});
process.on("unhandledRejection", e => {
    console.log(e);
    process.exit(1);
});

const port = 5000;
const router = express();
applyMiddleware(middleware, router);
applyRoutes(routes, router);

const server = http.createServer(router);
server.listen(port, () => {
    let addr = server.address();
    let bind = (typeof addr === 'string') ? `pipe ${addr}` : `port ${addr.port}`;
    console.log(`Listening on ${bind}`);
});