import * as http from 'http';
import express = require('express');
import {applyMiddleware, applyRoutes} from './utils';
import middleware from './middleware';
import routes from './services';
import path = require('path');

// OpenAPI Schema
import fs = require('fs');
import jsyaml = require('js-yaml');
import fileUpload = require('express-fileupload');
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
    controllers: '',
    checkControllers: false,
    strict: false,
    router: true,
    validator: true,
    docs: {
        apiDocs: '/api-docs',
        apiDocsPrefix: '',
        swaggerUi: '/docs',
        swaggerUiPrefix: ''
    },
    oasSecurity: false,
    oasAuth: false,
    ignoreUnknownFormats: true
};

oasTools.configure(options_object);

// Server Setup
const router = express();
const port = 5000;

router.use(fileUpload({
    createParentPath: true
}));
// oasTools.initialize(oasDoc, router, () => { // oas-tools version
applyMiddleware(middleware, router);
applyRoutes(routes, router);
const server = http.createServer(router);
server.listen(port, () => {
    let addr = server.address();
    let bind = (typeof addr === 'string') ? `pipe ${addr}` : `port ${addr.port}`;
    console.log(`Listening on ${bind}`);
});
// });

