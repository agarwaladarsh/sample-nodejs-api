/**
 * Add your endpoints in this file
 * */

// File Ingestion Endpoints
export const ingestmetadata = '/api/ingestmetadata';

// File Query Endpoints
export const queryAudiometadata = '/api/querymetadata/:mediatype';
export const queryVideometadata = '/api/querymetadata/:mediatype/:jobID?';