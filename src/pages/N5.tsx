import { useState } from 'react';
import { Link,useNavigate } from 'react-router-dom';
import { ArrowLeft,ArrowRight,BookOpen,Play,ChevronDown } from 'lucide-react';
import { n5Course,grammarMap,readings,sentenceMap,wordExamples } from '../content';
import { useStudyData } from '../hooks';
import { PageHeading,Chip,AudioButton,SentenceReading,useAction } from '../components';
import { beginSession,recordExercise } from '../data/store';
import { n5LessonProgress } from '../domain/n5';
import type { N5Lesson } from '../types';

const listeningSentences=new Map([...sentenceMap,...wordExamples.map(s=>[s.id,s] as const)]);

export default function N5Plan(){
 const data=useStudyData();
 if(!data)return <p className="loading">正在读取 N5 学习计划…</p>;
 const stats=n5Course.lessons.map(l=>n5LessonProgress(l,data.progress));
 const next=n5Course.lessons.find((_,i)=>!stats[i].read);
 const words=n5Course.lessons.reduce((n,l)=>n+l.wordIds.length,0);
 return <article className="n5-plan"><Link className="back-link" to="/courses"><ArrowLeft size={16}/>返回课程</Link><PageHeading title="N5 学习计划" description={n5Course.intent}/>
  <section className="panel n5-summary"><h2>学习进度</h2><p>已介绍 {stats.reduce((n,s)=>n+s.introduced,0)} / {words} 个主线词 · 已读 {stats.filter(s=>s.read).length} / 16 个单元</p><p>文字自测已答 {stats.reduce((n,s)=>n+s.answered,0)} / {n5Course.lessons.reduce((n,l)=>n+l.questions.length,0)} 题，最近答对 {stats.reduce((n,s)=>n+s.correct,0)} 题。</p>{next?<Link className="primary" to={`/courses/n5/${next.id}`}>继续第 {next.referenceWeek} 单元<ArrowRight size={17}/></Link>:<p>主线已阅读，可回看阶段自测和下方巩固内容。</p>}<p className="micro">词数为教学参考，已介绍和已阅读不等于掌握；现有小组、自选清单及旧词复习继续保留。</p></section>
  <details className="panel n5-how"><summary>怎么按这份计划学习<ChevronDown size={17}/></summary><p>每个单元对应原计划的一周，16周主线和17～20周巩固只作参考，不按日历自动跳课，不强制学习时长、签到或解锁。</p><ol><li>先接触本单元的词和日语读音，旧词继续混合复习。</li><li>同时学习本单元语法，用熟悉的词改写两个句子。</li><li>读例句与合适的短文；先听短句再展开文字核对。</li><li>每四个单元做一次阶段复盘，记录错因后再决定是否继续。</li></ol><p>第一单元可按“自我介绍 → は与か → 指示词 → の与も → 动作句预习 → 综合复习”分次进行；有多少时间学多少。</p></details>
  {n5Course.phases.map((phase,p)=><section className="n5-phase" key={phase}><h2>第 {p+1} 阶段 · {phase}</h2><div className="lesson-list">{n5Course.lessons.filter(l=>l.phase===p+1).map(l=>{const s=stats[l.referenceWeek-1];return <Link className="lesson-item n5-unit" key={l.id} to={`/courses/n5/${l.id}`}><span className="lesson-number">{String(l.referenceWeek).padStart(2,'0')}</span><div><h3>{l.title}</h3><p>{l.output}</p><div className="chips"><Chip>{s.introduced} / {l.wordIds.length} 词已介绍</Chip><Chip>{s.answered} / {l.questions.length} 题已答</Chip>{s.read&&<Chip done>已阅读</Chip>}{l.checkpointFrom!==undefined&&<Chip>阶段自测</Chip>}</div></div><ArrowRight size={18}/></Link>;})}</div></section>)}
  <section className="panel n5-consolidation"><h2>可选巩固 · 参考第17～20周</h2>{n5Course.optional.map(item=><details key={item.week}><summary>{item.title}<ChevronDown size={17}/></summary><ul>{item.tasks.map(t=><li key={t}>{t}</li>)}</ul></details>)}<a className="arrow-link" href={n5Course.officialPracticeUrl} target="_blank" rel="noreferrer">官方样题与练习册（需联网）<ArrowRight size={16}/></a><p className="micro">{n5Course.note}</p></section>
 </article>;
}

export function N5Resources({lesson}:{lesson:N5Lesson}){
 const data=useStudyData();const nav=useNavigate();const {run,busy}=useAction();
 const known=new Set(data?.progress.filter(p=>p.introducedAt!==undefined).map(p=>p.id));
 const pending=lesson.wordIds.filter(id=>!known.has(id));
 return <section className="panel n5-resources"><h2>本单元的学习内容</h2><p>单词已介绍 {lesson.wordIds.length-pending.length} / {lesson.wordIds.length} 个 · 重点汉字 {lesson.kanji.join('、')}</p><div className="button-row"><button className="primary" disabled={busy||!pending.length} onClick={()=>run(async()=>{await beginSession('new',pending);nav('/study');})}><Play size={16}/>背本单元未学词</button><Link className="secondary" to={`/words?n5=${lesson.referenceWeek}`}>查看本单元单词</Link></div><p className="micro">先完成正在进行的小组，再接本单元；自选优先词和旧词仍会穿插。可以在单词库选词，不会清空原有规划。</p>
 <details className="n5-related"><summary>配套语法与短文<ChevronDown size={17}/></summary>{lesson.grammarIds.length>0&&<><h3>配套语法</h3><div className="n5-resource-links">{lesson.grammarIds.map(id=><Link key={id} to={`/grammar/${id}`}><BookOpen size={16}/>{grammarMap.get(id)?.title}<ArrowRight size={15}/></Link>)}</div></>}
 <h3>短文与阅读巩固</h3><div className="n5-resource-links">{lesson.readingIds.map(id=><Link key={id} to={`/reading/${id}`}>{readings.find(r=>r.id===id)?.title}<ArrowRight size={15}/></Link>)}</div><p className="micro">下文讲解补充本单元知识；短文可重复阅读，遇到未学表达先看解释，不要求提前记住全部变化。</p></details></section>;
}

export function N5Listening({lesson}:{lesson:N5Lesson}){
 const [shown,setShown]=useState(false),[answer,setAnswer]=useState<number>();const {run,busy}=useAction();const data=useStudyData();
 const q=lesson.listening,sentence=listeningSentences.get(q.sentenceId);if(!sentence)return null;
 const resultKey=shown?'listen-text':'listen-audio';const previous=data?.progress.find(p=>p.id===lesson.id)?.results;
 return <section className="panel n5-listening"><h2>短句听力</h2><div className="button-row"><AudioButton id={q.sentenceId} label="播放本单元短句"/><button className="secondary" onClick={()=>setShown(true)} disabled={shown}>{shown?'已展开文字':'听后查看文字'}</button></div><p className="micro">本地合成语音辅助听读；作答记录区分本轮是否展开文字，不作为独立听力能力证明。</p>{shown&&<div className="n5-listening-text"><p><SentenceReading sentence={sentence}/></p><p>{sentence.translation}</p></div>}<h3>{q.prompt}</h3><div className="option-row">{q.options.map((o,i)=><button key={o} disabled={busy} aria-pressed={answer===i} className={`secondary ${answer===i?'chosen':''}`} onClick={()=>run(async()=>{await recordExercise(lesson.id,i===q.answer,resultKey);setAnswer(i);})}>{o}</button>)}</div>{answer!==undefined&&<div className={`exercise-result ${answer===q.answer?'correct':''}`} role="status"><strong>{answer===q.answer?'回答正确':'再听一次并核对'}</strong><p>{q.explanation}</p></div>}{previous&&<p className="micro">最近记录：未展开文字 {previous['listen-audio']===undefined?'未作答':previous['listen-audio']?'答对':'答错'} · 已展开文字 {previous['listen-text']===undefined?'未作答':previous['listen-text']?'答对':'答错'}</p>}</section>;
}
