import { Select } from './Controls';
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './data/db';
import { memoryBranches, memoryProbability } from './domain/scheduler';
import { countLabel, COUNT_PARAMETERS } from './domain/count-scheduler';
import { dayKey, fullDate, RATING_LABELS } from './domain/statistics';
import { SKILL_NAMES, type LearningCard } from './types';

export function MemoryCurve({card,now,timezone='Asia/Shanghai'}:{card:LearningCard;now:number;timezone?:string}) {
  const [days,setDays]=useState(30);const [probe,setProbe]=useState(7);
  const branches=memoryBranches(card,now,days);
  const colors:Record<number,string>={3:'#497466',2:'#ae7b36',1:'#bc665d'};
  if(card.count)return <div className="count-plan"><p>阶段 {card.count.stage} / 5 · 完成 {card.count.rounds} 轮 · {card.count.remaining?`本轮还需 ${card.count.remaining} 次独立回忆`:`下次复习：${fullDate(card.dueAt,timezone)}`}</p><p className="micro">{dayKey(card.dueAt,timezone)>dayKey(now,timezone)?'下次到期时的反馈预览':'本次反馈预览'}</p><div className="curve-legend">{[3,2,1].map(r=><div key={r}><strong>{RATING_LABELS[r]}</strong><span>{countLabel(card,r,Math.max(now,card.dueAt),timezone)}</span></div>)}</div><p className="micro">完成一轮后按 {COUNT_PARAMETERS.intervalDays.join('、')} 天逐阶段安排。模糊回退一个阶段并至少巩固两次；忘记回到起点并巩固三次。次数规则不生成遗忘概率预测。</p></div>;
  if(!branches.length)return <p className="micro">设备时间早于上次复习，暂不生成预测。</p>;
  const x=(day:number)=>42+day/days*540,y=(p:number)=>18+(1-p)*150;
  return <div className="memory-curve"><div className="curve-controls"><span>如果这次选择…</span><label>预测范围 <Select aria-label="遗忘曲线预测范围" value={days} onValueChange={value=>{const n=Number(value);setDays(n);setProbe(Math.min(n,probe));}}>{[7,30,90].map(n=><option key={n} value={n}>{n} 天</option>)}</Select></label></div>
    <svg viewBox="0 0 610 200" role="img" aria-label={`${SKILL_NAMES[card.skill]}记忆预测：记得、模糊、忘记三种反馈后的回忆概率`}><title>三档反馈后的 FSRS 预测曲线</title>{[1,.9,.5,0].map(p=><g key={p}><line x1="42" x2="582" y1={y(p)} y2={y(p)} stroke="#e1e6e0" strokeDasharray={p===.9?'4 4':undefined}/><text x="35" y={y(p)+4} textAnchor="end">{Math.round(p*100)}%</text></g>)}{[0,days/2,days].map(d=><text x={x(d)} y="190" textAnchor="middle" key={d}>{d} 天</text>)}{branches.map(b=><path key={b.rating} d={b.points.map((p,i)=>`${i?'L':'M'} ${x(p.day)} ${y(p.probability)}`).join(' ')} fill="none" stroke={colors[b.rating]} strokeWidth="2.5" strokeDasharray={b.rating===2?'6 3':b.rating===1?'2 3':undefined}/>)}<line x1={x(probe)} x2={x(probe)} y1="18" y2="168" stroke="#b1b8b1"/></svg>
    <label className="curve-slider">看看经过 {probe} 天后<input aria-label="查看经过多少天的记忆预测" type="range" min="0" max={days} value={probe} onChange={e=>setProbe(Number(e.target.value))}/></label><div className="curve-legend">{branches.map(b=>{const probability=memoryProbability(b.stability,probe);return <div key={b.rating} style={{borderColor:colors[b.rating]}}><strong style={{color:colors[b.rating]}}>{RATING_LABELS[b.rating]} · 约 {Math.round(probability*100)}%</strong><span>稳定性 {b.stability.toFixed(1)} 天</span><small>下次：{fullDate(b.dueAt,timezone)}</small></div>;})}</div><p className="micro">假设这次反馈后不再复习。曲线是 FSRS 根据此卡历史的模型预测，并非实测遗忘率；学习阶段还会安排分钟级巩固。三档对每张卡的影响会不同。</p>
  </div>;
}

export function WordMemory({id,cards,timezone,now}:{id:string;cards:LearningCard[];timezone:string;now:number}) {
  const history=useLiveQuery(async()=>{const reviews=(await db.reviews.toArray()).filter(e=>e.before.targetId===id);const practices=await db.practices.where('targetId').equals(id).toArray();const progress=await db.progress.get(id);return {reviews,practices,progress};},[id]);
  const [skill,setSkill]=useState('meaning');const [limit,setLimit]=useState(20);
  const selected=cards.find(c=>c.skill===skill)??cards[0];
  const events=history?[...(history.progress?.introducedAt!==undefined?[{id:'introduction',at:history.progress.introducedAt,title:'首次学习',detail:'查看读音与词义，还未完成记忆检查',reverted:false}]:[]),...history.reviews.map(e=>({id:e.id,at:e.at,title:`正式复习 · ${SKILL_NAMES[e.before.skill]} · ${RATING_LABELS[e.rating]}`,detail:`复习次数 ${e.before.fsrs.reps} → ${e.after.fsrs.reps} · ${e.after.count?.remaining?`本轮还需 ${e.after.count.remaining} 次`:`下次安排 ${fullDate(e.after.dueAt,timezone)}`}`,reverted:!!e.revertedAt,revertedAt:e.revertedAt})),...history.practices.map(p=>({id:p.id,at:p.at,title:`${p.skill==='lookup'?'查阅':p.source==='today'?'复习今天的词':'自由练习'} · ${p.skill==='lookup'?'看过词条':SKILL_NAMES[p.skill as keyof typeof SKILL_NAMES]??'练习'}${p.rating?` · ${RATING_LABELS[p.rating]}`:''}`,detail:'未改变正式复习日期',reverted:false}))].sort((a,b)=>b.at-a.at):[];
  return <><section className="panel"><h2>这个词的复习阶段与安排</h2>{selected?<><div className="mode-tabs" role="group" aria-label="复习能力">{cards.map(c=><button className={selected.id===c.id?'selected':''} key={c.id} onClick={()=>setSkill(c.skill)}>{SKILL_NAMES[c.skill]}{c.paused?' · 暂停':''}</button>)}</div><MemoryCurve card={selected} now={now} timezone={timezone}/></>:<p className="muted">加入学习后，可查看三档反馈对应的巩固次数与后续日期。</p>}</section>
    <section className="panel"><div className="section-heading"><h2>记忆历史</h2><span>{history?.reviews.filter(e=>!e.revertedAt).length??0} 次正式复习 · {history?.practices.filter(p=>p.rating).length??0} 次回顾</span></div><p className="micro">时间按 {timezone} 显示。撤销记录保留，统计中剔除；查阅和回顾不算正式复习。</p>{!history?<p>正在读取历史…</p>:events.length?<ol className="memory-timeline">{events.slice(0,limit).map(e=><li className={e.reverted?'reverted':''} key={e.id}><time>{fullDate(e.at,timezone)}</time><strong>{e.title}{e.reverted?' · 已撤销':''}</strong><p>{e.detail}</p>{'revertedAt' in e&&e.revertedAt&&<small>撤销于 {fullDate(e.revertedAt,timezone)}</small>}</li>)}</ol>:<p className="muted">还没有记忆记录。加入学习后，首次认识和之后每次反馈都会留在这里。</p>}{events.length>limit&&<button className="secondary" onClick={()=>setLimit(n=>n+20)}>显示更多历史（20 条）</button>}</section></>;
}
