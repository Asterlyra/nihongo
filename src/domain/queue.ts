import { dayKey } from './statistics';
import { State } from 'ts-fsrs';
import type { Guard, LearningCard, Mode } from '../types';

export const GUARD_MS = 10 * 60_000;
export function selectable(card: LearningCard, guards: Guard[], now: number,timezone='Asia/Shanghai') {
  const guard = guards.find(g => g.id === card.targetId);
  if(card.count)return !card.paused&&dayKey(card.dueAt,timezone)<=dayKey(now,timezone)&&(!guard||guard.exceptCard===card.id||(guard.gap??0)===0);
  return !card.paused && card.dueAt <= now && (!guard || guard.exceptCard === card.id || guard.at + GUARD_MS <= now);
}
export function selectCards(cards: LearningCard[], guards: Guard[], now: number, mode: Mode, batch: string[] = [],timezone='Asia/Shanghai') {
  if (mode === 'today') return [];
  if (mode === 'practice') return cards.filter(c => !c.paused).sort((a,b) => a.id.localeCompare(b.id));
  const weight = (c: LearningCard) => [State.Learning, State.Relearning].includes(c.fsrs.state) ? 0 : c.fsrs.state === State.New ? 2 : 1;
  return cards.filter(c => selectable(c, guards, now,timezone) && (c.count || mode !== 'new' || batch.includes(c.targetId)))
    .sort((a,b) => (a.count&&b.count?(a.count.queueOrder-b.count.queueOrder):0) || weight(a) - weight(b) || a.dueAt - b.dueAt || a.id.localeCompare(b.id));
}

export function requiredReviews(cards:LearningCard[],now:number,timezone='Asia/Shanghai'){return cards.filter(c=>!c.paused&&(c.count?dayKey(c.dueAt,timezone)<=dayKey(now,timezone):c.dueAt<=now));}

export type StudyItem={id:string;isIntroduction:boolean};
// Stable for one saved session revision; rerendering or the clock ticking cannot reshuffle it.
function randomOrder(seed:string,id:string){
  let hash=2166136261;for(const char of `${seed}|${id}`){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619);}
  hash^=hash>>>16;hash=Math.imul(hash,0x7feb352d);hash^=hash>>>15;hash=Math.imul(hash,0x846ca68b);hash^=hash>>>16;
  return (hash>>>0)/4294967296;
}
export function nextStudyItem({cards,guards,now,session,newIds=[],allowNew=true,orderedNew=false,pendingRecallIds=[],practiceIndex=0,timezone='Asia/Shanghai'}:{cards:LearningCard[];guards:Guard[];now:number;session:import('../types').Session;newIds?:string[];allowNew?:boolean;orderedNew?:boolean;pendingRecallIds?:string[];practiceIndex?:number;timezone?:string}):StudyItem|undefined{
  if(session.mode==='today'){
    const next=cards.filter(c=>!c.paused&&session.batch.includes(c.targetId)&&c.skill==='meaning'&&!session.completed?.includes(c.id)).sort((a,b)=>session.batch.indexOf(a.targetId)-session.batch.indexOf(b.targetId))[0];
    return next&&{id:next.id,isIntroduction:false};
  }
  const eligible=selectCards(cards,guards,now,session.mode,session.batch,timezone);
  if(session.mode==='practice'){const next=eligible[practiceIndex%Math.max(1,eligible.length)];return next&&{id:next.id,isIntroduction:false};}
  const seed=`${session.updatedAt}:${session.revision}`;
  const shuffle=(a:string,b:string)=>randomOrder(seed,a)-randomOrder(seed,b)||a.localeCompare(b);
  const recent=session.lastTargetId??guards.reduce<Guard|undefined>((last,g)=>!last||g.at>last.at?g:last,undefined)?.id;
  const introductions=allowNew&&session.mode!=='review'?newIds.slice(0,orderedNew?1:session.studyGroup?newIds.length:5).filter(id=>id!==recent):[];
  const due=requiredReviews(cards,now,timezone);
  const alternatives=eligible.filter(c=>c.targetId!==recent);
  // Presentation guards may cover several words after lookups. Prefer another due
  // word before falling back to the one just shown, without altering memory state.
  const pool=alternatives.length?alternatives:due.filter(c=>c.count&&c.targetId!==recent);
  const pending=pool.filter(c=>pendingRecallIds.includes(c.targetId));
  // Finish each word's first recall before spending more turns on its other
  // abilities. Prefer the least recently shown word; shuffle equal priorities.
  const lastSeen=(id:string)=>guards.find(g=>g.id===id)?.at??0;
  const reviews=(pending.length?pending:pool).sort((a,b)=>lastSeen(a.targetId)-lastSeen(b.targetId)||shuffle(a.targetId,b.targetId)||(a.count?.queueOrder??a.createdAt)-(b.count?.queueOrder??b.createdAt)||shuffle(a.id,b.id));
  const newId=introductions.sort(shuffle)[0];
  // Interleave the two pools, rather than letting a large backlog hide all new words.
  if(newId&&(!reviews.length||randomOrder(seed,'introduce')<(session.mode==='new'?.5:.35)))return {id:newId,isIntroduction:true};
  if(reviews.length)return {id:reviews[0].id,isIntroduction:false};
  // With no other word available, reset the recall view automatically, not the memory state.
  const fallback=eligible.length?eligible:due.filter(c=>c.count);
  const next=[...fallback].sort((a,b)=>shuffle(a.id,b.id))[0];
  return next&&{id:next.id,isIntroduction:false};
}
