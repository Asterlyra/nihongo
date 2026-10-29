import {describe,it,expect} from 'vitest';
import words from '../content/words.json';
import lexicon from '../content/sentence-analysis-lexicon.json';
import overrides from '../content/sentence-analysis-overrides.json';
import examples from '../content/word-examples.prepared.json';
import sentences from '../content/sentences.prepared.json';
import dialogues from '../content/dialogue-sentences.prepared.json';
// Authoring rules run outside the browser and produce the fixed course resource.
// @ts-expect-error authoring helper is plain ESM
import {createAnalyzer,wordForms} from '../scripts/sentence-analysis-core.mjs';

const analyze=createAnalyzer(words,lexicon,overrides);
const sources=new Map([...examples,...sentences,...dialogues].map(s=>[s.id,s]));
const get=(id:string)=>analyze(sources.get(id)!);
describe('sentence explanations',()=>{
 it('does not turn は＋ここ into 箱, or は＋いくら into はい',()=>{
  expect(get('ws-w048').tokens.map((t:{surface:string})=>t.surface)).toEqual(['家','の','鍵','は','ここ','に','あります','。']);
  expect(get('ws-w1014').tokens.map((t:{surface:string})=>t.surface)).toEqual(['これ','は','いくら','です','か','。']);
 });
 it('keeps the target sense when a transitive form also resembles another verb’s potential form',()=>{
  for(const id of ['w656','w702','w736','w742','w990','w995'])expect(get(`ws-${id}`).tokens.some((t:{wordId:string})=>t.wordId===id)).toBe(true);
 });
 it('reads 何 as なに before を and なん before です or quotation って',()=>{
  const reading=(id:string)=>get(id).tokens.find((t:{surface:string})=>t.surface==='何').reading;
  expect(reading('ws-w028')).toBe('なに');expect(reading('ds003')).toBe('なに');expect(reading('s100')).toBe('なん');
 });
 it('keeps service expressions and country-person compounds together',()=>{
  expect(get('ws-w001').tokens.find((t:{surface:string})=>t.surface==='中国人').reading).toBe('ちゅうごくじん');
  expect(get('ds001').tokens.map((t:{surface:string})=>t.surface)).toContain('お召し上がり');
  expect(get('ds016').tokens.find((t:{surface:string})=>t.surface==='お預かりします').note).toContain('谦让');
 });
 it('explains negative forms and contractions without losing their grammatical meaning',()=>{
  expect(get('ws-w137').tokens.find((t:{surface:string})=>t.surface==='食べません').meaning).toContain('否定');
  expect(get('s104').tokens.find((t:{surface:string})=>t.surface==='忘れちゃった').form).toBe('completionPast');
  expect(get('ds038').tokens.find((t:{surface:string})=>t.surface==='開いてない').form).toBe('contractedNegative');
  expect(get('s092').tokens.find((t:{surface:string})=>t.surface==='面白くなかった').meaning).toContain('过去');
  expect(wordForms(words.find(w=>w.id==='w158')!).find((t:{surface:string})=>t.surface==='勉強します').lemma).toBe('勉強する');
 });
 it('handles 行く, ある, 来る and する irregular readings',()=>{
  const forms=(id:string)=>wordForms(words.find(w=>w.id===id)!);
  expect(forms('w211')).toEqual(expect.arrayContaining([expect.objectContaining({surface:'行って',reading:'いって'}),expect.objectContaining({surface:'行った',reading:'いった'})]));
  expect(forms('w079')).toEqual(expect.arrayContaining([expect.objectContaining({surface:'ない',reading:'ない'})]));
  expect(forms('w212')).toEqual(expect.arrayContaining([expect.objectContaining({surface:'来ます',reading:'きます'}),expect.objectContaining({surface:'来ない',reading:'こない'})]));
  expect(forms('w159')).toEqual(expect.arrayContaining([expect.objectContaining({surface:'した',reading:'した'})]));
 });
 it('keeps topic and conditional expressions from becoming unrelated words',()=>{
  expect(get('ws-w341').tokens.map((t:{surface:string})=>t.surface)).toContain('について');
  expect(get('ws-w877').tokens.find((t:{surface:string})=>t.surface==='あれば')).toMatchObject({wordId:'w079',meaning:'如果有'});
  expect(get('ws-w269').tokens.map((t:{surface:string})=>t.surface)).toContain('今日');
  expect(get('ws-w1055').tokens.map((t:{surface:string})=>t.surface)).toContain('なの');
 });
 it('uses context to distinguish same-spelling verbs and their readings',()=>{
  expect(get('ws-w149').tokens.find((t:{surface:string})=>t.surface==='入れます')).toMatchObject({wordId:'w736',reading:'いれます'});
  expect(get('ws-w249').tokens.find((t:{surface:string})=>t.surface==='降ります')).toMatchObject({wordId:'w995',reading:'ふります'});
  expect(get('ws-w952').tokens.find((t:{surface:string})=>t.surface==='開いて')).toMatchObject({reading:'ひらいて',lemma:'開く（ひらく）'});
  expect(get('ws-w930').tokens.find((t:{surface:string})=>t.surface==='何').reading).toBe('なん');
 });
 it('does not mistake telephone or appliance verbs for potential forms',()=>{
  expect(get('ws-w045').tokens.find((t:{surface:string})=>t.surface==='かけます')).toMatchObject({wordId:'w727',form:'polite'});
  expect(get('ws-w446').tokens.find((t:{surface:string})=>t.surface==='つけます')).toMatchObject({wordId:'w742',form:'polite'});
  expect(get('ws-w358').tokens.find((t:{surface:string})=>t.surface==='かみます').meaning).toContain('擤');
 });
 it('keeps adverbs and the conditional と meaningful in their sentences',()=>{
  expect(get('ws-w154').tokens.find((t:{surface:string})=>t.surface==='よく').meaning).toBe('经常');
  expect(get('ws-w1063').tokens.find((t:{surface:string})=>t.surface==='本当に')).toMatchObject({wordId:'w1063',meaning:'真的'});
  expect(get('ws-w1064').tokens.find((t:{surface:string})=>t.surface==='と').meaning).toContain('如果');
 });
 it('keeps displayed ruby consistent with context and never labels a topic expression as いる',()=>{
  const segment=(id:string,text:string)=>sources.get(id)!.segments.find(t=>t.text===text);
  expect(segment('ws-w249','降ります')).toMatchObject({reading:'ふります',wordId:'w995'});
  expect(segment('ws-w952','開いて')).toMatchObject({reading:'ひらいて'});
  expect(segment('ws-w930','何')).toMatchObject({reading:'なん'});
  expect(sources.get('ws-w341')!.segments.some(t=>t.wordId==='w080')).toBe(false);
 });
});
