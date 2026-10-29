import {useEffect,useState} from 'react';
import {NumberField} from './Controls';
import {useAction} from './components';
import {setStudyGroupSize} from './data/store';

export default function StudyGroupSettings({size=5}:{size?:number}){
  const [draft,setDraft]=useState(String(size));const {run,busy}=useAction();
  useEffect(()=>setDraft(String(size)),[size]);
  return <section className="panel study-group-settings"><h2>学习小组</h2>
    <form noValidate className="daily-goal-form" onSubmit={e=>{e.preventDefault();void run(async()=>{if(!draft.trim())throw new Error('请输入每组词数。');await setStudyGroupSize(Number(draft));},'每组词数已保存，从下一组生效。');}}>
      <label>每组 <NumberField label="每组词数" min={1} max={100} value={draft} onValueChange={setDraft} disabled={busy}/> 个新词</label><button className="secondary" disabled={busy} type="submit">保存组大小</button>
    </form>
    <p className="micro">每个词学习并独立回忆一次后进入下一组，没记牢的旧词继续穿插。小组大小与每日词汇量分开，调整从下一组生效。</p>
  </section>;
}
