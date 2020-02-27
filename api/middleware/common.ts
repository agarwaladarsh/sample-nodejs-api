import {Router} from "express";
import cors from "cors";
import parser from "body-parser";
import compression from "compression";

/**
 * CORS Handler
 * @param router - Router instance
 * */
export const handleCors = (router: Router) =>
    router.use(cors({credentials: true, origin: true}));


/**
 * Body Request Parsing Handler
 * @param router - Router instance
 * */
export const handleBodyRequestParsing = (router: Router) => {
    router.use(parser.urlencoded({extended: true}));
    router.use(parser.json());
};

/**
 * Compression Handler
 * @param router - Router instance
 * */
export const handleCompression = (router: Router) => {
    router.use(compression());
};