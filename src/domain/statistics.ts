import type { LearningCard, Practice, Progress, ReviewEvent, Session } from '../types';

export const RATING_LABELS: Record<number,string> = {1:'忘记',2:'模糊',3:'记得'};
export const isRecap = (mode?: string) => mode === 'practice' || mode === 'today';
const dateFormatters=new Map<string,Intl.DateTimeFormat>();
export const dayKey = (at: number, timezone = 'Asia/Shanghai') => {
  if(!dateFormatters.has(timezone))dateFormatters.set(timezone,new Intl.DateTimeFormat('sv-SE',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}));
  return dateFormatters.get(timezone)!.format(at);
};
export const fullDate = (at: number, timezone = 'Asia/Shanghai') => new Intl.DateTimeFormat('zh-CN', {timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(at);
export function recentDays(now: number, timezone: string, count: number) {
  // Calendar arithmetic in UTC on the selected local date also works across DST.
  const anchor = Date.parse(`${dayKey(now,timezone)}T12:00:00Z`);
  return Array.from({length:count},(_,i)=>new Date(anchor-(count-1-i)*86400_000).toISOString().slice(0,10));
}
export function dailyStats(day: string, progress: Progress[], reviews: ReviewEvent[], practices: Practice[], validWords: Set<string>, timezone: string) {
  const introduced=progress.filter(p=>validWords.has(p.id)&&p.introducedAt!==undefined&&dayKey(p.introducedAt,timezone)===day).map(p=>p.id);
  const formal=reviews.filter(e=>!e.revertedAt&&dayKey(e.at,timezone)===day);
  const wordFormal=formal.filter(e=>validWords.has(e.before.targetId));
  const reviewed=[...new Set(wordFormal.map(e=>e.before.targetId))];
  const recap=practices.filter(p=>p.rating!==undefined&&validWords.has(p.targetId)&&dayKey(p.at,timezone)===day);
  const todayRecap=recap.filter(p=>p.source==='today');
  const feedback=[3,2,1].map(rating=>({rating,count:formal.filter(e=>e.rating===rating).length}));
  const records=[...new Set([...introduced,...reviewed,...recap.map(p=>p.targetId)])].map(id=>{
    const introduction=progress.find(p=>p.id===id&&p.introducedAt!==undefined&&dayKey(p.introducedAt,timezone)===day)?.introducedAt;
    const wordReviews=wordFormal.filter(e=>e.before.targetId===id).sort((a,b)=>a.at-b.at);
    const wordPractice=recap.filter(p=>p.targetId===id);
    const times=[...(introduction===undefined?[]:[introduction]),...wordReviews.map(e=>e.at),...wordPractice.map(p=>p.at)];
    return {id,introduced:introduction!==undefined,reviewCount:wordReviews.length,practiceCount:wordPractice.length,firstAt:Math.min(...times),lastAt:Math.max(...times),lastRating:wordReviews.at(-1)?.rating};
  }).sort((a,b)=>a.firstAt-b.firstAt||a.id.localeCompare(b.id));
  return {introduced,reviewed,words:[...new Set([...introduced,...reviewed])],formal,recap,todayRecap,recapWords:[...new Set(todayRecap.map(p=>p.targetId))],feedback,records};
}
export function todayQueue(cards: LearningCard[], session: Session) {
  return session.batch.flatMap(id=>{const card=cards.find(c=>c.targetId===id&&c.skill==='meaning'&&!c.paused);return card&&!session.completed?.includes(card.id)?[card]:[];});
}
export function measuredReviews(reviews: ReviewEvent[], days: Set<string>, timezone: string) {
  const first=new Map<string,ReviewEvent>();
  reviews.filter(e=>!e.revertedAt&&(e.before.count?e.before.count.rounds>0&&e.before.count.remaining===0:e.before.fsrs.reps>0)&&days.has(dayKey(e.at,timezone))).sort((a,b)=>a.at-b.at).forEach(e=>{const key=`${e.cardId}:${dayKey(e.at,timezone)}`;if(!first.has(key))first.set(key,e);});
  return [...first.values()];
}
export function shouldAutoPlay(skill: string | undefined, introduction: boolean, revealed: boolean, enabled: boolean) {
  return enabled && (introduction || skill==='meaning' || skill==='listening' || (revealed && (skill==='reading'||skill==='kana')));
}

export function aggregateDays(progress: Progress[], reviews: ReviewEvent[], practices: Practice[], validWords: Set<string>, timezone: string) {
  const groups=new Map<string,{progress:Progress[];reviews:ReviewEvent[];practices:Practice[]}>();
  const group=(at:number)=>{const key=dayKey(at,timezone);if(!groups.has(key))groups.set(key,{progress:[],reviews:[],practices:[]});return groups.get(key)!;};
  for(const p of progress)if(p.introducedAt!==undefined&&validWords.has(p.id))group(p.introducedAt).progress.push(p);
  for(const e of reviews)if(!e.revertedAt)group(e.at).reviews.push(e);
  for(const p of practices)if(p.rating!==undefined&&validWords.has(p.targetId))group(p.at).practices.push(p);
  return new Map([...groups].map(([day,g])=>[day,dailyStats(day,g.progress,g.reviews,g.practices,validWords,timezone)]));
}
