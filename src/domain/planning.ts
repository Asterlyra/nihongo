import type { Progress, Word } from '../types';

export const DIFFICULTY_LABELS:Record<number,string>={1:'入门',2:'基础',3:'基础扩展'};
export const FREQUENCY_LABELS:Record<string,string>={high:'非常常用',medium:'常用',context:'场景常用'};
const frequencyOrder:Record<string,number>={high:0,medium:1,context:2};
export const GOAL_LABELS = {travel:'旅游交流',anime:'动漫通用口语'};
export function defaultWordOrder(words:Word[]) {
  return [...words].sort((a,b)=>(a.n5Unit??99)-(b.n5Unit??99)||(a.n5Order??Infinity)-(b.n5Order??Infinity)||(a.learningPriority??3)-(b.learningPriority??3)||(a.difficulty??2)-(b.difficulty??2)||(frequencyOrder[a.frequency??'medium']-frequencyOrder[b.frequency??'medium'])||(a.studyOrder??a.unit*100)-(b.studyOrder??b.unit*100)||a.id.localeCompare(b.id));
}
export function plannedNewWords(words:Word[],progress:Progress[],plan:string[]=[]) {
  const known=new Set(progress.filter(p=>p.introducedAt!==undefined).map(p=>p.id));
  const available=new Map(words.filter(w=>!known.has(w.id)).map(w=>[w.id,w]));
  const manual=[...new Set(plan)].flatMap(id=>available.has(id)?[available.get(id)!]:[]);
  const selected=new Set(manual.map(w=>w.id));
  return [...manual,...defaultWordOrder([...available.values()]).filter(w=>!selected.has(w.id))];
}
