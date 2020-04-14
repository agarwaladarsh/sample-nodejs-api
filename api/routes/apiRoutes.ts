import {Router} from "express";
import {ingestionController} from "../controllers/ingestionController";
import {queryController} from "../controllers/queryController";
import * as endpoints from './endpoints';

export const ingestionRoute = Router().use(endpoints.ingestmetadata, ingestionController);

export const queryRoute = Router().use(endpoints.querymetadata, queryController);
