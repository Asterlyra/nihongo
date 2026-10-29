import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Headphones, ArrowRight, Plus, Check, Volume2 } from 'lucide-react';
import { kana } from '../content';
import { AudioButton, Chip, PageHeading, useAction } from '../components';
import { addCard, recordExposure } from '../data/store';
import { db } from '../data/db';
import { playAudio } from '../audio';
import type { Kana as KanaItem } from '../types';
import { kanaListeningOptions } from '../domain/kana';

export default function Kana(){
  const [script,setScript]=useState<'both'|'hira'|'kata'>('both');const [group,setGroup]=useState('清音');const [quiz,setQuiz]=useState<KanaItem[]>([]);const [index,setIndex]=useState(0);const [revealed,setRevealed]=useState(false);const [results,setResults]=useState<Record<string,boolean>>({});const [kind,setKind]=useState<'read'|'listen'>('read');const {run,busy}=useAction();
  const current=quiz[index];const pool=kana.filter(k=>(script==='both'||k.script===script)&&k.group===group);
  const pairs=kana.filter(k=>k.script==='hira'&&k.group===group).map(hira=>({hira,kata:kana.find(k=>k.script==='kata'&&k.group===group&&k.reading===hira.reading)}));
  const columns:Record<string,number>={や:1,ゆ:3,よ:5,わ:1,を:5,ん:1};
  const start=(mode:'read'|'listen')=>{setKind(mode);setQuiz([...pool].sort(()=>Math.random()-0.5).slice(0,12));setIndex(0);setRevealed(false);setResults({});};
  const answer=(correct:boolean)=>run(async()=>{if(!current)return;await db.practices.add({id:crypto.randomUUID(),targetId:current.id,skill:'kana',at:Date.now(),correct});setResults(r=>({...r,[current.id]:correct}));setRevealed(true);});
  const next=()=>{setIndex(i=>i+1);setRevealed(false);};
  return <><PageHeading title="五十音与发音" description="点击假名听发音，或选择读音练习。" action={<Link className="secondary" to="/study">去背单词<ArrowRight size={16}/></Link>}/>
    <div className="kana-controls"><div className="mode-tabs" role="group" aria-label="假名类别">{['清音','浊音与半浊音','拗音'].map(t=><button aria-pressed={group===t} className={group===t?'selected':''} key={t} onClick={()=>setGroup(t)}>{t}</button>)}</div></div>
    <section className="panel kana-panel"><div className="section-heading"><h2>平假名与片假名对照</h2><div className="kana-legend"><span>平假名</span><span>片假名</span></div></div><div className={`kana-grid kana-pair-grid ${group==='拗音'?'contracted':''}`}>{pairs.map(({hira,kata})=><div className="kana-pair" key={hira.id} style={group==='清音'?{gridColumn:columns[hira.reading]}:undefined}><div className="kana-pair-letters">{[hira,kata].map(k=>k&&<button key={k.id} className={`kana-sound ${k.script}`} onClick={()=>run(async()=>{await recordExposure(k.id);await playAudio(k.id);})} aria-label={`播放${k.script==='hira'?'平假名':'片假名'}${k.writing}`}><span lang="ja">{k.writing}</span><Volume2 size={13}/></button>)}</div><small>{hira.romaji}</small></div>)}</div><p className="micro">点击任意假名听发音。平假名和片假名分别记录。<br/>「を」作助词时通常读作「お」；「ぢ／づ」通常与「じ／ず」发音相近。</p></section>
    <section className="panel"><div className="section-heading"><h2>假名练习</h2></div><div className="mode-tabs" role="group" aria-label="练习假名范围">{([['both','混合练习'],['hira','只练平假名'],['kata','只练片假名']] as const).map(([value,label])=><button key={value} className={script===value?'selected':''} aria-pressed={script===value} onClick={()=>setScript(value)}>{label}</button>)}</div><p className="muted">从当前类别和范围抽取最多 12 项。只记录答过的项，不据此估计整个五十音的掌握率。</p>
      {!quiz.length?<div className="button-row"><button className="primary" onClick={()=>start('read')}>看字回忆读音</button><button className="secondary" onClick={()=>start('listen')}><Headphones size={17}/>听音找假名</button></div>:current?<div className="kana-quiz"><span className="eyebrow">{index+1} / {quiz.length} · {kind==='read'?'自己判断是否会读':'听音辨认'}</span>{kind==='read'?<><h3 lang="ja">{current.writing}</h3>{!revealed?<div className="button-row"><button className="primary" onClick={()=>answer(true)}>能读出来</button><button className="secondary" onClick={()=>answer(false)}>不太确定</button></div>:<p lang="ja">{current.reading} · {current.romaji}</p>}</>:<><AudioButton id={current.id} label="播放检查音频"/>{!revealed?<div className="option-row">{kanaListeningOptions(current,pool,index).map(k=><button className="secondary" key={k.id} onClick={()=>answer(k.id===current.id)} lang="ja">{k.writing}</button>)}</div>:<h3 lang="ja">{current.writing}</h3>}</>}
      {revealed&&<><AudioButton id={current.id}/><p>{results[current.id]?'这一项检查通过。':'这一项可以再听听。'}</p><div className="button-row"><button className="primary" disabled={busy} onClick={next}>下一项<ArrowRight size={17}/></button>{!results[current.id]&&<button className="secondary" disabled={busy} onClick={()=>run(()=>addCard(current.id,'kana'),'这项假名已加入复习。')}><Plus size={16}/>加入复习</button>}</div></>}<button className="text-btn" disabled={busy} onClick={()=>{setIndex(quiz.length);setRevealed(false);}}>结束检查</button></div>:<div className="quiz-summary"><Chip done>已检查 {Object.keys(results).length} 项</Chip><p>{Object.values(results).filter(v=>!v).length} 项不太确定。未答项没有被判错。</p><div className="chips">{quiz.filter(k=>results[k.id]===false).map(k=><button className="chip-btn" key={k.id} onClick={()=>run(()=>addCard(k.id,'kana'),`${k.writing} 已加入复习。`)}><Plus size={12}/>{k.writing}</button>)}</div><button className="secondary" onClick={()=>setQuiz([])}>返回检查入口</button></div>}
    </section>
    <div className="pronunciation-notes">{[{title:'长音：声音多一拍',body:'おばさん（阿姨）与 おばあさん（奶奶）不同。片假名常用「ー」表示长音，如コーヒー。'}, {title:'促音：短暂停一拍',body:'小「っ／ッ」表示停顿，如切手（きって）。不要把它读成完整的「つ」。'}, {title:'拨音：ん也占一拍',body:'「ん」的实际发音会受后面声音影响。先跟着完整单词听，留出一拍。'}, {title:'拗音：小ゃゅょ一起读',body:'「きゃ」作为一拍，与「きや」两拍不同。注意小字的大小。'}].map(n=><section className="panel" key={n.title}><Check size={18}/><h3>{n.title}</h3><p>{n.body}</p></section>)}</div><p className="micro">这是一项辨认与自评工具，不会自动判断你的口语发音质量。音频为本机合成。</p>
  </>;
}
