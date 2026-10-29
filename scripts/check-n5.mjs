import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=name=>JSON.parse(fs.readFileSync(`content/${name}.json`,'utf8'));
export function checkN5(){
 const plan=read('n5-plan'),vocabulary=read('n5-vocabulary'),words=read('words'),manifest=read('manifest');
 const wordMap=new Map(words.map(w=>[w.id,w]));
 const grammar=new Set(read('grammar').map(g=>g.id)),reading=new Set(read('readings').map(r=>r.id));
 const audio=new Set(read('audio-manifest').assets.map(a=>a.id));
 const sentenceIds=new Set([...read('sentences.prepared'),...read('word-examples.prepared')].map(s=>s.id));
 assert.equal(plan.id,'n5');assert.equal(plan.lessons.length,16);assert.equal(vocabulary.units.length,16);assert.equal(plan.phases.length,4);
 const ids=plan.lessons.flatMap(l=>l.wordIds);assert.equal(new Set(ids).size,ids.length,'N5 vocabulary must not duplicate learner states');assert.ok(ids.length>=600&&ids.length<=800);
 for(const [i,l] of plan.lessons.entries()){
  assert.equal(l.id,`n5-${String(i+1).padStart(2,'0')}`);assert.equal(l.referenceWeek,i+1);assert.equal(l.phase,Math.floor(i/4)+1);
  assert.deepEqual(l.wordIds,vocabulary.units[i]);assert.ok(l.wordIds.length>0);
  l.wordIds.forEach((id,n)=>{assert.ok(wordMap.has(id));assert.equal(wordMap.get(id).n5Unit,i+1);assert.equal(wordMap.get(id).n5Order,n+1);});
  assert.ok(l.title&&l.intent&&l.output&&l.sections.length>=2&&l.examples.length>=2&&l.practice.length>=2&&l.pitfalls.length>=2);
  for(const s of l.sections)assert.ok(s.title&&s.paragraphs.length&&s.paragraphs.every(p=>typeof p==='string'&&p.trim()));
  for(const e of l.examples){assert.ok(e.text&&e.reading&&e.translation);if(e.audioId)assert.ok(audio.has(e.audioId));}
  for(const id of l.grammarIds){assert.ok(grammar.has(id));assert.ok(!['g24','g29','g30','g31','g32'].includes(id),'advanced/anime grammar must stay outside mandatory N5 sequence');}
  l.readingIds.forEach(id=>assert.ok(reading.has(id)));assert.ok(l.readingIds.length);
  assert.ok(sentenceIds.has(l.listening.sentenceId)&&audio.has(l.listening.sentenceId));
  for(const q of [...l.questions,l.listening]){assert.ok(q.prompt&&q.explanation&&q.options.length>=2);assert.equal(new Set(q.options).size,q.options.length);assert.ok(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<q.options.length);}
  if((i+1)%4===0){assert.equal(l.checkpointFrom,2);assert.equal(l.questions.length-l.checkpointFrom,4);assert.ok(l.checklist.length>=4);}else assert.equal(l.checkpointFrom,undefined);
  for(const s of l.sources){assert.ok(s.title);assert.ok(['www.jlpt.jp','www.irodori.jpf.go.jp'].includes(new URL(s.url).hostname));}
 }
 const used=new Set(ids);for(const w of words)assert.equal(w.n5Unit!==undefined,used.has(w.id));
 const grammarUnits=new Map();for(const l of plan.lessons)for(const id of l.grammarIds)if(!grammarUnits.has(id))grammarUnits.set(id,l.referenceWeek);
 for(const g of read('grammar'))if(grammarUnits.has(g.id))for(const p of g.prerequisites)if(grammarUnits.has(p))assert.ok(grammarUnits.get(p)<=grammarUnits.get(g.id),`${g.id} prerequisite ${p} comes later in N5`);
 assert.deepEqual(plan.optional.map(x=>x.week),[17,18,19,20]);
 const report={n5Lessons:plan.lessons.length,n5Questions:plan.lessons.reduce((n,l)=>n+l.questions.length,0),n5ListeningQuestions:plan.lessons.length,n5Words:ids.length,n5FocusKanji:new Set(plan.lessons.flatMap(l=>l.kanji)).size};
 for(const [key,value] of Object.entries(report))assert.equal(manifest.counts[key],value,key);
 return report;
}
