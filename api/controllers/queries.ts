/**
 * Add your queries in this file
 */

/***** Generic Queries *****/
export const ingestjsonblob = `
    insert into aggregated_metadata
    values (default, $1, $2, $3, $4, $5, $6, '{}', current_timestamp)
`;
export const queryjsonblob = `
    select *
    from aggregated_metadata
    where inputfilename like $1
      and mediatype like $2
      and generatortype like $3
      and version = $4
`;


/***** Audio-Specific Queries *****/
export const updatejsonblob = `
    update aggregated_metadata
    set metadata = $5
    where inputfilename like $1
      and mediatype like $2
      and generatortype like $3
      and version = $4
`;
export const genericAudioMetadataQuery = `
    select distinct am.inputfilename, am.mediatype, am.generatortype, am.version, am.ingested_date_time, am.metadata
    from aggregated_metadata am,
         jsonb_array_elements(am.metadata -> 'result') obj
    where am.mediatype like 'A'
`;
export const genericAudioFileQuery = `
    select distinct inputfilename, mediatype, generatortype, version, ingested_date_time
    from aggregated_metadata am,
         jsonb_array_elements(am.metadata -> 'result') obj
    where am.mediatype like 'A'
`;
export const genericAudioJSONFieldTypeCheck = `
    select distinct jsonb_typeof(obj -> $1 -> $2)
    from aggregated_metadata am,
         jsonb_array_elements(am.metadata -> 'result') obj
    where am.mediatype like 'A'
      and am.generatortype like $1
    limit 1;
`;

/***** Video-Specific Queries *****/

// update aggregated_metadata 
// set classfrequencies = classfrequencies::jsonb || $3::jsonb
// where
// mediatype like $1 and
// jobdetails->>'jobID' like $2
export const updateClassFrequencies = `
    SELECT update_class_frequencies($1, $2, $3)
`;
// Video version of updatejsonblob()
export const mergeJsonBlob = `
    update aggregated_metadata 
    set metadata = jsonb_deep_merge(metadata, $5::jsonb)
    where 
    inputfilename like $1 and 
    mediatype like $2 and 
    generatortype like $3 and 
    version = $4
`;
// Return jobIDs by either generatortype, model_name, or classnum
// jobIDs accessed by results[0].jobids
export const videoQueryForJobID = `
    select coalesce(jsonb_agg(jobdetails->'jobID'), '[]'::jsonb) as jobIDs
    from aggregated_metadata
    where 
    mediatype like $1
`;
// Return entire row entries by jobID
export const videoQueryByJobID = `
    select * from aggregated_metadata
    where 
    mediatype like $1 and
    jobdetails->>'jobID' like $2
`;
// Returns the frequency of class for each jobID
// Key: jobID, Value: Frequency
export const videoQueryByClass = `
    select coalesce(jsonb_object_agg(jobdetails->>'jobID', classfrequencies->$2), '[]'::jsonb) as classfrequencies
    from aggregated_metadata
    where 
    mediatype like $1 and
    classfrequencies->$2 is not null
`;

export const psql_init_functions = `
    /*
     * Helper function for mergejsonblob()
     * Merge top and second level nested jsonb to update nodeid blob
     * Source: https://stackoverflow.com/questions/42944888/merging-jsonb-values-in-postgresql/42954907#42954907
     */
    create or replace function jsonb_deep_merge(a jsonb, b jsonb)
    returns jsonb language sql as $$
        select jsonb_object_agg(
            coalesce(ka, kb), 
            case 
                when va isnull then vb 
                when vb isnull then va 
                else va || vb 
            end
        )
        from jsonb_each(a) e1(ka, va)
        full join jsonb_each(b) e2(kb, vb) on ka = kb
    $$;

    /*
     * Helper function for updateMetadataDetails()
     * Update class frequencies based on recently ingested blob
     */    
    create or replace function update_class_frequencies(media_type text, jobID text, count jsonb)
    returns void language plpgsql as $$
    declare 
        _class   text;
        _count   int;
    begin
        -- Obtain all classes in ingested blob
        for _class, _count in select * from jsonb_each($3)
        loop
            -- Update class frequencies for each unique class
            update aggregated_metadata
            set classfrequencies = jsonb_set(classfrequencies::jsonb, 
                                            array[_class], 
                                            (coalesce(classfrequencies->>_class,'0')::int + _count)::text::jsonb)
            where
            mediatype like $1 and
            jobdetails->>'jobID' like $2;
        end loop;
    end
    $$;
`;

// Not used: isolate each classnum
// jsonb_array_elements(jsonb_array_elements(n.blob)) from (
//     select ((t#>>'{}')::jsonb->>'classes')::jsonb as blob from (
//         select i.v->jsonb_object_keys(i.v) as t 
//         from jsonb_each($3) as i(k,v)
//     ) m
// ) n

// Not used: query for classnum
// `
// and jobdetails->'jobID' in 
// (
//     select j from
//     (select ((t->jsonb_object_keys(t)#>>'{}')::jsonb->>'classes')::jsonb as blob, j
//         from (select metadata->jsonb_object_keys(metadata::jsonb) as t, jobdetails->'jobID' as j
//             from aggregated_metadata
//         ) m
//     ) p where exists (select 1 from 
//         jsonb_array_elements(p.blob) as u
//         where u @> $2
//     )
// )
// `