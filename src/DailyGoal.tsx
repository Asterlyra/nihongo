import { NumberField } from './Controls';
import { useEffect, useState } from 'react';
import { useAction } from './components';
import { setDailyWordTarget } from './data/store';
import { DEFAULT_DAILY_TARGET } from './domain/daily-goal';

export default function DailyGoal({target=DEFAULT_DAILY_TARGET}:{target?:number}){
  const [draft,setDraft]=useState(String(target));const {run,busy}=useAction();
  useEffect(()=>setDraft(String(target)),[target]);
  const save=(value:string)=>run(async()=>{if(!value.trim())throw new Error('请输入每日词汇量。');await setDailyWordTarget(Number(value));},'每日词汇量已更新，今天立即生效。');
  return <section className="panel daily-goal"><h2>每日背词数量</h2>
    <form noValidate className="daily-goal-form" onSubmit={e=>{e.preventDefault();void save(draft);}}><label>每天背诵 <NumberField label="每日词汇量" value={draft} onValueChange={setDraft} disabled={busy}/> 个不同单词</label><button className="secondary" disabled={busy} type="submit">保存数量</button><button className="text-btn" type="button" disabled={busy} onClick={()=>void save('0')}>不限数量</button></form>
    <p className="micro">新学与正式复习按不同单词合计，重复回忆不重复计数。0 表示不限；调整当天生效，达到数量后仍可完成巩固或继续学习。</p>
  </section>;
}
