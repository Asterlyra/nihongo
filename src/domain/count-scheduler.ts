import type { LearningCard } from '../types';
import { dayKey } from './statistics';
export const COUNT_VERSION='count-stages@1';
export const COUNT_CONFIG='count-v1-1-3-7-14-30';
export const COUNT_PARAMETERS={intervalDays:[1,3,7,14,30],initialRemaining:2,hardRemaining:2,againRemaining:3};
export function calendarDue(now:number,days:number,timezone:string){
  const target=Date.parse(`${dayKey(now,timezone)}T00:00:00Z`)+days*86400_000;
  let result=target;
  const fmt=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
  for(let i=0;i<3;i++){const parts=Object.fromEntries(fmt.formatToParts(result).map(p=>[p.type,p.value]));const local=Date.UTC(+parts.year,+parts.month-1,+parts.day,+parts.hour,+parts.minute,+parts.second);result+=target-local;}
  return result;
}
export function countSchedule(card:LearningCard,rating:number,now:number,hintUsed=false,timezone='Asia/Shanghai'){
  if(!card.count)throw new Error('次数状态缺失。');
  if((card.fsrs.last_review??0)>now)throw new Error('系统时间早于上次复习，请检查设备时间。');
  if(![1,2,3].includes(rating))throw new Error('反馈类型无效。');
  const applied=hintUsed?1:rating;
  const before=card.count;
  let stage=before.stage,remaining=before.remaining||1;
  if(applied===1){stage=0;remaining=3;}
  else if(applied===2){stage=Math.max(0,stage-1);remaining=Math.max(2,remaining);}
  else remaining=Math.max(0,remaining-1);
  const complete=remaining===0;
  if(complete)stage=Math.min(5,stage+1);
  const days=COUNT_PARAMETERS.intervalDays[Math.max(0,stage-1)];
  const dueAt=complete?calendarDue(now,days,timezone):now;
  const count={...before,stage,remaining,rounds:before.rounds+(complete?1:0),queueOrder:now,lastCompletedDay:complete?dayKey(now,timezone):before.lastCompletedDay};
  // Legacy fields remain for history/backup compatibility; they are not FSRS estimates for count cards.
  const fsrs={...card.fsrs,due:dueAt,last_review:now,reps:card.fsrs.reps+1,lapses:card.fsrs.lapses+(applied===1?1:0),state:complete?2:1,scheduled_days:complete?days:0,stability:0,difficulty:0};
  return {rating:applied,after:{...card,count,fsrs,dueAt,revision:card.revision+1},rawLog:{kind:COUNT_VERSION,before,after:count,completedRound:complete,intervalDays:complete?days:0,timezone}};
}
export function countLabel(card:LearningCard,rating:number,now:number,timezone='Asia/Shanghai',hintUsed=false){
  if((card.fsrs.last_review??0)>now)return '请检查设备时间';
  const after=countSchedule(card,rating,now,hintUsed,timezone).after;
  return after.count!.remaining?`本轮还需 ${after.count!.remaining} 次`:`本轮完成 · ${after.fsrs.scheduled_days} 天后`;
}
