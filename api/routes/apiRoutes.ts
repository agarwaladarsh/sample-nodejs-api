import {Router} from "express";
import {ingestionController} from "../controllers/ingestionController";
import {queryController} from "../controllers/queryController";
import * as endpoints from './endpoints';

export const ingestionRoute = Router().use(endpoints.ingestmetadata, ingestionController);
export const queryAudioRoute = Router().use(endpoints.queryAudiometadata, queryController);
export const queryVideoRoute = Router().use(endpoints.queryVideometadata, queryController);