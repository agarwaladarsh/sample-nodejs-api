"use strict";
exports.__esModule = true;
var app_1 = require("./app");
var http = require("http");
var port = 3070;
app_1["default"].set('port', port);
var server = http.createServer(app_1["default"]);
server.listen(port);
server.on('listening', function () {
    var addr = server.address();
    var bind = (typeof addr === 'string') ? "pipe " + addr : "port " + addr.port;
    console.log("Listening on " + bind);
});
module.exports = app_1["default"];
