/**
 * Add your endpoints in this file
 * */

// File Ingestion Endpoints
export const ingestmetadata = '/api/ingestmetadata';

// File Query Endpoints
export const querymetadata = '/api/querymetadata/:mediatype/';

// Video JobID Query Endpoints
export const queryjobid = '/api/querymetadata/:mediatype/:jobID/';