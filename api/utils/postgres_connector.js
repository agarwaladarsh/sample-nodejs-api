"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var pg = require("pg");
var db_config_1 = require("../config/db_config");
var pool = new pg.Pool(db_config_1.dbconfig);
console.log("DB Connection Settings: " + JSON.stringify(db_config_1.dbconfig));
/**
 * Single Query to Postgres
 * @param sql: the query for store data
 * @param data: the data to be stored
 * @return result
 */
exports.sqlToDB = function (sql, data) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        console.log("sqlToDB() sql: " + sql + " | data: " + data);
        try {
            return [2 /*return*/, pool.query(sql, data)];
        }
        catch (error) {
            throw new Error(error.message);
        }
        return [2 /*return*/];
    });
}); };
/**
 * Retrieve a SQL client with transaction from connection pool. If the client is valid, either
 * COMMMIT or ROALLBACK needs to be called at the end before releasing the connection back to pool.
 */
exports.getTransaction = function () { return __awaiter(void 0, void 0, void 0, function () {
    var client, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                console.log("getTransaction()");
                return [4 /*yield*/, pool.connect()];
            case 1:
                client = _a.sent();
                _a.label = 2;
            case 2:
                _a.trys.push([2, 4, , 5]);
                return [4 /*yield*/, client.query('BEGIN')];
            case 3:
                _a.sent();
                return [2 /*return*/, client];
            case 4:
                error_1 = _a.sent();
                throw new Error(error_1.message);
            case 5: return [2 /*return*/];
        }
    });
}); };
/**
 * Rollback transaction
 */
exports.rollback = function (client) { return __awaiter(void 0, void 0, void 0, function () {
    var error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!(typeof client !== 'undefined' && client)) return [3 /*break*/, 7];
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, 4, 6]);
                console.log("sql transaction rollback");
                return [4 /*yield*/, client.query('ROLLBACK')];
            case 2:
                _a.sent();
                return [3 /*break*/, 6];
            case 3:
                error_2 = _a.sent();
                throw new Error(error_2.message);
            case 4: return [4 /*yield*/, client.end()];
            case 5:
                _a.sent();
                return [7 /*endfinally*/];
            case 6: return [3 /*break*/, 8];
            case 7:
                console.log("rollback() not excuted. client is not set");
                _a.label = 8;
            case 8: return [2 /*return*/];
        }
    });
}); };
/**
 * Commit transaction
 */
exports.commit = function (client) { return __awaiter(void 0, void 0, void 0, function () {
    var error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                console.log("sql transaction committed");
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, 4, 6]);
                return [4 /*yield*/, client.query('COMMIT')];
            case 2:
                _a.sent();
                return [3 /*break*/, 6];
            case 3:
                error_3 = _a.sent();
                throw new Error(error_3.message);
            case 4: return [4 /*yield*/, client.end()];
            case 5:
                _a.sent();
                return [7 /*endfinally*/];
            case 6: return [2 /*return*/];
        }
    });
}); };
