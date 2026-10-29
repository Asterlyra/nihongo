import { Select } from '../Controls';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Headphones, Square } from 'lucide-react';
import { dialogues, dialogueSentenceMap, grammarMap, wordMap } from '../content';
import { useStudyData } from '../hooks';
import { AudioButton, Empty, PageHeading, SentenceText, useAction, WordPreview } from '../components';
import { introduceWord, recordExercise, recordRead, toggleFavorite } from '../data/store';
import { playSequence, stopAudio } from '../audio';
import { GOAL_LABELS } from '../domain/planning';
import { SentenceAnalysis } from '../SentenceAnalysis';

export function DialogueList(){
  const data=useStudyData();const [goal,setGoal]=useState('all');
  return <><PageHeading title="对话与听力" description="为日本旅行和各种动漫的通用口语练习。先听，再核对字幕；每次选一个场景即可，不需要背完整个词库。"/>
    <div className="deck-tabs">{[['all','全部场景'],['travel','旅游交流'],['anime','动漫通用口语']].map(([v,t])=><button key={v} className={goal===v?'selected':''} onClick={()=>setGoal(v)}>{t}</button>)}</div>
    <p className="micro">以下均为原创学习对话，本地合成音使用同一种声音。原速是该合成音的原速，不能代替真实店员或动漫配音训练。</p>
    <div className="dialogue-grid">{dialogues.filter(d=>goal==='all'||d.goal===goal).map(d=>{const p=data?.progress.find(p=>p.id===d.id);return <Link className="panel dialogue-card" key={d.id} to={`/dialogues/${d.id}`}><span className="eyebrow">{GOAL_LABELS[d.goal]} · {d.register}</span><h2>{d.title}</h2><p>{d.intent}</p><div className="chips"><span className="chip">{d.turns.length} 句 · {d.questions.length} 道理解题</span>{p?.practicedAt&&<span className="chip done">有练习记录</span>}</div><span className="card-bottom">先听一遍 <ArrowRight size={17}/></span></Link>;})}</div></>;
}
export function DialogueDetail(){
  const {id=''}=useParams();const d=dialogues.find(d=>d.id===id);const data=useStudyData();const {run,busy,notify}=useAction();
  const [transcript,setTranscript]=useState(false),[translation,setTranslation]=useState(false),[furigana,setFurigana]=useState(true),[lookup,setLookup]=useState('');
  const [answers,setAnswers]=useState<Record<number,number>>({}),[evidence,setEvidence]=useState<Record<number,string>>({}),[rate,setRate]=useState(1),[playing,setPlaying]=useState(false),[turn,setTurn]=useState(-1);
  const playback=useRef(0),viewed=useRef(false);
  useEffect(()=>()=>{playback.current++;stopAudio();},[]);
  if(!d)return <Empty title="这个对话暂时不存在"><Link to="/dialogues">返回对话目录</Link></Empty>;
  const p=data?.progress.find(p=>p.id===id);
  const stop=()=>{playback.current++;stopAudio();setPlaying(false);setTurn(-1);};
  const listen=async()=>{const token=++playback.current;setPlaying(true);try{await playSequence(d.turns.map(t=>t.sentenceId),rate,setTurn);}catch(e){notify(e instanceof Error?e.message:'播放失败，请重试。');}finally{if(token===playback.current){setPlaying(false);setTurn(-1);}}};
  const answer=(i:number,j:number)=>run(async()=>{const mode=viewed.current?'text':'audio';await recordExercise(id,j===d.questions[i].answer,`${mode}-${i}`);setAnswers(a=>({...a,[i]:j}));setEvidence(a=>({...a,[i]:mode==='text'?'看过文字后的理解练习':'未展开文字的理解练习'}));});
  return <><Link className="back-link" to="/dialogues"><ArrowLeft size={16}/>返回对话与听力</Link><PageHeading eyebrow={`${GOAL_LABELS[d.goal]} / ${d.register}`} title={d.title} description={d.intent}/>
    <section className="panel listen-panel"><h2><Headphones size={21}/>播放对话</h2><p>{d.note}</p><div className="button-row"><button className="primary" disabled={playing} onClick={()=>void listen()}>播放整段对话</button><button className="secondary" disabled={!playing} onClick={stop}><Square size={15}/>停止</button><label className="toggle-label">播放速度 <Select aria-label="对话播放速度" value={rate} disabled={playing} onValueChange={value=>setRate(Number(value))}><option value={1}>合成音原速</option><option value={0.8}>放慢至 0.8 倍</option></Select></label></div><p className="micro" aria-live="polite">{playing?`正在播放第 ${turn+1} 句 · 按说话人标签区分角色`:'可以反复听，也可以随时展开文字。播放与查看字幕不计作记住单词。'}</p>
    <div className="dialogue-turns">{d.turns.map((t,i)=>{const s=dialogueSentenceMap.get(t.sentenceId);return s?<div className={`dialogue-turn ${turn===i?'playing':''}`} key={s.id}><span className="speaker">{i+1}. {t.speaker}</span>{transcript?<div className="sentence-line"><SentenceText sentence={s} furigana={furigana} onWord={setLookup}/></div>:<p className="hidden-transcript">第 {i+1} 句文字暂时收起</p>}<AudioButton id={s.id} compact label={`播放第${i+1}句`} before={async()=>stop()}/>{transcript&&translation&&<p className="turn-translation">{s.translation}</p>}{transcript&&<SentenceAnalysis sentence={s} onWord={setLookup}/>}</div>:null;})}</div>
    <div className="button-row"><button className="secondary" aria-expanded={transcript} onClick={()=>{if(!transcript)viewed.current=true;setTranscript(v=>!v);}}>{transcript?'收起文字':'展开日语文字'}</button>{transcript&&<><label className="toggle-label"><input type="checkbox" checked={furigana} onChange={e=>setFurigana(e.target.checked)}/>假名注音</label><label className="toggle-label"><input type="checkbox" checked={translation} onChange={e=>setTranslation(e.target.checked)}/>中文意思</label></>}</div></section>
    <section className="panel"><h2>听懂了哪些信息？</h2><p className="micro">本轮未展开文字和看过文字的答案分别保存；这是理解练习，未验证实际听了音频，也不改变 FSRS 单词卡。{p?.practicedAt?' 此场景已有历史练习记录。':''}</p>{d.questions.map((q,i)=><div className="reading-question" key={i}><h3>{i+1}. {q.prompt}</h3><div className="option-row">{q.options.map((option,j)=><button disabled={busy} className={`secondary ${answers[i]===j?'chosen':''}`} key={j} onClick={()=>answer(i,j)}>{option}</button>)}</div>{i in answers&&<div className={`exercise-result ${answers[i]===q.answer?'correct':''}`}><strong>{answers[i]===q.answer?'理解正确':'再听听对应的句子'}</strong><p>{q.explanation}</p><small>{evidence[i]} · 已保存</small></div>}</div>)}<div className="button-row"><button className="secondary" disabled={busy} onClick={()=>{setAnswers({});setEvidence({});setTranscript(false);setTranslation(false);viewed.current=false;}}>开始新一轮练习</button><Link className="text-btn" to="/progress">查看学习记录 ↗</Link></div></section>
    <section className="panel"><h2>跟读练习</h2><p>对照注音和意思，跟读每一句，再把自己的需求代入游客或角色的话。跟读和自述需要自己核对，本页不会自动判断发音或交流能力。</p><div className="chips">{d.grammarIds.map(gid=><Link className="chip" key={gid} to={`/grammar/${gid}`}>{grammarMap.get(gid)?.title}</Link>)}</div><button className="text-btn" disabled={busy} onClick={()=>run(()=>recordRead(id,d.turns.length-1),'已记录对话文字的阅读进度。')}>我已核对过文字</button></section>
    {lookup&&<WordPreview id={lookup} onClose={()=>setLookup('')} onAdd={()=>{const w=wordMap.get(lookup);if(w)void run(()=>introduceWord(w,!!data?.settings?.listening),'已加入学习。');}} onFavorite={()=>run(()=>toggleFavorite(lookup),'已更新收藏。')}/>}
  </>;
}
