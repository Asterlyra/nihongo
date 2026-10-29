import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createAnalyzer } from './sentence-analysis-core.mjs';
import { checkN5 } from './check-n5.mjs';
const read=name=>JSON.parse(fs.readFileSync(`content/${name}.json`,'utf8'));
const manifestContent=read('manifest'),units=read('units');
const dialogues=read('dialogues'),ds=read('dialogue-sentences.prepared');
const words=read('words'),grammar=read('grammar'),ss=read('sentences.prepared'),readings=read('readings'),kana=read('kana'),examples=read('word-examples.prepared');
const strings=(item,fields)=>{for(const f of fields)assert.equal(typeof item[f],'string',`${item.id}.${f}`);};
const unique=(rows)=>assert.equal(new Set(rows.map(x=>x.id)).size,rows.length,'duplicate ID');
for(const rows of [words,grammar,ss,readings,kana,examples,ds,dialogues])unique(rows);
assert.ok(words.length>=1000);assert.equal(words.length,manifestContent.counts.words);assert.equal(grammar.length,manifestContent.counts.grammar);assert.equal(ss.length,manifestContent.counts.coreSentences);assert.equal(readings.length,manifestContent.counts.readings);assert.equal(ds.length,manifestContent.counts.dialogueSentences);assert.equal(dialogues.length,manifestContent.counts.dialogues);unique([...ss,...examples,...ds]);assert.equal(examples.length,words.length);
assert.equal(new Set(words.map(w=>w.writing+'|'+w.reading)).size,words.length,'duplicate lexeme');
const wordIds=new Set(words.map(w=>w.id)),grammarIds=new Set(grammar.map(g=>g.id)),sentenceIds=new Set(ss.map(s=>s.id));
for(let n=1;n<=1000;n++)assert.ok(wordIds.has(`w${String(n).padStart(3,'0')}`),`released word ID missing ${n}`);
assert.equal(grammar.reduce((n,g)=>n+g.exercises.length,0),manifestContent.counts.grammarExercises);
assert.equal(kana.length,manifestContent.counts.kana);
for(let unit=1;unit<=10;unit++)assert.equal(words.filter(w=>w.unit===unit).length,30,`unit ${unit}`);
for(const w of words){strings(w,['id','writing','reading','meaning','pos','collocation','audioText','note']);assert.match(w.reading,/^[ぁ-ゖァ-ヺー・ 　]+$/u);assert.ok(w.meaning&&w.collocation);strings(w,['category','group']);assert.ok([1,2,3].includes(w.difficulty));assert.ok(['high','medium','context'].includes(w.frequency));assert.ok(Number.isInteger(w.studyOrder)&&w.studyOrder>=0);assert.ok(Number.isInteger(w.unit)&&units[w.unit-1]);}
for(const [i,g] of grammar.entries()){
  strings(g,['title','intent','structure']);assert.ok(g.explanation.length&&g.pitfalls.length&&g.exercises.length>=2);
  for(const p of g.prerequisites)assert.ok(grammar.slice(0,i).some(x=>x.id===p),`${g.id} dependency`);
  for(const s of g.examples)assert.ok(sentenceIds.has(s),`${g.id} example ${s}`);
  for(const q of g.exercises){strings(q,['prompt','answer','explanation']);assert.ok(q.answer.trim());}
}
for(const s of [...ss,...examples,...ds]){
  strings(s,['id','text','reading','translation']);assert.ok(s.translation.trim(),`missing Chinese translation ${s.id}`);assert.equal(s.segments.map(p=>p.text).join(''),s.text,`segments ${s.id}`);
  for(const g of s.grammarIds)assert.ok(grammarIds.has(g),`${s.id} grammar ${g}`);
  for(const p of s.segments)if(p.wordId)assert.ok(wordIds.has(p.wordId),`${s.id} word ${p.wordId}`);
  assert.ok(s.reading&&!/[\u3400-\u9fff]/.test(s.reading),`${s.id} audio reading`);
}
assert.equal(new Set(examples.map(e=>e.wordId)).size,words.length);
for(const e of examples){assert.ok(wordIds.has(e.wordId));if(Number(e.wordId.slice(1))>=301)assert.ok(e.wordIds.includes(e.wordId),`target word not linked in ${e.id}`);}
for(const r of readings){assert.ok(r.sentenceIds.length>=4&&r.questions.length>=2);for(const sid of r.sentenceIds)assert.ok(sentenceIds.has(sid));for(const q of r.questions)assert.ok(q.options.length>=2&&q.answer>=0&&q.answer<q.options.length);}
const dialogueSentenceIds=new Set(ds.map(s=>s.id));
for(const d of dialogues){strings(d,['id','title','intent','register','note']);assert.ok(['travel','anime'].includes(d.goal));assert.ok(d.turns.length>=4&&d.questions.length>=2);for(const t of d.turns){assert.ok(t.speaker);assert.ok(dialogueSentenceIds.has(t.sentenceId));}for(const g of d.grammarIds)assert.ok(grammarIds.has(g));for(const q of d.questions){assert.ok(q.prompt&&q.explanation);assert.ok(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<q.options.length);}}
for(const w of words){assert.ok(Number.isInteger(w.learningPriority)&&w.learningPriority>=0&&w.learningPriority<=4);assert.ok(w.goals.every(g=>['travel','anime'].includes(g)));assert.ok(['neutral','polite','comprehension'].includes(w.usage));if(w.usage==='comprehension')assert.equal(w.learningPriority,4);}
const manifest=read('audio-manifest');unique(manifest.assets);assert.equal(manifest.assets.length,words.length+ss.length+examples.length+ds.length+kana.length);assert.equal(manifest.assets.length,manifestContent.counts.audio);
const foundations=[read('beginner'),read('pronunciation')],foundationLessons=foundations.flatMap(c=>c.lessons);
unique([...words,...grammar,...kana,...readings,...dialogues,...foundationLessons]);
assert.equal(foundations[0].lessons.length,manifestContent.counts.beginnerLessons);
assert.equal(foundations[1].lessons.length,manifestContent.counts.pronunciationLessons);
assert.equal(foundationLessons.reduce((n,l)=>n+l.questions.length,0),manifestContent.counts.foundationQuestions);
const audioTexts=new Map(manifest.assets.map(a=>[a.id,a.text]));
for(const c of foundations){strings(c,['id','title','intent']);assert.ok(c.lessons.length);}
for(const l of foundationLessons){
  strings(l,['id','title','intent']);assert.match(l.id,/^[bp]\d{2}$/);
  assert.ok(l.sections.length>=2&&l.examples.length>=2&&l.practice.length>=2&&l.pitfalls.length>=2&&l.questions.length>=2);
  for(const s of l.sections){assert.ok(s.title&&s.paragraphs.length);for(const p of s.paragraphs)assert.ok(typeof p==='string'&&p.trim());}
  for(const e of l.examples){strings(e,['text','reading','translation']);assert.ok(e.text&&e.reading&&e.translation);if(e.audioId)assert.ok(audioTexts.has(e.audioId),`${l.id}: missing audio ${e.audioId}`);if(e.beats){assert.ok(e.beats.length);assert.equal(e.beats.join(''),e.reading,`${l.id}: beats must match reading`);}if(e.pitch){assert.equal(e.pitch.moras.join(''),e.reading);assert.equal(e.pitch.moras.length,e.pitch.levels.length);assert.ok(e.pitch.levels.every(level=>['L','H'].includes(level)));if(e.pitch.particleFrom!==undefined)assert.ok(Number.isInteger(e.pitch.particleFrom)&&e.pitch.particleFrom>=0&&e.pitch.particleFrom<e.pitch.moras.length);}}
  for(const text of [...l.practice,...l.pitfalls])assert.ok(typeof text==='string'&&text.trim());
  for(const q of l.questions){assert.ok(q.prompt&&q.explanation&&q.options.length>=2);assert.ok(q.options.every(o=>typeof o==='string'&&o.trim()));assert.ok(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<q.options.length);}
  for(const s of l.sources){assert.ok(s.title);const url=new URL(s.url);assert.equal(url.protocol,'https:');assert.ok(['www.coelang.tufs.ac.jp','www.gavo.t.u-tokyo.ac.jp'].includes(url.hostname));}
}
const noAudio=process.argv.includes('--no-audio');
if(!noAudio){const decoded=read('audio-validation-report');const digests=new Map(decoded.assets.map(a=>[a.id,a]));const report=read('audio-local-report');const checks=new Map(report.assets.map(a=>[a.id,a]));for(const a of manifest.assets){const path=`public/audio/${a.id}.mp3`;assert.ok(fs.existsSync(path)&&fs.statSync(path).size>400,`missing audio ${a.id}`);assert.equal(checks.get(a.id)?.text,a.text,`outdated audio ${a.id}`);assert.ok(checks.get(a.id)?.duration>0.05);assert.equal(digests.get(a.id)?.decoded,true);assert.equal(createHash('sha256').update(fs.readFileSync(path)).digest('hex'),digests.get(a.id)?.sha256,`audio changed since decoding check ${a.id}`);}}
const unknown=[...ss,...examples,...ds].flatMap(s=>s.segments.filter(p=>!p.wordId&&!p.reading&&/[\u3400-\u9fff]/.test(p.text)).map(p=>({sentence:s.id,text:p.text})));
assert.equal(unknown.length,0,`unannotated sentence kanji: ${JSON.stringify(unknown)}`);
const explanations=read('sentence-analysis.prepared'),allSentences=[...ss,...examples,...ds];
unique(explanations);assert.equal(explanations.length,allSentences.length);assert.equal(explanations.length,manifestContent.counts.sentenceAnalyses);
const analyze=createAnalyzer(words,read('sentence-analysis-lexicon'),read('sentence-analysis-overrides'));
const explanationMap=new Map(explanations.map(s=>[s.id,s]));
for(const s of allSentences)assert.ok(JSON.stringify(explanationMap.get(s.id))===JSON.stringify(analyze(s)),`sentence explanation is stale: ${s.id}; regenerate prepared analysis`);
// Compare the authored sentence reading with the explanation's readings. This
// catches homograph mistakes such as 降る / 降りる; it is not a listening audit.
const phonetic=text=>text.replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96)).replace(/[\s。、？！!?「」『』（）()・：:〜～—―…]/g,'').replaceAll('こんにちは','こんにちわ').replaceAll('こんばんは','こんばんわ').replaceAll('ではありません','でわありません').replaceAll('を','お');
const particleReadings={は:'わ',を:'お',へ:'え',へは:'えわ',では:'でわ',には:'にわ',とは:'とわ'};
for(const s of allSentences){const reading=explanationMap.get(s.id).tokens.map(t=>t.reading??particleReadings[t.surface]??t.surface).join('');assert.equal(phonetic(reading),phonetic(s.reading),`explanation pronunciation differs from sentence ${s.id}`);}
for(const s of explanations){assert.equal(s.tokens.map(t=>t.surface).join(''),s.text);assert.ok(s.literal&&s.translation&&s.notes.length);for(const t of s.tokens){assert.notEqual(t.kind,'unknown',`unknown explanation ${s.id}:${t.surface}`);if(t.kind!=='punctuation')assert.ok(t.meaning.trim(),`empty gloss ${s.id}:${t.surface}`);if(t.wordId)assert.ok(wordIds.has(t.wordId));if(t.grammarId)assert.ok(grammarIds.has(t.grammarId));}for(const id of s.grammarIds)assert.ok(grammarIds.has(id));}
for(const e of examples)assert.ok(explanationMap.get(e.id).tokens.some(t=>t.wordId===e.wordId),`target word missing from analysis ${e.id}`);
console.log(JSON.stringify({...checkN5(),words:words.length,grammar:grammar.length,grammarExercises:grammar.reduce((n,g)=>n+g.exercises.length,0),beginnerLessons:foundations[0].lessons.length,pronunciationLessons:foundations[1].lessons.length,foundationQuestions:foundationLessons.reduce((n,l)=>n+l.questions.length,0),sentences:ss.length,wordExamples:examples.length,sentenceAnalyses:explanations.length,readings:readings.length,dialogues:dialogues.length,dialogueSentences:ds.length,kana:kana.length,audio:manifest.assets.length,audioChecked:!noAudio,allSentenceKanjiAnnotated:true},null,2));
