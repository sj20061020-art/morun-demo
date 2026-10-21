const assert=require('node:assert/strict'),M=require('../shared/model');
(async()=>{
 const data=new Map(),adapter={async get(k){return data.get(k)||null},async set(k,v){data.set(k,M.clone(v))},async remove(k){data.delete(k)}};
 const repo=new M.Repository(adapter);await repo.init();
 for(const [score,band] of [[0,'0–4'],[4,'0–4'],[5,'5–9'],[9,'5–9'],[10,'10–14'],[14,'10–14'],[15,'15–19'],[19,'15–19'],[20,'20–27'],[27,'20–27']]){
 let left=score;const answers=Array.from({length:9},()=>{const n=Math.min(3,left);left-=n;return n});const r=await repo.addPhqReport(answers);assert.equal(r.score,score);assert.equal(r.band,band);assert.equal(r.safetyFlag,answers[8]>0);assert(!r.values,'Do not invent radar dimensions for PHQ-9');
 }
 const lowRisk=await repo.addPhqReport([0,0,0,0,0,0,0,0,1]);assert.equal(lowRisk.score,1);assert.equal(lowRisk.safetyFlag,true,'Item 9 support must not depend on total score');
 for(const invalid of [[],Array(12).fill(0),Array(9).fill(4),Array(9).fill(null)])await assert.rejects(repo.addPhqReport(invalid));
 assert.equal(M.assessment('phq9').questions.length,9);assert.equal(M.assessment('phq9').period,'过去两周');assert.equal(M.assessment('awareness').questions.length,12);
 const own=await repo.addReport(Array(12).fill(0));assert.equal(own.values.length,4);
 const s=repo.snapshot();s.activities[1].title='以墨为语 · 情绪水墨小组';s.bookings.push({id:'migration-test',activityId:'activity-2',title:s.activities[1].title});s.experts=s.experts.slice(0,2);s.artAssessmentRevision=undefined;data.set(M.KEY,s);
 const migrated=new M.Repository(adapter);await migrated.init();assert.equal(migrated.snapshot().activities[1].title,'心栖意境 · 线下书画静心活动');assert.equal(migrated.snapshot().bookings[0].title,'心栖意境 · 线下书画静心活动');assert.equal(migrated.snapshot().experts.length,4);assert.equal(migrated.snapshot().reports.length,12);await migrated.init();assert.equal(migrated.snapshot().experts.length,4);
 assert(M.artReferences.write.every(r=>r.image));assert.equal(M.artReferences.paint.length,2);assert(M.artReferences.paint.every(r=>/^shitao-[12]\.jpg$/.test(r.image)),'Only corrected landscape images are used');
 console.log('PASS PHQ-9 scoring boundaries, item 9 support independent of total, input validation, original radar, persisted reports, activity migration, doctor deduplication, art attribution');
})().catch(e=>{console.error(e);process.exit(1)});
