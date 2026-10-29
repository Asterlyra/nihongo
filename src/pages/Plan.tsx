import { useState } from 'react';
import { Link,useNavigate } from 'react-router-dom';
import { ArrowUp,ArrowDown,X,ArrowRight } from 'lucide-react';
import { words,wordMap } from '../content';
import { useStudyData } from '../hooks';
import { beginSession,editPlan } from '../data/store';
import { plannedNewWords,DIFFICULTY_LABELS,FREQUENCY_LABELS } from '../domain/planning';
import { PageHeading,useAction } from '../components';

export default function Plan(){
  const data=useStudyData();const nav=useNavigate();const {run,busy}=useAction();const [limit,setLimit]=useState(20);
  if(!data)return <p className="loading">正在读取待学规划…</p>;
  const plan=data.settings?.plannedWordIds??[],ordered=plannedNewWords(words,data.progress,plan),known=new Set(data.progress.filter(p=>p.introducedAt!==undefined).map(p=>p.id));
  const activePlan=plan.filter(id=>wordMap.has(id)&&!known.has(id));
  const next=ordered.slice(0,10);
  const start=()=>run(async()=>{await beginSession('new');nav('/study');});
  return <><PageHeading title="待学单词规划" description="自选词优先，学完后自动接上默认顺序。规划的新词会与到期旧词和待巩固词穿插学习。" action={<Link className="secondary" to="/words">批量选词 ↗</Link>}/>
    <section className="panel"><div className="section-heading"><h2>我的待学清单 · {activePlan.length} 个</h2><button className="primary" disabled={busy||!ordered.length} onClick={start}>继续背词 <ArrowRight size={17}/></button></div><p className="micro">按加入顺序学习，可上下调整。移出仅取消优先规划，仍能在词库找到它。调整规划保留当前小组和卡片，下一组使用新顺序。</p>{plan.length?<ol className="plan-list">{plan.slice(0,limit).map((id,index)=>{const w=wordMap.get(id);return <li key={id}><span className="plan-index">{index+1}</span><div className="plan-word">{w?<Link to={`/words/${id}`} lang="ja"><strong>{w.writing}</strong><span>{w.reading}</span></Link>:<strong>内容暂缺：{id}</strong>}<p>{w?.meaning??'暂不进入新词队列，规划保留。'}{known.has(id)?' · 已认识，将自动跳过':''}</p></div><div className="plan-actions"><button className="icon-btn" aria-label={`上移${w?.writing??id}`} disabled={busy||index===0} onClick={()=>run(()=>editPlan(id,'up'))}><ArrowUp size={17}/></button><button className="icon-btn" aria-label={`下移${w?.writing??id}`} disabled={busy||index===plan.length-1} onClick={()=>run(()=>editPlan(id,'down'))}><ArrowDown size={17}/></button><button className="icon-btn" aria-label={`移出待学${w?.writing??id}`} disabled={busy} onClick={()=>run(()=>editPlan(id,'remove'),'已移出优先规划，学习历史保留。')}><X size={17}/></button></div></li>;})}</ol>:<div className="plan-empty"><h3>未选单词，将按推荐顺序学习</h3><p>可以直接开始，也可以去词库勾选或拖动框选想学的词。</p></div>}{plan.length>limit&&<button className="secondary" onClick={()=>setLimit(n=>n+20)}>再看 20 个待学词</button>}</section>
    <section className="panel"><h2>接下来的单词</h2><p className="micro">N5 基础句子 → 形容词与时间 → 动词活用 → 综合应用 → 旅游与动漫扩展。自选词仍优先；主线词表为教学编排，不是官方固定词表。</p><div className="next-word-list">{next.map((w,index)=><Link key={w.id} to={`/words/${w.id}`}><span>{index+1}</span><div><strong lang="ja">{w.writing}</strong><p>{w.meaning}</p></div><small>{activePlan.includes(w.id)?'自选优先':w.n5Unit?`N5 第 ${w.n5Unit} 单元`:`${DIFFICULTY_LABELS[w.difficulty??2]} · ${FREQUENCY_LABELS[w.frequency??'medium']}`}</small></Link>)}</div>{!next.length&&<p>当前词库的新词已全部认识，可继续复习。</p>}</section>
  </>;
}
