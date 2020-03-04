import * as http from 'http';
import express = require('express');
import {applyMiddleware, applyRoutes} from './utils';
import middleware from './middleware';
import routes from './services';
// OpenAPI Schema
import path = require('path');
import fs = require('fs');
import jsyaml = require('js-yaml');
let oasTools = require('oas-tools');

process.on('uncaughtException', e => {
    console.log(e);
    process.exit(1);
});
process.on('unhandledRejection', e => {
    console.log(e);
    process.exit(1);
});

// OAS Setup: https://github.com/isa-group/oas-tools
let swaggerDocPath = path.join(__dirname, 'oasDoc.yaml');
let spec = fs.readFileSync(swaggerDocPath, 'utf8');
let oasDoc = jsyaml.safeLoad(spec);
var options_object = {
    checkControllers: false
};

oasTools.configure(options_object);

// Server Setup
const router = express();
const port = 5000;

oasTools.initialize(oasDoc, router, () => { // oas-tools version
    applyMiddleware(middleware, router);
    applyRoutes(routes, router);
    const server = http.createServer(router);
    server.listen(port, () => {
        let addr = server.address();
        let bind = (typeof addr === 'string') ? `pipe ${addr}` : `port ${addr.port}`;
        console.log(`Listening on ${bind}`);
    });
});

