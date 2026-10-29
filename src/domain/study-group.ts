import type {LearningCard,Progress,ReviewEvent,Session,StudyGroup} from '../types';

export const DEFAULT_GROUP_SIZE=5;
export const validGroupSize=(size:number)=>Number.isInteger(size)&&size>=1&&size<=100;

export function studyGroupProgress(group:StudyGroup|undefined,progress:Progress[],reviews:ReviewEvent[],cards:LearningCard[],validWords:Set<string>){
  const wordIds=group?.wordIds.filter(id=>validWords.has(id))??[];
  const introduced=new Set(progress.filter(p=>p.introducedAt!==undefined).map(p=>p.id));
  const attempted=new Set(reviews.filter(e=>!e.revertedAt&&e.at>=(group?.startedAt??Infinity)&&!e.sessionBefore?.hintUsed).map(e=>e.before.targetId));
  // Pausing all abilities explicitly excludes a word from the current pass.
  // It never marks that word mastered or deletes its history.
  const excluded=wordIds.filter(id=>introduced.has(id)&&!cards.some(c=>c.targetId===id&&!c.paused));
  const done=wordIds.filter(id=>introduced.has(id)&&attempted.has(id));
  const pending=wordIds.filter(id=>introduced.has(id)&&!done.includes(id)&&!excluded.includes(id));
  return {wordIds,done,excluded,pending,introductions:wordIds.filter(id=>!introduced.has(id)),complete:wordIds.every(id=>done.includes(id)||excluded.includes(id))};
}

export function prepareStudyGroup({session,size=DEFAULT_GROUP_SIZE,newIds,progress,reviews,cards,validWords,now,remaining,allowNew}:{session:Session;size?:number;newIds:string[];progress:Progress[];reviews:ReviewEvent[];cards:LearningCard[];validWords:Set<string>;now:number;remaining?:number;allowNew:boolean}){
  let group=session.studyGroup;
  if((session.mode==='recommended'||session.mode==='new')&&allowNew&&(!group||studyGroupProgress(group,progress,reviews,cards,validWords).complete)){
    const wordIds=[...new Set(newIds)].filter(id=>validWords.has(id)).slice(0,Math.min(validGroupSize(size)?size:DEFAULT_GROUP_SIZE,remaining??Infinity));
    group=wordIds.length?{wordIds,startedAt:now}:group;
  }
  const state=studyGroupProgress(group,progress,reviews,cards,validWords);
  return {group,state,session:{...session,studyGroup:group},newIds:group?state.introductions:[]};
}
