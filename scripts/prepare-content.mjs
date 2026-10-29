import fs from 'node:fs';
import { checkN5 } from './check-n5.mjs';

const load = name => JSON.parse(fs.readFileSync(`content/${name}.json`, 'utf8'));
const foundations = ['beginner', 'pronunciation'].map(load);
const courseManifest = load('manifest');
if (foundations[0].lessons.length !== courseManifest.counts.beginnerLessons || foundations[1].lessons.length !== courseManifest.counts.pronunciationLessons || foundations.flatMap(c => c.lessons).reduce((n, l) => n + l.questions.length, 0) !== courseManifest.counts.foundationQuestions) throw new Error('基础课程数量与清单不一致');
const words = load('words');
const sentences = load('sentences');
const dialogueSentences = load('dialogue-sentences');
const wordExamples = fs.existsSync('content/word-examples.json') ? load('word-examples') : [];
const hira = [['あいうえお','アイウエオ','a i u e o'],['かきくけこ','カキクケコ','ka ki ku ke ko'],['さしすせそ','サシスセソ','sa shi su se so'],['たちつてと','タチツテト','ta chi tsu te to'],['なにぬねの','ナニヌネノ','na ni nu ne no'],['はひふへほ','ハヒフヘホ','ha hi fu he ho'],['まみむめも','マミムメモ','ma mi mu me mo'],['やゆよ','ヤユヨ','ya yu yo'],['らりるれろ','ラリルレロ','ra ri ru re ro'],['わをん','ワヲン','wa o n']];
const voiced = [['がぎぐげご','ガギグゲゴ','ga gi gu ge go'],['ざじずぜぞ','ザジズゼゾ','za ji zu ze zo'],['だぢづでど','ダヂヅデド','da ji zu de do'],['ばびぶべぼ','バビブベボ','ba bi bu be bo'],['ぱぴぷぺぽ','パピプペポ','pa pi pu pe po']];
const kana=[];
for(const [group,rows] of [['清音',hira],['浊音与半浊音',voiced]]) for(const [h,k,rs] of rows) [h,k].forEach((str,side)=>[...str].forEach((writing,i)=>kana.push({id:`k-${side}-${writing}`,writing,reading:[...h][i],audioText:[...h][i]==='を'?'お':[...h][i],romaji:rs.split(' ')[i],group,script:side?'kata':'hira'})));
for(const [h,k,r] of [['き','キ','ky'],['し','シ','sh'],['ち','チ','ch'],['に','ニ','ny'],['ひ','ヒ','hy'],['み','ミ','my'],['り','リ','ry'],['ぎ','ギ','gy'],['じ','ジ','j'],['び','ビ','by'],['ぴ','ピ','py']]) ['ゃ','ゅ','ょ'].forEach((suffix,i)=>{for(const [script,base,small] of [['hira',h,suffix],['kata',k,['ャ','ュ','ョ'][i]]]) kana.push({id:`k-${script}-${base+small}`,writing:base+small,reading:h+suffix,audioText:h+suffix,romaji:r+['a','u','o'][i],group:'拗音',script});});
fs.writeFileSync('content/kana.json',JSON.stringify(kana,null,2)+'\n');

const candidates = [];
const replacements = {う:['い','って','った','わない'],く:['き','いて','いた','かない'],ぐ:['ぎ','いで','いだ','がない'],す:['し','して','した','さない'],つ:['ち','って','った','たない'],ぬ:['に','んで','んだ','なない'],ぶ:['び','んで','んだ','ばない'],む:['み','んで','んだ','まない'],る:['り','って','った','らない']};
const ichidan = new Set(['食べる','見る','起きる','寝る','教える','覚える','借りる','開ける','閉める','入れる','出る','できる','いる','着る','降りる','忘れる','答える','始める','終える']);
function forms(w){
  const pairs = [[w.writing,w.reading]];
  if(w.writing==='する') for(const [a,b] of [['します','します'],['しました','しました'],['しません','しません'],['して','して']])pairs.push([a,b]);
  else if(w.writing.endsWith('する')) { const stem=w.writing.slice(0,-2),r=w.reading.slice(0,-2); for(const f of ['します','しました','しません','して'])pairs.push([stem+f,r+f]); }
  else if(w.writing==='来る'||/来る/.test(w.pos)&&w.writing.endsWith('くる')){const stem=w.writing.slice(0,-2),r=w.reading.slice(0,-2),kanji=w.writing==='来る'?'来':'';for(const [surface,sound] of [['ます','きます'],['ました','きました'],['ません','きません'],['て','きて'],['た','きた'],['ない','こない']])pairs.push([stem+(kanji?kanji+surface:sound),r+sound]);}
  else if(ichidan.has(w.writing)||/一段/.test(w.pos)){for(const f of ['ます','ました','ません','ませんでした','ましょう','て','た','ない'])pairs.push([w.writing.slice(0,-1)+f,w.reading.slice(0,-1)+f]);}
  else if(/[动動][词詞]|verb/.test(w.pos)){ const last=w.writing.slice(-1),rs=(w.writing==='行く'||w.writing.endsWith('いく'))?['き','って','った','かない']:replacements[last]; if(rs){const s=w.writing.slice(0,-1),r=w.reading.slice(0,-1);for(const f of ['ます','ました','ません','ませんでした','ましょう'])pairs.push([s+rs[0]+f,r+rs[0]+f]);pairs.push([s+rs[1],r+rs[1]],[s+rs[2],r+rs[2]]);} }
  if(/い形容/.test(w.pos)&&w.writing.endsWith('い')){const stem=w.writing.endsWith('いい')?w.writing.slice(0,-2)+'よ':w.writing.slice(0,-1),r=w.reading.endsWith('いい')?w.reading.slice(0,-2)+'よ':w.reading.slice(0,-1);for(const f of ['くない','かった','くなかった'])pairs.push([stem+f,r+f]);}
  for(const f of w.forms??[]) if(!pairs.some(([a])=>a===f)){const suffix=f.slice(w.writing.length);if(f.startsWith(w.writing))pairs.push([f,w.reading+suffix]);}
  return pairs;
}
for(const w of words) for(const [text,reading] of forms(w)) candidates.push({text,reading,wordId:w.id});
// Editing-time segmentation, shipped as fixed content. Longest match prevents 水 inside 水曜日.
for(const [text,reading] of [['王','おう'],['東京','とうきょう'],['角','かど'],['時','じ'],['間','あいだ'],['五','ご'],['八時','はちじ'],['読書','どくしょ'],['閉じて','とじて'],['曲げて','まげて'],['緑','みどり'],['値段','ねだん'],['声','こえ'],['席','せき'],['会議','かいぎ'],['出発','しゅっぱつ'],['音','おと'],['寒く','さむく'],['助かりました','たすかりました'],['気','き'],['合格','ごうかく'],['読めます','よめます'],['学びます','まなびます'],['描きます','かきます'],['弾きます','ひきます'],['一時間','いちじかん'],['時間','じかん'],['次','つぎ']])candidates.push({text,reading});
candidates.sort((a,b)=>b.text.length-a.text.length);
// Proper names and fixed number readings must not be split into unrelated dictionary words.
for(const [text,reading] of [['田中','たなか'],['林','りん'],['十二時','じゅうにじ'],['五時','ごじ'],['中国人','ちゅうごくじん'],['日本人','にほんじん']])candidates.unshift({text,reading,...(words.find(w=>w.writing===text&&w.reading===reading)?{wordId:words.find(w=>w.writing===text&&w.reading===reading).id}:{})});
const overrides=fs.existsSync('content/annotation-overrides.json')?load('annotation-overrides'):{};
function prepareSentence(s){
  const segments=[];let pos=0;
  while(pos<s.text.length){const found=candidates.find(c=>s.text.startsWith(c.text,pos));if(found){segments.push({...found});pos+=found.text.length;}else{const ch=s.text[pos++];if(segments.at(-1)&&!segments.at(-1).wordId&&!segments.at(-1).reading)segments.at(-1).text+=ch;else segments.push({text:ch});}}
  const final=overrides[s.id]??s.segments??segments;
  for(const segment of final){if(!segment.wordId){const w=words.find(w=>w.writing===segment.text&&(!segment.reading||w.reading===segment.reading));if(w)segment.wordId=w.id;}}
  return {...s,segments:final,wordIds:[...new Set(final.filter(x=>x.wordId).map(x=>x.wordId))]};
}
fs.writeFileSync('content/dialogue-sentences.prepared.json',JSON.stringify(dialogueSentences.map(prepareSentence),null,2)+'\n');
const enriched=sentences.map(prepareSentence);
fs.writeFileSync('content/sentences.prepared.json',JSON.stringify(enriched,null,2)+'\n');
const enrichedExamples=wordExamples.map(prepareSentence);
fs.writeFileSync('content/word-examples.prepared.json',JSON.stringify(enrichedExamples,null,2)+'\n');
const audio=[...words.map(w=>({id:w.id,text:w.audioText||w.reading,kind:'word'})),...[...sentences,...wordExamples,...dialogueSentences].map(s=>({id:s.id,text:s.reading,kind:'sentence'})),...kana.map(k=>({id:k.id,text:k.audioText,kind:'kana'}))];
fs.writeFileSync('content/audio-manifest.json',JSON.stringify({version:load('manifest').contentVersion,source:'Apple macOS Kyoko (local synthesis)',use:'本机个人学习；不随源码分发音频',assets:audio},null,2)+'\n');
console.log(`Prepared ${words.length} words, ${sentences.length} sentences, ${kana.length} kana, ${audio.length} audio assets.`);
console.log(checkN5());
