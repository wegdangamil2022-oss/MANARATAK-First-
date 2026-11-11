import assert from 'node:assert/strict';
import {NativeExternalCourseImportClient} from './native-external-course-import-client.mjs';
import {courseTransportStatement} from './course-import-transport.mjs';
export const scholarshipDraftTables = ['Scholarship','ScholarshipBenefit','ScholarshipDegreeTarget','ScholarshipMajorTarget','ScholarshipEligibilityItem','ScholarshipRequiredDocument','ScholarshipSourceEvidence','ScholarshipUniversityLink','ScholarshipSponsorContext','ScholarshipApplicationCycle','ScholarshipVersion','ScholarshipEligibilityRuleVersion','ScholarshipAwardPackageVersion'];
/** Narrow append-only transport for the frozen output of the owner repository.
 * No upsert, deletion, DDL or publication operation is exposed here. */
export class NativeScholarshipDraftClient extends NativeExternalCourseImportClient {
  async copyScholarshipGraph(graphs) {
    const statements=[];
    for(const table of scholarshipDraftTables){const input=graphs.flatMap(graph=>graph[table]??[]);
      for(let offset=0;offset<input.length;offset+=200){const rows=JSON.parse(JSON.stringify(input.slice(offset,offset+200))),keys=[...new Set(rows.flatMap(Object.keys))];
        const values=rows.map(row=>Object.fromEntries(keys.map(key=>[key,row[key]??null])));
        const sql=courseTransportStatement(table,keys,values).sql;
        statements.push(sql.replace(/SELECT jsonb_build_object\('copied',\d+\);$/u,''));
      }
    }
    assert.ok(statements.length>0);
    try { await this.send(statements.join('\n')+"\nSELECT 'true'::jsonb;"); }
    catch (error) {
      // A stopped psql input pipe can hide the preceding SQL error as write EOF.
      // Preserve its category so a uniqueness/validation failure is not retried
      // as a transient connection problem. SQL payloads stay out of the error.
      const category = this.errors?.match(/^ERROR:\s*(.+)$/mu)?.[1];
      if (category) throw new Error('SCHOLARSHIP_DRAFT_WRITE_FAILED:' + category);
      throw error;
    }
  }
  async copyScholarshipRows(table, rows) {
    assert.ok(scholarshipDraftTables.includes(table));assert.ok(rows.length>0 && rows.length<=1000);
    const clean=JSON.parse(JSON.stringify(rows)),keys=[...new Set(clean.flatMap(Object.keys))];
    const values=clean.map(row=>Object.fromEntries(keys.map(key=>[key,row[key]??null])));
    const result=await this.send(courseTransportStatement(table,keys,values).sql);assert.equal(result.copied,rows.length);
  }
  async assertDraftSources(records) {
    assert.ok(records.length>0&&records.length<=25);
    const transport=courseTransportStatement('ImportRecord',['id'],records);
    const insertion='INSERT INTO "ImportRecord" ("id") SELECT "id" FROM jsonb_populate_recordset(NULL::"ImportRecord",convert_from(decoded,\'UTF8\')::jsonb);';
    assert.ok(transport.sql.includes(insertion));
    await this.send(transport.sql.replace(insertion,`SELECT count(*) INTO inserted
      FROM jsonb_array_elements(convert_from(decoded,'UTF8')::jsonb) expected
      JOIN "ImportRecord" actual ON actual.id=expected->>'id'
      WHERE actual."rawPayload"=expected->'rawPayload' AND actual.status='COMPLETE'
        AND actual."promotedEntityId" IS NULL
        AND actual."processingNotes" IS NOT DISTINCT FROM expected->>'processingNotes';`)
      .replace('GET DIAGNOSTICS inserted=ROW_COUNT;',''));
  }
}
